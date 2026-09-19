'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware');
const { tenantMiddleware } = require('../tenant');
const { emitToTenant } = require('../socket');

// Të gjitha kërkojnë auth
router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══════════════════════════════════════════════════════
// KRIJO POROSI TË RE
// ═══════════════════════════════════════════════════════
router.post('/', (req, res) => {
    try {
        const {
            phone, clientName, pickup, pickupLat, pickupLng,
            destination, destLat, destLng, zone, tariffId,
            remark, isPreorder, preorderDate, preorderNote
        } = req.body;

        if (!phone || !pickup) {
            return res.status(400).json({ error: 'Telefoni dhe marrja janë të detyrueshme' });
        }

        // Gjenero kod unik
        const orderCode = 'T' + Date.now().toString().slice(-8);

        const status = isPreorder ? 'preorder' : 'waiting';

        const result = db.prepare(`
            INSERT INTO orders (
                tenant_id, order_code, phone, client_name,
                pickup, pickup_lat, pickup_lng,
                destination, dest_lat, dest_lng,
                zone, tariff_id, remark,
                status, is_preorder, preorder_date, preorder_note,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            req.tenantId, orderCode, phone, clientName || null,
            pickup, pickupLat || null, pickupLng || null,
            destination || null, destLat || null, destLng || null,
            zone || null, tariffId || null, remark || null,
            status, isPreorder ? 1 : 0, preorderDate || null, preorderNote || null,
            req.user.userId
        );

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);

        // Njofto të gjithë në tenant
        emitToTenant(req.tenantId, 'order_created', order);

        res.json({ success: true, order });
    } catch (e) {
        console.error('❌ create order:', e);
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// LISTO POROSITË
// ═══════════════════════════════════════════════════════
router.get('/', (req, res) => {
    try {
        const { status, driverId, from, to, limit = 100 } = req.query;

        let query = 'SELECT * FROM orders WHERE tenant_id = ?';
        const params = [req.tenantId];

        if (status) {
            if (status === 'active') {
                query += ` AND status IN ('waiting', 'assigned', 'onroute', 'arrived', 'taximeter', 'fixed')`;
            } else if (status === 'completed') {
                query += ` AND status = 'completed'`;
            } else {
                query += ` AND status = ?`;
                params.push(status);
            }
        }

        if (driverId) {
            query += ` AND driver_id = ?`;
            params.push(driverId);
        }

        if (from) {
            query += ` AND DATE(created_at) >= ?`;
            params.push(from);
        }

        if (to) {
            query += ` AND DATE(created_at) <= ?`;
            params.push(to);
        }

        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(parseInt(limit));

        const orders = db.prepare(query).all(...params);
        res.json({ orders });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// POROSITË NË PRITJE
// ═══════════════════════════════════════════════════════
router.get('/waiting', (req, res) => {
    const orders = db.prepare(`
        SELECT * FROM orders
        WHERE tenant_id = ? AND status = 'waiting'
        ORDER BY created_at ASC
    `).all(req.tenantId);
    res.json({ orders });
});

// ═══════════════════════════════════════════════════════
// TERMINET (PREORDERS)
// ═══════════════════════════════════════════════════════
router.get('/preorders', (req, res) => {
    const orders = db.prepare(`
        SELECT * FROM orders
        WHERE tenant_id = ? AND is_preorder = 1 AND status != 'completed' AND status != 'cancelled'
        ORDER BY preorder_date ASC
    `).all(req.tenantId);
    res.json({ orders });
});

// ═══════════════════════════════════════════════════════
// POROSI E VETME
// ═══════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND tenant_id = ?')
        .get(req.params.id, req.tenantId);

    if (!order) return res.status(404).json({ error: 'Porosia nuk u gjet' });
    res.json({ order });
});

// ═══════════════════════════════════════════════════════
// DISPATCH — CAKTO SHOFER
// ═══════════════════════════════════════════════════════
router.post('/:id/assign', (req, res) => {
    try {
        const { driverId, mode } = req.body;

        if (!driverId) {
            return res.status(400).json({ error: 'driverId është i detyrueshëm' });
        }

        // Verifiko që shoferi ekziston
        const driver = db.prepare(`
            SELECT u.*, v.vehicle_number FROM users u
            LEFT JOIN vehicles v ON v.driver_id = u.id
            WHERE u.id = ? AND u.tenant_id = ? AND u.role = 'driver'
        `).get(driverId, req.tenantId);

        if (!driver) {
            return res.status(404).json({ error: 'Shoferi nuk u gjet' });
        }

        // Update order
        db.prepare(`
            UPDATE orders SET
                driver_id = ?,
                vehicle_id = (SELECT id FROM vehicles WHERE driver_id = ? AND tenant_id = ? LIMIT 1),
                status = 'assigned',
                assigned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND tenant_id = ?
        `).run(driverId, driverId, req.tenantId, req.params.id, req.tenantId);

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

        emitToTenant(req.tenantId, 'order_assigned', { order, driver: {
            id: driver.id, name: driver.name, vehicleNumber: driver.vehicle_number
        }});

        res.json({ success: true, order });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// PËRDITËSO POROSI
// ═══════════════════════════════════════════════════════
router.put('/:id', (req, res) => {
    try {
        const allowed = ['status', 'remark', 'price', 'destination', 'pickup'];
        const updates = [];
        const params = [];

        allowed.forEach(field => {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(req.body[field]);
            }
        });

        // Nëse status bëhet completed → ruaj completed_at
        if (req.body.status === 'completed') {
            updates.push('completed_at = CURRENT_TIMESTAMP');
        }
        if (req.body.status === 'cancelled') {
            updates.push('cancelled_at = CURRENT_TIMESTAMP');
        }

        if (!updates.length) {
            return res.status(400).json({ error: 'Asnjë fushë për përditësim' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(req.params.id, req.tenantId);

        db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...params);

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
        emitToTenant(req.tenantId, 'order_updated', order);

        res.json({ success: true, order });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// ANULO POROSI
// ═══════════════════════════════════════════════════════
router.post('/:id/cancel', (req, res) => {
    const { reason } = req.body;

    db.prepare(`
        UPDATE orders SET
            status = 'cancelled',
            cancel_reason = ?,
            cancelled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND tenant_id = ?
    `).run(reason || 'Pa arsye', req.params.id, req.tenantId);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    emitToTenant(req.tenantId, 'order_cancelled', order);

    res.json({ success: true, order });
});

// ═══════════════════════════════════════════════════════
// FSHIJ POROSI (vetëm manager+)
// ═══════════════════════════════════════════════════════
router.delete('/:id', requireRole('admin', 'manager', 'director'), (req, res) => {
    db.prepare('DELETE FROM orders WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
    res.json({ success: true });
});

module.exports = router;

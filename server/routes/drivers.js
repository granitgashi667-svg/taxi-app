'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware');
const { tenantMiddleware } = require('../tenant');
const { emitToTenant } = require('../socket');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══════════════════════════════════════════════════════
// LISTO SHOFRËT
// ═══════════════════════════════════════════════════════
router.get('/', (req, res) => {
    const drivers = db.prepare(`
        SELECT
            u.id, u.username, u.name, u.surname, u.phone, u.email,
            u.address, u.avatar, u.active, u.blocked, u.last_login,
            v.id as vehicle_id, v.vehicle_number, v.registration_number, v.make, v.model,
            CASE
                WHEN u.last_login > datetime('now', '-2 minutes') THEN 'online'
                WHEN u.last_login > datetime('now', '-30 minutes') THEN 'recent'
                ELSE 'offline'
            END as presence
        FROM users u
        LEFT JOIN vehicles v ON v.driver_id = u.id
        WHERE u.tenant_id = ? AND u.role = 'driver'
        ORDER BY u.name
    `).all(req.tenantId);

    res.json({ drivers });
});

// ═══════════════════════════════════════════════════════
// KRIJO SHOFER (admin/manager)
// ═══════════════════════════════════════════════════════
router.post('/', requireRole('admin', 'manager', 'director'), (req, res) => {
    try {
        const {
            username, password, name, surname, phone, email, address,
            vehicleId
        } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ error: 'Username, password dhe name janë të detyrueshme' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE username = ? AND tenant_id = ?')
            .get(username, req.tenantId);

        if (existing) {
            return res.status(400).json({ error: 'Ky username ekziston' });
        }

        const hash = bcrypt.hashSync(password, 10);

        const result = db.prepare(`
            INSERT INTO users (tenant_id, username, password_hash, name, surname, role, phone, email, address, active)
            VALUES (?, ?, ?, ?, ?, 'driver', ?, ?, ?, 1)
        `).run(
            req.tenantId, username, hash, name,
            surname || null, phone || null, email || null, address || null
        );

        const driverId = result.lastInsertRowid;

        // Nëse është dhënë veturë → lidhe
        if (vehicleId) {
            db.prepare('UPDATE vehicles SET driver_id = ? WHERE id = ? AND tenant_id = ?')
                .run(driverId, vehicleId, req.tenantId);
        }

        const driver = db.prepare('SELECT id, username, name, surname, phone, role FROM users WHERE id = ?')
            .get(driverId);

        emitToTenant(req.tenantId, 'driver_created', driver);

        res.json({
            success: true,
            driver,
            message: `Shoferi ${name} u krijua me username "${username}"`
        });
    } catch (e) {
        console.error('❌ create driver:', e);
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// PËRDITËSO SHOFER
// ═══════════════════════════════════════════════════════
router.put('/:id', requireRole('admin', 'manager', 'director'), (req, res) => {
    const { name, surname, phone, email, address, active, blocked } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (surname !== undefined) { updates.push('surname = ?'); params.push(surname); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (address !== undefined) { updates.push('address = ?'); params.push(address); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
    if (blocked !== undefined) { updates.push('blocked = ?'); params.push(blocked ? 1 : 0); }

    if (!updates.length) {
        return res.status(400).json({ error: 'Asnjë fushë' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id, req.tenantId);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ? AND role = 'driver'`)
        .run(...params);

    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
// STATUSI I SHOFRIT (për maps live)
// ═══════════════════════════════════════════════════════
router.get('/status', (req, res) => {
    const drivers = db.prepare(`
        SELECT
            u.id, u.name, u.username,
            v.vehicle_number, v.registration_number,
            (SELECT COUNT(*) FROM orders WHERE driver_id = u.id AND status IN ('assigned','onroute','arrived','taximeter','fixed')) as active_orders
        FROM users u
        LEFT JOIN vehicles v ON v.driver_id = u.id
        WHERE u.tenant_id = ? AND u.role = 'driver' AND u.active = 1
    `).all(req.tenantId);

    res.json({ drivers });
});

// ═══════════════════════════════════════════════════════
// FSHIJ SHOFER
// ═══════════════════════════════════════════════════════
router.delete('/:id', requireRole('admin', 'director'), (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ? AND role = ?')
        .run(req.params.id, req.tenantId, 'driver');
    res.json({ success: true });
});

module.exports = router;

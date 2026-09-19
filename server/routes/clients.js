'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware');
const { tenantMiddleware } = require('../tenant');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══ LISTO KLIENTËT ═══
router.get('/', (req, res) => {
    const { search, blocked, limit = 500 } = req.query;

    let query = 'SELECT * FROM clients WHERE tenant_id = ?';
    const params = [req.tenantId];

    if (search) {
        query += ' AND (phone LIKE ? OR name LIKE ? OR surname LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s, s);
    }

    if (blocked === '1') query += ' AND blocked = 1';
    if (blocked === '0') query += ' AND blocked = 0';

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const clients = db.prepare(query).all(...params);
    res.json({ clients });
});

// ═══ NJË KLIENT ═══
router.get('/:id', (req, res) => {
    const client = db.prepare('SELECT * FROM clients WHERE id = ? AND tenant_id = ?')
        .get(req.params.id, req.tenantId);

    if (!client) return res.status(404).json({ error: 'Klienti nuk u gjet' });

    // Historiku i porosive
    const orders = db.prepare(`
        SELECT * FROM orders
        WHERE tenant_id = ? AND phone = ?
        ORDER BY created_at DESC LIMIT 50
    `).all(req.tenantId, client.phone);

    res.json({ client, orders });
});

// ═══ KRIJO KLIENT (nga operatori) ═══
router.post('/', (req, res) => {
    const { phone, name, surname, email, address, notes } = req.body;

    if (!phone) return res.status(400).json({ error: 'Telefoni është i detyrueshëm' });

    const existing = db.prepare('SELECT id FROM clients WHERE phone = ? AND tenant_id = ?')
        .get(phone, req.tenantId);

    if (existing) return res.status(400).json({ error: 'Ky klient ekziston' });

    const result = db.prepare(`
        INSERT INTO clients (tenant_id, phone, name, surname, email, address, notes, verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(req.tenantId, phone, name || null, surname || null, email || null, address || null, notes || null);

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, client });
});

// ═══ PËRDITËSO KLIENT ═══
router.put('/:id', (req, res) => {
    const { name, surname, email, address, notes } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (surname !== undefined) { updates.push('surname = ?'); params.push(surname); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (address !== undefined) { updates.push('address = ?'); params.push(address); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (!updates.length) return res.status(400).json({ error: 'Asnjë fushë' });

    params.push(req.params.id, req.tenantId);
    db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...params);

    res.json({ success: true });
});

// ═══ BLLOKO / ZHBLLOKO ═══
router.post('/:id/toggle-block', requireRole('admin', 'manager', 'director'), (req, res) => {
    const client = db.prepare('SELECT blocked FROM clients WHERE id = ? AND tenant_id = ?')
        .get(req.params.id, req.tenantId);

    if (!client) return res.status(404).json({ error: 'Klienti nuk u gjet' });

    const newBlocked = client.blocked ? 0 : 1;
    db.prepare('UPDATE clients SET blocked = ? WHERE id = ?').run(newBlocked, req.params.id);

    res.json({ success: true, blocked: newBlocked });
});

// ═══ FSHIJ KLIENT ═══
router.delete('/:id', requireRole('admin', 'manager', 'director'), (req, res) => {
    db.prepare('DELETE FROM clients WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
    res.json({ success: true });
});

module.exports = router;

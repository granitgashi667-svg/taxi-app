'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware');
const { tenantMiddleware } = require('../tenant');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══ LISTO LOKACIONET (me paginim + kërkim) ═══
router.get('/', (req, res) => {
    const { search, page = 1, limit = 1000 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM custom_locations WHERE tenant_id = ?';
    const params = [req.tenantId];

    if (search) {
        query += ' AND title LIKE ?';
        params.push(`%${search}%`);
    }

    query += ' ORDER BY title LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const locations = db.prepare(query).all(...params);

    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM custom_locations WHERE tenant_id = ?';
    const countParams = [req.tenantId];
    if (search) {
        countQuery += ' AND title LIKE ?';
        countParams.push(`%${search}%`);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ locations, total, page: parseInt(page), limit: parseInt(limit) });
});

// ═══ KRIJO LOKACION ═══
router.post('/', (req, res) => {
    const { title, zone, stand, lat, lng } = req.body;

    if (!title || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Emri, lat dhe lng janë të detyrueshme' });
    }

    const result = db.prepare(`
        INSERT INTO custom_locations (tenant_id, title, zone, stand, lat, lng, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.tenantId, title, zone || null, stand || null, lat, lng, req.user.userId);

    const location = db.prepare('SELECT * FROM custom_locations WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, location });
});

// ═══ PËRDITËSO LOKACION ═══
router.put('/:id', (req, res) => {
    const { title, zone, stand, lat, lng } = req.body;
    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (zone !== undefined) { updates.push('zone = ?'); params.push(zone); }
    if (stand !== undefined) { updates.push('stand = ?'); params.push(stand); }
    if (lat !== undefined) { updates.push('lat = ?'); params.push(lat); }
    if (lng !== undefined) { updates.push('lng = ?'); params.push(lng); }

    if (!updates.length) return res.status(400).json({ error: 'Asnjë fushë' });

    params.push(req.params.id, req.tenantId);
    db.prepare(`UPDATE custom_locations SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...params);

    res.json({ success: true });
});

// ═══ FSHIJ LOKACION ═══
router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM custom_locations WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
    res.json({ success: true });
});

module.exports = router;

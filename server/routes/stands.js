'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware');
const { tenantMiddleware } = require('../tenant');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══ LISTO PIKAT ═══
router.get('/', (req, res) => {
    const stands = db.prepare('SELECT * FROM stands WHERE tenant_id = ? ORDER BY stand_order, title')
        .all(req.tenantId);

    // Parse queue + polygon
    stands.forEach(s => {
        if (s.queue) {
            try { s.queue = JSON.parse(s.queue); } catch { s.queue = []; }
        } else {
            s.queue = [];
        }
        if (s.polygon) {
            try { s.polygon = JSON.parse(s.polygon); } catch {}
        }
    });

    res.json({ stands });
});

// ═══ KRIJO PIKË ═══
router.post('/', requireRole('admin', 'manager', 'director'), (req, res) => {
    const {
        code, title, lat, lng, radius, polygon,
        backupStand, standOrder
    } = req.body;

    if (!code || !title || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Kodi, emri, lat dhe lng janë të detyrueshme' });
    }

    const result = db.prepare(`
        INSERT INTO stands (
            tenant_id, code, title, lat, lng, radius, polygon,
            backup_stand, stand_order, queue
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')
    `).run(
        req.tenantId, code, title, lat, lng,
        radius || 55,
        polygon ? JSON.stringify(polygon) : null,
        backupStand || null,
        standOrder || 0
    );

    const stand = db.prepare('SELECT * FROM stands WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, stand });
});

// ═══ PËRDITËSO PIKË ═══
router.put('/:id', requireRole('admin', 'manager', 'director'), (req, res) => {
    const fieldMap = {
        backupStand: 'backup_stand',
        standOrder: 'stand_order'
    };

    const updates = [];
    const params = [];

    Object.keys(req.body).forEach(key => {
        const dbField = fieldMap[key] || key;
        const value = (key === 'polygon' || key === 'queue') && req.body[key]
            ? JSON.stringify(req.body[key])
            : req.body[key];
        updates.push(`${dbField} = ?`);
        params.push(value);
    });

    if (!updates.length) return res.status(400).json({ error: 'Asnjë fushë' });

    params.push(req.params.id, req.tenantId);
    db.prepare(`UPDATE stands SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...params);

    res.json({ success: true });
});

// ═══ FSHIJ PIKË ═══
router.delete('/:id', requireRole('admin', 'director'), (req, res) => {
    db.prepare('DELETE FROM stands WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
    res.json({ success: true });
});

module.exports = router;

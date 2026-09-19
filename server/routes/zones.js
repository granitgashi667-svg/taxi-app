'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware');
const { tenantMiddleware } = require('../tenant');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══ LISTO ZONAT ═══
router.get('/', (req, res) => {
    const zones = db.prepare('SELECT * FROM zones WHERE tenant_id = ? AND active = 1 ORDER BY zone_order, title')
        .all(req.tenantId);

    // Parse polygon JSON
    zones.forEach(z => {
        if (z.polygon) {
            try { z.polygon = JSON.parse(z.polygon); } catch {}
        }
    });

    res.json({ zones });
});

// ═══ KRIJO ZONË ═══
router.post('/', requireRole('admin', 'manager', 'director'), (req, res) => {
    const {
        code, title, polygon,
        backupZone1, backupZone2, backupZone3, backupZone4, backupZone5,
        zoneOrder, department
    } = req.body;

    if (!code || !title) return res.status(400).json({ error: 'Kodi dhe emri janë të detyrueshme' });

    const polygonStr = polygon ? JSON.stringify(polygon) : null;

    const result = db.prepare(`
        INSERT INTO zones (
            tenant_id, code, title, polygon,
            backup_zone_1, backup_zone_2, backup_zone_3, backup_zone_4, backup_zone_5,
            zone_order, department
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        req.tenantId, code, title, polygonStr,
        backupZone1 || null, backupZone2 || null, backupZone3 || null,
        backupZone4 || null, backupZone5 || null,
        zoneOrder || 0, department || null
    );

    const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, zone });
});

// ═══ PËRDITËSO ZONË ═══
router.put('/:id', requireRole('admin', 'manager', 'director'), (req, res) => {
    const fieldMap = {
        backupZone1: 'backup_zone_1',
        backupZone2: 'backup_zone_2',
        backupZone3: 'backup_zone_3',
        backupZone4: 'backup_zone_4',
        backupZone5: 'backup_zone_5',
        zoneOrder: 'zone_order'
    };

    const updates = [];
    const params = [];

    Object.keys(req.body).forEach(key => {
        const dbField = fieldMap[key] || key;
        const value = key === 'polygon' && req.body[key] ? JSON.stringify(req.body[key]) : req.body[key];
        updates.push(`${dbField} = ?`);
        params.push(value);
    });

    if (!updates.length) return res.status(400).json({ error: 'Asnjë fushë' });

    params.push(req.params.id, req.tenantId);
    db.prepare(`UPDATE zones SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...params);

    res.json({ success: true });
});

// ═══ FSHIJ ZONË ═══
router.delete('/:id', requireRole('admin', 'director'), (req, res) => {
    db.prepare('UPDATE zones SET active = 0 WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
    res.json({ success: true });
});

module.exports = router;

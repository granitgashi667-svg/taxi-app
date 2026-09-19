'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware');
const { tenantMiddleware } = require('../tenant');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══ LISTO TARIFAT ═══
router.get('/', (req, res) => {
    const tariffs = db.prepare('SELECT * FROM tariffs WHERE tenant_id = ? AND active = 1 ORDER BY is_default DESC, title')
        .all(req.tenantId);

    tariffs.forEach(t => {
        if (t.schedule) {
            try { t.schedule = JSON.parse(t.schedule); } catch {}
        }
    });

    res.json({ tariffs });
});

// ═══ KRIJO TARIFË ═══
router.post('/', requireRole('admin', 'manager', 'director'), (req, res) => {
    const {
        title, tariffType, tariffCategory,
        priceKm, startFee, waitTimeHour,
        percentage, minDistance,
        isFlat, flatPrice, isDefault, masterTariff, schedule
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Emri është i detyrueshëm' });

    // Nëse isDefault → hiq default-in e tjerë
    if (isDefault) {
        db.prepare('UPDATE tariffs SET is_default = 0 WHERE tenant_id = ?').run(req.tenantId);
    }

    const result = db.prepare(`
        INSERT INTO tariffs (
            tenant_id, title, tariff_type, tariff_category,
            price_km, start_fee, wait_time_hour,
            percentage, min_distance,
            is_flat, flat_price, is_default, master_tariff, schedule
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        req.tenantId, title,
        tariffType || 'Default', tariffCategory || null,
        priceKm !== undefined ? priceKm : 0.60,
        startFee !== undefined ? startFee : 2.00,
        waitTimeHour !== undefined ? waitTimeHour : 1.00,
        percentage || 0, minDistance || 0,
        isFlat ? 1 : 0, flatPrice || 0,
        isDefault ? 1 : 0, masterTariff ? 1 : 0,
        schedule ? JSON.stringify(schedule) : null
    );

    const tariff = db.prepare('SELECT * FROM tariffs WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, tariff });
});

// ═══ PËRDITËSO TARIFË ═══
router.put('/:id', requireRole('admin', 'manager', 'director'), (req, res) => {
    const fieldMap = {
        tariffType: 'tariff_type',
        tariffCategory: 'tariff_category',
        priceKm: 'price_km',
        startFee: 'start_fee',
        waitTimeHour: 'wait_time_hour',
        minDistance: 'min_distance',
        isFlat: 'is_flat',
        flatPrice: 'flat_price',
        isDefault: 'is_default',
        masterTariff: 'master_tariff'
    };

    if (req.body.isDefault) {
        db.prepare('UPDATE tariffs SET is_default = 0 WHERE tenant_id = ?').run(req.tenantId);
    }

    const updates = [];
    const params = [];

    Object.keys(req.body).forEach(key => {
        const dbField = fieldMap[key] || key;
        const value = key === 'schedule' && req.body[key]
            ? JSON.stringify(req.body[key])
            : req.body[key];
        updates.push(`${dbField} = ?`);
        params.push(value);
    });

    if (!updates.length) return res.status(400).json({ error: 'Asnjë fushë' });

    params.push(req.params.id, req.tenantId);
    db.prepare(`UPDATE tariffs SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`).run(...params);

    res.json({ success: true });
});

// ═══ FSHIJ TARIFË ═══
router.delete('/:id', requireRole('admin', 'director'), (req, res) => {
    db.prepare('UPDATE tariffs SET active = 0 WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
    res.json({ success: true });
});

module.exports = router;

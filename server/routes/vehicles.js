'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, requireRole } = require('../middleware');
const { tenantMiddleware } = require('../tenant');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══════════════════════════════════════════════════════
// LISTO VETURAT
// ═══════════════════════════════════════════════════════
router.get('/', (req, res) => {
    const vehicles = db.prepare(`
        SELECT
            v.*,
            u.id as driver_id, u.name as driver_name, u.username as driver_username
        FROM vehicles v
        LEFT JOIN users u ON u.id = v.driver_id
        WHERE v.tenant_id = ? AND v.deleted = 0
        ORDER BY v.vehicle_number
    `).all(req.tenantId);

    res.json({ vehicles });
});

// ═══════════════════════════════════════════════════════
// KRIJO VETURË
// ═══════════════════════════════════════════════════════
router.post('/', requireRole('admin', 'manager', 'director'), (req, res) => {
    try {
        const {
            vehicleNumber, registrationNumber, make, model, color,
            year, seats, enginePower,
            insurancePolicy, insuranceNumber,
            motExpiration, licenseNumber, licenseExpiration,
            driverId
        } = req.body;

        if (!vehicleNumber || !registrationNumber) {
            return res.status(400).json({ error: 'Numri i veturës dhe targa janë të detyrueshme' });
        }

        const result = db.prepare(`
            INSERT INTO vehicles (
                tenant_id, vehicle_number, registration_number,
                make, model, color, year, seats, engine_power,
                insurance_policy, insurance_number, mot_expiration,
                license_number, license_expiration, driver_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            req.tenantId, vehicleNumber, registrationNumber,
            make || null, model || null, color || null,
            year || null, seats || null, enginePower || null,
            insurancePolicy || null, insuranceNumber || null, motExpiration || null,
            licenseNumber || null, licenseExpiration || null,
            driverId || null
        );

        const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
        res.json({ success: true, vehicle });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// PËRDITËSO VETURË
// ═══════════════════════════════════════════════════════
router.put('/:id', requireRole('admin', 'manager', 'director'), (req, res) => {
    const allowed = [
        'vehicle_number', 'registration_number', 'make', 'model', 'color',
        'year', 'seats', 'engine_power',
        'insurance_policy', 'insurance_number', 'mot_expiration',
        'license_number', 'license_expiration', 'driver_id', 'active'
    ];

    const updates = [];
    const params = [];

    // Map camelCase to snake_case
    const fieldMap = {
        vehicleNumber: 'vehicle_number',
        registrationNumber: 'registration_number',
        enginePower: 'engine_power',
        insurancePolicy: 'insurance_policy',
        insuranceNumber: 'insurance_number',
        motExpiration: 'mot_expiration',
        licenseNumber: 'license_number',
        licenseExpiration: 'license_expiration',
        driverId: 'driver_id'
    };

    Object.keys(req.body).forEach(key => {
        const dbField = fieldMap[key] || key;
        if (allowed.includes(dbField)) {
            updates.push(`${dbField} = ?`);
            params.push(req.body[key]);
        }
    });

    if (!updates.length) {
        return res.status(400).json({ error: 'Asnjë fushë' });
    }

    params.push(req.params.id, req.tenantId);
    db.prepare(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`)
        .run(...params);

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    res.json({ success: true, vehicle });
});

// ═══════════════════════════════════════════════════════
// FSHIJ VETURË
// ═══════════════════════════════════════════════════════
router.delete('/:id', requireRole('admin', 'director'), (req, res) => {
    db.prepare('UPDATE vehicles SET deleted = 1 WHERE id = ? AND tenant_id = ?')
        .run(req.params.id, req.tenantId);
    res.json({ success: true });
});

module.exports = router;

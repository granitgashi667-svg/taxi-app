'use strict';

/**
 * server/routes/data.js
 * API generik për firebase-shim.js
 * Përdoret nga TË GJITHA modulet që bëjnë firebase.firestore().collection(...)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware');
const { tenantMiddleware } = require('../tenant');
const { emitToTenant } = require('../socket');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══════════════════════════════════════════════════════
// LISTO (me filtra, sort, limit)
// ═══════════════════════════════════════════════════════
router.get('/:collection', (req, res) => {
    try {
        const { collection } = req.params;
        const { limit = 500, orderBy, order = 'desc' } = req.query;

        let where = 'tenant_id = ? AND coll = ?';
        const params = [req.tenantId, collection];

        // Equality filters (where_field=value)
        Object.entries(req.query).forEach(([k, v]) => {
            if (k.startsWith('where_')) {
                const field = k.slice(6);
                where += ` AND json_extract(data, '$.${field}') = ?`;
                params.push(v);
            }
        });

        let sql = `SELECT id, doc_id, data FROM documents WHERE ${where}`;

        const rows = db.prepare(sql).all(...params);
        let out = rows.map(r => {
            let obj = {};
            try { obj = JSON.parse(r.data); } catch(e) {}
            return { id: r.doc_id || String(r.id), _sqlId: r.id, ...obj };
        });

        // Sort në memory
        if (orderBy) {
            out.sort((a, b) => {
                let av = a[orderBy], bv = b[orderBy];
                if (av && av.seconds !== undefined) av = av.seconds * 1000;
                if (bv && bv.seconds !== undefined) bv = bv.seconds * 1000;
                if (av === undefined || av === null) return 1;
                if (bv === undefined || bv === null) return -1;
                if (av < bv) return order === 'asc' ? -1 : 1;
                if (av > bv) return order === 'asc' ? 1 : -1;
                return 0;
            });
        }

        out = out.slice(0, parseInt(limit));
        res.json({ data: out });
    } catch (e) {
        console.error('❌ data GET:', e);
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// NJË DOKUMENT
// ═══════════════════════════════════════════════════════
router.get('/:collection/:docId', (req, res) => {
    try {
        const { collection, docId } = req.params;
        const row = db.prepare(
            `SELECT id, doc_id, data FROM documents WHERE tenant_id = ? AND coll = ? AND doc_id = ?`
        ).get(req.tenantId, collection, docId);

        if (!row) return res.json({ data: null });
        let obj = {};
        try { obj = JSON.parse(row.data); } catch(e) {}
        res.json({ data: { id: row.doc_id, _sqlId: row.id, ...obj } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// KRIJO (auto-id)
// ═══════════════════════════════════════════════════════
router.post('/:collection', (req, res) => {
    try {
        const { collection } = req.params;
        const docId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        const data = { ...req.body, _createdAt: new Date().toISOString() };

        db.prepare(`
            INSERT INTO documents (tenant_id, coll, doc_id, data)
            VALUES (?, ?, ?, ?)
        `).run(req.tenantId, collection, docId, JSON.stringify(data));

        emitToTenant(req.tenantId, `${collection}_created`, { id: docId, ...data });
        res.json({ id: docId, data: { id: docId, ...data } });
    } catch (e) {
        console.error('❌ data POST:', e);
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// KRIJO ME doc_id specifik (set)
// ═══════════════════════════════════════════════════════
router.post('/:collection/:docId', (req, res) => {
    try {
        const { collection, docId } = req.params;
        const data = { ...req.body, _createdAt: new Date().toISOString() };

        const existing = db.prepare(
            `SELECT id FROM documents WHERE tenant_id = ? AND coll = ? AND doc_id = ?`
        ).get(req.tenantId, collection, docId);

        if (existing) {
            db.prepare(`UPDATE documents SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                .run(JSON.stringify(data), existing.id);
        } else {
            db.prepare(`INSERT INTO documents (tenant_id, coll, doc_id, data) VALUES (?, ?, ?, ?)`)
                .run(req.tenantId, collection, docId, JSON.stringify(data));
        }

        res.json({ id: docId, data: { id: docId, ...data } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// PËRDITËSO (me FieldValue markers)
// ═══════════════════════════════════════════════════════
router.put('/:collection/:docId', (req, res) => {
    try {
        const { collection, docId } = req.params;

        const existing = db.prepare(
            `SELECT id, data FROM documents WHERE tenant_id = ? AND coll = ? AND doc_id = ?`
        ).get(req.tenantId, collection, docId);

        let current = {};
        if (existing) {
            try { current = JSON.parse(existing.data); } catch(e) {}
        }

        const updates = { ...req.body };
        Object.entries(updates).forEach(([k, v]) => {
            if (v && typeof v === 'object' && v._type === 'serverTimestamp') {
                updates[k] = new Date().toISOString();
            } else if (v && typeof v === 'object' && v._type === 'increment') {
                updates[k] = (current[k] || 0) + (v.value || 0);
            } else if (v && typeof v === 'object' && v._type === 'date') {
                updates[k] = v.value;
            }
        });

        const merged = { ...current, ...updates, _updatedAt: new Date().toISOString() };

        if (existing) {
            db.prepare(`UPDATE documents SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                .run(JSON.stringify(merged), existing.id);
        } else {
            db.prepare(`INSERT INTO documents (tenant_id, coll, doc_id, data) VALUES (?, ?, ?, ?)`)
                .run(req.tenantId, collection, docId, JSON.stringify(merged));
        }

        emitToTenant(req.tenantId, `${collection}_updated`, { id: docId, ...merged });
        res.json({ success: true, data: { id: docId, ...merged } });
    } catch (e) {
        console.error('❌ data PUT:', e);
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════════════
// FSHIJ
// ═══════════════════════════════════════════════════════
router.delete('/:collection/:docId', (req, res) => {
    try {
        const { collection, docId } = req.params;
        db.prepare(`DELETE FROM documents WHERE tenant_id = ? AND coll = ? AND doc_id = ?`)
            .run(req.tenantId, collection, docId);
        emitToTenant(req.tenantId, `${collection}_deleted`, { id: docId });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;

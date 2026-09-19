'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware');
const { tenantMiddleware } = require('../tenant');
const { emitToTenant, emitToUser } = require('../socket');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══════════════════════════════════════════════════════
// THREADS (lista e bisedave)
// ═══════════════════════════════════════════════════════
router.get('/threads', (req, res) => {
    const threads = db.prepare(`
        SELECT
            dm.*,
            u.name as driver_name,
            u.username as driver_username,
            v.vehicle_number
        FROM driver_messages dm
        JOIN users u ON u.id = dm.driver_id
        LEFT JOIN vehicles v ON v.driver_id = u.id
        WHERE dm.tenant_id = ?
        ORDER BY dm.last_message_at DESC
        LIMIT 100
    `).all(req.tenantId);

    res.json({ threads });
});

// ═══════════════════════════════════════════════════════
// MESAZHET E NJË THREAD
// ═══════════════════════════════════════════════════════
router.get('/threads/:threadId/messages', (req, res) => {
    const thread = db.prepare('SELECT * FROM driver_messages WHERE id = ? AND tenant_id = ?')
        .get(req.params.threadId, req.tenantId);

    if (!thread) return res.status(404).json({ error: 'Biseda nuk u gjet' });

    const messages = db.prepare(`
        SELECT * FROM driver_messages_content
        WHERE thread_id = ?
        ORDER BY created_at ASC
        LIMIT 200
    `).all(req.params.threadId);

    // Zero unread
    db.prepare('UPDATE driver_messages SET unread_by_operator = 0 WHERE id = ?').run(req.params.threadId);

    res.json({ messages, thread });
});

// ═══════════════════════════════════════════════════════
// KRIJO OSE GJEN THREAD
// ═══════════════════════════════════════════════════════
router.post('/threads', (req, res) => {
    const { driverId } = req.body;

    if (!driverId) return res.status(400).json({ error: 'driverId është i detyrueshëm' });

    let thread = db.prepare('SELECT * FROM driver_messages WHERE driver_id = ? AND tenant_id = ?')
        .get(driverId, req.tenantId);

    if (!thread) {
        const result = db.prepare(`
            INSERT INTO driver_messages (tenant_id, driver_id, unread_by_operator, unread_by_driver)
            VALUES (?, ?, 0, 0)
        `).run(req.tenantId, driverId);

        thread = db.prepare('SELECT * FROM driver_messages WHERE id = ?').get(result.lastInsertRowid);
    }

    res.json({ success: true, thread });
});

// ═══════════════════════════════════════════════════════
// DËRGO MESAZH
// ═══════════════════════════════════════════════════════
router.post('/threads/:threadId/send', (req, res) => {
    const { text } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Mesazhi është bosh' });
    }

    const thread = db.prepare('SELECT * FROM driver_messages WHERE id = ? AND tenant_id = ?')
        .get(req.params.threadId, req.tenantId);

    if (!thread) return res.status(404).json({ error: 'Biseda nuk u gjet' });

    // Ruaj mesazhin
    const result = db.prepare(`
        INSERT INTO driver_messages_content (
            thread_id, sender_id, sender_type, sender_name, text
        ) VALUES (?, ?, 'operator', ?, ?)
    `).run(req.params.threadId, req.user.userId, req.user.username, text.trim());

    // Përditëso thread
    db.prepare(`
        UPDATE driver_messages SET
            last_message = ?,
            last_message_at = CURRENT_TIMESTAMP,
            unread_by_driver = unread_by_driver + 1
        WHERE id = ?
    `).run(text.trim().slice(0, 60), req.params.threadId);

    const message = db.prepare('SELECT * FROM driver_messages_content WHERE id = ?').get(result.lastInsertRowid);

    // Njofto shoferin në kohë reale
    emitToUser(thread.driver_id, 'new_message_from_operator', message);
    emitToTenant(req.tenantId, 'message_sent', { threadId: req.params.threadId, message });

    res.json({ success: true, message });
});

// ═══════════════════════════════════════════════════════
// SHËNO SI TË LEXUAR
// ═══════════════════════════════════════════════════════
router.post('/threads/:threadId/read', (req, res) => {
    db.prepare('UPDATE driver_messages SET unread_by_operator = 0 WHERE id = ? AND tenant_id = ?')
        .run(req.params.threadId, req.tenantId);
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
// FSHIJ BISEDËN
// ═══════════════════════════════════════════════════════
router.delete('/threads/:threadId', (req, res) => {
    db.prepare('DELETE FROM driver_messages_content WHERE thread_id = ?').run(req.params.threadId);
    db.prepare('DELETE FROM driver_messages WHERE id = ? AND tenant_id = ?')
        .run(req.params.threadId, req.tenantId);
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
// MESAZHET E PARACAKTUARA
// ═══════════════════════════════════════════════════════
router.get('/predefined', (req, res) => {
    const { forRole } = req.query;
    let query = 'SELECT * FROM predefined_messages WHERE tenant_id = ?';
    const params = [req.tenantId];

    if (forRole) {
        query += ' AND for_role = ?';
        params.push(forRole);
    }

    query += ' ORDER BY id';
    const messages = db.prepare(query).all(...params);
    res.json({ messages });
});

router.post('/predefined', (req, res) => {
    const { message, forRole } = req.body;
    if (!message) return res.status(400).json({ error: 'Mesazhi është i detyrueshëm' });

    const result = db.prepare(`
        INSERT INTO predefined_messages (tenant_id, message, for_role)
        VALUES (?, ?, ?)
    `).run(req.tenantId, message, forRole || 'driver');

    const msg = db.prepare('SELECT * FROM predefined_messages WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, message: msg });
});

router.delete('/predefined/:id', (req, res) => {
    db.prepare('DELETE FROM predefined_messages WHERE id = ? AND tenant_id = ?')
        .run(req.params.id, req.tenantId);
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
// REMARKS (shënimet e gatshme)
// ═══════════════════════════════════════════════════════
router.get('/remarks', (req, res) => {
    const remarks = db.prepare('SELECT * FROM remarks WHERE tenant_id = ? ORDER BY category, remark')
        .all(req.tenantId);
    res.json({ remarks });
});

router.post('/remarks', (req, res) => {
    const { remark, category } = req.body;
    if (!remark) return res.status(400).json({ error: 'Shënimi është i detyrueshëm' });

    const result = db.prepare(`
        INSERT INTO remarks (tenant_id, remark, category)
        VALUES (?, ?, ?)
    `).run(req.tenantId, remark, category || 'general');

    const r = db.prepare('SELECT * FROM remarks WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, remark: r });
});

router.delete('/remarks/:id', (req, res) => {
    db.prepare('DELETE FROM remarks WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId);
    res.json({ success: true });
});

module.exports = router;

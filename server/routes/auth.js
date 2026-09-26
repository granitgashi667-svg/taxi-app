'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../auth');
const { authMiddleware } = require('../middleware');
const { tenantMiddleware } = require('../tenant');

// ═══════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════
router.post('/login', (req, res) => {
    const { username, password, tenantCode } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username dhe password janë të detyrueshme' });
    }

    const result = auth.login(username, password, tenantCode || 'default');
    if (result.error) {
        return res.status(401).json({ error: result.error });
    }

    res.json(result);
});

// ═══════════════════════════════════════════════════════
// ME (kush jam unë)
// ═══════════════════════════════════════════════════════
router.get('/me', authMiddleware, (req, res) => {
    const user = db.prepare(`
        SELECT id, username, name, surname, email, role, phone, avatar, tenant_id
        FROM users WHERE id = ? AND tenant_id = ?
    `).get(req.user.userId, req.user.tenantId);

    if (!user) return res.status(404).json({ error: 'User nuk u gjet' });
    res.json({ user });
});

// ═══════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════
router.post('/logout', authMiddleware, (req, res) => {
    try {
        auth.logout(req.user.userId);
    } catch (e) { /* silent */ }
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════
// NDRYSHO PASSWORD
// ═══════════════════════════════════════════════════════
router.post('/change-password', authMiddleware, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const result = auth.changePassword(req.user.userId, oldPassword, newPassword);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
});

module.exports = router;

'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./database');
const auth = require('./auth');
const { tenantMiddleware } = require('./tenant');
const { authMiddleware, requireRole, errorHandler } = require('./middleware');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// ═══════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
});
app.use('/api/', limiter);

// Uploads static
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Frontend static
app.use(express.static(path.join(__dirname, '..')));

// ═══════════════════════════════════════════════════════
// ROUTES PUBLIKE
// ═══════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), version: '3.0.0' });
});

// ═══ LOGIN ═══
app.post('/api/auth/login', tenantMiddleware, (req, res) => {
    const { username, password, tenantCode } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username dhe password janë të detyrueshme' });
    }
    const result = auth.login(username, password, tenantCode || 'default');
    if (result.error) return res.status(401).json({ error: result.error });
    res.json(result);
});

// ═══ LOGOUT ═══
app.post('/api/auth/logout', authMiddleware, (req, res) => {
    auth.logout(req.user.userId);
    res.json({ success: true });
});

// ═══ ME (info i userit aktual) ═══
app.get('/api/auth/me', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT id, username, name, surname, role, phone, email, address, avatar, tenant_id FROM users WHERE id = ?')
        .get(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User nuk u gjet' });
    res.json({ user });
});

// ═══ NDRYSHO PASSWORD ═══
app.post('/api/auth/change-password', authMiddleware, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const result = auth.changePassword(req.user.userId, oldPassword, newPassword);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
});

// ═══════════════════════════════════════════════════════
// ROUTES TË MBROJTURA
// ═══════════════════════════════════════════════════════

// ═══ KRIJO PUNËTOR ═══
app.post('/api/workers', authMiddleware, tenantMiddleware, (req, res) => {
    const result = auth.registerWorker(req.body, req.user.role, req.tenantId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
});

// ═══ LISTO PUNËTORËT ═══
app.get('/api/workers', authMiddleware, tenantMiddleware, requireRole('admin', 'manager', 'director'), (req, res) => {
    const users = db.prepare(`
        SELECT id, username, name, surname, role, phone, email, active, blocked, last_login, created_at
        FROM users WHERE tenant_id = ? ORDER BY role, name
    `).all(req.tenantId);
    res.json({ users });
});

// ═══ STATUSI I PUNËTORËVE (aktive/joaktiv) ═══
app.get('/api/workers/status', authMiddleware, tenantMiddleware, (req, res) => {
    const users = db.prepare(`
        SELECT id, username, name, role, last_login,
               CASE WHEN last_login > datetime('now', '-5 minutes') THEN 1 ELSE 0 END as online
        FROM users WHERE tenant_id = ? AND active = 1
    `).all(req.tenantId);
    res.json({ users });
});

// ═══ ORËT E PUNËS — sot ═══
app.get('/api/hours/today', authMiddleware, tenantMiddleware, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const hours = db.prepare(`
        SELECT h.*, u.name, u.username, u.role
        FROM hours_log h
        JOIN users u ON h.user_id = u.id
        WHERE h.tenant_id = ? AND h.date = ?
        ORDER BY h.login_at
    `).all(req.tenantId, today);
    res.json({ hours });
});

// ═══ ORËT E PUNËS — sipas datës ═══
app.get('/api/hours/:userId', authMiddleware, tenantMiddleware, (req, res) => {
    const { from, to } = req.query;
    let query = `SELECT * FROM hours_log WHERE user_id = ? AND tenant_id = ?`;
    const params = [req.params.userId, req.tenantId];

    if (from) { query += ` AND date >= ?`; params.push(from); }
    if (to) { query += ` AND date <= ?`; params.push(to); }
    query += ` ORDER BY date DESC LIMIT 90`;

    const hours = db.prepare(query).all(...params);
    res.json({ hours });
});

// ═══ KRIJO TENANT (vetëm admin) ═══
app.post('/api/tenants', authMiddleware, requireRole('admin'), (req, res) => {
    const { createTenant } = require('./tenant');
    const result = createTenant(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
});

// ═══ LISTO TENANTS (vetëm admin) ═══
app.get('/api/tenants', authMiddleware, requireRole('admin'), (req, res) => {
    const { listTenants } = require('./tenant');
    res.json({ tenants: listTenants() });
});

// ═══ STATISTIKA DITOR ═══
app.get('/api/stats/daily', authMiddleware, tenantMiddleware, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);

    const stats = db.prepare(`
        SELECT
            COUNT(*) as total_orders,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
            SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as revenue
        FROM orders
        WHERE tenant_id = ? AND DATE(created_at) = ?
    `).get(req.tenantId, today);

    res.json({ stats });
});

// ═══════════════════════════════════════════════════════
// ERROR HANDLER
// ═══════════════════════════════════════════════════════
app.use(errorHandler);

// ═══════════════════════════════════════════════════════
// NISJE
// ═══════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;

initSocket(server);

server.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║                                                   ║');
    console.log('║       🚕 TAXIAPP 3.0 — SERVER LOKAL              ║');
    console.log('║                                                   ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Serveri u nis: http://localhost:${PORT}`);
    console.log(`✅ Database: ${process.env.DB_PATH || './data/taxiapp.db'}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('📋 Hapat tjerë:');
    console.log('   1. Hap http://localhost:3000/admin.html');
    console.log('   2. Login: G / 1');
    console.log('   3. Regjistro operatorë dhe shoferë');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Duke u mbyllur...');
    db.close();
    process.exit(0);
});

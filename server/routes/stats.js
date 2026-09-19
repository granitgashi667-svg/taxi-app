'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware');
const { tenantMiddleware } = require('../tenant');

router.use(authMiddleware);
router.use(tenantMiddleware);

// ═══════════════════════════════════════════════════════
// STATISTIKA DITOR — sipas operatorëve
// ═══════════════════════════════════════════════════════
router.get('/daily', (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const stats = db.prepare(`
        SELECT
            u.id as operator_id,
            u.name as operator_name,
            u.username,
            COUNT(o.id) as total_orders,
            SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN o.status = 'waiting' THEN 1 ELSE 0 END) as waiting,
            COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price ELSE 0 END), 0) as revenue,
            ROUND(COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price ELSE 0 END), 0) / NULLIF(SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END), 0), 2) as avg_price
        FROM users u
        LEFT JOIN orders o ON o.created_by = u.id AND DATE(o.created_at) = ?
        WHERE u.tenant_id = ? AND u.role IN ('operator', 'dispatcher', 'supervisor')
        GROUP BY u.id
        ORDER BY total_orders DESC
    `).all(targetDate, req.tenantId);

    // Total
    const totals = stats.reduce((acc, s) => ({
        total_orders: acc.total_orders + (s.total_orders || 0),
        completed: acc.completed + (s.completed || 0),
        cancelled: acc.cancelled + (s.cancelled || 0),
        revenue: acc.revenue + (s.revenue || 0)
    }), { total_orders: 0, completed: 0, cancelled: 0, revenue: 0 });

    // % për çdo operator
    stats.forEach(s => {
        s.success_rate = s.total_orders > 0
            ? Math.round((s.completed / s.total_orders) * 100 * 100) / 100
            : 0;
        s.cancel_rate = s.total_orders > 0
            ? Math.round((s.cancelled / s.total_orders) * 100 * 100) / 100
            : 0;
    });

    res.json({ stats, totals, date: targetDate });
});

// ═══════════════════════════════════════════════════════
// STATISTIKA DITOR — për shoferët
// ═══════════════════════════════════════════════════════
router.get('/drivers-daily', (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const stats = db.prepare(`
        SELECT
            u.id as driver_id,
            u.name as driver_name,
            u.username,
            v.vehicle_number,
            COUNT(o.id) as total_orders,
            SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed,
            COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price ELSE 0 END), 0) as revenue
        FROM users u
        LEFT JOIN vehicles v ON v.driver_id = u.id
        LEFT JOIN orders o ON o.driver_id = u.id AND DATE(o.created_at) = ?
        WHERE u.tenant_id = ? AND u.role = 'driver'
        GROUP BY u.id
        ORDER BY revenue DESC
    `).all(targetDate, req.tenantId);

    res.json({ stats, date: targetDate });
});

// ═══════════════════════════════════════════════════════
// TOP OPERATORËT — periudhë
// ═══════════════════════════════════════════════════════
router.get('/top-operators', (req, res) => {
    const { period = 'today' } = req.query;

    let dateFilter = '';
    if (period === 'today') dateFilter = `AND DATE(o.created_at) = DATE('now')`;
    else if (period === 'week') dateFilter = `AND o.created_at > datetime('now', '-7 days')`;
    else if (period === 'month') dateFilter = `AND o.created_at > datetime('now', '-30 days')`;
    else if (period === 'year') dateFilter = `AND o.created_at > datetime('now', '-365 days')`;

    const stats = db.prepare(`
        SELECT
            u.id, u.name, u.username,
            COUNT(o.id) as total_orders,
            SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed,
            COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price ELSE 0 END), 0) as revenue
        FROM users u
        JOIN orders o ON o.created_by = u.id
        WHERE u.tenant_id = ? ${dateFilter}
        GROUP BY u.id
        ORDER BY completed DESC
        LIMIT 10
    `).all(req.tenantId);

    res.json({ stats, period });
});

// ═══════════════════════════════════════════════════════
// TOP SHOFRËT — periudhë
// ═══════════════════════════════════════════════════════
router.get('/top-drivers', (req, res) => {
    const { period = 'today' } = req.query;

    let dateFilter = '';
    if (period === 'today') dateFilter = `AND DATE(o.created_at) = DATE('now')`;
    else if (period === 'week') dateFilter = `AND o.created_at > datetime('now', '-7 days')`;
    else if (period === 'month') dateFilter = `AND o.created_at > datetime('now', '-30 days')`;
    else if (period === 'year') dateFilter = `AND o.created_at > datetime('now', '-365 days')`;

    const stats = db.prepare(`
        SELECT
            u.id, u.name, u.username,
            v.vehicle_number,
            COUNT(o.id) as total_orders,
            SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed,
            COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price ELSE 0 END), 0) as revenue
        FROM users u
        LEFT JOIN vehicles v ON v.driver_id = u.id
        JOIN orders o ON o.driver_id = u.id
        WHERE u.tenant_id = ? ${dateFilter}
        GROUP BY u.id
        ORDER BY revenue DESC
        LIMIT 10
    `).all(req.tenantId);

    res.json({ stats, period });
});

// ═══════════════════════════════════════════════════════
// STATISTIKA GLOBALE
// ═══════════════════════════════════════════════════════
router.get('/overview', (req, res) => {
    const today = new Date().toISOString().slice(0, 10);

    const todayStats = db.prepare(`
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as revenue
        FROM orders WHERE tenant_id = ? AND DATE(created_at) = ?
    `).get(req.tenantId, today);

    const monthStats = db.prepare(`
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END), 0) as revenue
        FROM orders WHERE tenant_id = ? AND created_at > datetime('now', '-30 days')
    `).get(req.tenantId);

    const activeDrivers = db.prepare(`
        SELECT COUNT(DISTINCT driver_id) as count
        FROM orders
        WHERE tenant_id = ? AND status IN ('assigned','onroute','arrived','taximeter','fixed')
    `).get(req.tenantId);

    const onlineUsers = db.prepare(`
        SELECT COUNT(*) as count FROM users
        WHERE tenant_id = ? AND last_login > datetime('now', '-5 minutes')
    `).get(req.tenantId);

    res.json({
        today: todayStats,
        month: monthStats,
        activeDrivers: activeDrivers.count,
        onlineUsers: onlineUsers.count
    });
});

// ═══════════════════════════════════════════════════════
// ORËT E PUNËS — përmbledhje ditore
// ═══════════════════════════════════════════════════════
router.get('/hours-summary', (req, res) => {
    const { from, to } = req.query;
    const dateFrom = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateTo = to || new Date().toISOString().slice(0, 10);

    const summary = db.prepare(`
        SELECT
            u.id, u.name, u.username, u.role,
            COUNT(DISTINCT h.date) as days_worked,
            COALESCE(SUM(h.active_minutes), 0) as total_minutes,
            COALESCE(SUM(h.pause_minutes), 0) as total_pause,
            ROUND(COALESCE(SUM(h.active_minutes), 0) / 60.0, 1) as total_hours
        FROM users u
        LEFT JOIN hours_log h ON h.user_id = u.id AND h.date BETWEEN ? AND ?
        WHERE u.tenant_id = ? AND u.active = 1
        GROUP BY u.id
        ORDER BY total_hours DESC
    `).all(dateFrom, dateTo, req.tenantId);

    res.json({ summary, from: dateFrom, to: dateTo });
});

// ═══════════════════════════════════════════════════════
// ORËT E NJË PUNËTORI — detaje
// ═══════════════════════════════════════════════════════
router.get('/hours/:userId', (req, res) => {
    const { from, to } = req.query;
    const dateFrom = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateTo = to || new Date().toISOString().slice(0, 10);

    const hours = db.prepare(`
        SELECT
            date,
            login_at,
            logout_at,
            active_minutes,
            pause_minutes,
            ROUND(active_minutes / 60.0, 2) as hours_worked,
            ROUND(pause_minutes / 60.0, 2) as pause_hours
        FROM hours_log
        WHERE user_id = ? AND tenant_id = ? AND date BETWEEN ? AND ?
        ORDER BY date DESC
    `).all(req.params.userId, req.tenantId, dateFrom, dateTo);

    const user = db.prepare('SELECT id, name, username, role FROM users WHERE id = ? AND tenant_id = ?')
        .get(req.params.userId, req.tenantId);

    res.json({ user, hours, from: dateFrom, to: dateTo });
});

// ═══════════════════════════════════════════════════════
// PAZARET — me filtra
// ═══════════════════════════════════════════════════════
router.get('/revenue', (req, res) => {
    const { from, to, driverId, operatorId } = req.query;
    const dateFrom = from || new Date().toISOString().slice(0, 10);
    const dateTo = to || new Date().toISOString().slice(0, 10);

    let query = `
        SELECT
            DATE(o.created_at) as date,
            COUNT(*) as total_orders,
            SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
            COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.price ELSE 0 END), 0) as revenue
        FROM orders o
        WHERE o.tenant_id = ? AND DATE(o.created_at) BETWEEN ? AND ?
    `;
    const params = [req.tenantId, dateFrom, dateTo];

    if (driverId) { query += ` AND o.driver_id = ?`; params.push(driverId); }
    if (operatorId) { query += ` AND o.created_by = ?`; params.push(operatorId); }

    query += ` GROUP BY DATE(o.created_at) ORDER BY date DESC`;

    const revenue = db.prepare(query).all(...params);

    const total = revenue.reduce((acc, r) => ({
        total_orders: acc.total_orders + r.total_orders,
        completed: acc.completed + r.completed,
        cancelled: acc.cancelled + r.cancelled,
        revenue: acc.revenue + r.revenue
    }), { total_orders: 0, completed: 0, cancelled: 0, revenue: 0 });

    res.json({ revenue, total, from: dateFrom, to: dateTo });
});

module.exports = router;

'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-ME-IN-PRODUCTION';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ═══════════════════════════════════════════════════════
// GJENERO TOKEN
// ═══════════════════════════════════════════════════════
function generateToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            role: user.role,
            tenantId: user.tenant_id
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// ═══════════════════════════════════════════════════════
// VERIFIKO TOKEN
// ═══════════════════════════════════════════════════════
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

// ═══════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════
function login(username, password, tenantCode = 'default') {
    // Gjej tenantin
    const tenant = db.prepare('SELECT * FROM tenants WHERE code = ? AND active = 1').get(tenantCode);
    if (!tenant) {
        return { error: 'Kompania nuk ekziston' };
    }

    // Gjej userin
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND tenant_id = ?')
        .get(username, tenant.id);

    if (!user) {
        return { error: 'Username ose fjalëkalim i gabuar' };
    }

    if (user.blocked) {
        return { error: 'Llogaria është e bllokuar' };
    }

    if (!user.active) {
        return { error: 'Llogaria nuk është aktive' };
    }

    // Verifiko password
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
        return { error: 'Username ose fjalëkalim i gabuar' };
    }

    // Përditëso last_login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Ruaj në hours_log (login)
    const today = new Date().toISOString().slice(0, 10);
    const existing = db.prepare('SELECT * FROM hours_log WHERE user_id = ? AND date = ?').get(user.id, today);
    if (!existing) {
        db.prepare(`
            INSERT INTO hours_log (tenant_id, user_id, login_at, date)
            VALUES (?, ?, CURRENT_TIMESTAMP, ?)
        `).run(tenant.id, user.id, today);
    }

    // Audit log
    db.prepare(`
        INSERT INTO audit_log (tenant_id, user_id, action, details)
        VALUES (?, ?, 'login', ?)
    `).run(tenant.id, user.id, JSON.stringify({ username }));

    // Gjenero token
    const token = generateToken(user);

    return {
        success: true,
        token,
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            surname: user.surname,
            role: user.role,
            tenantId: user.tenant_id,
            avatar: user.avatar
        }
    };
}

// ═══════════════════════════════════════════════════════
// REGJISTRO PUNËTOR (vetëm admin/manager)
// ═══════════════════════════════════════════════════════
function registerWorker(data, creatorRole, creatorTenantId) {
    // Vetëm admin/manager mund të regjistrojnë
    if (!['admin', 'manager', 'director'].includes(creatorRole)) {
        return { error: 'Nuk ke leje për të regjistruar punëtorë' };
    }

    const { username, password, name, surname, role, phone, email, address } = data;

    if (!username || !password || !name || !role) {
        return { error: 'Username, password, name dhe role janë të detyrueshme' };
    }

    const validRoles = ['admin', 'director', 'manager', 'supervisor', 'operator', 'dispatcher', 'driver'];
    if (!validRoles.includes(role)) {
        return { error: 'Rol i pavlefshëm' };
    }

    // Vetëm admin mund të krijojë admin/director
    if (['admin', 'director'].includes(role) && creatorRole !== 'admin') {
        return { error: 'Vetëm admin mund të krijojë admin/director' };
    }

    // Kontrollo ekzistencën
    const existing = db.prepare('SELECT * FROM users WHERE username = ? AND tenant_id = ?')
        .get(username, creatorTenantId);
    if (existing) {
        return { error: 'Ky username ekziston' };
    }

    // Hash password
    const hash = bcrypt.hashSync(password, 10);

    // Krijo user
    const result = db.prepare(`
        INSERT INTO users (tenant_id, username, password_hash, name, surname, role, phone, email, address, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(creatorTenantId, username, hash, name, surname || null, role, phone || null, email || null, address || null);

    // Audit log
    db.prepare(`
        INSERT INTO audit_log (tenant_id, action, details)
        VALUES (?, 'user_created', ?)
    `).run(creatorTenantId, JSON.stringify({ username, role }));

    return {
        success: true,
        userId: result.lastInsertRowid,
        message: `Punëtori ${name} u krijua me username "${username}"`
    };
}

// ═══════════════════════════════════════════════════════
// NDRYSHO PASSWORD
// ═══════════════════════════════════════════════════════
function changePassword(userId, oldPassword, newPassword) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return { error: 'User nuk u gjet' };

    const valid = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!valid) return { error: 'Fjalëkalimi i vjetër është i gabuar' };

    if (!newPassword || newPassword.length < 1) {
        return { error: 'Fjalëkalimi i re është shumë i shkurtër' };
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(hash, userId);

    return { success: true };
}

// ═══════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════
function logout(userId) {
    const today = new Date().toISOString().slice(0, 10);
    db.prepare(`
        UPDATE hours_log
        SET logout_at = CURRENT_TIMESTAMP,
            active_minutes = CAST((julianday(CURRENT_TIMESTAMP) - julianday(login_at)) * 24 * 60 AS INTEGER)
        WHERE user_id = ? AND date = ? AND logout_at IS NULL
    `).run(userId, today);

    db.prepare(`
        INSERT INTO audit_log (user_id, action)
        VALUES (?, 'logout')
    `).run(userId);

    return { success: true };
}

module.exports = {
    generateToken,
    verifyToken,
    login,
    registerWorker,
    changePassword,
    logout
};

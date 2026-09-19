'use strict';

const db = require('./database');

// ═══════════════════════════════════════════════════════
// MIDDLEWARE MULTI-TENANT
// ═══════════════════════════════════════════════════════

function tenantMiddleware(req, res, next) {
    // Merr tenantId nga token (i vendosur nga authMiddleware)
    if (req.user && req.user.tenantId) {
        req.tenantId = req.user.tenantId;
    } else {
        // Fallback: tenant default për kërkesat publike
        const tenant = db.prepare('SELECT * FROM tenants WHERE code = ?')
            .get(process.env.DEFAULT_TENANT || 'default');
        req.tenantId = tenant ? tenant.id : null;
    }

    if (!req.tenantId) {
        return res.status(400).json({ error: 'Tenant nuk u gjet' });
    }

    next();
}

// ═══════════════════════════════════════════════════════
// KRIJO TENANT TË RE
// ═══════════════════════════════════════════════════════
function createTenant(data) {
    const { code, name, phone, email, address } = data;

    if (!code || !name) {
        return { error: 'Kodi dhe emri janë të detyrueshme' };
    }

    const existing = db.prepare('SELECT * FROM tenants WHERE code = ?').get(code);
    if (existing) {
        return { error: 'Ky kod ekziston' };
    }

    const result = db.prepare(`
        INSERT INTO tenants (code, name, phone, email, address)
        VALUES (?, ?, ?, ?, ?)
    `).run(code, name, phone || null, email || null, address || null);

    return {
        success: true,
        tenantId: result.lastInsertRowid,
        message: `Kompania ${name} u krijua`
    };
}

// ═══════════════════════════════════════════════════════
// LISTO TENANTS
// ═══════════════════════════════════════════════════════
function listTenants() {
    return db.prepare('SELECT * FROM tenants ORDER BY name').all();
}

module.exports = {
    tenantMiddleware,
    createTenant,
    listTenants
};

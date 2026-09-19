'use strict';

const { verifyToken } = require('./auth');

// ═══════════════════════════════════════════════════════
// AUTH MIDDLEWARE — Verifikon JWT
// ═══════════════════════════════════════════════════════
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token mungon' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Token i pavlefshëm ose ka skaduar' });
    }

    req.user = decoded;
    next();
}

// ═══════════════════════════════════════════════════════
// ROLE MIDDLEWARE — Kontrollon rolin
// ═══════════════════════════════════════════════════════
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Nuk je i kyçur' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Roli "${req.user.role}" nuk ka leje për këtë veprim`
            });
        }

        next();
    };
}

// ═══════════════════════════════════════════════════════
// ERROR HANDLER
// ═══════════════════════════════════════════════════════
function errorHandler(err, req, res, next) {
    console.error('❌ Error:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ error: 'Nuk je i autorizuar' });
    }

    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Gabim i brendshëm'
            : err.message
    });
}

module.exports = {
    authMiddleware,
    requireRole,
    errorHandler
};

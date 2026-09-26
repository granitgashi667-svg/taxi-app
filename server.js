'use strict';

/**
 * server.js — TaxiApp 3.0
 * Server lokal Node.js + SQLite (TaxiApp.DB)
 * Zëvendëson plotësisht Firebase.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'TaxiApp.DB');

// ═══ HAP/KRIJO DB ═══
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('📁 TaxiApp.DB:', DB_FILE);

// ═══ SKEMA ═══
function ensureSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firestoreId TEXT UNIQUE,
            phone TEXT NOT NULL,
            name TEXT,
            pickup TEXT,
            destination TEXT,
            zone TEXT,
            tariff TEXT,
            remark TEXT,
            status TEXT DEFAULT 'waiting',
            vehicle TEXT,
            vehicleNum TEXT,
            driverId TEXT,
            driverName TEXT,
            price REAL DEFAULT 0,
            isPreorder INTEGER DEFAULT 0,
            terminDate TEXT,
            terminTime TEXT,
            terminLead INTEGER,
            terminRepeat TEXT,
            waitStart INTEGER,
            createdAt INTEGER,
            createdAtLocal INTEGER,
            completedAt INTEGER,
            cancelledAt INTEGER,
            history TEXT DEFAULT '[]',
            lat REAL,
            lng REAL
        );

        CREATE TABLE IF NOT EXISTS drivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firestoreId TEXT UNIQUE,
            name TEXT,
            phone TEXT,
            vehicleId INTEGER,
            status TEXT,
            mode TEXT,
            rating REAL DEFAULT 5.0,
            trips INTEGER DEFAULT 0,
            lat REAL,
            lng REAL,
            avatar TEXT,
            raw TEXT
        );

        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firestoreId TEXT UNIQUE,
            plate TEXT,
            model TEXT,
            driver INTEGER,
            raw TEXT
        );

        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE,
            name TEXT,
            email TEXT,
            createdAt INTEGER,
            totalTrips INTEGER DEFAULT 0,
            totalSpent REAL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zoneId TEXT UNIQUE,
            name TEXT,
            color TEXT,
            tariff REAL,
            polygon TEXT,
            raw TEXT
        );

        CREATE TABLE IF NOT EXISTS addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            addressId INTEGER UNIQUE,
            name TEXT,
            alias TEXT,
            lat REAL,
            lng REAL,
            zone TEXT,
            category TEXT,
            priority INTEGER,
            raw TEXT
        );

        CREATE TABLE IF NOT EXISTS operators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firestoreId TEXT UNIQUE,
            email TEXT UNIQUE,
            name TEXT,
            role TEXT,
            passwordHash TEXT,
            stats TEXT DEFAULT '{}',
            createdAt INTEGER,
            loggedIn INTEGER DEFAULT 0,
            loginTime INTEGER
        );

        CREATE TABLE IF NOT EXISTS calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT,
            name TEXT,
            lastAddress TEXT,
            status TEXT,
            duration INTEGER,
            createdAt INTEGER,
            raw TEXT
        );

        CREATE TABLE IF NOT EXISTS blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE,
            reason TEXT,
            createdAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor TEXT,
            action TEXT,
            target TEXT,
            meta TEXT,
            createdAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId TEXT,
            fromRole TEXT,
            toRole TEXT,
            text TEXT,
            createdAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
        CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(createdAt);
        CREATE INDEX IF NOT EXISTS idx_drivers_vehicle ON drivers(vehicleId);
    `);
}

ensureSchema();

// ═══ SEED (herën e parë) ═══
function seedFromDataJs() {
    try {
        const dataPath = path.join(__dirname, 'data.js');
        if (!fs.existsSync(dataPath)) return;

        const code = fs.readFileSync(dataPath, 'utf8');
        const sandbox = { window: {}, console };
        const vm = require('vm');
        const ctx = vm.createContext(sandbox);
        // Striptezo `'use strict'` për të lejuar var
        vm.runInContext(code.replace(/^'use strict';\s*/,''), ctx);

        const T = sandbox.window.TaxiData;
        if (!T) return;

        // Drivers
        const drvCount = db.prepare('SELECT COUNT(*) AS c FROM drivers').get().c;
        if (drvCount === 0 && T.drivers) {
            const ins = db.prepare(`INSERT INTO drivers
                (firestoreId, name, phone, vehicleId, status, mode, rating, trips, lat, lng, avatar, raw)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
            const tx = db.transaction(rows => {
                rows.forEach(d => ins.run(
                    String(d.id), d.name, d.phone, d.vehicleId,
                    d.status, d.mode, d.rating, d.trips,
                    d.lat, d.lng, d.avatar, JSON.stringify(d)
                ));
            });
            tx(T.drivers);
            console.log('🌱 Seed: ' + T.drivers.length + ' shoferë');
        }

        // Vehicles
        const vCount = db.prepare('SELECT COUNT(*) AS c FROM vehicles').get().c;
        if (vCount === 0 && T.vehicles) {
            const ins = db.prepare(`INSERT INTO vehicles
                (firestoreId, plate, model, driver, raw) VALUES (?,?,?,?,?)`);
            const tx = db.transaction(rows => {
                rows.forEach(v => ins.run(String(v.id), v.plate, v.model, v.driver, JSON.stringify(v)));
            });
            tx(T.vehicles);
            console.log('🌱 Seed: ' + T.vehicles.length + ' vetura');
        }

        // Zones
        const zCount = db.prepare('SELECT COUNT(*) AS c FROM zones').get().c;
        if (zCount === 0 && T.zones) {
            const ins = db.prepare(`INSERT INTO zones
                (zoneId, name, color, tariff, polygon, raw) VALUES (?,?,?,?,?,?)`);
            const tx = db.transaction(rows => {
                rows.forEach(z => ins.run(z.id, z.name, z.color, z.tariff, JSON.stringify(z.polygon), JSON.stringify(z)));
            });
            tx(T.zones);
            console.log('🌱 Seed: ' + T.zones.length + ' zona');
        }

        // Addresses
        const aCount = db.prepare('SELECT COUNT(*) AS c FROM addresses').get().c;
        if (aCount === 0 && T.addresses) {
            const ins = db.prepare(`INSERT INTO addresses
                (addressId, name, alias, lat, lng, zone, category, priority, raw)
                VALUES (?,?,?,?,?,?,?,?,?)`);
            const tx = db.transaction(rows => {
                rows.forEach(a => ins.run(a.id, a.name, JSON.stringify(a.alias || []), a.lat, a.lng, a.zone, a.category, a.priority, JSON.stringify(a)));
            });
            tx(T.addresses);
            console.log('🌱 Seed: ' + T.addresses.length + ' adresa');
        }
    } catch (e) {
        console.warn('⚠️  Seed error:', e.message);
    }
}

seedFromDataJs();

// ═══ EXPRESS ═══
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));

// Helper — firestoreId unik
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ═══ GENERIC CRUD ═══
function attachCrud(routeName, table, transformer) {
    // LIST
    app.get(`/api/${routeName}`, (req, res) => {
        try {
            const where = [];
            const params = [];
            Object.keys(req.query).forEach(k => {
                if (['limit','offset','orderBy','orderDir','search'].includes(k)) return;
                where.push(`${k} = ?`);
                params.push(req.query[k]);
            });
            const sql = `SELECT * FROM ${table}` +
                (where.length ? ' WHERE ' + where.join(' AND ') : '') +
                (req.query.orderBy ? ` ORDER BY ${req.query.orderBy} ${req.query.orderDir || 'ASC'}` : '') +
                (req.query.limit ? ` LIMIT ${parseInt(req.query.limit)}` : '');
            const rows = db.prepare(sql).all(...params);
            res.json(rows.map(r => transformer ? transformer(r) : r));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // GET ONE
    app.get(`/api/${routeName}/:id`, (req, res) => {
        try {
            const row = db.prepare(`SELECT * FROM ${table} WHERE firestoreId = ? OR id = ?`).get(req.params.id, req.params.id);
            if (!row) return res.status(404).json({ error: 'not found' });
            res.json(transformer ? transformer(row) : row);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // CREATE
    app.post(`/api/${routeName}`, (req, res) => {
        try {
            const body = { ...req.body };
            body.firestoreId = body.firestoreId || uid();
            body.createdAt = body.createdAt || Date.now();
            const keys = Object.keys(body).filter(k => k !== 'id');
            const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`;
            const info = db.prepare(sql).run(...keys.map(k => {
                const v = body[k];
                return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
            }));
            const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid);
            res.json(transformer ? transformer(row) : row);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // UPDATE
    app.put(`/api/${routeName}/:id`, (req, res) => {
        try {
            const body = { ...req.body };
            delete body.id;
            const keys = Object.keys(body);
            if (!keys.length) return res.json({ ok: true });
            const sql = `UPDATE ${table} SET ${keys.map(k => `${k} = ?`).join(',')} WHERE firestoreId = ? OR id = ?`;
            db.prepare(sql).run(
                ...keys.map(k => {
                    const v = body[k];
                    return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
                }),
                req.params.id, req.params.id
            );
            const row = db.prepare(`SELECT * FROM ${table} WHERE firestoreId = ? OR id = ?`).get(req.params.id, req.params.id);
            res.json(transformer ? transformer(row) : row);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // DELETE
    app.delete(`/api/${routeName}/:id`, (req, res) => {
        try {
            db.prepare(`DELETE FROM ${table} WHERE firestoreId = ? OR id = ?`).run(req.params.id, req.params.id);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
}

// Transformers (rregullojnë tipet)
const orderT = r => ({ ...r, isPreorder: !!r.isPreorder, history: safeJson(r.history, []) });
const driverT = r => ({ ...r });
const vehicleT = r => ({ ...r });
const zoneT = r => ({ ...r, polygon: safeJson(r.polygon, []) });
const addressT = r => ({ ...r, alias: safeJson(r.alias, []) });
const operatorT = r => ({ ...r, stats: safeJson(r.stats, {}) });

function safeJson(s, def) { try { return JSON.parse(s); } catch { return def; } }

attachCrud('orders', 'orders', orderT);
attachCrud('drivers', 'drivers', driverT);
attachCrud('vehicles', 'vehicles', vehicleT);
attachCrud('zones', 'zones', zoneT);
attachCrud('addresses', 'addresses', addressT);
attachCrud('operators', 'operators', operatorT);
attachCrud('calls', 'calls');
attachCrud('blacklist', 'blacklist');
attachCrud('audit_log', 'audit_log');
attachCrud('messages', 'messages');
attachCrud('clients', 'clients');

// ═══ SPECIALE ═══

// Klient sipas telefonit
app.get('/api/clients/by-phone/:phone', (req, res) => {
    try {
        const phone = req.params.phone;
        const client = db.prepare('SELECT * FROM clients WHERE phone = ?').get(phone);
        const orders = db.prepare('SELECT * FROM orders WHERE phone = ? ORDER BY createdAt DESC').all(phone).map(orderT);
        const stats = {
            total: orders.length,
            completed: orders.filter(o => o.status === 'completed').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
            revenue: orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.price || 0), 0)
        };
        res.json({ client: client || null, orders, stats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Login operator
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password, role } = req.body;
        const op = db.prepare('SELECT * FROM operators WHERE email = ?').get(email);
        if (!op) return res.status(401).json({ error: 'Nuk ekziston' });
        // Hash i thjeshtë (SHA-256) — zëvendësohet me bcrypt nëse do
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (op.passwordHash && op.passwordHash !== hash) {
            return res.status(401).json({ error: 'Fjalëkalim i gabuar' });
        }
        if (role && op.role !== role) {
            return res.status(403).json({ error: 'Rol i gabuar' });
        }
        db.prepare('UPDATE operators SET loggedIn = 1, loginTime = ? WHERE id = ?').run(Date.now(), op.id);
        res.json(operatorT(op));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Logout
app.post('/api/auth/logout/:id', (req, res) => {
    try {
        db.prepare('UPDATE operators SET loggedIn = 0 WHERE id = ? OR firestoreId = ?').run(req.params.id, req.params.id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Settings
app.get('/api/settings/:key', (req, res) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
    res.json({ key: req.params.key, value: row ? safeJson(row.value, row.value) : null });
});
app.put('/api/settings/:key', (req, res) => {
    const val = JSON.stringify(req.body.value);
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(req.params.key, val);
    res.json({ ok: true });
});

// Health
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        db: DB_FILE,
        size: fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0,
        orders: db.prepare('SELECT COUNT(*) AS c FROM orders').get().c,
        drivers: db.prepare('SELECT COUNT(*) AS c FROM drivers').get().c,
        time: new Date().toISOString()
    });
});

// Backup — shkarko DB si file
app.get('/api/backup/download', (req, res) => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.download(DB_FILE, `TaxiApp-Backup-${ts}.DB`);
});

// ═══ START ═══
app.listen(PORT, () => {
    console.log('');
    console.log('🚕 TaxiApp 3.0 — SQLite Edition');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Serveri:  http://localhost:${PORT}`);
    console.log(`📁 DB:       ${DB_FILE}`);
    console.log(`📊 API:      http://localhost:${PORT}/api/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Hap:  index.html · admin.html · driver.html · client.html · director.html');
    console.log('');
});

process.on('SIGINT', () => { db.close(); process.exit(0); });

'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/taxiapp.db';

// Krijo folderin nëse nuk ekziston
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Aktivizo WAL për performancë
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ═══════════════════════════════════════════════════════
// SKEMA E DATABAZËS
// ═══════════════════════════════════════════════════════

function initSchema() {
    db.exec(`
        -- ═══ TENANTS (Kompanitë) ═══
        CREATE TABLE IF NOT EXISTS tenants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- ═══ USERS (Punëtorët) ═══
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            surname TEXT,
            role TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            avatar TEXT,
            active INTEGER DEFAULT 1,
            blocked INTEGER DEFAULT 0,
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, username),
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

        -- ═══ VEHICLES (Veturat) ═══
        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            vehicle_number INTEGER NOT NULL,
            registration_number TEXT NOT NULL,
            make TEXT,
            model TEXT,
            color TEXT,
            year INTEGER,
            seats INTEGER,
            engine_power TEXT,
            insurance_policy TEXT,
            insurance_number TEXT,
            mot_expiration DATETIME,
            license_number TEXT,
            license_expiration DATETIME,
            picture TEXT,
            driver_id INTEGER,
            active INTEGER DEFAULT 1,
            deleted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, vehicle_number),
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ CLIENTS (Klientët) ═══
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            phone TEXT NOT NULL,
            name TEXT,
            surname TEXT,
            email TEXT,
            address TEXT,
            password_hash TEXT,
            verified INTEGER DEFAULT 0,
            blocked INTEGER DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, phone),
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

        -- ═══ ZONES (Zonat) ═══
        CREATE TABLE IF NOT EXISTS zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            title TEXT NOT NULL,
            polygon TEXT,
            backup_zone_1 TEXT,
            backup_zone_2 TEXT,
            backup_zone_3 TEXT,
            backup_zone_4 TEXT,
            backup_zone_5 TEXT,
            zone_order INTEGER DEFAULT 0,
            department TEXT,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ STANDS (Pikat e parkimit) ═══
        CREATE TABLE IF NOT EXISTS stands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            title TEXT NOT NULL,
            lat REAL,
            lng REAL,
            radius INTEGER DEFAULT 55,
            polygon TEXT,
            backup_stand TEXT,
            stand_order INTEGER DEFAULT 0,
            queue TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ CUSTOM LOCATIONS (Lokacionet) ═══
        CREATE TABLE IF NOT EXISTS custom_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            zone TEXT,
            stand TEXT,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_locations_title ON custom_locations(title);

        -- ═══ TARIFFS (Tarifat) ═══
        CREATE TABLE IF NOT EXISTS tariffs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            tariff_type TEXT DEFAULT 'Default',
            tariff_category TEXT,
            price_km REAL DEFAULT 0.60,
            start_fee REAL DEFAULT 2.00,
            wait_time_hour REAL DEFAULT 1.00,
            percentage REAL DEFAULT 0,
            min_distance REAL DEFAULT 0,
            is_flat INTEGER DEFAULT 0,
            flat_price REAL DEFAULT 0,
            is_default INTEGER DEFAULT 0,
            master_tariff INTEGER DEFAULT 0,
            schedule TEXT,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ REMARKS (Shënimet) ═══
        CREATE TABLE IF NOT EXISTS remarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            remark TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ PREDEFINED MESSAGES ═══
        CREATE TABLE IF NOT EXISTS predefined_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            for_role TEXT DEFAULT 'driver',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ ORDERS (Porositë) ═══
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            order_code TEXT UNIQUE,
            client_id INTEGER,
            driver_id INTEGER,
            vehicle_id INTEGER,
            phone TEXT NOT NULL,
            client_name TEXT,
            pickup TEXT NOT NULL,
            pickup_lat REAL,
            pickup_lng REAL,
            destination TEXT,
            dest_lat REAL,
            dest_lng REAL,
            zone TEXT,
            tariff_id INTEGER,
            remark TEXT,
            price REAL,
            distance_km REAL,
            status TEXT DEFAULT 'waiting',
            is_preorder INTEGER DEFAULT 0,
            preorder_date DATETIME,
            preorder_note TEXT,
            assigned_at DATETIME,
            pickup_at DATETIME,
            completed_at DATETIME,
            cancelled_at DATETIME,
            cancel_reason TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
        CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

        -- ═══ DRIVER QUEUE (Radha e punëtorëve) ═══
        CREATE TABLE IF NOT EXISTS driver_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            driver_id INTEGER NOT NULL,
            stand_code TEXT,
            position INTEGER DEFAULT 0,
            entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_order_at DATETIME,
            active INTEGER DEFAULT 1,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ HOURS LOG (Orët e punës) ═══
        CREATE TABLE IF NOT EXISTS hours_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            login_at DATETIME,
            logout_at DATETIME,
            pause_start DATETIME,
            pause_end DATETIME,
            pause_minutes INTEGER DEFAULT 0,
            active_minutes INTEGER DEFAULT 0,
            date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_hours_user_date ON hours_log(user_id, date);

        -- ═══ MESSAGES (Mesazhet) ═══
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            from_user_id INTEGER,
            to_user_id INTEGER,
            from_type TEXT,
            to_type TEXT,
            message TEXT NOT NULL,
            read_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ SMS LOG ═══
        CREATE TABLE IF NOT EXISTS sms_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            to_phone TEXT NOT NULL,
            message TEXT NOT NULL,
            order_id INTEGER,
            status TEXT DEFAULT 'queued',
            sent_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ OTP CODES ═══
        CREATE TABLE IF NOT EXISTS otp_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            used INTEGER DEFAULT 0,
            attempts INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- ═══ AUDIT LOG ═══
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            ip TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- ═══ SETTINGS ═══
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, key),
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ DRIVER MESSAGES (Chat) ═══
        CREATE TABLE IF NOT EXISTS driver_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            driver_id INTEGER NOT NULL,
            last_message TEXT,
            last_message_at DATETIME,
            unread_by_operator INTEGER DEFAULT 0,
            unread_by_driver INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS driver_messages_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            sender_type TEXT,
            sender_name TEXT,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (thread_id) REFERENCES driver_messages(id) ON DELETE CASCADE
        );

        -- ═══ SALARIES (Pagat) ═══
        CREATE TABLE IF NOT EXISTS salaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            month TEXT NOT NULL,
            base_salary REAL DEFAULT 0,
            bonus REAL DEFAULT 0,
            deductions REAL DEFAULT 0,
            net REAL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            paid_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, user_id, month),
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        -- ═══ AUDIT_LOG e fundit — ndryshimet ═══
        CREATE TABLE IF NOT EXISTS change_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id INTEGER NOT NULL,
            table_name TEXT NOT NULL,
            record_id INTEGER NOT NULL,
            user_id INTEGER,
            action TEXT NOT NULL,
            old_data TEXT,
            new_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('✅ Skema e databazës u inicializua');
}

// ═══════════════════════════════════════════════════════
// KRIJO ADMIN-IN E PARË
// ═══════════════════════════════════════════════════════
function createFirstAdmin() {
    const bcrypt = require('bcryptjs');

    // Krijo tenant default nëse nuk ekziston
    let tenant = db.prepare('SELECT * FROM tenants WHERE code = ?').get('default');
    if (!tenant) {
        const result = db.prepare(`
            INSERT INTO tenants (code, name, phone, email, address)
            VALUES (?, ?, ?, ?, ?)
        `).run('default', 'TaxiApp Demo', '+383 44 000 000', 'info@taxiapp.com', 'Prishtinë, Kosovë');
        tenant = { id: result.lastInsertRowid };
        console.log('✅ Tenant "default" u krijua');
    }

    // Krijo admin nëse nuk ekziston
    const adminUsername = process.env.FIRST_ADMIN_USERNAME || 'G';
    const adminPassword = process.env.FIRST_ADMIN_PASSWORD || '1';
    const adminName = process.env.FIRST_ADMIN_NAME || 'Granit Gashi';

    const existing = db.prepare('SELECT * FROM users WHERE username = ? AND tenant_id = ?')
        .get(adminUsername, tenant.id);

    if (!existing) {
        const hash = bcrypt.hashSync(adminPassword, 10);
        db.prepare(`
            INSERT INTO users (tenant_id, username, password_hash, name, role, active)
            VALUES (?, ?, ?, ?, ?, 1)
        `).run(tenant.id, adminUsername, hash, adminName, 'admin');
        console.log(`✅ Admin u krijua: ${adminUsername} / ${adminPassword}`);
    }
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
initSchema();
createFirstAdmin();

module.exports = db;

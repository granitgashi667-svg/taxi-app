'use strict';

/**
 * audit-log.js — Regjistrimi i veprimeve (kush çka bëri)
 */

window.TaxiAuditLog = (() => {
    const COLLECTION = 'audit_log';
    const buffer = [];
    const MAX_BUFFER = 30;
    let enabled = true;

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ REGJISTRO NJË VEPRIM ═══
    function log(action, details = {}) {
        if (!enabled) return;

        const user = window.TaxiAuth?.currentUser();
        const operator = window.TaxiState?.get('currentOperator');

        const entry = {
            action,
            details,
            userId: user?.uid || null,
            userEmail: user?.email || null,
            userName: operator?.name || 'I panjohur',
            userRole: operator?.role || 'dispatcher',
            timestamp: Date.now(),
            timestampStr: new Date().toLocaleString('sq-AL'),
            ip: 'client',
            userAgent: navigator.userAgent.slice(0, 100)
        };

        buffer.push(entry);
        if (buffer.length > MAX_BUFFER) buffer.shift();

        // Ruaj vetëm veprimet kritike në Firestore
        if (isCritical(action)) {
            saveToFirestore(entry);
        }

        const emoji = getEmoji(action);
        console.log(`${emoji} [${action}]`, details);
    }

    // ═══ VEPRIMET KRITIKE (ruhen në Firestore) ═══
    function isCritical(action) {
        const critical = [
            'order_created', 'order_cancelled', 'order_deleted',
            'order_price_changed', 'order_assigned',
            'client_blocked', 'client_unblocked',
            'driver_blocked', 'driver_kicked', 'driver_paused',
            'user_login', 'user_logout',
            'settings_changed', 'backup_created', 'backup_restored',
            'price_changed', 'tariff_changed',
            'blacklist_add', 'blacklist_remove',
            'commission_changed', 'salary_changed'
        ];
        return critical.includes(action);
    }

    function getEmoji(action) {
        if (action.includes('login')) return '🔓';
        if (action.includes('logout')) return '🔒';
        if (action.includes('order_created')) return '🆕';
        if (action.includes('order_cancelled')) return '❌';
        if (action.includes('order_deleted')) return '🗑️';
        if (action.includes('price')) return '💰';
        if (action.includes('block')) return '🚫';
        if (action.includes('driver')) return '🚗';
        if (action.includes('client')) return '👤';
        if (action.includes('settings')) return '⚙️';
        if (action.includes('backup')) return '💾';
        if (action.includes('error')) return '❌';
        if (action.includes('warn')) return '⚠️';
        if (action.includes('permission')) return '🔐';
        return '📝';
    }

    async function saveToFirestore(entry) {
        const database = db();
        if (!database) return;
        try {
            await database.collection(COLLECTION).add(entry);
        } catch (e) { /* silent */ }
    }

    // ═══ MERR HISTORIKUN ═══
    async function getRecent(limit = 100) {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { return []; }
    }

    async function getByUser(userId, limit = 50) {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION)
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { return []; }
    }

    async function getByAction(action, limit = 50) {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION)
                .where('action', '==', action)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { return []; }
    }

    async function getByDateRange(fromDate, toDate, limit = 200) {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION)
                .where('timestamp', '>=', new Date(fromDate).getTime())
                .where('timestamp', '<=', new Date(toDate).getTime())
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { return []; }
    }

    function getBuffer() { return [...buffer]; }
    function setEnabled(v) { enabled = !!v; }

    return {
        log, getRecent, getByUser, getByAction, getByDateRange,
        getBuffer, setEnabled,
        get enabled() { return enabled; }
    };
})();

console.log('✅ audit-log.js ngarkuar');

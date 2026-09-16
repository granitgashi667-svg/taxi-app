'use strict';

window.TaxiLogger = (() => {
    const COLLECTION = 'logs';
    const buffer = [];
    const MAX_BUFFER = 50;

    function db() { return window.TaxiFirebase?.db || null; }

    function log(level, action, data = {}) {
        const entry = {
            level,
            action,
            data,
            userId: window.TaxiAuth?.currentUser()?.uid || null,
            userEmail: window.TaxiAuth?.currentUser()?.email || null,
            timestamp: new Date().getTime(),
            timestampStr: new Date().toLocaleString('sq-AL')
        };

        buffer.push(entry);
        if (buffer.length > MAX_BUFFER) buffer.shift();

        const emoji = { info: 'ℹ️', warn: '⚠️', error: '❌', success: '✅' }[level] || '📝';
        console.log(`${emoji} [${action}]`, data);

        if (level === 'error' || level === 'warn') {
            saveToFirestore(entry);
        }
    }

    async function saveToFirestore(entry) {
        const database = db();
        if (!database) return;
        try {
            await database.collection(COLLECTION).add(entry);
        } catch (e) { /* silent */ }
    }

    const info = (action, data) => log('info', action, data);
    const warn = (action, data) => log('warn', action, data);
    const error = (action, data) => log('error', action, data);
    const success = (action, data) => log('success', action, data);

    function getBuffer() { return [...buffer]; }

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

    return { log, info, warn, error, success, getBuffer, getRecent };
})();

console.log('✅ logger.js ngarkuar');

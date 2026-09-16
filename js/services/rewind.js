'use strict';

/**
 * rewind.js — Historiku i pozicioneve (rewind 1 vit)
 */

window.TaxiRewind = (() => {
    const COLLECTION = 'positions_history';

    function db() { return window.TaxiFirebase?.db || null; }

    // Regjistro pozicionin
    async function recordPosition(driverId, lat, lng, mode) {
        const database = db();
        if (!database) return;
        try {
            await database.collection(COLLECTION).add({
                driverId,
                lat,
                lng,
                mode: mode || 'unknown',
                timestamp: new Date().getTime()
            });
        } catch (e) { /* silent */ }
    }

    // Marr pozicionet në një interval
    async function getPositions(fromDate, toDate, driverId = null) {
        const database = db();
        if (!database) return [];
        try {
            let q = database.collection(COLLECTION)
                .where('timestamp', '>=', new Date(fromDate).getTime())
                .where('timestamp', '<=', new Date(toDate).getTime());

            if (driverId) q = q.where('driverId', '==', driverId);

            q = q.orderBy('timestamp', 'asc').limit(5000);
            const snap = await q.get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { return []; }
    }

    // Pastro pozicionet e vjetra (>1 vit)
    async function cleanupOldPositions() {
        const database = db();
        if (!database) return;
        try {
            const oneYearAgo = new Date().getTime() - (365 * 86400000);
            const snap = await database.collection(COLLECTION)
                .where('timestamp', '<', oneYearAgo)
                .limit(500)
                .get();

            const batch = database.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            console.log('🧹 U fshinë', snap.size, 'pozicione të vjetra');
        } catch (e) { console.error('❌ cleanup:', e); }
    }

    return { recordPosition, getPositions, cleanupOldPositions };
})();

console.log('✅ rewind.js ngarkuar');

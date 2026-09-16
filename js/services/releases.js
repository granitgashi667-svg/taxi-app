'use strict';

/**
 * releases.js — Lirimet e shoferëve + parashikim
 */

window.TaxiReleases = (() => {
    const COLLECTION = 'releases';

    function db() { return window.TaxiFirebase?.db || null; }

    // Regjistro lirimin
    async function add(data) {
        const database = db();
        if (!database) return null;
        try {
            const release = {
                driverId: data.driverId,
                driverName: data.driverName,
                zoneId: data.zoneId,
                zoneName: data.zoneName,
                releaseTime: new Date().getTime(),
                releaseTimeStr: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
                estimatedFreeTime: data.estimatedFreeTime || (new Date().getTime() + 5 * 60000),
                orderId: data.orderId || null
            };
            const ref = await database.collection(COLLECTION).add(release);
            return { id: ref.id, ...release };
        } catch (e) { console.error('❌ addRelease:', e); return null; }
    }

    // Lirime live
    async function getLive() {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION)
                .where('estimatedFreeTime', '>', new Date().getTime())
                .orderBy('estimatedFreeTime', 'asc')
                .limit(50)
                .get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { return []; }
    }

    // Grupim sipas zonës
    async function byZone() {
        const releases = await getLive();
        const grouped = {};
        releases.forEach(r => {
            if (!grouped[r.zoneId]) {
                grouped[r.zoneId] = { zone: r.zoneName, count: 0, drivers: [] };
            }
            grouped[r.zoneId].count++;
            grouped[r.zoneId].drivers.push({
                name: r.driverName,
                freeIn: Math.max(0, Math.floor((r.estimatedFreeTime - Date.now()) / 60000))
            });
        });
        return Object.values(grouped).sort((a, b) => b.count - a.count);
    }

    return { add, getLive, byZone };
})();

console.log('✅ releases.js ngarkuar');

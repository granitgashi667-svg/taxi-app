'use strict';

/**
 * zones.js — Menaxhimi i zonave (të padukshme)
 */

window.TaxiZones = (() => {
    const COLLECTION = 'zones';

    function db() { return window.TaxiFirebase?.db || null; }

    // Krijo zonë të re
    async function create(data) {
        const database = db();
        if (!database) return null;
        try {
            const zone = {
                name: data.name || 'Zona e re',
                color: data.color || '#a855f7',
                tariff: data.tariff || 2.50,
                polygon: data.polygon || [],
                center: data.center || { lat: 42.6629, lng: 21.1655 },
                activeDrivers: 0,
                avgFreeTime: 0,
                visible: false,
                createdAt: new Date().getTime()
            };
            const ref = await database.collection(COLLECTION).add(zone);
            console.log('✅ Zona u krijua:', ref.id);
            return { id: ref.id, ...zone };
        } catch (e) { console.error('❌ createZone:', e); return null; }
    }

    async function update(zoneId, changes) {
        const database = db();
        if (!database) return;
        try {
            await database.collection(COLLECTION).doc(zoneId).update(changes);
        } catch (e) { console.error('❌ updateZone:', e); }
    }

    async function remove(zoneId) {
        const database = db();
        if (!database) return;
        try {
            await database.collection(COLLECTION).doc(zoneId).delete();
        } catch (e) { console.error('❌ removeZone:', e); }
    }

    async function getAll() {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION).get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { return []; }
    }

    // Gjej zonën për një lat/lng
    function findByCoords(lat, lng, zones) {
        const list = zones || window.TaxiData?.zones || [];
        for (const z of list) {
            if (z.polygon && window.TaxiGeocoding?.isPointInPolygon) {
                if (window.TaxiGeocoding.isPointInPolygon([lat, lng], z.polygon)) return z;
            }
        }
        return null;
    }

    // Lirimet në zona
    async function getReleases() {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection('releases')
                .orderBy('releaseTime', 'desc')
                .limit(50)
                .get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { return []; }
    }

    // Regjistro lirimin e një shoferi
    async function releaseDriver(driverId, driverName, zoneId, zoneName) {
        const database = db();
        if (!database) return null;
        try {
            const release = {
                driverId,
                driverName,
                zoneId,
                zoneName,
                releaseTime: new Date().getTime(),
                releaseTimeStr: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
                estimatedFreeTime: new Date().getTime() + (5 * 60000)
            };
            const ref = await database.collection('releases').add(release);
            return { id: ref.id, ...release };
        } catch (e) { return null; }
    }

    return { create, update, remove, getAll, findByCoords, getReleases, releaseDriver };
})();

console.log('✅ zones.js ngarkuar');

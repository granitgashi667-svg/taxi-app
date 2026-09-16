'use strict';

/**
 * drivers.js — Menaxhimi i shoferëve
 */

window.TaxiDrivers = (() => {
    const COLLECTION = 'drivers';

    function db() { return window.TaxiFirebase?.db || null; }

    // Krijo shofer të re
    async function create(data) {
        const database = db();
        if (!database) return null;
        try {
            const driver = {
                name: data.name || '',
                phone: data.phone || '',
                email: data.email || '',
                vehicleId: data.vehicleId || null,
                status: data.status || 'offline',
                mode: data.mode || 'inactive',
                rating: data.rating || 5.0,
                trips: data.trips || 0,
                avatar: data.avatar || (data.name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
                lat: data.lat || 42.6629,
                lng: data.lng || 21.1655,
                active: true,
                createdAt: new Date().getTime(),
                createdBy: window.TaxiAuth?.currentUser()?.uid || null
            };
            const ref = await database.collection(COLLECTION).add(driver);
            console.log('✅ Shofer u krijua:', ref.id);
            return { id: ref.id, ...driver };
        } catch (e) { console.error('❌ createDriver:', e); return null; }
    }

    // Update
    async function update(driverId, changes) {
        const database = db();
        if (!database) return;
        try {
            await database.collection(COLLECTION).doc(driverId).update({
                ...changes,
                updatedAt: new Date().getTime()
            });
        } catch (e) { console.error('❌ updateDriver:', e); }
    }

    // Fshij
    async function remove(driverId) {
        const database = db();
        if (!database) return;
        try {
            await database.collection(COLLECTION).doc(driverId).delete();
            console.log('✅ Shofer u fshi:', driverId);
        } catch (e) { console.error('❌ removeDriver:', e); }
    }

    // Ndrysho statusin (mode)
    async function setMode(driverId, mode) {
        const statusMap = {
            free: 'available',
            taximeter: 'busy',
            fixed: 'busy',
            pause: 'break',
            inactive: 'offline'
        };
        const status = statusMap[mode] || 'offline';
        await update(driverId, { mode, status });

        // Update marker lokalisht
        const drivers = window.TaxiState?.get('drivers') || [];
        const d = drivers.find(x => x.id === driverId);
        if (d) {
            d.mode = mode;
            d.status = status;
            if (typeof updateVehicleMarker === 'function') updateVehicleMarker(driverId);
        }
    }

    // Bllok / Aktivizo
    async function setActive(driverId, active) {
        await update(driverId, { active });
    }

    // Shto në pauzë / Aktivizo
    async function setPause(driverId, pause) {
        if (pause) {
            await setMode(driverId, 'pause');
        } else {
            await setMode(driverId, 'free');
        }
    }

    // Merr të gjithë nga Firestore
    async function getAll() {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION).get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { console.error('❌ getAllDrivers:', e); return []; }
    }

    // Statistika personale
    async function getStats(driverId) {
        if (!driverId) return null;
        const database = db();
        if (!database) return null;
        try {
            const ordersSnap = await database.collection('orders')
                .where('driverId', '==', driverId)
                .get();

            const orders = ordersSnap.docs.map(doc => doc.data());
            const completed = orders.filter(o => o.status === 'completed');
            const cancelled = orders.filter(o => o.status === 'cancelled');
            const revenue = completed.reduce((s, o) => s + (o.price || 0), 0);

            return {
                totalOrders: orders.length,
                completed: completed.length,
                cancelled: cancelled.length,
                revenue: +revenue.toFixed(2),
                avgPrice: completed.length > 0 ? +(revenue / completed.length).toFixed(2) : 0,
                successRate: orders.length > 0 ? +((completed.length / orders.length) * 100).toFixed(1) : 0
            };
        } catch (e) { console.error('❌ getDriverStats:', e); return null; }
    }

    return { create, update, remove, setMode, setActive, setPause, getAll, getStats };
})();

console.log('✅ drivers.js ngarkuar');

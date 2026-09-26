'use strict';

/**
 * orders.js — Menaxhimi i porosive me TaxiAPI (SQLite)
 * Zëvendëson Firestore me polling çdo 3 sekonda.
 */

window.TaxiOrders = (() => {
    let pollInterval = null;
    let lastOrders = new Map();
    const listeners = { added: [], updated: [], removed: [] };

    // ═══ CREATE ═══
    async function create(orderData) {
        if (!window.TaxiAPI) throw new Error('TaxiAPI nuk është gati');

        const now = new Date();
        const timeStr = window.TaxiUtils.time(now);
        const dateStr = window.TaxiUtils.date(now);

        const order = {
            phone: orderData.phone || '',
            name: orderData.name || 'Klient',
            pickup: orderData.pickup || '',
            destination: orderData.destination || '',
            zone: orderData.zone || 'auto',
            tariff: orderData.tariff || 'standard',
            remark: orderData.remark || '',

            status: orderData.status || 'waiting',

            vehicleId: orderData.vehicleId || null,
            vehicleNum: orderData.vehicleNum || null,
            driverId: orderData.driverId || null,
            driverName: orderData.driverName || null,
            dispatchMode: orderData.dispatchMode || 'auto',

            isPreorder: orderData.isPreorder || false,
            terminDate: orderData.terminDate || null,
            terminTime: orderData.terminTime || null,
            terminLead: orderData.terminLead || 15,
            terminRepeat: orderData.terminRepeat || 'none',
            terminDateTime: orderData.terminDateTime || null,

            createdAtLocal: now.getTime(),
            createdTimeStr: timeStr,
            createdDateStr: dateStr,
            assignedAt: null,
            completedAt: null,

            operatorId: window.TaxiAuth?.currentUser()?.uid || null,
            operatorName: window.TaxiState?.get('currentOperator')?.name || 'Operator',

            price: 0,
            distance: 0,
            duration: 0,
            version: 1
        };

        try {
            const result = await window.TaxiAPI.orders.create(order);
            console.log('✅ Porosia u ruajt:', result.id || result.orderId);
            return result;
        } catch (e) {
            console.error('❌ Gabim ruajtje porosie:', e);
            throw e;
        }
    }

    // ═══ UPDATE ═══
    async function update(orderId, changes) {
        if (!window.TaxiAPI) throw new Error('TaxiAPI nuk është gati');
        try {
            await window.TaxiAPI.orders.update(orderId, {
                ...changes,
                updatedAt: Date.now(),
                updatedBy: window.TaxiAuth?.currentUser()?.email || 'unknown'
            });
            console.log('✅ Porosia u përditësua:', orderId);
        } catch (e) {
            console.error('❌ Gabim update:', e);
            throw e;
        }
    }

    // ═══ REMOVE ═══
    async function remove(orderId) {
        if (!window.TaxiAPI) throw new Error('TaxiAPI nuk është gati');
        try {
            await window.TaxiAPI.orders.delete(orderId);
            console.log('✅ Porosia u fshi:', orderId);
        } catch (e) {
            console.error('❌ Gabim fshirje:', e);
            throw e;
        }
    }

    // ═══ FETCH ALL ═══
    async function fetchAll() {
        try {
            const result = await window.TaxiAPI.orders.list();
            return Array.isArray(result) ? result : (result.orders || []);
        } catch (e) {
            console.error('❌ Gabim leximi orders:', e);
            return [];
        }
    }

    // ═══ POLLING LOGIC (zëvendësim i onSnapshot) ═══
    async function pollOnce() {
        const orders = await fetchAll();
        const newMap = new Map();
        const added = [];
        const updated = [];
        const removed = [];

        orders.forEach((o) => {
            const id = o.id || o._id;
            if (!id) return;
            newMap.set(id, o);

            if (!lastOrders.has(id)) {
                added.push(o);
            } else {
                const prev = lastOrders.get(id);
                // Krahasim i thjeshtë JSON për të detektuar ndryshime
                try {
                    if (JSON.stringify(prev) !== JSON.stringify(o)) {
                        updated.push(o);
                    }
                } catch (e) {
                    updated.push(o);
                }
            }
        });

        lastOrders.forEach((o, id) => {
            if (!newMap.has(id)) removed.push(o);
        });

        lastOrders = newMap;

        if (added.length) {
            listeners.added.forEach((fn) => fn(added));
            window.TaxiEvents?.emit('firestore:order_added', added);
        }
        if (updated.length) {
            listeners.updated.forEach((fn) => fn(updated));
            window.TaxiEvents?.emit('firestore:order_updated', updated);
        }
        if (removed.length) {
            listeners.removed.forEach((fn) => fn(removed));
            window.TaxiEvents?.emit('firestore:order_removed', removed);
        }

        console.log(`📥 SQLite: +${added.length} ~${updated.length} -${removed.length}`);
    }

    // ═══ SUBSCRIBE ═══
    function subscribe() {
        if (pollInterval) clearInterval(pollInterval);

        // Thirrje e menjëhershme
        pollOnce().catch((e) => console.warn('Poll init:', e));

        // Pastaj çdo 3 sekonda
        pollInterval = setInterval(() => {
            pollOnce().catch((e) => console.warn('Poll:', e));
        }, 3000);

        console.log('✅ SQLite: Duke dëgjuar porositë (polling 3s)...');
        return () => unsubscribeAll();
    }

    function unsubscribeAll() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            console.log('✅ SQLite: Ndaloi dëgjimin e porosive');
        }
    }

    async function getAll() {
        return fetchAll();
    }

    return {
        create,
        update,
        remove,
        subscribe,
        unsubscribeAll,
        getAll,
        on: (event, fn) => {
            if (listeners[event]) listeners[event].push(fn);
        }
    };
})();

console.log('✅ orders.js ngarkuar');
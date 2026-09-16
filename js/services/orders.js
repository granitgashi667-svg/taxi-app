'use strict';

/**
 * orders.js — Menaxhimi i porosive me Firestore (real-time)
 */

window.TaxiOrders = (() => {
    const COLLECTION = 'orders';
    let unsubscribe = null;
    const listeners = { added: [], updated: [], removed: [] };

    function db() {
        return window.TaxiFirebase?.db || null;
    }

    function serverTime() {
        return window.TaxiFirebase?.serverTime?.() || new Date();
    }

    async function create(orderData) {
        const database = db();
        if (!database) throw new Error('Firebase nuk është gati');

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

            // Të dhënat e termin-it (nëse ka)
            isPreorder: orderData.isPreorder || false,
            terminDate: orderData.terminDate || null,
            terminTime: orderData.terminTime || null,
            terminLead: orderData.terminLead || 15,
            terminRepeat: orderData.terminRepeat || 'none',
            terminDateTime: orderData.terminDateTime || null,

            createdAt: serverTime(),
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
            const ref = await database.collection(COLLECTION).add(order);
            console.log('✅ Porosia u ruajt:', ref.id);
            return { id: ref.id, ...order };
        } catch (e) {
            console.error('❌ Gabim ruajtje porosie:', e);
            throw e;
        }
    }

    async function update(orderId, changes) {
        const database = db();
        if (!database) throw new Error('Firebase nuk është gati');

        try {
            await database.collection(COLLECTION).doc(orderId).update({
                ...changes,
                updatedAt: serverTime(),
                updatedBy: window.TaxiAuth?.currentUser()?.email || 'unknown'
            });
            console.log('✅ Porosia u përditësua:', orderId);
        } catch (e) {
            console.error('❌ Gabim update:', e);
            throw e;
        }
    }

    async function remove(orderId) {
        const database = db();
        if (!database) throw new Error('Firebase nuk është gati');

        try {
            await database.collection(COLLECTION).doc(orderId).delete();
            console.log('✅ Porosia u fshi:', orderId);
        } catch (e) {
            console.error('❌ Gabim fshirje:', e);
            throw e;
        }
    }

    function subscribe() {
        const database = db();
        if (!database) {
            console.warn('⚠️ Firestore nuk është gati');
            return null;
        }

        if (unsubscribe) unsubscribe();

        unsubscribe = database.collection(COLLECTION)
            .orderBy('createdAtLocal', 'desc')
            .limit(200)
            .onSnapshot(
                (snapshot) => {
                    const added = [];
                    const updated = [];
                    const removed = [];

                    snapshot.docChanges().forEach((change) => {
                        const data = { id: change.doc.id, ...change.doc.data() };
                        if (change.type === 'added') added.push(data);
                        if (change.type === 'modified') updated.push(data);
                        if (change.type === 'removed') removed.push(data);
                    });

                    if (added.length) {
                        listeners.added.forEach(fn => fn(added));
                        window.TaxiEvents?.emit('firestore:order_added', added);
                    }
                    if (updated.length) {
                        listeners.updated.forEach(fn => fn(updated));
                        window.TaxiEvents?.emit('firestore:order_updated', updated);
                    }
                    if (removed.length) {
                        listeners.removed.forEach(fn => fn(removed));
                        window.TaxiEvents?.emit('firestore:order_removed', removed);
                    }

                    console.log(`📥 Firestore: +${added.length} ~${updated.length} -${removed.length}`);
                },
                (error) => {
                    console.error('❌ Firestore listener error:', error);
                }
            );

        console.log('✅ Firestore: Duke dëgjuar porositë...');
        return unsubscribe;
    }

    function unsubscribeAll() {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
            console.log('✅ Firestore: Ndaloi dëgjimin');
        }
    }

    async function getAll() {
        const database = db();
        if (!database) return [];

        try {
            const snapshot = await database.collection(COLLECTION)
                .orderBy('createdAtLocal', 'desc')
                .limit(200)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error('❌ Gabim leximi:', e);
            return [];
        }
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

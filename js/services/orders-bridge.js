'use strict';

/**
 * orders-bridge.js — Lidh sistemin me Firestore + rrugëtim sipas statusit
 * SHKRUAN DIREKT NË AppState (script.js)
 */

window.TaxiOrdersBridge = (() => {
    let isInitialized = false;

    const WAITING_STATUSES = ['waiting', 'new', 'pending'];
    const ACTIVE_STATUSES = ['assigned', 'onroute', 'arrived', 'taximeter', 'fixed', 'delay'];
    const PREORDER_STATUSES = ['preorder'];

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        console.log('🔗 Duke lidhur porositë me Firestore...');

        window.TaxiEvents.on('firestore:order_added', (orders) => {
            console.log('📥 Bridge: added', orders.length);
            orders.forEach(order => addToLocalState(order));
            rerender();
        });

        window.TaxiEvents.on('firestore:order_updated', (orders) => {
            console.log('✏️ Bridge: updated', orders.length);
            orders.forEach(order => addToLocalState(order));
            rerender();
        });

        window.TaxiEvents.on('firestore:order_removed', (orders) => {
            console.log('🗑️ Bridge: removed', orders.length);
            orders.forEach(order => removeFromLocalState(order.id));
            rerender();
        });

        setTimeout(() => {
            syncFromFirestore();
        }, 1000);

        console.log('✅ Bridge u aktivizua');
    }

    async function syncFromFirestore() {
        try {
            const allOrders = await window.TaxiOrders.getAll();
            console.log('🔄 Sync: mora', allOrders.length, 'porosi');

            AppState.orders = [];
            AppState.waitingOrders = [];
            AppState.preOrders = [];

            allOrders.forEach(order => addToLocalState(order));
            rerender();
        } catch (e) {
            console.error('❌ Sync error:', e);
        }
    }

    function addToLocalState(fsOrder) {
        const order = mapToLocal(fsOrder);
        removeFromLocalState(order.firestoreId);

        if (PREORDER_STATUSES.includes(order.status)) {
            AppState.preOrders.unshift(order);
        } else if (WAITING_STATUSES.includes(order.status)) {
            AppState.waitingOrders.unshift(order);
        } else if (ACTIVE_STATUSES.includes(order.status)) {
            AppState.orders.unshift(order);
        }
    }

    function removeFromLocalState(id) {
        AppState.waitingOrders = AppState.waitingOrders.filter(o => o.firestoreId !== id && o.id !== id);
        AppState.orders = AppState.orders.filter(o => o.firestoreId !== id && o.id !== id);
        AppState.preOrders = AppState.preOrders.filter(o => o.firestoreId !== id && o.id !== id);
    }

    function mapToLocal(fsOrder) {
        return {
            id: fsOrder.id,
            firestoreId: fsOrder.id,
            phone: fsOrder.phone || '',
            name: fsOrder.name || 'Klient',
            pickup: fsOrder.pickup || '',
            destination: fsOrder.destination || '',
            status: fsOrder.status || 'waiting',
            vehicle: fsOrder.vehicleNum || '',
            driverName: fsOrder.driverName || '',
            time: fsOrder.createdTimeStr || '',
            // Për preorder, përdor orën e termin-it
            date: fsOrder.terminDate || fsOrder.createdDateStr || '',
            terminDate: fsOrder.terminDate || null,
            terminTime: fsOrder.terminTime || null,
            terminLead: fsOrder.terminLead || 15,
            terminRepeat: fsOrder.terminRepeat || 'none',
            zone: fsOrder.zone || 'auto',
            tariff: fsOrder.tariff || 'standard',
            operator: fsOrder.operatorName || '',
            takenAt: fsOrder.createdTimeStr || '',
            doneAt: '',
            nearbyCars: 0,
            price: fsOrder.price || 0,
            remark: fsOrder.remark || '',
            createdAtLocal: fsOrder.createdAtLocal || Date.now(),
            waitStart: fsOrder.createdAtLocal || Date.now(),
            isPreorder: fsOrder.isPreorder || false
        };
    }

    function rerender() {
        if (typeof renderOrders === 'function') renderOrders();
        if (typeof renderWaitingOrders === 'function') renderWaitingOrders();
        if (typeof renderPreOrders === 'function') renderPreOrders();
        if (typeof updateStats === 'function') updateStats();
    }

    async function createFromData(orderData) {
        if (!window.TaxiOrders) return null;
        try {
            const order = await window.TaxiOrders.create({
                phone: orderData.phone,
                name: orderData.name,
                pickup: orderData.pickup,
                destination: orderData.destination,
                zone: orderData.zone,
                tariff: orderData.tariff,
                remark: orderData.remark,
                status: orderData.status || 'waiting',
                // Termin
                isPreorder: orderData.isPreorder || false,
                terminDate: orderData.terminDate || null,
                terminTime: orderData.terminTime || null,
                terminLead: orderData.terminLead || 15,
                terminRepeat: orderData.terminRepeat || 'none',
                terminDateTime: orderData.terminDateTime || null
            });
            console.log('✅ Porosia u ruajt:', order.id);
            return order;
        } catch (e) {
            console.error('❌ Gabim:', e);
            if (typeof showToast === 'function') {
                showToast('error', 'Gabim', 'Porosia nuk u ruajt');
            }
            return null;
        }
    }

    async function assignOrder(firestoreId, changes) {
        if (!window.TaxiOrders) return;
        try {
            await window.TaxiOrders.update(firestoreId, {
                ...changes,
                assignedAt: new Date().getTime()
            });
            console.log('✅ Porosia u caktua:', firestoreId);
        } catch (e) {
            console.error('❌ Gabim caktimi:', e);
        }
    }

    async function cancelOrderFs(firestoreId) {
        if (!window.TaxiOrders) return;
        try {
            await window.TaxiOrders.update(firestoreId, {
                status: 'cancelled',
                cancelledAt: new Date().getTime()
            });
            console.log('✅ Porosia u anulua:', firestoreId);
        } catch (e) {
            console.error('❌ Gabim anulimi:', e);
        }
    }

    return {
        init,
        createFromData,
        assignOrder,
        cancelOrderFs,
        syncFromFirestore
    };
})();

console.log('✅ orders-bridge.js ngarkuar');

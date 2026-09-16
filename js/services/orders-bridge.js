'use strict';

/**
 * orders-bridge.js — Lidh sistemin me Firestore + rrugëtim sipas statusit
 */

window.TaxiOrdersBridge = (() => {
    let isInitialized = false;

    const WAITING_STATUSES = ['waiting', 'new', 'pending'];
    const ACTIVE_STATUSES = ['assigned', 'onroute', 'arrived', 'taximeter', 'fixed', 'delay'];
    const HIDDEN_STATUSES = ['completed', 'cancelled'];

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        console.log('🔗 Duke lidhur porositë me Firestore...');

        window.TaxiEvents.on('firestore:order_added', (orders) => {
            orders.forEach(order => addToLocalState(order));
            rerender();
        });

        window.TaxiEvents.on('firestore:order_updated', (orders) => {
            orders.forEach(order => addToLocalState(order));
            rerender();
        });

        window.TaxiEvents.on('firestore:order_removed', (orders) => {
            orders.forEach(order => removeFromLocalState(order.id));
            rerender();
        });

        console.log('✅ Bridge u aktivizua');
    }

    function addToLocalState(fsOrder) {
        const order = mapToLocal(fsOrder);
        removeFromLocalState(order.firestoreId);

        if (WAITING_STATUSES.includes(order.status)) {
            window.TaxiState.get('waitingOrders').unshift(order);
        } else if (ACTIVE_STATUSES.includes(order.status)) {
            window.TaxiState.get('orders').unshift(order);
        }
    }

    function removeFromLocalState(id) {
        window.TaxiState.set('waitingOrders',
            window.TaxiState.get('waitingOrders').filter(o => o.firestoreId !== id && o.id !== id)
        );
        window.TaxiState.set('orders',
            window.TaxiState.get('orders').filter(o => o.firestoreId !== id && o.id !== id)
        );
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
            zone: fsOrder.zone || 'auto',
            tariff: fsOrder.tariff || 'standard',
            operator: fsOrder.operatorName || '',
            takenAt: fsOrder.createdTimeStr || '',
            doneAt: '',
            nearbyCars: 0,
            price: fsOrder.price || 0,
            remark: fsOrder.remark || '',
            createdAtLocal: fsOrder.createdAtLocal || Date.now(),
            waitStart: fsOrder.createdAtLocal || Date.now()
        };
    }

    function rerender() {
        if (typeof renderOrders === 'function') renderOrders();
        if (typeof renderWaitingOrders === 'function') renderWaitingOrders();
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
                status: orderData.status || 'waiting'
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
        cancelOrderFs
    };
})();

console.log('✅ orders-bridge.js ngarkuar');

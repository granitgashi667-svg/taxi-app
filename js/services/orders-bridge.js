'use strict';

/**
 * orders-bridge.js — Lidh sistemin e vjetër (script.js) me Firestore
 */

window.TaxiOrdersBridge = (() => {
    let isInitialized = false;

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        console.log('🔗 Duke lidhur porositë me Firestore...');

        // Dëgjo ndryshimet nga Firestore
        window.TaxiEvents.on('firestore:order_added', (orders) => {
            console.log('🆕 Porosi të re nga cloud:', orders.length);
            orders.forEach(order => {
                const localOrder = mapToLocal(order);
                const exists = window.TaxiState.get('orders').find(o => o.id === localOrder.id);
                if (!exists) {
                    window.TaxiState.get('orders').unshift(localOrder);
                }
            });
            renderOrdersFromState();
        });

        window.TaxiEvents.on('firestore:order_updated', (orders) => {
            console.log('✏️ Porosi u ndryshua:', orders.length);
            orders.forEach(order => {
                const localOrder = mapToLocal(order);
                const idx = window.TaxiState.get('orders').findIndex(o => o.id === localOrder.id);
                if (idx >= 0) {
                    window.TaxiState.get('orders')[idx] = localOrder;
                } else {
                    window.TaxiState.get('orders').unshift(localOrder);
                }
            });
            renderOrdersFromState();
        });

        window.TaxiEvents.on('firestore:order_removed', (orders) => {
            console.log('🗑️ Porosi u fshi:', orders.length);
            orders.forEach(order => {
                window.TaxiState.set('orders',
                    window.TaxiState.get('orders').filter(o => o.id !== order.id)
                );
            });
            renderOrdersFromState();
        });

        console.log('✅ Bridge u aktivizua');
    }

    function mapToLocal(fsOrder) {
        return {
            id: fsOrder.id,
            firestoreId: fsOrder.id,
            phone: fsOrder.phone || '',
            name: fsOrder.name || 'Klient',
            pickup: fsOrder.pickup || '',
            destination: fsOrder.destination || '',
            status: fsOrder.status || 'new',
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
            remark: fsOrder.remark || ''
        };
    }

    function renderOrdersFromState() {
        if (typeof renderOrders === 'function') renderOrders();
        if (typeof updateStats === 'function') updateStats();
    }

    // ─── KRIJO POROSI (pranon objekt direkt) ───
    async function createFromData(orderData) {
        if (!window.TaxiOrders) {
            console.error('❌ TaxiOrders nuk është gati');
            return null;
        }

        try {
            console.log('💾 Duke ruajtur në Firestore:', orderData);

            const order = await window.TaxiOrders.create({
                phone: orderData.phone,
                name: orderData.name,
                pickup: orderData.pickup,
                destination: orderData.destination,
                zone: orderData.zone,
                tariff: orderData.tariff,
                remark: orderData.remark,
                status: orderData.status
            });

            console.log('✅ Porosia u ruajt me ID:', order.id);
            return order;

        } catch (e) {
            console.error('❌ Gabim gjatë ruajtjes:', e);
            console.error('   Kodi:', e.code);
            console.error('   Mesazhi:', e.message);

            // Provo të shohësh arsyen
            if (e.code === 'permission-denied') {
                console.error('⚠️ Firestore RULES po bllokojnë! Kontrollo Rules tab.');
            }

            if (typeof showToast === 'function') {
                showToast('error', 'Gabim', 'Porosia nuk u ruajt në cloud');
            }
            return null;
        }
    }

    return {
        init,
        createFromData
    };
})();

console.log('✅ orders-bridge.js ngarkuar');

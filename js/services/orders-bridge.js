'use strict';

/**
 * orders-bridge.js — Lidh sistemin e vjetër (script.js) me Firestore
 * - Kur krijohet porosi → ruhet në Firestore
 * - Kur ndryshon në Firestore → shfaqet në tabelë
 */

window.TaxiOrdersBridge = (() => {
    let isInitialized = false;

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        console.log('🔗 Duke lidhur porositë me Firestore...');

        // ─── 1. DËGJO NDRYSHIMET NGA FIRESTORE ───
        window.TaxiEvents.on('firestore:order_added', (orders) => {
            console.log('🆕 Porosi të re nga cloud:', orders.length);
            orders.forEach(order => {
                // Konverto formatin Firestore → formatin lokal
                const localOrder = mapToLocal(order);
                // Shto në state nëse nuk ekziston
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
            renderWaitingFromState();
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

    // ─── MAPIMI: Firestore → Lokal ───
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

    // ─── RENDER nga State ───
    function renderOrdersFromState() {
        if (typeof renderOrders === 'function') renderOrders();
        if (typeof updateStats === 'function') updateStats();
    }

    function renderWaitingFromState() {
        if (typeof renderWaitingOrders === 'function') renderWaitingOrders();
    }

    // ─── KRIJO POROSI (nga forma) ───
    async function createFromForm() {
        const phone = document.getElementById('client-phone')?.value.trim();
        const name = document.getElementById('client-name')?.value.trim();
        const pickup = document.getElementById('pickup-address')?.value.trim();
        const dest = document.getElementById('destination-address')?.value.trim();
        const zone = document.getElementById('order-zone')?.value;
        const tariff = document.getElementById('order-tariff')?.value;
        const remark = document.getElementById('order-note')?.value.trim();

        if (!phone || !pickup) {
            if (typeof showToast === 'function') {
                showToast('error', 'Gabim', 'Plotëso numrin dhe adresën');
            }
            return null;
        }

        try {
            const order = await window.TaxiOrders.create({
                phone,
                name: name || 'Klient',
                pickup,
                destination: dest || 'N/A',
                zone: zone === 'auto' ? 'zona1' : zone,
                tariff: tariff || 'standard',
                remark,
                status: 'waiting'
            });

            console.log('✅ Porosia u ruajt në Firestore:', order.id);

            if (typeof showToast === 'function') {
                showToast('success', 'Porosia u ruajt', `${phone} — ${pickup}`);
            }

            // Reset formës
            document.getElementById('order-form')?.reset();
            document.getElementById('manual-vehicle-picker').style.display = 'none';

            return order;

        } catch (e) {
            console.error('❌ Gabim:', e);
            if (typeof showToast === 'function') {
                showToast('error', 'Gabim', 'Porosia nuk u ruajt');
            }
            return null;
        }
    }

    return {
        init,
        createFromForm
    };
})();

console.log('✅ orders-bridge.js ngarkuar');

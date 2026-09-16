'use strict';

/**
 * geofencing.js — 20m rreth + SMS automatik + drita pembe
 */

window.TaxiGeofencing = (() => {
    const GEOFENCE_RADIUS_M = 20;
    const CHECK_INTERVAL = 3000;
    let interval = null;
    const activeGeofences = new Map();

    function start() {
        if (interval) return;
        interval = setInterval(checkAll, CHECK_INTERVAL);
        console.log(`✅ Geofencing aktivizuar (${GEOFENCE_RADIUS_M}m rreth)`);
    }

    function stop() {
        if (interval) { clearInterval(interval); interval = null; }
        activeGeofences.clear();
    }

    // ═══ SHTO GEOFENCE PËR POROSI ═══
    function addGeofence(orderId, lat, lng) {
        activeGeofences.set(orderId, {
            lat, lng,
            triggered: false,
            addedAt: Date.now()
        });
        console.log('📍 Geofence shtuar:', orderId, `(${lat},${lng})`);
    }

    function removeGeofence(orderId) {
        activeGeofences.delete(orderId);
    }

    // ═══ KONTROLLO TË GJITHA GEOFENCET ═══
    function checkAll() {
        const orders = AppState?.orders || [];
        const drivers = AppState?.drivers || [];

        activeGeofences.forEach((geofence, orderId) => {
            if (geofence.triggered) return;

            const order = orders.find(o => o.firestoreId === orderId);
            if (!order || !order.driverId) return;

            const driver = drivers.find(d => d.id === order.driverId);
            if (!driver || !driver.lat || !driver.lng) return;

            // Llogarit distancën në metra
            const distKm = window.TaxiUtils?.distanceKm(driver.lat, driver.lng, geofence.lat, geofence.lng) || 999;
            const distM = distKm * 1000;

            if (distM <= GEOFENCE_RADIUS_M) {
                geofence.triggered = true;
                triggerGeofence(order, driver, Math.round(distM));
            }
        });
    }

    // ═══ AKTIVIZO GEOFENCE ═══
    async function triggerGeofence(order, driver, distance) {
        console.log(`🚗 Shoferi arriti! ${distance}m larg për porosinë ${order.firestoreId}`);

        // Update status në Firestore
        if (window.TaxiOrders) {
            await window.TaxiOrders.update(order.firestoreId, {
                status: 'arrived',
                arrivedAt: new Date().getTime(),
                arrivedAtStr: new Date().toLocaleTimeString('sq-AL')
            });
        }

        // Drita pembe — njofto zyrën
        if (window.TaxiEvents) {
            window.TaxiEvents.emit('order:arrived', { orderId: order.firestoreId, driver, distance });
        }

        // Luaj tingull
        if (window.TaxiSound) {
            window.TaxiSound.playNotification();
        }

        // DËRGO SMS #2
        if (window.TaxiSms && order.phone) {
            try {
                await window.TaxiSms.sendArrived(order);
                console.log('📱 SMS #2 u dërgua te:', order.phone);
            } catch (e) {
                console.warn('SMS #2 error:', e);
            }
        }

        // Toast në zyrë
        if (typeof showToast === 'function') {
            showToast('info', '📍 Shoferi arriti', `${order.phone} — vetura ${order.vehicleNum || ''} është ${distance}m larg`);
        }

        // Regjistro
        if (window.TaxiAuditLog) {
            window.TaxiAuditLog.log('order_arrived', {
                orderId: order.firestoreId,
                driverId: driver.id,
                distance
            });
        }

        // Fshi geofencen
        activeGeofences.delete(order.firestoreId);
    }

    // ═══ AUTO-SHTO GEOFENCE KUR POROSIA CAKTOHET ═══
    function autoAddForOrder(order) {
        if (!order.firestoreId) return;

        // Gjej koordinatat e marrjes
        const addr = window.TaxiData?.addresses?.find(a => a.name === order.pickup);
        if (!addr) {
            console.warn('⚠️ Nuk u gjet adresa:', order.pickup);
            return;
        }

        addGeofence(order.firestoreId, addr.lat, addr.lng);
    }

    function getActiveCount() {
        return activeGeofences.size;
    }

    function init() {
        // Nis kur porosia caktohet
        if (window.TaxiEvents) {
            window.TaxiEvents.on('order:assigned', (data) => {
                const order = AppState?.orders?.find(o => o.firestoreId === data.orderId);
                if (order) autoAddForOrder(order);
            });

            window.TaxiEvents.on('firestore:order_added', (orders) => {
                orders.forEach(o => {
                    if (o.driverId && (o.status === 'assigned' || o.status === 'onroute')) {
                        autoAddForOrder(o);
                    }
                });
            });
        }

        start();
        console.log('✅ Geofencing aktivizuar');
    }

    return {
        init, start, stop,
        addGeofence, removeGeofence,
        autoAddForOrder, getActiveCount,
        GEOFENCE_RADIUS_M
    };
})();

console.log('✅ geofencing.js ngarkuar');

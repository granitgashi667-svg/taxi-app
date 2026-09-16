'use strict';

/**
 * geofencing.js — 20m rreth + SMS automatik + drita pembe
 */

window.TaxiGeofencing = (() => {
    const GEOFENCE_RADIUS_M = 20;
    const CHECK_INTERVAL = 3000;
    let interval = null;
    const activeGeofences = new Map(); // orderId → {lat, lng, triggered}

    function start() {
        if (interval) return;
        interval = setInterval(checkAll, CHECK_INTERVAL);
        console.log('✅ Geofencing aktivizuar (20m)');
    }

    function stop() {
        if (interval) { clearInterval(interval); interval = null; }
        activeGeofences.clear();
    }

    function addGeofence(orderId, lat, lng) {
        activeGeofences.set(orderId, { lat, lng, triggered: false });
        console.log('📍 Geofence shtuar për porosinë:', orderId);
    }

    function removeGeofence(orderId) {
        activeGeofences.delete(orderId);
    }

    function checkAll() {
        const orders = AppState?.orders || [];
        const drivers = AppState?.drivers || [];

        activeGeofences.forEach((geofence, orderId) => {
            if (geofence.triggered) return;

            // Gjej porosinë
            const order = orders.find(o => o.firestoreId === orderId);
            if (!order || !order.driverId) return;

            // Gjej shoferin
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

    async function triggerGeofence(order, driver, distance) {
        console.log(`🚗 Shoferi arriti! ${distance}m larg`);

        // Update status në Firestore
        if (window.TaxiOrders) {
            await window.TaxiOrders.update(order.firestoreId, {
                status: 'arrived',
                arrivedAt: new Date().getTime(),
                arrivedAtStr: new Date().toLocaleTimeString('sq-AL')
            });
        }

        // Njofto zyrën (drita pembe)
        if (window.TaxiEvents) {
            window.TaxiEvents.emit('order:arrived', { orderId: order.firestoreId, driver, distance });
        }

        // Dërgo SMS #2
        if (window.TaxiSms && order.phone) {
            const vehicle = AppState?.vehicles?.find(v => v.id === driver.vehicleId);
            await window.TaxiSms.sendTemplate(order.phone, 'arrived', {
                vehicle: String(driver.vehicleId).padStart(2, '0'),
                plate: vehicle ? vehicle.plate : '',
                orderId: order.firestoreId
            });
        }

        // Lësho tingull
        if (window.TaxiSound) {
            window.TaxiSound.playNotification();
        }

        // Pastro geofence
        activeGeofences.delete(order.firestoreId);
    }

    return { start, stop, addGeofence, removeGeofence, GEOFENCE_RADIUS_M };
})();

console.log('✅ geofencing.js ngarkuar');

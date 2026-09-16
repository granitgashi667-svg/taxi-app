'use strict';

/**
 * dispatch.js — Caktimi i porosive (Auto / Afër / Manual)
 */

window.TaxiDispatch = (() => {

    // ─── AUTO: Shoferi i parë i lirë ───
    function findFirstFree() {
        const drivers = window.TaxiState?.get('drivers') || AppState?.drivers || [];
        return drivers.find(d => d.mode === 'free');
    }

    // ─── AFËR: Shoferi më i afërt me pickup ───
    function findClosest(pickupLat, pickupLng, maxRadiusKm = 5) {
        const drivers = window.TaxiState?.get('drivers') || AppState?.drivers || [];
        const freeDrivers = drivers.filter(d => d.mode === 'free');
        if (!freeDrivers.length) return null;

        let best = null, minDist = Infinity;
        freeDrivers.forEach(d => {
            const dist = window.TaxiUtils?.distanceKm(d.lat, d.lng, pickupLat, pickupLng) || 0;
            if (dist < minDist && dist <= maxRadiusKm) {
                minDist = dist;
                best = { driver: d, distance: dist };
            }
        });
        return best;
    }

    // ─── MANUAL: Shoferi i zgjedhur ───
    function findManual(vehicleNum) {
        const vehicles = window.TaxiState?.get('vehicles') || AppState?.vehicles || [];
        const drivers = window.TaxiState?.get('drivers') || AppState?.drivers || [];
        const v = vehicles.find(x => String(x.id).padStart(2, '0') === String(vehicleNum).padStart(2, '0'));
        if (!v) return null;
        const d = drivers.find(x => x.vehicleId === v.id);
        return d ? { driver: d, vehicle: v } : null;
    }

    // ─── CAKTO POROSINË ───
    async function assignOrder(orderId, mode = 'auto', pickupLat = null, pickupLng = null, manualVehicle = null) {
        let target = null;
        let method = mode;

        if (mode === 'auto') {
            target = { driver: findFirstFree() };
        } else if (mode === 'closest') {
            const r = findClosest(pickupLat, pickupLng);
            if (r) target = { driver: r.driver, distance: r.distance };
        } else if (mode === 'manual') {
            const r = findManual(manualVehicle);
            if (r) target = { driver: r.driver, vehicle: r.vehicle };
        }

        if (!target || !target.driver) {
            console.warn('⚠️ Nuk u gjet shofer për caktim');
            return null;
        }

        const driver = target.driver;
        const vehicles = window.TaxiState?.get('vehicles') || AppState?.vehicles || [];
        const vehicle = vehicles.find(v => v.id === driver.vehicleId);
        const num = vehicle ? String(vehicle.id).padStart(2, '0') : '??';

        // Update në Firestore
        if (window.TaxiOrdersBridge) {
            await window.TaxiOrdersBridge.assignOrder(orderId, {
                status: 'assigned',
                vehicleNum: num,
                vehicleId: vehicle ? vehicle.id : null,
                driverId: driver.id,
                driverName: driver.name,
                dispatchMode: method
            });
        }

        // Update shoferi lokal
        driver.mode = 'taximeter';
        driver.status = 'busy';

        // Update marker në map
        if (typeof updateVehicleMarker === 'function') {
            updateVehicleMarker(driver.id);
        }

        // Events
        if (window.TaxiEvents) {
            window.TaxiEvents.emit('operator:trip_done');
            window.TaxiEvents.emit('operator:revenue', 4.5);
            window.TaxiEvents.emit('order:assigned', { orderId, driverId: driver.id });
        }

        return { orderId, driver, vehicle: num, method };
    }

    // ─── STATUSI: KUR SHOFERI ARRIN ───
    async function markArrived(orderId) {
        if (window.TaxiOrdersBridge) {
            await window.TaxiOrdersBridge.assignOrder(orderId, { status: 'arrived' });
        }
        if (window.TaxiEvents) {
            window.TaxiEvents.emit('order:arrived', { orderId });
        }
    }

    // ─── STATUSI: FILLO UDHËTIM ───
    async function startTrip(orderId, mode = 'taximeter') {
        if (window.TaxiOrdersBridge) {
            await window.TaxiOrdersBridge.assignOrder(orderId, { status: mode });
        }
    }

    // ─── STATUSI: PËRFUNDO ───
    async function completeTrip(orderId, price = 0) {
        if (window.TaxiOrdersBridge) {
            await window.TaxiOrdersBridge.assignOrder(orderId, {
                status: 'completed',
                price: price,
                completedAt: new Date().getTime()
            });
        }
        if (window.TaxiEvents) {
            window.TaxiEvents.emit('operator:revenue', price);
        }
    }

    return {
        findFirstFree, findClosest, findManual,
        assignOrder, markArrived, startTrip, completeTrip
    };
})();

console.log('✅ dispatch.js ngarkuar');

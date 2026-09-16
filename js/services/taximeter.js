'use strict';

/**
 * taximeter.js — Lidhje me taksimetrin Bluetooth + çmime fikse
 */

window.TaxiTaximeter = (() => {
    let device = null;
    let server = null;
    let characteristic = null;
    let connected = false;
    let currentPrice = 0;
    let listeners = { price: [], disconnect: [] };

    // ─── BLUETOOTH ───
    async function connect() {
        if (!navigator.bluetooth) {
            console.warn('⚠️ Web Bluetooth nuk mbështetet në këtë browser');
            if (typeof showToast === 'function') {
                showToast('warning', 'Bluetooth', 'Nuk mbështetet në këtë browser');
            }
            return false;
        }

        try {
            // Kërko pajisje
            device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb'] // UUID i zakonshëm
            });

            console.log('📡 Pajisja:', device.name);

            server = await device.gatt.connect();
            device.addEventListener('gattserverdisconnected', onDisconnect);

            connected = true;
            console.log('✅ Taksimetri u lidh');
            return true;
        } catch (e) {
            console.error('❌ Bluetooth error:', e);
            return false;
        }
    }

    function onDisconnect() {
        connected = false;
        console.log('🔌 Taksimetri u shkëput');
        listeners.disconnect.forEach(fn => fn());
    }

    async function disconnect() {
        if (device && device.gatt.connected) {
            device.gatt.disconnect();
        }
        connected = false;
        device = null;
        server = null;
    }

    // ─── LEXO ÇMIMIN ───
    function onPrice(fn) { listeners.price.push(fn); }
    function onDisconnectEvent(fn) { listeners.disconnect.push(fn); }

    function emitPrice(value) {
        currentPrice = value;
        listeners.price.forEach(fn => fn(value));
    }

    // ─── ÇMIM FIKS (manual nga operatori) ───
    function setFixedPrice(orderId, price) {
        console.log('💰 Çmim fiks:', price, '€ për porosinë', orderId);
        if (window.TaxiOrders) {
            window.TaxiOrders.update(orderId, {
                price: price,
                status: 'fixed'
            });
        }
        currentPrice = price;
        return price;
    }

    // ─── ÇMIM TAKSIMETRI ───
    function setTaximeterPrice(orderId, price) {
        console.log('🔵 Çmim taksimetri:', price, '€ për porosinë', orderId);
        if (window.TaxiOrders) {
            window.TaxiOrders.update(orderId, {
                price: price,
                status: 'taximeter'
            });
        }
        currentPrice = price;
        return price;
    }

    // ─── STATUSI ───
    function isConnected() { return connected; }
    function getCurrentPrice() { return currentPrice; }

    return {
        connect, disconnect,
        onPrice, onDisconnect: onDisconnectEvent,
        setFixedPrice, setTaximeterPrice,
        isConnected, getCurrentPrice
    };
})();

console.log('✅ taximeter.js ngarkuar');

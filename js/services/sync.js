'use strict';

window.TaxiSync = (() => {
    let listeners = [];
    let lastSync = null;

    async function fullSync() {
        console.log('🔄 Full sync...');
        try {
            if (window.TaxiOrders) {
                const orders = await window.TaxiOrders.getAll();
                if (window.TaxiOrdersBridge) {
                    orders.forEach(o => {
                        // Rishpërndaj në state
                    });
                }
            }
            lastSync = new Date().getTime();
            console.log('✅ Sync komplet:', new Date().toLocaleTimeString('sq-AL'));
            listeners.forEach(fn => fn());
            return true;
        } catch (e) { console.error('❌ sync:', e); return false; }
    }

    function onSync(fn) { listeners.push(fn); }

    function getLastSync() { return lastSync; }

    function startAutoSync(interval = 5 * 60 * 1000) {
        setInterval(() => {
            if (navigator.onLine) fullSync();
        }, interval);
        console.log('✅ Auto-sync aktivizuar çdo', interval/60000, 'min');
    }

    return { fullSync, onSync, getLastSync, startAutoSync };
})();

console.log('✅ sync.js ngarkuar');

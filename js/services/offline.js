'use strict';

window.TaxiOffline = (() => {
    let online = navigator.onLine;
    const listeners = { online: [], offline: [] };

    function init() {
        window.addEventListener('online', () => {
            online = true;
            console.log('✅ Internet u kthye');
            listeners.online.forEach(fn => fn());
            if (typeof showToast === 'function') showToast('success', 'Online', 'Lidhja u kthye');
        });

        window.addEventListener('offline', () => {
            online = false;
            console.warn('⚠️ Humbi lidhja');
            listeners.offline.forEach(fn => fn());
            if (typeof showToast === 'function') showToast('warning', 'Offline', 'Nuk ka internet');
        });

        console.log('✅ Offline monitor aktivizuar');
    }

    function isOnline() { return online; }

    function on(event, fn) {
        if (listeners[event]) listeners[event].push(fn);
    }

    function check() {
        online = navigator.onLine;
        return online;
    }

    return { init, isOnline, on, check };
})();

console.log('✅ offline.js ngarkuar');

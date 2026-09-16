'use strict';

/**
 * notifications.js — Push notifications
 */

window.TaxiNotifications = (() => {
    let permission = 'default';

    async function requestPermission() {
        if (!('Notification' in window)) {
            console.warn('⚠️ Notifications nuk mbështetet');
            return false;
        }
        try {
            permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (e) { return false; }
    }

    function send(title, body, icon = '🚕') {
        if (permission !== 'granted') return;
        try {
            new Notification(title, {
                body: body,
                icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${icon}</text></svg>`,
                badge: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚕</text></svg>`
            });
        } catch (e) { console.warn('Notification error:', e); }
    }

    function orderNew(order) {
        send('🚕 Porosi e re', `${order.phone} — ${order.pickup}`, '🚕');
    }

    function orderArrived(order) {
        send('📍 Shoferi arriti', `${order.phone} — në vend`, '📍');
    }

    function messageReceived(msg) {
        send('💬 Mesazh i re', `${msg.driverName}: ${msg.text}`, '💬');
    }

    function callIncoming(call) {
        send('📞 Thirrje e re', `${call.phone}`, '📞');
    }

    return { requestPermission, send, orderNew, orderArrived, messageReceived, callIncoming };
})();

console.log('✅ notifications.js ngarkuar');

'use strict';

/**
 * js/socket-client.js — Socket.io client për real-time
 */

window.TaxiSocket = (() => {
    let socket = null;
    let isConnected = false;
    const listeners = new Map(); // event -> [callbacks]

    // ═══════════════════════════════════════════════════════
    // LIDHU
    // ═══════════════════════════════════════════════════════
    function connect() {
        const token = window.TaxiAPI?.getToken();
        if (!token) {
            console.warn('⚠️ Socket: Pa token, nuk lidhem');
            return;
        }

        if (socket && socket.connected) return;

        const url = window.TaxiAPI?.BASE_URL || 'http://localhost:3000';

        try {
            socket = io(url, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 2000,
                reconnectionAttempts: 10
            });

            // ═══ LIDHJA ═══
            socket.on('connect', () => {
                isConnected = true;
                console.log('🔌 Socket i lidhur');
                emit('socket_connected');
            });

            // ═══ SHKËPUTJA ═══
            socket.on('disconnect', (reason) => {
                isConnected = false;
                console.log('🔌 Socket i shkëputur:', reason);
                emit('socket_disconnected', { reason });
            });

            // ═══ GABIM ═══
            socket.on('connect_error', (err) => {
                console.error('❌ Socket gabim:', err.message);
                emit('socket_error', { error: err.message });
            });

            // ═══ NGJARJET KRYESORE ═══
            registerHandlers();

        } catch (e) {
            console.error('❌ Socket init:', e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // REGJISTRO HANDLERS
    // ═══════════════════════════════════════════════════════
    function registerHandlers() {
        // Porositë
        socket.on('order_created', (order) => emit('order_created', order));
        socket.on('order_updated', (order) => emit('order_updated', order));
        socket.on('order_assigned', (data) => emit('order_assigned', data));
        socket.on('order_cancelled', (order) => emit('order_cancelled', order));

        // Shoferët
        socket.on('driver_created', (driver) => emit('driver_created', driver));
        socket.on('driver_location_update', (data) => emit('driver_location', data));
        socket.on('user_online', (data) => emit('user_online', data));
        socket.on('user_offline', (data) => emit('user_offline', data));
        socket.on('user_status', (data) => emit('user_status', data));

        // Mesazhet
        socket.on('new_driver_message', (data) => emit('driver_message', data));
        socket.on('new_message_from_operator', (data) => emit('message_from_operator', data));
        socket.on('message_sent', (data) => emit('message_sent', data));
        socket.on('chat_message', (data) => emit('chat_message', data));

        // SOS
        socket.on('sos', (data) => emit('sos_alert', data));
    }

    // ═══════════════════════════════════════════════════════
    // SHKËPUT
    // ═══════════════════════════════════════════════════════
    function disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
            isConnected = false;
        }
    }

    // ═══════════════════════════════════════════════════════
    // EMIT — dërgo ngjarje në server
    // ═══════════════════════════════════════════════════════
    function send(event, data) {
        if (!socket || !socket.connected) {
            console.warn(`⚠️ Socket pa lidhje: ${event}`);
            return false;
        }
        socket.emit(event, data);
        return true;
    }

    // ═══════════════════════════════════════════════════════
    // DËRGO LOKACIONIN (shoferi)
    // ═══════════════════════════════════════════════════════
    function sendLocation(lat, lng, speed = 0) {
        return send('driver_location', { lat, lng, speed });
    }

    // ═══════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════
    function sendStatus(status, extra = {}) {
        return send('update_status', { status, ...extra });
    }

    // ═══════════════════════════════════════════════════════
    // SOS
    // ═══════════════════════════════════════════════════════
    function sendSOS(lat, lng, message) {
        return send('sos_alert', { lat, lng, message });
    }

    // ═══════════════════════════════════════════════════════
    // CHAT
    // ═══════════════════════════════════════════════════════
    function sendMessage(toUserId, text) {
        return send('chat_message', { toUserId, text });
    }

    function sendDriverMessage(driverId, text) {
        return send('driver_message', { driverId, text });
    }

    // ═══════════════════════════════════════════════════════
    // LISTENERS — regjistro callback
    // ═══════════════════════════════════════════════════════
    function on(event, callback) {
        if (!listeners.has(event)) {
            listeners.set(event, []);
        }
        listeners.get(event).push(callback);

        return () => {
            const callbacks = listeners.get(event) || [];
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        };
    }

    function off(event, callback) {
        if (!listeners.has(event)) return;
        if (!callback) {
            listeners.delete(event);
        } else {
            const callbacks = listeners.get(event) || [];
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        }
    }

    // ═══════════════════════════════════════════════════════
    // EMIT — thirr të gjithë listeners
    // ═══════════════════════════════════════════════════════
    function emit(event, data) {
        const callbacks = listeners.get(event) || [];
        callbacks.forEach(cb => {
            try { cb(data); } catch (e) { console.error(`Socket listener ${event}:`, e); }
        });
    }

    // ═══════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════
    function isSocketConnected() { return isConnected; }

    return {
        connect,
        disconnect,
        send,
        sendLocation,
        sendStatus,
        sendSOS,
        sendMessage,
        sendDriverMessage,
        on,
        off,
        get socket() { return socket; },
        get connected() { return isConnected; }
    };
})();

console.log('✅ js/socket-client.js ngarkuar');

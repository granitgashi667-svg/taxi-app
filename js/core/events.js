'use strict';

/**
 * events.js — Event Bus (Pub/Sub)
 * Lejon modulet të komunikojnë pa varësi direkte.
 */

window.TaxiEvents = (() => {
    const listeners = new Map();

    return {
        on(event, handler) {
            if (!listeners.has(event)) listeners.set(event, []);
            listeners.get(event).push(handler);
            return () => this.off(event, handler);
        },

        off(event, handler) {
            const arr = listeners.get(event);
            if (!arr) return;
            const i = arr.indexOf(handler);
            if (i >= 0) arr.splice(i, 1);
        },

        emit(event, payload) {
            const arr = listeners.get(event);
            if (window.TaxiConfig?.DEBUG.enableLogs) {
                console.log(`${window.TaxiConfig.DEBUG.logPrefix} [event] ${event}`, payload || '');
            }
            if (!arr) return;
            arr.forEach(h => {
                try { h(payload); }
                catch (err) { console.error(`[event:${event}]`, err); }
            });
        },

        once(event, handler) {
            const wrapper = (p) => { handler(p); this.off(event, wrapper); };
            this.on(event, wrapper);
        },

        clear(event) {
            if (event) listeners.delete(event);
            else listeners.clear();
        }
    };
})();

// Lista e ngjarjeve standarde (për referencë)
window.TaxiEvents.EVENTS = {
    ORDER_CREATED:    'order:created',
    ORDER_ASSIGNED:   'order:assigned',
    ORDER_CANCELLED:  'order:cancelled',
    ORDER_COMPLETED:  'order:completed',
    ORDER_UPDATED:    'order:updated',

    WAITING_ADDED:    'waiting:added',
    WAITING_REMOVED:  'waiting:removed',
    WAITING_UPDATED:  'waiting:updated',

    PREORDER_ADDED:   'preorder:added',
    PREORDER_ACTIVATED:'preorder:activated',
    PREORDER_CANCELLED:'preorder:cancelled',

    CALL_INCOMING:    'call:incoming',
    CALL_ACCEPTED:    'call:accepted',
    CALL_REJECTED:    'call:rejected',

    MESSAGE_RECEIVED: 'message:received',
    MESSAGE_SENT:     'message:sent',

    DRIVER_UPDATED:   'driver:updated',
    VEHICLE_MOVED:    'vehicle:moved',

    OPERATOR_LOGIN:   'operator:login',
    OPERATOR_LOGOUT:  'operator:logout',

    MAP_READY:        'map:ready',
    UI_READY:         'ui:ready',
    STATE_CHANGED:    'state:changed',

    TOAST_SHOW:       'toast:show',
    SOUND_TOGGLE:     'sound:toggle'
};

console.log('✅ events.js ngarkuar');
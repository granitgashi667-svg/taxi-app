'use strict';

/**
 * state.js — Gjendja qendrore + menaxher i saj.
 * Çdo ndryshim emit event STATE_CHANGED.
 */

window.TaxiState = (() => {
    const initialState = {
        // Koleksionet
        orders:        [],
        waitingOrders: [],
        preOrders:     [],
        incomingCalls: [],
        messages:      [],
        history:       [],

        // Referencat statike
        drivers:  [],
        vehicles: [],
        zones:    [],
        addresses:[],
        clients:  [],
        operators:[],

        // Konfigurimi
        config: {},

        // Harta
        map: null,
        vehicleMarkers: new Map(),

        // UI state
        currentDispatchMode: 'auto',
        currentPanel: 'dispatch',
        soundEnabled: true,
        filters: { orders: '' },

        // Operatori aktual
        currentOperator: {
            id: null,
            name: 'Operator',
            initials: 'OP',
            role: 'dispatcher',
            loggedIn: false,
            loginTime: null,
            stats: {
                callsTaken: 0,
                callsWaiting: 0,
                callsOpened: 0,
                revenue: 0,
                trips: 0,
                cancelled: 0
            }
        },

        // Të tjera
        manualAssignOrderId: null,
        audioContext: null,
        _meta: {
            loadedAt: null,
            version: window.TaxiConfig?.APP.version || '0.0.0'
        }
    };

    const state = JSON.parse(JSON.stringify(initialState, (k, v) =>
        v instanceof Map ? null : v
    ));
    state.vehicleMarkers = new Map();

    return {
        get raw() { return state; },

        // ─── Getters ───
        get(key) { return state[key]; },

        set(key, value) {
            state[key] = value;
            window.TaxiEvents?.emit(window.TaxiEvents.EVENTS.STATE_CHANGED, { key, value });
        },

        update(partial) {
            Object.assign(state, partial);
            window.TaxiEvents?.emit(window.TaxiEvents.EVENTS.STATE_CHANGED, { keys: Object.keys(partial) });
        },

        // ─── Koleksione ───
        addOrder(order) {
            state.orders.unshift(order);
            window.TaxiEvents?.emit(window.TaxiEvents.EVENTS.ORDER_CREATED, order);
        },

        removeOrder(id) {
            state.orders = state.orders.filter(o => o.id !== id);
            window.TaxiEvents?.emit(window.TaxiEvents.EVENTS.ORDER_UPDATED, { id, removed: true });
        },

        findOrder(id) {
            return state.orders.find(o => o.id === id);
        },

        // ─── Reset ───
        reset() {
            const fresh = JSON.parse(JSON.stringify(initialState, (k, v) =>
                v instanceof Map ? null : v
            ));
            Object.keys(state).forEach(k => delete state[k]);
            Object.assign(state, fresh);
            state.vehicleMarkers = new Map();
        }
    };
})();

console.log('✅ state.js ngarkuar');

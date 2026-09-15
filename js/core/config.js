'use strict';

/**
 * config.js — Konfigurimi global i aplikacionit
 * Qendra e të gjitha konstantave. Asnjë varësi.
 */

window.TaxiConfig = {
    APP: {
        name: 'TaxiDispatch',
        version: '2.0.0',
        edition: 'PRO',
        currency: '€',
        locale: 'sq-AL',
        timezone: 'Europe/Belgrade'
    },

    PATHS: {
        pages: {
            dispatch: 'index.html',
            login:    'login.html',
            admin:    'admin.html',
            driver:   'driver.html'
        }
    },

    STORAGE_KEYS: {
        operator:       'taxi.operator',
        session:        'taxi.session',
        orders:         'taxi.orders',
        waitingOrders:  'taxi.waiting',
        preOrders:      'taxi.preorders',
        drivers:        'taxi.drivers',
        vehicles:       'taxi.vehicles',
        clients:        'taxi.clients',
        messages:       'taxi.messages',
        calls:          'taxi.calls',
        history:        'taxi.history',
        settings:       'taxi.settings',
        version:        'taxi.version'
    },

    LIMITS: {
        maxWaitingOrders:  20,
        maxPreOrders:      50,
        maxMessagesShown:  100,
        maxIncomingCalls:  5,
        maxHistoryItems:   500,
        minSearchChars:    2,
        maxSearchResults:  8
    },

    TIMING: {
        clockTick:         1000,
        callRingInterval:  2000,
        callSimInterval:   30000,
        messageSimInterval:45000,
        vehicleSimInterval:4000,
        waitingRefresh:    10000,
        toastDuration:     3500,
        loadingMinTime:    600,
        preorderActivateLead: 15
    },

    DISPATCH: {
        modes: ['auto', 'closest', 'manual'],
        defaultMode: 'auto',
        closestMaxRadiusKm: 5
    },

    TARIFFS: {
        standard:  { label: 'Standard', base: 2.00, perKm: 0.80, min: 3.00 },
        vip:       { label: 'VIP',      base: 5.00, perKm: 1.50, min: 8.00 },
        airport:   { label: 'Aeroport', base: 10.00, perKm: 0.60, min: 15.00 },
        night:     { label: 'Natë',     base: 3.00, perKm: 1.00, min: 4.50 },
        van:       { label: 'Van',      base: 4.00, perKm: 1.20, min: 6.00 }
    },

    DRIVER_MODES: {
        free:      { label: 'Lirë',        color: '#22c55e' },
        taximeter: { label: 'Taksimetër',  color: '#3b82f6' },
        fixed:     { label: 'Fiks',        color: '#ef4444' },
        pause:     { label: 'Pushim',      color: '#facc15' },
        inactive:  { label: 'Joaktiv',     color: '#6b7280' }
    },

    ORDER_STATUS: {
        new:       { label: 'E Re',        color: '#a855f7' },
        pending:   { label: 'Pritje',      color: '#f59e0b' },
        assigned:  { label: 'Caktuar',     color: '#8b5cf6' },
        onroute:   { label: 'Në rrugë',    color: '#60a5fa' },
        delay:     { label: 'Vonesë',      color: '#f43f5e' },
        completed: { label: 'Kryer',       color: '#22c55e' },
        cancelled: { label: 'Anuluar',     color: '#f43f5e' }
    },

    OPERATOR_ROLES: {
        dispatcher: { label: 'Dispeçer',    level: 1 },
        supervisor: { label: 'Supervizor',  level: 2 },
        admin:      { label: 'Admin',       level: 3 }
    },

    DEBUG: {
        enableLogs: true,
        logPrefix: '🚖'
    }
};

console.log('✅ config.js ngarkuar');
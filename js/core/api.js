'use strict';

/**
 * js/api.js — Wrapper i hollë mbi TaxiDB.
 * (Përputhshmëri me kodin që pret window.TaxiApi)
 */

window.TaxiApi = {
    get:  (col, q) => window.TaxiDB[col].list(q),
    getOne: (col, id) => window.TaxiDB[col].get(id),
    create: (col, data) => window.TaxiDB[col].create(data),
    update: (col, id, data) => window.TaxiDB[col].update(id, data),
    remove: (col, id) => window.TaxiDB[col].remove(id),

    // Shortcuts
    orders: {
        list:    (q) => window.TaxiDB.orders.list(q),
        create:  (d) => window.TaxiDB.orders.create(d),
        update:  (id, d) => window.TaxiDB.orders.update(id, d),
        remove:  (id) => window.TaxiDB.orders.remove(id),
        get:     (id) => window.TaxiDB.orders.get(id)
    },
    drivers: {
        list:   (q) => window.TaxiDB.drivers.list(q),
        update: (id, d) => window.TaxiDB.drivers.update(id, d),
        create: (d) => window.TaxiDB.drivers.create(d)
    },
    vehicles: {
        list:   (q) => window.TaxiDB.vehicles.list(q),
        update: (id, d) => window.TaxiDB.vehicles.update(id, d)
    },
    clients: {
        byPhone: (p) => window.TaxiDB.clientByPhone(p),
        list:    (q) => window.TaxiDB.clients.list(q)
    }
};

console.log('✅ TaxiApi gati');

'use strict';

/**
 * js/core/db.js — TaxiApp.DB client
 * Zëvendëson plotësisht firebase.js. Të njëjtat funksione, burim lokal.
 */

const API_BASE = (location.protocol === 'file:') ? 'http://localhost:3000' : '';

async function apiFetch(path, options = {}) {
    const url = API_BASE + path;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'API error');
    }
    return res.json();
}

// ═══ KOLEKSIONE ═══
function collection(name) {
    return {
        list: (q = {}) => {
            const qs = new URLSearchParams(q).toString();
            return apiFetch(`/api/${name}${qs ? '?' + qs : ''}`);
        },
        get: (id) => apiFetch(`/api/${name}/${id}`),
        create: (data) => apiFetch(`/api/${name}`, { method: 'POST', body: data }),
        update: (id, data) => apiFetch(`/api/${name}/${id}`, { method: 'PUT', body: data }),
        remove: (id) => apiFetch(`/api/${name}/${id}`, { method: 'DELETE' })
    };
}

// ═══ OBJEKTI GLOBAL ═══
window.TaxiDB = {
    // Koleksionet
    orders:    collection('orders'),
    drivers:   collection('drivers'),
    vehicles:  collection('vehicles'),
    zones:     collection('zones'),
    addresses: collection('addresses'),
    operators: collection('operators'),
    calls:     collection('calls'),
    blacklist: collection('blacklist'),
    auditLog:  collection('audit_log'),
    messages:  collection('messages'),
    clients:   collection('clients'),

    // Speciale
    health:      () => apiFetch('/api/health'),
    login:       (email, password, role) => apiFetch('/api/auth/login', { method: 'POST', body: { email, password, role } }),
    logout:      (id) => apiFetch(`/api/auth/logout/${id}`, { method: 'POST' }),
    clientByPhone: (phone) => apiFetch(`/api/clients/by-phone/${encodeURIComponent(phone)}`),
    getSetting:  (k) => apiFetch(`/api/settings/${k}`),
    setSetting:  (k, v) => apiFetch(`/api/settings/${k}`, { method: 'PUT', body: { value: v } }),
    backupUrl:   () => API_BASE + '/api/backup/download',

    // Wrapper generik
    fetch: apiFetch
};

// ═══ STUB për pajtueshmëri me kodin e vjetër (firebase.js API) ═══
// Nëse ndonjë file bën `firebase.firestore()` etj, kjo i mbulon.
window.firebase = {
    apps: [],
    initializeApp: () => ({}),
    firestore: () => ({
        collection: (name) => ({
            doc: (id) => ({
                get: () => window.TaxiDB[name]?.get(id),
                set: (d) => window.TaxiDB[name]?.update(id, d),
                update: (d) => window.TaxiDB[name]?.update(id, d),
                delete: () => window.TaxiDB[name]?.remove(id)
            }),
            add: (d) => window.TaxiDB[name]?.create(d),
            where: () => ({ get: () => window.TaxiDB[name]?.list() }),
            orderBy: () => ({ get: () => window.TaxiDB[name]?.list() }),
            limit: () => ({ get: () => window.TaxiDB[name]?.list() }),
            get: () => window.TaxiDB[name]?.list()
        })
    }),
    auth: () => ({
        currentUser: null,
        onAuthStateChanged: (cb) => cb(null),
        signInWithEmailAndPassword: (email, password) => window.TaxiDB.login(email, password),
        signOut: () => Promise.resolve()
    })
};

console.log('✅ TaxiDB (SQLite client) gati — API:', API_BASE || 'same-origin');

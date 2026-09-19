'use strict';

/**
 * js/firebase-shim.js
 * Zëvendëson Firebase me API lokale (Node.js + SQLite)
 * NUK ndryshon asgjë në kodin ekzistues — thjesht ridrejton kërkesat
 */

(function() {
    const API_URL = (window.TAXI_CONFIG?.API_URL) || 'http://localhost:3000';
    let authToken = localStorage.getItem('taxi_token') || null;
    let currentUser = null;
    const authListeners = [];

    // ═══════════════════════════════════════════════════════
    // HELPER: FETCH API
    // ═══════════════════════════════════════════════════════
    async function apiCall(path, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (authToken) options.headers['Authorization'] = `Bearer ${authToken}`;
        if (body) options.body = JSON.stringify(body);

        try {
            const res = await fetch(`${API_URL}/api${path}`, options);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const err = new Error(data.error || `HTTP ${res.status}`);
                err.status = res.status;
                err.code = data.error || 'api-error';
                throw err;
            }
            return data;
        } catch (e) {
            if (e.message && (e.message.includes('fetch') || e.message.includes('Failed'))) {
                console.warn('⚠️ Serveri nuk përgjigjet:', path);
                return {};
            }
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════
    // MAP: Collection name → API route
    // ═══════════════════════════════════════════════════════
    function routeFor(collection) {
        const map = {
            'orders': 'orders',
            'drivers': 'drivers',
            'vehicles': 'vehicles',
            'clients': 'clients',
            'zones': 'zones',
            'stands': 'stands',
            'custom_locations': 'locations',
            'locations': 'locations',
            'tariffs': 'tariffs',
            'workers': 'workers',
            'users': 'workers',
            'operators': 'workers',
            'messages': 'messages',
            'driver_messages': 'messages/threads',
            'predefined_messages': 'messages/predefined',
            'remarks': 'messages/remarks',
            'tenants': 'tenants',
            'settings': 'workers'
        };
        return map[collection] || collection;
    }

    // ═══════════════════════════════════════════════════════
    // EXTRACT: Nxjerr array/item nga response
    // ═══════════════════════════════════════════════════════
    function extractArray(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        const keys = ['orders', 'drivers', 'vehicles', 'clients', 'zones',
                      'stands', 'locations', 'tariffs', 'workers', 'users',
                      'messages', 'threads', 'remarks', 'tenants', 'data'];
        for (const k of keys) {
            if (Array.isArray(data[k])) return data[k];
        }
        return [];
    }

    function extractItem(data) {
        if (!data) return null;
        if (data.id) return data;
        const keys = ['order', 'driver', 'vehicle', 'client', 'zone',
                      'stand', 'location', 'tariff', 'worker', 'user',
                      'message', 'thread', 'tenant', 'data'];
        for (const k of keys) {
            if (data[k] && typeof data[k] === 'object') return data[k];
        }
        return data;
    }

    // ═══════════════════════════════════════════════════════
    // CLEAN: Heq FieldValue objects para dërgimit në server
    // ═══════════════════════════════════════════════════════
    function cleanForAPI(data) {
        if (!data || typeof data !== 'object') return data;
        if (Array.isArray(data)) return data.map(cleanForAPI);

        const out = {};
        Object.keys(data).forEach(k => {
            const v = data[k];
            if (v && typeof v === 'object') {
                if (v.__isFieldValue === 'serverTimestamp') {
                    out[k] = new Date().toISOString();
                } else if (v.__isFieldValue === 'increment') {
                    out[k] = v.value;
                } else if (v.__isFieldValue === 'arrayUnion') {
                    out[k] = v.value;
                } else if (v.__isFieldValue === 'arrayRemove') {
                    out[k] = v.value;
                } else if (v.__isFieldValue === 'delete') {
                    out[k] = null;
                } else if (v instanceof Date) {
                    out[k] = v.toISOString();
                } else {
                    out[k] = cleanForAPI(v);
                }
            } else {
                out[k] = v;
            }
        });
        return out;
    }

    // ═══════════════════════════════════════════════════════
    // TIMESTAMP (Firestore.Timestamp kompatibilitet)
    // ═══════════════════════════════════════════════════════
    function makeTimestamp(date) {
        const d = date instanceof Date ? date : new Date(date);
        return {
            seconds: Math.floor(d.getTime() / 1000),
            nanoseconds: 0,
            toDate: () => d,
            toMillis: () => d.getTime(),
            isEqual: (o) => o?.seconds === Math.floor(d.getTime() / 1000)
        };
    }

    // ═══════════════════════════════════════════════════════
    // AUTH SHIM
    // ═══════════════════════════════════════════════════════
    const auth = {
        get currentUser() {
            return currentUser;
        },

        // Login me email (pranon edhe username direkt)
        async signInWithEmailAndPassword(email, password) {
            const username = String(email).includes('@taxiapp.local')
                ? String(email).replace('@taxiapp.local', '')
                : String(email).split('@')[0];

            const data = await apiCall('/auth/login', 'POST', { username, password });

            if (data.error) {
                const e = new Error(data.error);
                e.code = 'auth/wrong-password';
                throw e;
            }

            authToken = data.token;
            currentUser = {
                uid: data.user.id,
                email: `${data.user.username}@taxiapp.local`,
                displayName: data.user.name,
                emailVerified: true,
                ...data.user
            };

            localStorage.setItem('taxi_token', authToken);
            localStorage.setItem('taxi_user', JSON.stringify(currentUser));

            authListeners.forEach(cb => {
                try { cb(currentUser); } catch (e) {}
            });

            return { user: currentUser };
        },

        // Register user të re
        async createUserWithEmailAndPassword(email, password) {
            const username = String(email).includes('@taxiapp.local')
                ? String(email).replace('@taxiapp.local', '')
                : String(email).split('@')[0];

            const data = await apiCall('/workers', 'POST', {
                username,
                password,
                name: username,
                role: 'operator'
            });

            if (data.error) {
                const e = new Error(data.error);
                e.code = 'auth/email-already-in-use';
                throw e;
            }

            return {
                user: {
                    uid: data.userId,
                    email,
                    displayName: username
                }
            };
        },

        // Logout
        async signOut() {
            try {
                await apiCall('/auth/logout', 'POST');
            } catch (e) {}

            authToken = null;
            currentUser = null;
            localStorage.removeItem('taxi_token');
            localStorage.removeItem('taxi_user');

            authListeners.forEach(cb => {
                try { cb(null); } catch (e) {}
            });
        },

        // Listener
        onAuthStateChanged(cb) {
            authListeners.push(cb);

            if (authToken) {
                const cachedUser = localStorage.getItem('taxi_user');
                if (cachedUser) {
                    try {
                        currentUser = JSON.parse(cachedUser);
                        setTimeout(() => cb(currentUser), 10);
                    } catch (e) {}
                }

                apiCall('/auth/me').then(data => {
                    const user = extractItem(data);
                    if (user && user.id) {
                        currentUser = {
                            uid: user.id,
                            email: `${user.username}@taxiapp.local`,
                            displayName: user.name,
                            ...user
                        };
                        localStorage.setItem('taxi_user', JSON.stringify(currentUser));
                        cb(currentUser);
                    }
                }).catch(() => {});
            } else {
                setTimeout(() => cb(null), 10);
            }

            return () => {
                const i = authListeners.indexOf(cb);
                if (i >= 0) authListeners.splice(i, 1);
            };
        },

        async getIdToken() {
            return authToken;
        },

        async getIdTokenResult() {
            return {
                token: authToken,
                claims: currentUser || {}
            };
        }
    };

    // ═══════════════════════════════════════════════════════
    // FIRESTORE SHIM — Document Reference
    // ═══════════════════════════════════════════════════════
    function createDocRef(collectionName, docId) {
        return {
            id: docId,
            path: `${collectionName}/${docId}`,

            async get() {
                if (!docId) return { exists: false, id: null, data: () => ({}) };

                try {
                    const data = await apiCall(`/${routeFor(collectionName)}/${docId}`);
                    const item = extractItem(data);
                    return {
                        exists: !!item && !!item.id,
                        id: docId,
                        data: () => item || {},
                        get: (field) => item ? item[field] : undefined
                    };
                } catch (e) {
                    return { exists: false, id: docId, data: () => ({}) };
                }
            },

            async set(newData, options = {}) {
                const cleanData = cleanForAPI(newData);
                return apiCall(`/${routeFor(collectionName)}/${docId}`, 'PUT', cleanData);
            },

            async update(newData) {
                const cleanData = cleanForAPI(newData);
                return apiCall(`/${routeFor(collectionName)}/${docId}`, 'PUT', cleanData);
            },

            async delete() {
                return apiCall(`/${routeFor(collectionName)}/${docId}`, 'DELETE');
            },

            onSnapshot(cb) {
                this.get().then(snap => {
                    cb({
                        ...snap,
                        docChanges: () => [{ type: 'added', doc: snap }]
                    });
                }).catch(() => {});
                return () => {};
            }
        };
    }

    // ═══════════════════════════════════════════════════════
    // FIRESTORE SHIM — Query
    // ═══════════════════════════════════════════════════════
    function createQuery(collectionName) {
        const state = {
            filters: [],
            orderByField: null,
            orderByDir: 'asc',
            limitNum: null
        };

        const query = {
            where(field, op, value) {
                state.filters.push({ field, op, value });
                return this;
            },

            orderBy(field, dir = 'asc') {
                state.orderByField = field;
                state.orderByDir = dir;
                return this;
            },

            limit(n) {
                state.limitNum = n;
                return this;
            },

            doc(id) {
                return createDocRef(collectionName, id);
            },

            async get() {
                try {
                    // Dërgo filtra == në query string
                    const params = new URLSearchParams();
                    state.filters.forEach(f => {
                        if (f.op === '==' && f.value !== undefined && f.value !== null) {
                            params.append(f.field, String(f.value));
                        }
                    });
                    if (state.limitNum) params.append('limit', state.limitNum);

                    const qs = params.toString();
                    const data = await apiCall(`/${routeFor(collectionName)}${qs ? '?' + qs : ''}`);
                    let items = extractArray(data);

                    // Filtro lokalisht për operatorë tjerë
                    state.filters.forEach(f => {
                        if (f.op === '!=') items = items.filter(i => i[f.field] !== f.value);
                        else if (f.op === '>') items = items.filter(i => i[f.field] > f.value);
                        else if (f.op === '<') items = items.filter(i => i[f.field] < f.value);
                        else if (f.op === '>=') items = items.filter(i => i[f.field] >= f.value);
                        else if (f.op === '<=') items = items.filter(i => i[f.field] <= f.value);
                        else if (f.op === 'array-contains') items = items.filter(i => Array.isArray(i[f.field]) && i[f.field].includes(f.value));
                        else if (f.op === 'in') items = items.filter(i => Array.isArray(f.value) && f.value.includes(i[f.field]));
                        else if (f.op === 'not-in') items = items.filter(i => !Array.isArray(f.value) || !f.value.includes(i[f.field]));
                        else if (f.op === 'array-contains-any') items = items.filter(i => Array.isArray(i[f.field]) && Array.isArray(f.value) && i[f.field].some(x => f.value.includes(x)));
                    });

                    if (state.orderByField) {
                        const f = state.orderByField;
                        const dir = state.orderByDir === 'desc' ? -1 : 1;
                        items.sort((a, b) => {
                            if (a[f] < b[f]) return -1 * dir;
                            if (a[f] > b[f]) return 1 * dir;
                            return 0;
                        });
                    }

                    const docs = items.map(item => ({
                        id: item.id,
                        exists: true,
                        ref: createDocRef(collectionName, item.id),
                        data: () => item,
                        get: (field) => item[field]
                    }));

                    return {
                        docs,
                        size: docs.length,
                        empty: docs.length === 0,
                        forEach(cb) { docs.forEach(cb); }
                    };
                } catch (e) {
                    console.warn(`⚠️ Query ${collectionName}:`, e.message);
                    return { docs: [], size: 0, empty: true, forEach: () => {} };
                }
            },

            async add(newData) {
                const cleanData = cleanForAPI(newData);
                const res = await apiCall(`/${routeFor(collectionName)}`, 'POST', cleanData);
                return { id: res.id || res.orderId || res._id || 'new' };
            },

            onSnapshot(cb) {
                this.get().then(snap => {
                    cb({
                        ...snap,
                        docChanges: () => snap.docs.map(d => ({ type: 'added', doc: d }))
                    });
                }).catch(() => {});
                return () => {};
            },

            // Për të vazhduar chain
            startAt() { return this; },
            endAt() { return this; },
            startAfter() { return this; },
            endBefore() { return this; }
        };

        return query;
    }

    const firestore = {
        collection(name) {
            return createQuery(name);
        },

        // FieldValue
        FieldValue: {
            serverTimestamp() {
                return { __isFieldValue: 'serverTimestamp' };
            },
            increment(n) {
                return { __isFieldValue: 'increment', value: n };
            },
            arrayUnion(...items) {
                return { __isFieldValue: 'arrayUnion', value: items };
            },
            arrayRemove(...items) {
                return { __isFieldValue: 'arrayRemove', value: items };
            },
            delete() {
                return { __isFieldValue: 'delete' };
            }
        },

        // Timestamp
        Timestamp: {
            now: () => makeTimestamp(new Date()),
            fromDate: (d) => makeTimestamp(d),
            fromMillis: (ms) => makeTimestamp(new Date(ms))
        },

        // Batch
        batch() {
            const ops = [];
            return {
                set(ref, data, opts) { ops.push({ type: 'set', ref, data, opts }); return this; },
                update(ref, data) { ops.push({ type: 'update', ref, data }); return this; },
                delete(ref) { ops.push({ type: 'delete', ref }); return this; },
                async commit() {
                    for (const op of ops) {
                        try {
                            if (op.type === 'set') await op.ref.set(op.data, op.opts);
                            else if (op.type === 'update') await op.ref.update(op.data);
                            else if (op.type === 'delete') await op.ref.delete();
                        } catch (e) { console.warn('Batch:', e); }
                    }
                }
            };
        },

        // Transaction
        runTransaction(fn) {
            return fn({
                get: (ref) => ref.get(),
                set: (ref, data) => ref.set(data),
                update: (ref, data) => ref.update(data),
                delete: (ref) => ref.delete()
            });
        },

        // Bulk writer (opsionale)
        settings() {},
        enablePersistence() { return Promise.resolve(); }
    };

    // ═══════════════════════════════════════════════════════
    // FUNCTIONS SHIM
    // ═══════════════════════════════════════════════════════
    const functions = {
        httpsCallable(name) {
            return async (data) => {
                try {
                    const res = await apiCall(`/functions/${name}`, 'POST', data);
                    return { data: res };
                } catch (e) {
                    throw new Error(e.message);
                }
            };
        },
        useEmulator() {}
    };

    // ═══════════════════════════════════════════════════════
    // STORAGE SHIM
    // ═══════════════════════════════════════════════════════
    const storage = {
        ref(path) {
            return {
                async put(file) {
                    return { ref: { getDownloadURL: async () => '' } };
                },
                async getDownloadURL() { return ''; },
                async delete() {}
            };
        }
    };

    // ═══════════════════════════════════════════════════════
    // MESSAGING SHIM
    // ═══════════════════════════════════════════════════════
    const messaging = {
        async getToken() { return ''; },
        onMessage() {},
        onBackgroundMessage() {},
        async requestPermission() { return 'granted'; },
        useServiceWorker() {}
    };

    // ═══════════════════════════════════════════════════════
    // REPLACE GLOBAL FIREBASE
    // ═══════════════════════════════════════════════════════
    window.firebase = {
        apps: [],

        initializeApp(config, name) {
            console.log('🔥 Firebase SHIM aktivizuar (lokale)');
            return { name: name || '[DEFAULT]' };
        },

        app(name) { return { name: name || '[DEFAULT]' }; },
        apps: [],

        auth() { return auth; },
        firestore() { return firestore; },
        functions() { return functions; },
        storage() { return storage; },
        messaging() { return messaging; },

        analytics() {
            return { logEvent: () => {} };
        },

        // Version info
        SDK_VERSION: 'shim-1.0.0'
    };

    // Ruaj në window për debug
    window.__taxiFirebaseShim = true;

    console.log('✅ Firebase SHIM i ngarkuar — të dhënat shkojnë në server lokal:', API_URL);
})();

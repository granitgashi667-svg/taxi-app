'use strict';

/**
 * firebase-shim.js — Imiton Firebase API mbi serverin SQLite
 * Të gjithë file-t ekzistues vazhdojnë të punojnë pa ndryshim.
 */

(function () {
    const BASE_URL = window.TAXI_CONFIG?.API_URL || 'http://localhost:3000';

    // ═══════════════════════════════════════════════════════
    // TOKEN
    // ═══════════════════════════════════════════════════════
    function getToken() {
        return localStorage.getItem('taxi_token') || null;
    }

    // ═══════════════════════════════════════════════════════
    // HTTP REQUEST (nuk varet nga TaxiAPI)
    // ═══════════════════════════════════════════════════════
    async function http(method, path, body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { method, headers };
        if (body !== null) config.body = JSON.stringify(body);

        const res = await fetch(`${BASE_URL}${path}`, config);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Gabim ${res.status}`);
        return data;
    }

    // ═══════════════════════════════════════════════════════
    // FieldValue (serverTimestamp, increment, ...)
    // ═══════════════════════════════════════════════════════
    const FieldValue = {
        serverTimestamp: () => ({ _type: 'serverTimestamp' }),
        increment: (n) => ({ _type: 'increment', value: n }),
        arrayUnion: (...values) => ({ _type: 'arrayUnion', values }),
        arrayRemove: (...values) => ({ _type: 'arrayRemove', values }),
        delete: () => ({ _type: 'delete' })
    };

    // ═══════════════════════════════════════════════════════
    // TIMESTAMP (imiton firebase.firestore.Timestamp)
    // ═══════════════════════════════════════════════════════
    class Timestamp {
        constructor(seconds, nanoseconds = 0) {
            this.seconds = seconds;
            this.nanoseconds = nanoseconds;
        }
        toDate() { return new Date(this.seconds * 1000); }
        toMillis() { return this.seconds * 1000; }
        static fromDate(d) { return new Timestamp(Math.floor(d.getTime() / 1000)); }
        static now() { return Timestamp.fromDate(new Date()); }
    }

    // ═══════════════════════════════════════════════════════
    // DOC SNAPSHOT
    // ═══════════════════════════════════════════════════════
    class DocSnapshot {
        constructor(id, data) {
            this.id = id;
            this._data = data || null;
            this.exists = !!data;
        }
        data() { return this._data; }
        get(field) { return this._data ? this._data[field] : undefined; }
    }

    // ═══════════════════════════════════════════════════════
    // QUERY SNAPSHOT
    // ═══════════════════════════════════════════════════════
    class QuerySnapshot {
        constructor(rows, prevMap = null) {
            this.docs = rows.map(r => new DocSnapshot(r.id || r._id, r));
            this.size = this.docs.length;
            this.empty = this.size === 0;
            this._prevMap = prevMap;
        }
        forEach(cb) { this.docs.forEach(cb); }
        docChanges() {
            return this.docs.map(d => ({ type: 'added', doc: d }));
        }
    }

    // ═══════════════════════════════════════════════════════
    // DOC REF
    // ═══════════════════════════════════════════════════════
    class DocRef {
        constructor(collection, id) {
            this.collection = collection;
            this.id = id;
            this.path = `${collection}/${id}`;
        }
        async get() {
            try {
                const r = await http('GET', `/api/data/${this.collection}/${this.id}`);
                return new DocSnapshot(this.id, r.data);
            } catch (e) {
                return new DocSnapshot(this.id, null);
            }
        }
        async set(data, opts = {}) {
            const cleanData = cleanForSend(data);
            try {
                await http('PUT', `/api/data/${this.collection}/${this.id}`, cleanData);
            } catch (e) {
                // Nëse nuk ekziston, provo POST
                await http('POST', `/api/data/${this.collection}/${this.id}`, cleanData);
            }
            return this;
        }
        async update(data) {
            const cleanData = cleanForSend(data);
            await http('PUT', `/api/data/${this.collection}/${this.id}`, cleanData);
            return this;
        }
        async delete() {
            await http('DELETE', `/api/data/${this.collection}/${this.id}`);
            return this;
        }
        async onSnapshot(cb, errCb) {
            const fetch = async () => {
                try {
                    const snap = await this.get();
                    cb(snap);
                } catch (e) { if (errCb) errCb(e); }
            };
            fetch();
            const interval = setInterval(fetch, 3000);
            return () => clearInterval(interval);
        }
    }

    // ═══════════════════════════════════════════════════════
    // CLEAN HELPER (përgatit të dhënat për server)
    // ═══════════════════════════════════════════════════════
    function cleanForSend(data) {
        if (!data || typeof data !== 'object') return data;
        const out = {};
        Object.entries(data).forEach(([k, v]) => {
            if (v === undefined) return;
            if (v && typeof v === 'object' && v._type) {
                out[k] = v; // lëre markerin
            } else if (v instanceof Date) {
                out[k] = { _type: 'date', value: v.toISOString() };
            } else if (v && typeof v === 'object' && !Array.isArray(v)) {
                out[k] = cleanForSend(v);
            } else {
                out[k] = v;
            }
        });
        return out;
    }

    // ═══════════════════════════════════════════════════════
    // COLLECTION REF
    // ═══════════════════════════════════════════════════════
    class CollectionRef {
        constructor(name, filters = [], orderField = null, orderDir = 'desc', limitNum = 500) {
            this.name = name;
            this.filters = filters;
            this.orderField = orderField;
            this.orderDir = orderDir;
            this.limitNum = limitNum;
        }

        doc(id) {
            return new DocRef(this.name, String(id));
        }

        where(field, op, value) {
            return new CollectionRef(
                this.name,
                [...this.filters, { field, op, value }],
                this.orderField, this.orderDir, this.limitNum
            );
        }
        orderBy(field, dir = 'desc') {
            return new CollectionRef(this.name, this.filters, field, dir, this.limitNum);
        }
        limit(n) {
            return new CollectionRef(this.name, this.filters, this.orderField, this.orderDir, n);
        }
        startAt() { return this; }
        endAt() { return this; }
        startAfter() { return this; }
        endBefore() { return this; }

        _buildUrl() {
            const params = { limit: this.limitNum };
            if (this.orderField) {
                params.orderBy = this.orderField;
                params.order = this.orderDir;
            }
            // Equality filtra i dërgohen serverit
            this.filters.forEach(f => {
                if (f.op === '==' || f.op === '===') {
                    params[`where_${f.field}`] = f.value;
                }
            });
            return `/api/data/${this.name}?${new URLSearchParams(params).toString()}`;
        }

        async get() {
            try {
                const r = await http('GET', this._buildUrl());
                let rows = r.data || [];
                rows = this._applyClientFilters(rows);
                return new QuerySnapshot(rows);
            } catch (e) {
                console.warn(`shim.get ${this.name}:`, e.message);
                return new QuerySnapshot([]);
            }
        }

        _applyClientFilters(rows) {
            let out = [...rows];
            this.filters.forEach(f => {
                const { field, op, value } = f;
                if (op === '==' || op === '===') return; // u bë në server
                switch (op) {
                    case '!=': out = out.filter(x => x[field] !== value); break;
                    case '>':  out = out.filter(x => x[field] >  value); break;
                    case '>=': out = out.filter(x => x[field] >= value); break;
                    case '<':  out = out.filter(x => x[field] <  value); break;
                    case '<=': out = out.filter(x => x[field] <= value); break;
                    case 'in': out = out.filter(x => Array.isArray(value) && value.includes(x[field])); break;
                    case 'not-in': out = out.filter(x => Array.isArray(value) && !value.includes(x[field])); break;
                    case 'array-contains':
                        out = out.filter(x => Array.isArray(x[field]) && x[field].includes(value));
                        break;
                    case 'array-contains-any':
                        out = out.filter(x => Array.isArray(x[field]) && Array.isArray(value)
                            && x[field].some(v => value.includes(v)));
                        break;
                }
            });
            if (this.orderField) {
                out.sort((a, b) => {
                    let av = a[this.orderField], bv = b[this.orderField];
                    if (av && av.seconds !== undefined) av = av.seconds * 1000;
                    if (bv && bv.seconds !== undefined) bv = bv.seconds * 1000;
                    if (av === undefined || av === null) return 1;
                    if (bv === undefined || bv === null) return -1;
                    if (av < bv) return this.orderDir === 'asc' ? -1 : 1;
                    if (av > bv) return this.orderDir === 'asc' ? 1 : -1;
                    return 0;
                });
            }
            return out;
        }

        async add(data) {
            const clean = cleanForSend(data);
            const r = await http('POST', `/api/data/${this.name}`, clean);
            return new DocRef(this.name, r.id || r.docId);
        }

        onSnapshot(cb, errCb) {
            const fetch = async () => {
                try {
                    const snap = await this.get();
                    cb(snap);
                } catch (e) { if (errCb) errCb(e); }
            };
            fetch();
            const interval = setInterval(fetch, 3000);
            return () => clearInterval(interval);
        }
    }

    // ═══════════════════════════════════════════════════════
    // WRITE BATCH
    // ═══════════════════════════════════════════════════════
    class WriteBatch {
        constructor() { this.ops = []; }
        set(ref, data, opts = {}) {
            this.ops.push({ type: 'set', ref, data, opts });
            return this;
        }
        update(ref, data) {
            this.ops.push({ type: 'update', ref, data });
            return this;
        }
        delete(ref) {
            this.ops.push({ type: 'delete', ref });
            return this;
        }
        async commit() {
            for (const op of this.ops) {
                try {
                    if (op.type === 'set') await op.ref.set(op.data, op.opts);
                    else if (op.type === 'update') await op.ref.update(op.data);
                    else if (op.type === 'delete') await op.ref.delete();
                } catch (e) {
                    console.warn('Batch op error:', e.message);
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // FIRESTORE
    // ═══════════════════════════════════════════════════════
    const firestoreInstance = {
        collection: (name) => new CollectionRef(name),
        doc: (path) => {
            const parts = path.split('/');
            if (parts.length === 2) return new DocRef(parts[0], parts[1]);
            if (parts.length === 1) return new DocRef(parts[0], genId());
            return new DocRef(parts[parts.length - 2], parts[parts.length - 1]);
        },
        batch: () => new WriteBatch(),
        runTransaction: async (fn) => fn(firestoreInstance),
        FieldValue,
        Timestamp
    };

    function genId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }

    // ═══════════════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════════════
    const authInstance = {
        currentUser: null,
        _listeners: [],

        async signInWithEmailAndPassword(email, password) {
            const r = await http('POST', '/api/auth/login', { username: email, password });
            const user = r.user || r.operator || r;
            authInstance.currentUser = {
                uid: user.id || user.uid,
                email: user.email || email,
                displayName: user.name,
                ...user
            };
            if (r.token) localStorage.setItem('taxi_token', r.token);
            authInstance._listeners.forEach(cb => { try { cb(authInstance.currentUser); } catch(e){} });
            return { user: authInstance.currentUser };
        },

        async signOut() {
            try { await http('POST', '/api/auth/logout'); } catch (e) {}
            authInstance.currentUser = null;
            localStorage.removeItem('taxi_token');
            localStorage.removeItem('taxi_current_user');
            authInstance._listeners.forEach(cb => { try { cb(null); } catch(e){} });
        },

        onAuthStateChanged(cb) {
            authInstance._listeners.push(cb);
            const check = async () => {
                if (getToken()) {
                    try {
                        const r = await http('GET', '/api/auth/me');
                        const user = r.user || r;
                        authInstance.currentUser = {
                            uid: user.id || user.uid,
                            email: user.email,
                            displayName: user.name,
                            ...user
                        };
                        cb(authInstance.currentUser);
                    } catch (e) { cb(null); }
                } else {
                    cb(null);
                }
            };
            check();
            // Nuk ka interval këtu — përdoret vetëm një herë
        }
    };

    // ═══════════════════════════════════════════════════════
    // EKSPORTO GLOBAL
    // ═══════════════════════════════════════════════════════
    function firestore() { return firestoreInstance; }
    function auth() { return authInstance; }
    function initializeApp() { return { name: '[DEFAULT]' }; }

    window.firebase = {
        firestore, auth, initializeApp,
        apps: [{ name: '[DEFAULT]' }]
    };

    // ═══ GLOBAL për shërbimet e vjetra ═══
    window.TaxiFirebase = {
        init: () => console.log('✅ Firebase shim aktiv (SQLite)'),
        get db() { return firestoreInstance; },
        get auth() { return authInstance; },
        serverTime: () => ({ _type: 'serverTimestamp' }),
        FieldValue,
        Timestamp
    };

    console.log('✅ firebase-shim.js ngarkuar');
})();

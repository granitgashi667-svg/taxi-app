'use strict';

/**
 * js/firebase-shim.js — Firebase i zëvendësuar me localStorage
 * Punon pa server. Punon në Cloudflare, GitHub Pages, çdo host.
 */

(function() {
    console.log('🔥 Firebase SHIM — localStorage mode');

    const STORAGE_KEY = 'taxi_data';
    let currentUser = null;
    const authListeners = [];

    // ═══════════════════════════════════════════════════════
    // DB — localStorage
    // ═══════════════════════════════════════════════════════
    function loadDB() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return {
            orders: [], drivers: [], vehicles: [], clients: [],
            zones: [], stands: [], locations: [], tariffs: [],
            workers: [], operators: [], messages: [], remarks: [],
            tenants: [], driver_messages: [], loyalty_cards: [],
            mobile_users: [], fuel_refills: [], fuel_prices: [],
            salaries: [], sms_templates: [], fixed_price_routes: [],
            trackers: [], streets: [], target_history: [],
            preorders: [], ipay: [], mobile: [], audit_log: [],
            blacklist: [], vacations: [], hours_log: []
        };
    }

    function saveDB(db) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) {}
    }

    let DB = loadDB();

    function seedDemo() {
        if (DB.workers.length === 0) {
            DB.workers = [
                { id: 1, username: 'G', password: '1', name: 'Granit Gashi', surname: '', role: 'admin', active: true, online: true, phone: '+383 44 123 456' },
                { id: 2, username: 'operator1', password: '1', name: 'Ardit Krasniqi', surname: '', role: 'operator', active: true, online: true, phone: '+383 44 234 567' },
                { id: 3, username: 'operator2', password: '1', name: 'Blerim Hoxha', surname: '', role: 'operator', active: false, online: false, phone: '+383 44 345 678' },
                { id: 4, username: 'manager1', password: '1', name: 'Driton Berisha', surname: '', role: 'manager', active: true, online: true, phone: '+383 44 456 789' }
            ];
            DB.drivers = [
                { id: 10, username: 'shofer1', password: '1', name: 'Fatos Kelmendi', surname: '', role: 'driver', active: true, online: true, vehicle_number: 5, phone: '+383 44 555 111' },
                { id: 11, username: 'shofer2', password: '1', name: 'Besnik Rexha', surname: '', role: 'driver', active: true, online: true, vehicle_number: 12, phone: '+383 44 666 222' },
                { id: 12, username: 'shofer3', password: '1', name: 'Endrit Aliu', surname: '', role: 'driver', active: true, online: false, vehicle_number: 23, phone: '+383 44 777 333' }
            ];
            DB.clients = [
                { id: 100, name: 'Ardit Krasniqi', phone: '+383 44 111 222', orders_count: 5 },
                { id: 101, name: 'Blerim Hoxha', phone: '+383 44 333 444', orders_count: 3 }
            ];
            saveDB(DB);
            console.log('✅ Demo data u krijua');
        }
    }

    seedDemo();

    function newId() { return Date.now() + Math.floor(Math.random() * 1000); }

    function resolveFieldValues(data) {
        if (!data || typeof data !== 'object') return data;
        if (Array.isArray(data)) return data.map(resolveFieldValues);
        const out = {};
        Object.keys(data).forEach(k => {
            const v = data[k];
            if (v && typeof v === 'object') {
                if (v.__isFieldValue === 'serverTimestamp') out[k] = new Date().toISOString();
                else if (v.__isFieldValue === 'increment') out[k] = v.value;
                else if (v.__isFieldValue === 'arrayUnion') out[k] = v.value;
                else if (v.__isFieldValue === 'delete') out[k] = null;
                else out[k] = resolveFieldValues(v);
            } else out[k] = v;
        });
        return out;
    }

    // ═══════════════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════════════
    const auth = {
        get currentUser() { return currentUser; },

        async signInWithEmailAndPassword(email, password) {
            const username = String(email).split('@')[0].toLowerCase();

            let user = DB.workers.find(w =>
                (w.username || '').toLowerCase() === username ||
                (w.email || '').toLowerCase() === String(email).toLowerCase()
            );

            if (!user) {
                user = DB.drivers.find(d => (d.username || '').toLowerCase() === username);
            }

            if (!user || user.password !== password) {
                const e = new Error('Username ose password i gabuar');
                e.code = 'auth/wrong-password';
                throw e;
            }

            currentUser = {
                uid: user.id,
                email: `${user.username}@taxiapp.local`,
                displayName: user.name,
                emailVerified: true,
                ...user
            };

            localStorage.setItem('taxi_user', JSON.stringify(currentUser));

            // Hours log
            const today = new Date().toISOString().slice(0, 10);
            if (!DB.hours_log) DB.hours_log = [];
            const existing = DB.hours_log.find(h => h.user_id === user.id && h.date === today && !h.logout_at);
            if (!existing) {
                DB.hours_log.push({
                    id: newId(),
                    user_id: user.id,
                    login_at: new Date().toISOString(),
                    logout_at: null,
                    date: today
                });
                saveDB(DB);
            }

            authListeners.forEach(cb => { try { cb(currentUser); } catch (e) {} });
            return { user: currentUser };
        },

        async createUserWithEmailAndPassword(email, password) {
            const username = String(email).split('@')[0].toLowerCase();
            if (DB.workers.find(w => w.username === username)) throw new Error('Username ekziston');
            const user = { id: newId(), username, password, name: username, role: 'operator', active: true, online: false };
            DB.workers.push(user);
            saveDB(DB);
            return { user: { uid: user.id, email } };
        },

        async signOut() {
            // Update hours log
            if (currentUser && DB.hours_log) {
                const today = new Date().toISOString().slice(0, 10);
                const log = DB.hours_log.find(h => h.user_id === currentUser.uid && h.date === today && !h.logout_at);
                if (log) log.logout_at = new Date().toISOString();
                saveDB(DB);
            }
            currentUser = null;
            localStorage.removeItem('taxi_user');
            authListeners.forEach(cb => { try { cb(null); } catch (e) {} });
        },

        onAuthStateChanged(cb) {
            authListeners.push(cb);
            const cached = localStorage.getItem('taxi_user');
            if (cached) {
                try {
                    currentUser = JSON.parse(cached);
                    setTimeout(() => cb(currentUser), 10);
                } catch (e) {}
            } else {
                setTimeout(() => cb(null), 10);
            }
            return () => {
                const i = authListeners.indexOf(cb);
                if (i >= 0) authListeners.splice(i, 1);
            };
        },

        async getIdToken() { return 'local-token'; },
        async getIdTokenResult() { return { token: 'local-token', claims: currentUser || {} }; }
    };

    // ═══════════════════════════════════════════════════════
    // FIRESTORE
    // ═══════════════════════════════════════════════════════
    function createDocRef(collectionName, docId) {
        return {
            id: docId,
            path: `${collectionName}/${docId}`,
            async get() {
                const list = DB[collectionName] || [];
                const item = list.find(i => String(i.id) === String(docId));
                return {
                    exists: !!item,
                    id: docId,
                    data: () => item || {},
                    get: (f) => item ? item[f] : undefined
                };
            },
            async set(newData, options = {}) {
                const clean = resolveFieldValues(newData);
                if (!DB[collectionName]) DB[collectionName] = [];
                const list = DB[collectionName];
                const idx = list.findIndex(i => String(i.id) === String(docId));
                if (idx >= 0) {
                    list[idx] = options.merge ? { ...list[idx], ...clean } : { id: docId, ...clean };
                } else {
                    list.push({ id: docId, ...clean, created_at: new Date().toISOString() });
                }
                saveDB(DB);
                return { id: docId };
            },
            async update(newData) {
                const clean = resolveFieldValues(newData);
                if (!DB[collectionName]) DB[collectionName] = [];
                const list = DB[collectionName];
                const idx = list.findIndex(i => String(i.id) === String(docId));
                if (idx >= 0) list[idx] = { ...list[idx], ...clean };
                else list.push({ id: docId, ...clean });
                saveDB(DB);
                return { id: docId };
            },
            async delete() {
                if (!DB[collectionName]) return;
                DB[collectionName] = DB[collectionName].filter(i => String(i.id) !== String(docId));
                saveDB(DB);
            },
            onSnapshot(cb) {
                this.get().then(snap => {
                    cb({ ...snap, docChanges: () => [{ type: 'added', doc: snap }] });
                });
                return () => {};
            }
        };
    }

    function createQuery(collectionName) {
        const state = { filters: [], orderField: null, orderDir: 'asc', limitNum: null };
        const q = {
            where(field, op, value) { state.filters.push({ field, op, value }); return this; },
            orderBy(field, dir = 'asc') { state.orderField = field; state.orderDir = dir; return this; },
            limit(n) { state.limitNum = n; return this; },
            doc(id) { return createDocRef(collectionName, id); },
            async get() {
                let items = [...(DB[collectionName] || [])];
                state.filters.forEach(f => {
                    items = items.filter(i => {
                        const v = i[f.field];
                        switch (f.op) {
                            case '==': return v === f.value;
                            case '!=': return v !== f.value;
                            case '>': return v > f.value;
                            case '<': return v < f.value;
                            case '>=': return v >= f.value;
                            case '<=': return v <= f.value;
                            case 'array-contains': return Array.isArray(v) && v.includes(f.value);
                            case 'in': return Array.isArray(f.value) && f.value.includes(v);
                            default: return true;
                        }
                    });
                });
                if (state.orderField) {
                    const dir = state.orderDir === 'desc' ? -1 : 1;
                    items.sort((a, b) => {
                        const av = a[state.orderField], bv = b[state.orderField];
                        if (av < bv) return -1 * dir;
                        if (av > bv) return 1 * dir;
                        return 0;
                    });
                }
                if (state.limitNum) items = items.slice(0, state.limitNum);
                const docs = items.map(item => ({
                    id: item.id,
                    exists: true,
                    ref: createDocRef(collectionName, item.id),
                    data: () => item,
                    get: (f) => item[f]
                }));
                return { docs, size: docs.length, empty: docs.length === 0, forEach: (cb) => docs.forEach(cb) };
            },
            async add(newData) {
                const clean = resolveFieldValues(newData);
                if (!DB[collectionName]) DB[collectionName] = [];
                const id = newId();
                DB[collectionName].push({
                    id, ...clean,
                    created_at: new Date().toISOString(),
                    createdAtLocal: Date.now()
                });
                saveDB(DB);
                return { id };
            },
            onSnapshot(cb) {
                this.get().then(snap => {
                    cb({ ...snap, docChanges: () => snap.docs.map(d => ({ type: 'added', doc: d })) });
                });
                return () => {};
            },
            startAt() { return this; },
            endAt() { return this; },
            startAfter() { return this; },
            endBefore() { return this; }
        };
        return q;
    }

    const firestore = {
        collection(name) { return createQuery(name); },
        FieldValue: {
            serverTimestamp() { return { __isFieldValue: 'serverTimestamp' }; },
            increment(n) { return { __isFieldValue: 'increment', value: n }; },
            arrayUnion(...items) { return { __isFieldValue: 'arrayUnion', value: items }; },
            arrayRemove(...items) { return { __isFieldValue: 'arrayRemove', value: items }; },
            delete() { return { __isFieldValue: 'delete' }; }
        },
        Timestamp: {
            now: () => ({ seconds: Math.floor(Date.now() / 1000), toDate: () => new Date() }),
            fromDate: (d) => ({ seconds: Math.floor(d.getTime() / 1000), toDate: () => d }),
            fromMillis: (ms) => ({ seconds: Math.floor(ms / 1000), toDate: () => new Date(ms) })
        },
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
                        } catch (e) {}
                    }
                }
            };
        },
        runTransaction(fn) {
            return fn({
                get: (ref) => ref.get(),
                set: (ref, data) => ref.set(data),
                update: (ref, data) => ref.update(data),
                delete: (ref) => ref.delete()
            });
        },
        settings() {},
        enablePersistence() { return Promise.resolve(); }
    };

    const functions = {
        httpsCallable(name) {
            return async (data) => ({ data: { success: true } });
        }
    };

    const storage = {
        ref() {
            return {
                async put() { return { ref: { getDownloadURL: async () => '' } }; },
                async getDownloadURL() { return ''; },
                async delete() {}
            };
        }
    };

    const messaging = {
        async getToken() { return ''; },
        onMessage() {},
        onBackgroundMessage() {},
        async requestPermission() { return 'granted'; }
    };

    window.firebase = {
        apps: [],
        initializeApp: () => ({ name: '[DEFAULT]' }),
        app: () => ({ name: '[DEFAULT]' }),
        auth: () => auth,
        firestore: () => firestore,
        functions: () => functions,
        storage: () => storage,
        messaging: () => messaging,
        analytics: () => ({ logEvent: () => {} }),
        SDK_VERSION: 'shim-localStorage-1.0'
    };

    window.__taxiData = DB;
    window.__taxiSave = () => saveDB(DB);
    window.__taxiReset = () => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('taxi_user');
        location.reload();
    };

    console.log('✅ Firebase SHIM — localStorage aktiv');
    console.log('📊 Users: G/1, operator1/1, manager1/1, shofer1/1');
})();

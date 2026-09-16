'use strict';

window.TaxiCache = (() => {
    const store = new Map();
    const TTL = {
        short: 60 * 1000,
        medium: 5 * 60 * 1000,
        long: 30 * 60 * 1000
    };

    function set(key, value, ttl = TTL.medium) {
        store.set(key, { value, expires: Date.now() + ttl });
    }

    function get(key) {
        const item = store.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            store.delete(key);
            return null;
        }
        return item.value;
    }

    function remove(key) { store.delete(key); }

    function clear() { store.clear(); }

    function has(key) { return get(key) !== null; }

    async function wrap(key, fn, ttl = TTL.medium) {
        const cached = get(key);
        if (cached !== null) return cached;
        const value = await fn();
        set(key, value, ttl);
        return value;
    }

    function stats() {
        return {
            size: store.size,
            keys: Array.from(store.keys())
        };
    }

    return { set, get, remove, clear, has, wrap, stats, TTL };
})();

console.log('✅ cache.js ngarkuar');

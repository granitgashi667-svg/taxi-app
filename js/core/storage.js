'use strict';

/**
 * storage.js — Wrapper për localStorage me versionim dhe fallback.
 * Përdoret për:
 *  - Ruajtjen e sesionit (login)
 *  - Cache të dhënash (nëse humbet interneti)
 *  - Settings personale të operatorit/shoferit
 */

window.TaxiStorage = (() => {
    const K = () => window.TaxiConfig.STORAGE_KEYS;
    let available = true;

    // Test i aksesueshmërisë
    try {
        const t = '__taxi_test__';
        localStorage.setItem(t, '1');
        localStorage.removeItem(t);
    } catch (e) {
        available = false;
        console.warn('⚠️ localStorage i padisponueshëm — përdoret memorie e përkohshme');
    }

    const memory = new Map();

    function getItem(key) {
        if (!available) return memory.get(key) ?? null;
        try { return localStorage.getItem(key); }
        catch { return null; }
    }

    function setItem(key, value) {
        if (!available) { memory.set(key, value); return; }
        try { localStorage.setItem(key, value); }
        catch (e) { console.warn('storage.setItem dështoi', e); }
    }

    function removeItem(key) {
        if (!available) { memory.delete(key); return; }
        try { localStorage.removeItem(key); } catch {}
    }

    return {
        get available() { return available; },

        // JSON shortcuts
        get(key, fallback = null) {
            const raw = getItem(key);
            if (raw == null) return fallback;
            try { return JSON.parse(raw); }
            catch { return fallback; }
        },

        set(key, value) {
            try { setItem(key, JSON.stringify(value)); }
            catch (e) { console.warn('storage.set dështoi', e); }
        },

        remove(key) { removeItem(key); },

        has(key) { return getItem(key) !== null; },

        clearAll() {
            if (!available) { memory.clear(); return; }
            Object.values(K()).forEach(k => removeItem(k));
        },

        save(key, value) { this.set(key, value); },

        checkVersion() {
            const v = this.get(K().version);
            const current = window.TaxiConfig.APP.version;
            if (v !== current) {
                this.set(K().version, current);
                return { migrated: true, from: v, to: current };
            }
            return { migrated: false };
        }
    };
})();

console.log('✅ storage.js ngarkuar');

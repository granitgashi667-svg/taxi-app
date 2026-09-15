'use strict';

/**
 * utils.js — Funksione ndihmëse (formatim, matematikë, DOM).
 */

window.TaxiUtils = {

    // ─── DOM ───
    $:  (sel, ctx = document) => ctx.querySelector(sel),
    $$: (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel)),
    on: (el, ev, fn, opts) => el?.addEventListener(ev, fn, opts),
    off: (el, ev, fn) => el?.removeEventListener(ev, fn),

    setText(id, val) {
        const e = typeof id === 'string' ? document.getElementById(id) : id;
        if (e) e.textContent = val;
    },
    setHTML(id, val) {
        const e = typeof id === 'string' ? document.getElementById(id) : id;
        if (e) e.innerHTML = val;
    },
    show(id) { document.getElementById(id)?.classList.add('active'); },
    hide(id) { document.getElementById(id)?.classList.remove('active'); },

    // ─── Format ───
    pad2(n) { return String(n).padStart(2, '0'); },

    time(date = new Date()) {
        return date.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
    },

    timeWithSeconds(date = new Date()) {
        return date.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },

    date(date = new Date()) {
        return date.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    money(amount, currency = '€') {
        return `${currency}${Number(amount || 0).toFixed(2)}`;
    },

    initials(name) {
        if (!name) return '??';
        return name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase();
    },

    padNumber(n, len = 2) {
        return String(n).padStart(len, '0');
    },

    // ─── Math ───
    distanceKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * Math.PI / 180) *
                  Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    // ─── Validation ───
    isPhone(str) {
        return /^[+]?[\d\s\-()]{6,20}$/.test((str || '').trim());
    },

    isEmail(str) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((str || '').trim());
    },

    isEmpty(str) {
        return !str || !str.trim();
    },

    // ─── Arrays ───
    unique(arr) { return [...new Set(arr)]; },

    groupBy(arr, keyFn) {
        return arr.reduce((acc, item) => {
            const k = keyFn(item);
            (acc[k] = acc[k] || []).push(item);
            return acc;
        }, {});
    },

    sortBy(arr, fn, dir = 'asc') {
        const m = dir === 'desc' ? -1 : 1;
        return [...arr].sort((a, b) => {
            const va = fn(a), vb = fn(b);
            if (va < vb) return -1 * m;
            if (va > vb) return 1 * m;
            return 0;
        });
    },

    // ─── Clipboard ───
    async copy(text) {
        try { await navigator.clipboard.writeText(text); return true; }
        catch { return false; }
    },

    // ─── Debounce / Throttle ───
    debounce(fn, wait = 300) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    },

    throttle(fn, wait = 200) {
        let last = 0;
        return (...args) => {
            const now = Date.now();
            if (now - last >= wait) { last = now; fn(...args); }
        };
    },

    // ─── IDs ───
    uid(prefix = '') {
        return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    },

    // ─── Time format për wait-time ───
    formatDuration(ms) {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        if (h > 0) return `${h}h ${m % 60}min`;
        if (m > 0) return `${m}min`;
        return `${s}s`;
    },

    // ─── Class helpers ───
    toggleClass(el, cls, force) {
        if (!el) return;
        if (force === undefined) el.classList.toggle(cls);
        else el.classList.toggle(cls, force);
    }
};

console.log('✅ utils.js ngarkuar');

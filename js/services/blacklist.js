'use strict';

/**
 * blacklist.js — Bllokimi i numrave problematikë
 */

window.TaxiBlacklist = (() => {
    const COLLECTION = 'blacklist';
    let cache = new Map();
    let cacheLoaded = false;

    function db() { return window.TaxiFirebase?.db || null; }

    async function loadCache() {
        const database = db();
        if (!database) return;
        try {
            const snap = await database.collection(COLLECTION).where('status', '==', 'active').get();
            cache.clear();
            snap.docs.forEach(doc => {
                const data = doc.data();
                cache.set(data.phone, { id: doc.id, ...data });
            });
            cacheLoaded = true;
            console.log('✅ Blacklist u ngarkua:', cache.size, 'numra');
        } catch (e) { console.error('❌ loadCache:', e); }
    }

    function isBlocked(phone) {
        return cache.has(phone);
    }

    function get(phone) {
        return cache.get(phone) || null;
    }

    async function block(phone, reason, operatorName, expiresInDays = null) {
        const database = db();
        if (!database) return null;
        try {
            const item = {
                phone,
                reason: reason || 'Nuk specifikuar',
                blockedBy: window.TaxiAuth?.currentUser()?.uid || null,
                blockedByName: operatorName || 'Operator',
                blockedAt: new Date().getTime(),
                blockedAtStr: new Date().toLocaleString('sq-AL'),
                expiresAt: expiresInDays ? new Date().getTime() + (expiresInDays * 86400000) : null,
                status: 'active',
                notes: ''
            };
            const ref = await database.collection(COLLECTION).add(item);
            cache.set(phone, { id: ref.id, ...item });
            console.log('🚫 Numri u bllokua:', phone);
            return { id: ref.id, ...item };
        } catch (e) { console.error('❌ block:', e); return null; }
    }

    async function unblock(phone) {
        const database = db();
        if (!database) return;
        try {
            const item = cache.get(phone);
            if (!item) return;
            await database.collection(COLLECTION).doc(item.id).update({
                status: 'removed',
                removedAt: new Date().getTime()
            });
            cache.delete(phone);
            console.log('✅ Numri u zhbllokua:', phone);
        } catch (e) { console.error('❌ unblock:', e); }
    }

    async function getAll() {
        const database = db();
        if (!database) return [];
        try {
            const snap = await database.collection(COLLECTION)
                .where('status', '==', 'active')
                .orderBy('blockedAt', 'desc')
                .get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { return []; }
    }

    // Auto-bllokim pas shumë anulimeve
    async function checkAutoBlock(phone) {
        const database = db();
        if (!database) return;
        try {
            const snap = await database.collection('orders')
                .where('phone', '==', phone)
                .where('status', '==', 'cancelled')
                .get();
            const cancelled = snap.size;

            if (cancelled >= 5 && !isBlocked(phone)) {
                await block(phone, `Auto-bllokim: ${cancelled} anulime`, 'Sistemi', 30);
                console.log('🚫 Auto-bllokim:', phone, cancelled, 'anulime');
            }
        } catch (e) { console.error('❌ checkAutoBlock:', e); }
    }

    return { loadCache, isBlocked, get, block, unblock, getAll, checkAutoBlock };
})();

console.log('✅ blacklist.js ngarkuar');

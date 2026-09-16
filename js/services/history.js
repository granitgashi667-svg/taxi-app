'use strict';

/**
 * history.js — Target History (filtra data/ora)
 */

window.TaxiHistory = (() => {
    const COLLECTION = 'orders';

    function db() { return window.TaxiFirebase?.db || null; }

    async function query(filters = {}) {
        const database = db();
        if (!database) return [];

        try {
            let q = database.collection(COLLECTION);

            // Filtra
            if (filters.fromDate) {
                q = q.where('createdAtLocal', '>=', new Date(filters.fromDate).getTime());
            }
            if (filters.toDate) {
                q = q.where('createdAtLocal', '<=', new Date(filters.toDate).getTime());
            }
            if (filters.status) {
                q = q.where('status', '==', filters.status);
            }
            if (filters.phone) {
                q = q.where('phone', '==', filters.phone);
            }

            q = q.orderBy('createdAtLocal', 'desc').limit(filters.limit || 200);

            const snap = await q.get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error('❌ history query:', e);
            return [];
        }
    }

    // Sot
    function today() {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return query({ fromDate: start.getTime() });
    }

    // Kjo javë
    function thisWeek() {
        const start = new Date();
        start.setDate(start.getDate() - start.getDay() + 1);
        start.setHours(0, 0, 0, 0);
        return query({ fromDate: start.getTime() });
    }

    // Ky muaj
    function thisMonth() {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return query({ fromDate: start.getTime() });
    }

    // Ky vit
    function thisYear() {
        const start = new Date(new Date().getFullYear(), 0, 1);
        return query({ fromDate: start.getTime() });
    }

    // Personalizuar
    function custom(fromDate, toDate) {
        return query({ fromDate, toDate });
    }

    // Statistika nga lista
    function summary(orders) {
        const completed = orders.filter(o => o.status === 'completed').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;
        const revenue = orders.reduce((s, o) => s + (o.price || 0), 0);
        return {
            total: orders.length,
            completed,
            cancelled,
            revenue: +revenue.toFixed(2),
            avgPrice: orders.length > 0 ? +(revenue / orders.length).toFixed(2) : 0,
            successRate: orders.length > 0 ? +((completed / orders.length) * 100).toFixed(1) : 0
        };
    }

    return { query, today, thisWeek, thisMonth, thisYear, custom, summary };
})();

console.log('✅ history.js ngarkuar');

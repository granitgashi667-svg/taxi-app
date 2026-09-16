'use strict';

/**
 * stats.js — Llogaritjet e statistikave
 */

window.TaxiStats = (() => {

    // Statistika nga lista e porosive
    function fromOrders(orders = []) {
        const total = orders.length;
        const completed = orders.filter(o => o.status === 'completed').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;
        const waiting = orders.filter(o => ['waiting', 'new', 'pending'].includes(o.status)).length;
        const active = orders.filter(o => ['assigned', 'onroute', 'arrived', 'taximeter', 'fixed'].includes(o.status)).length;
        const revenue = orders.reduce((s, o) => s + (o.price || 0), 0);

        return {
            total, completed, cancelled, waiting, active, revenue,
            avgPrice: total > 0 ? revenue / total : 0,
            successRate: total > 0 ? (completed / total * 100).toFixed(1) : 0
        };
    }

    // Filtrim sipas datës
    function filterByDate(orders = [], fromDate, toDate) {
        const from = fromDate ? new Date(fromDate).getTime() : 0;
        const to = toDate ? new Date(toDate).getTime() : Date.now();
        return orders.filter(o => {
            const t = o.createdAtLocal || 0;
            return t >= from && t <= to;
        });
    }

    // Sot
    function today(orders = []) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return filterByDate(orders, start, Date.now());
    }

    // Kjo javë
    function thisWeek(orders = []) {
        const now = new Date();
        const day = now.getDay() || 7;
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1).getTime();
        return filterByDate(orders, start, Date.now());
    }

    // Ky muaj
    function thisMonth(orders = []) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return filterByDate(orders, start, Date.now());
    }

    // Ky vit
    function thisYear(orders = []) {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1).getTime();
        return filterByDate(orders, start, Date.now());
    }

    // Grupim sipas orës
    function byHour(orders = []) {
        const hours = Array(24).fill(0);
        orders.forEach(o => {
            if (o.createdAtLocal) {
                const h = new Date(o.createdAtLocal).getHours();
                hours[h]++;
            }
        });
        return hours;
    }

    // Grupim sipas ditës (7 ditët e fundit)
    function last7Days(orders = []) {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            const end = start + 86400000;
            const count = orders.filter(o => o.createdAtLocal >= start && o.createdAtLocal < end).length;
            days.push({ date: d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' }), count });
        }
        return days;
    }

    // Top shoferët
    function topDrivers(orders = [], limit = 5) {
        const map = {};
        orders.forEach(o => {
            if (o.driverName) {
                if (!map[o.driverName]) map[o.driverName] = { name: o.driverName, trips: 0, revenue: 0 };
                map[o.driverName].trips++;
                map[o.driverName].revenue += o.price || 0;
            }
        });
        return Object.values(map).sort((a, b) => b.trips - a.trips).slice(0, limit);
    }

    return {
        fromOrders, filterByDate, today, thisWeek, thisMonth, thisYear,
        byHour, last7Days, topDrivers
    };
})();

console.log('✅ stats.js ngarkuar');

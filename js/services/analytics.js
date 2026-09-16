'use strict';

window.TaxiAnalytics = (() => {
    function trend(orders, days = 30) {
        const days_data = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            const end = start + 86400000;
            const dayOrders = orders.filter(o => o.createdAtLocal >= start && o.createdAtLocal < end);
            days_data.push({
                date: d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' }),
                count: dayOrders.length,
                revenue: dayOrders.reduce((s, o) => s + (o.price || 0), 0)
            });
        }
        return days_data;
    }

    function byHour(orders) {
        const hours = Array(24).fill(0);
        orders.forEach(o => { if (o.createdAtLocal) hours[new Date(o.createdAtLocal).getHours()]++; });
        return hours.map((count, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, count }));
    }

    function byZone(orders) {
        const zones = {};
        orders.forEach(o => {
            const z = o.zone || 'auto';
            if (!zones[z]) zones[z] = { zone: z, count: 0, revenue: 0 };
            zones[z].count++;
            zones[z].revenue += o.price || 0;
        });
        return Object.values(zones).sort((a, b) => b.count - a.count);
    }

    function byTariff(orders) {
        const tariffs = {};
        orders.forEach(o => {
            const t = o.tariff || 'standard';
            if (!tariffs[t]) tariffs[t] = { tariff: t, count: 0, revenue: 0 };
            tariffs[t].count++;
            tariffs[t].revenue += o.price || 0;
        });
        return Object.values(tariffs).sort((a, b) => b.count - a.count);
    }

    function kpi(orders) {
        const revenue = orders.reduce((s, o) => s + (o.price || 0), 0);
        const completed = orders.filter(o => o.status === 'completed').length;
        return {
            totalOrders: orders.length,
            completed,
            revenue: +revenue.toFixed(2),
            avgPrice: orders.length ? +(revenue / orders.length).toFixed(2) : 0,
            successRate: orders.length ? +((completed / orders.length) * 100).toFixed(1) : 0
        };
    }

    return { trend, byHour, byZone, byTariff, kpi };
})();

console.log('✅ analytics.js ngarkuar');

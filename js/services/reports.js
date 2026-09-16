'use strict';

/**
 * reports.js — Raporte të plota
 */

window.TaxiReports = (() => {

    // Raporti ditor
    async function daily(date = null) {
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const endDate = new Date(targetDate);
        endDate.setDate(endDate.getDate() + 1);

        const orders = await window.TaxiHistory.query({
            fromDate: targetDate.getTime(),
            toDate: endDate.getTime()
        });

        const operators = await getOperatorsStats(orders);
        const drivers = await getDriversStats(orders);

        return {
            date: targetDate.toLocaleDateString('sq-AL'),
            summary: window.TaxiHistory.summary(orders),
            operators,
            drivers,
            orders
        };
    }

    // Raporti javor
    async function weekly() {
        const start = new Date();
        start.setDate(start.getDate() - start.getDay() + 1);
        start.setHours(0, 0, 0, 0);

        const orders = await window.TaxiHistory.query({ fromDate: start.getTime() });
        return {
            from: start.toLocaleDateString('sq-AL'),
            to: new Date().toLocaleDateString('sq-AL'),
            summary: window.TaxiHistory.summary(orders),
            operators: await getOperatorsStats(orders),
            drivers: await getDriversStats(orders),
            orders
        };
    }

    // Raporti mujor
    async function monthly() {
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);

        const orders = await window.TaxiHistory.query({ fromDate: start.getTime() });
        return {
            from: start.toLocaleDateString('sq-AL'),
            to: new Date().toLocaleDateString('sq-AL'),
            summary: window.TaxiHistory.summary(orders),
            operators: await getOperatorsStats(orders),
            drivers: await getDriversStats(orders),
            orders
        };
    }

    // Statistika operatorësh
    async function getOperatorsStats(orders) {
        const database = window.TaxiFirebase?.db;
        if (!database) return [];

        const snap = await database.collection('operators').get();
        const operators = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return operators.map(op => {
            const opOrders = orders.filter(o => o.operatorId === op.uid);
            const revenue = opOrders.reduce((s, o) => s + (o.price || 0), 0);
            return {
                name: op.name,
                email: op.email,
                orders: opOrders.length,
                revenue: +revenue.toFixed(2),
                stats: op.stats || {}
            };
        }).sort((a, b) => b.orders - a.orders);
    }

    // Statistika shoferësh
    async function getDriversStats(orders) {
        const stats = {};
        orders.forEach(o => {
            if (o.driverName) {
                if (!stats[o.driverName]) {
                    stats[o.driverName] = { name: o.driverName, orders: 0, revenue: 0 };
                }
                stats[o.driverName].orders++;
                stats[o.driverName].revenue += o.price || 0;
            }
        });

        return Object.values(stats)
            .map(s => ({ ...s, revenue: +s.revenue.toFixed(2) }))
            .sort((a, b) => b.orders - a.orders);
    }

    return { daily, weekly, monthly };
})();

console.log('✅ reports.js ngarkuar');

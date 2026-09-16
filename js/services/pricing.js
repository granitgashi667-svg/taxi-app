'use strict';

/**
 * pricing.js — Llogaritja e çmimeve (fiks / taksimetër)
 */

window.TaxiPricing = (() => {

    // Çmimet nga config
    function getTariffs() {
        return window.TaxiConfig?.TARIFFS || {
            standard: { base: 2.00, perKm: 0.80, min: 3.00 },
            vip:      { base: 5.00, perKm: 1.50, min: 8.00 },
            airport:  { base: 10.00, perKm: 0.60, min: 15.00 },
            night:    { base: 3.00, perKm: 1.00, min: 4.50 },
            van:      { base: 4.00, perKm: 1.20, min: 6.00 }
        };
    }

    // Llogarit çmimin sipas tarifës + distancës
    function calculate(tariff = 'standard', distanceKm = 0, durationMin = 0) {
        const t = getTariffs()[tariff] || getTariffs().standard;
        const fromKm = distanceKm * t.perKm;
        const fromMin = durationMin * 0.20; // 0.20€/min
        const subtotal = t.base + fromKm + fromMin;
        const total = Math.max(subtotal, t.min);

        return {
            tariff: tariff,
            base: t.base,
            distance: distanceKm,
            duration: durationMin,
            fromKm: +fromKm.toFixed(2),
            fromMin: +fromMin.toFixed(2),
            subtotal: +subtotal.toFixed(2),
            total: +total.toFixed(2),
            minimum: t.min
        };
    }

    // Çmim fiks sipas zonës
    function fixedPrice(zone) {
        const zones = window.TaxiData?.zones || [];
        const z = zones.find(x => x.id === zone);
        return z ? z.tariff : 0;
    }

    // Çmim mesatar për statistika
    function avgPrice(orders = []) {
        if (!orders.length) return 0;
        const total = orders.reduce((s, o) => s + (o.price || 0), 0);
        return +(total / orders.length).toFixed(2);
    }

    // Formato çmimin
    function format(amount, currency = '€') {
        return `${currency}${Number(amount || 0).toFixed(2)}`;
    }

    return { calculate, fixedPrice, avgPrice, format, getTariffs };
})();

console.log('✅ pricing.js ngarkuar');

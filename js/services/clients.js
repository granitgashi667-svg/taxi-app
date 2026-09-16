'use strict';

/**
 * clients.js — Historiku i klientëve (kërkim sipas telefonit)
 */

window.TaxiClients = (() => {
    const CACHE = new Map(); // Cache për të njëjtin numër
    const CACHE_TTL = 60 * 1000; // 1 minutë

    function db() {
        return window.TaxiFirebase?.db || null;
    }

    // ─── KËRKO POROSITË E KLIENTIT ───
    async function searchByPhone(phone) {
        const database = db();
        if (!database) return null;

        // Normalizo telefonin (hiq hapësirat)
        const cleanPhone = phone.trim();

        // Cache
        const cached = CACHE.get(cleanPhone);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }

        try {
            const snapshot = await database
                .collection('orders')
                .where('phone', '==', cleanPhone)
                .orderBy('createdAtLocal', 'desc')
                .limit(20)
                .get();

            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Statistikat
            const stats = calculateStats(orders);

            const result = {
                phone: cleanPhone,
                orders: orders,
                stats: stats,
                lastOrder: orders[0] || null,
                isNewClient: orders.length === 0
            };

            // Ruaj në cache
            CACHE.set(cleanPhone, { data: result, timestamp: Date.now() });

            console.log(`📋 Klienti ${cleanPhone}: ${orders.length} porosi`);
            return result;

        } catch (e) {
            console.error('❌ Gabim kërkimi klienti:', e);

            // Nëse ka problem me indeksin, bëj kërkim pa orderBy
            if (e.code === 'failed-precondition') {
                console.warn('⚠️ Kërkon indeks në Firestore — provo kërkim bazë');
                try {
                    const snap = await database
                        .collection('orders')
                        .where('phone', '==', cleanPhone)
                        .limit(20)
                        .get();

                    const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                        .sort((a, b) => (b.createdAtLocal || 0) - (a.createdAtLocal || 0));

                    return {
                        phone: cleanPhone,
                        orders: orders,
                        stats: calculateStats(orders),
                        lastOrder: orders[0] || null,
                        isNewClient: orders.length === 0
                    };
                } catch (e2) {
                    console.error('❌ Kërkimi fallback dështoi:', e2);
                }
            }

            return null;
        }
    }

    // ─── LLOGARIT STATISTIKAT ───
    function calculateStats(orders) {
        if (!orders.length) {
            return {
                total: 0,
                completed: 0,
                cancelled: 0,
                waiting: 0,
                revenue: 0,
                avgPrice: 0,
                lastStatus: null,
                lastDate: null,
                frequentAddresses: [],
                frequentDrivers: []
            };
        }

        const completed = orders.filter(o => o.status === 'completed' || o.status === 'onroute' || o.status === 'assigned');
        const cancelled = orders.filter(o => o.status === 'cancelled');
        const waiting = orders.filter(o => o.status === 'waiting' || o.status === 'new');

        const revenue = orders.reduce((sum, o) => sum + (o.price || 0), 0);

        // Adresat e shpeshta
        const addressCount = {};
        orders.forEach(o => {
            if (o.pickup) {
                addressCount[o.pickup] = (addressCount[o.pickup] || 0) + 1;
            }
        });
        const frequentAddresses = Object.entries(addressCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([address, count]) => ({ address, count }));

        // Shoferët e shpeshtë
        const driverCount = {};
        orders.forEach(o => {
            if (o.driverName) {
                driverCount[o.driverName] = (driverCount[o.driverName] || 0) + 1;
            }
        });
        const frequentDrivers = Object.entries(driverCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

        return {
            total: orders.length,
            completed: completed.length,
            cancelled: cancelled.length,
            waiting: waiting.length,
            revenue: revenue,
            avgPrice: orders.length > 0 ? revenue / orders.length : 0,
            lastStatus: orders[0].status,
            lastDate: orders[0].createdDateStr || '',
            lastTime: orders[0].createdTimeStr || '',
            frequentAddresses,
            frequentDrivers
        };
    }

    // ─── RENDER PANELIN ───
    function renderPanel(phone, result) {
        const container = document.getElementById('client-history-panel');
        if (!container) return;

        if (!result || !result.orders.length) {
            container.innerHTML = `
                <div class="client-history-new">
                    <i class="fa-solid fa-user-plus"></i>
                    <span>Klient i re — asnjë porosi e mëparshme</span>
                </div>
            `;
            container.style.display = 'block';
            return;
        }

        const s = result.stats;
        const last = result.lastOrder;

        // Ngjyra sipas statusit të fundit
        const statusColors = {
            'completed': { bg: 'rgba(34,197,94,.15)', border: '#22c55e', text: '#22c55e', label: '✅ Përfunduar' },
            'onroute': { bg: 'rgba(59,130,246,.15)', border: '#3b82f6', text: '#3b82f6', label: '🚗 Në rrugë' },
            'assigned': { bg: 'rgba(139,92,246,.15)', border: '#8b5cf6', text: '#8b5cf6', label: '📍 Caktuar' },
            'waiting': { bg: 'rgba(245,158,11,.15)', border: '#f59e0b', text: '#f59e0b', label: '⏳ Në pritje' },
            'cancelled': { bg: 'rgba(244,63,94,.15)', border: '#f43f5e', text: '#f43f5e', label: '❌ Anuluar' },
            'new': { bg: 'rgba(168,85,247,.15)', border: '#a855f7', text: '#a855f7', label: '🆕 E re' }
        };
        const statusStyle = statusColors[last.status] || statusColors['new'];

        container.innerHTML = `
            <div class="client-history-header">
                <div class="client-history-stats">
                    <span class="ch-stat">
                        <strong>${s.total}</strong> thirrje
                    </span>
                    <span class="ch-stat ch-success">
                        <i class="fa-solid fa-check"></i> ${s.completed} realizuar
                    </span>
                    <span class="ch-stat ch-danger">
                        <i class="fa-solid fa-xmark"></i> ${s.cancelled} anuluar
                    </span>
                    ${s.revenue > 0 ? `<span class="ch-stat ch-money">€${s.revenue.toFixed(2)}</span>` : ''}
                </div>
            </div>

            <div class="client-history-last" style="border-left-color:${statusStyle.border};background:${statusStyle.bg};">
                <div class="ch-last-row">
                    <span class="ch-last-label">E fundit:</span>
                    <span class="ch-last-time">${last.createdDateStr || ''} ${last.createdTimeStr || ''}</span>
                    <span class="ch-last-status" style="color:${statusStyle.text};">${statusStyle.label}</span>
                </div>
                <div class="ch-last-row">
                    <span class="ch-last-label"><i class="fa-solid fa-location-dot"></i></span>
                    <span class="ch-last-address">${last.pickup || '—'}</span>
                </div>
                ${last.destination && last.destination !== 'N/A' ? `
                <div class="ch-last-row">
                    <span class="ch-last-label"><i class="fa-solid fa-flag-checkered"></i></span>
                    <span class="ch-last-address">${last.destination}</span>
                </div>` : ''}
                ${last.driverName ? `
                <div class="ch-last-row">
                    <span class="ch-last-label"><i class="fa-solid fa-car"></i></span>
                    <span>${last.vehicleNum || ''} ${last.driverName}</span>
                </div>` : ''}
            </div>

            ${s.frequentAddresses.length > 1 ? `
            <div class="client-history-frequent">
                <div class="ch-freq-title">Adresat e shpeshta:</div>
                ${s.frequentAddresses.slice(0, 3).map(a => `
                    <div class="ch-freq-item" data-address="${a.address}">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${a.address}</span>
                        <strong>${a.count}×</strong>
                    </div>
                `).join('')}
            </div>` : ''}

            <div class="client-history-actions">
                <button type="button" class="ch-btn" id="ch-fill-last">
                    <i class="fa-solid fa-rotate-left"></i> Përdor të njëjtat
                </button>
                <button type="button" class="ch-btn" id="ch-view-all">
                    <i class="fa-solid fa-list"></i> Shiko të gjitha (${s.total})
                </button>
            </div>
        `;

        container.style.display = 'block';

        // Event: Përdor të njëjtat
        document.getElementById('ch-fill-last')?.addEventListener('click', () => {
            if (last.pickup) document.getElementById('pickup-address').value = last.pickup;
            if (last.destination && last.destination !== 'N/A') document.getElementById('destination-address').value = last.destination;
            if (last.zone) document.getElementById('order-zone').value = last.zone;
        });

        // Event: Kliko adresë të shpeshtë
        container.querySelectorAll('.ch-freq-item').forEach(item => {
            item.addEventListener('click', () => {
                const addr = item.dataset.address;
                const pickupField = document.getElementById('pickup-address');
                if (pickupField && !pickupField.value) {
                    pickupField.value = addr;
                } else {
                    document.getElementById('destination-address').value = addr;
                }
            });
        });

        // Event: Shiko të gjitha
        document.getElementById('ch-view-all')?.addEventListener('click', () => {
            showFullHistory(result);
        });
    }

    // ─── SHFAQ HISTORIKUN E PLOTË ───
    function showFullHistory(result) {
        const body = document.getElementById('order-detail-body');
        if (!body) return;

        const statusLabels = {
            'completed': '✅ Përfunduar',
            'onroute': '🚗 Në rrugë',
            'assigned': '📍 Caktuar',
            'waiting': '⏳ Në pritje',
            'cancelled': '❌ Anuluar',
            'new': '🆕 E re',
            'delay': '⚠️ Vonesë'
        };

        body.innerHTML = `
            <div class="detail-section">
                <div class="detail-section-title"><i class="fa-solid fa-phone"></i> KLIENTI</div>
                <div class="detail-grid">
                    <div class="detail-item"><label>Telefoni</label><span class="mono">${result.phone}</span></div>
                    <div class="detail-item"><label>Totali i porosive</label><span>${result.stats.total}</span></div>
                    <div class="detail-item"><label>Të realizuara</label><span style="color:var(--accent-green)">${result.stats.completed}</span></div>
                    <div class="detail-item"><label>Të anuluara</label><span style="color:var(--accent-red)">${result.stats.cancelled}</span></div>
                    <div class="detail-item"><label>Të ardhura totale</label><span class="mono">€${result.stats.revenue.toFixed(2)}</span></div>
                    <div class="detail-item"><label>Mesatarja</label><span class="mono">€${result.stats.avgPrice.toFixed(2)}</span></div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title"><i class="fa-solid fa-clock-rotate-left"></i> HISTORIKU (${result.orders.length})</div>
                <div class="client-history-list">
                    ${result.orders.map(o => `
                        <div class="ch-order-item">
                            <div class="ch-order-header">
                                <span class="ch-order-date">${o.createdDateStr || ''} ${o.createdTimeStr || ''}</span>
                                <span class="ch-order-status">${statusLabels[o.status] || o.status}</span>
                            </div>
                            <div class="ch-order-body">
                                <div><i class="fa-solid fa-location-dot"></i> ${o.pickup || '—'}</div>
                                ${o.destination && o.destination !== 'N/A' ? `<div><i class="fa-solid fa-flag-checkered"></i> ${o.destination}</div>` : ''}
                                ${o.driverName ? `<div><i class="fa-solid fa-car"></i> ${o.vehicleNum || ''} ${o.driverName}</div>` : ''}
                                ${o.price ? `<div><i class="fa-solid fa-money-bill"></i> €${o.price.toFixed(2)}</div>` : ''}
                                ${o.remark ? `<div><i class="fa-solid fa-note-sticky"></i> ${o.remark}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.getElementById('modal-order-detail')?.classList.add('active');
    }

    return {
        searchByPhone,
        renderPanel,
        showFullHistory
    };
})();

console.log('✅ clients.js ngarkuar');

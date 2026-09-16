'use strict';

/**
 * zones-ui.js — UI për Zonat + Lirimet
 */

window.TaxiZonesUI = (() => {
    let refreshInterval = null;

    // ═══ INIT ═══
    function init() {
        startAutoRefresh();
        console.log('🗺️ Zones UI gati');
    }

    // ═══ RENDER FAQJA ═══
    async function renderPage() {
        const el = document.querySelector('.page[data-page="zones"]');
        if (!el) return;

        el.innerHTML = `
            <div class="page-header">
                <div class="page-title">
                    <i class="fa-solid fa-map-location-dot"></i>
                    <div>
                        <h2>Zonat & Lirimet</h2>
                        <p>Zonat e shërbimit dhe lirimet live të shoferëve</p>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-map-location-dot"></i>
                        <h3>Zonat</h3>
                    </div>
                    <div class="db-panel-body" id="zones-list">
                        <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                </div>

                <div class="db-panel">
                    <div class="db-panel-header">
                        <i class="fa-solid fa-clock"></i>
                        <h3>Lirimet Live</h3>
                    </div>
                    <div class="db-panel-body" id="releases-list">
                        <div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i></div>
                    </div>
                </div>
            </div>
        `;

        renderZones();
        await renderReleases();
    }

    // ═══ RENDER ZONAT ═══
    function renderZones() {
        const el = document.getElementById('zones-list');
        if (!el) return;

        const zones = window.TaxiData?.zones || [];
        if (!zones.length) {
            el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>Nuk ka zona</p></div>';
            return;
        }

        el.innerHTML = zones.map(z => {
            const driversInZone = (window.AppState?.drivers || []).filter(d => {
                if (!z.polygon || !window.TaxiGeocoding) return false;
                return window.TaxiGeocoding.isPointInPolygon([d.lat, d.lng], z.polygon);
            });
            const freeCount = driversInZone.filter(d => d.mode === 'free').length;
            const busyCount = driversInZone.filter(d => d.mode === 'taximeter' || d.mode === 'fixed').length;

            return `
                <div class="info-card" style="border-left:3px solid ${z.color};margin-bottom:8px;">
                    <div class="info-card-header">
                        <div class="info-card-avatar" style="background:${z.color};">📍</div>
                        <div>
                            <div class="info-card-name">${z.name}</div>
                            <div class="info-card-sub">Tarifa: €${z.tariff.toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="info-card-body">
                        <div class="info-card-row">
                            <span><i class="fa-solid fa-circle" style="color:#22c55e;font-size:8px;"></i> Të lirë</span>
                            <span style="color:#22c55e;font-weight:800;">${freeCount}</span>
                        </div>
                        <div class="info-card-row">
                            <span><i class="fa-solid fa-circle" style="color:#3b82f6;font-size:8px;"></i> Në udhëtim</span>
                            <span style="color:#3b82f6;font-weight:800;">${busyCount}</span>
                        </div>
                        <div class="info-card-row">
                            <span><i class="fa-solid fa-car"></i> Total</span>
                            <span>${driversInZone.length}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ═══ RENDER LIRIMET ═══
    async function renderReleases() {
        const el = document.getElementById('releases-list');
        if (!el) return;

        try {
            const releases = await window.TaxiReleases?.getLive() || [];

            if (!releases.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-car"></i><p>Nuk ka lirime në vazhdim</p></div>';
                return;
            }

            // Grupim sipas zonës
            const grouped = await window.TaxiReleases?.byZone() || [];

            if (!grouped.length) {
                el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-car"></i><p>Nuk ka lirime</p></div>';
                return;
            }

            el.innerHTML = grouped.map(g => `
                <div style="padding:12px;background:var(--bg-tertiary);border-radius:10px;margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <strong style="color:var(--text-primary);">📍 ${g.zone || 'N/A'}</strong>
                        <span class="admin-badge green">${g.count} vetura</span>
                    </div>
                    ${g.drivers.map(d => `
                        <div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;color:var(--text-secondary);">
                            <span>🚗 ${d.name}</span>
                            <span style="font-family:var(--font-mono);color:var(--accent-yellow);">${d.freeIn}min</span>
                        </div>
                    `).join('')}
                </div>
            `).join('');

        } catch (e) {
            console.error('❌ renderReleases:', e);
            el.innerHTML = '<div class="empty-state"><p>Gabim gjatë ngarkimit</p></div>';
        }
    }

    // ═══ AUTO-REFRESH ═══
    function startAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            if (window.AppState?.currentPage === 'zones') {
                renderZones();
                renderReleases();
            }
        }, 30000);
    }

    function stop() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    return { init, renderPage, stop };
})();

console.log('✅ zones-ui.js ngarkuar');

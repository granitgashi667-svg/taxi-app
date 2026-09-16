'use strict';

/**
 * js/driver/navigation.js — Navigimi + ETA për shoferin
 */

window.DriverNavigation = (() => {
    let currentRoute = null;
    let etaInterval = null;
    let currentOrder = null;

    // ═══ INIT ═══
    function init() {
        console.log('🗺️ DriverNavigation: Init...');
        startEtaRefresh();
    }

    // ═══ NAVIGO NË GOOGLE MAPS ═══
    function navigateTo(lat, lng, label = '') {
        if (!lat || !lng) {
            showToast('error', 'Gabim', 'Koordinatat mungojnë');
            return;
        }

        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        console.log('🗺️ Duke hapur Google Maps:', url);

        window.open(url, '_blank');

        if (window.TaxiAuditLog) {
            window.TaxiAuditLog.log('driver_navigate', { lat, lng, label });
        }
    }

    // ═══ NAVIGO NË ADRESË (me emër) ═══
    function navigateToAddress(addressName) {
        // Kërko në databazën lokale
        const addr = window.TaxiData?.addresses?.find(a =>
            a.name.toLowerCase() === addressName.toLowerCase() ||
            a.alias?.some(al => addressName.toLowerCase().includes(al.toLowerCase()))
        );

        if (addr) {
            navigateTo(addr.lat, addr.lng, addr.name);
        } else {
            // Fallback me adresë tekstuale
            const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressName)}&travelmode=driving`;
            window.open(url, '_blank');
        }
    }

    // ═══ HAP WAZE ═══
    function openWaze(lat, lng) {
        if (!lat || !lng) return;
        window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
    }

    // ═══ LLOGARIT ETA ═══
    async function calculateEta(fromLat, fromLng, toLat, toLng) {
        if (!window.TaxiMaps) {
            console.warn('⚠️ TaxiMaps nuk është gati');
            return null;
        }

        try {
            const route = await window.TaxiMaps.calculateRoute(fromLat, fromLng, toLat, toLng);
            if (!route) return null;

            return {
                minutes: Math.ceil(route.durationWithTraffic),
                distance: route.distance.toFixed(1),
                hasTraffic: route.hasTraffic,
                trafficDelay: route.trafficDelay || 0,
                provider: route.provider
            };
        } catch (e) {
            console.error('❌ calculateEta:', e);
            return null;
        }
    }

    // ═══ ETA PËR POROSINË AKTIVE ═══
    async function getEtaToOrder(order) {
        if (!order || !order.pickup) return null;

        // Merr pozicionin aktual të shoferit
        const pos = await getCurrentPosition();
        if (!pos) return null;

        // Gjej koordinatat e pikës së marrjes
        const pickupAddr = window.TaxiData?.addresses?.find(a => a.name === order.pickup);
        if (!pickupAddr) return null;

        return await calculateEta(pos.lat, pos.lng, pickupAddr.lat, pickupAddr.lng);
    }

    // ═══ MERR POZICIONIN AKTUAL ═══
    function getCurrentPosition() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    });
                },
                (err) => {
                    console.warn('GPS error:', err);
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
            );
        });
    }

    // ═══ RIFRESKO ETA ÇDO 30 SEK ═══
    function startEtaRefresh() {
        if (etaInterval) clearInterval(etaInterval);

        etaInterval = setInterval(async () => {
            // Kontrollo nëse ka porosi aktive
            if (!window.DriverApp?.currentOrder) return;

            const order = window.DriverApp.currentOrder;
            const eta = await getEtaToOrder(order);

            if (eta) {
                updateEtaUI(eta);
            }
        }, 30000); // Çdo 30 sek

        console.log('⏱️ ETA refresh aktivizuar (çdo 30s)');
    }

    // ═══ UPDATE ETA NË UI ═══
    function updateEtaUI(eta) {
        // Gjej ose krijo elementin ETA
        let etaEl = document.getElementById('ao-eta');
        if (!etaEl) {
            // Krijo elementin pas header-it të porosisë aktive
            const aoHeader = document.querySelector('.ao-header');
            if (!aoHeader) return;

            etaEl = document.createElement('div');
            etaEl.id = 'ao-eta';
            etaEl.className = 'ao-eta';
            aoHeader.parentNode.insertBefore(etaEl, aoHeader.nextSibling);
        }

        const trafficIcon = eta.hasTraffic
            ? (eta.trafficDelay > 120 ? '🔴' : eta.trafficDelay > 60 ? '🟡' : '🟢')
            : '⚪';

        etaEl.innerHTML = `
            <div class="eta-content">
                <i class="fa-solid fa-clock"></i>
                <div>
                    <div class="eta-label">ETA për klientin</div>
                    <div class="eta-value">${trafficIcon} ${eta.minutes}min · ${eta.distance}km</div>
                </div>
            </div>
        `;
    }

    // ═══ HAP HARTA ME DY PIKA ═══
    function openRoute(fromLat, fromLng, toLat, toLng) {
        const url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
        window.open(url, '_blank');
    }

    // ═══ AUTO-SHTO ETA KUR PRANOHET POROSIA ═══
    function setupAutoEta() {
        if (window.TaxiEvents) {
            window.TaxiEvents.on('order:assigned', () => {
                setTimeout(async () => {
                    if (window.DriverApp?.currentOrder) {
                        const eta = await getEtaToOrder(window.DriverApp.currentOrder);
                        if (eta) updateEtaUI(eta);
                    }
                }, 1000);
            });
        }
    }

    // ═══ NDAJ ═══
    function stop() {
        if (etaInterval) {
            clearInterval(etaInterval);
            etaInterval = null;
        }
    }

    // ═══ INIT ═══
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            init();
            setupAutoEta();
        }, 2500);
    });

    return {
        init, stop,
        navigateTo, navigateToAddress, openWaze, openRoute,
        calculateEta, getEtaToOrder, getCurrentPosition,
        updateEtaUI
    };
})();

console.log('✅ driver/navigation.js ngarkuar');

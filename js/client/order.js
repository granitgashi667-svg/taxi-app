'use strict';

/**
 * js/client/order.js — Krijimi i porosisë nga klienti
 */

window.ClientOrder = (() => {
    let pickupCoords = null;
    let destinationCoords = null;
    let currentDispatchMode = 'auto';
    let activeOrderId = null;

    // ═══ INIT ═══
    function init() {
        console.log('📝 ClientOrder: Init...');

        // Autocomplete
        setupAutocomplete('pickup-input', 'pickup-suggestions', 'pickup');
        setupAutocomplete('destination-input', 'destination-suggestions', 'destination');

        // Butoni porosit
        document.getElementById('btn-order-taxi')?.addEventListener('click', submitOrder);

        // Llogarit ETA + çmim kur ndryshon destinacioni
        document.getElementById('destination-input')?.addEventListener('change', updateEstimates);
        document.getElementById('destination-input')?.addEventListener('blur', updateEstimates);

        console.log('✅ ClientOrder gati');
    }

    // ═══ AUTOCOMPLETE ═══
    function setupAutocomplete(inputId, suggestId, type) {
        const input = document.getElementById(inputId);
        const sug = document.getElementById(suggestId);
        if (!input || !sug) return;

        input.addEventListener('input', (e) => {
            const q = e.target.value.trim();
            if (q.length < 2) {
                sug.classList.remove('active');
                return;
            }

            const results = window.TaxiData?.searchAddresses(q) || [];
            if (!results.length) {
                sug.classList.remove('active');
                return;
            }

            sug.innerHTML = results.map(a => {
                const cat = window.TaxiData.addressCategories[a.category] || { icon: 'fa-location-dot', label: a.category };
                return `<div class="autocomplete-item" data-address="${a.name}" data-lat="${a.lat}" data-lng="${a.lng}">
                    <i class="fa-solid ${cat.icon}"></i>
                    <div>
                        <div style="font-weight:600;">${a.name}</div>
                        <div style="font-size:10px;color:#8b7aa8;">${cat.label}</div>
                    </div>
                </div>`;
            }).join('');

            sug.classList.add('active');

            sug.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    input.value = item.dataset.address;
                    const lat = parseFloat(item.dataset.lat);
                    const lng = parseFloat(item.dataset.lng);

                    if (type === 'pickup') {
                        pickupCoords = { lat, lng };
                    } else {
                        destinationCoords = { lat, lng };
                    }

                    sug.classList.remove('active');
                    updateEstimates();
                });
            });
        });

        // Fshih kur kliko jashtë
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !sug.contains(e.target)) {
                sug.classList.remove('active');
            }
        });
    }

    // ═══ VENDOS KOORDINATAT E PICKUP ═══
    function setPickupCoords(lat, lng) {
        pickupCoords = { lat, lng };
        updateEstimates();
    }

    // ═══ LLOGARIT ETA + ÇMIMIN ═══
    async function updateEstimates() {
        const etaEl = document.getElementById('eta-estimate');
        const priceEl = document.getElementById('price-estimate');

        if (!pickupCoords || !destinationCoords) {
            if (etaEl) etaEl.textContent = 'Zgjidh nga + destinacionin';
            if (priceEl) priceEl.textContent = '€—';
            return;
        }

        if (etaEl) etaEl.textContent = 'Duke llogaritur...';
        if (priceEl) priceEl.textContent = '€...';

        try {
            // Llogarit distancën
            let distance = 0;
            let duration = 0;

            if (window.TaxiMaps?.calculateRoute) {
                const route = await window.TaxiMaps.calculateRoute(
                    pickupCoords.lat, pickupCoords.lng,
                    destinationCoords.lat, destinationCoords.lng
                );
                if (route) {
                    distance = route.distance;
                    duration = route.durationWithTraffic || route.duration;
                }
            } else {
                // Fallback: llogarit direkt
                distance = window.TaxiUtils?.distanceKm(
                    pickupCoords.lat, pickupCoords.lng,
                    destinationCoords.lat, destinationCoords.lng
                ) || 0;
                duration = distance * 2; // vlerësim 30 km/h
            }

            // Çmimi
            let price = 0;
            if (window.TaxiPricing?.calculate) {
                const calc = window.TaxiPricing.calculate('standard', distance, duration);
                price = calc.total;
            } else {
                // Fallback
                price = Math.max(3, 2 + distance * 0.8);
            }

            if (etaEl) etaEl.textContent = `${Math.ceil(duration)} minuta · ${distance.toFixed(1)} km`;
            if (priceEl) priceEl.textContent = `€${price.toFixed(2)}`;

        } catch (e) {
            console.error('Estimate error:', e);
            if (etaEl) etaEl.textContent = 'Gabim';
            if (priceEl) priceEl.textContent = '€—';
        }
    }

    // ═══ KRIJO POROSINË ═══
    async function submitOrder() {
        const pickupInput = document.getElementById('pickup-input');
        const destinationInput = document.getElementById('destination-input');

        const pickup = pickupInput?.value.trim();
        const destination = destinationInput?.value.trim();

        // Validim
        if (!pickup) {
            showToast('error', 'Gabim', 'Shkruaj ku jeni');
            pickupInput?.focus();
            return;
        }

        if (!destination) {
            showToast('error', 'Gabim', 'Shkruaj destinacionin');
            destinationInput?.focus();
            return;
        }

        if (!window.ClientApp?.currentClient) {
            showToast('error', 'Gabim', 'Nuk je i loguar');
            return;
        }

        const client = window.ClientApp.currentClient;

        // Merr koordinatat (nga DB nëse s'kemi)
        if (!pickupCoords) {
            const addr = window.TaxiData?.addresses?.find(a => a.name === pickup);
            if (addr) pickupCoords = { lat: addr.lat, lng: addr.lng };
        }

        if (!destinationCoords) {
            const addr = window.TaxiData?.addresses?.find(a => a.name === destination);
            if (addr) destinationCoords = { lat: addr.lat, lng: addr.lng };
        }

        try {
            const btn = document.getElementById('btn-order-taxi');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>DUKE DËRGUAR...</span>';

            const db = window.TaxiFirebase?.db;
            if (!db) throw new Error('Firebase nuk është gati');

            // Krijo porosinë
            const order = {
                // Klient
                phone: client.phone,
                name: client.name,
                clientId: client.id,
                source: 'mobile_app',

                // Rrugëtimi
                pickup: pickup,
                destination: destination,
                pickupLat: pickupCoords?.lat || null,
                pickupLng: pickupCoords?.lng || null,
                destinationLat: destinationCoords?.lat || null,
                destinationLng: destinationCoords?.lng || null,

                // Statusi
                status: 'waiting',
                tariff: 'standard',
                zone: 'auto',
                remark: '',

                // Caktimi
                driverId: null,
                driverName: null,
                vehicleNum: null,
                vehicleId: null,
                dispatchMode: 'auto',

                // Kohët
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdAtLocal: Date.now(),
                createdTimeStr: new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
                createdDateStr: new Date().toLocaleDateString('sq-AL'),

                // Meta
                operatorId: null,
                operatorName: null,
                price: 0,
                version: 1
            };

            const ref = await db.collection('orders').add(order);
            activeOrderId = ref.id;

            console.log('✅ Porosia u krijua:', ref.id);

            // Njofto
            showToast('success', '✅ Porosia u dërgua', 'Duke kërkuar shofer...');
            if (window.TaxiSound) window.TaxiSound.playSuccess();

            // Pastro input
            pickupInput.value = '';
            destinationInput.value = '';
            pickupCoords = null;
            destinationCoords = null;

            // Kalon në tracking
            if (window.ClientTracking) {
                window.ClientTracking.startTracking(ref.id, {
                    pickup,
                    destination
                });
            }

            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('client_created_order', {
                    orderId: ref.id,
                    phone: client.phone,
                    pickup,
                    destination
                });
            }

        } catch (e) {
            console.error('❌ submitOrder:', e);
            showToast('error', 'Gabim', 'Porosia nuk mund të dërgohet');
        } finally {
            const btn = document.getElementById('btn-order-taxi');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-taxi"></i><span>POROSIT TAXI</span>';
            }
        }
    }

    // ═══ NDIHMA ═══
    function showToast(type, title, msg) {
        if (window.ClientApp?.showToast) {
            window.ClientApp.showToast(type, title, msg);
        }
    }

    return {
        init,
        setPickupCoords,
        submitOrder,
        updateEstimates,
        get activeOrderId() { return activeOrderId; }
    };
})();

console.log('✅ client/order.js ngarkuar');

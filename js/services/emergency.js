'use strict';

/**
 * emergency.js — Sistemi i emergjencës (SOS)
 */

window.TaxiEmergency = (() => {
    const COLLECTION = 'emergencies';
    let activeAlerts = [];

    function db() { return window.TaxiFirebase?.db || null; }

    // ═══ SOS NGA SHOFERI ═══
    async function driverSOS(driverId, driverName, location, reason = 'SOS') {
        const database = db();
        if (!database) return null;

        try {
            const alert = {
                type: 'driver_sos',
                driverId,
                driverName,
                lat: location?.lat || null,
                lng: location?.lng || null,
                reason,
                status: 'active',
                priority: 'critical',
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL')
            };

            const ref = await database.collection(COLLECTION).add(alert);
            console.log('🚨 SOS u aktivizua:', ref.id);

            // Play alarm
            if (window.TaxiSound) {
                window.TaxiSound.playError();
                setTimeout(() => window.TaxiSound.playError(), 500);
                setTimeout(() => window.TaxiSound.playError(), 1000);
            }

            // Njofto operatorët
            notifyOperators(alert);

            // Njofto policinë (nëse ka konfigurim)
            notifyPolice(alert);

            return { id: ref.id, ...alert };

        } catch (e) {
            console.error('❌ driverSOS:', e);
            return null;
        }
    }

    // ═══ SOS NGA KLIENTI ═══
    async function clientSOS(orderId, clientId, clientName, location, reason = 'SOS') {
        const database = db();
        if (!database) return null;

        try {
            const alert = {
                type: 'client_sos',
                orderId,
                clientId,
                clientName,
                lat: location?.lat || null,
                lng: location?.lng || null,
                reason,
                status: 'active',
                priority: 'critical',
                createdAt: Date.now(),
                createdAtStr: new Date().toLocaleString('sq-AL')
            };

            const ref = await database.collection(COLLECTION).add(alert);

            if (window.TaxiSound) {
                window.TaxiSound.playError();
            }

            notifyOperators(alert);

            return { id: ref.id, ...alert };

        } catch (e) {
            console.error('❌ clientSOS:', e);
            return null;
        }
    }

    // ═══ NJOFTO OPERATORËT ═══
    function notifyOperators(alert) {
        if (typeof window.showToast === 'function') {
            const who = alert.type === 'driver_sos'
                ? `🚗 Shoferi ${alert.driverName}`
                : `👤 Klienti ${alert.clientName}`;
            window.showToast('error', '🚨 SOS EMERGJENCË', `${who} ka aktivizuar SOS!`);
        }

        // Shfaq modal
        showSOSModal(alert);

        // Njofto me vibrim (mobile)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // ═══ NJOFTO POLICINË ═══
    async function notifyPolice(alert) {
        // Nëse ka numër policie të konfiguruar
        const policeNumber = window.TaxiStorage?.get('taxi.police_number');
        if (!policeNumber) return;

        console.log('🚔 Njofto policinë:', policeNumber);
        // Logjika për të dërguar SMS policisë
    }

    // ═══ SHFAQ MODAL SOS ═══
    function showSOSModal(alert) {
        const existing = document.getElementById('modal-sos-alert');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-sos-alert';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal" style="border:2px solid var(--accent-red);box-shadow:0 0 60px rgba(244,63,94,.6);max-width:500px;">
                <div class="modal-header" style="background:linear-gradient(135deg,#f43f5e,#be123c);border-bottom:none;">
                    <div class="modal-title" style="color:white;">
                        <i class="fa-solid fa-triangle-exclamation" style="background:rgba(255,255,255,.2);color:white;"></i>
                        <h3>🚨 SOS EMERGJENCË</h3>
                    </div>
                </div>
                <div class="modal-body" style="text-align:center;">
                    <div style="padding:24px 0;">
                        <div style="font-size:60px;color:var(--accent-red);margin-bottom:12px;">🚨</div>
                        <h2 style="font-size:18px;font-weight:800;color:var(--accent-red);margin-bottom:8px;">
                            ${alert.type === 'driver_sos' ? 'SHOFERI' : 'KLIENTI'} KA AKTIVIZUAR SOS
                        </h2>
                        <p style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:16px;">
                            ${alert.driverName || alert.clientName || 'I panjohur'}
                        </p>

                        ${alert.lat ? `
                            <div style="padding:12px;background:var(--bg-tertiary);border-radius:10px;font-family:monospace;font-size:12px;margin-bottom:16px;">
                                📍 ${alert.lat.toFixed(5)}, ${alert.lng.toFixed(5)}
                            </div>
                        ` : ''}

                        <div style="padding:12px;background:rgba(244,63,94,.1);border-radius:10px;font-size:12px;color:var(--text-secondary);margin-bottom:16px;">
                            ${alert.reason || 'Emergjencë'}
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <button class="btn-primary" style="background:linear-gradient(135deg,#22c55e,#16a34a);" onclick="TaxiEmergency.markResponded('${alert.id}')">
                            <i class="fa-solid fa-check"></i> U PËRGJIGJ
                        </button>
                        <button class="btn-primary" style="background:linear-gradient(135deg,#f43f5e,#be123c);" onclick="TaxiEmergency.openMap('${alert.lat}', '${alert.lng}')">
                            <i class="fa-solid fa-map"></i> SHIKO HARTË
                        </button>
                    </div>
                </div>
                <div class="modal-footer" style="justify-content:center;">
                    <button class="btn-ghost" onclick="document.getElementById('modal-sos-alert').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ SHËNO SI PËRGJIGJUR ═══
    async function markResponded(alertId) {
        const database = db();
        if (!database) return;

        try {
            await database.collection(COLLECTION).doc(alertId).update({
                status: 'responded',
                respondedAt: Date.now(),
                respondedBy: window.TaxiAuth?.currentUser()?.uid || null,
                respondedByName: window.TaxiState?.get('currentOperator')?.name || 'Operator'
            });

            document.getElementById('modal-sos-alert')?.remove();
            if (typeof window.showToast === 'function') {
                window.showToast('success', '✅ SOS u trajtua', '');
            }
        } catch (e) {
            console.error('❌ markResponded:', e);
        }
    }

    // ═══ HAP HARTË ═══
    function openMap(lat, lng) {
        if (!lat || !lng) return;
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }

    // ═══ DËGJO SOS LIVE ═══
    function listenActiveAlerts() {
        const database = db();
        if (!database) return;

        database.collection(COLLECTION)
            .where('status', '==', 'active')
            .onSnapshot((snap) => {
                activeAlerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        notifyOperators({ id: change.doc.id, ...change.doc.data() });
                    }
                });
            }, (err) => console.warn('SOS listen:', err));
    }

    function init() {
        listenActiveAlerts();
        console.log('✅ Emergency aktivizuar');
    }

    return {
        init,
        driverSOS, clientSOS,
        markResponded, openMap,
        listenActiveAlerts,
        get alerts() { return activeAlerts; }
    };
})();

console.log('✅ emergency.js ngarkuar');

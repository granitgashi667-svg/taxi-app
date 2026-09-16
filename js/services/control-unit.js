'use strict';

/**
 * control-unit.js — Kontrolli i veturave + broadcast
 */

window.TaxiControlUnit = (() => {

    // ═══ PAUZË ═══
    async function pauseVehicle(driverId, reason = '') {
        if (window.TaxiDrivers) await window.TaxiDrivers.setPause(driverId, true);
        logControl(driverId, 'pause', reason);
        if (window.TaxiAuditLog) window.TaxiAuditLog.log('driver_paused', { driverId, reason });
        if (typeof showToast === 'function') showToast('warning', '⏸️ Pauzë', `Vetura ${driverId} u vendos në pauzë`);
    }

    async function activateVehicle(driverId) {
        if (window.TaxiDrivers) await window.TaxiDrivers.setPause(driverId, false);
        logControl(driverId, 'activate');
        if (typeof showToast === 'function') showToast('success', '✅ Aktive', `Vetura ${driverId} u aktivizua`);
    }

    // ═══ SHKYÇ SHOFRIN ═══
    async function kickDriver(driverId, reason = '') {
        if (window.TaxiDrivers) await window.TaxiDrivers.setMode(driverId, 'inactive');
        logControl(driverId, 'kick', reason);
        if (window.TaxiAuditLog) window.TaxiAuditLog.log('driver_kicked', { driverId, reason });
        if (typeof showToast === 'function') showToast('info', '🚪 Shkyç', `Shoferi i veturës ${driverId} u shkyç`);
    }

    // ═══ BLLOKO SHOFRIN ═══
    async function blockDriver(driverId, reason = '') {
        if (window.TaxiDrivers) await window.TaxiDrivers.setActive(driverId, false);
        logControl(driverId, 'block', reason);
        if (window.TaxiAuditLog) window.TaxiAuditLog.log('driver_blocked', { driverId, reason });
        if (typeof showToast === 'function') showToast('error', '🚫 Bllokuar', `Shoferi i veturës ${driverId} u bllokua`);
    }

    // ═══ LEJO LOGIN TË RE ═══
    async function allowNewLogin(driverId) {
        logControl(driverId, 'allow_new_login');
        if (typeof showToast === 'function') showToast('success', '🔓 Login', `Login i re u lejua për veturën ${driverId}`);
    }

    // ═══ DËRGO MESAZH ═══
    async function sendMessage(driverId, text) {
        if (!text || !text.trim()) return;
        if (window.TaxiMessages) {
            await window.TaxiMessages.send(driverId, '', text, 'custom');
        }
        logControl(driverId, 'send_message', { text });
        if (typeof showToast === 'function') showToast('success', '💬 Dërguar', 'Mesazhi u dërgua');
    }

    // ═══ BROADCAST TË GJITHËVE ═══
    async function broadcast(message, type = 'broadcast') {
        if (!message || !message.trim()) return;
        if (window.TaxiMessages) {
            await window.TaxiMessages.sendToAll(message, type);
        }
        logControl(null, 'broadcast', { message });
        if (window.TaxiAuditLog) window.TaxiAuditLog.log('broadcast_sent', { message });
        if (typeof showToast === 'function') showToast('success', '📢 Broadcast', `Mesazhi u dërgua te të gjithë shoferët`);
    }

    // ═══ REGJISTRO ═══
    async function logControl(driverId, action, reason = '') {
        const database = window.TaxiFirebase?.db;
        if (!database) return;
        try {
            await database.collection('control_log').add({
                driverId,
                action,
                reason,
                operatorId: window.TaxiAuth?.currentUser()?.uid || null,
                operatorName: window.TaxiState?.get('currentOperator')?.name || 'Operator',
                at: new Date().getTime(),
                atStr: new Date().toLocaleString('sq-AL')
            });
        } catch (e) { /* silent */ }
    }

    // ═══ MODAL KONTROLLI PËR NJË VETURË ═══
    function openControlModal(driverId) {
        const driver = AppState?.drivers?.find(d => d.id === driverId);
        if (!driver) return;

        const vehicle = AppState?.vehicles?.find(v => v.id === driver.vehicleId);
        const num = String(driver.vehicleId).padStart(2, '0');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-control-unit';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title"><i class="fa-solid fa-sliders"></i><h3>Kontrolli — Veturë ${num}</h3></div>
                    <button class="modal-close" onclick="document.getElementById('modal-control-unit').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-tertiary);border-radius:10px;margin-bottom:16px;">
                        <div class="info-card-avatar ${driver.mode}">${driver.avatar || driver.name?.slice(0,2).toUpperCase()}</div>
                        <div>
                            <div style="font-weight:700;font-size:13px;">${driver.name}</div>
                            <div style="font-size:11px;color:var(--text-muted);">${vehicle ? vehicle.plate : ''} · ${vehicle ? vehicle.model : ''}</div>
                        </div>
                    </div>

                    <div class="detail-section-title"><i class="fa-solid fa-comment"></i> MESAZHE TË SHPEJTA</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
                        <button class="action-btn auto" onclick="TaxiControlUnit.quickMsg('${driverId}', 'A mundesh me lajmru')">📞 A mundesh me lajmru</button>
                        <button class="action-btn manual" onclick="TaxiControlUnit.quickMsg('${driverId}', 'Kërkesë për pauzë')">☕ Kërkesë pauzë</button>
                        <button class="action-btn closest" onclick="TaxiControlUnit.quickMsg('${driverId}', 'Në punë jam')">✅ Në punë jam</button>
                        <button class="action-btn auto" onclick="TaxiControlUnit.quickMsg('${driverId}', 'Jasht veture')">🚗 Jasht veture</button>
                        <button class="action-btn manual" onclick="TaxiControlUnit.quickMsg('${driverId}', 'Duke pritur')">⏸️ Duke pritur</button>
                        <button class="action-btn cancel" onclick="TaxiControlUnit.quickMsg('${driverId}', 'Shko në bazë')">🏠 Shko në bazë</button>
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-pen"></i> Mesazh i lirë</label>
                        <input type="text" id="cu-custom-msg" class="input-field" placeholder="Shkruaj mesazhin...">
                        <button class="btn-primary" style="margin-top:8px;width:100%;" onclick="TaxiControlUnit.sendCustom('${driverId}')">
                            <i class="fa-solid fa-paper-plane"></i> Dërgo
                        </button>
                    </div>

                    <div class="detail-section-title" style="margin-top:16px;"><i class="fa-solid fa-gauge"></i> KONTROLLI</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <button class="btn-warning" onclick="TaxiControlUnit.pauseVehicle('${driverId}'); document.getElementById('modal-control-unit').remove();">⏸️ Pauzë</button>
                        <button class="btn-success" onclick="TaxiControlUnit.activateVehicle('${driverId}'); document.getElementById('modal-control-unit').remove();">▶️ Aktivizo</button>
                        <button class="btn-danger" onclick="if(confirm('Shkyç shoferin?')) { TaxiControlUnit.kickDriver('${driverId}'); document.getElementById('modal-control-unit').remove(); }">🚪 Shkyç</button>
                        <button class="btn-danger" onclick="if(confirm('Blloko shoferin?')) { TaxiControlUnit.blockDriver('${driverId}'); document.getElementById('modal-control-unit').remove(); }">🚫 Blloko</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-control-unit').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function quickMsg(driverId, text) {
        await sendMessage(driverId, text);
    }

    async function sendCustom(driverId) {
        const text = document.getElementById('cu-custom-msg')?.value.trim();
        if (text) {
            await sendMessage(driverId, text);
            document.getElementById('cu-custom-msg').value = '';
        }
    }

    function init() {
        console.log('✅ Control Unit aktivizuar');
    }

    return {
        init,
        pauseVehicle, activateVehicle, kickDriver, blockDriver, allowNewLogin,
        sendMessage, broadcast,
        openControlModal, quickMsg, sendCustom
    };
})();

console.log('✅ control-unit.js ngarkuar');

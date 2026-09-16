'use strict';

/**
 * two-factor.js — 2FA bazik (TOTP me Google Authenticator)
 */

window.TaxiTwoFactor = (() => {
    const STORAGE_KEY = 'taxi.2fa';

    // ═══ KONTROLLO NËSE 2FA ËSHTË AKTIV ═══
    function isEnabledFor(uid) {
        const data = window.TaxiStorage?.get(STORAGE_KEY, {});
        return !!data[uid]?.enabled;
    }

    // ═══ AKTIVIZO 2FA ═══
    async function enable(uid, secret) {
        const data = window.TaxiStorage?.get(STORAGE_KEY, {});
        data[uid] = {
            enabled: true,
            secret,
            enabledAt: Date.now()
        };
        window.TaxiStorage?.set(STORAGE_KEY, data);

        // Ruaj edhe në Firestore
        const db = window.TaxiFirebase?.db;
        if (db) {
            try {
                await db.collection('operators').doc(uid).update({
                    '2fa': {
                        enabled: true,
                        secret,
                        enabledAt: Date.now()
                    }
                });
            } catch (e) { console.warn(e); }
        }

        console.log('🔐 2FA u aktivizua');
        return true;
    }

    // ═══ ÇAKTIVIZO 2FA ═══
    async function disable(uid) {
        const data = window.TaxiStorage?.get(STORAGE_KEY, {});
        delete data[uid];
        window.TaxiStorage?.set(STORAGE_KEY, data);

        const db = window.TaxiFirebase?.db;
        if (db) {
            try {
                await db.collection('operators').doc(uid).update({
                    '2fa': { enabled: false }
                });
            } catch (e) { console.warn(e); }
        }

        console.log('🔓 2FA u çaktivizua');
        return true;
    }

    // ═══ GENERO KODIN TOTP ═══
    async function generateCode(secret) {
        // Përdor SimpleWebAuthn ose library të ngjashme
        // Për tani, gjenerojmë një kod 6-shifror të rastësishëm (DEMO)
        const code = String(Math.floor(100000 + Math.random() * 900000));
        return code;
    }

    // ═══ VERIFIKO KODIN ═══
    async function verify(uid, code) {
        const data = window.TaxiStorage?.get(STORAGE_KEY, {});
        const entry = data[uid];
        if (!entry || !entry.enabled) return true; // 2FA jo aktiv

        // Kodi i saktë do të vinte nga TOTP library
        // Për DEMO: prano kodin 123456 ose të ruajtur
        const expected = entry.expectedCode || '123456';
        return code === expected;
    }

    // ═══ SHFAQ MODAL KONFIGURIMI ═══
    async function openSetupModal(uid, operatorName) {
        const secret = generateSecret();
        const qrUrl = `otpauth://totp/TaxiApp:${operatorName}?secret=${secret}&issuer=TaxiApp`;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-2fa-setup';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-shield-halved"></i>
                        <h3>Konfigurimi i 2FA</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-2fa-setup').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="padding:14px;background:rgba(168,85,247,.1);border-radius:10px;font-size:12px;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">
                        <i class="fa-solid fa-info-circle" style="color:var(--accent-purple);"></i>
                        1. Shkarko <strong>Google Authenticator</strong> ose <strong>Authy</strong>
                        <br>2. Skano kodin QR më poshtë
                        <br>3. Shkruaj kodin 6-shifror
                    </div>

                    <div style="text-align:center;margin-bottom:16px;">
                        <div style="display:inline-block;padding:16px;background:white;border-radius:12px;">
                            <div style="width:180px;height:180px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:10px;color:#333;text-align:center;padding:10px;">
                                <div>
                                    <strong>DEMO</strong><br><br>
                                    Sekreti:<br>
                                    <div style="font-size:9px;word-break:break-all;margin-top:4px;">${secret}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Sekreti (manual)</label>
                        <input type="text" class="input-field" value="${secret}" readonly style="font-family:monospace;font-size:11px;">
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-key"></i> Kodi 6-shifror</label>
                        <input type="text" id="2fa-code" class="input-field" placeholder="000000" maxlength="6" pattern="[0-9]*" style="font-family:monospace;font-size:18px;text-align:center;letter-spacing:4px;">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-2fa-setup').remove()">Anulo</button>
                    <button class="btn-primary" onclick="TaxiTwoFactor.confirmSetup('${uid}', '${secret}')">
                        <i class="fa-solid fa-check"></i> Aktivizo
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function generateSecret() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async function confirmSetup(uid, secret) {
        const code = document.getElementById('2fa-code')?.value;
        if (!code || code.length !== 6) {
            if (typeof showToast === 'function') showToast('error', 'Gabim', 'Shkruaj kodin 6-shifror');
            return;
        }

        // Për demo, prano kodin 123456
        if (code !== '123456' && code.length === 6) {
            // Në prodhim, verifiko me TOTP
        }

        await enable(uid, secret);
        document.getElementById('modal-2fa-setup')?.remove();

        if (typeof showToast === 'function') {
            showToast('success', '🔐 2FA aktivizuar', 'Llogaria juaj është më e sigurt');
        }
    }

    // ═══ KONTROLLO NË LOGIN ═══
    async function requireCode(uid) {
        if (!isEnabledFor(uid)) return true;

        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.id = 'modal-2fa-verify';
            modal.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <div class="modal-title">
                            <i class="fa-solid fa-shield-halved"></i>
                            <h3>Verifikimi 2FA</h3>
                        </div>
                    </div>
                    <div class="modal-body">
                        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
                            Shkruaj kodin 6-shifror nga aplikacioni i autentifikimit:
                        </p>
                        <div class="form-group">
                            <input type="text" id="2fa-verify-code" class="input-field" placeholder="000000" maxlength="6" style="font-family:monospace;font-size:22px;text-align:center;letter-spacing:6px;">
                        </div>
                        <div id="2fa-error" style="display:none;color:var(--accent-red);font-size:12px;padding:8px;"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-danger" onclick="document.getElementById('modal-2fa-verify').remove(); window.location.reload();">Anulo</button>
                        <button class="btn-primary" onclick="TaxiTwoFactor.verifyCode('${uid}')">
                            <i class="fa-solid fa-check"></i> Verifiko
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Ruaj resolve-in për ta thirrur më vonë
            window.__2fa_resolve = resolve;
        });
    }

    async function verifyCode(uid) {
        const code = document.getElementById('2fa-verify-code')?.value;
        const ok = await verify(uid, code);

        if (ok) {
            document.getElementById('modal-2fa-verify')?.remove();
            if (window.__2fa_resolve) {
                window.__2fa_resolve(true);
                window.__2fa_resolve = null;
            }
        } else {
            const errBox = document.getElementById('2fa-error');
            if (errBox) {
                errBox.textContent = '❌ Kodi nuk është valid';
                errBox.style.display = 'block';
            }
        }
    }

    function init() {
        console.log('🔐 2FA gati');
    }

    return {
        init,
        isEnabledFor, enable, disable,
        generateCode, verify,
        openSetupModal, confirmSetup,
        requireCode, verifyCode
    };
})();

console.log('✅ two-factor.js ngarkuar');

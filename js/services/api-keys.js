'use strict';

/**
 * api-keys.js — Menaxhim i API keys (HERE, Twilio, etj.)
 */

window.TaxiApiKeys = (() => {
    const STORAGE_KEY = 'taxi.api_keys';
    const COLLECTION = 'settings';

    // ═══ LOAD ═══
    function load() {
        return window.TaxiStorage?.get(STORAGE_KEY, {});
    }

    // ═══ RUAJ ═══
    function save(keys) {
        window.TaxiStorage?.set(STORAGE_KEY, keys);
        console.log('✅ API keys u ruajtën');
    }

    // ═══ MERR NJË KEY SPECIFIK ═══
    function get(keyName) {
        const keys = load();
        return keys[keyName] || null;
    }

    // ═══ SET NJË KEY ═══
    function set(keyName, value) {
        const keys = load();
        keys[keyName] = value;
        save(keys);
        return value;
    }

    // ═══ SHFAQ MODAL ═══
    function open() {
        const keys = load();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-api-keys';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-key"></i>
                        <h3>API Keys & Integrime</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-api-keys').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="padding:12px 14px;background:rgba(245,158,11,.1);border-radius:10px;font-size:12px;color:var(--text-secondary);margin-bottom:16px;border-left:3px solid var(--accent-yellow);">
                        <i class="fa-solid fa-triangle-exclamation" style="color:var(--accent-yellow);"></i>
                        <strong>Kujdes:</strong> API keys ruhen lokalisht. Për prodhim, përdorni Firebase Config.
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-map-location-dot"></i> HERE API Key (Trafik live)</label>
                        <input type="text" id="key-here" class="input-field" value="${keys.here || ''}" placeholder="Merr nga platform.here.com">
                        <small style="font-size:10px;color:var(--text-muted);">250,000 kërkesa falas në muaj</small>
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-map"></i> Google Maps API Key</label>
                        <input type="text" id="key-google-maps" class="input-field" value="${keys.googleMaps || ''}" placeholder="Merr nga console.cloud.google.com">
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-comment-sms"></i> Twilio Account SID</label>
                        <input type="text" id="key-twilio-sid" class="input-field" value="${keys.twilioSid || ''}" placeholder="ACxxxxxxxxxxxx">
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-comment-sms"></i> Twilio Auth Token</label>
                        <input type="password" id="key-twilio-token" class="input-field" value="${keys.twilioToken || ''}" placeholder="xxxxxxxx">
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-comment-sms"></i> Twilio Phone Number</label>
                        <input type="tel" id="key-twilio-phone" class="input-field" value="${keys.twilioPhone || ''}" placeholder="+1234567890">
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-envelope"></i> EmailJS Service ID</label>
                        <input type="text" id="key-emailjs-service" class="input-field" value="${keys.emailjsService || ''}" placeholder="service_xxxxx">
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-envelope"></i> EmailJS Template ID</label>
                        <input type="text" id="key-emailjs-template" class="input-field" value="${keys.emailjsTemplate || ''}" placeholder="template_xxxxx">
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-envelope"></i> EmailJS Public Key</label>
                        <input type="text" id="key-emailjs-public" class="input-field" value="${keys.emailjsPublic || ''}" placeholder="xxxxxxxxxxxx">
                    </div>

                    <div class="form-group">
                        <label><i class="fa-solid fa-shield-halved"></i> reCAPTCHA Site Key</label>
                        <input type="text" id="key-recaptcha" class="input-field" value="${keys.recaptcha || ''}" placeholder="6Lxxxxxxxxxx">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-api-keys').remove()">Anulo</button>
                    <button class="btn-primary" onclick="TaxiApiKeys.saveFromModal()">
                        <i class="fa-solid fa-save"></i> Ruaj
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ RUAJ NGA MODAL ═══
    function saveFromModal() {
        const keys = {
            here: document.getElementById('key-here')?.value.trim() || '',
            googleMaps: document.getElementById('key-google-maps')?.value.trim() || '',
            twilioSid: document.getElementById('key-twilio-sid')?.value.trim() || '',
            twilioToken: document.getElementById('key-twilio-token')?.value.trim() || '',
            twilioPhone: document.getElementById('key-twilio-phone')?.value.trim() || '',
            emailjsService: document.getElementById('key-emailjs-service')?.value.trim() || '',
            emailjsTemplate: document.getElementById('key-emailjs-template')?.value.trim() || '',
            emailjsPublic: document.getElementById('key-emailjs-public')?.value.trim() || '',
            recaptcha: document.getElementById('key-recaptcha')?.value.trim() || ''
        };

        save(keys);

        // Aktivizo HERE në maps
        if (keys.here && window.TaxiMaps) {
            window.TaxiMaps.setHereKey(keys.here);
        }

        document.getElementById('modal-api-keys').remove();
        if (typeof showToast === 'function') {
            showToast('success', '✅ U ruajt', 'API keys u ruajtën me sukses');
        }
    }

    // ═══ STATUS ═══
    function getStatus() {
        const keys = load();
        return {
            here: !!keys.here,
            googleMaps: !!keys.googleMaps,
            twilio: !!(keys.twilioSid && keys.twilioToken),
            emailjs: !!(keys.emailjsService && keys.emailjsTemplate),
            recaptcha: !!keys.recaptcha
        };
    }

    // ═══ INIT ═══
    function init() {
        const keys = load();

        // Aktivizo HERE nëse ekziston
        if (keys.here && window.TaxiMaps) {
            window.TaxiMaps.setHereKey(keys.here);
        }

        const status = getStatus();
        console.log('🔑 API Keys status:', status);
    }

    return { load, save, get, set, open, saveFromModal, getStatus, init };
})();

console.log('✅ api-keys.js ngarkuar');

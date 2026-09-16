'use strict';

/**
 * qr-generator.js — Gjenerim i QR kodit për referime dhe pagesa
 */

window.TaxiQR = (() => {

    // ═══ GJENERO QR URL ═══
    function generateQRUrl(text, size = 200) {
        // Përdor API falas për QR
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
    }

    // ═══ SHFAQ QR MODAL ═══
    function showQRModal(title, text, subtitle = '') {
        const existing = document.getElementById('modal-qr');
        if (existing) existing.remove();

        const qrUrl = generateQRUrl(text, 300);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-qr';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-qrcode"></i>
                        <h3>${title}</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-qr').remove()">&times;</button>
                </div>
                <div class="modal-body" style="text-align:center;">
                    ${subtitle ? `<p style="color:var(--text-muted);font-size:12px;margin-bottom:16px;">${subtitle}</p>` : ''}
                    <div style="display:inline-block;padding:16px;background:white;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.4);">
                        <img src="${qrUrl}" alt="QR Code" style="display:block;width:300px;height:300px;">
                    </div>
                    <div style="margin-top:16px;padding:12px;background:var(--bg-tertiary);border-radius:10px;font-family:monospace;font-size:11px;word-break:break-all;color:var(--text-secondary);">
                        ${text}
                    </div>
                    <button class="btn-primary" style="margin-top:16px;width:100%;" onclick="TaxiQR.downloadQR('${qrUrl}', '${title}')">
                        <i class="fa-solid fa-download"></i> Shkarko QR
                    </button>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-qr').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ SHKARKO QR ═══
    async function downloadQR(url, name) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `qr-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(blobUrl);
            if (typeof showToast === 'function') {
                showToast('success', '📥 U shkarkua', 'QR u ruajt');
            }
        } catch (e) {
            console.error('❌ downloadQR:', e);
        }
    }

    // ═══ KRIJO QR PËR REFERIM ═══
    function showReferralQR(userId) {
        const link = `https://taxiapp-xxxx.web.app/ref/${userId}`;
        showQRModal('Fto mikun', link, 'Kur miku regjistrohet, ju merrni bonus');
    }

    // ═══ KRIJO QR PËR PAGESË ═══
    function showPaymentQR(amount, orderId) {
        const text = `PAY:${orderId}:${amount}`;
        showQRModal(`Pagesë €${amount.toFixed(2)}`, text, 'Klienti skanon për të paguar');
    }

    // ═══ KRIJO QR PËR VETURË ═══
    function showVehicleQR(vehicleId, plate) {
        const text = `VEHICLE:${vehicleId}:${plate}`;
        showQRModal(`Veturë ${plate}`, text, 'Skano për të hyrë në app');
    }

    return {
        generateQRUrl, showQRModal, downloadQR,
        showReferralQR, showPaymentQR, showVehicleQR
    };
})();

console.log('✅ qr-generator.js ngarkuar');

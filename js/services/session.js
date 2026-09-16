'use strict';

/**
 * session.js — Sesioni + Auto-logout
 */

window.TaxiSession = (() => {
    const TIMEOUT_MINUTES = 60; // Auto-logout pas 60 min pa aktivitet
    const WARN_SECONDS = 60; // Njoftim 60 sek para
    const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll'];

    let lastActivity = Date.now();
    let warningShown = false;
    let logoutTimer = null;
    let checkInterval = null;

    // ═══ REGJISTRO AKTIVITETIN ═══
    function recordActivity() {
        lastActivity = Date.now();
        warningShown = false;
    }

    // ═══ KONTROLLO ÇDO 5 SEK ═══
    function checkTimeout() {
        const elapsed = Math.floor((Date.now() - lastActivity) / 1000);
        const timeoutSec = TIMEOUT_MINUTES * 60;

        if (elapsed >= timeoutSec) {
            doLogout('Automatik — pa aktivitet');
            return;
        }

        // Njofto 60 sek para
        const remaining = timeoutSec - elapsed;
        if (remaining <= WARN_SECONDS && !warningShown) {
            warningShown = true;
            showWarning();
        }
    }

    function showWarning() {
        if (typeof showToast === 'function') {
            showToast('warning', '⏱️ Sesioni po skadon',
                `Do të dilni automatikisht për 60 sekonda. Kliko për të vazhduar.`);
        }
        if (window.TaxiSound) window.TaxiSound.playNotification();
    }

    // ═══ LOGOUT ═══
    async function doLogout(reason = '') {
        console.log('⏹️ Auto-logout:', reason);

        if (window.TaxiAuditLog) {
            window.TaxiAuditLog.log('auto_logout', { reason });
        }

        if (window.TaxiAuth) {
            try { await window.TaxiAuth.logout(); } catch (e) {}
        }

        stop();

        if (typeof showToast === 'function') {
            showToast('info', 'Sesioni skadoi', reason || 'Ju lutem hyni përsëri');
        }

        setTimeout(() => location.reload(), 1500);
    }

    // ═══ NDAL ═══
    function stop() {
        if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
    }

    // ═══ FILLO ═══
    function start() {
        // Regjistro aktivitetin
        ACTIVITY_EVENTS.forEach(evt => {
            document.addEventListener(evt, recordActivity, true);
        });

        // Kontrollo çdo 5 sek
        checkInterval = setInterval(checkTimeout, 5000);

        lastActivity = Date.now();
        console.log(`⏱️ Session aktivizuar — Timeout ${TIMEOUT_MINUTES} min`);
    }

    // ═══ RINOVO MANUALISHT ═══
    function renew() {
        recordActivity();
        console.log('⏱️ Sesioni u rinovua');
    }

    function getRemaining() {
        const elapsed = Math.floor((Date.now() - lastActivity) / 1000);
        return Math.max(0, TIMEOUT_MINUTES * 60 - elapsed);
    }

    function getRemainingStr() {
        const sec = getRemaining();
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}min ${s}sek`;
    }

    async function init() {
        start();
    }

    return {
        init, start, stop, renew,
        recordActivity, getRemaining, getRemainingStr,
        TIMEOUT_MINUTES
    };
})();

console.log('✅ session.js ngarkuar');

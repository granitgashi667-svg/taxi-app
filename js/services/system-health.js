'use strict';

/**
 * system-health.js — Monitorim i shëndetit të sistemit
 */

window.TaxiHealth = (() => {
    let checkInterval = null;
    let stats = {
        firebase: false,
        internet: false,
        firestore: false,
        auth: false,
        lastCheck: null,
        uptime: Date.now()
    };

    // ═══ KONTROLLO TË GJITHA ═══
    async function checkAll() {
        stats.internet = navigator.onLine;
        stats.firebase = !!window.TaxiFirebase?.ready;
        stats.firestore = !!window.TaxiFirebase?.db;
        stats.auth = !!window.TaxiFirebase?.auth;
        stats.lastCheck = Date.now();

        // Test real me Firestore
        if (stats.firestore) {
            try {
                await window.TaxiFirebase.db.collection('_health').doc('ping').set({
                    lastPing: Date.now()
                }, { merge: true });
                stats.firestore = true;
            } catch (e) {
                stats.firestore = false;
            }
        }

        return stats;
    }

    // ═══ STATUS I PËRGJITHSHËM ═══
    function getStatus() {
        const allOk = stats.internet && stats.firebase && stats.firestore && stats.auth;
        if (allOk) return { level: 'ok', label: 'Të gjitha sistemet funksionojnë', color: '#22c55e' };
        if (!stats.internet) return { level: 'error', label: 'Pa internet', color: '#f43f5e' };
        if (!stats.firebase) return { level: 'error', label: 'Firebase nuk është gati', color: '#f43f5e' };
        if (!stats.firestore) return { level: 'warn', label: 'Firestore ka problem', color: '#f59e0b' };
        if (!stats.auth) return { level: 'warn', label: 'Auth ka problem', color: '#f59e0b' };
        return { level: 'warn', label: 'Status i panjohur', color: '#f59e0b' };
    }

    // ═══ UPTIME ═══
    function getUptime() {
        const ms = Date.now() - stats.uptime;
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return `${h}h ${m}min`;
    }

    // ═══ START AUTO-CHECK ═══
    function start(interval = 60000) {
        if (checkInterval) clearInterval(checkInterval);
        checkAll();
        checkInterval = setInterval(checkAll, interval);
        console.log('💚 System health monitor aktivizuar');
    }

    function stop() {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
    }

    // ═══ RENDER WIDGET ═══
    function renderWidget(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const status = getStatus();

        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-tertiary);border-radius:10px;">
                <div style="width:10px;height:10px;border-radius:50%;background:${status.color};box-shadow:0 0 10px ${status.color};"></div>
                <div style="flex:1;">
                    <div style="font-size:12px;font-weight:700;">${status.label}</div>
                    <div style="font-size:10px;color:var(--text-muted);">Uptime: ${getUptime()}</div>
                </div>
            </div>
        `;
    }

    function getStats() { return { ...stats, uptime: getUptime() }; }

    return { checkAll, getStatus, getUptime, start, stop, renderWidget, getStats };
})();

console.log('✅ system-health.js ngarkuar');

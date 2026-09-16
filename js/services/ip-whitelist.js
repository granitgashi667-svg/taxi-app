'use strict';

/**
 * ip-whitelist.js — Kufizim IP (vetëm nga zyra)
 */

window.TaxiIpWhitelist = (() => {
    const COLLECTION = 'whitelist';
    const STORAGE_KEY = 'taxi.ip_whitelist';
    let allowedIPs = [];
    let myIP = null;
    let checkEnabled = false; // Aktivizohet kur vendoset lista
    let bypassDev = true; // Gjatë zhvillimit — lejo

    // ═══ MERR IP-N TËNDE ═══
    async function fetchMyIP() {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            myIP = data.ip;
            console.log('🌐 IP e jote:', myIP);
            return myIP;
        } catch (e) {
            console.warn('⚠️ Nuk mund të merret IP');
            return null;
        }
    }

    // ═══ KONTROLLO A JEMI NË LISTË ═══
    function isAllowed(ip = null) {
        if (bypassDev) return true;
        if (!checkEnabled) return true;
        if (!allowedIPs.length) return true;

        const checkIP = ip || myIP;
        if (!checkIP) return true;

        // Normalizo
        const cleanIP = String(checkIP).trim();
        return allowedIPs.some(allowed => {
            if (allowed === cleanIP) return true;
            // Support për wildcard (192.168.1.*)
            if (allowed.includes('*')) {
                const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
                return regex.test(cleanIP);
            }
            return false;
        });
    }

    // ═══ KONTROLLO DHE REFUZO ═══
    async function checkAccess() {
        if (bypassDev) {
            console.log('⚠️ IP Whitelist: BYPASS aktivizuar (dev mode)');
            return true;
        }

        await fetchMyIP();

        if (!isAllowed()) {
            showBlockedScreen();
            // Log tentativën
            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('access_denied_ip', { ip: myIP });
            }
            return false;
        }

        console.log('✅ IP u lejua:', myIP);
        return true;
    }

    // ═══ FAQE E BLLOKUAR ═══
    function showBlockedScreen() {
        document.body.innerHTML = `
            <div style="position:fixed;inset:0;background:#0a0416;color:#f5f0ff;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;z-index:99999;">
                <div style="text-align:center;max-width:500px;padding:40px;">
                    <div style="font-size:80px;margin-bottom:20px;">🔒</div>
                    <h1 style="font-size:24px;font-weight:800;margin-bottom:12px;color:#ef4444;">Qasje e Ndaluar</h1>
                    <p style="color:#b8a8d9;font-size:14px;line-height:1.6;margin-bottom:20px;">
                        Ky sistem është i kufizuar vetëm për IP-të e autorizuara të kompanisë.
                        IP-ja juaj aktuale nuk ka qasje.
                    </p>
                    <div style="background:#1a0f30;padding:16px;border-radius:12px;border:1px solid #2d1a4a;margin-bottom:24px;">
                        <div style="font-size:11px;color:#8b7aa8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">IP-ja juaj</div>
                        <div style="font-family:JetBrains Mono,monospace;font-size:16px;font-weight:800;color:#a855f7;">${myIP || 'E panjohur'}</div>
                    </div>
                    <p style="color:#8b7aa8;font-size:12px;">
                        Kontaktoni administratorin për të shtuar IP-në tuaj në listën e bardhë.
                    </p>
                </div>
            </div>
        `;
    }

    // ═══ MENAXHIM LISTA ═══
    async function loadFromFirestore() {
        const database = window.TaxiFirebase?.db;
        if (!database) return;
        try {
            const snap = await database.collection(COLLECTION).get();
            allowedIPs = snap.docs.map(doc => doc.data().ip).filter(Boolean);
            checkEnabled = allowedIPs.length > 0;
            console.log('🌐 Whitelist u ngarkua:', allowedIPs.length, 'IP');
        } catch (e) {
            console.warn('Whitelist load:', e);
        }
    }

    function addIP(ip, note = '') {
        if (!ip) return false;
        ip = ip.trim();
        if (allowedIPs.includes(ip)) return false;
        allowedIPs.push(ip);
        saveToFirestore(ip, note);
        console.log('✅ IP u shtua:', ip);
        return true;
    }

    async function saveToFirestore(ip, note) {
        const database = window.TaxiFirebase?.db;
        if (!database) return;
        try {
            await database.collection(COLLECTION).add({
                ip,
                note,
                addedBy: window.TaxiAuth?.currentUser()?.uid || null,
                addedAt: Date.now(),
                addedAtStr: new Date().toLocaleString('sq-AL')
            });
        } catch (e) { console.warn('IP save:', e); }
    }

    async function removeIP(ip) {
        const database = window.TaxiFirebase?.db;
        if (!database) return;
        try {
            const snap = await database.collection(COLLECTION).where('ip', '==', ip).get();
            const batch = database.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            allowedIPs = allowedIPs.filter(x => x !== ip);
            console.log('✅ IP u hoq:', ip);
        } catch (e) { console.warn('IP remove:', e); }
    }

    function getAll() { return [...allowedIPs]; }
    function getMyIP() { return myIP; }
    function setBypass(v) { bypassDev = !!v; }

    async function init() {
        await loadFromFirestore();
        await fetchMyIP();
        console.log('🌐 IP Whitelist aktivizuar — IP e jote:', myIP);
    }

    return {
        init, fetchMyIP, isAllowed, checkAccess,
        loadFromFirestore, addIP, removeIP,
        getAll, getMyIP, setBypass,
        get allowedIPs() { return allowedIPs; },
        get myIP() { return myIP; }
    };
})();

console.log('✅ ip-whitelist.js ngarkuar');

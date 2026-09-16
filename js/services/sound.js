'use strict';

/**
 * sound.js — Zërat (Web Audio API)
 */

window.TaxiSound = (() => {
    let ctx = null;
    let enabled = true;
    let ringInterval = null;

    function init() {
        try {
            if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { console.warn('⚠️ AudioContext nuk mbështetet'); }
    }

    function beep(freq = 880, duration = 0.4, volume = 0.15) {
        if (!enabled || !ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            const now = ctx.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.start(now); osc.stop(now + duration);
        } catch (e) {}
    }

    function playRing() {
        beep(880, 0.4, 0.15);
        setTimeout(() => beep(660, 0.4, 0.15), 500);
        setTimeout(() => beep(880, 0.4, 0.15), 1000);
    }

    function playNotification() {
        beep(1200, 0.15, 0.1);
        setTimeout(() => beep(1500, 0.15, 0.1), 150);
    }

    function playSuccess() {
        beep(800, 0.1, 0.08);
        setTimeout(() => beep(1000, 0.1, 0.08), 100);
        setTimeout(() => beep(1200, 0.15, 0.08), 200);
    }

    function playError() {
        beep(300, 0.3, 0.15);
    }

    function startRing() {
        if (ringInterval) return;
        playRing();
        ringInterval = setInterval(playRing, 2000);
    }

    function stopRing() {
        if (ringInterval) { clearInterval(ringInterval); ringInterval = null; }
    }

    function toggle() {
        enabled = !enabled;
        console.log('🔊 Zëri:', enabled ? 'ON' : 'OFF');
        return enabled;
    }

    return {
        init, beep, playRing, playNotification, playSuccess, playError,
        startRing, stopRing, toggle,
        get enabled() { return enabled; }
    };
})();

console.log('✅ sound.js ngarkuar');

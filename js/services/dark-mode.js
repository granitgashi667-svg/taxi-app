'use strict';

/**
 * dark-mode.js — Dark / Light mode toggle
 */

window.TaxiDarkMode = (() => {
    const STORAGE_KEY = 'taxi.theme_mode';
    let currentMode = 'dark'; // default

    // ═══ INIT ═══
    function init() {
        const saved = window.TaxiStorage?.get(STORAGE_KEY);
        if (saved) currentMode = saved;
        else {
            // Kontrollo preferencën e sistemit
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                currentMode = 'light';
            }
        }
        apply();
        setupShortcut();
        console.log('🎨 Dark mode:', currentMode);
    }

    // ═══ APPLY ═══
    function apply() {
        document.documentElement.setAttribute('data-theme', currentMode);
        document.body.classList.toggle('light-mode', currentMode === 'light');

        // Update button
        const btn = document.getElementById('btn-theme-toggle');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = currentMode === 'dark'
                    ? 'fa-solid fa-sun'
                    : 'fa-solid fa-moon';
            }
        }
    }

    // ═══ TOGGLE ═══
    function toggle() {
        currentMode = currentMode === 'dark' ? 'light' : 'dark';
        window.TaxiStorage?.set(STORAGE_KEY, currentMode);
        apply();
        console.log('🎨 Mode:', currentMode);

        if (typeof showToast === 'function') {
            showToast('info', currentMode === 'dark' ? '🌙 Dark mode' : '☀️ Light mode', '');
        }
    }

    function setMode(mode) {
        if (mode === 'dark' || mode === 'light') {
            currentMode = mode;
            window.TaxiStorage?.set(STORAGE_KEY, mode);
            apply();
        }
    }

    function get() { return currentMode; }

    // ═══ SHKURTESAT ═══
    function setupShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                toggle();
            }
        });
    }

    return { init, apply, toggle, setMode, get };
})();

console.log('✅ dark-mode.js ngarkuar');

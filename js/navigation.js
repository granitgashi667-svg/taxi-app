'use strict';

/**
 * js/navigation.js — Menuja anësore + butonat
 */

window.TaxiNavigation = (() => {
    let currentPage = 'dispatch';

    function init() {
        console.log('🧭 TaxiNavigation: Init...');
        setupRailNav();
        setupButtons();
    }

    // ═══════════════════════════════════════════════════════
    // MENU MAJTAS
    // ═══════════════════════════════════════════════════════
    function setupRailNav() {
        const railItems = document.querySelectorAll('.rail-nav .rail-item');

        railItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const nav = item.dataset.nav;
                if (!nav) return;

                // Aktive
                railItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Switch page
                switchPage(nav);
            });
        });

        // Logo → dispatch
        document.querySelector('.rail-logo')?.addEventListener('click', () => {
            switchPage('dispatch');
        });
    }

    // ═══════════════════════════════════════════════════════
    // SWITCH PAGE
    // ═══════════════════════════════════════════════════════
    function switchPage(pageName) {
        // Fshih të gjitha faqet
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        // Shfaq faqen e re
        const page = document.querySelector(`.page[data-page="${pageName}"]`);
        if (page) {
            page.classList.add('active');
            currentPage = pageName;

            // Rifresko hartën nëse është dispatch
            if (pageName === 'dispatch' || pageName === 'map') {
                setTimeout(() => {
                    try {
                        if (window.AppState?.map) window.AppState.map.invalidateSize();
                    } catch (e) {}
                }, 300);
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // BUTONAT POSHTË RAIL
    // ═══════════════════════════════════════════════════════
    function setupButtons() {
        // ═══ ZËRI ═══
        document.getElementById('btn-sound-toggle')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const isOn = btn.classList.toggle('sound-on');
            btn.classList.toggle('sound-off', !isOn);

            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isOn ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
            }

            if (window.TaxiSound?.toggle) {
                try { window.TaxiSound.toggle(); } catch (err) {}
            }

            if (window.showToast) {
                window.showToast('info', 'Zëri', isOn ? 'Aktivizuar' : 'Çaktivizuar');
            }
        });

        // ═══ TEMA ═══
        document.getElementById('btn-theme-toggle')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            document.body.classList.toggle('light-mode');

            const icon = btn.querySelector('i');
            if (icon) {
                const isLight = document.body.classList.contains('light-mode');
                icon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            }

            if (window.TaxiDarkMode?.toggle) {
                try { window.TaxiDarkMode.toggle(); } catch (err) {}
            }
        });

        // ═══ FULLSCREEN ═══
        document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.().catch(() => {});
            } else {
                document.exitFullscreen?.();
            }
        });

        // ═══ VOICE ═══
        document.getElementById('btn-voice-toggle')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const icon = btn.querySelector('i');
            const isActive = btn.classList.toggle('active');

            if (icon) {
                icon.className = isActive ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash';
            }

            if (window.TaxiVoice?.toggle) {
                try { window.TaxiVoice.toggle(); } catch (err) {}
            }
        });

        // ═══ RAIL USER (klikim) ═══
        document.getElementById('rail-user')?.addEventListener('click', () => {
            // Hap statistikat e operatorit
            document.getElementById('modal-operator-stats')?.classList.add('active');
        });
    }

    return { init, switchPage };
})();

console.log('✅ js/navigation.js ngarkuar');

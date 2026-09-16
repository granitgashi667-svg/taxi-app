'use strict';

/**
 * responsive.js — Optimizim për mobile/tablet
 */

window.TaxiResponsive = (() => {
    let currentBreakpoint = 'desktop';
    let sidebarOpen = false;

    const BREAKPOINTS = {
        mobile: 700,
        tablet: 1024,
        desktop: 1400
    };

    // ═══ INIT ═══
    function init() {
        detectBreakpoint();
        setupResizeListener();
        setupTouchGestures();
        console.log('📱 Responsive init:', currentBreakpoint);
    }

    // ═══ DETEKTO ═══
    function detectBreakpoint() {
        const w = window.innerWidth;
        let newBp = 'desktop';

        if (w <= BREAKPOINTS.mobile) newBp = 'mobile';
        else if (w <= BREAKPOINTS.tablet) newBp = 'tablet';
        else if (w <= BREAKPOINTS.desktop) newBp = 'laptop';

        if (newBp !== currentBreakpoint) {
            currentBreakpoint = newBp;
            document.body.setAttribute('data-breakpoint', newBp);
            applyLayout();
            console.log('📱 Breakpoint:', newBp);
        }
    }

    // ═══ APPLY LAYOUT ═══
    function applyLayout() {
        // Mobile: fshih sidebars, shto bottom nav
        if (currentBreakpoint === 'mobile') {
            document.querySelectorAll('.admin-sidebar, .nav-rail').forEach(el => {
                el.classList.add('mobile-hidden');
            });
            document.body.classList.add('mobile-view');

        } else {
            document.querySelectorAll('.admin-sidebar, .nav-rail').forEach(el => {
                el.classList.remove('mobile-hidden');
            });
            document.body.classList.remove('mobile-view');
        }
    }

    // ═══ RESIZE ═══
    function setupResizeListener() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(detectBreakpoint, 200);
        });
    }

    // ═══ TOUCH GESTURES ═══
    function setupTouchGestures() {
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;

            // Swipe nga e majta (hape sidebar)
            if (touchStartX < 30 && dx > 80 && Math.abs(dy) < 60) {
                openSidebar();
            }

            // Swipe nga e djathta (mbyll sidebar)
            if (touchStartX > window.innerWidth - 30 && dx < -80 && Math.abs(dy) < 60) {
                closeSidebar();
            }
        }, { passive: true });
    }

    // ═══ SIDEBAR ═══
    function openSidebar() {
        const sidebar = document.querySelector('.admin-sidebar, .nav-rail');
        if (sidebar) {
            sidebar.classList.add('mobile-open');
            sidebarOpen = true;
        }
    }

    function closeSidebar() {
        const sidebar = document.querySelector('.admin-sidebar, .nav-rail');
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
            sidebarOpen = false;
        }
    }

    function toggleSidebar() {
        if (sidebarOpen) closeSidebar();
        else openSidebar();
    }

    function getBreakpoint() { return currentBreakpoint; }
    function isMobile() { return currentBreakpoint === 'mobile'; }
    function isTablet() { return currentBreakpoint === 'tablet'; }
    function isDesktop() { return currentBreakpoint === 'desktop' || currentBreakpoint === 'laptop'; }

    return {
        init, detectBreakpoint, openSidebar, closeSidebar, toggleSidebar,
        getBreakpoint, isMobile, isTablet, isDesktop,
        BREAKPOINTS
    };
})();

console.log('✅ responsive.js ngarkuar');

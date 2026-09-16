'use strict';

/**
 * js/director/app.js — Logjika kryesore e Panelit të Drejtorit
 */

window.DirectorApp = (() => {
    let currentOperator = null;
    let currentPage = 'dashboard';
    let clockInterval = null;

    // ═══ INIT ═══
    async function init() {
        console.log('👑 Director App: Init...');

        // Init modulet
        if (window.TaxiLocale) window.TaxiLocale.init();
        if (window.TaxiOffline) window.TaxiOffline.init();
        if (window.TaxiSound) window.TaxiSound.init();

        // Firebase
        if (window.TaxiFirebase) window.TaxiFirebase.init();

        // DirectorLogin init
        if (window.DirectorLogin) window.DirectorLogin.init();

        // Nis orën
        startClock();

        // Kontrollo sesion ekzistues
        const existing = await window.DirectorLogin?.checkExistingSession();
        if (existing) {
            console.log('✅ Sesion ekzistues:', existing.name);
            onLoginSuccess(existing);
        } else {
            showScreen('login');
        }

        // Fshij loading
        setTimeout(() => {
            document.getElementById('loading-overlay')?.classList.add('hidden');
        }, 600);

        console.log('✅ Director App gati');
    }

    // ═══ KUR LOGIN ME SUKSES ═══
    function onLoginSuccess(operator) {
        currentOperator = operator;

        // Update UI
        updateOperatorUI(operator);

        // Switch screen
        showScreen('main');

        // Setup modules
        if (window.DirectorDashboard) window.DirectorDashboard.init();
        if (window.DirectorFinance) window.DirectorFinance.init();
        if (window.DirectorSalaries) window.DirectorSalaries.init();
        if (window.DirectorUsers) window.DirectorUsers.init();
        if (window.DirectorSettings) window.DirectorSettings.init();
        if (window.DirectorAuditLog) window.DirectorAuditLog.init();
        if (window.DirectorBackup) window.DirectorBackup.init();

        // Aktivizo audit
        if (window.TaxiAuditLog) {
            window.TaxiAuditLog.log('director_login', { id: operator.id, role: operator.role });
        }

        // Nis sesionin
        if (window.TaxiSession) window.TaxiSession.init();

        // Sound
        if (window.TaxiSound) window.TaxiSound.activate();

        // Toast
        showToast('success', '👑 Mirë se vjen', operator.name);

        // Shfaq dashboard
        switchPage('dashboard');
    }

    // ═══ UPDATE UI ═══
    function updateOperatorUI(operator) {
        const avatar = operator.avatar || operator.name.slice(0, 2).toUpperCase();

        document.getElementById('su-avatar').textContent = avatar;
        document.getElementById('su-name').textContent = operator.name;
        document.getElementById('su-role').textContent = operator.role || 'Director';
    }

    // ═══ SHFAQ SCREEN ═══
    function showScreen(name) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`screen-${name}`)?.classList.add('active');
    }

    // ═══ SWITCH PAGE ═══
    function switchPage(page) {
        currentPage = page;

        // Sidebar active
        document.querySelectorAll('.sidebar-item').forEach(i => {
            i.classList.toggle('active', i.dataset.page === page);
        });

        // Pages
        document.querySelectorAll('.admin-page').forEach(p => {
            p.classList.toggle('active', p.dataset.page === page);
        });

        // Update title
        const titles = {
            dashboard: { title: 'Dashboard Ekzekutiv', subtitle: 'Pamja e përgjithshme e kompanisë' },
            finance: { title: 'Financa', subtitle: 'Të ardhurat, shpenzimet, fitimi' },
            salaries: { title: 'Pagat', subtitle: 'Pagat e stafit dhe shoferëve' },
            analytics: { title: 'Analitika', subtitle: 'Analiza të avancuar' },
            users: { title: 'Përdoruesit', subtitle: 'Menaxhimi i përdoruesve' },
            audit: { title: 'Audit Log', subtitle: 'Të gjitha veprimet në sistem' },
            settings: { title: 'Cilësimet', subtitle: 'Konfigurimi i sistemit' },
            backup: { title: 'Backup', subtitle: 'Kopje rezervë dhe restaurim' }
        };

        const info = titles[page] || titles.dashboard;
        document.getElementById('page-title').textContent = info.title;
        document.getElementById('page-subtitle').textContent = info.subtitle;

        // Load content
        loadPageContent(page);

        console.log('📄 Faqja:', page);
    }

    // ═══ LOAD CONTENT ═══
    function loadPageContent(page) {
        switch (page) {
            case 'dashboard':
                if (window.DirectorDashboard) window.DirectorDashboard.load();
                break;
            case 'finance':
                if (window.DirectorFinance) window.DirectorFinance.load();
                break;
            case 'salaries':
                if (window.DirectorSalaries) window.DirectorSalaries.load();
                break;
            case 'analytics':
                if (window.DirectorAnalytics) window.DirectorAnalytics.load();
                else if (window.DirectorDashboard) window.DirectorDashboard.load();
                break;
            case 'users':
                if (window.DirectorUsers) window.DirectorUsers.load();
                break;
            case 'audit':
                if (window.DirectorAuditLog) window.DirectorAuditLog.load();
                break;
            case 'settings':
                if (window.DirectorSettings) window.DirectorSettings.load();
                break;
            case 'backup':
                if (window.DirectorBackup) window.DirectorBackup.load();
                break;
        }
    }

    // ═══ SIDEBAR TOGGLE ═══
    function toggleSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        if (!sidebar) return;

        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    }

    // ═══ ORA ═══
    function startClock() {
        if (clockInterval) clearInterval(clockInterval);

        const update = () => {
            const now = new Date();
            const t = document.getElementById('clock-time');
            const d = document.getElementById('clock-date');
            if (t) t.textContent = now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            if (d) d.textContent = now.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        update();
        clockInterval = setInterval(update, 1000);
    }

    // ═══ LOGOUT ═══
    async function logout() {
        if (!confirm('A jeni i sigurt që dëshironi të dilni?')) return;

        try {
            if (window.TaxiAuditLog) {
                window.TaxiAuditLog.log('director_logout', { id: currentOperator?.id });
            }

            await firebase.auth().signOut();
            window.TaxiStorage?.remove('taxi.director');

            if (window.TaxiSession) window.TaxiSession.stop();

            setTimeout(() => location.reload(), 300);
        } catch (e) {
            console.error('Logout error:', e);
        }
    }

    // ═══ TOAST ═══
    function showToast(type, title, msg) {
        const c = document.getElementById('toast-container');
        if (!c) return;
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${msg || ''}</div></div>`;
        c.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(400px)';
            setTimeout(() => t.remove(), 300);
        }, 3500);
        if (window.TaxiSound) {
            if (type === 'success') window.TaxiSound.playSuccess();
            else if (type === 'error') window.TaxiSound.playError();
        }
    }

    return {
        init, onLoginSuccess, logout,
        showScreen, switchPage, toggleSidebar, showToast,
        get currentOperator() { return currentOperator; },
        get currentPage() { return currentPage; }
    };
})();

console.log('✅ director/app.js ngarkuar');

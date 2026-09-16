'use strict';

/**
 * js/admin/app.js — Logjika kryesore e Panelit të Menagjerit
 */

window.AdminApp = (() => {
    let currentOperator = null;
    let currentPage = 'dashboard';
    let clockInterval = null;

    // ═══ INIT ═══
    async function init() {
        console.log('👔 Admin App: Init...');

        // Init modulet
        if (window.TaxiLocale) window.TaxiLocale.init();
        if (window.TaxiOffline) window.TaxiOffline.init();
        if (window.TaxiSound) window.TaxiSound.init();

        // Firebase
        if (window.TaxiFirebase) window.TaxiFirebase.init();

        // AdminLogin init
        if (window.AdminLogin) window.AdminLogin.init();

        // Nis orën
        startClock();

        // Kontrollo sesion ekzistues
        const existing = await window.AdminLogin?.checkExistingSession();
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

        console.log('✅ Admin App gati');
    }

    // ═══ KUR LOGIN ME SUKSES ═══
    function onLoginSuccess(operator) {
        currentOperator = operator;

        // Update UI
        updateOperatorUI(operator);

        // Switch screen
        showScreen('main');

        // Nis pages
        if (window.TaxiPermissions) {
            window.TaxiPermissions.setRole(operator.role);
        }

        // Setup modules
        if (window.AdminDashboard) window.AdminDashboard.init();
        if (window.AdminOperators) window.AdminOperators.init();
        if (window.AdminDrivers) window.AdminDrivers.init();
        if (window.AdminVehicles) window.AdminVehicles.init();
        if (window.AdminOrders) window.AdminOrders.init();
        if (window.AdminReports) window.AdminReports.init();
        if (window.AdminVacations) window.AdminVacations.init();
        if (window.AdminBlacklist) window.AdminBlacklist.init();

        // Aktivizo audit
        if (window.TaxiAuditLog) {
            window.TaxiAuditLog.log('admin_login', { id: operator.id, role: operator.role });
        }

        // Nis sesionin
        if (window.TaxiSession) window.TaxiSession.init();

        // Sound
        if (window.TaxiSound) window.TaxiSound.activate();

        // Toast
        showToast('success', '👋 Mirë se vjen', operator.name);

        // Shfaq dashboard
        switchPage('dashboard');
    }

    // ═══ UPDATE UI ═══
    function updateOperatorUI(operator) {
        const avatar = operator.avatar || operator.name.slice(0, 2).toUpperCase();

        document.getElementById('su-avatar').textContent = avatar;
        document.getElementById('su-name').textContent = operator.name;
        document.getElementById('su-role').textContent = operator.role || 'Manager';
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
            dashboard: { title: 'Dashboard', subtitle: 'Pamja e përgjithshme' },
            operators: { title: 'Operatorët', subtitle: 'Statistikat e operatorëve' },
            drivers: { title: 'Shoferët', subtitle: 'Menaxhimi i shoferëve' },
            vehicles: { title: 'Veturat', subtitle: 'Flota e veturave' },
            orders: { title: 'Porositë', subtitle: 'Historiku i plotë' },
            reports: { title: 'Raporte', subtitle: 'Raportet ditore / javore / mujore' },
            vacations: { title: 'Pushimet', subtitle: 'Kërkesat për pushim' },
            blacklist: { title: 'Blacklist', subtitle: 'Numrat e bllokuar' }
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
                if (window.AdminDashboard) window.AdminDashboard.load();
                break;
            case 'operators':
                if (window.AdminOperators) window.AdminOperators.load();
                break;
            case 'drivers':
                if (window.AdminDrivers) window.AdminDrivers.load();
                break;
            case 'vehicles':
                if (window.AdminVehicles) window.AdminVehicles.load();
                break;
            case 'orders':
                if (window.AdminOrders) window.AdminOrders.load();
                break;
            case 'reports':
                if (window.AdminReports) window.AdminReports.load();
                break;
            case 'vacations':
                if (window.AdminVacations) window.AdminVacations.load();
                break;
            case 'blacklist':
                if (window.AdminBlacklist) window.AdminBlacklist.load();
                break;
        }
    }

    // ═══ SIDEBAR TOGGLE ═══
    function toggleSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        if (!sidebar) return;

        // Në mobile → klasa mobile-open
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
        } else {
            // Në desktop → collapsed
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
                window.TaxiAuditLog.log('admin_logout', { id: currentOperator?.id });
            }

            await firebase.auth().signOut();
            window.TaxiStorage?.remove('taxi.admin');

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
        showScreen, switchPage, toggleSidebar,
        showToast,
        get currentOperator() { return currentOperator; },
        get currentPage() { return currentPage; }
    };
})();

console.log('✅ admin/app.js ngarkuar');

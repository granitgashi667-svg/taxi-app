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

        if (window.TaxiLocale) window.TaxiLocale.init();
        if (window.TaxiOffline) window.TaxiOffline.init();
        if (window.TaxiSound) window.TaxiSound.init();

        if (window.TaxiFirebase) window.TaxiFirebase.init();

        if (window.AdminLogin) window.AdminLogin.init();

        startClock();

        const existing = await window.AdminLogin?.checkExistingSession();
        if (existing) {
            console.log('✅ Sesion ekzistues:', existing.name);
            onLoginSuccess(existing);
        } else {
            showScreen('login');
        }

        setTimeout(() => {
            document.getElementById('loading-overlay')?.classList.add('hidden');
        }, 600);

        console.log('✅ Admin App gati');
    }

    // ═══ KUR LOGIN ME SUKSES ═══
    function onLoginSuccess(operator) {
        currentOperator = operator;

        updateOperatorUI(operator);
        showScreen('main');

        if (window.TaxiPermissions) {
            window.TaxiPermissions.setRole(operator.role);
        }

        // ═══ MODULET EKZISTUESE ═══
        if (window.AdminDashboard) window.AdminDashboard.init();
        if (window.AdminOperators) window.AdminOperators.init();
        if (window.AdminDrivers) window.AdminDrivers.init();
        if (window.AdminVehicles) window.AdminVehicles.init();
        if (window.AdminOrders) window.AdminOrders.init();
        if (window.AdminReports) window.AdminReports.init();
        if (window.AdminVacations) window.AdminVacations.init();
        if (window.AdminBlacklist) window.AdminBlacklist.init();

        // ═══ MODULET E REJA ═══
        if (window.AdminTargets)       try { window.AdminTargets.init(); } catch(e) { console.error('AdminTargets:', e); }
        if (window.AdminLoyalty)       try { window.AdminLoyalty.init(); } catch(e) { console.error('AdminLoyalty:', e); }
        if (window.AdminFuel)          try { window.AdminFuel.init(); } catch(e) { console.error('AdminFuel:', e); }
        if (window.AdminSalaries)      try { window.AdminSalaries.init(); } catch(e) { console.error('AdminSalaries:', e); }
        if (window.AdminAutoDispatch)  try { window.AdminAutoDispatch.init(); } catch(e) { console.error('AdminAutoDispatch:', e); }
        if (window.AdminSmsTemplates)  try { window.AdminSmsTemplates.init(); } catch(e) { console.error('AdminSmsTemplates:', e); }
        if (window.AdminFixedRoutes)   try { window.AdminFixedRoutes.init(); } catch(e) { console.error('AdminFixedRoutes:', e); }
        if (window.AdminImport)        try { window.AdminImport.init(); } catch(e) { console.error('AdminImport:', e); }
        if (window.AdminIntegrations)  try { window.AdminIntegrations.init(); } catch(e) { console.error('AdminIntegrations:', e); }
        if (window.AdminTrackers)      try { window.AdminTrackers.init(); } catch(e) { console.error('AdminTrackers:', e); }
        if (window.AdminStreets)       try { window.AdminStreets.init(); } catch(e) { console.error('AdminStreets:', e); }
        if (window.AdminMobileUsers)   try { window.AdminMobileUsers.init(); } catch(e) { console.error('AdminMobileUsers:', e); }

        if (window.TaxiAuditLog) {
            window.TaxiAuditLog.log('admin_login', { id: operator.id, role: operator.role });
        }

        if (window.TaxiSession) window.TaxiSession.init();
        if (window.TaxiSound) window.TaxiSound.activate();

        showToast('success', '👋 Mirë se vjen', operator.name);

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

        document.querySelectorAll('.sidebar-item').forEach(i => {
            i.classList.toggle('active', i.dataset.page === page);
        });

        document.querySelectorAll('.admin-page').forEach(p => {
            p.classList.toggle('active', p.dataset.page === page);
        });

        const titles = {
            // ═══ KRYESORE ═══
            dashboard:      { title: 'Dashboard',       subtitle: 'Pamja e përgjithshme' },
            operators:      { title: 'Operatorët',      subtitle: 'Statistikat e operatorëve' },
            drivers:        { title: 'Shoferët',        subtitle: 'Menaxhimi i shoferëve' },
            vehicles:       { title: 'Veturat',         subtitle: 'Flota e veturave' },
            orders:         { title: 'Porositë',        subtitle: 'Historiku i plotë' },

            // ═══ MARKETING ═══
            targets:        { title: 'Targets',         subtitle: 'Company orders · Target history · Preorders · iPay · Mobile' },
            loyalty:        { title: 'Loyalty Cards',   subtitle: 'Kartat e besnikërisë dhe pikët' },
            'mobile-users': { title: 'Mobile Users',    subtitle: 'Përdoruesit e aplikacionit mobil' },
            'sms-templates':{ title: 'SMS Templates',   subtitle: 'Template-t e SMS-ve me variabla' },

            // ═══ OPERACIONE ═══
            'auto-dispatch':{ title: 'Auto-Dispatch',   subtitle: 'Konfigurimi i shpërndarjes automatike' },
            'fixed-routes': { title: 'Fixed Routes',    subtitle: 'Rrugë me çmim fiks' },
            streets:        { title: 'Streets & Stands',subtitle: 'Rrugët dhe stendat e taksi' },
            trackers:       { title: 'Trackers',        subtitle: 'GPS tracking live' },

            // ═══ FINANCA ═══
            fuel:           { title: 'Fuel / Refill',   subtitle: 'Çmimet e karburantit dhe refill-et' },
            salaries:       { title: 'Salaries',        subtitle: 'Menaxhimi i pagave, bonuseve dhe zbritjeve' },
            reports:        { title: 'Raporte',         subtitle: 'Raportet ditore / javore / mujore / punëtorët' },

            // ═══ SISTEMI ═══
            integrations:   { title: 'Integrations',    subtitle: 'Viber, Twitter, WhatsApp, Telegram' },
            import:         { title: 'Import',          subtitle: 'Importo nga CSV / Excel' },
            vacations:      { title: 'Pushimet',        subtitle: 'Kërkesat për pushim' },
            blacklist:      { title: 'Blacklist',       subtitle: 'Numrat e bllokuar' },
            administration: { title: 'Administration',  subtitle: 'Cilësimet e sistemit' }
        };

        const info = titles[page] || { title: 'Dashboard', subtitle: '' };
        const titleEl = document.getElementById('page-title');
        const subEl = document.getElementById('page-subtitle');
        if (titleEl) titleEl.textContent = info.title;
        if (subEl) subEl.textContent = info.subtitle;

        loadPageContent(page);

        console.log('📄 Faqja:', page);
    }

    // ═══ LOAD CONTENT ═══
    function loadPageContent(page) {
        switch (page) {
            // ═══ EKZISTUESE ═══
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
            case 'administration':
                if (window.AdminAdministration) window.AdminAdministration.load();
                break;

            // ═══ MARKETING ═══
            case 'targets':
                if (window.AdminTargets) window.AdminTargets.load();
                break;
            case 'loyalty':
                if (window.AdminLoyalty) window.AdminLoyalty.load();
                break;
            case 'mobile-users':
                if (window.AdminMobileUsers) window.AdminMobileUsers.load();
                break;
            case 'sms-templates':
                if (window.AdminSmsTemplates) window.AdminSmsTemplates.load();
                break;

            // ═══ OPERACIONE ═══
            case 'auto-dispatch':
                if (window.AdminAutoDispatch) window.AdminAutoDispatch.load();
                break;
            case 'fixed-routes':
                if (window.AdminFixedRoutes) window.AdminFixedRoutes.load();
                break;
            case 'streets':
                if (window.AdminStreets) window.AdminStreets.load();
                break;
            case 'trackers':
                if (window.AdminTrackers) window.AdminTrackers.load();
                break;

            // ═══ FINANCA ═══
            case 'fuel':
                if (window.AdminFuel) window.AdminFuel.load();
                break;
            case 'salaries':
                if (window.AdminSalaries) window.AdminSalaries.load();
                break;

            // ═══ SISTEMI ═══
            case 'integrations':
                if (window.AdminIntegrations) window.AdminIntegrations.load();
                break;
            case 'import':
                if (window.AdminImport) window.AdminImport.load();
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

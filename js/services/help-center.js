'use strict';

/**
 * help-center.js — Qendra e Ndihmës
 */

window.TaxiHelp = (() => {

    // ═══ TUTORIALS / FAQ ═══
    const FAQ = [
        {
            q: 'Si të krijoj një porosi të re?',
            a: 'Shko në faqen kryesore, plotëso formularin "Porosi e Re" me numrin e telefonit dhe adresën e marrjes. Kliko "DËRGO POROSINË" dhe porosia do të shfaqet në listën e pritjes.'
        },
        {
            q: 'Si funksionon caktimi automatik (AUTO)?',
            a: 'Sistemi gjen automatikisht shoferin e parë të lirë dhe i cakton porosinë. Shoferi merr njoftim me zë dhe mund ta pranojë ose refuzojë.'
        },
        {
            q: 'Cili është ndryshimi mes AUTO, AFËR dhe MANUAL?',
            a: 'AUTO cakton shoferin e parë të lirë. AFËR (Closest) cakton shoferin më të afërt me pikën e marrjes. MANUAL ju lejon të zgjidhni vetë shoferin.'
        },
        {
            q: 'Si funksionon SMS automatik?',
            a: 'Klienti merr dy SMS: 1) Kur shoferi pranon porosinë, me link për të ndjekur live; 2) Kur shoferi është 20m larg, me targën e veturës.'
        },
        {
            q: 'Çka bën butoni SOS?',
            a: 'Në rast emergjence, klikoni SOS për të njoftuar menjëherë zyrën. Ata do të shohin pozicionin tuaj dhe do të kontaktojnë policinë nëse nevojitet.'
        },
        {
            q: 'Si ndryshoj statusin tim?',
            a: 'Në app-in e shoferit, kliko butonin e statusit (Lirë/Pauzë/Offline) në banner. Zgjidh statusin e re dhe konfirmo.'
        },
        {
            q: 'Si të paguaj me kartë?',
            a: 'Në app-in e klientit, zgjidh "Pagesë me kartë" në momentin e porosisë. Sistemi do të hapë një formë të sigurt për të futur të dhënat.'
        },
        {
            q: 'A mund të fshij një porosi?',
            a: 'Vetëm menagjerët dhe drejtorët mund të fshijnë porosi. Operatori normal mund të anulojë porosinë por jo ta fshijë përgjithmonë.'
        },
        {
            q: 'Kush mund të shohë statistikat?',
            a: 'Dispeçeri shikon vetëm statistikat e veta. Menagjeri shikon të gjithë operatorët dhe shoferët. Drejtori shikon gjithçka përfshirë financat.'
        },
        {
            q: 'Si funksionon 2FA?',
            a: '2FA (Two-Factor Authentication) shton një shtresë sigurie. Pas login-it, kërkohet një kod 6-shifror nga aplikacioni Google Authenticator.'
        }
    ];

    // ═══ SHFAQ MODAL ═══
    function open() {
        const existing = document.getElementById('modal-help-center');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modal-help-center';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fa-solid fa-circle-question"></i>
                        <h3>Qendra e Ndihmës</h3>
                    </div>
                    <button class="modal-close" onclick="document.getElementById('modal-help-center').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="position:relative;margin-bottom:16px;">
                        <i class="fa-solid fa-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);"></i>
                        <input type="text" id="help-search" class="input-field" placeholder="Kërko pyetje..." style="padding-left:36px;" oninput="TaxiHelp.filter(this.value)">
                    </div>

                    <div id="help-list">
                        ${FAQ.map((item, i) => `
                            <div class="help-item" data-question="${item.q.toLowerCase()}" onclick="TaxiHelp.toggleItem(${i})">
                                <div class="help-question">
                                    <i class="fa-solid fa-chevron-right help-chevron"></i>
                                    <span>${item.q}</span>
                                </div>
                                <div class="help-answer" id="help-answer-${i}">
                                    ${item.a}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top:20px;padding:16px;background:linear-gradient(135deg,rgba(168,85,247,.1),rgba(236,72,153,.05));border-radius:12px;border-left:3px solid var(--accent-purple);">
                        <div style="font-size:13px;font-weight:800;margin-bottom:6px;">
                            <i class="fa-solid fa-headset" style="color:var(--accent-purple);"></i> Kontakto Suportin
                        </div>
                        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;">
                            Nuk gjen atë që kërkon? Kontakto administratorin:
                        </div>
                        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                            <a href="tel:+38344123456" class="btn-primary" style="padding:8px 14px;font-size:11px;text-decoration:none;">
                                <i class="fa-solid fa-phone"></i> Telefono
                            </a>
                            <a href="mailto:support@taxiapp.com" class="btn-primary" style="padding:8px 14px;font-size:11px;text-decoration:none;background:linear-gradient(135deg,#22c55e,#16a34a);">
                                <i class="fa-solid fa-envelope"></i> Email
                            </a>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="document.getElementById('modal-help-center').remove()">Mbyll</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ═══ TOGGLE ITEM ═══
    function toggleItem(index) {
        const answer = document.getElementById(`help-answer-${index}`);
        const item = answer?.parentElement;
        if (!answer || !item) return;

        const isOpen = answer.classList.contains('open');

        // Mbyll të gjitha
        document.querySelectorAll('.help-answer').forEach(a => a.classList.remove('open'));
        document.querySelectorAll('.help-chevron').forEach(c => c.style.transform = 'rotate(0deg)');
        document.querySelectorAll('.help-item').forEach(i => i.classList.remove('active'));

        if (!isOpen) {
            answer.classList.add('open');
            item.classList.add('active');
            const chevron = item.querySelector('.help-chevron');
            if (chevron) chevron.style.transform = 'rotate(90deg)';
        }
    }

    // ═══ FILTER ═══
    function filter(query) {
        const q = query.toLowerCase().trim();
        document.querySelectorAll('.help-item').forEach(item => {
            const question = item.dataset.question || '';
            const matches = !q || question.includes(q);
            item.style.display = matches ? 'block' : 'none';
        });
    }

    // ═══ SHFAQ TUTORIAL ═══
    function startTutorial() {
        if (window.TaxiOnboarding) {
            window.TaxiOnboarding.reset();
            window.TaxiOnboarding.start();
        }
    }

    return { open, toggleItem, filter, startTutorial, FAQ };
})();

console.log('✅ help-center.js ngarkuar');

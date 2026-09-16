'use strict';

window.AdminImport = (() => {
    let parsedData = null;
    let headers = [];
    let mapping = {};

    function init() { console.log('📥 AdminImport: Init...'); }
    async function load() { await renderPage(); }

    function renderPage() {
        const el = document.querySelector('.admin-page[data-page="import"]');
        if (!el) return;
        el.innerHTML = `
            <div class="page-header" style="margin-bottom:20px;">
                <div class="page-title"><i class="fa-solid fa-file-import"></i>
                    <div><h2>Importing Tool</h2><p>Importo nga CSV / Excel</p></div>
                </div>
            </div>

            <div class="db-panel" style="margin-bottom:16px;">
                <div class="db-panel-header"><i class="fa-solid fa-file-csv"></i><h3>1. Zgjidh skedarin</h3></div>
                <div class="db-panel-body">
                    <div id="imp-dropzone" style="border:2px dashed #334155;border-radius:12px;padding:40px;text-align:center;cursor:pointer;transition:all .2s;"
                        onclick="document.getElementById('imp-file').click()">
                        <i class="fa-solid fa-cloud-arrow-up" style="font-size:36px;color:#a855f7;margin-bottom:12px;"></i>
                        <div style="font-weight:700;margin-bottom:6px;">Kliko ose tërhiq skedarin këtu</div>
                        <div style="font-size:11px;color:#94a3b8;">CSV, Excel (.xlsx, .xls), JSON</div>
                        <input type="file" id="imp-file" accept=".csv,.xlsx,.xls,.json" style="display:none;" onchange="AdminImport.handleFile(event)">
                    </div>
                    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
                        <select id="imp-collection" class="input-sm">
                            <option value="orders">📋 Orders</option>
                            <option value="workers">👤 Workers</option>
                            <option value="vehicles">🚗 Vehicles</option>
                            <option value="loyalty_cards">💳 Loyalty Cards</option>
                            <option value="mobile_users">📱 Mobile Users</option>
                        </select>
                        <select id="imp-mode" class="input-sm">
                            <option value="add">➕ Shto të reja</option>
                            <option value="upsert">🔄 Shto / përditëso</option>
                            <option value="replace">⚠️ Zëvendëso</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="db-panel" style="margin-bottom:16px;display:none;" id="imp-mapping-panel">
                <div class="db-panel-header"><i class="fa-solid fa-diagram-project"></i><h3>2. Map kolonat</h3></div>
                <div class="db-panel-body" id="imp-mapping-body"></div>
            </div>

            <div class="db-panel" style="margin-bottom:16px;display:none;" id="imp-preview-panel">
                <div class="db-panel-header"><i class="fa-solid fa-eye"></i><h3>3. Preview</h3></div>
                <div class="db-panel-body" id="imp-preview-body"></div>
            </div>

            <div class="db-panel" style="display:none;" id="imp-progress-panel">
                <div class="db-panel-header"><i class="fa-solid fa-rocket"></i><h3>4. Import</h3></div>
                <div class="db-panel-body" id="imp-progress-body"></div>
            </div>

            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
                <button class="btn-secondary" onclick="AdminImport.reset()"><i class="fa-solid fa-rotate"></i> Reset</button>
                <button class="btn-primary" id="imp-go-btn" style="display:none;" onclick="AdminImport.startImport()">
                    <i class="fa-solid fa-play"></i> Fillo importin
                </button>
            </div>
        `;
    }

    function handleFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result;
            parseCSV(text);
        };
        reader.readAsText(file, 'UTF-8');
    }

    function parseCSV(text) {
        text = text.replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return alert('Skedari është bosh ose ka vetëm header');

        const delimiter = detectDelimiter(lines[0]);
        headers = splitCSVLine(lines[0], delimiter);
        parsedData = lines.slice(1).map(line => {
            const vals = splitCSVLine(line, delimiter);
            const obj = {};
            headers.forEach((h, i) => obj[h] = vals[i] ?? '');
            return obj;
        });

        mapping = {};
        headers.forEach(h => { mapping[h] = suggestField(h); });

        renderMapping();
        renderPreview();
        document.getElementById('imp-mapping-panel').style.display = '';
        document.getElementById('imp-preview-panel').style.display = '';
        document.getElementById('imp-progress-panel').style.display = '';
        document.getElementById('imp-go-btn').style.display = '';
    }

    function detectDelimiter(line) {
        const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
        for (const c of line) if (counts[c] !== undefined) counts[c]++;
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }

    function splitCSVLine(line, delim) {
        const out = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
                else inQ = !inQ;
            } else if (c === delim && !inQ) { out.push(cur); cur = ''; }
            else cur += c;
        }
        out.push(cur);
        return out.map(s => s.trim());
    }

    const FIELD_SUGGESTIONS = [
        { field: 'phone', keys: ['phone', 'telefon', 'tel', 'mobile'] },
        { field: 'name', keys: ['name', 'emri', 'klienti', 'client'] },
        { field: 'pickup', keys: ['pickup', 'marrja', 'from', 'nga', 'adresa'] },
        { field: 'destination', keys: ['destination', 'destinacioni', 'to', 'deri'] },
        { field: 'price', keys: ['price', 'cmimi', 'cost', 'total'] },
        { field: 'date', keys: ['date', 'data'] },
        { field: 'time', keys: ['time', 'ora'] },
        { field: 'status', keys: ['status', 'statusi'] },
        { field: 'vehicleNum', keys: ['vehicle', 'vetura', 'car', 'plate'] },
        { field: 'driverName', keys: ['driver', 'shoferi'] },
        { field: 'operatorName', keys: ['operator', 'operatori'] },
        { field: 'email', keys: ['email', 'mail'] },
        { field: 'address', keys: ['address', 'adresa'] },
        { field: 'points', keys: ['points', 'pike', 'pike'] }
    ];

    function suggestField(header) {
        const h = header.toLowerCase().trim();
        for (const s of FIELD_SUGGESTIONS) {
            if (s.keys.some(k => h.includes(k))) return s.field;
        }
        return '_skip';
    }

    function renderMapping() {
        const el = document.getElementById('imp-mapping-body');
        const fields = FIELD_SUGGESTIONS.map(s => s.field).concat(['_skip']);
        el.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">
                ${headers.map(h => `
                    <div style="padding:10px;background:#1e293b;border-radius:8px;">
                        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Kolonë skedari</div>
                        <div style="font-weight:700;font-size:12px;margin-bottom:8px;">${h}</div>
                        <select class="input-sm" style="width:100%;" onchange="AdminImport.setMapping('${h.replace(/'/g, "\\'")}', this.value)">
                            <option value="_skip">— Mos importo —</option>
                            ${fields.filter(f => f !== '_skip').map(f => `
                                <option value="${f}" ${mapping[h] === f ? 'selected' : ''}>${f}</option>
                            `).join('')}
                        </select>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function setMapping(header, field) { mapping[header] = field; }

    function renderPreview() {
        const el = document.getElementById('imp-preview-body');
        const rows = parsedData.slice(0, 10);
        const cols = headers.slice(0, 8);
        el.innerHTML = `
            <div style="margin-bottom:10px;font-size:11px;color:#94a3b8;">
                Total rreshta: <strong style="color:#f1f5f9;">${parsedData.length}</strong> · Duke shfaqur 10 të parët
            </div>
            <div class="admin-table-wrap" style="max-height:320px;overflow:auto;">
                <table class="admin-table">
                    <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${rows.map(r => `<tr>${cols.map(c => `<td style="font-size:11px;">${escapeHtml(r[c] || '')}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async function startImport() {
        const db = window.TaxiFirebase?.db;
        if (!db) return alert('Firebase nuk është gati');
        if (!parsedData?.length) return alert('Nuk ka të dhëna');

        const collection = document.getElementById('imp-collection')?.value || 'orders';
        const mode = document.getElementById('imp-mode')?.value || 'add';

        if (mode === 'replace' && !confirm('Zëvendësimi fshin dokumentet ekzistuese. Vazhdo?')) return;

        const progressEl = document.getElementById('imp-progress-body');
        progressEl.innerHTML = `
            <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:6px;">
                    <span id="imp-status">Duke filluar...</span>
                    <span id="imp-count">0 / ${parsedData.length}</span>
                </div>
                <div style="background:#1e293b;border-radius:8px;height:12px;overflow:hidden;">
                    <div id="imp-bar" style="background:linear-gradient(90deg,#a855f7,#ec4899);height:100%;width:0;transition:width .3s;"></div>
                </div>
            </div>
            <div id="imp-log" style="font-family:monospace;font-size:11px;color:#94a3b8;max-height:200px;overflow-y:auto;background:#0f172a;padding:10px;border-radius:8px;"></div>
        `;

        let ok = 0, err = 0;
        const log = (msg, color = '#94a3b8') => {
            const l = document.getElementById('imp-log');
            if (l) l.innerHTML += `<div style="color:${color};">${msg}</div>`;
            if (l) l.scrollTop = l.scrollHeight;
        };

        const startTime = Date.now();
        const batchSize = 20;

        for (let i = 0; i < parsedData.length; i += batchSize) {
            const batch = db.batch();
            const chunk = parsedData.slice(i, i + batchSize);
            chunk.forEach(row => {
                const doc = mapRow(row);
                if (!doc) { err++; return; }
                const ref = db.collection(collection).doc();
                doc.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                doc._importedAt = firebase.firestore.FieldValue.serverTimestamp();
                doc._importedBy = window.TaxiFirebase?.auth?.currentUser?.email || 'admin';
                batch.set(ref, doc, { merge: mode === 'upsert' });
                ok++;
            });
            try {
                await batch.commit();
                const pct = Math.round(((i + chunk.length) / parsedData.length) * 100);
                document.getElementById('imp-bar').style.width = pct + '%';
                document.getElementById('imp-count').textContent = `${i + chunk.length} / ${parsedData.length}`;
                document.getElementById('imp-status').textContent = `Duke importuar... ${pct}%`;
            } catch (e) {
                err += chunk.length;
                log(`❌ Batch ${i}: ${e.message}`, '#ef4444');
            }
        }

        const dur = ((Date.now() - startTime) / 1000).toFixed(1);
        document.getElementById('imp-status').textContent = `✅ Kryer në ${dur}s`;
        log(`✅ Importuar: ${ok}`, '#10b981');
        if (err) log(`❌ Gabime: ${err}`, '#ef4444');
        log(`⏱️ Koha: ${dur}s`);

        try {
            await db.collection('import_logs').add({
                collection, mode, total: parsedData.length, ok, err,
                fileName: document.getElementById('imp-file')?.files?.[0]?.name || 'unknown',
                duration: parseFloat(dur),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                by: window.TaxiFirebase?.auth?.currentUser?.email || 'admin'
            });
        } catch {}
    }

    function mapRow(row) {
        const doc = {};
        let mapped = 0;
        Object.entries(mapping).forEach(([header, field]) => {
            if (field === '_skip') return;
            const val = row[header];
            if (val === undefined || val === '') return;
            mapped++;
            if (field === 'price' || field === 'points') doc[field] = parseFloat(val) || 0;
            else doc[field] = val;
        });
        return mapped ? doc : null;
    }

    function reset() {
        parsedData = null; headers = []; mapping = {};
        ['imp-mapping-panel', 'imp-preview-panel', 'imp-progress-panel'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const btn = document.getElementById('imp-go-btn');
        if (btn) btn.style.display = 'none';
        const inp = document.getElementById('imp-file');
        if (inp) inp.value = '';
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    return { init, load, handleFile, setMapping, startImport, reset };
})();
console.log('✅ admin/import.js ngarkuar');

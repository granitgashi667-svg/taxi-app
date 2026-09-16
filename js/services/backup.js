'use strict';

window.TaxiBackup = (() => {
    function db() { return window.TaxiFirebase?.db || null; }

    async function exportAll() {
        const database = db();
        if (!database) return null;
        try {
            const collections = ['orders', 'operators', 'drivers', 'clients', 'messages', 'calls'];
            const data = {};
            for (const col of collections) {
                const snap = await database.collection(col).get();
                data[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            data.exportedAt = new Date().toISOString();
            data.version = window.TaxiConfig?.APP?.version || '1.0';
            return data;
        } catch (e) { console.error('❌ exportAll:', e); return null; }
    }

    async function download() {
        const data = await exportAll();
        if (!data) return;
        if (window.TaxiExport) {
            window.TaxiExport.toJson(data, `taxiapp-backup-${Date.now()}.json`);
        }
    }

    async function restore(jsonData) {
        const database = db();
        if (!database) return false;
        try {
            const collections = ['orders', 'operators', 'drivers', 'clients', 'messages'];
            for (const col of collections) {
                if (!jsonData[col]) continue;
                for (const item of jsonData[col]) {
                    const { id, ...data } = item;
                    await database.collection(col).doc(id).set(data);
                }
            }
            console.log('✅ Restore komplet');
            return true;
        } catch (e) { console.error('❌ restore:', e); return false; }
    }

    async function importFromFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(await restore(data));
                } catch (err) { resolve(false); }
            };
            reader.readAsText(file);
        });
    }

    return { exportAll, download, restore, importFromFile };
})();

console.log('✅ backup.js ngarkuar');

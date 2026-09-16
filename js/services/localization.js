'use strict';

window.TaxiLocale = (() => {
    let currentLang = 'sq';

    const translations = {
        sq: {
            login: 'Hyr',
            logout: 'Dil',
            order: 'Porosi',
            newOrder: 'Porosi e Re',
            waitingOrders: 'Porosi në Pritje',
            activeOrders: 'Porositë Aktive',
            preOrders: 'Me Termin',
            calls: 'Thirrjet',
            map: 'Harta',
            drivers: 'Shoferët',
            vehicles: 'Veturat',
            clients: 'Klientët',
            reports: 'Raporte',
            settings: 'Cilësimet',
            save: 'Ruaj',
            cancel: 'Anulo',
            delete: 'Fshij',
            edit: 'Edito',
            close: 'Mbyll',
            search: 'Kërko',
            phone: 'Telefon',
            name: 'Emri',
            address: 'Adresa',
            destination: 'Destinacioni',
            price: 'Çmimi',
            total: 'Totali',
            status: 'Statusi',
            time: 'Ora',
            date: 'Data',
            driver: 'Shoferi',
            vehicle: 'Vetura',
            auto: 'Auto',
            manual: 'Manual',
            closest: 'Afër',
            completed: 'Përfunduar',
            cancelled: 'Anuluar'
        },
        en: {
            login: 'Login',
            logout: 'Logout',
            order: 'Order',
            newOrder: 'New Order',
            waitingOrders: 'Waiting Orders',
            activeOrders: 'Active Orders',
            preOrders: 'Pre-Orders',
            calls: 'Calls',
            map: 'Map',
            drivers: 'Drivers',
            vehicles: 'Vehicles',
            clients: 'Clients',
            reports: 'Reports',
            settings: 'Settings',
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            close: 'Close',
            search: 'Search',
            phone: 'Phone',
            name: 'Name',
            address: 'Address',
            destination: 'Destination',
            price: 'Price',
            total: 'Total',
            status: 'Status',
            time: 'Time',
            date: 'Date',
            driver: 'Driver',
            vehicle: 'Vehicle',
            auto: 'Auto',
            manual: 'Manual',
            closest: 'Closest',
            completed: 'Completed',
            cancelled: 'Cancelled'
        }
    };

    function t(key) {
        return translations[currentLang]?.[key] || key;
    }

    function setLang(lang) {
        if (translations[lang]) {
            currentLang = lang;
            window.TaxiStorage?.set('taxi.language', lang);
            console.log('🌍 Gjuha:', lang);
        }
    }

    function getLang() { return currentLang; }

    function init() {
        const saved = window.TaxiStorage?.get('taxi.language');
        if (saved && translations[saved]) currentLang = saved;
    }

    return { t, setLang, getLang, init, translations };
})();

console.log('✅ localization.js ngarkuar');

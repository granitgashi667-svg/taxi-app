'use strict';

window.TaxiThemes = (() => {
    const THEMES = ['purple', 'dark', 'light', 'blue', 'green'];
    let current = 'purple';

    function set(theme) {
        if (!THEMES.includes(theme)) return;
        current = theme;
        document.body.className = `theme-${theme}`;
        window.TaxiStorage?.set('taxi.theme', theme);
        console.log('🎨 Tema:', theme);
    }

    function get() { return current; }

    function toggle() {
        const idx = THEMES.indexOf(current);
        const next = THEMES[(idx + 1) % THEMES.length];
        set(next);
        return next;
    }

    function init() {
        const saved = window.TaxiStorage?.get('taxi.theme');
        if (saved && THEMES.includes(saved)) set(saved);
    }

    function list() { return THEMES; }

    return { set, get, toggle, init, list };
})();

console.log('✅ themes.js ngarkuar');

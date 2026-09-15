'use strict';

const DB_ADDRESSES = [
    { id: 1, name: "Grand Hotel Prishtina", alias: ["grandi","grand"], lat: 42.6629, lng: 21.1655, zone: "zona1", category: "hotel", priority: 10 },
    { id: 2, name: "Hotel Sirius", alias: ["sirius"], lat: 42.6608, lng: 21.1645, zone: "zona1", category: "hotel", priority: 8 },
    { id: 3, name: "Hotel Swiss Diamond", alias: ["swiss","diamond"], lat: 42.6599, lng: 21.1638, zone: "zona1", category: "hotel", priority: 9 },
    { id: 4, name: "Sheshi Nëna Terezë", alias: ["sheshi","qendra"], lat: 42.6629, lng: 21.1655, zone: "zona1", category: "square", priority: 10 },
    { id: 5, name: "Newborn Monument", alias: ["newborn"], lat: 42.6600, lng: 21.1600, zone: "zona1", category: "monument", priority: 10 },
    { id: 6, name: "Katedralja Nënë Tereza", alias: ["katedralja"], lat: 42.6593, lng: 21.1663, zone: "zona1", category: "religious", priority: 7 },
    { id: 7, name: "Dardania", alias: ["dardania"], lat: 42.6550, lng: 21.1600, zone: "zona2", category: "neighborhood", priority: 8 },
    { id: 8, name: "Rr. UÇK Dardani", alias: ["uck"], lat: 42.6550, lng: 21.1600, zone: "zona2", category: "street", priority: 7 },
    { id: 9, name: "Emerald Hotel", alias: ["emerald"], lat: 42.6545, lng: 21.1595, zone: "zona2", category: "hotel", priority: 8 },
    { id: 10, name: "Arbëria", alias: ["arberia"], lat: 42.6650, lng: 21.1550, zone: "zona4", category: "neighborhood", priority: 8 },
    { id: 11, name: "Pallati i Drejtësisë", alias: ["gjykata"], lat: 42.6655, lng: 21.1545, zone: "zona4", category: "institution", priority: 7 },
    { id: 12, name: "Kalabria", alias: ["kalabria"], lat: 42.6700, lng: 21.1850, zone: "zona5", category: "neighborhood", priority: 7 },
    { id: 13, name: "Albi Mall", alias: ["albi"], lat: 42.6620, lng: 21.1820, zone: "zona5", category: "shopping", priority: 10 },
    { id: 14, name: "Aeroporti Ndërkombëtar", alias: ["aeroporti","airport"], lat: 42.5728, lng: 21.0356, zone: "zona3", category: "airport", priority: 10 },
    { id: 15, name: "QKUK Spitali", alias: ["qkuk","spitali"], lat: 42.6420, lng: 21.1580, zone: "zona1", category: "hospital", priority: 10 },
    { id: 16, name: "Spitali Amerikan", alias: ["amerikan"], lat: 42.6450, lng: 21.1600, zone: "zona1", category: "hospital", priority: 8 },
    { id: 17, name: "Universiteti i Prishtinës", alias: ["up"], lat: 42.6550, lng: 21.1650, zone: "zona1", category: "university", priority: 8 },
    { id: 18, name: "Stacioni i Autobusëve", alias: ["stacioni"], lat: 42.6480, lng: 21.1560, zone: "zona1", category: "transport", priority: 9 },
    { id: 19, name: "Hotel Prishtina", alias: ["hotel prishtina"], lat: 42.6620, lng: 21.1640, zone: "zona1", category: "hotel", priority: 7 },
    { id: 20, name: "Hotel Victory", alias: ["victory"], lat: 42.6610, lng: 21.1630, zone: "zona1", category: "hotel", priority: 6 },
    { id: 21, name: "Bregu i Diellit", alias: ["bregu"], lat: 42.6500, lng: 21.1700, zone: "zona4", category: "neighborhood", priority: 6 },
    { id: 22, name: "Ulpiana", alias: ["ulpiana"], lat: 42.6580, lng: 21.1700, zone: "zona4", category: "neighborhood", priority: 6 },
    { id: 23, name: "Kodra e Diellit", alias: ["kodra"], lat: 42.6680, lng: 21.1690, zone: "zona4", category: "neighborhood", priority: 7 },
    { id: 24, name: "Pejton", alias: ["pejton"], lat: 42.6645, lng: 21.1650, zone: "zona1", category: "neighborhood", priority: 5 },
    { id: 25, name: "Tophane", alias: ["tophane"], lat: 42.6640, lng: 21.1670, zone: "zona1", category: "neighborhood", priority: 6 },
    { id: 26, name: "Prishtina Mall", alias: ["pr mall"], lat: 42.6350, lng: 21.1700, zone: "zona5", category: "shopping", priority: 9 },
    { id: 27, name: "Fushë Kosova", alias: ["fushe"], lat: 42.6350, lng: 21.0950, zone: "zona5", category: "city", priority: 8 },
    { id: 28, name: "Kuvendi i Kosovës", alias: ["kuvendi"], lat: 42.6630, lng: 21.1660, zone: "zona1", category: "institution", priority: 7 },
    { id: 29, name: "Qeveria e Kosovës", alias: ["qeveria"], lat: 42.6635, lng: 21.1665, zone: "zona1", category: "institution", priority: 7 },
    { id: 30, name: "Parku i Qytetit", alias: ["parku"], lat: 42.6650, lng: 21.1660, zone: "zona1", category: "park", priority: 5 }
];

const DB_ZONES = [
    { id: "zona1", name: "Zona 1 - Qendra", color: "#a855f7", tariff: 2.50, polygon: [[42.6680,21.1620],[42.6680,21.1700],[42.6600,21.1700],[42.6600,21.1620]] },
    { id: "zona2", name: "Zona 2 - Dardania", color: "#ec4899", tariff: 3.00, polygon: [[42.6580,21.1550],[42.6580,21.1650],[42.6480,21.1650],[42.6480,21.1550]] },
    { id: "zona3", name: "Zona 3 - Aeroporti", color: "#f59e0b", tariff: 15.00, polygon: [[42.5800,21.0300],[42.5800,21.0500],[42.5650,21.0500],[42.5650,21.0300]] },
    { id: "zona4", name: "Zona 4 - Arbëria", color: "#10b981", tariff: 3.00, polygon: [[42.6720,21.1480],[42.6720,21.1620],[42.6580,21.1620],[42.6580,21.1480]] },
    { id: "zona5", name: "Zona 5 - Kalabria", color: "#ef4444", tariff: 4.00, polygon: [[42.6800,21.1750],[42.6800,21.1950],[42.6300,21.1950],[42.6300,21.1750]] }
];

const DB_DRIVERS = [
    { id:1,  name:"Arben Krasniqi",   phone:"+383 44 111 001", vehicleId:1,  status:"available", mode:"free",      rating:4.9, trips:1245, lat:42.6629, lng:21.1655, avatar:"AK" },
    { id:2,  name:"Blerim Hoxha",     phone:"+383 44 111 002", vehicleId:2,  status:"busy",      mode:"taximeter", rating:4.8, trips:1102, lat:42.6600, lng:21.1630, avatar:"BH" },
    { id:3,  name:"Driton Berisha",   phone:"+383 44 111 003", vehicleId:3,  status:"available", mode:"free",      rating:4.9, trips:1534, lat:42.6550, lng:21.1600, avatar:"DB" },
    { id:4,  name:"Endrit Morina",    phone:"+383 44 111 004", vehicleId:4,  status:"break",     mode:"pause",     rating:4.7, trips:876,  lat:42.6650, lng:21.1550, avatar:"EM" },
    { id:5,  name:"Fisnik Gashi",     phone:"+383 44 111 005", vehicleId:5,  status:"available", mode:"free",      rating:4.9, trips:1876, lat:42.6580, lng:21.1700, avatar:"FG" },
    { id:6,  name:"Genc Rama",        phone:"+383 44 111 006", vehicleId:6,  status:"busy",      mode:"fixed",     rating:4.8, trips:965,  lat:42.6720, lng:21.1480, avatar:"GR" },
    { id:7,  name:"Hekuran Zeka",     phone:"+383 44 111 007", vehicleId:7,  status:"available", mode:"free",      rating:4.6, trips:654,  lat:42.6800, lng:21.1800, avatar:"HZ" },
    { id:8,  name:"Ilir Thaçi",       phone:"+383 44 111 008", vehicleId:8,  status:"offline",   mode:"inactive",  rating:4.8, trips:1320, lat:42.5728, lng:21.0356, avatar:"IT" },
    { id:9,  name:"Jeton Bytyqi",     phone:"+383 44 111 009", vehicleId:9,  status:"busy",      mode:"taximeter", rating:4.9, trips:1654, lat:42.6630, lng:21.1650, avatar:"JB" },
    { id:10, name:"Kreshnik Dema",    phone:"+383 44 111 010", vehicleId:10, status:"busy",      mode:"fixed",     rating:4.7, trips:890,  lat:42.6580, lng:21.1620, avatar:"KD" },
    { id:11, name:"Luan Ahmeti",      phone:"+383 44 111 011", vehicleId:11, status:"available", mode:"free",      rating:4.8, trips:1120, lat:42.6560, lng:21.1590, avatar:"LA" },
    { id:12, name:"Mentor Bekteshi",  phone:"+383 44 111 012", vehicleId:12, status:"available", mode:"free",      rating:4.9, trips:1450, lat:42.6660, lng:21.1540, avatar:"MB" },
    { id:13, name:"Naim Shala",       phone:"+383 44 111 013", vehicleId:13, status:"offline",   mode:"inactive",  rating:4.6, trips:540,  lat:42.6640, lng:21.1530, avatar:"NS" },
    { id:14, name:"Osman Krasniqi",   phone:"+383 44 111 014", vehicleId:14, status:"busy",      mode:"taximeter", rating:4.8, trips:1230, lat:42.6700, lng:21.1850, avatar:"OK" },
    { id:15, name:"Petrit Berisha",   phone:"+383 44 111 015", vehicleId:15, status:"available", mode:"free",      rating:4.9, trips:1780, lat:42.6600, lng:21.1620, avatar:"PB" },
    { id:16, name:"Qendrim Rexha",    phone:"+383 44 111 016", vehicleId:16, status:"busy",      mode:"fixed",     rating:4.7, trips:780,  lat:42.6570, lng:21.1640, avatar:"QR" },
    { id:17, name:"Rrahim Hoxha",     phone:"+383 44 111 017", vehicleId:17, status:"break",     mode:"pause",     rating:4.8, trips:1340, lat:42.6630, lng:21.1660, avatar:"RH" },
    { id:18, name:"Sami Berisha",     phone:"+383 44 111 018", vehicleId:18, status:"available", mode:"free",      rating:4.9, trips:1560, lat:42.6650, lng:21.1520, avatar:"SB" },
    { id:19, name:"Trim Gashi",       phone:"+383 44 111 019", vehicleId:19, status:"offline",   mode:"inactive",  rating:4.5, trips:420,  lat:42.6800, lng:21.1900, avatar:"TG" },
    { id:20, name:"Urim Morina",      phone:"+383 44 111 020", vehicleId:20, status:"busy",      mode:"taximeter", rating:4.8, trips:990,  lat:42.5728, lng:21.0356, avatar:"UM" }
];

const DB_VEHICLES = [
    { id:1,  plate:"01-123-AB", model:"Skoda Octavia",   driver:1  },
    { id:2,  plate:"01-124-CD", model:"Toyota Corolla",  driver:2  },
    { id:3,  plate:"01-125-EF", model:"VW Passat",       driver:3  },
    { id:4,  plate:"01-126-GH", model:"Skoda Superb",    driver:4  },
    { id:5,  plate:"01-127-IJ", model:"Mercedes E-Class",driver:5  },
    { id:6,  plate:"01-128-KL", model:"Toyota Prius",    driver:6  },
    { id:7,  plate:"01-129-MN", model:"Renault Clio",    driver:7  },
    { id:8,  plate:"01-130-OP", model:"Peugeot 508",     driver:8  },
    { id:9,  plate:"01-131-QR", model:"Toyota Camry",    driver:9  },
    { id:10, plate:"01-132-ST", model:"Hyundai Elantra", driver:10 },
    { id:11, plate:"01-133-UV", model:"Ford Mondeo",     driver:11 },
    { id:12, plate:"01-134-WX", model:"VW Arteon",       driver:12 },
    { id:13, plate:"01-135-YZ", model:"Kia Optima",      driver:13 },
    { id:14, plate:"01-136-AA", model:"Renault Talisman",driver:14 },
    { id:15, plate:"01-137-BB", model:"BMW 5 Series",    driver:15 },
    { id:16, plate:"01-138-CC", model:"Audi A6",         driver:16 },
    { id:17, plate:"01-139-DD", model:"Mazda 6",         driver:17 },
    { id:18, plate:"01-140-EE", model:"Ford Galaxy",     driver:18 },
    { id:19, plate:"01-141-FF", model:"VW Transporter",  driver:19 },
    { id:20, plate:"01-142-GG", model:"Mercedes Vito",   driver:20 }
];

const DB_CONFIG = {
    mapCenter: [42.6629, 21.1655],
    mapZoom: 13
};

const DB_ADDRESS_CATEGORIES = {
    hotel:        { label: "Hotel",          icon: "fa-hotel",              color: "#ec4899" },
    restaurant:   { label: "Restorant",      icon: "fa-utensils",           color: "#f59e0b" },
    shopping:     { label: "Qendër Tregtare",icon: "fa-bag-shopping",       color: "#06b6d4" },
    hospital:     { label: "Spital",         icon: "fa-hospital",           color: "#ef4444" },
    university:   { label: "Universitet",    icon: "fa-graduation-cap",     color: "#3b82f6" },
    transport:    { label: "Transport",      icon: "fa-bus",                color: "#f59e0b" },
    airport:      { label: "Aeroport",       icon: "fa-plane",              color: "#a855f7" },
    institution:  { label: "Institucion",    icon: "fa-building-columns",   color: "#8b5cf6" },
    monument:     { label: "Monument",       icon: "fa-monument",           color: "#f59e0b" },
    park:         { label: "Park",           icon: "fa-tree",               color: "#10b981" },
    neighborhood: { label: "Lagje",          icon: "fa-location-dot",       color: "#3b82f6" },
    street:       { label: "Rrugë",          icon: "fa-road",               color: "#6b7280" },
    city:         { label: "Qytet",          icon: "fa-city",               color: "#8b5cf6" },
    religious:    { label: "Fetar",          icon: "fa-church",             color: "#f59e0b" },
    square:       { label: "Shesh",          icon: "fa-location-crosshairs",color: "#06b6d4" }
};

window.TaxiData = {
    addresses: DB_ADDRESSES,
    zones: DB_ZONES,
    drivers: DB_DRIVERS,
    vehicles: DB_VEHICLES,
    config: DB_CONFIG,
    addressCategories: DB_ADDRESS_CATEGORIES,
    searchAddresses: (q) => {
        if (!q || q.length < 2) return [];
        const s = q.toLowerCase().trim();
        return DB_ADDRESSES
            .filter(a => a.name.toLowerCase().includes(s) || a.alias.some(al => al.toLowerCase().includes(s)))
            .sort((a,b) => b.priority - a.priority)
            .slice(0, 8);
    }
};

console.log('✅ data.js u ngarkua: ' + DB_ADDRESSES.length + ' adresa, ' + DB_DRIVERS.length + ' shoferë');

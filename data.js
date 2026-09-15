/* ═══════════════════════════════════════════════════════
   TaxiDispatch Pro - Database Module
   ═══════════════════════════════════════════════════════ */

'use strict';

// ═══ ADRESAT ═══
const DB_ADDRESSES = [
    { id: 1, name: "Grand Hotel Prishtina", alias: ["grandi", "grand", "grand hotel"], lat: 42.6629, lng: 21.1655, zone: "zona1", category: "hotel", priority: 10 },
    { id: 2, name: "Hotel Sirius", alias: ["sirius"], lat: 42.6608, lng: 21.1645, zone: "zona1", category: "hotel", priority: 8 },
    { id: 3, name: "Hotel Swiss Diamond", alias: ["swiss", "diamond"], lat: 42.6599, lng: 21.1638, zone: "zona1", category: "hotel", priority: 9 },
    { id: 4, name: "Sheshi Nëna Terezë", alias: ["sheshi", "nena tereza", "qendra"], lat: 42.6629, lng: 21.1655, zone: "zona1", category: "square", priority: 10 },
    { id: 5, name: "Newborn Monument", alias: ["newborn", "new born", "monumenti"], lat: 42.6600, lng: 21.1600, zone: "zona1", category: "monument", priority: 10 },
    { id: 6, name: "Katedralja Nënë Tereza", alias: ["katedralja", "katedrale"], lat: 42.6593, lng: 21.1663, zone: "zona1", category: "religious", priority: 7 },
    { id: 7, name: "Kosovo Museum", alias: ["muzeu", "museum"], lat: 42.6629, lng: 21.1655, zone: "zona1", category: "museum", priority: 5 },
    { id: 8, name: "Teatri Kombëtar", alias: ["teatri", "teater"], lat: 42.6629, lng: 21.1655, zone: "zona1", category: "culture", priority: 6 },
    { id: 9, name: "Biblioteka Kombëtare", alias: ["biblioteka", "library"], lat: 42.6629, lng: 21.1655, zone: "zona1", category: "culture", priority: 6 },
    { id: 10, name: "Pallati i Rinisë dhe Sporteve", alias: ["pallati i rinise", "pallati"], lat: 42.6629, lng: 21.1655, zone: "zona1", category: "sport", priority: 7 },
    { id: 11, name: "Dardania", alias: ["dardania", "dardani"], lat: 42.6550, lng: 21.1600, zone: "zona2", category: "neighborhood", priority: 8 },
    { id: 12, name: "Rr. UÇK Dardani", alias: ["uck dardani", "uck"], lat: 42.6550, lng: 21.1600, zone: "zona2", category: "street", priority: 7 },
    { id: 13, name: "Qendra Tregtare Dardania", alias: ["qendra dardania"], lat: 42.6550, lng: 21.1600, zone: "zona2", category: "shopping", priority: 6 },
    { id: 14, name: "Restorant Renaissance", alias: ["renaissance", "renesanca"], lat: 42.6548, lng: 21.1598, zone: "zona2", category: "restaurant", priority: 5 },
    { id: 15, name: "Emerald Hotel", alias: ["emerald"], lat: 42.6545, lng: 21.1595, zone: "zona2", category: "hotel", priority: 8 },
    { id: 16, name: "Arbëria", alias: ["arberia", "arberi"], lat: 42.6650, lng: 21.1550, zone: "zona4", category: "neighborhood", priority: 8 },
    { id: 17, name: "Rr. UÇK Arbëri", alias: ["uck arberi"], lat: 42.6650, lng: 21.1550, zone: "zona4", category: "street", priority: 6 },
    { id: 18, name: "Pallati i Drejtësisë", alias: ["pallati drejtesise", "gjykata"], lat: 42.6655, lng: 21.1545, zone: "zona4", category: "institution", priority: 7 },
    { id: 19, name: "Hotel Garden", alias: ["garden"], lat: 42.6648, lng: 21.1552, zone: "zona4", category: "hotel", priority: 5 },
    { id: 20, name: "Kalabria", alias: ["kalabria"], lat: 42.6700, lng: 21.1850, zone: "zona5", category: "neighborhood", priority: 7 },
    { id: 21, name: "Qendra Tregtare Kalabria", alias: ["kalabria mall"], lat: 42.6702, lng: 21.1852, zone: "zona5", category: "shopping", priority: 8 },
    { id: 22, name: "Albi Mall", alias: ["albi", "albi mall"], lat: 42.6620, lng: 21.1820, zone: "zona5", category: "shopping", priority: 10 },
    { id: 23, name: "Kika", alias: ["kika"], lat: 42.6630, lng: 21.1830, zone: "zona5", category: "shopping", priority: 6 },
    { id: 24, name: "Aeroporti Ndërkombëtar i Prishtinës", alias: ["aeroporti", "airport", "adernica", "adernic"], lat: 42.5728, lng: 21.0356, zone: "zona3", category: "airport", priority: 10 },
    { id: 25, name: "Terminali i Aeroportit", alias: ["terminali", "terminal"], lat: 42.5728, lng: 21.0356, zone: "zona3", category: "airport", priority: 9 },
    { id: 26, name: "Parkingu i Aeroportit", alias: ["parkingu aeroport"], lat: 42.5728, lng: 21.0356, zone: "zona3", category: "parking", priority: 5 },
    { id: 27, name: "Hotel Aeroport", alias: ["hotel aeroport"], lat: 42.5730, lng: 21.0358, zone: "zona3", category: "hotel", priority: 5 },
    { id: 28, name: "QKUK - Qendra Klinike Universitare", alias: ["qkuk", "spitali", "spital"], lat: 42.6420, lng: 21.1580, zone: "zona1", category: "hospital", priority: 10 },
    { id: 29, name: "Spitali Amerikan", alias: ["spitali amerikan", "american hospital"], lat: 42.6450, lng: 21.1600, zone: "zona1", category: "hospital", priority: 8 },
    { id: 30, name: "Spitali i Fëmijëve", alias: ["spitali femijeve"], lat: 42.6425, lng: 21.1585, zone: "zona1", category: "hospital", priority: 7 },
    { id: 31, name: "Klinika Universitare Stomatologjike", alias: ["stomatologjia"], lat: 42.6430, lng: 21.1590, zone: "zona1", category: "hospital", priority: 5 },
    { id: 32, name: "Instituti i Shëndetit Publik", alias: ["instituti shendetit"], lat: 42.6440, lng: 21.1575, zone: "zona1", category: "institution", priority: 5 },
    { id: 33, name: "Universiteti i Prishtinës", alias: ["up", "universiteti"], lat: 42.6550, lng: 21.1650, zone: "zona1", category: "university", priority: 8 },
    { id: 34, name: "Fakulteti Teknik", alias: ["fakulteti teknik"], lat: 42.6555, lng: 21.1655, zone: "zona1", category: "university", priority: 6 },
    { id: 35, name: "Fakulteti i Mjekësisë", alias: ["fakulteti mjekesise", "mjekesia"], lat: 42.6425, lng: 21.1585, zone: "zona1", category: "university", priority: 7 },
    { id: 36, name: "Fakulteti Ekonomik", alias: ["fakulteti ekonomik", "ekonomiku"], lat: 42.6560, lng: 21.1660, zone: "zona1", category: "university", priority: 6 },
    { id: 37, name: "Gjimnazi Sami Frashëri", alias: ["sami frashri", "gjimnazi"], lat: 42.6565, lng: 21.1665, zone: "zona1", category: "school", priority: 5 },
    { id: 38, name: "Stacioni i Autobusëve", alias: ["stacioni autobuseve", "autobuset"], lat: 42.6480, lng: 21.1560, zone: "zona1", category: "transport", priority: 9 },
    { id: 39, name: "Stacioni i Trenit", alias: ["stacioni trenit", "treni"], lat: 42.6490, lng: 21.1570, zone: "zona1", category: "transport", priority: 7 },
    { id: 40, name: "Hotel Prishtina", alias: ["hotel prishtina"], lat: 42.6620, lng: 21.1640, zone: "zona1", category: "hotel", priority: 7 },
    { id: 41, name: "Hotel Victory", alias: ["victory"], lat: 42.6610, lng: 21.1630, zone: "zona1", category: "hotel", priority: 6 },
    { id: 42, name: "Hotel Begolli", alias: ["begolli"], lat: 42.6630, lng: 21.1650, zone: "zona1", category: "hotel", priority: 5 },
    { id: 43, name: "Restorant Kulla", alias: ["kulla"], lat: 42.6600, lng: 21.1620, zone: "zona1", category: "restaurant", priority: 5 },
    { id: 44, name: "Restorant Shaban", alias: ["shaban"], lat: 42.6590, lng: 21.1610, zone: "zona1", category: "restaurant", priority: 5 },
    { id: 45, name: "Bregu i Diellit", alias: ["bregu diellit", "bregu"], lat: 42.6500, lng: 21.1700, zone: "zona4", category: "neighborhood", priority: 6 },
    { id: 46, name: "Ulpiana", alias: ["ulpiana"], lat: 42.6580, lng: 21.1700, zone: "zona4", category: "neighborhood", priority: 6 },
    { id: 47, name: "Lakrishte", alias: ["lakrishte"], lat: 42.6600, lng: 21.1720, zone: "zona4", category: "neighborhood", priority: 6 },
    { id: 48, name: "Velania", alias: ["velania"], lat: 42.6610, lng: 21.1690, zone: "zona4", category: "neighborhood", priority: 5 },
    { id: 49, name: "Tophane", alias: ["tophane"], lat: 42.6640, lng: 21.1670, zone: "zona1", category: "neighborhood", priority: 6 },
    { id: 50, name: "Kodra e Diellit", alias: ["kodra diellit"], lat: 42.6680, lng: 21.1690, zone: "zona4", category: "neighborhood", priority: 7 },
    { id: 51, name: "Mati 1", alias: ["mati 1", "mati"], lat: 42.6700, lng: 21.1700, zone: "zona2", category: "neighborhood", priority: 6 },
    { id: 52, name: "Pejton", alias: ["pejton"], lat: 42.6645, lng: 21.1650, zone: "zona1", category: "neighborhood", priority: 5 },
    { id: 53, name: "Sunny Hill", alias: ["sunny hill", "sunny"], lat: 42.6610, lng: 21.1550, zone: "zona4", category: "neighborhood", priority: 5 },
    { id: 54, name: "Kolonë", alias: ["kolone"], lat: 42.6670, lng: 21.1720, zone: "zona2", category: "neighborhood", priority: 5 },
    { id: 55, name: "Taslixhe", alias: ["taslixhe"], lat: 42.6680, lng: 21.1730, zone: "zona2", category: "neighborhood", priority: 5 },
    { id: 56, name: "Zona Industriale", alias: ["zona industriale", "industriale"], lat: 42.6450, lng: 21.1800, zone: "zona5", category: "industrial", priority: 5 },
    { id: 57, name: "Fushë Kosova", alias: ["fushe kosova", "fushe"], lat: 42.6350, lng: 21.0950, zone: "zona5", category: "city", priority: 8 },
    { id: 58, name: "Kastriot", alias: ["kastrioti"], lat: 42.6400, lng: 21.1500, zone: "zona3", category: "neighborhood", priority: 5 },
    { id: 59, name: "Bardhosh", alias: ["bardhosh"], lat: 42.6550, lng: 21.1300, zone: "zona3", category: "neighborhood", priority: 5 },
    { id: 60, name: "Prishtina Mall", alias: ["prishtina mall", "pr mall"], lat: 42.6350, lng: 21.1700, zone: "zona5", category: "shopping", priority: 9 },
    { id: 61, name: "Royal Mall", alias: ["royal mall", "royal"], lat: 42.6300, lng: 21.1800, zone: "zona5", category: "shopping", priority: 7 },
    { id: 62, name: "Grand Store", alias: ["grand store"], lat: 42.6600, lng: 21.1620, zone: "zona1", category: "shopping", priority: 5 },
    { id: 63, name: "Interex", alias: ["interex"], lat: 42.6620, lng: 21.1650, zone: "zona1", category: "shopping", priority: 5 },
    { id: 64, name: "Viva Fresh", alias: ["viva fresh", "viva"], lat: 42.6580, lng: 21.1630, zone: "zona1", category: "shopping", priority: 5 },
    { id: 65, name: "Emona Center", alias: ["emona"], lat: 42.6590, lng: 21.1640, zone: "zona1", category: "shopping", priority: 5 },
    { id: 66, name: "Parku i Qytetit", alias: ["parku qytetit", "parku"], lat: 42.6650, lng: 21.1660, zone: "zona1", category: "park", priority: 5 },
    { id: 67, name: "Parku Tauk Bahçe", alias: ["tauk bahce"], lat: 42.6640, lng: 21.1670, zone: "zona1", category: "park", priority: 4 },
    { id: 68, name: "Parku i Gërmisë", alias: ["germia", "gërmia"], lat: 42.6700, lng: 21.1900, zone: "zona4", category: "park", priority: 6 },
    { id: 69, name: "Kuvendi i Kosovës", alias: ["kuvendi", "parlament"], lat: 42.6630, lng: 21.1660, zone: "zona1", category: "institution", priority: 7 },
    { id: 70, name: "Qeveria e Kosovës", alias: ["qeveria", "government"], lat: 42.6635, lng: 21.1665, zone: "zona1", category: "institution", priority: 7 },
    { id: 71, name: "Presidenca", alias: ["presidenca", "president"], lat: 42.6640, lng: 21.1670, zone: "zona1", category: "institution", priority: 6 },
    { id: 72, name: "Komuna e Prishtinës", alias: ["komuna", "municipality"], lat: 42.6630, lng: 21.1655, zone: "zona1", category: "institution", priority: 6 }
];

// ═══ ZONAT ═══
const DB_ZONES = [
    { id: "zona1", name: "Zona 1 - Qendra", color: "#a855f7", tariff: 2.50, description: "Qendra, Sheshi, Pejton, Tophane", backupZones: ["zona2", "zona4"], polygon: [[42.6680, 21.1620], [42.6680, 21.1700], [42.6600, 21.1700], [42.6600, 21.1620]], active: true, priority: 1 },
    { id: "zona2", name: "Zona 2 - Dardania", color: "#ec4899", tariff: 3.00, description: "Dardania, Mati, Kolonë, Taslixhe", backupZones: ["zona1", "zona4"], polygon: [[42.6580, 21.1550], [42.6580, 21.1650], [42.6480, 21.1650], [42.6480, 21.1550]], active: true, priority: 2 },
    { id: "zona3", name: "Zona 3 - Aeroporti", color: "#f59e0b", tariff: 15.00, description: "Aeroporti, Kastrioti, Bardhoshi", backupZones: ["zona5"], polygon: [[42.5800, 21.0300], [42.5800, 21.0500], [42.5650, 21.0500], [42.5650, 21.0300]], active: true, priority: 3 },
    { id: "zona4", name: "Zona 4 - Arbëria", color: "#10b981", tariff: 3.00, description: "Arbëria, Bregu i Diellit, Ulpiana", backupZones: ["zona1", "zona2"], polygon: [[42.6720, 21.1480], [42.6720, 21.1620], [42.6580, 21.1620], [42.6580, 21.1480]], active: true, priority: 2 },
    { id: "zona5", name: "Zona 5 - Kalabria", color: "#ef4444", tariff: 4.00, description: "Kalabria, Albi Mall, Zona Industriale", backupZones: ["zona1", "zona2"], polygon: [[42.6800, 21.1750], [42.6800, 21.1950], [42.6300, 21.1950], [42.6300, 21.1750]], active: true, priority: 3 }
];

// ═══ SHOFERËT (me mode të re: free, taximeter, fixed, pause, inactive) ═══
const DB_DRIVERS = [
    { id: 1, name: "Arben Krasniqi", phone: "+383 44 111 001", vehicleId: 1, status: "available", mode: "free", rating: 4.9, trips: 1245, lat: 42.6629, lng: 21.1655, zone: "zona1", avatar: "AK" },
    { id: 2, name: "Blerim Hoxha", phone: "+383 44 111 002", vehicleId: 2, status: "busy", mode: "taximeter", rating: 4.8, trips: 1102, lat: 42.6600, lng: 21.1630, zone: "zona1", avatar: "BH" },
    { id: 3, name: "Driton Berisha", phone: "+383 44 111 003", vehicleId: 3, status: "available", mode: "free", rating: 4.9, trips: 1534, lat: 42.6550, lng: 21.1600, zone: "zona2", avatar: "DB" },
    { id: 4, name: "Endrit Morina", phone: "+383 44 111 004", vehicleId: 4, status: "break", mode: "pause", rating: 4.7, trips: 876, lat: 42.6650, lng: 21.1550, zone: "zona4", avatar: "EM" },
    { id: 5, name: "Fisnik Gashi", phone: "+383 44 111 005", vehicleId: 5, status: "available", mode: "free", rating: 4.9, trips: 1876, lat: 42.6580, lng: 21.1700, zone: "zona4", avatar: "FG" },
    { id: 6, name: "Genc Rama", phone: "+383 44 111 006", vehicleId: 6, status: "busy", mode: "fixed", rating: 4.8, trips: 965, lat: 42.6720, lng: 21.1480, zone: "zona4", avatar: "GR" },
    { id: 7, name: "Hekuran Zeka", phone: "+383 44 111 007", vehicleId: 7, status: "available", mode: "free", rating: 4.6, trips: 654, lat: 42.6800, lng: 21.1800, zone: "zona5", avatar: "HZ" },
    { id: 8, name: "Ilir Thaçi", phone: "+383 44 111 008", vehicleId: 8, status: "offline", mode: "inactive", rating: 4.8, trips: 1320, lat: 42.5728, lng: 21.0356, zone: "zona3", avatar: "IT" },
    { id: 9, name: "Jeton Bytyqi", phone: "+383 44 111 009", vehicleId: 9, status: "busy", mode: "taximeter", rating: 4.9, trips: 1654, lat: 42.6630, lng: 21.1650, zone: "zona1", avatar: "JB" },
    { id: 10, name: "Kreshnik Dema", phone: "+383 44 111 010", vehicleId: 10, status: "busy", mode: "fixed", rating: 4.7, trips: 890, lat: 42.6580, lng: 21.1620, zone: "zona1", avatar: "KD" },
    { id: 11, name: "Luan Ahmeti", phone: "+383 44 111 011", vehicleId: 11, status: "available", mode: "free", rating: 4.8, trips: 1120, lat: 42.6560, lng: 21.1590, zone: "zona2", avatar: "LA" },
    { id: 12, name: "Mentor Bekteshi", phone: "+383 44 111 012", vehicleId: 12, status: "available", mode: "free", rating: 4.9, trips: 1450, lat: 42.6660, lng: 21.1540, zone: "zona4", avatar: "MB" },
    { id: 13, name: "Naim Shala", phone: "+383 44 111 013", vehicleId: 13, status: "offline", mode: "inactive", rating: 4.6, trips: 540, lat: 42.6640, lng: 21.1530, zone: "zona4", avatar: "NS" },
    { id: 14, name: "Osman Krasniqi", phone: "+383 44 111 014", vehicleId: 14, status: "busy", mode: "taximeter", rating: 4.8, trips: 1230, lat: 42.6700, lng: 21.1850, zone: "zona5", avatar: "OK" },
    { id: 15, name: "Petrit Berisha", phone: "+383 44 111 015", vehicleId: 15, status: "available", mode: "free", rating: 4.9, trips: 1780, lat: 42.6600, lng: 21.1620, zone: "zona1", avatar: "PB" },
    { id: 16, name: "Qendrim Rexha", phone: "+383 44 111 016", vehicleId: 16, status: "busy", mode: "fixed", rating: 4.7, trips: 780, lat: 42.6570, lng: 21.1640, zone: "zona2", avatar: "QR" },
    { id: 17, name: "Rrahim Hoxha", phone: "+383 44 111 017", vehicleId: 17, status: "break", mode: "pause", rating: 4.8, trips: 1340, lat: 42.6630, lng: 21.1660, zone: "zona1", avatar: "RH" },
    { id: 18, name: "Sami Berisha", phone: "+383 44 111 018", vehicleId: 18, status: "available", mode: "free", rating: 4.9, trips: 1560, lat: 42.6650, lng: 21.1520, zone: "zona4", avatar: "SB" },
    { id: 19, name: "Trim Gashi", phone: "+383 44 111 019", vehicleId: 19, status: "offline", mode: "inactive", rating: 4.5, trips: 420, lat: 42.6800, lng: 21.1900, zone: "zona5", avatar: "TG" },
    { id: 20, name: "Urim Morina", phone: "+383 44 111 020", vehicleId: 20, status: "busy", mode: "taximeter", rating: 4.8, trips: 990, lat: 42.5728, lng: 21.0356, zone: "zona3", avatar: "UM" }
];

// ═══ VETURAT ═══
const DB_VEHICLES = [
    { id: 1, plate: "01-123-AB", model: "Skoda Octavia", year: 2020, color: "E bardhë", driver: 1, category: "standard", fuel: 78, mileage: 145230 },
    { id: 2, plate: "01-124-CD", model: "Toyota Corolla", year: 2021, color: "E zezë", driver: 2, category: "standard", fuel: 62, mileage: 98050 },
    { id: 3, plate: "01-125-EF", model: "Volkswagen Passat", year: 2019, color: "Gri", driver: 3, category: "vip", fuel: 45, mileage: 187650 },
    { id: 4, plate: "01-126-GH", model: "Skoda Superb", year: 2022, color: "E zezë", driver: 4, category: "vip", fuel: 91, mileage: 45200 },
    { id: 5, plate: "01-127-IJ", model: "Mercedes E-Class", year: 2020, color: "E bardhë", driver: 5, category: "vip", fuel: 55, mileage: 112340 },
    { id: 6, plate: "01-128-KL", model: "Toyota Prius", year: 2021, color: "Blu", driver: 6, category: "standard", fuel: 70, mileage: 78500 },
    { id: 7, plate: "01-129-MN", model: "Renault Clio", year: 2018, color: "E kuqe", driver: 7, category: "standard", fuel: 30, mileage: 210500 },
    { id: 8, plate: "01-130-OP", model: "Peugeot 508", year: 2020, color: "Gri", driver: 8, category: "standard", fuel: 82, mileage: 95000 },
    { id: 9, plate: "01-131-QR", model: "Toyota Camry", year: 2021, color: "E bardhë", driver: 9, category: "vip", fuel: 65, mileage: 72000 },
    { id: 10, plate: "01-132-ST", model: "Hyundai Elantra", year: 2020, color: "Blu", driver: 10, category: "standard", fuel: 48, mileage: 105600 },
    { id: 11, plate: "01-133-UV", model: "Ford Mondeo", year: 2019, color: "E zezë", driver: 11, category: "standard", fuel: 88, mileage: 132400 },
    { id: 12, plate: "01-134-WX", model: "Volkswagen Arteon", year: 2022, color: "E bardhë", driver: 12, category: "vip", fuel: 95, mileage: 38000 },
    { id: 13, plate: "01-135-YZ", model: "Kia Optima", year: 2019, color: "Gri", driver: 13, category: "standard", fuel: 55, mileage: 145000 },
    { id: 14, plate: "01-136-AA", model: "Renault Talisman", year: 2020, color: "E zezë", driver: 14, category: "standard", fuel: 72, mileage: 118000 },
    { id: 15, plate: "01-137-BB", model: "BMW 5 Series", year: 2021, color: "E bardhë", driver: 15, category: "vip", fuel: 80, mileage: 65000 },
    { id: 16, plate: "01-138-CC", model: "Audi A6", year: 2020, color: "E zezë", driver: 16, category: "vip", fuel: 68, mileage: 89000 },
    { id: 17, plate: "01-139-DD", model: "Mazda 6", year: 2019, color: "E kuqe", driver: 17, category: "standard", fuel: 42, mileage: 156000 },
    { id: 18, plate: "01-140-EE", model: "Ford Galaxy", year: 2018, color: "Gri", driver: 18, category: "van", fuel: 58, mileage: 198000 },
    { id: 19, plate: "01-141-FF", model: "Volkswagen Transporter", year: 2020, color: "E bardhë", driver: 19, category: "van", fuel: 85, mileage: 175000 },
    { id: 20, plate: "01-142-GG", model: "Mercedes Vito", year: 2021, color: "Gri", driver: 20, category: "van", fuel: 90, mileage: 92000 }
];

// ═══ PIKAT E PARKIMIT ═══
const DB_PARKING_POINTS = [
    { id: 1, name: "Parking Sheshi", lat: 42.6629, lng: 21.1655, zone: "zona1", capacity: 8, occupied: 3 },
    { id: 2, name: "Parking Grand", lat: 42.6635, lng: 21.1660, zone: "zona1", capacity: 5, occupied: 2 },
    { id: 3, name: "Parking Dardania", lat: 42.6550, lng: 21.1600, zone: "zona2", capacity: 6, occupied: 1 },
    { id: 4, name: "Parking Albi Mall", lat: 42.6620, lng: 21.1820, zone: "zona5", capacity: 10, occupied: 5 },
    { id: 5, name: "Parking Aeroport", lat: 42.5728, lng: 21.0356, zone: "zona3", capacity: 15, occupied: 8 }
];

// ═══ TARIFAT ═══
const DB_TARIFFS = [
    { id: "standard", name: "Standard", base: 2.50, perKm: 0.80, minFare: 3.00 },
    { id: "vip", name: "VIP", base: 5.00, perKm: 1.20, minFare: 6.00 },
    { id: "airport", name: "Aeroport", base: 15.00, perKm: 0.50, minFare: 15.00 },
    { id: "night", name: "Natë", base: 3.50, perKm: 1.00, minFare: 4.50 },
    { id: "van", name: "Van", base: 4.00, perKm: 1.00, minFare: 5.00 }
];

// ═══ KONFIGURIMET ═══
const DB_CONFIG = {
    companyName: "TaxiDispatch Pro",
    companyPhone: "+383 38 123 456",
    currency: "EUR",
    currencySymbol: "€",
    language: "sq",
    mapCenter: [42.6629, 21.1655],
    mapZoom: 13
};

// ═══ STATUSET ═══
const DB_ORDER_STATUSES = {
    new: { label: "E Re", color: "#a855f7", icon: "fa-bolt" },
    pending: { label: "Në Pritje", color: "#f59e0b", icon: "fa-hourglass-half" },
    assigned: { label: "E Caktuar", color: "#8b5cf6", icon: "fa-user-check" },
    onroute: { label: "Në Rrugë", color: "#3b82f6", icon: "fa-route" },
    completed: { label: "Përfunduar", color: "#22c55e", icon: "fa-check" },
    cancelled: { label: "Anuluar", color: "#6b7280", icon: "fa-xmark" },
    delay: { label: "Vonesë", color: "#f43f5e", icon: "fa-clock" }
};

// ═══ KATEGORITË ═══
const DB_ADDRESS_CATEGORIES = {
    hotel: { label: "Hotel", icon: "fa-hotel", color: "#ec4899" },
    restaurant: { label: "Restorant", icon: "fa-utensils", color: "#f59e0b" },
    shopping: { label: "Qendër Tregtare", icon: "fa-bag-shopping", color: "#06b6d4" },
    hospital: { label: "Spital", icon: "fa-hospital", color: "#ef4444" },
    university: { label: "Universitet", icon: "fa-graduation-cap", color: "#3b82f6" },
    school: { label: "Shkollë", icon: "fa-school", color: "#10b981" },
    transport: { label: "Transport", icon: "fa-bus", color: "#f59e0b" },
    airport: { label: "Aeroport", icon: "fa-plane", color: "#a855f7" },
    institution: { label: "Institucion", icon: "fa-building-columns", color: "#8b5cf6" },
    monument: { label: "Monument", icon: "fa-monument", color: "#f59e0b" },
    park: { label: "Park", icon: "fa-tree", color: "#10b981" },
    neighborhood: { label: "Lagje", icon: "fa-location-dot", color: "#3b82f6" },
    street: { label: "Rrugë", icon: "fa-road", color: "#6b7280" },
    city: { label: "Qytet", icon: "fa-city", color: "#8b5cf6" },
    religious: { label: "Fetar", icon: "fa-church", color: "#f59e0b" },
    culture: { label: "Kulturë", icon: "fa-masks-theater", color: "#ec4899" },
    sport: { label: "Sport", icon: "fa-futbol", color: "#10b981" },
    museum: { label: "Muze", icon: "fa-landmark", color: "#8b5cf6" },
    square: { label: "Shesh", icon: "fa-location-crosshairs", color: "#06b6d4" },
    industrial: { label: "Industrial", icon: "fa-industry", color: "#6b7280" },
    parking: { label: "Parking", icon: "fa-square-parking", color: "#3b82f6" }
};

// ═══ EKSPORT ═══
window.TaxiData = {
    addresses: DB_ADDRESSES,
    zones: DB_ZONES,
    drivers: DB_DRIVERS,
    vehicles: DB_VEHICLES,
    parkingPoints: DB_PARKING_POINTS,
    tariffs: DB_TARIFFS,
    config: DB_CONFIG,
    orderStatuses: DB_ORDER_STATUSES,
    addressCategories: DB_ADDRESS_CATEGORIES,

    getDriverById: (id) => DB_DRIVERS.find(d => d.id === id),
    getVehicleById: (id) => DB_VEHICLES.find(v => v.id === id),
    getZoneById: (id) => DB_ZONES.find(z => z.id === id),

    searchAddresses: (query) => {
        if (!query || query.length < 2) return [];
        const q = query.toLowerCase().trim();
        return DB_ADDRESSES
            .filter(a => a.name.toLowerCase().includes(q) || a.alias.some(al => al.toLowerCase().includes(q)))
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 8);
    }
};

console.log('%c🚕 TaxiDispatch Data Loaded', 'color:#a855f7;font-weight:bold;');

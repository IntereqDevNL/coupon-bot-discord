const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./coupons.db');

// This script initializes the database.
// Run this ONCE (node setup_db.js).

db.serialize(() => {
    // 1. Create the coupons table
    db.run(`CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        claimed_by TEXT DEFAULT NULL
    )`);

    // 2. Create the stats table (New)
    // This table will only ever have 1 row (id=1) that tracks the total count.
    db.run(`CREATE TABLE IF NOT EXISTS bot_stats (
        id INTEGER PRIMARY KEY,
        total_coupons_given INTEGER DEFAULT 0
    )`);

    // Initialize the stats counter at 0 if it doesn't exist
    db.run(`INSERT OR IGNORE INTO bot_stats (id, total_coupons_given) VALUES (1, 0)`);

    console.log("Database tables verified.");

    // 3. Insert dummy coupons
    const stmt = db.prepare("INSERT OR IGNORE INTO coupons (code) VALUES (?)");

    const newCoupons = [
        'DISCORD-2024'
    ];

    newCoupons.forEach(code => {
        stmt.run(code);
    });

    stmt.finalize();
    console.log(`Tried to insert ${newCoupons.length} coupons.`);
});

db.close(() => {
    console.log("Setup complete. Database closed.");
});
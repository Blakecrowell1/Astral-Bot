const initSqlJs = require('sql.js');
const fs = require('fs');

const DB_FILE = 'attendance.db';

let db;

async function initDB() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_FILE)) {
        const fileBuffer = fs.readFileSync(DB_FILE);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS attendance (
            discord_id TEXT NOT NULL,
            rsn TEXT NOT NULL,
            event_date TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    saveDB();
}

function saveDB() {
    const data = db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function recordAttendance(discordId, rsn, eventDate) {
    db.run(
        `INSERT INTO attendance (discord_id, rsn, event_date) VALUES (?, ?, ?)`,
        [discordId, rsn, eventDate]
    );
    saveDB();
}

function getAttendance(discordId) {
    const result = db.exec(
        `SELECT event_date FROM attendance WHERE discord_id = ? ORDER BY created_at DESC`,
        [discordId]
    );
    if (!result.length) return [];
    return result[0].values.map(row => ({ event_date: row[0] }));
}

function deleteAttendance(discordId) {
    db.run(`DELETE FROM attendance WHERE discord_id = ?`, [discordId]);
    saveDB();
}

module.exports = { initDB, recordAttendance, getAttendance, deleteAttendance };
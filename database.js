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
            event_name TEXT NOT NULL DEFAULT 'Event',
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS recruits (
            recruiter_id TEXT NOT NULL,
            recruit_id TEXT NOT NULL,
            recruit_rsn TEXT NOT NULL,
            recruited_at TEXT DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS donations (
            discord_id TEXT NOT NULL,
            rsn TEXT NOT NULL,
            amount INTEGER NOT NULL,
            donated_at TEXT DEFAULT (datetime('now'))
        )
    `);

    // Add event_name column if it doesn't exist (for existing databases)
    try {
        db.run(`ALTER TABLE attendance ADD COLUMN event_name TEXT NOT NULL DEFAULT 'Event'`);
    } catch (e) {
        // Column already exists, ignore
    }

    saveDB();
}

function saveDB() {
    const data = db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function recordAttendance(discordId, rsn, eventDate, eventName) {
    db.run(
        `INSERT INTO attendance (discord_id, rsn, event_date, event_name) VALUES (?, ?, ?, ?)`,
        [discordId, rsn, eventDate, eventName || 'Event']
    );
    saveDB();
}

function getAttendance(discordId) {
    const result = db.exec(
        `SELECT event_date, event_name FROM attendance WHERE discord_id = ? ORDER BY created_at DESC`,
        [discordId]
    );
    if (!result.length) return [];
    return result[0].values.map(row => ({ event_date: row[0], event_name: row[1] }));
}

function deleteAttendance(discordId) {
    db.run(`DELETE FROM attendance WHERE discord_id = ?`, [discordId]);
    saveDB();
}

function removeMostRecentAttendance(discordId) {
    db.run(`
        DELETE FROM attendance WHERE rowid = (
            SELECT rowid FROM attendance WHERE discord_id = ?
            ORDER BY created_at DESC LIMIT 1
        )
    `, [discordId]);
    saveDB();
}

function addRecruit(recruiterId, recruitId, recruitRsn) {
    db.run(
        `INSERT INTO recruits (recruiter_id, recruit_id, recruit_rsn) VALUES (?, ?, ?)`,
        [recruiterId, recruitId, recruitRsn]
    );
    saveDB();
}

function getRecruits(recruiterId) {
    const result = db.exec(
        `SELECT recruit_id, recruit_rsn, recruited_at FROM recruits WHERE recruiter_id = ? ORDER BY recruited_at DESC`,
        [recruiterId]
    );
    if (!result.length) return [];
    return result[0].values.map(row => ({ recruit_id: row[0], recruit_rsn: row[1], recruited_at: row[2] }));
}

function removeRecruit(recruitId) {
    db.run(`DELETE FROM recruits WHERE recruit_id = ?`, [recruitId]);
    saveDB();
}

function getRecruiter(recruitId) {
    const result = db.exec(
        `SELECT recruiter_id FROM recruits WHERE recruit_id = ?`,
        [recruitId]
    );
    if (!result.length) return null;
    return result[0].values[0][0];
}

function recordDonation(discordId, rsn, amount) {
    db.run(
        `INSERT INTO donations (discord_id, rsn, amount) VALUES (?, ?, ?)`,
        [discordId, rsn, amount]
    );
    saveDB();
}

function getTotalDonations(discordId) {
    const result = db.exec(
        `SELECT COALESCE(SUM(amount), 0) FROM donations WHERE discord_id = ?`,
        [discordId]
    );
    if (!result.length) return 0;
    return result[0].values[0][0];
}

module.exports = {
    initDB,
    recordAttendance,
    getAttendance,
    deleteAttendance,
    removeMostRecentAttendance,
    addRecruit,
    getRecruits,
    removeRecruit,
    getRecruiter,
    recordDonation,
    getTotalDonations
};
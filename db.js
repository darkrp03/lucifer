const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'watchers.db'));

// Migrate from old (chat_id, nickname) schema if needed
const cols = db.prepare('PRAGMA table_info(watchers)').all();
if (cols.some((c) => c.name === 'chat_id')) {
  db.exec(`
    CREATE TABLE watchers_new (nickname TEXT PRIMARY KEY);
    INSERT OR IGNORE INTO watchers_new SELECT DISTINCT nickname FROM watchers;
    DROP TABLE watchers;
    ALTER TABLE watchers_new RENAME TO watchers;
  `);
} else {
  db.exec('CREATE TABLE IF NOT EXISTS watchers (nickname TEXT PRIMARY KEY)');
}

const stmtAdd    = db.prepare('INSERT OR IGNORE INTO watchers (nickname) VALUES (?)');
const stmtRemove = db.prepare('DELETE FROM watchers WHERE nickname = ?');
const stmtAll    = db.prepare('SELECT nickname FROM watchers');

function addWatcher(nickname) {
  stmtAdd.run(nickname);
}

function removeWatcher(nickname) {
  stmtRemove.run(nickname);
}

function getAllWatchers() {
  return stmtAll.all().map((r) => r.nickname);
}

module.exports = { addWatcher, removeWatcher, getAllWatchers };

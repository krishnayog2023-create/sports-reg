const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'registrations.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err.message);
  else console.log('Connected to SQLite database.');
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reg_code TEXT UNIQUE,
      sport TEXT NOT NULL,
      category TEXT NOT NULL,
      team_name TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER,
      primary_code TEXT NOT NULL,
      participant_type TEXT NOT NULL,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      sport TEXT NOT NULL,
      CONSTRAINT unique_participant_game UNIQUE (primary_code, sport),
      FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
    )
  `);
});

module.exports = db;

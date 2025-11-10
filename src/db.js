const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'eventum.db');
const db = new sqlite3.Database(dbPath);

// Inicializa tabelas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(event_id) REFERENCES events(id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(event_id, user_id)
    )
  `);
  db.run(`
    ALTER TABLE events
    ADD COLUMN qtdSubs INTEGER DEFAULT 100
  `, (err) => {
    // Ignora erro se a coluna já existir
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna qtdSubs:', err.message);
    }
  });
});

module.exports = db;

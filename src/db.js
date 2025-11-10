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
      nome_completo TEXT,
      phone TEXT,
      cpf TEXT,
      data_nascimento TEXT,
      sexo TEXT,
      genero TEXT,
      cor TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- COLUNAS ADICIONAIS DO PERFIL (DO CADASTRO) ---
  db.run(`ALTER TABLE users ADD COLUMN nome_completo TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) { console.error('Erro ao adicionar coluna nome_completo:', err.message); }
  });
  db.run(`ALTER TABLE users ADD COLUMN phone TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) { console.error('Erro ao adicionar coluna phone:', err.message); }
  });
  db.run(`ALTER TABLE users ADD COLUMN cpf TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) { console.error('Erro ao adicionar coluna cpf:', err.message); }
  });
  db.run(`ALTER TABLE users ADD COLUMN data_nascimento TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) { console.error('Erro ao adicionar coluna data_nascimento:', err.message); }
  });
  db.run(`ALTER TABLE users ADD COLUMN sexo TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) { console.error('Erro ao adicionar coluna sexo:', err.message); }
  });
  db.run(`ALTER TABLE users ADD COLUMN genero TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) { console.error('Erro ao adicionar coluna genero:', err.message); }
  });
  db.run(`ALTER TABLE users ADD COLUMN cor TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) { console.error('Erro ao adicionar coluna cor:', err.message); }
  });
  // --- FIM DO NOVO BLOCO ---

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

  db.run(`
    ALTER TABLE events
    ADD COLUMN schedule_details TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna schedule_details:', err.message);
    }
  });

  db.run(`
    ALTER TABLE events
    ADD COLUMN address_details TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna address_details:', err.message);
    }
  });

  db.run(`
    ALTER TABLE events
    ADD COLUMN pricing_details TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna pricing_details:', err.message);
    }
  });

  db.run(`
    ALTER TABLE events
    ADD COLUMN food_details TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna food_details:', err.message);
    }
  });

  // --- NOVA COLUNA DA CAPA ---
  db.run(`
    ALTER TABLE events
    ADD COLUMN cover_image_url TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna cover_image_url:', err.message);
    }
  });

  // --- NOVA COLUNA DO ORGANIZADOR ---
  db.run(`
    ALTER TABLE events
    ADD COLUMN organizer TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna organizer:', err.message);
    }
  });

  db.run(`
    ALTER TABLE events
    ADD COLUMN category TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna category:', err.message);
    }
  });

  // --- NOVA COLUNA DE VISIBILIDADE ---
  db.run(`
    ALTER TABLE events
    ADD COLUMN is_hidden INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna is_hidden:', err.message);
    }
  });

  // --- NOVA TABELA PARA MENSAGENS DE CONTATO ---
  db.run(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ▼▼▼ ADICIONE ESTAS LINHAS AQUI ▼▼▼
  // --- NOVAS COLUNAS PARA PRIVACIDADE (MINHA CONTA) ---
  db.run(`
    ALTER TABLE users
    ADD COLUMN aceitou_termos INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna aceitou_termos:', err.message);
    }
  });

  db.run(`
    ALTER TABLE users
    ADD COLUMN usa_2fa INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Erro ao adicionar coluna usa_2fa:', err.message);
    }
  });
  // ▲▲▲ FIM DO NOVO CÓDIGO ▲▲▲

});

module.exports = db;

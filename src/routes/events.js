const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /events -> { title, description, date, createdBy }
router.post('/', (req, res) => {
  const { title, description, date, createdBy, qtdSubs } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: 'title é obrigatório' });
  }

  const stmt = db.prepare('INSERT INTO events (title, description, date, created_by, qtdSubs) VALUES (?, ?, ?, ?, ?)');
  stmt.run(title, description || null, date || null, createdBy || null, qtdSubs || 100, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao criar evento' });
    }
    return res.status(201).json({ id: this.lastID, title, description, date, createdBy, qtdSubs });
  });
  stmt.finalize();
});

// GET /events
router.get('/', (req, res) => {
  db.all('SELECT id, title, description, date, created_by as createdBy, created_at as createdAt, qtdSubs FROM events ORDER BY date IS NULL, date ASC, created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar eventos' });
    return res.json(rows);
  });
});

module.exports = router;

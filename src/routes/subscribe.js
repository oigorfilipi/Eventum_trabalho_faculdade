const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const { eventId, userId } = req.body || {};
  if (!eventId || !userId) {
    return res.status(400).json({ error: 'eventId e userId são obrigatórios' });
  }
  const eventCheck = db.prepare('SELECT id FROM events WHERE id = ?');
  if(!eventCheck.get(eventId)) {
    return res.status(400).json({ error: 'Evento não existe' });
  }else if(db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE event_id = ?').get(eventId).count >= db.prepare('SELECT qtdSubs FROM events WHERE id = ?').get(eventId).qtdSubs) {
    return res.status(400).json({ error: 'Número máximo de inscrições atingido' });
  }
  const stmt = db.prepare('INSERT INTO subscriptions (event_id, user_id) VALUES (?, ?)');
  stmt.run(eventId, userId, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao criar inscrição' });
    }
    return res.status(201).json({ id: this.lastID, eventId, userId });
  });
  stmt.finalize();
});
router.get('/', (req, res) => {
  db.all('SELECT id, event_id as eventId, user_id as userId, created_at as createdAt FROM subscriptions', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar inscrições' });
    return res.json(rows);
  });
});

module.exports = router;
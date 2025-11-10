// src/routes/subscribe.js
const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /subscribe (rota que o formulário chama)
router.post('/', (req, res) => {
  const { eventId, userId } = req.body || {};

  // Validação de segurança básica
  if (!req.session.user || req.session.user.id.toString() !== userId) {
    // Impede que um usuário logado tente inscrever outro usuário
    req.session.message = { type: 'error', text: 'Erro de autenticação.' };
    return res.redirect('/site/eventos');
  }

  if (!eventId || !userId) {
    req.session.message = { type: 'error', text: 'Erro: Dados da inscrição incompletos.' };
    return res.redirect('/site/eventos');
  }

  // --- Lógica de Validação (que você já tinha) ---
  const event = db.prepare('SELECT id, qtdSubs FROM events WHERE id = ?').get(eventId);

  if (!event) {
    req.session.message = { type: 'error', text: 'Erro: Evento não existe.' };
    return res.redirect('/site/eventos');
  }

  const currentSubs = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE event_id = ?').get(eventId).count;

  if (currentSubs >= event.qtdSubs) {
    req.session.message = { type: 'error', text: 'Inscrição falhou: O evento está lotado.' };
    return res.redirect('/site/eventos');
  }
  // --- Fim da Validação ---

  // Tenta inserir no banco
  const stmt = db.prepare('INSERT INTO subscriptions (event_id, user_id) VALUES (?, ?)');
  stmt.run(eventId, userId, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        // Usuário tentou se inscrever duas vezes
        req.session.message = { type: 'error', text: 'Você já está inscrito neste evento.' };
      } else {
        // Erro genérico do banco
        req.session.message = { type: 'error', text: 'Erro interno ao processar inscrição.' };
      }
    } else {
      // SUCESSO!
      req.session.message = { type: 'success', text: 'Inscrição realizada com sucesso!' };
    }

    stmt.finalize();
    // Em qualquer caso (sucesso ou erro), redireciona de volta
    return res.redirect('/site/eventos');
  });
});

// A rota GET /subscribe (que lista TUDO) continua a mesma
router.get('/', (req, res) => {
  db.all('SELECT id, event_id as eventId, user_id as userId, created_at as createdAt FROM subscriptions', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar inscrições' });
    return res.json(rows);
  });
});

module.exports = router;
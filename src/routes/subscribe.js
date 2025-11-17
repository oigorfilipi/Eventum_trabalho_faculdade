// src/routes/subscribe.js (VERSÃO CORRIGIDA E LIMPA)
const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /subscribe (rota que o formulário chama)
router.post('/', (req, res) => {
  const redirectUrl = req.headers.referer || '/site/eventos';
  const { eventId, userId } = req.body || {};

  // 1. Validação de segurança básica
  if (!req.session.user || req.session.user.id.toString() !== userId) {
    req.session.message = { type: 'error', text: 'Erro de autenticação.' };
    return res.redirect(redirectUrl);
  }

  if (!eventId || !userId) {
    req.session.message = { type: 'error', text: 'Erro: Dados da inscrição incompletos.' };
    return res.redirect(redirectUrl);
  }

  // 2. Busca o evento
  const event = db.prepare('SELECT id, qtdSubs FROM events WHERE id = ?').get(eventId);

  if (!event) {
    req.session.message = { type: 'error', text: 'Erro: Evento não existe.' };
    return res.redirect(redirectUrl);
  }

  // 3. Busca a contagem ATUAL de inscritos
  const currentSubs = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE event_id = ?').get(eventId).count;

  // 4. Define o limite (usando 100 como padrão se 'qtdSubs' for nulo)
  const eventLimit = event.qtdSubs || 100;

  // 5. LÓGICA DE VALIDAÇÃO ÚNICA E CORRETA
  if (currentSubs >= eventLimit) {

    // SE ESTIVER LOTADO:
    req.session.message = { type: 'error', text: 'Inscrição falhou: O evento está lotado.' };
    return res.redirect(redirectUrl);

  } else {

    // SE TIVER VAGA: Tenta inserir no banco
    const stmt = db.prepare('INSERT INTO subscriptions (event_id, user_id) VALUES (?, ?)');
    stmt.run(eventId, userId, function (err) {

      stmt.finalize(); // Finaliza o statement

      // 5.1. LÓGICA DE ERRO (ex: já inscrito)
      if (err) {
        if (err.message.includes('UNIQUE')) {
          req.session.message = { type: 'error', text: 'Você já está inscrito neste evento.' };
        } else {
          req.session.message = { type: 'error', text: 'Erro interno ao processar inscrição.' };
        }
        return res.redirect(redirectUrl);
      }

      // 5.2. LÓGICA DE SUCESSO
      const detailsPageUrl = `/site/eventos/${eventId}`;

      if (redirectUrl.includes('/pagamento/')) {
        req.session.message = { type: 'success', text: 'Pagamento efetuado! Inscrição confirmada.' };
      } else {
        req.session.message = { type: 'success', text: 'Inscrição realizada com sucesso!' };
      }

      return res.redirect(detailsPageUrl);
    });
  }
});

// A rota GET /subscribe (que lista TUDO) continua a mesma
router.get('/', (req, res) => {
  db.all('SELECT id, event_id as eventId, user_id as userId, created_at as createdAt FROM subscriptions', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar inscrições' });
    return res.json(rows);
  });
});

module.exports = router;
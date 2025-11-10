// src/routes/subscribe.js
const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /subscribe (rota que o formulário chama)
router.post('/', (req, res) => {
  const redirectUrl = req.headers.referer || '/site/eventos';
  const { eventId, userId } = req.body || {};

  // Validação de segurança básica
  if (!req.session.user || req.session.user.id.toString() !== userId) {
    // Impede que um usuário logado tente inscrever outro usuário
    req.session.message = { type: 'error', text: 'Erro de autenticação.' };
    return res.redirect(redirectUrl);
  }

  if (!eventId || !userId) {
    req.session.message = { type: 'error', text: 'Erro: Dados da inscrição incompletos.' };
    return res.redirect(redirectUrl);
  }

  // --- Lógica de Validação (que você já tinha) ---
  const event = db.prepare('SELECT id, qtdSubs FROM events WHERE id = ?').get(eventId);

  if (!event) {
    req.session.message = { type: 'error', text: 'Erro: Evento não existe.' };
    return res.redirect(redirectUrl);
  }

  const currentSubs = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE event_id = ?').get(eventId).count;

  if (currentSubs >= event.qtdSubs) {
    req.session.message = { type: 'error', text: 'Inscrição falhou: O evento está lotado.' };
    return res.redirect(redirectUrl);
  }
  // --- Fim da Validação ---

  // Tenta inserir no banco
  const stmt = db.prepare('INSERT INTO subscriptions (event_id, user_id) VALUES (?, ?)');
  stmt.run(eventId, userId, function (err) {

    stmt.finalize();

    // 1. LÓGICA DE ERRO
    if (err) {
      if (err.message.includes('UNIQUE')) {
        req.session.message = { type: 'error', text: 'Você já está inscrito neste evento.' };
      } else {
        req.session.message = { type: 'error', text: 'Erro interno ao processar inscrição.' };
      }
      // Se deu erro, volta para a página anterior (ex: a de pagamento)
      return res.redirect(redirectUrl);
    }

    // 2. LÓGICA DE SUCESSO

    // Constrói a URL da página de DETALHES do evento
    const detailsPageUrl = `/site/eventos/${eventId}`;

    // Mensagem de sucesso personalizada (como você pediu)
    // Se o usuário veio da página de pagamento, mostramos "Pagamento efetuado"
    if (redirectUrl.includes('/pagamento/')) {
      req.session.message = { type: 'success', text: 'Pagamento efetuado! Inscrição confirmada.' };
    } else {
      // Se veio da inscrição gratuita
      req.session.message = { type: 'success', text: 'Inscrição realizada com sucesso!' };
    }

    // Em qualquer caso (sucesso ou erro), redireciona de volta
    return res.redirect(detailsPageUrl);
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
// src/index.js (VERSÃO LIMPA E REATORADA)

const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./db'); // garante inicialização do DB
const { isLoggedIn, isAdmin } = require('./middleware'); // Nossos middlewares
const pdfkit = require('pdfkit'); // O pdfkit ainda é usado pelo adminRoutes

// Importação das nossas rotas
const subscribeRoutes = require('./routes/subscribe');
const adminRoutes = require('./routes/adminRoutes');
const siteRoutes = require('./routes/siteRoutes');


const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'seu-segredo-muito-seguro-aqui',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Middleware Global para (user) e (message)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  if (req.session.message) {
    res.locals.message = req.session.message;
    delete req.session.message;
  } else {
    res.locals.message = null;
  }
  next();
});

// Configuração do EJS e da pasta 'public'
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));


// --- ORDEM DAS ROTAS (A CORREÇÃO DO BUG) ---

// 1. Rotas de Admin (Mais específicas, ex: /site/eventos/novo)
app.use(adminRoutes);

// 2. Rotas de Site (Mais genéricas, ex: /site/eventos/:id)
app.use(siteRoutes);

// 3. Rota de Inscrição (API)
app.use('/subscribe', subscribeRoutes);

// Rota Health (API)
app.get('/', (req, res) => res.json({ status: 'ok', service: 'eventum-api' }));


// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eventum API ouvindo na porta ${PORT}`);
});
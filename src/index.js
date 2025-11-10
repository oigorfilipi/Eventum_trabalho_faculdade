const express = require('express');
const bodyParser = require('express').json;
const path = require('path');
const db = require('./db'); // garante inicialização do DB
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const subscribeRoutes = require('./routes/subscribe');

const app = express();
app.use(bodyParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.use('/users', userRoutes);
app.use('/events', eventRoutes);
app.use('/subscribe', subscribeRoutes);

// Health
app.get('/', (req, res) => res.json({ status: 'ok', service: 'eventum-api' }));

app.get('/site/eventos', (req, res) => {
  const sql = 'SELECT id, title, description, date FROM events ORDER BY date IS NULL, date ASC, created_at DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar eventos para o site:', err);
      return res.status(500).send("Erro ao carregar a página de eventos.");
    }
    res.render('events', { events: rows });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eventum API ouvindo na porta ${PORT}`);
});

const express = require('express');
const bodyParser = require('express').json;
const db = require('./db'); // garante inicialização do DB
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const subscribeRoutes = require('./routes/subscribe');

const app = express();
app.use(bodyParser());

// Rotas
app.use('/users', userRoutes);
app.use('/events', eventRoutes);
app.use('/subscribe', subscribeRoutes);

// Health
app.get('/', (req, res) => res.json({ status: 'ok', service: 'eventum-api' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eventum API ouvindo na porta ${PORT}`);
});

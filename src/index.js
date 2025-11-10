const express = require('express');
const bodyParser = require('express').json;
const path = require('path');
const session = require('express-session')
const db = require('./db'); // garante inicialização do DB
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const subscribeRoutes = require('./routes/subscribe');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser());

app.use(session({
  secret: 'seu-segredo-muito-seguro-aqui', // Mude isso para uma frase aleatória
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Para desenvolvimento
}));

app.use((req, res, next) => {
  // Passa o usuário
  res.locals.user = req.session.user || null;

  // Passa a mensagem "flash"
  if (req.session.message) {
    res.locals.message = req.session.message;
    // Limpa a mensagem da sessão para que não apareça de novo
    delete req.session.message;
  } else {
    res.locals.message = null;
  }

  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.render('login', { error: 'Você precisa ser um admin para acessar esta página.' });
  }
  next();
};

app.get('/site/eventos/novo', isAdmin, (req, res) => {
  res.render('evento-novo'); // Renderiza o arquivo que criamos
});

app.post('/site/eventos/novo', isAdmin, (req, res) => {
  // 1. Pega os dados do formulário (req.body)
  const { title, description, date, qtdSubs } = req.body;

  // 2. Pega o ID do admin logado (da sessão)
  const createdBy = req.session.user.id;

  if (!title) {
    // Idealmente, renderizar o form de novo com o erro
    return res.status(400).send('O título é obrigatório');
  }

  // 3. Insere no banco (similar ao seu events.js da API)
  const stmt = db.prepare(
    'INSERT INTO events (title, description, date, created_by, qtdSubs) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(
    title,
    description || null,
    date || null,
    createdBy,
    qtdSubs || 100,
    function (err) {
      if (err) {
        console.error('Erro ao criar evento:', err);
        return res.status(500).send('Erro ao salvar o evento.');
      }
      // 4. Sucesso! Redireciona para a lista de eventos
      res.redirect('/site/eventos');
    }
  );
  stmt.finalize();
});

app.get('/site/eventos/:id/editar', isAdmin, (req, res) => {
  const eventId = req.params.id;

  // 1. Busca o evento no banco
  db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, evento) => {
    if (err || !evento) {
      return res.status(404).send('Evento não encontrado');
    }
    // 2. Renderiza a view de edição, passando os dados do evento
    res.render('evento-editar', { evento: evento });
  });
});

// Rota POST para ATUALIZAR o evento no banco
app.post('/site/eventos/:id/editar', isAdmin, (req, res) => {
  const eventId = req.params.id;
  const { title, description, date, qtdSubs } = req.body;

  if (!title) {
    return res.status(400).send('O título é obrigatório');
  }

  // 1. Roda o UPDATE no banco
  const stmt = db.prepare(`
    UPDATE events 
    SET title = ?, description = ?, date = ?, qtdSubs = ?
    WHERE id = ?
  `);
  stmt.run(
    title,
    description || null,
    date || null,
    qtdSubs || 100,
    eventId,
    function (err) {
      if (err) {
        console.error('Erro ao atualizar evento:', err);
        return res.status(500).send('Erro ao salvar o evento.');
      }
      // 2. Sucesso! Redireciona para a lista
      res.redirect('/site/eventos');
    }
  );
  stmt.finalize();
});

// Rota GET para EXCLUIR um evento
app.get('/site/eventos/:id/excluir', isAdmin, (req, res) => {
  const eventId = req.params.id;

  // Cuidado: Em uma app real, você também deveria excluir as INSCRIÇÕES
  // db.run('DELETE FROM subscriptions WHERE event_id = ?', [eventId], (err) => { ... });

  db.run('DELETE FROM events WHERE id = ?', [eventId], (err) => {
    if (err) {
      console.error('Erro ao excluir evento:', err);
      return res.status(500).send('Erro ao excluir o evento.');
    }
    // Sucesso! Redireciona para a lista
    res.redirect('/site/eventos');
  });
});


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

const bcrypt = require('bcryptjs');

// Rota GET para mostrar a página de login
app.get('/site/login', (req, res) => {
  res.render('login', { error: null }); // Renderiza login.ejs
});

// Rota GET para mostrar a página de registro
app.get('/site/register', (req, res) => {
  res.render('register', { error: null }); // Renderiza register.ejs
});

// Rota POST para processar o registro (reaproveita sua API)
app.post('/site/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.render('register', { error: 'Todos os campos são obrigatórios' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const userRole = (email.toLowerCase() === 'admin@eventum.com') ? 'admin' : 'user';
    const stmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    stmt.run(name, email, hashed, userRole, function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.render('register', { error: 'Email já cadastrado' });
        }
        return res.render('register', { error: 'Erro ao salvar usuário' });
      }

      // LOGA O USUÁRIO AUTOMATICAMENTE APÓS O REGISTRO
      req.session.user = { id: this.lastID, name: name, email: email, role: userRole };
      res.redirect('/site/eventos'); // Redireciona para a home
    });
    stmt.finalize();
  } catch (e) {
    res.render('register', { error: 'Erro interno ao processar senha' });
  }
});

// Rota POST para processar o login (LÓGICA NOVA!)
app.post('/site/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { error: 'Email e senha são obrigatórios' });
  }

  // 1. Encontrar o usuário pelo email
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.render('login', { error: 'Email ou senha inválidos' });
    }

    // 2. Comparar a senha
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      // 3. Salvar na sessão
      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      res.redirect('/site/eventos'); // Sucesso! Redireciona
    } else {
      // Senha incorreta
      return res.render('login', { error: 'Email ou senha inválidos' });
    }
  });
});

// Rota GET de Logout
app.get('/site/logout', (req, res) => {
  req.session.destroy(err => {
    res.redirect('/site/eventos'); // Redireciona para a home
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eventum API ouvindo na porta ${PORT}`);
});

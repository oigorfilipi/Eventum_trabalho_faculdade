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

const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.render('login', { error: 'Você precisa ser um admin para acessar esta página.' });
  }
  next();
};

const isLoggedIn = (req, res, next) => {
  if (!req.session.user) {
    // Se não estiver logado, manda para a página de login
    return res.redirect('/site/login');
  }
  next(); // Se estiver logado, continua
};

app.get('/site/eventos/novo', isAdmin, (req, res) => {
  res.render('evento-novo'); // Renderiza o arquivo que criamos
});

/* [ CÓDIGO CORRIGIDO EM index.js ]
*/
app.post('/site/eventos/novo', isAdmin, (req, res) => {
  const { title, description, date, qtdSubs, location, time, attractions } = req.body;
  const createdBy = req.session.user.id;

  if (!title) {
    // AQUI ESTÁ A CORREÇÃO:
    // 1. Renderiza a PÁGINA 'evento-novo' novamente
    // 2. Passa a variável 'error'
    // 3. Passa os dados (evento) de volta para o formulário
    return res.render('evento-novo', {
      error: 'O título é obrigatório.',
      evento: { title, description, date, qtdSubs, location, time, attractions }
    });
  }

  // 3. Insere no banco...
  const stmt = db.prepare(
    'INSERT INTO events (title, description, date, created_by, qtdSubs, location, time, attractions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    title,
    description || null,
    date || null,
    createdBy,
    qtdSubs || 100,
    location || null,
    time || null,
    attractions || null, // O JSON vem como string do JS
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
/* [ CÓDIGO CORRIGIDO EM index.js ]
*/
// Rota POST para ATUALIZAR o evento no banco
app.post('/site/eventos/:id/editar', isAdmin, (req, res) => {
  const eventId = req.params.id;
  // CORREÇÃO: Pegar os novos campos
  const { title, description, date, qtdSubs, location, time, attractions } = req.body;

  if (!title) {
    // AQUI ESTÁ A CORREÇÃO:
    // 1. Renderiza a PÁGINA 'evento-editar' novamente
    // 2. Passa a variável 'error'
    // 3. Passa os dados (evento) de volta (incluindo o id)
    return res.render('evento-editar', {
      error: 'O título é obrigatório.',
      // CORREÇÃO: Devolver todos os campos
      evento: { id: eventId, title, description, date, qtdSubs, location, time, attractions }
    });
  }

  // 1. Roda o UPDATE no banco
  const stmt = db.prepare(`
    UPDATE events 
    SET title = ?, description = ?, date = ?, qtdSubs = ?,
        location = ?, time = ?, attractions = ?
    WHERE id = ?
  `);
  stmt.run(
    title,
    description || null,
    date || null,
    qtdSubs || 100,
    location || null,
    time || null,
    attractions || null,
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
  const sql = 'SELECT id, title, description, date, location, time FROM events ORDER BY date IS NULL, date ASC, created_at DESC';

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

// ROTA "MINHA CONTA" (PAINEL DO USUÁRIO / ADMIN)
app.get('/site/minha-conta', isLoggedIn, (req, res) => {
  const user = req.session.user;

  if (user.role === 'admin') {
    // LÓGICA DO ADMIN: Buscar estatísticas
    let stats = { users: 0, events: 0, subscriptions: 0 };

    // Usamos callbacks aninhados para garantir que temos todos os dados
    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
      if (row) stats.users = row.count;

      db.get("SELECT COUNT(*) as count FROM events", [], (err, row) => {
        if (row) stats.events = row.count;

        db.get("SELECT COUNT(*) as count FROM subscriptions", [], (err, row) => {
          if (row) stats.subscriptions = row.count;

          // Renderiza a view passando as estatísticas
          res.render('minha-conta', { stats: stats });
        });
      });
    });

  } else {
    // LÓGICA DO USUÁRIO: Buscar eventos inscritos
    const sql = `
      SELECT e.id, e.title, e.description, e.date 
      FROM events e
      JOIN subscriptions s ON e.id = s.event_id
      WHERE s.user_id = ?
      ORDER BY e.date IS NULL, e.date ASC
    `;

    db.all(sql, [user.id], (err, myEvents) => {
      if (err) {
        console.error(err);
        return res.redirect('/site/eventos'); // Em caso de erro
      }

      // Renderiza a view passando a lista de eventos
      res.render('minha-conta', { myEvents: myEvents, stats: null });
    });
  }
});

// ROTA POST PARA MUDAR A SENHA
app.post('/site/mudar-senha', isLoggedIn, (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  const userId = req.session.user.id;

  // Verificação simples
  if (!senhaAtual || !novaSenha) {
    req.session.message = { type: 'error', text: 'Todos os campos são obrigatórios.' };
    return res.redirect('/site/minha-conta');
  }

  // 1. Buscar o usuário e sua senha ATUAL no banco
  db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err || !user) {
      req.session.message = { type: 'error', text: 'Erro ao encontrar usuário.' };
      return res.redirect('/site/minha-conta');
    }

    // 2. Comparar a senha atual (do formulário) com a do banco
    const match = await bcrypt.compare(senhaAtual, user.password);

    if (!match) {
      // Se a senha atual NÃO BATER
      req.session.message = { type: 'error', text: 'A senha atual está incorreta.' };
      return res.redirect('/site/minha-conta');
    }

    // 3. Se BATEU, criptografar a nova senha
    const newHashedPassword = await bcrypt.hash(novaSenha, 10);

    // 4. Salvar a nova senha no banco
    db.run('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, userId], (err) => {
      if (err) {
        req.session.message = { type: 'error', text: 'Erro ao atualizar a senha no banco.' };
        return res.redirect('/site/minha-conta');
      }

      // Sucesso!
      req.session.message = { type: 'success', text: 'Senha alterada com sucesso!' };
      res.redirect('/site/minha-conta');
    });
  });
});


// Rotas da API
app.use('/users', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eventum API ouvindo na porta ${PORT}`);
});

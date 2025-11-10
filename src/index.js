const express = require('express');
const path = require('path');
const session = require('express-session')
const db = require('./db'); // garante inicialização do DB
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const subscribeRoutes = require('./routes/subscribe');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // <-- SUBSTITUA PELA VERSÃO MODERNA

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
  const { title, description, qtdSubs,
    schedule_details, address_details, pricing_details, food_details, attractions,
    cover_image_url
  } = req.body;

  const createdBy = req.session.user.id;

  if (!title) {
    return res.render('evento-novo', {
      error: 'O título é obrigatório.',
      evento: req.body // Envia todos os dados de volta
    });
  }

  // 3. Insere no banco...
  const stmt = db.prepare(
    `INSERT INTO events (title, description, created_by, qtdSubs, schedule_details, address_details, pricing_details, food_details, attractions, cover_image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    title, description || null, createdBy, qtdSubs || 100,
    schedule_details || null, address_details || null, pricing_details || null, food_details || null, attractions || null,
    cover_image_url || null,
    function (err) {
      if (err) {
        console.error('Erro ao criar evento:', err);
        return res.status(500).send('Erro ao salvar o evento.');
      }
      res.redirect('/site/eventos');
    }
  );
  stmt.finalize();
}); // <-- FECHAMENTO CORRETO DA ROTA "NOVO"

app.get('/site/eventos/:id/editar', isAdmin, (req, res) => {
  const eventId = req.params.id;

  db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, evento) => {
    if (err || !evento) {
      return res.status(404).send('Evento não encontrado');
    }
    res.render('evento-editar', { evento: evento });
  });
});


app.post('/site/eventos/:id/editar', isAdmin, (req, res) => {
  const eventId = req.params.id;
  const { title, description, qtdSubs,
    schedule_details, address_details, pricing_details, food_details, attractions,
    cover_image_url
  } = req.body;

  if (!title) {
    const evento = req.body;
    evento.id = eventId;
    return res.render('evento-editar', {
      error: 'O título é obrigatório.',
      evento: evento
    });
  }

  const stmt = db.prepare(`
    UPDATE events
    SET title = ?, description = ?, qtdSubs = ?,
        schedule_details = ?, address_details = ?, pricing_details = ?, food_details = ?, attractions = ?,
        cover_image_url = ?
    WHERE id = ?
  `);
  stmt.run(
    title, description || null, qtdSubs || 100,
    schedule_details || null, address_details || null, pricing_details || null, food_details || null, attractions || null,
    cover_image_url || null,
    eventId,
    function (err) {
      if (err) {
        console.error('Erro ao atualizar evento:', err);
        return res.status(500).send('Erro ao salvar o evento.');
      }
      res.redirect('/site/eventos');
    }
  );
  stmt.finalize();
}); // <-- FECHAMENTO CORRETO DA ROTA "EDITAR"


app.get('/site/eventos/:id/excluir', isAdmin, (req, res) => {
  const eventId = req.params.id;

  db.run('DELETE FROM events WHERE id = ?', [eventId], (err) => {
    if (err) {
      console.error('Erro ao excluir evento:', err);
      return res.status(500).send('Erro ao excluir o evento.');
    }
    res.redirect('/site/eventos');
  });
}); // <-- FECHAMENTO CORRETO DA ROTA "EXCLUIR"


// Rotas
app.use('/users', userRoutes);
app.use('/events', eventRoutes);
app.use('/subscribe', subscribeRoutes);

// Health
app.get('/', (req, res) => res.json({ status: 'ok', service: 'eventum-api' }));

app.get('/site/eventos/todos', (req, res) => {
  const sql = 'SELECT * FROM events ORDER BY date IS NULL, date ASC, created_at DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar eventos para o site:', err);
      return res.status(500).send("Erro ao carregar a página de eventos.");
    }

    // Processa os JSONs (como já fazia)
    const events = rows.map(event => {
      try {
        if (event.schedule_details) event.schedule = JSON.parse(event.schedule_details);
        if (event.pricing_details) event.pricing = JSON.parse(event.pricing_details);
      } catch (e) {
        console.error(`Erro ao parsear JSON do evento ${event.id}:`, e);
      }
      return event;
    });

    // Renderiza a PÁGINA ANTIGA (events.ejs) com todos os eventos
    res.render('events', { events: events });
  });
});

app.get('/site/eventos', (req, res) => {

  // CORREÇÃO: Nova consulta SQL
  // Busca os 3 mais recentes (created_at DESC) que TENHAM uma imagem de capa
  const sql = `
    SELECT * FROM events 
    WHERE cover_image_url IS NOT NULL 
    AND cover_image_url != ''
    ORDER BY created_at DESC 
    LIMIT 3
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar eventos para o carrossel:', err);
      return res.status(500).send("Erro ao carregar a home page.");
    }

    // Processa os JSONs (necessário para os detalhes no slide)
    const carouselEvents = rows.map(event => {
      try {
        if (event.schedule_details) event.schedule = JSON.parse(event.schedule_details);
      } catch (e) {
        console.error(`Erro ao parsear JSON do evento ${event.id}:`, e);
      }
      return event;
    });

    // CORREÇÃO: Renderiza a NOVA PÁGINA (home.ejs)
    res.render('home', { carouselEvents: carouselEvents });
  });
});

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
    let stats = { users: 0, events: 0, totalSubscriptions: 0, activeSubscriptions: 0 }; // <-- MUDANÇA AQUI

    // Usamos callbacks aninhados...
    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
      if (row) stats.users = row.count;

      db.get("SELECT COUNT(*) as count FROM events", [], (err, row) => {
        if (row) stats.events = row.count;

        // Query 1: Inscrições TOTAIS (como você definiu)
        db.get("SELECT COUNT(*) as count FROM subscriptions", [], (err, row) => {
          if (row) stats.totalSubscriptions = row.count; // <-- MUDANÇA AQUI

          // Query 2: Inscrições ATIVAS (só de eventos que existem)
          const sqlActive = `
            SELECT COUNT(s.id) as count 
            FROM subscriptions s
            JOIN events e ON s.event_id = e.id
          `;
          db.get(sqlActive, [], (err, row) => {
            if (row) stats.activeSubscriptions = row.count; // <-- MUDANÇA AQUI

            // Renderiza a view passando as estatísticas
            res.render('minha-conta', { stats: stats });
          });
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

// 1. ROTA PÁGINA DE DETALHES DO EVENTO
//
app.get('/site/eventos/:id', (req, res) => {
  const eventId = req.params.id;
  let userId = null;
  if (req.session.user) {
    userId = req.session.user.id;
  }

  // 1. Busca o evento específico
  db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, event) => {
    if (err || !event) {
      return res.status(404).send('Evento não encontrado');
    }

    // 2. Processa os JSONs deste evento
    try {
      if (event.schedule_details) event.schedule = JSON.parse(event.schedule_details);
      if (event.address_details) event.address = JSON.parse(event.address_details);
      if (event.pricing_details) event.pricing = JSON.parse(event.pricing_details);
      if (event.food_details) event.food = JSON.parse(event.food_details);
      if (event.attractions) event.attractionsData = JSON.parse(event.attractions);
    } catch (e) {
      console.error(`Erro ao parsear JSON do evento ${event.id}:`, e);
    }

    // 3. Verifica se o usuário JÁ está inscrito
    db.get('SELECT id FROM subscriptions WHERE event_id = ? AND user_id = ?', [eventId, userId], (err, subscription) => {
      const isSubscribed = !!subscription; // true se a inscrição existir

      // 4. CORREÇÃO: Busca a contagem de inscritos para este evento
      db.get('SELECT COUNT(*) as count FROM subscriptions WHERE event_id = ?', [eventId], (err, row) => {
        const currentSubCount = row ? row.count : 0;

        // 5. Renderiza a nova página de detalhes
        res.render('evento-detalhe', {
          event: event,
          isSubscribed: isSubscribed,
          currentSubCount: currentSubCount // <-- Passa a contagem
        });
      });
    });
  });
});

//
// 2. ROTA SIMULADA DE PAGAMENTO
//
app.get('/site/pagamento/:id', isLoggedIn, (req, res) => {
  const eventId = req.params.id;
  // CORREÇÃO: Adicionado 'id' ao SELECT
  db.get('SELECT id, title, pricing_details FROM events WHERE id = ?', [eventId], (err, event) => {
    if (err || !event) return res.status(404).send('Evento não encontrado');

    let price = "Valor não definido";
    if (event.pricing_details) {
      try {
        const pricing = JSON.parse(event.pricing_details);
        price = pricing.price || "Valor não definido";
      } catch (e) { }
    }

    res.render('pagamento', { event, price, user: req.session.user });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Eventum API ouvindo na porta ${PORT}`);
});

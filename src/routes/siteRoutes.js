// src/routes/siteRoutes.js
const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const { isLoggedIn } = require('../middleware'); // Puxa o middleware
const PDFDocument = require('pdfkit');

const router = express.Router();

//
// ROTA DA HOME (Antiga /site/eventos)
//
router.get('/site/eventos', (req, res) => {
    const sql = `
    SELECT * FROM events 
    WHERE cover_image_url IS NOT NULL 
    AND cover_image_url != ''
    AND (is_hidden = 0 OR is_hidden IS NULL)
    ORDER BY created_at DESC 
    LIMIT 3
  `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar eventos para o carrossel:', err);
            return res.status(500).send("Erro ao carregar a home page.");
        }
        const carouselEvents = rows.map(event => {
            try {
                if (event.schedule_details) event.schedule = JSON.parse(event.schedule_details);
            } catch (e) { }
            return event;
        });
        res.render('home', { carouselEvents: carouselEvents });
    });
});

//
// ROTA DO GRID DE EVENTOS (TODOS)
//
router.get('/site/eventos/todos', (req, res) => {
    const { search, category } = req.query;

    let sql = 'SELECT * FROM events';
    let whereConditions = [];
    let params = [];

    if (!req.session.user || req.session.user.role !== 'admin') {
        whereConditions.push('(is_hidden = 0 OR is_hidden IS NULL)');
    }

    if (search) {
        whereConditions.push('title LIKE ?');
        params.push(`%${search}%`);
    }
    if (category && category !== 'Todos' && category !== 'Indefinido') {
        whereConditions.push('category = ?');
        params.push(category);
    }

    if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    sql += ' ORDER BY date IS NULL, date ASC, created_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar eventos para o site:', err);
            return res.status(500).send("Erro ao carregar a página de eventos.");
        }

        const events = rows.map(event => {
            try {
                if (event.schedule_details) event.schedule = JSON.parse(event.schedule_details);
                if (event.pricing_details) event.pricing = JSON.parse(event.pricing_details);
            } catch (e) { }
            return event;
        });

        res.render('events', {
            events: events,
            searchQuery: search || '',
            categoryQuery: category || 'Todos'
        });
    });
});


//
// ROTAS DE LOGIN, REGISTER, LOGOUT
//
router.get('/site/login', (req, res) => {
    res.render('login', { error: null });
});

router.get('/site/register', (req, res) => {
    res.render('register', { error: null });
});

// Rota POST de Registro (Corrigida da etapa anterior)
router.post('/site/register', async (req, res) => {
    const {
        name, email, password, nome_completo, phone,
        cpf, data_nascimento, sexo, genero, cor
    } = req.body;

    if (!name || !email || !password || !nome_completo || !phone || !cpf || !data_nascimento || !sexo || !cor) {
        return res.render('register', { error: 'Todos os campos com * são obrigatórios.' });
    }
    if (password.length < 6) {
        return res.render('register', { error: 'A senha deve ter no mínimo 6 dígitos.' });
    }

    try {
        const hashed = await bcrypt.hash(password, 10);
        const userRole = (email.toLowerCase() === 'admin@eventum.com') ? 'admin' : 'user';

        const sql = `
      INSERT INTO users (
        name, email, password, role, nome_completo, phone, 
        cpf, data_nascimento, sexo, genero, cor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const stmt = db.prepare(sql);

        stmt.run(
            name, email, hashed, userRole, nome_completo, phone,
            cpf, data_nascimento, sexo, genero || null, cor,
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.render('register', { error: 'Email já cadastrado' });
                    }
                    console.error("Erro ao salvar usuário:", err);
                    return res.render('register', { error: 'Erro ao salvar usuário' });
                }

                req.session.user = {
                    id: this.lastID, name: name, email: email, role: userRole,
                    aceitou_termos: 0, usa_2fa: 0,
                    nome_completo: nome_completo, phone: phone, cpf: cpf,
                    data_nascimento: data_nascimento, sexo: sexo, genero: genero || null, cor: cor
                };
                req.session.message = { type: 'success', text: 'Cadastro realizado com sucesso! Você já está logado.' };
                res.redirect('/site/eventos');
            }
        );
        stmt.finalize();

    } catch (e) {
        console.error("Erro no /site/register:", e);
        res.render('register', { error: 'Erro interno ao processar senha' });
    }
});

router.post('/site/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.render('login', { error: 'Email e senha são obrigatórios' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) {
            return res.render('login', { error: 'Email ou senha inválidos' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = {
                id: user.id, name: user.name, email: user.email, role: user.role,
                aceitou_termos: user.aceitou_termos, usa_2fa: user.usa_2fa,
                // (Adiciona o resto dos dados do perfil na sessão)
                nome_completo: user.nome_completo, phone: user.phone, cpf: user.cpf,
                data_nascimento: user.data_nascimento, sexo: user.sexo, genero: user.genero, cor: user.cor
            };
            req.session.message = { type: 'success', text: `Bem-vindo de volta, ${user.name}!` };
            res.redirect('/site/eventos');
        } else {
            return res.render('login', { error: 'Email ou senha inválidos' });
        }
    });
});

router.get('/site/logout', (req, res) => {
    const name = req.session.user ? req.session.user.name : 'usuário';
    req.session.user = null;
    req.session.message = { type: 'success', text: `Até logo, ${name}!` };
    req.session.save(err => {
        if (err) console.error("Erro ao salvar sessão no logout:", err);
        res.redirect('/site/eventos');
    });
});

//
// ROTAS "MINHA CONTA" E AÇÕES DE PERFIL
//
router.get('/site/minha-conta', isLoggedIn, (req, res) => {
    const user = req.session.user;

    if (user.role === 'admin') {
        let stats = { users: 0, events: 0, totalSubscriptions: 0, activeSubscriptions: 0 };
        db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
            if (row) stats.users = row.count;
            db.get("SELECT COUNT(*) as count FROM events", [], (err, row) => {
                if (row) stats.events = row.count;
                db.get("SELECT COUNT(*) as count FROM subscriptions", [], (err, row) => {
                    if (row) stats.totalSubscriptions = row.count;
                    const sqlActive = `SELECT COUNT(s.id) as count FROM subscriptions s JOIN events e ON s.event_id = e.id`;
                    db.get(sqlActive, [], (err, row) => {
                        if (row) stats.activeSubscriptions = row.count;
                        const eventsSql = "SELECT id, title FROM events ORDER BY created_at DESC";
                        db.all(eventsSql, [], (err, events) => {
                            res.render('minha-conta', {
                                stats: stats,
                                events: events,
                                myEvents: null
                            });
                        });
                    });
                });
            });
        });

    } else {
        // LÓGICA DO USUÁRIO
        const sql = `
      SELECT e.id, e.title, e.description, e.date, e.cover_image_url 
      FROM events e
      JOIN subscriptions s ON e.id = s.event_id
      WHERE s.user_id = ?
      ORDER BY e.date IS NULL, e.date ASC
    `;
        db.all(sql, [user.id], (err, myEvents) => {
            if (err) {
                return res.redirect('/site/eventos');
            }
            res.render('minha-conta', { myEvents: myEvents, stats: null });
        });
    }
});

router.post('/site/mudar-senha', isLoggedIn, (req, res) => {
    const { senhaAtual, novaSenha } = req.body;
    const userId = req.session.user.id;

    if (!senhaAtual || !novaSenha) {
        req.session.message = { type: 'error', text: 'Todos os campos são obrigatórios.' };
        return res.redirect('/site/minha-conta');
    }
    if (novaSenha.length < 6) {
        req.session.message = { type: 'error', text: 'A nova senha deve ter no mínimo 6 dígitos.' };
        return res.redirect('/site/minha-conta');
    }

    db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
        if (err || !user) {
            req.session.message = { type: 'error', text: 'Erro ao encontrar usuário.' };
            return res.redirect('/site/minha-conta');
        }

        const match = await bcrypt.compare(senhaAtual, user.password);
        if (!match) {
            req.session.message = { type: 'error', text: 'A senha atual está incorreta.' };
            return res.redirect('/site/minha-conta');
        }

        const newHashedPassword = await bcrypt.hash(novaSenha, 10);
        db.run('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, userId], (err) => {
            if (err) {
                req.session.message = { type: 'error', text: 'Erro ao atualizar a senha no banco.' };
                return res.redirect('/site/minha-conta');
            }
            req.session.message = { type: 'success', text: 'Senha alterada com sucesso!' };
            res.redirect('/site/minha-conta');
        });
    });
});

router.post('/site/atualizar-perfil', isLoggedIn, (req, res) => {
    const { name, phone } = req.body;
    const userId = req.session.user.id;

    if (!name) {
        req.session.message = { type: 'error', text: 'O Nome Social não pode ficar em branco.' };
        return res.redirect('/site/minha-conta');
    }

    db.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone || null, userId], (err) => {
        if (err) {
            req.session.message = { type: 'error', text: 'Erro ao atualizar seu perfil.' };
            return res.redirect('/site/minha-conta');
        }
        req.session.user.name = name;
        req.session.user.phone = phone || null;
        req.session.message = { type: 'success', text: 'Seu perfil foi atualizado com sucesso!' };
        res.redirect('/site/minha-conta');
    });
});

router.post('/site/contato', (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
        req.session.message = { type: 'error', text: 'Nome, Email e Mensagem são obrigatórios.' };
        return res.redirect('/site/eventos#contact-form');
    }

    const stmt = db.prepare('INSERT INTO contact_messages (name, email, phone, message) VALUES (?, ?, ?, ?)');
    stmt.run(name, email, phone, message, (err) => {
        if (err) {
            req.session.message = { type: 'error', text: 'Erro ao salvar sua mensagem. Tente novamente.' };
            return res.redirect('/site/eventos#contact-form');
        }
        req.session.message = { type: 'success', text: 'Mensagem recebida! Entraremos em contato em breve.' };
        res.redirect('/site/eventos');
    });
    stmt.finalize();
});

router.post('/site/deletar-conta', isLoggedIn, (req, res) => {
    const userId = req.session.user.id;

    db.run('DELETE FROM subscriptions WHERE user_id = ?', [userId], (err) => {
        if (err) {
            req.session.message = { type: 'error', text: 'Erro ao remover suas inscrições.' };
            return res.redirect('/site/minha-conta');
        }
        db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
            if (err) {
                req.session.message = { type: 'error', text: 'Erro ao deletar seu perfil.' };
                return res.redirect('/site/minha-conta');
            }
            req.session.user = null;
            req.session.message = { type: 'success', text: 'Sua conta foi deletada com sucesso. Que pena ver você ir.' };
            req.session.save(err => {
                if (err) console.error("Erro ao salvar sessão na deleção:", err);
                res.redirect('/site/eventos');
            });
        });
    });
});

router.post('/site/atualizar-privacidade', isLoggedIn, (req, res) => {
    const userId = req.session.user.id;
    const aceitouTermos = req.body.aceitou_termos ? 1 : 0;
    const usa2FA = req.body.usa_2fa ? 1 : 0;

    const sql = `UPDATE users SET aceitou_termos = ?, usa_2fa = ? WHERE id = ?`;
    db.run(sql, [aceitouTermos, usa2FA, userId], (err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao salvar.' });
        }
        req.session.user.aceitou_termos = aceitouTermos;
        req.session.user.usa_2fa = usa2FA;
        return res.json({ success: true, message: 'Salvo!' });
    });
});


//
// ROTA DE DETALHE DO EVENTO (A ROTA PROBLEMÁTICA)
//
router.get('/site/eventos/:id', (req, res) => {
    const eventId = req.params.id;
    let userId = null;
    if (req.session.user) {
        userId = req.session.user.id;
    }

    db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, event) => {
        if (err || !event) {
            return res.status(404).send('Evento não encontrado');
        }

        try {
            if (event.schedule_details) event.schedule = JSON.parse(event.schedule_details);
            if (event.address_details) event.address = JSON.parse(event.address_details);
            if (event.pricing_details) event.pricing = JSON.parse(event.pricing_details);
            if (event.food_details) event.food = JSON.parse(event.food_details);
            if (event.attractions) event.attractionsData = JSON.parse(event.attractions);
        } catch (e) { }

        db.get('SELECT id FROM subscriptions WHERE event_id = ? AND user_id = ?', [eventId, userId], (err, subscription) => {
            const isSubscribed = !!subscription;
            db.get('SELECT COUNT(*) as count FROM subscriptions WHERE event_id = ?', [eventId], (err, row) => {
                const currentSubCount = row ? row.count : 0;
                res.render('evento-detalhe', {
                    event: event,
                    isSubscribed: isSubscribed,
                    currentSubCount: currentSubCount,
                    now: new Date() // <-- ADICIONA A DATA/HORA ATUAL
                });
            });
        });
    });
});

//
// ROTA SIMULADA DE PAGAMENTO
//
router.get('/site/pagamento/:id', isLoggedIn, (req, res) => {
    const eventId = req.params.id;
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

//
// ROTA PARA O USUÁRIO GERAR O PRÓPRIO CERTIFICADO
//
router.get('/site/meu-certificado/:id', isLoggedIn, (req, res) => {
    const eventId = req.params.id;
    const userId = req.session.user.id;
    const userName = req.session.user.name;

    // 1. Verifica se o usuário está REALMENTE inscrito
    db.get('SELECT id FROM subscriptions WHERE event_id = ? AND user_id = ?', [eventId, userId], (err, subscription) => {
        if (err || !subscription) {
            return res.status(403).render('error', {
                title: 'Acesso Negado',
                message: 'Você não está (ou não esteve) inscrito neste evento, portanto não podemos gerar seu certificado.'
            });
        }

        // 2. Se estiver inscrito, busca os dados do evento (com schedule)
        db.get('SELECT title, schedule_details FROM events WHERE id = ?', [eventId], (err, event) => {
            if (err || !event) {
                return res.status(404).render('error', {
                    title: 'Erro 404',
                    message: 'O evento que você está procurando não foi encontrado.'
                });
            }

            // --- INÍCIO CÁLCULO DE DURAÇÃO (Igual ao do Admin) ---
            let totalHours = 0;
            let totalDays = 0;
            let schedule = {};

            try {
                if (event.schedule_details) {
                    schedule = JSON.parse(event.schedule_details);
                }

                if (schedule.date_start && schedule.time_start && schedule.date_end && schedule.time_end) {
                    const start = new Date(`${schedule.date_start}T${schedule.time_start}:00`);
                    const end = new Date(`${schedule.date_end}T${schedule.time_end}:00`);

                    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
                        const diffMs = end.getTime() - start.getTime();
                        totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

                        const dayStart = new Date(schedule.date_start);
                        dayStart.setHours(0, 0, 0, 0);
                        const dayEnd = new Date(schedule.date_end);
                        dayEnd.setHours(0, 0, 0, 0);

                        const dayDiffMs = dayEnd.getTime() - dayStart.getTime();
                        totalDays = Math.round(dayDiffMs / (1000 * 60 * 60 * 24)) + 1;
                    }
                }
            } catch (e) {
                console.error("Erro ao calcular datas:", e);
            }
            // --- FIM CÁLCULO DE DURAÇÃO ---


            // 3. Gera o PDF (para UMA pessoa)
            const doc = new PDFDocument({
                layout: 'landscape',
                size: 'A4',
                margin: 50
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="certificado_${event.title.replace(/\s/g, '_')}.pdf"`);
            doc.pipe(res);

            // Desenha o certificado (sem loop)
            doc.fontSize(28)
                .font('Helvetica-Bold')
                .text('CERTIFICADO DE PARTICIPAÇÃO', { align: 'center' });

            doc.moveDown(2);
            doc.fontSize(18).font('Helvetica').text('Certificamos que', { align: 'center' });
            doc.moveDown(1);

            doc.fontSize(26).font('Helvetica-Bold').fillColor('blue').text(userName.toUpperCase(), { align: 'center' });

            doc.moveDown(1);
            doc.fontSize(18).font('Helvetica').fillColor('black').text('participou do evento:', { align: 'center' });
            doc.moveDown(0.5);

            doc.fontSize(22).font('Helvetica-Bold').text(`"${event.title}"`, { align: 'center' });

            // --- As novas linhas de Duração/Dias ---
            doc.moveDown(1.5);
            doc.fontSize(16)
                .font('Helvetica')
                .text(
                    `Realizado de ${schedule.date_start ? new Date(schedule.date_start).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}` +
                    ` a ${schedule.date_end ? new Date(schedule.date_end).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}.`,
                    { align: 'center' }
                );

            if (totalHours > 0) {
                doc.moveDown(0.5);
                doc.fontSize(16)
                    .font('Helvetica-Bold')
                    .text(
                        `Carga horária total: ${totalHours} horas.` +
                        (totalDays > 1 ? ` (${totalDays} dias)` : ''),
                        { align: 'center' }
                    );
            }
            // --- Fim das novas linhas ---

            doc.moveDown(2);
            doc.fontSize(12).font('Helvetica').text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });

            doc.strokeColor('black')
                .lineWidth(1)
                .moveTo(doc.page.width / 2 - 150, doc.page.height - 100)
                .lineTo(doc.page.width / 2 + 150, doc.page.height - 100)
                .stroke();

            doc.fontSize(12).font('Helvetica-Bold').text('Eventum Admin', {
                align: 'center',
                width: 300,
                x: doc.page.width / 2 - 150
            });

            // 4. Finaliza o PDF
            doc.end();
        });
    });
});

//
// ROTA PARA O USUÁRIO CANCELAR UMA INSCRIÇÃO
//
router.post('/site/cancelar-inscricao', isLoggedIn, (req, res) => {
    const { eventId } = req.body;
    const userId = req.session.user.id;

    if (!eventId) {
        req.session.message = { type: 'error', text: 'Evento não especificado.' };
        return res.redirect('/site/minha-conta');
    }

    // 1. Verifica se o evento é pago ANTES de deletar
    db.get('SELECT pricing_details FROM events WHERE id = ?', [eventId], (err, event) => {
        let isPaid = false;
        if (!err && event && event.pricing_details) {
            try {
                // Lê o JSON de preço [cite: 110]
                const pricing = JSON.parse(event.pricing_details);
                if (pricing.isFree === 'false') {
                    isPaid = true;
                }
            } catch (e) { /* ignora erro de parse */ }
        }

        // 2. Deleta a inscrição do banco
        db.run('DELETE FROM subscriptions WHERE event_id = ? AND user_id = ?', [eventId, userId], function (err) {
            if (err) {
                req.session.message = { type: 'error', text: 'Erro ao cancelar inscrição.' };
                return res.redirect('/site/minha-conta');
            }

            // this.changes > 0 significa que a linha foi de fato deletada
            if (this.changes > 0) {
                // 3. Define a mensagem de sucesso com base no preço
                if (isPaid) {
                    // MENSAGEM DE REEMBOLSO (Sua solicitação)
                    req.session.message = { type: 'success', text: 'Inscrição cancelada! O reembolso será processado em até 24 horas.' };
                } else {
                    // Mensagem padrão
                    req.session.message = { type: 'success', text: 'Inscrição cancelada com sucesso.' };
                }
            } else {
                req.session.message = { type: 'error', text: 'Inscrição não encontrada.' };
            }

            // 4. Redireciona de volta para a página "Minha Conta"
            return res.redirect('/site/minha-conta');
        });
    });
});

module.exports = router;
// src/routes/adminRoutes.js
const express = require('express');
const path = require('path');
const db = require('../db');
const { isAdmin } = require('../middleware'); // Puxa o middleware que criamos
const multer = require('multer');           // Importa o Multer
const PDFDocument = require('pdfkit');      // Importa o PDFKit
const router = require('./subscribe');

// --- POOLS DE DADOS ALEATÓRIOS ---
const sampleImages = [
    'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    'https://images.pexels.com/photos/2111015/pexels-photo-2111015.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1'
];
const sampleCategories = ['Palestra', 'Workshop', 'Conferência', 'Networking', 'Cultural', 'Outro'];
const sampleFirstNames = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Iris', 'Jorge'];
const sampleLastNames = ['Silva', 'Souza', 'Pereira', 'Costa', 'Martins', 'Alves', 'Ribeiro', 'Neves'];
const sampleProfessions = ['Eng. de Software', 'Designer UX/UI', 'Cientista de Dados', 'PO', 'DevOps', 'Artista 3D', 'Marketing Digital', 'IA Specialist'];

// --- FUNÇÕES HELPER ---
/** Pega um item aleatório de uma lista */
const r = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Gera uma data aleatória (1-60 dias no futuro) */
function getRandomDate() {
    const today = new Date();
    const futureDays = Math.floor(Math.random() * 60) + 1;
    today.setDate(today.getDate() + futureDays);
    return today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

/** Gera uma hora aleatória (entre 09:00 e 20:30) */
function getRandomTime() {
    const hour = Math.floor(Math.random() * 12) + 9; // 9h-20h
    const minute = Math.random() > 0.5 ? '30' : '00';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
}

/** Cria uma lista de palestrantes aleatórios */
function createRandomPeople(count) {
    let people = [];
    for (let i = 0; i < count; i++) {
        people.push({
            nome: `${r(sampleFirstNames)} ${r(sampleLastNames)}`,
            profissao: r(sampleProfessions),
            horario: getRandomTime()
        });
    }
    return people;
}
// ▲▲▲ FIM DO NOVO BLOCO ▲▲▲

// 2. Configura onde o Multer vai salvar os arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // A pasta que você criou!
        cb(null, path.join(__dirname, 'public/uploads/'));
    },
    filename: function (req, file, cb) {
        // Cria um nome de arquivo único (data + nome original)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// 3. Cria a "ferramenta" de upload que usaremos nas rotas
const upload = multer({ storage: storage });

// ▼▼▼ COLE O NOVO BLOCO INTEIRO AQUI ▼▼▼
// --- ROTA PARA CRIAR EVENTO DE TESTE (AGORA ALEATÓRIA) ---
router.post('/site/eventos/criar-teste', isAdmin, (req, res) => {
    const createdBy = req.session.user.id;

    // 1. Define os dados aleatórios
    const isPaid = Math.random() > 0.5;
    const hasFood = Math.random() > 0.5;
    const isFoodPaid = hasFood && Math.random() > 0.5;

    const category = r(sampleCategories);
    const title = `${category} de Teste #${Math.floor(Math.random() * 1000)}`;
    const description = `Evento de teste ${isPaid ? 'pago' : 'gratuito'}. ${hasFood ? 'Haverá comida.' : 'Não haverá comida.'} Categoria: ${category}. Este é um evento de teste gerado automaticamente. Sinta-se à vontade para excluí-lo.`;
    const cover_image_url = r(sampleImages);

    const date_start = getRandomDate();
    const time_start = getRandomTime();
    const time_end = `${(parseInt(time_start.split(':')[0]) + Math.floor(Math.random() * 3) + 1).toString().padStart(2, '0')}:${time_start.split(':')[1]}`; // Duração de 1-3 horas

    // 2. Monta os JSONs
    const schedule_details = JSON.stringify({
        date_start: date_start,
        time_start: time_start,
        date_end: date_start, // Simplificado (mesmo dia)
        time_end: time_end
    });

    const address_details = JSON.stringify({
        street: `Rua ${r(sampleLastNames)}`,
        number: (Math.floor(Math.random() * 1000) + 1).toString(),
        neighborhood: 'Bairro Demo',
        cep: '12345-678'
    });

    const pricing_details = JSON.stringify({
        isFree: isPaid ? 'false' : 'true',
        price: isPaid ? (Math.floor(Math.random() * 19) + 1) * 5 : '' // Preço aleatório (5-100)
    });

    const food_details = JSON.stringify({
        hasFood: hasFood ? 'true' : 'false',
        isFree: isFoodPaid ? 'false' : 'true',
        price: isFoodPaid ? (Math.floor(Math.random() * 4) + 1) * 5 : '' // Preço aleatório (5-25)
    });

    const attractions = JSON.stringify({
        palestras: createRandomPeople(Math.floor(Math.random() * 3) + 1), // 1-3 palestrantes
        artistas: [],
        palestras_simultaneas: Math.random() > 0.7, // 30% de chance
        artistas_simultaneos: false
    });

    // 3. Insere no banco
    const stmt = db.prepare(
        `INSERT INTO events (title, description, created_by, qtdSubs, 
                         schedule_details, address_details, pricing_details, food_details, attractions, 
                         cover_image_url, organizer, category, is_hidden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    stmt.run(
        title, description, createdBy, 100, // qtdSubs
        schedule_details, address_details, pricing_details, food_details, attractions,
        cover_image_url, "Sistema de Teste", category, 0, // is_hidden
        function (err) {
            if (err) {
                console.error('Erro ao criar evento de teste:', err);
                req.session.message = { type: 'error', text: 'Erro ao criar evento de teste.' };
                return res.redirect('/site/eventos/novo');
            }

            // 4. Sucesso!
            req.session.message = { type: 'success', text: `Evento "${title}" criado com sucesso!` };
            res.redirect('/site/eventos'); // Manda para a home para ver o evento
        }
    );
    stmt.finalize();
});

router.get('/site/eventos/novo', isAdmin, (req, res) => {
    res.render('evento-novo'); // Renderiza o arquivo que criamos
});

/* [ CÓDIGO CORRIGIDO EM index.js ]
*/
router.post('/site/eventos/novo', isAdmin, upload.single('cover_image_upload'), (req, res) => {

    // Os campos de texto vêm em 'req.body'
    const { title, description, qtdSubs,
        schedule_details, address_details, pricing_details, food_details, attractions,
        cover_image_url, // O campo de URL
        organizer,
        category
    } = req.body;

    // CORREÇÃO: Lógica da Imagem
    let finalImageUrl = null;
    if (req.file) {
        // 1. Se o upload foi feito, ele ganha.
        // Salvamos o CAMINHO PÚBLICO da imagem
        finalImageUrl = '/uploads/' + req.file.filename;
    } else if (cover_image_url) {
        // 2. Se não, usamos a URL colada
        finalImageUrl = cover_image_url;
    }

    const is_hidden = req.body.is_hidden ? 1 : 0;
    const createdBy = req.session.user.id;

    // --- INÍCIO DA VALIDAÇÃO COMPLETA ---
    // 1. Parsear os JSONs que vêm do formulário
    let schedule, address;
    try {
        schedule = JSON.parse(schedule_details || '{}');
        address = JSON.parse(address_details || '{}');
    } catch (e) {
        return res.render('evento-novo', { error: 'Erro ao processar dados do formulário.', evento: req.body });
    }

    // 2. Criar uma lista de erros
    const errors = [];

    // Etapa 1
    if (!title) errors.push('O Título do Evento é obrigatório.');
    if (!description) errors.push('A Descrição é obrigatória.');

    // Etapa 2
    if (!address.street) errors.push('O Logradouro/Rua é obrigatório.');
    if (!address.number) errors.push('O Número do endereço é obrigatório.');
    if (!address.cep) errors.push('O CEP é obrigatório.');
    if (!address.neighborhood) errors.push('O Bairro é obrigatório.');

    // Etapa 3
    if (!schedule.date_start) errors.push('A Data de Início é obrigatória.');
    if (!schedule.time_start) errors.push('A Hora de Início é obrigatória.');
    if (!schedule.date_end) errors.push('A Data de Término é obrigatória.');
    if (!schedule.time_end) errors.push('A Hora de Término é obrigatória.');

    // 3. Checar se houveram erros
    if (errors.length > 0) {
        // Devolve TODOS os erros de uma vez, separados por quebra de linha (para o EJS)
        return res.render('evento-novo', {
            error: errors.join('<br>'),
            evento: req.body // Envia todos os dados de volta para o form não limpar
        });
    }
    // --- FIM DA VALIDAÇÃO COMPLETA ---

    // 3. Insere no banco...
    const stmt = db.prepare(
        `INSERT INTO events (title, description, created_by, qtdSubs, 
                         schedule_details, address_details, pricing_details, food_details, attractions, 
                         cover_image_url, organizer, category, is_hidden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
        title, description || null, createdBy, qtdSubs || 100,
        schedule_details || null, address_details || null, pricing_details || null, food_details || null, attractions || null,
        finalImageUrl, // <-- CORREÇÃO: Usa a URL final
        organizer || null,
        category || 'Indefinido',
        is_hidden,
        function (err) {
            if (err) {
                console.error('Erro ao criar evento:', err);
                return res.status(500).send('Erro ao salvar o evento.');
            }

            // ▼▼▼ ADICIONE ESTA LINHA ▼▼▼
            req.session.message = { type: 'success', text: 'Evento criado com sucesso!' };

            res.redirect('/site/eventos');
        }
    );
    stmt.finalize();
}); // <-- FECHAMENTO CORRETO DA ROTA "NOVO"

router.get('/site/eventos/:id/editar', isAdmin, (req, res) => {
    const eventId = req.params.id;

    db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, evento) => {
        if (err || !evento) {
            return res.status(404).send('Evento não encontrado');
        }
        res.render('evento-editar', { evento: evento });
    });
});


router.post('/site/eventos/:id/editar', isAdmin, upload.single('cover_image_upload'), (req, res) => {
    const eventId = req.params.id;

    const { title, description, qtdSubs,
        schedule_details, address_details, pricing_details, food_details, attractions,
        cover_image_url, organizer, category
    } = req.body;

    const is_hidden = req.body.is_hidden ? 1 : 0;

    if (!title) {
        const evento = req.body;
        evento.id = eventId;
        return res.render('evento-editar', {
            error: 'O título é obrigatório.',
            evento: evento
        });
    }

    // CORREÇÃO: Lógica complexa da imagem de edição
    // 1. Vamos atualizar todos os campos de TEXTO primeiro
    const stmtUpdateText = db.prepare(`
    UPDATE events
    SET title = ?, description = ?, qtdSubs = ?,
        schedule_details = ?, address_details = ?, pricing_details = ?, food_details = ?, attractions = ?,
        organizer = ?, category = ?, is_hidden = ?
    WHERE id = ?
  `);
    stmtUpdateText.run(
        title, description || null, qtdSubs || 100,
        schedule_details || null, address_details || null, pricing_details || null, food_details || null, attractions || null,
        organizer || null, category || 'Indefinido', is_hidden, eventId,
        function (err) {
            if (err) {
                console.error('Erro ao atualizar (texto) evento:', err);
                return res.status(500).send('Erro ao salvar o evento.');
            }

            // 2. AGORA, vamos checar a imagem
            let finalImageUrl = null;
            if (req.file) {
                // 2a. Se um NOVO UPLOAD foi feito, ele ganha
                finalImageUrl = '/uploads/' + req.file.filename;
            } else if (cover_image_url) {
                // 2b. Se não, usamos a URL (que pode ser a antiga ou uma nova colada)
                finalImageUrl = cover_image_url;
            }
            // 2c. Se os dois (upload e url) estiverem vazios, finalImageUrl é NULL,
            //    mas não vamos atualizar o campo (veja abaixo).

            // 3. Atualiza a imagem APENAS se uma nova foi enviada (upload ou URL)
            // 3. Atualiza a imagem APENAS se uma nova foi enviada (upload ou URL)
            if (finalImageUrl) {
                db.run('UPDATE events SET cover_image_url = ? WHERE id = ?', [finalImageUrl, eventId], (err) => {
                    if (err) console.error('Erro ao atualizar imagem do evento:', err);

                    // ▼▼▼ ADICIONE A MENSAGEM AQUI ▼▼▼
                    req.session.message = { type: 'success', text: 'Evento atualizado com sucesso!' };
                    res.redirect('/site/eventos/todos');
                });
            } else {
                // Se nenhuma imagem nova foi enviada, só redireciona

                // ▼▼▼ E ADICIONE A MENSAGEM AQUI TAMBÉM ▼▼▼
                req.session.message = { type: 'success', text: 'Evento atualizado com sucesso!' };
                res.redirect('/site/eventos/todos');
            }
        }
    );
    stmtUpdateText.finalize();
});


router.get('/site/eventos/:id/excluir', isAdmin, (req, res) => {
    const eventId = req.params.id;

    db.run('DELETE FROM events WHERE id = ?', [eventId], (err) => {
        if (err) {
            console.error('Erro ao excluir evento:', err);
            return res.status(500).send('Erro ao excluir o evento.');
        }

        // ▼▼▼ ADICIONE ESTA LINHA ▼▼▼
        req.session.message = { type: 'success', text: 'Evento excluído com sucesso.' };
        res.redirect('/site/eventos');
    });
});

router.get('/site/relatorio-admin', isAdmin, (req, res) => {

    // 1. Buscar todos os dados (usuários, eventos, inscrições)
    const sql = `
        SELECT 
            e.id, e.title, e.pricing_details, e.qtdSubs,
            COUNT(s.id) as inscritos_count
        FROM events e
        LEFT JOIN subscriptions s ON e.id = s.event_id
        GROUP BY e.id
        ORDER BY e.title;
    `;

    db.all(sql, [], (err, eventsData) => {
        if (err) return res.status(500).send('Erro ao gerar relatório');

        let totalRevenue = 0;
        let totalActiveSubscriptions = 0;

        // 2. Processar os dados em JS (para calcular a receita)
        const reportEvents = eventsData.map(event => {
            let eventPrice = 0;
            let isFree = true;

            if (event.pricing_details) {
                try {
                    const pricing = JSON.parse(event.pricing_details);
                    if (pricing.isFree === 'false' && pricing.price) {
                        eventPrice = parseFloat(pricing.price) || 0;
                        isFree = false;
                    }
                } catch (e) { }
            }

            const eventRevenue = eventPrice * event.inscritos_count;
            totalRevenue += eventRevenue;
            totalActiveSubscriptions += event.inscritos_count;

            return {
                title: event.title,
                status: isFree ? 'Gratuito' : 'Pago',
                price: eventPrice,
                vagas: event.qtdSubs || 100,
                inscritos: event.inscritos_count,
                receita: eventRevenue
            };
        });

        // 3. Buscar estatísticas gerais
        db.get("SELECT COUNT(*) as count FROM users", [], (err, userStats) => {
            db.get("SELECT COUNT(*) as count FROM subscriptions", [], (err, totalSubsStats) => {

                const reportData = {
                    geral: {
                        totalUsers: userStats.count,
                        totalEvents: eventsData.length,
                        totalActiveSubs: totalActiveSubscriptions,
                        totalHistoricalSubs: totalSubsStats.count,
                        totalRevenue: totalRevenue
                    },
                    eventos: reportEvents
                };

                // 4. Renderizar a nova página de relatório
                res.render('relatorio', { reportData });
            });
        });
    });
});

// --- NOVA ROTA PARA VER MENSAGENS DE CONTATO ---
router.get('/site/admin/mensagens', isAdmin, (req, res) => {

    // 1. Busca todas as mensagens, da mais nova para a mais antiga
    const sql = "SELECT * FROM contact_messages ORDER BY received_at DESC";

    db.all(sql, [], (err, messages) => {
        if (err) {
            console.error('Erro ao buscar mensagens:', err);
            return res.status(500).send('Erro ao carregar mensagens.');
        }

        // 2. Renderiza a nova página de mensagens
        res.render('mensagens-admin', { messages: messages });
    });
});







// --- ROTA "CAÓTICA" PARA GERAR CERTIFICADOS ---
router.get('/site/certificados/:id', isAdmin, (req, res) => {
    const eventId = req.params.id;

    // 1. Busca os detalhes do evento (precisamos do título)
    db.get('SELECT title FROM events WHERE id = ?', [eventId], (err, event) => {
        if (err || !event) {
            return res.status(404).send('Evento não encontrado');
        }

        // 2. Busca TODOS os usuários inscritos nesse evento
        const sql = `
            SELECT u.name, u.email 
            FROM users u
            JOIN subscriptions s ON u.id = s.user_id
            WHERE s.event_id = ?
            ORDER BY u.name
        `;

        db.all(sql, [eventId], (err, users) => {
            if (err) {
                return res.status(500).send('Erro ao buscar inscritos');
            }

            if (users.length === 0) {
                return res.status(404).send('Nenhum inscrito neste evento para gerar certificados.');
            }

            // 3. --- MÁGICA DO PDFKIT COMEÇA AQUI ---

            // Cria um novo documento PDF na memória
            const doc = new PDFDocument({
                layout: 'landscape', // Formato paisagem (deitado)
                size: 'A4',
                margin: 50
            });

            // Configura o cabeçalho da resposta para o navegador
            // Isso diz ao navegador: "Abra isso como um PDF"
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="certificados_${event.title.replace(/\s/g, '_')}.pdf"`);

            // "Canaliza" o PDF sendo criado DIRETAMENTE para a resposta
            doc.pipe(res);

            // 4. Loop: Cria uma página para cada usuário
            users.forEach((user, index) => {

                // Desenha o certificado
                doc.fontSize(28)
                    .font('Helvetica-Bold')
                    .text('CERTIFICADO DE PARTICIPAÇÃO', { align: 'center' });

                doc.moveDown(2);

                doc.fontSize(18)
                    .font('Helvetica')
                    .text('Certificamos que', { align: 'center' });

                doc.moveDown(1);

                doc.fontSize(26)
                    .font('Helvetica-Bold')
                    .fillColor('blue') // Cor de destaque (pode ser var(--accent-color) em CSS, mas aqui é string)
                    .text(user.name.toUpperCase(), { align: 'center' });

                doc.moveDown(1);

                doc.fontSize(18)
                    .font('Helvetica')
                    .fillColor('black')
                    .text('participou do evento:', { align: 'center' });

                doc.moveDown(0.5);

                doc.fontSize(22)
                    .font('Helvetica-Bold')
                    .text(`"${event.title}"`, { align: 'center' });

                doc.moveDown(2);

                doc.fontSize(12)
                    .font('Helvetica')
                    .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });

                // Assinatura (simulada)
                doc.strokeColor('black')
                    .lineWidth(1)
                    .moveTo(doc.page.width / 2 - 150, doc.page.height - 100)
                    .lineTo(doc.page.width / 2 + 150, doc.page.height - 100)
                    .stroke();

                doc.fontSize(12)
                    .font('Helvetica-Bold')
                    .text('Eventum Admin', {
                        align: 'center',
                        width: 300,
                        x: doc.page.width / 2 - 150
                    });

                // Adiciona uma nova página (exceto para o último usuário)
                if (index < users.length - 1) {
                    doc.addPage();
                }
            });

            // 5. Finaliza o PDF
            doc.end();
        });
    });
});
// --- FIM DA ROTA CAÓTICA ---


module.exports = router;
document.addEventListener('DOMContentLoaded', () => {

    /* --- INÍCIO: Lógica do Tema Claro/Escuro --- */

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const htmlElement = document.documentElement; // A tag <html>

    // Função para atualizar o ícone do botão
    function updateIcon() {
        if (htmlElement.classList.contains('dark-theme')) {
            // Se o tema é escuro, mostra o sol
            themeToggleBtn.innerHTML = '☀️';
        } else {
            // Se o tema é claro, mostra a lua
            themeToggleBtn.innerHTML = '🌙';
        }
    }

    // Atualiza o ícone assim que a página carrega
    updateIcon();

    // "Ouvinte" do clique no botão
    themeToggleBtn.addEventListener('click', () => {
        // 1. Inverte a classe .dark-theme
        htmlElement.classList.toggle('dark-theme');

        // 2. Salva a escolha no localStorage
        if (htmlElement.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }

        // 3. Atualiza o ícone
        updateIcon();
    });

    /* --- FIM: Lógica do Tema --- */

    /* --- INÍCIO: Lógica do Formulário de Evento --- */

    const eventForm = document.getElementById('event-form');
    if (eventForm) {

        // --- 1. Lógica dos Checkboxes e Rádios Condicionais ---

        // Função genérica para esconder/mostrar seções
        const setupConditionalLogic = (radioName, sectionId, showValue) => {
            const radios = document.querySelectorAll(`input[name="${radioName}"]`);
            const section = document.getElementById(sectionId);
            if (!section) return;

            // Função que atualiza a visibilidade
            const updateSection = () => {
                // Encontra qual rádio está marcado
                const checkedRadio = document.querySelector(`input[name="${radioName}"]:checked`);
                if (checkedRadio) {
                    // Mostra a seção (tira 'hidden') APENAS se o valor for igual ao showValue
                    section.classList.toggle('hidden', checkedRadio.value !== showValue);
                }
            };

            // Adiciona o "ouvinte" de clique a todos os rádios do grupo
            radios.forEach(radio => {
                radio.addEventListener('change', updateSection);
            });

            // NOTA: Não precisamos rodar na carga, pois o EJS
            // já define a visibilidade correta no lado do servidor.
        };

        // Função para checkboxes
        const setupCheckboxLogic = (chkId, sectionId) => {
            const chk = document.getElementById(chkId);
            const section = document.getElementById(sectionId);
            if (!chk || !section) return;

            chk.addEventListener('change', () => {
                section.classList.toggle('hidden', !chk.checked);
            });
        };

        // Aplicando a lógica
        // 1. Preço: Mostra 'section-price' se o valor for 'false' (Não, é pago)
        setupConditionalLogic('isFree', 'section-price', 'false');

        // 2. Comida: Mostra 'section-food-details' se o valor for 'true' (Sim)
        setupConditionalLogic('hasFood', 'section-food-details', 'true');

        // 3. Preço Comida: Mostra 'section-food-price' se o valor for 'false' (Não, será pago)
        setupConditionalLogic('isFoodFree', 'section-food-price', 'false');
        setupCheckboxLogic('chk-palestras', 'section-palestras');
        setupCheckboxLogic('chk-artistas', 'section-artistas');

        // Lógica dos horários simultâneos (Palestras)
        const chkPalestrasSimult = document.getElementById('chk-palestras-simultaneas');
        if (chkPalestrasSimult) {
            chkPalestrasSimult.addEventListener('change', () => {
                const hidden = !chkPalestrasSimult.checked;
                // Esconde a caixa de aviso
                document.querySelector('#section-palestras .warning-text').classList.toggle('hidden', hidden);
                // Esconde todos os inputs de horário
                document.querySelectorAll('.speaker-time').forEach(input => {
                    input.classList.toggle('hidden', !hidden);
                });
            });
            // Aciona no carregamento da página
            if (chkPalestrasSimult.checked) chkPalestrasSimult.dispatchEvent(new Event('change'));
        }

        // Lógica dos horários simultâneos (Artistas)
        const chkArtistasSimult = document.getElementById('chk-artistas-simultaneos');
        if (chkArtistasSimult) {
            chkArtistasSimult.addEventListener('change', () => {
                const hidden = !chkArtistasSimult.checked;
                document.querySelector('#section-artistas .warning-text').classList.toggle('hidden', hidden);
                document.querySelectorAll('.artist-time').forEach(input => {
                    input.classList.toggle('hidden', !hidden);
                });
            });
            if (chkArtistasSimult.checked) chkArtistasSimult.dispatchEvent(new Event('change'));
        }


        // --- 2. Lógica de Adicionar Campos Dinâmicos (Palestrantes) ---
        const addSpeakerBtn = document.getElementById('add-speaker');
        const speakersList = document.getElementById('speakers-list');

        if (addSpeakerBtn) {
            addSpeakerBtn.addEventListener('click', () => {
                const item = document.createElement('div');
                item.className = 'dynamic-item';
                item.innerHTML = `
                    <input type="text" placeholder="Nome do Palestrante" class="form-control speaker-name">
                    <input type="text" placeholder="Profissão/Tópico" class="form-control speaker-job">
                    <input type="time" placeholder="Horário" class="form-control speaker-time">
                `;
                // Se "simultâneo" estiver marcado, já esconde o horário
                if (chkPalestrasSimult.checked) {
                    item.querySelector('.speaker-time').classList.add('hidden');
                }
                speakersList.appendChild(item);
            });
        }

        // --- 3. Lógica de Adicionar Campos Dinâmicos (Artistas) ---
        const addArtistBtn = document.getElementById('add-artist');
        const artistsList = document.getElementById('artists-list');

        if (addArtistBtn) {
            addArtistBtn.addEventListener('click', () => {
                const item = document.createElement('div');
                item.className = 'dynamic-item';
                item.innerHTML = `
                    <input type="text" placeholder="Nome do Artista/Grupo" class="form-control artist-name">
                    <input type="text" placeholder="O que faz (ex: Banda, Teatro)" class="form-control artist-desc">
                    <input type="time" placeholder="Horário" class="form-control artist-time">
                `;
                if (chkArtistasSimult.checked) {
                    item.querySelector('.artist-time').classList.add('hidden');
                }
                artistsList.appendChild(item);
            });
        }


        // --- 4. O MAIS IMPORTANTE: Montar o JSON antes de Enviar ---
        eventForm.addEventListener('submit', (e) => {

            // 4.1 Schedule JSON
            const schedule = {
                date_start: document.getElementById('date_start').value,
                time_start: document.getElementById('time_start').value,
                date_end: document.getElementById('date_end').value,
                time_end: document.getElementById('time_end').value,
            };
            document.getElementById('schedule-json').value = JSON.stringify(schedule);

            // 4.2 Address JSON
            const address = {
                street: document.getElementById('address_street').value,
                number: document.getElementById('address_number').value,
                neighborhood: document.getElementById('address_neighborhood').value,
                cep: document.getElementById('address_cep').value,
            };
            document.getElementById('address-json').value = JSON.stringify(address);

            // 4.3 Pricing JSON
            const pricing = {
                isFree: document.querySelector('input[name="isFree"]:checked').value,
                price: document.getElementById('event_price').value
            };
            document.getElementById('pricing-json').value = JSON.stringify(pricing);

            // 4.4 Food JSON
            const food = {
                hasFood: document.querySelector('input[name="hasFood"]:checked').value,
                isFree: document.querySelector('input[name="isFoodFree"]:checked').value,
                price: document.getElementById('food_price').value
            };
            document.getElementById('food-json').value = JSON.stringify(food);

            // 4.5 Attractions JSON
            const attractions = {
                palestras: [],
                palestras_simultaneas: document.getElementById('chk-palestras-simultaneas').checked,
                artistas: [],
                artistas_simultaneos: document.getElementById('chk-artistas-simultaneos').checked
            };

            // Coleta Palestrantes
            document.querySelectorAll('#speakers-list .dynamic-item').forEach(item => {
                const nome = item.querySelector('.speaker-name').value;
                if (nome) {
                    attractions.palestras.push({
                        nome: nome,
                        profissao: item.querySelector('.speaker-job').value,
                        horario: item.querySelector('.speaker-time').value
                    });
                }
            });

            // Coleta Artistas
            document.querySelectorAll('#artists-list .dynamic-item').forEach(item => {
                const nome = item.querySelector('.artist-name').value;
                if (nome) {
                    attractions.artistas.push({
                        nome: nome,
                        descricao: item.querySelector('.artist-desc').value,
                        horario: item.querySelector('.artist-time').value
                    });
                }
            });

            // Salva o JSON final no input hidden
            document.getElementById('attractions-json').value = JSON.stringify(attractions);
        });

    } // Fim do 'if (eventForm)'

    /* --- FIM: Lógica do Formulário de Evento --- */

    /* --- INÍCIO: Lógica do Chat Flutuante --- */
    const fabButton = document.getElementById('fab-chat-button');
    const chatPopup = document.getElementById('chat-popup');
    const closeButton = document.getElementById('chat-close-btn');

    if (fabButton && chatPopup && closeButton) {

        // Clica no balão 💬 para abrir/fechar
        fabButton.addEventListener('click', () => {
            chatPopup.classList.toggle('show');
        });

        // Clica no 'X' para fechar
        closeButton.addEventListener('click', () => {
            chatPopup.classList.remove('show');
        });
    }
    /* --- FIM: Lógica do Chat Flutuante --- */


    // Função que faz a mágica de auto-crescimento
    function autoGrow(element) {
        element.style.height = 'auto'; // Reseta a altura
        element.style.height = (element.scrollHeight) + 'px'; // Define a altura para o tamanho do conteúdo
    }

    // Encontra todos os textareas com a classe 'auto-grow'
    const textareas = document.querySelectorAll('textarea.form-control');

    // Adiciona o "ouvinte" de digitação
    textareas.forEach(textarea => {
        // Chama a função uma vez no início (caso o campo já venha preenchido)
        autoGrow(textarea);

        // Chama a função a cada vez que o usuário digita
        textarea.addEventListener('input', () => {
            autoGrow(textarea);
        });
    });

});
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

        // --- NOVA LÓGICA DO SELETOR DE IMAGEM ---
        const capaRadios = document.querySelectorAll('input[name="capa-tipo"]');
        const uploadSection = document.getElementById('upload-section');
        const urlSection = document.getElementById('url-section');
        const uploadInput = document.getElementById('cover_image_upload');
        const urlInput = document.getElementById('cover_image_url');

        if (uploadSection && urlSection) {
            capaRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === 'upload') {
                        uploadSection.classList.remove('hidden');
                        urlSection.classList.add('hidden');
                        urlInput.value = ''; // Limpa o campo de URL
                    } else {
                        uploadSection.classList.add('hidden');
                        urlSection.classList.remove('hidden');
                        uploadInput.value = null; // Limpa o campo de Upload
                    }
                });
            });
        }
        // --- FIM DA NOVA LÓGICA ---

        // --- NOVA LÓGICA DO STEPPER ---
        const steps = document.querySelectorAll('.form-step');
        const nextButtons = document.querySelectorAll('button[data-nav="next"]');
        const prevButtons = document.querySelectorAll('button[data-nav="prev"]');
        const indicator = document.getElementById('form-step-indicator');
        let currentStep = 1;

        const showStep = (stepNumber) => {
            // Esconde todas as etapas
            steps.forEach(step => step.classList.remove('active'));
            // Mostra a etapa correta
            const activeStep = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
            if (activeStep) {
                activeStep.classList.add('active');
                indicator.textContent = `Passo ${stepNumber} de ${steps.length}`;
                currentStep = stepNumber;
            }
        };

        nextButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (currentStep < steps.length) {
                    showStep(currentStep + 1);
                }
            });
        });

        prevButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (currentStep > 1) {
                    showStep(currentStep - 1);
                }
            });
        });

        // Inicia na etapa 1 (já está no HTML, mas para garantir)
        showStep(1);
        // --- FIM DA LÓGICA DO STEPPER ---

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
                price: document.getElementById('event_price').value,
                qtdSubs: document.getElementById('qtdSubs').value
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

    /* --- INÍCIO: Máscara de CPF --- */
    const cpfInput = document.getElementById('cpf-mask');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.substring(0, 11);

            let formatted = '';
            if (value.length > 0) formatted += value.substring(0, 3);
            if (value.length >= 4) formatted += '.' + value.substring(3, 6);
            if (value.length >= 7) formatted += '.' + value.substring(6, 9);
            if (value.length >= 10) formatted += '-' + value.substring(9, 11);

            e.target.value = formatted;
        });
    }
    /* --- FIM: Máscara de CPF --- */


    /* --- INÍCIO: Validação reCAPTCHA Simulado --- */
    const registerForm = document.getElementById('register-form');
    const recaptchaCheck = document.getElementById('recaptcha-check');
    const registerSubmitBtn = document.getElementById('register-submit-btn');

    if (registerForm && recaptchaCheck && registerSubmitBtn) {
        // Desabilita o botão no início
        registerSubmitBtn.disabled = true;

        recaptchaCheck.addEventListener('change', () => {
            // Habilita/desabilita o botão baseado no checkbox
            registerSubmitBtn.disabled = !recaptchaCheck.checked;
        });
    }
    /* --- FIM: Validação reCAPTCHA --- */

    /* --- INÍCIO: Lógica das Abas (Minha Conta) --- */
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'active' de todos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Adiciona 'active' no clicado
            button.classList.add('active');
            const targetContent = document.querySelector(button.dataset.target);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    /* --- FIM: Lógica das Abas --- */

    /* --- INÍCIO: Lógica do "Olhinho" da Senha --- */
    // Pega TODOS os botões de "olho" da página
    const allPasswordToggles = document.querySelectorAll('.password-toggle');

    allPasswordToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            // Encontra o input de senha que é "irmão" do wrapper
            const passwordInput = toggle.previousElementSibling;

            if (passwordInput && passwordInput.type === 'password') {
                // Se for senha, muda para texto
                passwordInput.type = 'text';
                toggle.textContent = '🙈'; // Micon
            } else if (passwordInput) {
                // Se for texto, muda para senha
                passwordInput.type = 'password';
                toggle.textContent = '👁️'; // Olho
            }
        });
    });
    /* --- FIM: Lógica do "Olhinho" da Senha --- */

    /* --- INÍCIO: Salvar Termos e 2FA (Minha Conta) --- */
    const termosForm = document.getElementById('termos-form-simulado');

    if (termosForm) {
        termosForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Impede o recarregamento da página

            const termosBtn = document.getElementById('salvar-termos-btn');
            const termosSuccess = document.getElementById('termos-success-msg');
            const termosCheck = document.getElementById('termos-check');

            // ▼▼▼ CORREÇÃO AQUI ▼▼▼
            const check2FA = document.getElementById('2fa-check'); // Corrigido de "2faCheck"

            // Pega os valores atuais
            const aceitouTermos = termosCheck.checked;
            // ▼▼▼ CORREÇÃO AQUI ▼▼▼
            const usa2FA = check2FA.checked; // Corrigido de "2faCheck"

            // Desabilita o botão
            termosBtn.disabled = true;
            termosBtn.textContent = 'Salvando...';

            try {
                // 2. Envia os dados para a nova rota do backend
                const response = await fetch('/site/atualizar-privacidade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        aceitou_termos: aceitouTermos,
                        usa_2fa: usa2FA
                    })
                });

                if (!response.ok) { throw new Error('Falha ao salvar'); }

                // 3. Sucesso!
                termosSuccess.classList.remove('hidden'); // Mostra a mensagem
                termosBtn.classList.add('hidden');       // ESCONDE O BOTÃO (permanente)

                // TRAVA OS CHECKBOXES (permanente)
                if (termosCheck) termosCheck.disabled = true;
                // ▼▼▼ CORREÇÃO AQUI ▼▼▼
                if (check2FA) check2FA.disabled = true; // Corrigido de "2faCheck"

            } catch (err) {
                console.error(err);
                alert('Erro ao salvar. Tente novamente.');
                // Se der erro, reabilita o botão para tentar de novo
                termosBtn.disabled = false;
                termosBtn.textContent = 'Salvar Preferências';
            }
        });
    }
    /* --- FIM: Salvar Termos e 2FA --- */

    /* --- INÍCIO: Lógica de Edição "Meus Dados" --- */
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-profile-btn');
    const viewActions = document.getElementById('profile-actions-view');
    const editActions = document.getElementById('profile-actions-edit');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone-mask'); // O ID que já usamos

    if (editBtn && cancelBtn && viewActions && editActions && nameInput && phoneInput) {

        const originalName = nameInput.value;
        const originalPhone = phoneInput.value;

        // Clica em "Alterar Dados"
        editBtn.addEventListener('click', () => {
            viewActions.classList.add('hidden');
            editActions.classList.remove('hidden');
            nameInput.disabled = false;
            phoneInput.disabled = false;
        });

        // Clica em "Cancelar"
        cancelBtn.addEventListener('click', () => {
            viewActions.classList.remove('hidden');
            editActions.classList.add('hidden');
            nameInput.disabled = true;
            phoneInput.disabled = true;

            // Restaura os valores originais
            nameInput.value = originalName;
            phoneInput.value = originalPhone;
        });
    }
    /* --- FIM: Lógica de Edição "Meus Dados" --- */

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

    /* --- INÍCIO: Lógica do Carrossel (Home) --- */
    const track = document.getElementById('carousel-track');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if (track && prevBtn && nextBtn) {
        // Tenta pegar a largura do slide
        const slide = track.querySelector('.carousel-slide');

        if (slide) { // Garante que o slide existe antes de tentar ler
            const slideWidth = slide.clientWidth;

            prevBtn.addEventListener('click', () => {
                track.scrollBy({ left: -slideWidth, behavior: 'smooth' });
            });
            nextBtn.addEventListener('click', () => {
                track.scrollBy({ left: slideWidth, behavior: 'smooth' });
            });
        }
    }
    /* --- FIM: Lógica do Carrossel --- */

});
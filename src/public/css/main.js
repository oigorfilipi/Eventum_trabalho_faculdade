document.addEventListener('DOMContentLoaded', () => {

    /* --- INÍCIO: Lógica do Tema Claro/Escuro --- */

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const htmlElement = document.documentElement; // A tag <html>

    // Função para atualizar o ícone do botão
    function updateIcon() {
        if (htmlElement.classList.contains('light-theme')) {
            themeToggleBtn.innerHTML = '🌙'; // Tema claro, mostra lua (próximo clique = escuro)
        } else {
            themeToggleBtn.innerHTML = '☀️'; // Tema escuro, mostra sol (próximo clique = claro)
        }
    }

    // Atualiza o ícone assim que a página carrega
    updateIcon();

    // "Ouvinte" do clique no botão
    themeToggleBtn.addEventListener('click', () => {
        // 1. Inverte a classe na tag <html>
        htmlElement.classList.toggle('light-theme');

        // 2. Salva a escolha no localStorage
        if (htmlElement.classList.contains('light-theme')) {
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.setItem('theme', 'dark');
        }

        // 3. Atualiza o ícone
        updateIcon();
    });

    /* --- FIM: Lógica do Tema --- */

    /* --- INÍCIO: Lógica do Formulário de Evento --- */

    // Checa se estamos na página de formulário de evento
    const eventForm = document.getElementById('event-form');
    if (eventForm) {

        // --- 1. Lógica dos Checkboxes Condicionais ---
        const checkboxes = [
            document.getElementById('chk-palestras'),
            document.getElementById('chk-artistas')
        ];

        checkboxes.forEach(chk => {
            if (!chk) return; // Segurança caso o ID esteja errado
            const targetSection = document.querySelector(chk.dataset.target);
            if (!targetSection) return;

            chk.addEventListener('change', () => {
                targetSection.classList.toggle('hidden', !chk.checked);
            });
        });

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
                `;
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
                `;
                artistsList.appendChild(item);
            });
        }


        // --- 4. O MAIS IMPORTANTE: Montar o JSON antes de Enviar ---
        const hiddenJsonInput = document.getElementById('attractions-json');

        eventForm.addEventListener('submit', (e) => {

            const attractions = {
                palestras: [],
                artistas: []
            };

            // Coleta Palestrantes
            document.querySelectorAll('#speakers-list .dynamic-item').forEach(item => {
                const nome = item.querySelector('.speaker-name').value;
                const profissao = item.querySelector('.speaker-job').value;
                if (nome) { // Só adiciona se tiver um nome
                    attractions.palestras.push({ nome, profissao });
                }
            });

            // Coleta Artistas
            document.querySelectorAll('#artists-list .dynamic-item').forEach(item => {
                const nome = item.querySelector('.artist-name').value;
                const descricao = item.querySelector('.artist-desc').value;
                if (nome) { // Só adiciona se tiver um nome
                    attractions.artistas.push({ nome, descricao });
                }
            });

            // Converte o objeto em string JSON e coloca no input hidden
            hiddenJsonInput.value = JSON.stringify(attractions);
        });

    } // Fim do 'if (eventForm)'

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
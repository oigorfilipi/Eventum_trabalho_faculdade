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
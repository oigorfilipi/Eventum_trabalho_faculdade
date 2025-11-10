document.addEventListener('DOMContentLoaded', () => {

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
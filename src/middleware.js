// src/middleware.js

// Função "Segurança" para checar se o usuário está logado
const isLoggedIn = (req, res, next) => {
    if (!req.session.user) {
        // Se não estiver logado, manda para a página de login
        return res.redirect('/site/login');
    }
    next(); // Se estiver logado, continua
};

// Função "Segurança" para checar se é Admin
const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        // Se não for admin, manda para o login com erro
        return res.render('login', { error: 'Você precisa ser um admin para acessar esta página.' });
    }
    next();
};

// Exporta as duas funções para outros arquivos poderem usar
module.exports = {
    isLoggedIn,
    isAdmin
};
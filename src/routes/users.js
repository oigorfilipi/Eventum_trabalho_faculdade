const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// POST /users -> { name, email, password }
router.post('/', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email e password são obrigatórios' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    // AQUI ESTÁ A CORREÇÃO:
    // Pega a role (igual ao index.js)
    const userRole = (email.toLowerCase() === 'admin@eventum.com') ? 'admin' : 'user';

    // Muda o SQL para incluir 'role'
    const stmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    // Passa a 'userRole' como 4º parâmetro
    stmt.run(name, email, hashed, userRole, function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Email já cadastrado' });
        }
        return res.status(500).json({ error: 'Erro ao salvar usuário' });
      }
      // Retorna a role também no JSON
      return res.status(201).json({ id: this.lastID, name, email, role: userRole });
    });
    stmt.finalize();
  } catch (e) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;

const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

const db = new sqlite3.Database(path.join(__dirname, 'database', 'database.sqlite'), (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS vendedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    nome_loja TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefone TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    cpf TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL
  )`);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/register', async (req, res) => {
  const { nome, email, telefone, cpf, cnpj, senha, nome_loja } = req.body;

  if (!nome || !email || !telefone || !senha || !nome_loja || !cnpj || !cpf) {
    return res.status(400).json({ error: 'Por favor, preencha todos os campos obrigatórios.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);

    const query = `INSERT INTO vendedores (nome, nome_loja, email, telefone, cnpj, cpf, senha) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [nome, nome_loja, email, telefone, cnpj, cpf, hashedPassword];

    db.run(query, params, function(err) {
      if (err) {
        console.error('Erro ao cadastrar vendedor:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({ message: 'Cadastro de vendedor realizado com sucesso!' });
    });
  } catch (error) {
    console.error('Erro ao processar a solicitação:', error.message);
    res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  const query = `SELECT * FROM vendedores WHERE email = ?`;
  const params = [email];

  db.get(query, params, async (err, vendedor) => {
    if (err) {
      return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
    if (!vendedor) {
      return res.status(401).json({ error: 'Vendedor não encontrado.' });
    }

    const match = await bcrypt.compare(senha, vendedor.senha);
    if (!match) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const token = jwt.sign({ id: vendedor.id, role: 'vendedor' }, 'secretkey', { expiresIn: '1h' });

    res.json({
      token,
      message: 'Login realizado com sucesso!',
      redirectUrl: '/admin'
    });
  });
});

app.get('/admin', (req, res) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const tokenWithPrefix = token.startsWith('Bearer ') ? token.slice(7) : token;

  jwt.verify(tokenWithPrefix, 'secretkey', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido.' });
    }

    res.send(`<h1>Bem-vindo, ${decoded.role}!</h1><a href="/">Voltar para a página inicial</a>`);
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

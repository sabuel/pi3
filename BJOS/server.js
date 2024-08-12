const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

const fs = require('fs');

const databaseDir = path.join(__dirname, 'database');

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir);
}


const db = new sqlite3.Database(path.join(__dirname, 'database', 'database.sqlite'), (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefone TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL
  )`);

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

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'src')));


app.post('/register', async (req, res) => {
  const { role, nome, email, telefone, cpf, cnpj, senha, nome_loja } = req.body;

  console.log('Dados recebidos:', req.body);

  if (!role || !nome || !email || !telefone || !senha || (role === 'cliente' && !cpf) || (role === 'vendedor' && (!nome_loja || !cnpj))) {
    return res.status(400).json({ error: 'Por favor, preencha todos os campos obrigatórios.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);

    let query;
    let params;

    if (role === 'cliente') {
      query = `INSERT INTO clientes (nome, email, telefone, cpf, senha) VALUES (?, ?, ?, ?, ?)`;
      params = [nome, email, telefone, cpf, hashedPassword];
    } else if (role === 'vendedor') {
      query = `INSERT INTO vendedores (nome, nome_loja, email, telefone, cnpj, cpf, senha) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      params = [nome, nome_loja, email, telefone, cnpj, cpf, hashedPassword];
    } else {
      return res.status(400).json({ error: 'Role inválido.' });
    }

    db.run(query, params, function(err) {
      if (err) {
        console.error('Erro ao cadastrar usuário:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Cadastro realizado com sucesso!');
      res.status(200).json({ message: 'Cadastro realizado com sucesso!' });
    });
  } catch (error) {
    console.error('Erro ao processar a solicitação:', error.message);
    res.status(500).json({ error: 'Ocorreu um erro ao processar sua solicitação.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  let query, params;

  if (email.includes('@')) {
    query = `SELECT * FROM clientes WHERE email = ?`;
    params = [email];
  } else {
    query = `SELECT * FROM vendedores WHERE email = ?`;
    params = [email];
  }

  db.get(query, params, async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    const match = await bcrypt.compare(senha, user.senha);
    if (!match) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const token = jwt.sign({ id: user.id, role: email.includes('@') ? 'cliente' : 'vendedor' }, 'secretkey', { expiresIn: '1h' });


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


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});


app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

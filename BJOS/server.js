const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

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

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

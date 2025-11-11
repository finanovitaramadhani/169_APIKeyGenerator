const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('./db'); // hubungkan ke MySQL

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// Halaman utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint untuk membuat API key
app.post('/create', (req, res) => {
  const apiKey = 'sk-sm-v1-' + crypto.randomBytes(16).toString('hex');

  // Simpan API key ke MySQL
  db.query('INSERT INTO api_keys (api_key) VALUES (?)', [apiKey], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Gagal membuat API key' });
    }
    res.json({ apiKey });
  });
});

// Endpoint untuk mengecek validitas API key
app.post('/cekapi', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ valid: false, message: 'API key tidak diberikan' });

  db.query('SELECT * FROM api_keys WHERE api_key = ?', [apiKey], (err, results) => {
    if (err) return res.status(500).json({ valid: false, message: 'Error server' });
    if (results.length === 0) return res.json({ valid: false, message: 'API key tidak valid' });

    const row = results[0];
    if (row.valid === 0) return res.json({ valid: false, message: 'API key sudah tidak berlaku' });

    res.json({ valid: true, message: 'API key valid' });
  });
});

// Endpoint untuk menonaktifkan API key (revoke)
app.post('/revoke', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ message: 'API key tidak diberikan' });

  db.query('UPDATE api_keys SET valid = 0 WHERE api_key = ?', [apiKey], (err, result) => {
    if (err) return res.status(500).json({ message: 'Gagal menonaktifkan API key' });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'API key tidak ditemukan' });

    res.json({ message: 'API key berhasil dinonaktifkan' });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Balikpapan30',
  port: 3309, 
  database: 'apikey_db'
});

db.connect(err => {
  if (err) {
    console.error('Gagal terhubung ke MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database.');
});

module.exports = db;

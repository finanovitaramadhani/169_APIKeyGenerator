const mysql = require("mysql2");

const ports = [3306, 3307, 3308, 3309, 3310, 3320];

ports.forEach(port => {
  const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Balikpapan30",
    port
  });

  db.connect(err => {
    if (!err) {
      console.log("🟢 MySQL aktif di port:", port);
    }
  });
});

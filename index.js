const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const cors = require("cors");
const db = require("./db");


const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// -----------------------------
// Fungsi generate API Key
// -----------------------------
function generateKey(prefix = "sk-") {
  return prefix + crypto.randomBytes(16).toString("hex");
}

// -----------------------------
// ROUTES: USER (Generate & Save API Key)
// -----------------------------
app.post("/users/generate-key", (req, res) => {
  const apiKey = generateKey("sk-");
  res.json({ apiKey });
});

app.post("/users/save", (req, res) => {
  const { firstName, lastName, email, apiKey } = req.body;

  if (!firstName || !lastName || !email || !apiKey) {
    return res.status(400).json({ error: "Semua data harus diisi" });
  }

  db.query(
    "INSERT INTO users (first_name, last_name, email) VALUES (?,?,?)",
    [firstName, lastName, email],
    (err, result) => {
      if (err) {
        console.log("DB Error:", err);
        return res.status(500).json({ error: "Email sudah digunakan atau error DB" });
      }

      const userId = result.insertId;

      db.query(
        "INSERT INTO api_keys (user_id, api_key, status) VALUES (?,?,?)",
        [userId, apiKey, "Aktif"],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Gagal menyimpan API Key" });
          res.json({ message: "User dan API Key berhasil disimpan" });
        }
      );
    }
  );
});

// -----------------------------
// ROUTES: ADMIN REGISTER
// -----------------------------
app.post("/admin/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username & Password wajib" });

  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO admins (username, password) VALUES (?,?)",
    [username, hash],
    (err) => {
      if (err) return res.status(500).json({ error: "Username sudah dipakai atau error DB" });
      res.json({ message: "Admin berhasil dibuat" });
    }
  );
});

// -----------------------------
// ROUTES: ADMIN LOGIN
// -----------------------------
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  db.query("SELECT * FROM admins WHERE username=?", [username], async (err, rows) => {
    if (err || rows.length === 0) return res.status(400).json({ error: "Username tidak ditemukan" });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: "Password salah" });

    const adminKey = generateKey("adm-");
    db.query("UPDATE admins SET admin_key=? WHERE id=?", [adminKey, admin.id]);

    res.json({ message: "Login berhasil", adminKey });
  });
});

// -----------------------------
// MIDDLEWARE: ADMIN AUTH
// -----------------------------
function adminAuth(req, res, next) {
  const key = req.header("x-admin-key");
  if (!key) return res.status(401).json({ error: "Admin key missing" });

  db.query("SELECT * FROM admins WHERE admin_key=?", [key], (err, rows) => {
    if (err || rows.length === 0) return res.status(401).json({ error: "Admin key invalid" });
    next();
  });
}

// -----------------------------
// ROUTES: ADMIN DATA
// -----------------------------
app.get("/admin/users", adminAuth, (req, res) => {
  db.query(
    `SELECT users.id, users.first_name, users.last_name, users.email,
            api_keys.api_key, api_keys.status
     FROM users
     LEFT JOIN api_keys ON users.id = api_keys.user_id`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Gagal mengambil data" });
      res.json({ users: rows });
    }
  );
});

app.post("/admin/generate", adminAuth, (req, res) => {
  const { userId } = req.body;
  const apiKey = generateKey("sk-");

  db.query(
    "INSERT INTO api_keys (user_id, api_key, status) VALUES (?,?,?)",
    [userId, apiKey, "Aktif"],
    (err) => {
      if (err) return res.status(500).json({ error: "Gagal generate key" });
      res.json({ message: "API Key berhasil dibuat", apiKey });
    }
  );
});

app.post("/admin/revoke", adminAuth, (req, res) => {
  const { apiKey } = req.body;
  db.query(
    "UPDATE api_keys SET status='Tidak Aktif' WHERE api_key=?",
    [apiKey],
    (err) => {
      if (err) return res.status(500).json({ error: "Gagal revoke key" });
      res.json({ message: "API Key di-nonaktifkan" });
    }
  );
});

// -----------------------------
// ROUTES: SERVE HTML PAGES
// -----------------------------
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

app.get("/admin-register", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin-register.html"))
);

app.get("/admin-login", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin-login.html"))
);

app.get("/admin-dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"))
);

// -----------------------------
// START SERVER
// -----------------------------
const open = require("open").default;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  open(`http://localhost:${PORT}`);
});

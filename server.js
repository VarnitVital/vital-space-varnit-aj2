
const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const db = new Database("vital-space.db");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    due_date TEXT DEFAULT '',
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campus_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'Submitted',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exchange_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    description TEXT DEFAULT '',
    contact TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

function cleanText(value, max = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "Vital Space" });
});

// Student Planner
app.get("/api/tasks", (req, res) => {
  res.json(
    db.prepare("SELECT * FROM tasks ORDER BY id DESC").all()
  );
});

app.post("/api/tasks", (req, res) => {
  const title = cleanText(req.body?.title, 120);
  const dueDate = cleanText(req.body?.due_date, 30);

  if (!title) {
    return res.status(400).json({ error: "Task title is required." });
  }

  const result = db.prepare(
    "INSERT INTO tasks (title, due_date) VALUES (?, ?)"
  ).run(title, dueDate);

  res.status(201).json(
    db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid)
  );
});

app.patch("/api/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid task ID." });
  }

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!task) return res.status(404).json({ error: "Task not found." });

  const completed = req.body?.completed;
  if (typeof completed !== "boolean") {
    return res.status(400).json({ error: "Completed must be true or false." });
  }

  db.prepare("UPDATE tasks SET completed = ? WHERE id = ?")
    .run(completed ? 1 : 0, id);

  res.json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(id));
});

app.delete("/api/tasks/:id", (req, res) => {
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(
    Number(req.params.id)
  );

  if (!result.changes) {
    return res.status(404).json({ error: "Task not found." });
  }
  res.json({ ok: true });
});

// Campus Care reports
app.get("/api/reports", (req, res) => {
  res.json(
    db.prepare("SELECT * FROM campus_reports ORDER BY id DESC").all()
  );
});

app.post("/api/reports", (req, res) => {
  const title = cleanText(req.body?.title, 120);
  const category = cleanText(req.body?.category, 60);
  const description = cleanText(req.body?.description, 1000);

  if (!title || !category) {
    return res.status(400).json({ error: "Title and category are required." });
  }

  const result = db.prepare(
    "INSERT INTO campus_reports (title, category, description) VALUES (?, ?, ?)"
  ).run(title, category, description);

  res.status(201).json(
    db.prepare("SELECT * FROM campus_reports WHERE id = ?")
      .get(result.lastInsertRowid)
  );
});

// Student Exchange listings
app.get("/api/listings", (req, res) => {
  res.json(
    db.prepare("SELECT * FROM exchange_listings ORDER BY id DESC").all()
  );
});

app.post("/api/listings", (req, res) => {
  const title = cleanText(req.body?.title, 120);
  const category = cleanText(req.body?.category, 60) || "Other";
  const description = cleanText(req.body?.description, 1000);
  const contact = cleanText(req.body?.contact, 150);

  if (!title) {
    return res.status(400).json({ error: "Listing title is required." });
  }

  const result = db.prepare(
    "INSERT INTO exchange_listings (title, category, description, contact) VALUES (?, ?, ?, ?)"
  ).run(title, category, description, contact);

  res.status(201).json(
    db.prepare("SELECT * FROM exchange_listings WHERE id = ?")
      .get(result.lastInsertRowid)
  );
});

app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Vital Space running at http://localhost:${PORT}`);
});

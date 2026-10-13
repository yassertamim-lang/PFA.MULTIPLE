const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'game.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    age INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    date_played DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

console.log('Database tables ready');

// ===== API ROUTES =====

// POST /api/users - Create or get user
app.post('/api/users', (req, res) => {
  try {
    const { name, age } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if user already exists
    let user = db.prepare('SELECT * FROM users WHERE name = ?').get(name.trim());

    if (!user) {
      const result = db.prepare('INSERT INTO users (name, age) VALUES (?, ?)').run(name.trim(), age || null);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    res.json(user);
  } catch (err) {
    console.error('Error creating/getting user:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:name - Get user by name
app.get('/api/users/:name', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(req.params.name);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error getting user:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scores - Save score
app.post('/api/scores', (req, res) => {
  try {
    const { userId, score, percentage } = req.body;
    
    if (!userId || score === undefined || percentage === undefined) {
      return res.status(400).json({ error: 'userId, score, and percentage are required' });
    }

    const result = db.prepare('INSERT INTO scores (user_id, score, percentage) VALUES (?, ?, ?)').run(userId, score, percentage);
    const newScore = db.prepare('SELECT * FROM scores WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json(newScore);
  } catch (err) {
    console.error('Error saving score:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scores/:userId - Get scores for user
app.get('/api/scores/:userId', (req, res) => {
  try {
    const scores = db.prepare('SELECT * FROM scores WHERE user_id = ? ORDER BY date_played DESC').all(req.params.userId);
    res.json(scores);
  } catch (err) {
    console.error('Error getting scores:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API base: http://localhost:${PORT}/api`);
});

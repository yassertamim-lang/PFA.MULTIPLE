"""
Multiplication Game - Python Flask Backend
Uses SQLite (game.db) for data storage
Run: python app.py
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__, static_folder='.')
CORS(app)  # Enable CORS for all routes

DB_PATH = os.path.join(os.path.dirname(__file__), 'game.db')


def get_db():
    """Get a database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript('''
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
    ''')
    conn.commit()
    conn.close()
    print("✅ Database tables ready (game.db)")


# ===== API ROUTES =====

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})


@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user or return existing one."""
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'error': 'Name is required'}), 400

        name = data['name'].strip()
        age = data.get('age')

        conn = get_db()
        cursor = conn.cursor()

        # Check if user already exists
        cursor.execute('SELECT * FROM users WHERE name = ?', (name,))
        user = cursor.fetchone()

        if not user:
            cursor.execute(
                'INSERT INTO users (name, age) VALUES (?, ?)',
                (name, age if age else None)
            )
            conn.commit()
            cursor.execute('SELECT * FROM users WHERE name = ?', (name,))
            user = cursor.fetchone()

        conn.close()
        return jsonify(dict(user)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/users/<name>', methods=['GET'])
def get_user(name):
    """Get user by name."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE name = ?', (name,))
        user = cursor.fetchone()
        conn.close()

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify(dict(user)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/scores', methods=['POST'])
def save_score():
    """Save a score for a user."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON'}), 400

        user_id = data.get('userId')
        score = data.get('score')
        percentage = data.get('percentage')

        if user_id is None or score is None or percentage is None:
            return jsonify({'error': 'userId, score, and percentage are required'}), 400

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO scores (user_id, score, percentage) VALUES (?, ?, ?)',
            (user_id, score, percentage)
        )
        conn.commit()

        cursor.execute(
            'SELECT * FROM scores WHERE id = ?',
            (cursor.lastrowid,)
        )
        new_score = cursor.fetchone()
        conn.close()

        return jsonify(dict(new_score)), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/scores/<int:user_id>', methods=['GET'])
def get_scores(user_id):
    """Get all scores for a user, ordered by date descending."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM scores WHERE user_id = ? ORDER BY date_played DESC',
            (user_id,)
        )
        scores = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(scores), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===== SERVE INDEX.HTML (optional, for convenience) =====

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


# ===== MAIN =====

if __name__ == '__main__':
    init_db()
    print("\n🚀 Server running on http://localhost:5000")
    print("📡 API base: http://localhost:5000/api")
    print("🌐 Open http://localhost:5000 in your browser to play!\n")
    app.run(host='0.0.0.0', port=5000, debug=True)

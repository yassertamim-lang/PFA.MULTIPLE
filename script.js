// ============================================================
// Multiplication Game - Frontend Script (script.js)
// Connects to Python Flask backend on port 5000 (SQLite)
// Run: python app.py
// ============================================================

const API_BASE = 'http://localhost:5000/api';

// DOM references
const signinContainer = document.getElementById('signinContainer');
const playerInfo = document.getElementById('playerInfo');
const gameArea = document.getElementById('gameArea');
const usernameInput = document.getElementById('username');
const ageInput = document.getElementById('age');
const btnSignIn = document.getElementById('btnSignIn');
const signinError = document.getElementById('signinError');
const playerNameSpan = document.getElementById('playerName');
const btnSignOut = document.getElementById('btnSignOut');
const scoreHistoryDiv = document.getElementById('scoreHistory');

const scoreSpan = document.getElementById('score');
const timeSpan = document.getElementById('time');
const questionEl = document.getElementById('question');
const answersDiv = document.getElementById('answers');
const resultEl = document.getElementById('result');
const scoreBarFill = document.getElementById('scoreBarFill');
const scorePercent = document.getElementById('scorePercent');

// Game state
let currentUser = null;
let timer = null;
let timeLeft = 10;
let totalAnswered = 100;
let correctAnswered = 0;
let isPlaying = false;
let currentCorrectAnswer = null;

// ===== UTILITY FUNCTIONS =====

function showError(msg) {
  signinError.textContent = msg;
  signinError.classList.remove('hidden');
}
function hideError() {
  signinError.classList.add('hidden');
}

function updateScoreBar(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  scoreBarFill.style.width = clamped + '%';
  scorePercent.textContent = Math.round(clamped) + '%';

  // Color based on percentage
  if (clamped >= 80) scoreBarFill.style.background = 'linear-gradient(90deg, #00b894, #00cec9)';
  else if (clamped >= 60) scoreBarFill.style.background = 'linear-gradient(90deg, #fdcb6e, #e17055)';
  else if (clamped >= 40) scoreBarFill.style.background = 'linear-gradient(90deg, #fab1a0, #e17055)';
  else scoreBarFill.style.background = 'linear-gradient(90deg, #ff7675, #d63031)';
}

// ===== LOCAL STORAGE (session only) =====

function saveSession(user) {
  sessionStorage.setItem('pfa_user', JSON.stringify(user));
}
function loadSession() {
  const data = sessionStorage.getItem('pfa_user');
  return data ? JSON.parse(data) : null;
}
function clearSession() {
  sessionStorage.removeItem('pfa_user');
}

// ===== API HELPERS =====

async function apiCreateUser(name, age) {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, age })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create user');
  }
  return res.json();
}

async function apiGetScores(userId) {
  const res = await fetch(`${API_BASE}/scores/${userId}`);
  if (!res.ok) return [];
  return res.json();
}

async function apiSaveScore(userId, score, percentage) {
  const res = await fetch(`${API_BASE}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, score, percentage })
  });
  return res.json();
}

// ===== SCORE HISTORY DISPLAY =====

async function displayScoreHistory(userId) {
  try {
    const scores = await apiGetScores(userId);
    if (!scores || scores.length === 0) {
      scoreHistoryDiv.textContent = 'Aucun score enregistré.';
      return;
    }
    // Show last 5 scores
    const recent = scores.slice(0, 5);
    scoreHistoryDiv.innerHTML = '<strong>Derniers scores:</strong><br>' +
      recent.map(s => {
        const date = new Date(s.date_played).toLocaleDateString('fr-FR');
        return `📅 ${date} — ${s.score} bonnes réponses (${s.percentage}%)`;
      }).join('<br>');
  } catch (err) {
    scoreHistoryDiv.textContent = 'Erreur chargement scores.';
  }
}

// ===== SIGN IN / SIGN OUT =====

btnSignIn.addEventListener('click', async () => {
  hideError();
  const name = usernameInput.value.trim();
  const age = parseInt(ageInput.value);

  if (!name) {
    showError('Veuillez entrer ton nom !');
    return;
  }
  if (name.length > 20) {
    showError('Nom trop long (max 20 caractères)');
    return;
  }
  if (!age || age < 5 || age > 15) {
    showError('Âge doit être entre 5 et 15 ans.');
    return;
  }

  btnSignIn.disabled = true;
  btnSignIn.textContent = 'Connexion...';

  try {
    currentUser = await apiCreateUser(name, age);
    saveSession(currentUser);

    // Show player info & game area
    signinContainer.classList.add('hidden');
    playerInfo.classList.remove('hidden');
    gameArea.classList.remove('hidden');

    playerNameSpan.textContent = currentUser.name;
    await displayScoreHistory(currentUser.id);

    startGame();
  } catch (err) {
    showError('Erreur: ' + err.message);
  } finally {
    btnSignIn.disabled = false;
    btnSignIn.textContent = 'Jouer ! 🚀';
  }
});

btnSignOut.addEventListener('click', () => {
  stopGame();
  clearSession();
  currentUser = null;
  signinContainer.classList.remove('hidden');
  playerInfo.classList.add('hidden');
  gameArea.classList.add('hidden');
  usernameInput.value = '';
  ageInput.value = '';
  resetGameUI();
});

// Check for existing session on page load
window.addEventListener('DOMContentLoaded', () => {
  const saved = loadSession();
  if (saved) {
    // Auto sign-in
    currentUser = saved;
    signinContainer.classList.add('hidden');
    playerInfo.classList.remove('hidden');
    gameArea.classList.remove('hidden');
    playerNameSpan.textContent = currentUser.name;
    displayScoreHistory(currentUser.id);
    startGame();
  }
});

// ===== GAME LOGIC =====

function resetGameUI() {
  scoreSpan.textContent = '0';
  timeSpan.textContent = '30';
  questionEl.textContent = '';
  answersDiv.innerHTML = '';
  resultEl.textContent = '';
  updateScoreBar(0);
}

function generateQuestion() {
  const a = Math.floor(Math.random() * 10) + 1;  // 1-10
  const b = Math.floor(Math.random() * 10) + 1;  // 1-10
  const correct = a * b;
  currentCorrectAnswer = correct;

  questionEl.textContent = `${a} × ${b} = ?`;

  // Generate 4 answer choices (1 correct + 3 random wrong)
  const choices = new Set();
  choices.add(correct);

  while (choices.size < 4) {
    // Generate wrong answers within reasonable range
    const offset = Math.floor(Math.random() * 10) + 1;
    const wrong = Math.random() > 0.5 ? correct + offset : Math.max(0, correct - offset);
    if (wrong !== correct && wrong >= 0) {
      choices.add(wrong);
    }
  }

  // Shuffle and create buttons
  const shuffled = Array.from(choices).sort(() => Math.random() - 0.5);
  answersDiv.innerHTML = '';
  shuffled.forEach(num => {
    const btn = document.createElement('button');
    btn.textContent = num;
    btn.addEventListener('click', () => handleAnswer(num));
    answersDiv.appendChild(btn);
  });
}

function handleAnswer(selected) {
  if (!isPlaying) return;

  // Disable all answer buttons
  document.querySelectorAll('#answers button').forEach(b => b.disabled = true);

  totalAnswered++;

  if (selected === currentCorrectAnswer) {
    correctAnswered++;
    resultEl.textContent = '✅ Correct !';
    resultEl.style.color = 'green';
  } else {
    resultEl.textContent = `❌ Faux! La réponse était ${currentCorrectAnswer}`;
    resultEl.style.color = 'red';
  }

  // Update score display
  const pct = totalAnswered > 0 ? (correctAnswered / totalAnswered) * 100 : 0;
  scoreSpan.textContent = Math.round(pct);
  updateScoreBar(pct);

  // Next question after short delay
  setTimeout(() => {
    if (isPlaying) {
      resultEl.textContent = '';
      generateQuestion();
    }
  }, 800);
}

function startGame() {
  stopGame(); // Clear any existing game
  isPlaying = true;
  timeLeft = 30;
  totalAnswered = 0;
  correctAnswered = 0;
  timeSpan.textContent = timeLeft;
  scoreSpan.textContent = '0';
  updateScoreBar(0);
  resultEl.textContent = '';

  generateQuestion();

  timer = setInterval(() => {
    timeLeft--;
    timeSpan.textContent = timeLeft;

    if (timeLeft <= 5) {
      timeSpan.style.color = 'red';
      timeSpan.style.fontWeight = 'bold';
    }

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function stopGame() {
  isPlaying = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  timeSpan.style.color = '';
  timeSpan.style.fontWeight = '';
}

async function endGame() {
  stopGame();

  // Disable answer buttons
  document.querySelectorAll('#answers button').forEach(b => b.disabled = true);

  const pct = totalAnswered > 0 ? Math.round((correctAnswered / totalAnswered) * 100) : 0;
  questionEl.textContent = `⏰ Temps écoulé! Score: ${correctAnswered}/${totalAnswered} (${pct}%)`;
  resultEl.textContent = '';

  // Save score to backend
  if (currentUser) {
    try {
      await apiSaveScore(currentUser.id, correctAnswered, pct);
      await displayScoreHistory(currentUser.id);
    } catch (err) {
      console.error('Failed to save score:', err);
    }
  }

  // Show "Play Again" button
  const playAgainBtn = document.createElement('button');
  playAgainBtn.textContent = '🔄 Rejouer';
  playAgainBtn.style.cssText = `
    display: block;
    width: 100%;
    max-width: 360px;
    margin: 12px auto;
    font-size: 1.1rem;
    padding: 12px 14px;
    border-radius: 12px;
    background: linear-gradient(90deg, #00b894, #00cec9);
    color: white;
    border: none;
    cursor: pointer;
    font-weight: 600;
  `;
  playAgainBtn.addEventListener('click', () => {
    playAgainBtn.remove();
    startGame();
  });
  answersDiv.appendChild(playAgainBtn);
}

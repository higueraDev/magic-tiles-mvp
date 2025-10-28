// Magic Tiles MVP core logic
// No build step; vanilla JS module.

const laneCount = 4; // number of lanes
const tileSpacingMs = 600; // base spacing between tiles
const renderAheadMs = 5000; // how far ahead to start rendering before hit time
const hitWindowMs = 130; // +/- window for a valid hit
const basePoints = 10;
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI refs
const screenStart = document.getElementById('screen-start');
const screenGame = document.getElementById('screen-game');
const screenEnd = document.getElementById('screen-end');
const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const scoreEl = document.getElementById('score');
const progressEl = document.getElementById('progress');
const finalScoreEl = document.getElementById('final-score');
const finalBestScoreEl = document.getElementById('final-best-score');
const bestScoreEl = document.getElementById('best-score');
const leaderboardOl = document.getElementById('leaderboard');
const endLeaderboardOl = document.getElementById('end-leaderboard');
const highscoreBlock = document.getElementById('highscore-block');

// Audio setup (real audio element). Fallback initial duration until metadata loads.
let songDurationMs = 30000; // replaced after metadata
let startTimestamp = null; // performance.now when playback actually starts (fallback reference)
let audioEl = null; // HTMLAudioElement instance

// Game state
let tiles = []; // array of {id,time,lane,hit:false}
let nextTileIndex = 0; // index of next tile needing rendering
let score = 0;
let gameStatus = 'idle'; // 'idle' | 'playing' | 'ended'

// Leaderboard utilities
function loadScores() {
  try {
    return JSON.parse(localStorage.getItem('mt_scores') || '[]');
  } catch { return []; }
}
function saveScores(scores) {
  localStorage.setItem('mt_scores', JSON.stringify(scores));
}
function updateLeaderboards() {
  const scores = loadScores();
  const best = scores[0]?.score || 0;
  bestScoreEl.textContent = best;
  finalBestScoreEl.textContent = best;
  leaderboardOl.innerHTML = scores.map(s => `<li class="leaderboard-entry">${s.score}</li>`).join('');
  endLeaderboardOl.innerHTML = leaderboardOl.innerHTML;
  highscoreBlock.classList.toggle('hidden', scores.length === 0);
}

// Tile generation - evenly spaced with random lanes
function generateTiles() {
  tiles = [];
  let t = tileSpacingMs * 2; // give player 1.2s before first tile (approx)
  let id = 1;
  const end = songDurationMs - 800; // avoid spawning in last 0.8s
  while (t < end) {
    tiles.push({ id, time: t, lane: Math.floor(Math.random() * laneCount), hit: false });
    t += tileSpacingMs;
    id++;
  }
  nextTileIndex = 0;
}

// Lane metrics
function getLaneWidth() { return canvas.width / laneCount; }
function getHitLineY() { return canvas.height - 120; }
function getScrollSpeedPxPerMs() { return canvas.height / 3000; } // tile travels canvas height in 3s

function timeNowMs() {
  if (gameStatus !== 'playing') return 0;
  if (audioEl) return audioEl.currentTime * 1000;
  if (startTimestamp != null) return performance.now() - startTimestamp;
  return 0;
}

async function startAudio() {
  audioEl = new Audio('./assets/audio/song.mp3'); // ensure file exists
  audioEl.preload = 'auto';
  // Some mobile browsers require a user gesture already satisfied by Start button
  let gotMeta = false, started = false;
  await new Promise((resolve, reject) => {
    function tryResolve() {
      if (gotMeta && started) {
        startTimestamp = performance.now();
        resolve();
      }
    }
    audioEl.addEventListener('loadedmetadata', () => {
      if (!isFinite(audioEl.duration) || audioEl.duration === 0) {
        // fallback keep default
      } else {
        songDurationMs = audioEl.duration * 1000;
      }
      gotMeta = true;
      tryResolve();
    }, { once: true });
    audioEl.addEventListener('play', () => { started = true; tryResolve(); }, { once: true });
    audioEl.addEventListener('ended', () => { if (gameStatus === 'playing') gameOver(); }, { once: true });
    audioEl.addEventListener('error', () => reject(new Error('Audio load/play error')), { once: true });
    const playPromise = audioEl.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(err => reject(err));
    }
  });
}

function endAudio() {
  try { audioEl?.pause(); } catch {}
  audioEl = null;
}

function switchScreen(name) {
  screenStart.classList.remove('active');
  screenGame.classList.remove('active');
  screenEnd.classList.remove('active');
  if (name === 'start') screenStart.classList.add('active');
  else if (name === 'game') screenGame.classList.add('active');
  else if (name === 'end') screenEnd.classList.add('active');
}

async function resetGame() {
  score = 0; scoreEl.textContent = '0';
  switchScreen('game');
  gameStatus = 'loading';
  await startAudio(); // wait for metadata & playback
  generateTiles(); // uses accurate songDurationMs
  gameStatus = 'playing';
  requestAnimationFrame(loop);
}

function gameOver() {
  gameStatus = 'ended';
  endAudio();
  finalScoreEl.textContent = score;
  // persist scores
  const existing = loadScores();
  existing.push({ score, date: new Date().toISOString() });
  existing.sort((a,b) => b.score - a.score);
  saveScores(existing.slice(0,5));
  updateLeaderboards();
  switchScreen('end');
}

// Input handling
canvas.addEventListener('click', handlePointer);
canvas.addEventListener('touchstart', e => { e.preventDefault(); handlePointer(e.touches[0]); }, { passive: false });

function handlePointer(event) {
  if (gameStatus !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const lane = Math.floor((x / rect.width) * laneCount);
  const now = timeNowMs();
  // Find first pending tile in this lane within hit window
  const tile = tiles.find(t => !t.hit && t.lane === lane && Math.abs(t.time - now) <= hitWindowMs);
  if (tile) {
    tile.hit = true;
    score += basePoints;
    scoreEl.textContent = score;
  } else {
    // Wrong tap ends game
    gameOver();
  }
}

function render(now) {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // Draw lanes
  const laneW = getLaneWidth();
  for (let i=0;i<laneCount;i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1c1c1c' : '#161616';
    ctx.fillRect(i*laneW,0,laneW,canvas.height);
  }
  // Hit line
  const hitY = getHitLineY();
  ctx.strokeStyle = '#ffeb3b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, hitY); ctx.lineTo(canvas.width, hitY); ctx.stroke();

  // Render tiles
  const speed = getScrollSpeedPxPerMs();
  const renderEndTime = now + renderAheadMs;
  for (const tile of tiles) {
    if (tile.hit) continue; // skip
    if (tile.time > renderEndTime) break; // beyond render window
    // y position: tile travels downward; when time===now, y==hitY.
    const dt = tile.time - now; // ms until hit
    const y = hitY - dt * speed; // if dt>0, y above hit line
    if (y > canvas.height + 40) continue; // off screen below
    if (y < -80) continue; // not yet visible far above
    // Miss condition: passed hit line without hit
    if (tile.time + hitWindowMs < now) {
      // Miss ends game
      gameOver();
      return;
    }
    ctx.fillStyle = '#2962ff';
    ctx.fillRect(tile.lane*laneW + 6, y - 40, laneW - 12, 80);
  }
}

function loop() {
  if (gameStatus !== 'playing') return;
  const now = timeNowMs();
  // progress
  const pct = Math.min(100, (now / songDurationMs) * 100);
  progressEl.value = pct;
  render(now);
  if (now >= songDurationMs) {
    gameOver();
    return;
  }
  requestAnimationFrame(loop);
}

// Resize handling
function resizeCanvas() {
  // maintain aspect ratio approx 2:3 for playfield
  const maxWidth = 480;
  const width = Math.min(maxWidth, window.innerWidth - 32);
  const height = Math.round(width * 1.4);
  canvas.width = width; canvas.height = height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

btnStart.addEventListener('click', () => { resetGame(); });
btnRestart.addEventListener('click', () => { resetGame(); });

updateLeaderboards();

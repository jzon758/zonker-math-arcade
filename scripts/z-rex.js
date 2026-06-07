const canvas = document.getElementById("zrexCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("zrexScore");
const highScoreEl = document.getElementById("zrexHighScore");
const problemEl = document.getElementById("zrexProblem");
const statusEl = document.getElementById("zrexStatus");
const startButton = document.getElementById("zrexStartButton");
const jumpButton = document.getElementById("zrexJumpButton");
const duckButton = document.getElementById("zrexDuckButton");
const resetButton = document.getElementById("zrexResetButton");

const groundY = 416;
const baseSpeed = 2.25;
const highScoreKey = "zrexHighScore";
const answerTokenMinY = 172;
const answerTokenMaxY = 374;

const zrex = {
  x: 116,
  y: groundY,
  width: 74,
  height: 102,
  velocityY: 0,
  isJumping: false,
  isDucking: false,
  stunUntil: 0,
  bob: 0
};

const game = {
  running: false,
  score: 0,
  highScore: loadHighScore(),
  runCorrect: 0,
  level: 1,
  speed: baseSpeed,
  gravity: 0.38,
  jumpPower: -17.2,
  currentProblem: null,
  currentProblemId: 0,
  pendingChoices: [],
  answerTokens: [],
  badDinos: [],
  nextTokenAt: 0,
  nextDinoAt: 0,
  lastTime: 0,
  gameOver: false,
  backgroundFreezeTime: 0,
  message: "Press Start to help Z-Rex hunt integers.",
  messageUntil: 0
};

const operators = ["+", "-", "×"];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shuffle(values) {
  const copy = values.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function formatInteger(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function formatProblemOperand(value) {
  return value < 0 ? `(${value})` : `${value}`;
}

function makeProblem() {
  const operator = operators[randomInt(0, operators.length - 1)];
  const a = randomInt(-10, 10);
  const b = randomInt(-10, 10);
  let answer;
  let misconception;

  if (operator === "+") {
    answer = a + b;
    misconception = Math.abs(a) + Math.abs(b);
  } else if (operator === "-") {
    answer = a - b;
    misconception = a + b;
  } else {
    answer = a * b;
    misconception = Math.abs(a * b);
  }

  return {
    text: `${a} ${operator} ${formatProblemOperand(b)}`,
    answer,
    choices: makeChoices(answer, misconception)
  };
}

function makeChoices(answer, misconception) {
  const choices = [answer];
  const candidates = [
    misconception,
    -answer,
    answer + randomInt(1, 4),
    answer - randomInt(1, 4),
    answer + randomInt(-6, 6)
  ];

  candidates.forEach((value) => {
    if (choices.length < 4 && value !== answer && !choices.includes(value)) {
      choices.push(value);
    }
  });

  while (choices.length < 4) {
    const value = randomInt(-30, 30);
    if (!choices.includes(value)) {
      choices.push(value);
    }
  }

  return shuffle(choices);
}

function loadHighScore() {
  try {
    const storedScore = Number(localStorage.getItem(highScoreKey));
    return Number.isFinite(storedScore) ? storedScore : 0;
  } catch (error) {
    return 0;
  }
}

function saveHighScore() {
  try {
    localStorage.setItem(highScoreKey, String(game.highScore));
  } catch (error) {
    // High score is optional; gameplay should continue if storage is unavailable.
  }
}

function updateHighScore() {
  if (game.score <= game.highScore) return;

  game.highScore = game.score;
  saveHighScore();
}

function startGame() {
  game.running = true;
  game.score = 0;
  game.runCorrect = 0;
  game.level = 1;
  game.speed = baseSpeed;
  game.currentProblemId = 0;
  game.pendingChoices = [];
  game.answerTokens = [];
  game.badDinos = [];
  game.nextTokenAt = performance.now() + 1500;
  game.nextDinoAt = performance.now() + 3600;
  game.gameOver = false;
  game.backgroundFreezeTime = 0;
  game.message = "Go, Z-Rex!";
  game.messageUntil = performance.now() + 1400;
  zrex.y = groundY;
  zrex.velocityY = 0;
  zrex.isJumping = false;
  zrex.isDucking = false;
  zrex.stunUntil = 0;
  setNextProblem();
  updateHud();
}

function resetGame() {
  game.running = false;
  game.score = 0;
  game.runCorrect = 0;
  game.level = 1;
  game.speed = baseSpeed;
  game.currentProblemId = 0;
  game.pendingChoices = [];
  game.answerTokens = [];
  game.badDinos = [];
  game.nextTokenAt = 0;
  game.currentProblem = null;
  game.gameOver = false;
  game.backgroundFreezeTime = 0;
  game.message = "Press Start to help Z-Rex hunt integers.";
  game.messageUntil = 0;
  zrex.y = groundY;
  zrex.velocityY = 0;
  zrex.isJumping = false;
  zrex.isDucking = false;
  zrex.stunUntil = 0;
  problemEl.textContent = "Press Start";
  updateHud();
}

function endRunAfterFailure(message) {
  updateHighScore();

  game.running = false;
  game.runCorrect = 0;
  game.level = 1;
  game.speed = baseSpeed;
  game.currentProblemId++;
  game.pendingChoices = [];
  game.answerTokens = [];
  game.badDinos = [];
  game.nextTokenAt = 0;
  game.nextDinoAt = 0;
  game.currentProblem = null;
  game.gameOver = true;
  game.backgroundFreezeTime = performance.now();
  game.message = "Game over — press Start to try again.";
  game.messageUntil = 0;
  zrex.y = groundY;
  zrex.velocityY = 0;
  zrex.isJumping = false;
  zrex.isDucking = false;
  zrex.stunUntil = 0;
  problemEl.textContent = game.message;
  updateHud();
}

function setNextProblem() {
  const oldProblemId = game.currentProblemId;
  game.currentProblem = makeProblem();
  game.currentProblemId++;
  game.pendingChoices = buildAnswerQueue(game.currentProblem);
  problemEl.textContent = `${game.currentProblem.text} = ?`;
  game.answerTokens.forEach((token) => {
    if (token.problemId === oldProblemId) {
      token.stale = true;
    }
  });
}

function buildAnswerQueue(problem) {
  const wrongChoices = shuffle(problem.choices.filter((value) => value !== problem.answer));
  return shuffle([
    { value: problem.answer, correct: true },
    { value: wrongChoices[0], correct: false },
    { value: wrongChoices[1], correct: false }
  ]);
}

function refillAnswerQueue() {
  if (!game.currentProblem || game.pendingChoices.length > 0) return;

  game.pendingChoices = buildAnswerQueue(game.currentProblem);
}

function spawnAnswerToken(now) {
  refillAnswerQueue();

  const activeCurrentTokens = game.answerTokens.filter(
    (token) => !token.hit && !token.stale && token.problemId === game.currentProblemId && token.x > -80
  );

  if (activeCurrentTokens.length >= 1 || game.pendingChoices.length === 0) return;

  const nextChoice = game.pendingChoices.shift();
  const y = randomInt(answerTokenMinY, answerTokenMaxY);

  game.answerTokens.push({
    x: canvas.width + 130,
    y,
    radius: 28,
    value: nextChoice.value,
    correct: nextChoice.correct,
    problemId: game.currentProblemId,
    hit: false
  });

  game.nextTokenAt = now + Math.max(1700, 2800 - game.level * 90);
}

function spawnBadDino(now) {
  game.badDinos.push({
    x: canvas.width + 90,
    y: groundY + 8,
    width: 58,
    height: 45,
    wobble: Math.random() * Math.PI * 2
  });
  game.nextDinoAt = now + Math.max(1700, 3900 - game.level * 160);
}

function jump() {
  if (!game.running || zrex.isJumping || zrex.isDucking || isStunned()) return;

  zrex.velocityY = game.jumpPower;
  zrex.isJumping = true;
}

function startDuck() {
  if (!game.running || zrex.isJumping || isStunned()) return;

  zrex.isDucking = true;
}

function stopDuck() {
  zrex.isDucking = false;
}

function isStunned() {
  return performance.now() < zrex.stunUntil;
}

function updateHud() {
  scoreEl.textContent = game.score;
  highScoreEl.textContent = game.highScore;
  statusEl.textContent = game.message;
}

function updateGame(delta, now) {
  if (!game.running) return;

  const speed = game.speed;
  const groundObstacleSpeed = isStunned() ? speed * 0.35 : speed;

  zrex.velocityY += game.gravity;
  zrex.y += zrex.velocityY;
  zrex.bob += delta * 0.012;

  if (zrex.y >= groundY) {
    zrex.y = groundY;
    zrex.velocityY = 0;
    zrex.isJumping = false;
  }

  game.answerTokens.forEach((token) => {
    token.x -= speed;
  });

  game.badDinos.forEach((dino) => {
    dino.x -= groundObstacleSpeed * 1.06;
    dino.wobble += delta * 0.01;
  });

  if (now >= game.nextDinoAt && game.score >= 2) {
    spawnBadDino(now);
  }

  if (now >= game.nextTokenAt) {
    spawnAnswerToken(now);
  }

  checkAnswerCollisions();
  checkDinoCollisions(now);

  game.answerTokens = game.answerTokens.filter((token) => token.x > -120 && !token.hit);

  const hasCurrentToken = game.answerTokens.some(
    (token) => !token.stale && token.problemId === game.currentProblemId
  );

  if (game.currentProblem && game.pendingChoices.length === 0 && !hasCurrentToken) {
    endRunAfterFailure("Missed it.");
    return;
  }

  game.badDinos = game.badDinos.filter((dino) => dino.x > -90);

  if (game.messageUntil && now > game.messageUntil) {
    game.message = "Jump into the correct integer answer.";
    game.messageUntil = 0;
  }

  updateHud();
}

function checkAnswerCollisions() {
  const rexBox = getZrexBox();

  game.answerTokens.forEach((token) => {
    if (token.hit || token.x < -80) return;

    const tokenBox = {
      x: token.x - token.radius,
      y: token.y - token.radius,
      width: token.radius * 2,
      height: token.radius * 2
    };

    if (!boxesOverlap(rexBox, tokenBox)) return;

    token.hit = true;

    if (token.correct && !token.stale && token.problemId === game.currentProblemId) {
      game.score++;
      game.runCorrect++;
      updateHighScore();
      game.level = Math.floor(game.score / 5) + 1;
      game.speed = clamp(baseSpeed + Math.floor(game.score / 5) * 0.28, baseSpeed, 5.2);
      game.message = "Correct. Integer rules mastered!";
      game.messageUntil = performance.now() + 1150;
      setNextProblem();
    } else {
      const missMessage = token.stale
        ? `${formatInteger(token.value)} was from the last mission. Stay with the new problem.`
        : `${formatInteger(token.value)} is a trap answer. Try the sign rule again.`;
      endRunAfterFailure(missMessage);
    }
  });
}

function checkDinoCollisions(now) {
  const rexBox = getZrexBox();

  game.badDinos.forEach((dino) => {
    if (dino.hit) return;

    if (boxesOverlap(rexBox, getGroundObstacleBox(dino))) {
      dino.hit = true;
      zrex.stunUntil = now + 900;
      game.message = "Bad dino bump. Keep moving!";
      game.messageUntil = now + 1400;
    }
  });
}

function getGroundObstacleBox(dino) {
  return {
    x: dino.x,
    y: dino.y - dino.height - 18,
    width: dino.width + 8,
    height: dino.height + 36
  };
}

function getZrexBox() {
  if (zrex.isDucking && !zrex.isJumping) {
    return {
      x: zrex.x + 8,
      y: zrex.y - 54,
      width: zrex.width + 18,
      height: 50
    };
  }

  return {
    x: zrex.x + 10,
    y: zrex.y - zrex.height + 8,
    width: zrex.width - 18,
    height: zrex.height - 12
  };
}

function boxesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawProblemBanner();
  drawTokens();
  drawBadDinos();
  drawZrex();
}

function drawBackground() {
  const horizon = 360;
  const backgroundSpeed = game.running ? game.speed : baseSpeed;
  const time = game.gameOver ? game.backgroundFreezeTime : performance.now();
  const cloudOffset = (time * backgroundSpeed * 0.01) % 520;
  const ridgeOffset = (time * backgroundSpeed * 0.02) % 240;
  const scrubOffset = (time * backgroundSpeed * 0.055) % 190;
  const groundOffset = (time * backgroundSpeed * 0.08) % 120;

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#dff4ff");
  sky.addColorStop(0.62, "#fff3d3");
  sky.addColorStop(1, "#f4d18a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawClouds(cloudOffset);

  ctx.fillStyle = "rgba(104, 126, 74, 0.28)";
  for (let i = -1; i < 6; i++) {
    const x = i * 240 - ridgeOffset;
    ctx.beginPath();
    ctx.moveTo(x, horizon);
    ctx.lineTo(x + 120, 230);
    ctx.lineTo(x + 250, horizon);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#d7a557";
  ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);

  drawDesertScrub(scrubOffset, horizon);

  ctx.strokeStyle = "rgba(101, 70, 38, 0.28)";
  ctx.lineWidth = 3;
  for (let i = -1; i < 12; i++) {
    const x = i * 120 - groundOffset;
    ctx.beginPath();
    ctx.moveTo(x, groundY + 38);
    ctx.lineTo(x + 46, groundY + 30);
    ctx.stroke();
  }

  ctx.fillStyle = "#9b6c37";
  ctx.fillRect(0, groundY + 28, canvas.width, 8);
}

function drawClouds(offset) {
  const clouds = [
    { x: 70, y: 92, scale: 1 },
    { x: 360, y: 134, scale: 0.75 },
    { x: 670, y: 78, scale: 1.15 },
    { x: 960, y: 150, scale: 0.85 }
  ];

  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  clouds.forEach((cloud) => {
    const x = ((cloud.x - offset + 120) % 1080) - 120;
    const y = cloud.y;
    const s = cloud.scale;

    ctx.beginPath();
    ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
    ctx.arc(x + 24 * s, y - 10 * s, 24 * s, 0, Math.PI * 2);
    ctx.arc(x + 54 * s, y, 19 * s, 0, Math.PI * 2);
    ctx.fillRect(x - 3 * s, y, 60 * s, 15 * s);
    ctx.fill();
  });
}

function drawDesertScrub(offset, horizon) {
  ctx.fillStyle = "rgba(96, 122, 68, 0.45)";
  for (let i = -1; i < 8; i++) {
    const x = i * 190 - offset;
    const y = horizon + 36 + (i % 3) * 14;
    ctx.fillRect(x + 22, y, 8, 30);
    ctx.fillRect(x + 10, y + 11, 32, 7);
    ctx.fillRect(x + 116, y + 18, 36, 8);
  }
}

function drawTokens() {
  game.answerTokens.forEach((token) => {
    if (token.hit) return;

    ctx.save();
    if (token.stale) {
      ctx.globalAlpha = 0.45;
    }

    ctx.beginPath();
    ctx.fillStyle = "#f9fbff";
    ctx.strokeStyle = "#24438a";
    ctx.lineWidth = 4;
    ctx.arc(token.x, token.y, token.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1f2a44";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(formatInteger(token.value), token.x, token.y + 1);
    ctx.restore();
  });
}

function drawBadDinos() {
  game.badDinos.forEach((dino) => {
    const bounce = Math.sin(dino.wobble) * 3;
    ctx.fillStyle = dino.hit ? "rgba(104, 69, 43, 0.4)" : "#6d4c36";
    ctx.fillRect(dino.x, dino.y - dino.height + bounce, dino.width, dino.height);
    ctx.fillRect(dino.x + 36, dino.y - dino.height - 18 + bounce, 26, 26);
    ctx.fillStyle = "#ffeb9a";
    ctx.beginPath();
    ctx.arc(dino.x + 54, dino.y - dino.height - 8 + bounce, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a3826";
    ctx.fillRect(dino.x + 8, dino.y + bounce, 11, 18);
    ctx.fillRect(dino.x + 36, dino.y + bounce, 11, 18);
  });
}

function drawZrex() {
  const baseX = zrex.x;
  const gameOverBody = "#8fa66c";
  const gameOverBelly = "#e8d99a";

  if (game.gameOver) {
    drawGameOverZrex(baseX, groundY + 4, gameOverBody, gameOverBelly);
    return;
  }

  const stunned = isStunned();
  const ducking = zrex.isDucking && !zrex.isJumping;
  const bob = zrex.isJumping ? 0 : Math.sin(zrex.bob) * 3;
  const baseY = zrex.y + bob;
  const bodyColor = stunned ? "#8fa66c" : "#4d9d5a";
  const bellyColor = stunned ? "#e8d99a" : "#f3e39b";

  if (ducking) {
    drawDuckingZrex(baseX, baseY, bodyColor, bellyColor);
    return;
  }

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(baseX + 36, baseY - 48, 36, 46, -0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(baseX + 8, baseY - 56);
  ctx.lineTo(baseX - 36, baseY - 72);
  ctx.lineTo(baseX + 6, baseY - 35);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = bellyColor;
  ctx.beginPath();
  ctx.ellipse(baseX + 44, baseY - 40, 18, 30, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.fillRect(baseX + 52, baseY - 105, 54, 44);
  ctx.beginPath();
  ctx.arc(baseX + 103, baseY - 82, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2c59b";
  ctx.fillRect(baseX + 72, baseY - 103, 26, 25);
  ctx.beginPath();
  ctx.arc(baseX + 91, baseY - 90, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5b3523";
  ctx.beginPath();
  ctx.ellipse(baseX + 90, baseY - 75, 20, 12, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(baseX + 80, baseY - 78, 22, 18);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(baseX + 96, baseY - 96, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1f2a44";
  ctx.lineWidth = 2.5;
  if (stunned) {
    ctx.beginPath();
    ctx.moveTo(baseX + 93, baseY - 99);
    ctx.lineTo(baseX + 101, baseY - 91);
    ctx.moveTo(baseX + 101, baseY - 99);
    ctx.lineTo(baseX + 93, baseY - 91);
    ctx.stroke();
    drawStunStars(baseX, baseY);
  } else {
    ctx.fillStyle = "#1f2a44";
    ctx.beginPath();
    ctx.arc(baseX + 98, baseY - 95, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#24438a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(baseX + 80, baseY - 112);
  ctx.lineTo(baseX + 98, baseY - 120);
  ctx.stroke();

  ctx.fillStyle = bodyColor;
  ctx.fillRect(baseX + 54, baseY - 38, 12, 39);
  ctx.fillRect(baseX + 24, baseY - 34, 12, 35);
  ctx.fillStyle = "#24438a";
  ctx.fillRect(baseX + 52, baseY - 3, 23, 8);
  ctx.fillRect(baseX + 22, baseY - 3, 23, 8);

  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(baseX + 58, baseY - 58);
  ctx.lineTo(baseX + 84, baseY - 45);
  ctx.stroke();
}

function drawStunStars(baseX, baseY) {
  ctx.strokeStyle = "#f7c948";
  ctx.lineWidth = 3;
  [
    { x: baseX + 82, y: baseY - 126 },
    { x: baseX + 112, y: baseY - 118 }
  ].forEach((star) => {
    ctx.beginPath();
    ctx.moveTo(star.x, star.y - 7);
    ctx.lineTo(star.x, star.y + 7);
    ctx.moveTo(star.x - 7, star.y);
    ctx.lineTo(star.x + 7, star.y);
    ctx.stroke();
  });
}

function drawGameOverZrex(baseX, baseY, bodyColor, bellyColor) {
  drawDuckingZrex(baseX - 4, baseY, bodyColor, bellyColor);

  ctx.strokeStyle = "#1f2a44";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(baseX + 112, baseY - 55);
  ctx.lineTo(baseX + 124, baseY - 43);
  ctx.moveTo(baseX + 124, baseY - 55);
  ctx.lineTo(baseX + 112, baseY - 43);
  ctx.stroke();

  ctx.strokeStyle = "#f7c948";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(baseX + 78, baseY - 82);
  ctx.lineTo(baseX + 88, baseY - 96);
  ctx.lineTo(baseX + 98, baseY - 82);
  ctx.lineTo(baseX + 78, baseY - 90);
  ctx.lineTo(baseX + 98, baseY - 90);
  ctx.closePath();
  ctx.stroke();
}

function drawDuckingZrex(baseX, baseY, bodyColor, bellyColor) {
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(baseX + 42, baseY - 33, 48, 28, 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(baseX + 2, baseY - 35);
  ctx.lineTo(baseX - 42, baseY - 48);
  ctx.lineTo(baseX + 4, baseY - 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = bellyColor;
  ctx.beginPath();
  ctx.ellipse(baseX + 48, baseY - 25, 22, 15, 0.02, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.fillRect(baseX + 76, baseY - 58, 56, 34);
  ctx.beginPath();
  ctx.arc(baseX + 130, baseY - 42, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f2c59b";
  ctx.fillRect(baseX + 96, baseY - 56, 24, 22);
  ctx.beginPath();
  ctx.arc(baseX + 116, baseY - 43, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5b3523";
  ctx.beginPath();
  ctx.ellipse(baseX + 116, baseY - 30, 20, 10, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(baseX + 105, baseY - 33, 23, 15);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(baseX + 121, baseY - 50, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f2a44";
  ctx.beginPath();
  ctx.arc(baseX + 123, baseY - 49, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.fillRect(baseX + 52, baseY - 20, 13, 25);
  ctx.fillRect(baseX + 22, baseY - 18, 13, 23);
  ctx.fillStyle = "#24438a";
  ctx.fillRect(baseX + 50, baseY, 24, 8);
  ctx.fillRect(baseX + 20, baseY, 24, 8);
}

function drawProblemBanner() {
  const text = game.gameOver
    ? "Game over"
    : game.currentProblem
      ? `${game.currentProblem.text} = ?`
      : "Press Start";

  ctx.fillStyle = "rgba(31, 42, 68, 0.9)";
  ctx.fillRect(250, 22, 460, 66);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
  ctx.lineWidth = 3;
  ctx.strokeRect(250, 22, 460, 66);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 480, 56);
}

function loop(now) {
  const delta = Math.min(32, now - game.lastTime || 16);
  game.lastTime = now;
  updateGame(delta, now);
  draw();
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);
jumpButton.addEventListener("click", jump);
duckButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  startDuck();
});
duckButton.addEventListener("pointerup", stopDuck);
duckButton.addEventListener("pointerleave", stopDuck);
duckButton.addEventListener("click", () => {
  startDuck();
  setTimeout(stopDuck, 450);
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    jump();
  }

  if (event.code === "ArrowDown" || event.code === "KeyS") {
    event.preventDefault();
    startDuck();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    event.preventDefault();
    stopDuck();
  }
});

canvas.addEventListener("pointerdown", jump);

resetGame();
requestAnimationFrame(loop);

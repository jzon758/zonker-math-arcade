let selectedGame = "math-facts";
let currentOperation = "addition";
let currentMaxNumber = 12;
let timerSeconds = 60;
let soundEnabled = true;

let score = 0;
let streak = 0;
let correctAnswer = 0;
let num1 = 0;
let num2 = 0;

let targetScore = 0;
let targetStreak = 0;
let targetCorrectIndex = 0;
let targetTimeLeft = 60;

let timeLeft = 60;
let timerInterval = null;
let lastPlayedGame = "math-facts";

// MENU ELEMENTS
const menuScreen = document.getElementById("menuScreen");
const gameCards = document.querySelectorAll(".game-card");
const operationSelect = document.getElementById("operationSelect");
const maxNumberSelect = document.getElementById("maxNumberSelect");
const timerSelect = document.getElementById("timerSelect");
const soundToggle = document.getElementById("soundToggle");
const startButton = document.getElementById("startButton");

// FACTS ELEMENTS
const factsScreen = document.getElementById("factsScreen");
const modeLabel = document.getElementById("modeLabel");
const scoreLabel = document.getElementById("scoreLabel");
const streakLabel = document.getElementById("streakLabel");
const starsLabel = document.getElementById("starsLabel");
const timeLabel = document.getElementById("timeLabel");
const questionEl = document.getElementById("question");
const answerInput = document.getElementById("answerInput");
const submitButton = document.getElementById("submitButton");
const feedbackEl = document.getElementById("feedback");
const backFromFactsButton = document.getElementById("backFromFactsButton");

// TARGET TEN ELEMENTS
const targetScreen = document.getElementById("targetScreen");
const targetValueLabel = document.getElementById("targetValueLabel");
const targetScoreLabel = document.getElementById("targetScoreLabel");
const targetStreakLabel = document.getElementById("targetStreakLabel");
const targetTimeLabel = document.getElementById("targetTimeLabel");
const targetNumber = document.getElementById("targetNumber");
const choiceButtons = [
  document.getElementById("choice0"),
  document.getElementById("choice1"),
  document.getElementById("choice2"),
  document.getElementById("choice3")
];
const targetFeedback = document.getElementById("targetFeedback");
const backFromTargetButton = document.getElementById("backFromTargetButton");

// GAME OVER
const gameOverScreen = document.getElementById("gameOverScreen");
const gameOverMessage = document.getElementById("gameOverMessage");
const playAgainButton = document.getElementById("playAgainButton");
const gameOverMenuButton = document.getElementById("gameOverMenuButton");

// FILL MAX NUMBER DROPDOWN
for (let i = 1; i <= 12; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = i;
  if (i === 12) {
    option.selected = true;
  }
  maxNumberSelect.appendChild(option);
}

// SOUND
function playTone(frequency, duration) {
  if (!soundEnabled) return;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0.05;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    audioContext.close();
  }, duration);
}

function playCorrectSound() {
  playTone(660, 120);
}

function playWrongSound() {
  playTone(220, 180);
}

// HELPERS
function hideAllScreens() {
  menuScreen.classList.add("hidden");
  factsScreen.classList.add("hidden");
  targetScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
}

function randomNumber(max) {
  return Math.floor(Math.random() * max) + 1;
}

function getOperationSymbol(operation) {
  if (operation === "addition") return "+";
  if (operation === "subtraction") return "−";
  if (operation === "multiplication") return "×";
  if (operation === "division") return "÷";
  return "?";
}

function getOperationName(operation) {
  if (operation === "addition") return "Addition";
  if (operation === "subtraction") return "Subtraction";
  if (operation === "multiplication") return "Multiplication";
  if (operation === "division") return "Division";
  return "";
}

function getStars(value) {
  if (value >= 15) return "★★★";
  if (value >= 8) return "★★☆";
  if (value >= 3) return "★☆☆";
  return "☆☆☆";
}

function clearGameTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// GAME CARD SELECTION
gameCards.forEach((card) => {
  card.addEventListener("click", () => {
    gameCards.forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedGame = card.dataset.game;
  });
});

// MATH FACTS
function updateFactsHud() {
  modeLabel.textContent = `${getOperationName(currentOperation)} to ${currentMaxNumber}`;
  scoreLabel.textContent = score;
  streakLabel.textContent = streak;
  starsLabel.textContent = getStars(score);
  timeLabel.textContent = timerSeconds === 0 ? "∞" : timeLeft;
}

function generateFactsQuestion() {
  if (currentOperation === "addition") {
    num1 = randomNumber(currentMaxNumber);
    num2 = randomNumber(currentMaxNumber);
    correctAnswer = num1 + num2;
  }

  if (currentOperation === "subtraction") {
    num1 = randomNumber(currentMaxNumber);
    num2 = randomNumber(currentMaxNumber);
    if (num2 > num1) {
      let temp = num1;
      num1 = num2;
      num2 = temp;
    }
    correctAnswer = num1 - num2;
  }

  if (currentOperation === "multiplication") {
    num1 = randomNumber(currentMaxNumber);
    num2 = randomNumber(currentMaxNumber);
    correctAnswer = num1 * num2;
  }

  if (currentOperation === "division") {
    num2 = randomNumber(currentMaxNumber);
    correctAnswer = randomNumber(currentMaxNumber);
    num1 = num2 * correctAnswer;
  }

  questionEl.textContent = `${num1} ${getOperationSymbol(currentOperation)} ${num2} = ?`;
  answerInput.value = "";
  feedbackEl.textContent = "";
  answerInput.focus();
}

function checkFactsAnswer() {
  if (answerInput.value === "") {
    feedbackEl.textContent = "Please type an answer.";
    return;
  }

  const userAnswer = Number(answerInput.value);

  if (userAnswer === correctAnswer) {
    score++;
    streak++;
    feedbackEl.textContent = "Correct! 🎉";
    playCorrectSound();
  } else {
    streak = 0;
    feedbackEl.textContent = `Not quite. The answer was ${correctAnswer}.`;
    playWrongSound();
  }

  updateFactsHud();
  setTimeout(generateFactsQuestion, 600);
}

function startFactsGame() {
  score = 0;
  streak = 0;
  timeLeft = timerSeconds;
  feedbackEl.textContent = "";
  updateFactsHud();
  hideAllScreens();
  factsScreen.classList.remove("hidden");
  generateFactsQuestion();

  if (timerSeconds > 0) {
    timerInterval = setInterval(() => {
      timeLeft--;
      updateFactsHud();

      if (timeLeft <= 0) {
        endGame("math-facts");
      }
    }, 1000);
  }
}

// TARGET TEN
function createEquationWithAnswer(answer) {
  const op = currentOperation;

  let a;
  let b;
  let text = "";

  if (op === "addition") {
    a = randomNumber(Math.min(answer, currentMaxNumber));
    b = answer - a;
    if (b < 0 || b > currentMaxNumber) {
      a = Math.min(answer, currentMaxNumber);
      b = answer - a;
    }
    text = `${a} + ${b}`;
  }

  if (op === "subtraction") {
    b = randomNumber(currentMaxNumber);
    a = answer + b;
    if (a > currentMaxNumber) {
      a = currentMaxNumber;
      b = a - answer;
    }
    text = `${a} − ${b}`;
  }

  if (op === "multiplication") {
    const factors = [];
    for (let i = 1; i <= currentMaxNumber; i++) {
      if (answer % i === 0 && answer / i <= currentMaxNumber) {
        factors.push([i, answer / i]);
      }
    }

    if (factors.length > 0) {
      const pair = factors[Math.floor(Math.random() * factors.length)];
      text = `${pair[0]} × ${pair[1]}`;
    } else {
      text = `${answer} × 1`;
    }
  }

  if (op === "division") {
    b = randomNumber(currentMaxNumber);
    a = answer * b;
    text = `${a} ÷ ${b}`;
  }

  return text;
}

function generateTargetRound() {
  targetFeedback.textContent = "";

  let targetValue;
  if (currentOperation === "multiplication") {
    targetValue = randomNumber(currentMaxNumber * currentMaxNumber);
  } else {
    targetValue = randomNumber(Math.max(10, currentMaxNumber));
  }

  targetNumber.textContent = targetValue;
  targetValueLabel.textContent = targetValue;
  targetCorrectIndex = Math.floor(Math.random() * 4);

  const usedAnswers = [targetValue];

  choiceButtons.forEach((button, index) => {
    let answerValue;

    if (index === targetCorrectIndex) {
      answerValue = targetValue;
    } else {
      do {
        const offset = Math.floor(Math.random() * 5) + 1;
        answerValue = Math.random() < 0.5 ? targetValue + offset : targetValue - offset;
      } while (answerValue < 0 || usedAnswers.includes(answerValue));

      usedAnswers.push(answerValue);
    }

    button.textContent = createEquationWithAnswer(answerValue);
    button.classList.remove("correct-flash", "wrong-flash");
  });
}

function updateTargetHud() {
  targetScoreLabel.textContent = targetScore;
  targetStreakLabel.textContent = targetStreak;
  targetTimeLabel.textContent = timerSeconds === 0 ? "∞" : targetTimeLeft;
}

function startTargetGame() {
  targetScore = 0;
  targetStreak = 0;
  targetTimeLeft = timerSeconds;
  targetFeedback.textContent = "";
  updateTargetHud();
  hideAllScreens();
  targetScreen.classList.remove("hidden");
  generateTargetRound();

  if (timerSeconds > 0) {
    timerInterval = setInterval(() => {
      targetTimeLeft--;
      updateTargetHud();

      if (targetTimeLeft <= 0) {
        endGame("target-ten");
      }
    }, 1000);
  }
}

function handleTargetChoice(index) {
  if (index === targetCorrectIndex) {
    targetScore++;
    targetStreak++;
    targetFeedback.textContent = "Correct! 🎉";
    choiceButtons[index].classList.add("correct-flash");
    playCorrectSound();
  } else {
    targetStreak = 0;
    targetFeedback.textContent = "Try the one that matches the target.";
    choiceButtons[index].classList.add("wrong-flash");
    choiceButtons[targetCorrectIndex].classList.add("correct-flash");
    playWrongSound();
  }

  updateTargetHud();
  setTimeout(generateTargetRound, 700);
}

// GAME FLOW
function startSelectedGame() {
  clearGameTimer();

  currentOperation = operationSelect.value;
  currentMaxNumber = Number(maxNumberSelect.value);
  timerSeconds = Number(timerSelect.value);
  soundEnabled = soundToggle.value === "on";
  lastPlayedGame = selectedGame;

  if (selectedGame === "math-facts") {
    startFactsGame();
  } else {
    startTargetGame();
  }
}

function endGame(gameName) {
  clearGameTimer();
  hideAllScreens();
  gameOverScreen.classList.remove("hidden");

  if (gameName === "math-facts") {
    gameOverMessage.textContent = `You finished Zonker Math Facts with a score of ${score} and a best streak of ${streak}.`;
  } else {
    gameOverMessage.textContent = `You finished Target Ten with a score of ${targetScore} and a streak of ${targetStreak}.`;
  }
}

function goToMenu() {
  clearGameTimer();
  hideAllScreens();
  menuScreen.classList.remove("hidden");
}

// EVENTS
startButton.addEventListener("click", startSelectedGame);
submitButton.addEventListener("click", checkFactsAnswer);
backFromFactsButton.addEventListener("click", goToMenu);
backFromTargetButton.addEventListener("click", goToMenu);
gameOverMenuButton.addEventListener("click", goToMenu);
playAgainButton.addEventListener("click", startSelectedGame);

answerInput.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    checkFactsAnswer();
  }
});

choiceButtons.forEach((button, index) => {
  button.addEventListener("click", () => handleTargetChoice(index));
});

// START
goToMenu();
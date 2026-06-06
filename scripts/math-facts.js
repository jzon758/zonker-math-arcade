let selectedMode = "classic";
let currentOperation = "addition";
let currentMaxNumber = 12;
let timerSeconds = 60;
let timeLeft = 60;
let focusFacts = [];

let score = 0;
let streak = 0;
let correctAnswer = 0;

let timerInterval = null;
let nextRoundTimeout = null;
let currentTargetCorrectIndex = 0;
let currentTargetValue = 10;

// Elements
const menuScreen = document.getElementById("menuScreen");
const gameScreen = document.getElementById("gameScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const classicArea = document.getElementById("classicArea");
const targetArea = document.getElementById("targetArea");

const modeCards = document.querySelectorAll(".mode-card");
const operationSelect = document.getElementById("operationSelect");
const maxNumberSelect = document.getElementById("maxNumberSelect");
const timerSelect = document.getElementById("timerSelect");
const focusFactsGrid = document.getElementById("focusFactsGrid");
const startButton = document.getElementById("startButton");

const modeLabel = document.getElementById("modeLabel");
const scoreLabel = document.getElementById("scoreLabel");
const streakLabel = document.getElementById("streakLabel");
const timeLabel = document.getElementById("timeLabel");

const questionEl = document.getElementById("question");
const answerInput = document.getElementById("answerInput");
const submitButton = document.getElementById("submitButton");
const feedbackEl = document.getElementById("feedback");



const targetNumber = document.getElementById("targetNumber");
const targetFeedback = document.getElementById("targetFeedback");
const choiceButtons = [
  document.getElementById("choice0"),
  document.getElementById("choice1"),
  document.getElementById("choice2"),
  document.getElementById("choice3")
];

const backButton = document.getElementById("backButton");
const playAgainButton = document.getElementById("playAgainButton");
const gameOverMenuButton = document.getElementById("gameOverMenuButton");
const gameOverMessage = document.getElementById("gameOverMessage");

const toggleSettings = document.getElementById("toggleSettings");
const settingsPanel = document.getElementById("settingsPanel");

// Fill dropdown
for (let i = 1; i <= 12; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = i;
  if (i === 12) option.selected = true;
  maxNumberSelect.appendChild(option);
}

// Fill focus facts
for (let i = 0; i <= 12; i++) {
  const label = document.createElement("label");
  label.className = "focus-fact-option";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = i;
  checkbox.className = "focus-fact-checkbox";

  const number = document.createElement("span");
  number.textContent = i;

  label.appendChild(checkbox);
  label.appendChild(number);
  focusFactsGrid.appendChild(label);
}

// Helpers
function hideAllScreens() {
  menuScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
}

function stopAllActivity() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (nextRoundTimeout) {
    clearTimeout(nextRoundTimeout);
    nextRoundTimeout = null;
  }
}

function resetRoundFeedback() {
  feedbackEl.textContent = "";
  targetFeedback.textContent = "";
  choiceButtons.forEach((button) => {
    button.classList.remove("correct-flash", "wrong-flash");
  });
}

function randomNumber(max) {
  return Math.floor(Math.random() * max) + 1;
}

function randomFromList(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function getSelectedFocusFacts() {
  const selectedCheckboxes = document.querySelectorAll(".focus-fact-checkbox:checked");
  return Array.from(selectedCheckboxes, (checkbox) => Number(checkbox.value));
}

function randomFocusedNumber() {
  if (Math.random() < 0.7) {
    return randomFromList(focusFacts);
  }

  return randomNumber(currentMaxNumber);
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

function getStreakDisplay(value) {
  if (value >= 20) {
    return `🔥🔥🔥 ${value}`;
  }
  
  if (value >= 10) {
    return `🔥🔥 ${value}`;
  }

  if (value >= 5) {
    return `🔥 ${value}`;
  }

  return value;
}

function updateHud() {
  modeLabel.textContent =
    selectedMode === "classic"
      ? `${getOperationName(currentOperation)} Facts`
      : `Target Ten • ${getOperationName(currentOperation)}`;

  scoreLabel.textContent = score;
  streakLabel.textContent = getStreakDisplay(streak);
  timeLabel.textContent = timerSeconds === 0 ? "∞" : timeLeft;
}

function startTimer() {
  if (timerSeconds === 0) {
    updateHud();
    return;
  }

  timerInterval = setInterval(() => {
    timeLeft--;
    updateHud();

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function showGameMode() {
  classicArea.classList.toggle("hidden", selectedMode !== "classic");
  targetArea.classList.toggle("hidden", selectedMode !== "target-ten");
}

// Classic mode
function generateClassicQuestion() {
  let num1;
  let num2;

  if (currentOperation === "addition") {
    num1 = focusFacts.length > 0 ? randomFocusedNumber() : randomNumber(currentMaxNumber);
    num2 = randomNumber(currentMaxNumber);
    correctAnswer = num1 + num2;
  }

  if (currentOperation === "subtraction") {
    num1 = focusFacts.length > 0 ? randomFocusedNumber() : randomNumber(currentMaxNumber);
    num2 = randomNumber(currentMaxNumber);
    if (num2 > num1) {
      const temp = num1;
      num1 = num2;
      num2 = temp;
    }
    correctAnswer = num1 - num2;
  }

  if (currentOperation === "multiplication") {
    num1 = focusFacts.length > 0 ? randomFocusedNumber() : randomNumber(currentMaxNumber);
    num2 = randomNumber(currentMaxNumber);
    correctAnswer = num1 * num2;
  }

  if (currentOperation === "division") {
    num2 = randomNumber(currentMaxNumber);
    correctAnswer = focusFacts.length > 0 ? randomFocusedNumber() : randomNumber(currentMaxNumber);
    num1 = num2 * correctAnswer;
  }

  questionEl.textContent = `${num1} ${getOperationSymbol(currentOperation)} ${num2} = ?`;
  answerInput.value = "";
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  answerInput.select();
  answerInput.focus();
}

function checkClassicAnswer() {
  if (selectedMode !== "classic") return;

  if (answerInput.value === "") {
    feedbackEl.textContent = "Please type an answer.";
    return;
  }

  const userAnswer = Number(answerInput.value);

  if (userAnswer === correctAnswer) {
    score++;
    streak++;
    feedbackEl.textContent = "Correct! 🎉";
    feedbackEl.className = "feedback correct";
  } else {
    streak = 0;
    feedbackEl.textContent = `Not quite. The answer was ${correctAnswer}.`;
    feedbackEl.className = "feedback wrong";
  }

  updateHud();
  nextRoundTimeout = setTimeout(generateClassicQuestion, 650);
}

// Target mode
function createEquationWithAnswer(answer) {
  if (currentOperation === "addition") {
    let a = randomNumber(Math.min(answer, currentMaxNumber));
    let b = answer - a;
    if (b < 0 || b > currentMaxNumber) {
      a = Math.min(answer, currentMaxNumber);
      b = answer - a;
    }
    return `${a} + ${b}`;
  }

  if (currentOperation === "subtraction") {
    let b = randomNumber(currentMaxNumber);
    let a = answer + b;
    if (a > currentMaxNumber) {
      a = currentMaxNumber;
      b = a - answer;
    }
    return `${a} − ${b}`;
  }

  if (currentOperation === "multiplication") {
    const factors = [];
    for (let i = 1; i <= currentMaxNumber; i++) {
      if (answer % i === 0 && answer / i <= currentMaxNumber) {
        factors.push([i, answer / i]);
      }
    }
    if (factors.length > 0) {
      const pair = factors[Math.floor(Math.random() * factors.length)];
      return `${pair[0]} × ${pair[1]}`;
    }
    return `${answer} × 1`;
  }

  if (currentOperation === "division") {
    const b = randomNumber(currentMaxNumber);
    const a = answer * b;
    return `${a} ÷ ${b}`;
  }

  return "";
}

function generateTargetRound() {
  resetRoundFeedback();

  if (currentOperation === "multiplication") {
    currentTargetValue = randomNumber(currentMaxNumber * currentMaxNumber);
  } else {
    currentTargetValue = randomNumber(Math.max(10, currentMaxNumber));
  }

  targetNumber.textContent = currentTargetValue;
  currentTargetCorrectIndex = Math.floor(Math.random() * 4);

  const usedAnswers = [currentTargetValue];

  choiceButtons.forEach((button, index) => {
    let answerValue;

    if (index === currentTargetCorrectIndex) {
      answerValue = currentTargetValue;
    } else {
      do {
        const offset = Math.floor(Math.random() * 5) + 1;
        answerValue =
          Math.random() < 0.5
            ? currentTargetValue + offset
            : currentTargetValue - offset;
      } while (answerValue < 0 || usedAnswers.includes(answerValue));

      usedAnswers.push(answerValue);
    }

    button.textContent = createEquationWithAnswer(answerValue);
  });
}

function handleTargetChoice(index) {
  if (selectedMode !== "target-ten") return;

  if (index === currentTargetCorrectIndex) {
    score++;
    streak++;
    targetFeedback.textContent = "Correct! 🎉";
    choiceButtons[index].classList.add("correct-flash");
  } else {
    streak = 0;
    targetFeedback.textContent = "Try again!";
    choiceButtons[index].classList.add("wrong-flash");
    choiceButtons[currentTargetCorrectIndex].classList.add("correct-flash");
  }

  updateHud();
  nextRoundTimeout = setTimeout(generateTargetRound, 700);
}

// Game flow
function startGame() {
  stopAllActivity();

  currentOperation = operationSelect.value;
  currentMaxNumber = Number(maxNumberSelect.value);
  timerSeconds = Number(timerSelect.value);
  focusFacts = selectedMode === "classic" ? getSelectedFocusFacts() : [];

  score = 0;
  streak = 0;
  timeLeft = timerSeconds;
  resetRoundFeedback();
  updateHud();

  hideAllScreens();
  gameScreen.classList.remove("hidden");
  showGameMode();

  if (selectedMode === "classic") {
    generateClassicQuestion();
  } else {
    generateTargetRound();
  }

  startTimer();
}

function endGame() {
  stopAllActivity();
  hideAllScreens();
  gameOverScreen.classList.remove("hidden");
  gameOverMessage.textContent = `You finished with a score of ${score}.`;
}

function goToMenu() {
  stopAllActivity();
  hideAllScreens();
  menuScreen.classList.remove("hidden");
}

// Events
modeCards.forEach((card) => {
  card.addEventListener("click", () => {
    modeCards.forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedMode = card.dataset.mode;
  });
});

startButton.addEventListener("click", startGame);
submitButton.addEventListener("click", checkClassicAnswer);
backButton.addEventListener("click", goToMenu);
playAgainButton.addEventListener("click", startGame);
gameOverMenuButton.addEventListener("click", goToMenu);

toggleSettings.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
});

answerInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    checkClassicAnswer();
  }

  
});

choiceButtons.forEach((button, index) => {
  button.addEventListener("click", () => handleTargetChoice(index));
});

goToMenu();

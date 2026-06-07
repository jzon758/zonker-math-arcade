const scoreEl = document.getElementById("forgeScore");
const comboEl = document.getElementById("forgeCombo");
const highScoreEl = document.getElementById("forgeHighScore");
const itemsEl = document.getElementById("forgeItems");
const statusEl = document.getElementById("forgeStatus");
const expressionEl = document.getElementById("forgeExpression");
const stepLabelEl = document.getElementById("forgeStepLabel");
const promptEl = document.getElementById("forgePrompt");
const choicesEl = document.getElementById("forgeChoices");
const feedbackEl = document.getElementById("forgeFeedback");
const startButton = document.getElementById("forgeStartButton");
const newProblemButton = document.getElementById("forgeNewProblemButton");
const stageEl = document.getElementById("forgeStage");
const itemEl = document.getElementById("forgeItem");
const hammerEl = document.getElementById("forgeHammer");
const heatFillEl = document.getElementById("forgeHeatFill");
const progressFillEl = document.getElementById("forgeProgressFill");

const highScoreKey = "fractionForgeHighScore";
const operations = ["add", "subtract"];

const game = {
  score: 0,
  combo: 0,
  highScore: loadHighScore(),
  itemsForged: 0,
  progress: 0,
  heat: 40,
  currentProblem: null,
  stepIndex: 0,
  active: false,
  recentSimplificationNeeds: []
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(values) {
  return values[randomInt(0, values.length - 1)];
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

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function lcm(a, b) {
  return (a * b) / gcd(a, b);
}

function simplifyFraction(fraction) {
  const divisor = gcd(fraction.numerator, fraction.denominator);
  return {
    numerator: fraction.numerator / divisor,
    denominator: fraction.denominator / divisor
  };
}

function addFractions(first, second) {
  const denominator = lcm(first.denominator, second.denominator);
  return {
    numerator:
      first.numerator * (denominator / first.denominator) +
      second.numerator * (denominator / second.denominator),
    denominator
  };
}

function subtractFractions(first, second) {
  const denominator = lcm(first.denominator, second.denominator);
  return {
    numerator:
      first.numerator * (denominator / first.denominator) -
      second.numerator * (denominator / second.denominator),
    denominator
  };
}

function compareFractions(first, second) {
  return first.numerator * second.denominator - second.numerator * first.denominator;
}

function formatFraction(fraction) {
  return `${fraction.numerator}/${fraction.denominator}`;
}

function formatExpression(problem) {
  const symbol = problem.operation === "add" ? "+" : "-";
  return `${formatFraction(problem.fractions[0])} ${symbol} ${formatFraction(problem.fractions[1])}`;
}

function formatCommonDenominatorExpression(problem) {
  const symbol = problem.operation === "add" ? "+" : "-";
  const first = problem.fractions[0];
  const second = problem.fractions[1];
  const convertedFirst = {
    numerator: first.numerator * (problem.commonDenominator / first.denominator),
    denominator: problem.commonDenominator
  };
  const convertedSecond = {
    numerator: second.numerator * (problem.commonDenominator / second.denominator),
    denominator: problem.commonDenominator
  };

  return `${formatFraction(convertedFirst)} ${symbol} ${formatFraction(convertedSecond)}`;
}

function getWorkingDisplay(problem, step) {
  if (!step || step.type === "common-denominator-needed") {
    return formatExpression(problem);
  }

  if (step.type === "equivalent-fractions") {
    return formatExpression(problem);
  }

  if (step.type === "operate-numerators") {
    return problem.needsCommonDenominator ? formatCommonDenominatorExpression(problem) : formatExpression(problem);
  }

  if (step.type === "simplify-needed" || step.type === "reduce-final-answer") {
    return formatFraction(problem.rawResult);
  }

  return formatExpression(problem);
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
    // High score should not block practice if storage is unavailable.
  }
}

function makeProperFraction(denominator) {
  return {
    numerator: randomInt(1, denominator - 1),
    denominator
  };
}

function makeProblem() {
  const simplificationTarget = getSimplificationTarget();
  let fallbackProblem = null;

  for (let attempt = 0; attempt < 80; attempt++) {
    const problem = makeProblemCandidate();
    if (!isValidProblem(problem)) {
      continue;
    }

    fallbackProblem = fallbackProblem || problem;
    if (simplificationTarget === null || problem.needsSimplifying === simplificationTarget) {
      rememberSimplificationNeed(problem);
      return problem;
    }
  }

  const problem = fallbackProblem || makeValidSubtractionFallback();
  rememberSimplificationNeed(problem);
  return problem;
}

function makeValidSubtractionFallback() {
  for (let attempt = 0; attempt < 40; attempt++) {
    const problem = makeProblemCandidate("subtract");
    if (isValidProblem(problem)) {
      return problem;
    }
  }

  const problem = {
    operation: "subtract",
    fractions: [
      { numerator: 3, denominator: 4 },
      { numerator: 1, denominator: 4 }
    ],
    commonDenominator: 4,
    needsCommonDenominator: false,
    rawResult: { numerator: 2, denominator: 4 },
    simplifiedResult: { numerator: 1, denominator: 2 },
    needsSimplifying: true,
    steps: []
  };
  problem.steps = buildStepsForProblem(problem);
  return problem;
}

function makeProblemCandidate(forcedOperation) {
  const operation = randomFrom(operations);
  const selectedOperation = forcedOperation || operation;
  const useLikeDenominators = Math.random() < 0.45;
  let first;
  let second;

  if (useLikeDenominators) {
    const denominator = randomInt(3, 12);
    first = makeProperFraction(denominator);
    second = makeProperFraction(denominator);
  } else {
    const firstDenominator = randomInt(3, 12);
    let secondDenominator = randomInt(3, 12);
    while (secondDenominator === firstDenominator) {
      secondDenominator = randomInt(3, 12);
    }
    first = makeProperFraction(firstDenominator);
    second = makeProperFraction(secondDenominator);
  }

  if (selectedOperation === "subtract" && compareFractions(first, second) <= 0) {
    const temp = first;
    first = second;
    second = temp;
  }

  const rawResult = selectedOperation === "add" ? addFractions(first, second) : subtractFractions(first, second);
  const simplifiedResult = simplifyFraction(rawResult);

  const problem = {
    operation: selectedOperation,
    fractions: [first, second],
    commonDenominator: lcm(first.denominator, second.denominator),
    needsCommonDenominator: first.denominator !== second.denominator,
    rawResult,
    simplifiedResult,
    needsSimplifying:
      rawResult.numerator !== simplifiedResult.numerator ||
      rawResult.denominator !== simplifiedResult.denominator,
    steps: []
  };

  problem.steps = buildStepsForProblem(problem);
  return problem;
}

function isValidProblem(problem) {
  return (
    problem.simplifiedResult.numerator > 0 &&
    problem.simplifiedResult.numerator <= problem.simplifiedResult.denominator
  );
}

function getSimplificationTarget() {
  const recent = game.recentSimplificationNeeds.slice(-3);
  if (recent.length < 3) {
    return Math.random() < 0.6 ? true : null;
  }

  if (recent.every((needsSimplifying) => needsSimplifying)) {
    return false;
  }

  if (recent.every((needsSimplifying) => !needsSimplifying)) {
    return true;
  }

  return Math.random() < 0.6 ? true : null;
}

function rememberSimplificationNeed(problem) {
  game.recentSimplificationNeeds.push(problem.needsSimplifying);
  game.recentSimplificationNeeds = game.recentSimplificationNeeds.slice(-4);
}

function buildStepsForProblem(problem) {
  const steps = [];
  const first = problem.fractions[0];
  const second = problem.fractions[1];
  const symbol = problem.operation === "add" ? "+" : "-";
  const commonFirst = {
    numerator: first.numerator * (problem.commonDenominator / first.denominator),
    denominator: problem.commonDenominator
  };
  const commonSecond = {
    numerator: second.numerator * (problem.commonDenominator / second.denominator),
    denominator: problem.commonDenominator
  };

  steps.push(makeStep(
    "common-denominator-needed",
    "Do these fractions need a new common denominator?",
    makeCommonDenominatorChoices(problem),
    problem.needsCommonDenominator
      ? "Right. Unlike denominators need equivalent fractions first."
      : "Right. The denominators already match, so no conversion is needed."
  ));

  if (problem.needsCommonDenominator) {
    steps.push(makeStep(
      "equivalent-fractions",
      `Which equivalent fractions use ${problem.commonDenominator} as the common denominator?`,
      makeEquivalentFractionChoices(problem, commonFirst, commonSecond),
      "Nice conversion. Now the denominators match."
    ));
  }

  steps.push(makeStep(
    "operate-numerators",
    `What is the result before simplifying?`,
    makeCombineResultChoices(problem, commonFirst, commonSecond),
    "Correct strike. The numerators are combined."
  ));

  steps.push(makeStep(
    "simplify-needed",
    `Is ${formatFraction(problem.rawResult)} simplified?`,
    makeSimplifyDecisionChoices(problem),
    problem.needsSimplifying
      ? "Right. That is the simplest form."
      : "Right. That answer is already in simplest form."
  ));

  return steps;
}

function makeStep(type, prompt, choices, correctFeedback) {
  return {
    type,
    prompt,
    choices: shuffle(choices),
    correctFeedback
  };
}

function makeCommonDenominatorChoices(problem) {
  if (problem.needsCommonDenominator) {
    return [
      { text: "Yes, make common denominators", correct: true },
      { text: "Yes, flip the second fraction", correct: false },
      { text: "No, the denominators already match", correct: false },
      { text: "No, only numerators need to match", correct: false }
    ];
  }

  return [
    { text: "No, the denominators already match", correct: true },
    { text: "No, only numerators need to match", correct: false },
    { text: "Yes, make a new common denominator", correct: false },
    { text: "Yes, add the denominators first", correct: false }
  ];
}

function makeEquivalentFractionChoices(problem, commonFirst, commonSecond) {
  const first = problem.fractions[0];
  const second = problem.fractions[1];
  const symbol = problem.operation === "add" ? "+" : "-";

  return makeUniqueChoices([
    { text: `${formatFraction(commonFirst)} ${symbol} ${formatFraction(commonSecond)}`, correct: true },
    { text: `${first.numerator}/${problem.commonDenominator} ${symbol} ${second.numerator}/${problem.commonDenominator}`, correct: false },
    { text: `${formatFraction(commonFirst)} ${symbol} ${formatFraction(second)}`, correct: false },
    { text: `${first.numerator}/${first.denominator + second.denominator} ${symbol} ${second.numerator}/${first.denominator + second.denominator}`, correct: false },
    { text: `${formatFraction(second)} ${symbol} ${formatFraction(first)}`, correct: false }
  ]);
}

function makeCombineResultChoices(problem, commonFirst, commonSecond) {
  const operator = problem.operation === "add" ? 1 : -1;
  const denominatorMistake = problem.fractions[0].denominator + problem.fractions[1].denominator;
  const wrongNumerator = commonFirst.numerator + operator * commonSecond.numerator + randomFrom([-2, -1, 1, 2]);

  return makeFractionChoices(problem.rawResult, [
    {
      numerator: commonFirst.numerator + operator * commonSecond.numerator,
      denominator: commonFirst.denominator + commonSecond.denominator
    },
    {
      numerator: wrongNumerator,
      denominator: problem.commonDenominator
    },
    {
      numerator: problem.rawResult.numerator,
      denominator: denominatorMistake
    },
    {
      numerator: commonFirst.numerator + commonSecond.denominator,
      denominator: problem.commonDenominator
    },
    {
      numerator: Math.abs(commonFirst.numerator - commonSecond.numerator),
      denominator: denominatorMistake
    }
  ]);
}

function makeSimplifyDecisionChoices(problem) {
  const rawText = formatFraction(problem.rawResult);
  const simplestText = formatFraction(problem.simplifiedResult);
  const partialReduction = getPartialReduction(problem);
  const numeratorOnly = {
    numerator: Math.max(1, problem.simplifiedResult.numerator),
    denominator: problem.rawResult.denominator
  };
  const denominatorOnly = {
    numerator: problem.rawResult.numerator,
    denominator: problem.simplifiedResult.denominator
  };

  if (problem.needsSimplifying) {
    return makeUniqueChoices([
      { text: `No, ${simplestText} is the simplest form`, correct: true },
      { text: `No, ${formatFraction(partialReduction || numeratorOnly)} is the simplest form`, correct: false },
      { text: `Yes, ${rawText} is already simplified`, correct: false },
      { text: `Yes, ${formatFraction(denominatorOnly)} is an equivalent simplified form`, correct: false }
    ]);
  }

  const smallerNumerator = {
    numerator: problem.rawResult.numerator > 1 ? problem.rawResult.numerator - 1 : problem.rawResult.numerator + 1,
    denominator: problem.rawResult.denominator
  };
  const smallerDenominator = {
    numerator: problem.rawResult.numerator,
    denominator: problem.rawResult.denominator > 2 ? problem.rawResult.denominator - 1 : problem.rawResult.denominator + 1
  };

  return makeUniqueChoices([
    { text: `Yes, ${rawText} is already simplified`, correct: true },
    { text: `Yes, ${formatFraction(smallerDenominator)} is an equivalent simplified form`, correct: false },
    { text: `No, ${formatFraction(smallerNumerator)} is the simplest form`, correct: false },
    { text: `No, ${formatFraction(smallerDenominator)} is the simplest form`, correct: false }
  ]);
}

function makeReductionChoices(problem) {
  const divisor = gcd(problem.rawResult.numerator, problem.rawResult.denominator);
  const wrongFactor = divisor === 2 ? 3 : 2;
  const partialReduction = getPartialReduction(problem);

  return makeFractionChoices(problem.simplifiedResult, [
    problem.rawResult,
    partialReduction || {
      numerator: problem.rawResult.numerator / divisor,
      denominator: problem.rawResult.denominator
    },
    {
      numerator: problem.rawResult.numerator / divisor,
      denominator: problem.rawResult.denominator
    },
    {
      numerator: problem.rawResult.numerator,
      denominator: problem.rawResult.denominator / divisor
    },
    {
      numerator: problem.rawResult.numerator / wrongFactor,
      denominator: problem.rawResult.denominator / wrongFactor
    }
  ]);
}

function getPartialReduction(problem) {
  const divisor = gcd(problem.rawResult.numerator, problem.rawResult.denominator);
  if (divisor <= 2) {
    return null;
  }

  for (let factor = 2; factor < divisor; factor++) {
    if (
      divisor % factor === 0 &&
      problem.rawResult.numerator % factor === 0 &&
      problem.rawResult.denominator % factor === 0
    ) {
      return {
        numerator: problem.rawResult.numerator / factor,
        denominator: problem.rawResult.denominator / factor
      };
    }
  }

  return null;
}

function makeUniqueChoices(choices) {
  const uniqueChoices = [];
  const fallbackChoices = [
    { text: "Keep the original fractions", correct: false },
    { text: "Use the numerators as denominators", correct: false },
    { text: "Only change the first fraction", correct: false },
    { text: "Only change the second denominator", correct: false }
  ];

  choices.forEach((choice) => {
    if (!uniqueChoices.some((existingChoice) => existingChoice.text === choice.text)) {
      uniqueChoices.push(choice);
    }
  });

  fallbackChoices.forEach((choice) => {
    if (
      uniqueChoices.length < 4 &&
      !uniqueChoices.some((existingChoice) => existingChoice.text === choice.text)
    ) {
      uniqueChoices.push(choice);
    }
  });

  return uniqueChoices.slice(0, 4);
}

function makeFractionChoices(correctFraction, distractors) {
  const choices = [{ text: formatFraction(correctFraction), correct: true }];
  distractors.forEach((fraction) => {
    if (
      Number.isInteger(fraction.numerator) &&
      Number.isInteger(fraction.denominator) &&
      fraction.numerator > 0 &&
      fraction.denominator > 0
    ) {
      const text = formatFraction(fraction);
      if (!choices.some((choice) => choice.text === text)) {
        choices.push({ text, correct: false });
      }
    }
  });

  while (choices.length < 4) {
    const fraction = {
      numerator: Math.max(1, correctFraction.numerator + randomInt(-2, 3)),
      denominator: Math.max(2, correctFraction.denominator + randomInt(-3, 3))
    };
    const text = formatFraction(fraction);
    if (!choices.some((choice) => choice.text === text)) {
      choices.push({ text, correct: false });
    }
  }

  return choices.slice(0, 4);
}

function startGame() {
  game.score = 0;
  game.combo = 0;
  game.itemsForged = 0;
  game.recentSimplificationNeeds = [];
  game.active = true;
  startProblem();
}

function startProblem() {
  game.currentProblem = makeProblem();
  game.stepIndex = 0;
  game.progress = 0;
  game.heat = 44;
  game.active = true;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  expressionEl.textContent = formatExpression(game.currentProblem);
  statusEl.textContent = "Choose the best next fraction step.";
  renderStep();
  updateHud();
  updateForgeVisual();
}

function renderStep() {
  const step = game.currentProblem.steps[game.stepIndex];
  expressionEl.textContent = getWorkingDisplay(game.currentProblem, step);
  stepLabelEl.textContent = `Step ${game.stepIndex + 1}`;
  promptEl.textContent = step.prompt;
  choicesEl.innerHTML = "";

  step.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice-button forge-choice-button";
    button.type = "button";
    button.textContent = choice.text;
    button.addEventListener("click", () => handleChoice(choice, button));
    choicesEl.appendChild(button);
  });
}

function setChoiceButtonsDisabled(disabled) {
  choicesEl.querySelectorAll("button").forEach((button) => {
    button.disabled = disabled;
  });
}

function handleChoice(choice, button) {
  if (!game.active) return;

  if (choice.correct) {
    handleCorrectChoice(button);
    return;
  }

  handleWrongChoice(button);
}

function handleCorrectChoice(button) {
  setChoiceButtonsDisabled(true);
  game.combo++;
  game.score += 5 + Math.min(5, Math.floor(game.combo / 3));
  game.progress = Math.min(100, game.progress + Math.ceil(100 / game.currentProblem.steps.length));
  game.heat = Math.min(100, game.heat + 12);
  updateHighScore();

  button.classList.add("correct-flash");
  feedbackEl.textContent = game.currentProblem.steps[game.stepIndex].correctFeedback;
  feedbackEl.className = "feedback correct";
  triggerForgeEffect("strike");
  game.stepIndex++;

  if (game.stepIndex >= game.currentProblem.steps.length) {
    finishProblem();
  } else {
    setTimeout(renderStep, 550);
  }

  updateHud();
  updateForgeVisual();
}

function handleWrongChoice(button) {
  game.combo = 0;
  game.score = Math.max(0, game.score - 3);
  game.progress = Math.max(0, game.progress - 8);
  game.heat = Math.max(10, game.heat - 16);
  updateHighScore();

  button.classList.add("wrong-flash");
  feedbackEl.textContent = "Not quite. Try that step again.";
  feedbackEl.className = "feedback wrong";
  triggerForgeEffect("cool");
  updateHud();
  updateForgeVisual();
}

function finishProblem() {
  game.itemsForged++;
  game.progress = 100;
  game.heat = 100;
  expressionEl.textContent = formatFraction(game.currentProblem.simplifiedResult);
  feedbackEl.textContent = "Item forged!";
  feedbackEl.className = "feedback correct";
  statusEl.textContent = "Item forged! New problem coming up.";
  game.active = false;
  updateHud();
  updateForgeVisual();
  setTimeout(startProblem, 1300);
}

function updateHighScore() {
  if (game.score <= game.highScore) return;

  game.highScore = game.score;
  saveHighScore();
}

function updateHud() {
  scoreEl.textContent = game.score;
  comboEl.textContent = game.combo;
  highScoreEl.textContent = game.highScore;
  itemsEl.textContent = game.itemsForged;
}

function updateForgeVisual() {
  heatFillEl.style.width = `${game.heat}%`;
  progressFillEl.style.width = `${game.progress}%`;
  itemEl.style.width = `${Math.max(42, 42 + game.progress * 1.55)}px`;
}

function triggerForgeEffect(type) {
  stageEl.classList.remove("forge-strike", "forge-cool");
  hammerEl.classList.remove("forge-hammer-hit");
  void stageEl.offsetWidth;
  stageEl.classList.add(type === "strike" ? "forge-strike" : "forge-cool");
  if (type === "strike") {
    hammerEl.classList.add("forge-hammer-hit");
  }
}

startButton.addEventListener("click", startGame);
newProblemButton.addEventListener("click", startProblem);

updateHud();
updateForgeVisual();

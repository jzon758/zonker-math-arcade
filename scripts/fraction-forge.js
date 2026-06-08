const scoreEl = document.getElementById("forgeScore");
const comboEl = document.getElementById("forgeCombo");
const highScoreEl = document.getElementById("forgeHighScore");
const itemsEl = document.getElementById("forgeItems");
const levelEl = document.getElementById("forgeLevel");
const statusEl = document.getElementById("forgeStatus");
const expressionEl = document.getElementById("forgeExpression");
const stepLabelEl = document.getElementById("forgeStepLabel");
const promptEl = document.getElementById("forgePrompt");
const choicesEl = document.getElementById("forgeChoices");
const feedbackEl = document.getElementById("forgeFeedback");
const startButton = document.getElementById("forgeStartButton");
const workPanelEl = document.querySelector(".forge-work-panel");
const pauseOverlayEl = document.getElementById("forgePauseOverlay");
const stageEl = document.getElementById("forgeStage");
const itemEl = document.getElementById("forgeItem");
const hammerEl = document.getElementById("forgeHammer");
const levelOverlayEl = document.getElementById("forgeLevelOverlay");
const heatFillEl = document.getElementById("forgeHeatFill");
const progressFillEl = document.getElementById("forgeProgressFill");
const forgedSlotEls = document.querySelectorAll(".forged-slot");

const highScoreKey = "fractionForgeHighScore";
const operations = ["add", "subtract", "multiply", "divide"];
const baseHeatDrainPerSecond = 1.15;
const wrongHeatPenalty = 18;
const itemHeatBonus = 20;
const itemScoreBonus = 10;
const forgedItemsPerLevel = 4;
const forgedItemNames = ["Sword", "Shield", "Hammer", "Key", "Axe", "Crown", "Pickaxe", "Wrench"];

const game = {
  score: 0,
  combo: 0,
  highScore: loadHighScore(),
  itemsForged: 0,
  level: 1,
  progress: 0,
  heat: 100,
  currentProblem: null,
  stepIndex: 0,
  active: false,
  running: false,
  gameOver: false,
  paused: false,
  lastHeatUpdate: 0,
  transitionId: 0,
  forgedSlots: [],
  resetSlotsOnNextProblem: false,
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

function multiplyFractions(first, second) {
  return {
    numerator: first.numerator * second.numerator,
    denominator: first.denominator * second.denominator
  };
}

function reciprocalFraction(fraction) {
  return {
    numerator: fraction.denominator,
    denominator: fraction.numerator
  };
}

function compareFractions(first, second) {
  return first.numerator * second.denominator - second.numerator * first.denominator;
}

function formatFraction(fraction) {
  if (fraction.denominator === 1) {
    return String(fraction.numerator);
  }

  return `${fraction.numerator}/${fraction.denominator}`;
}

function formatExpression(problem) {
  const symbol = getOperationSymbol(problem.operation);
  return `${formatFraction(problem.fractions[0])} ${symbol} ${formatFraction(problem.fractions[1])}`;
}

function formatCommonDenominatorExpression(problem) {
  const symbol = getOperationSymbol(problem.operation);
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

function getOperationSymbol(operation) {
  if (operation === "add") return "+";
  if (operation === "subtract") return "-";
  if (operation === "multiply") return "×";
  if (operation === "divide") return "÷";
  return "?";
}

function formatMultiplicationExpression(first, second) {
  return `${formatFraction(first)} × ${formatFraction(second)}`;
}

function formatDivisionRewriteExpression(problem) {
  return formatMultiplicationExpression(problem.fractions[0], reciprocalFraction(problem.fractions[1]));
}

function getWorkingDisplay(problem, step) {
  if (!step || step.type === "first-move") {
    return formatExpression(problem);
  }

  if (step.type === "equivalent-fractions") {
    return formatExpression(problem);
  }

  if (step.type === "operate-numerators") {
    return problem.needsCommonDenominator ? formatCommonDenominatorExpression(problem) : formatExpression(problem);
  }

  if (step.type === "division-rewrite") {
    return formatExpression(problem);
  }

  if (step.type === "multiply-product") {
    return problem.operation === "divide" ? formatDivisionRewriteExpression(problem) : formatExpression(problem);
  }

  if (step.type === "simplify-needed") {
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

function makeFriendlyFraction(denominator, maxNumerator) {
  return {
    numerator: randomInt(1, Math.min(denominator - 1, maxNumerator)),
    denominator
  };
}

function makeProductFraction(denominator, config) {
  if (config.productHighNumeratorChance && Math.random() < config.productHighNumeratorChance) {
    const minimum = Math.max(1, Math.ceil(denominator * config.productMinNumeratorRatio));
    return {
      numerator: randomInt(minimum, denominator - 1),
      denominator
    };
  }

  return makeFriendlyFraction(denominator, config.maxNumerator);
}

function getProblemDifficultyLevel() {
  return Math.floor(game.level / 2) + 1;
}

function getHeatDifficultyLevel() {
  return Math.floor((game.level - 1) / 2) + 1;
}

function getHeatDrainRate() {
  return baseHeatDrainPerSecond + (getHeatDifficultyLevel() - 1) * 0.3;
}

function getCorrectHeatBonus() {
  return Math.max(8, 14 - (getHeatDifficultyLevel() - 1) * 2);
}

function getDifficultyConfig() {
  const configs = [
    {
      denominators: [2, 3, 4, 5, 6, 8, 10],
      productDenominators: [2, 3, 4, 5, 6],
      maxNumerator: 4,
      commonDenominatorCap: 12,
      maxProductValue: 48,
      easyPairChance: 0.9,
      likeDenominatorChance: 0.5,
      divisionImproperChance: 0,
      allowedReductionFactors: [2, 3, 5]
    },
    {
      denominators: [2, 3, 4, 5, 6, 8, 10, 12],
      productDenominators: [2, 3, 4, 5, 6, 8],
      maxNumerator: 5,
      commonDenominatorCap: 24,
      maxProductValue: 72,
      easyPairChance: 0.72,
      likeDenominatorChance: 0.4,
      divisionImproperChance: 0.05,
      allowedReductionFactors: [2, 3, 4, 5, 6]
    },
    {
      denominators: [3, 4, 5, 6, 8, 9, 10, 12],
      productDenominators: [3, 4, 5, 6, 8, 9, 10],
      maxNumerator: 7,
      commonDenominatorCap: 36,
      maxProductValue: 110,
      easyPairChance: 0.5,
      likeDenominatorChance: 0.3,
      divisionImproperChance: 0.15,
      allowedReductionFactors: [2, 3, 4, 5, 6, 8, 9]
    },
    {
      denominators: [3, 4, 5, 6, 7, 8, 9, 10, 12],
      productDenominators: [3, 4, 5, 6, 7, 8, 9, 10, 12],
      maxNumerator: 9,
      commonDenominatorCap: 60,
      maxProductValue: 150,
      easyPairChance: 0.34,
      likeDenominatorChance: 0.24,
      divisionImproperChance: 0.3,
      allowedReductionFactors: [2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    {
      denominators: [16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32],
      productDenominators: [16, 18, 20, 21, 22, 24, 25, 27, 28, 29, 30, 31, 32],
      maxNumerator: 31,
      commonDenominatorCap: 999,
      minCommonDenominator: 100,
      maxProductValue: 999,
      easyPairChance: 0.08,
      likeDenominatorChance: 0.05,
      divisionImproperChance: 0.82,
      productHighNumeratorChance: 0.72,
      productMinNumeratorRatio: 0.55,
      allowedReductionFactors: null
    }
  ];

  return configs[Math.min(configs.length - 1, getProblemDifficultyLevel() - 1)];
}

function getLevelUpMessage(level) {
  return level % 2 === 0
    ? `Level ${level}: Stronger fractions!`
    : `Level ${level}: The forge burns faster!`;
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
  const config = getDifficultyConfig();

  if (selectedOperation === "multiply" || selectedOperation === "divide") {
    return makeProductProblemCandidate(selectedOperation, config);
  }

  return makeAddSubtractProblemCandidate(selectedOperation, config);
}

function makeAddSubtractProblemCandidate(selectedOperation, config) {
  const fractions = makeAddSubtractFractions(config);
  let first = fractions[0];
  let second = fractions[1];

  if (selectedOperation === "subtract" && compareFractions(first, second) <= 0) {
    const temp = first;
    first = second;
    second = temp;
  }

  const rawResult = selectedOperation === "add"
    ? addFractions(first, second)
    : subtractFractions(first, second);

  return makeProblemFromParts(selectedOperation, first, second, rawResult);
}

function makeProductProblemCandidate(selectedOperation, config) {
  const denominatorPool = config.productDenominators;
  const allowImproperDivision =
    selectedOperation === "divide" && Math.random() < config.divisionImproperChance;
  let first;
  let second;

  for (let attempt = 0; attempt < 20; attempt++) {
    first = makeProductFraction(randomFrom(denominatorPool), config);
    second = makeProductFraction(randomFrom(denominatorPool), config);

    if (
      selectedOperation !== "divide" ||
      allowImproperDivision ||
      compareFractions(first, second) <= 0
    ) {
      break;
    }
  }

  if (
    selectedOperation === "divide" &&
    compareFractions(first, second) > 0 &&
    !allowImproperDivision
  ) {
    const temp = first;
    first = second;
    second = temp;
  }

  const rawResult = selectedOperation === "divide"
    ? multiplyFractions(first, reciprocalFraction(second))
    : multiplyFractions(first, second);

  return makeProblemFromParts(selectedOperation, first, second, rawResult);
}

function makeAddSubtractFractions(config) {
  const pairTypeRoll = Math.random();
  const useLikeDenominators = pairTypeRoll < config.likeDenominatorChance;
  const useEasyPair = pairTypeRoll < config.easyPairChance;

  if (useLikeDenominators) {
    const denominator = randomFrom(config.denominators);
    return [makeProperFraction(denominator), makeProperFraction(denominator)];
  }

  const denominatorPair = useEasyPair
    ? makeMultipleDenominatorPair(config)
    : makeCappedDenominatorPair(config);

  return [makeProperFraction(denominatorPair[0]), makeProperFraction(denominatorPair[1])];
}

function makeMultipleDenominatorPair(config) {
  const pairs = [];
  config.denominators.forEach((first) => {
    config.denominators.forEach((second) => {
      if (
        first !== second &&
        lcm(first, second) <= config.commonDenominatorCap &&
        (first % second === 0 || second % first === 0)
      ) {
        pairs.push([first, second]);
      }
    });
  });

  return pairs.length ? randomFrom(pairs) : makeCappedDenominatorPair(config);
}

function makeCappedDenominatorPair(config) {
  const pairs = [];
  const preferredPairs = [];
  config.denominators.forEach((first) => {
    config.denominators.forEach((second) => {
      const commonDenominator = lcm(first, second);
      if (first !== second && commonDenominator <= config.commonDenominatorCap) {
        pairs.push([first, second]);
        if (!config.minCommonDenominator || commonDenominator >= config.minCommonDenominator) {
          preferredPairs.push([first, second]);
        }
      }
    });
  });

  if (preferredPairs.length) {
    return randomFrom(preferredPairs);
  }

  return pairs.length ? randomFrom(pairs) : [config.denominators[0], config.denominators[1]];
}

function makeProblemFromParts(selectedOperation, first, second, rawResult) {
  const simplifiedResult = simplifyFraction(rawResult);

  const problem = {
    operation: selectedOperation,
    fractions: [first, second],
    commonDenominator: lcm(first.denominator, second.denominator),
    needsCommonDenominator:
      selectedOperation !== "multiply" &&
      selectedOperation !== "divide" &&
      first.denominator !== second.denominator,
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

function hasFriendlyReduction(problem, config) {
  if (!problem.needsSimplifying || !config.allowedReductionFactors) {
    return true;
  }

  return config.allowedReductionFactors.includes(gcd(problem.rawResult.numerator, problem.rawResult.denominator));
}

function isWithinSizeLimits(problem, config) {
  if (problem.operation === "add" || problem.operation === "subtract") {
    return problem.commonDenominator <= config.commonDenominatorCap;
  }

  return (
    problem.rawResult.numerator <= config.maxProductValue &&
    problem.rawResult.denominator <= config.maxProductValue
  );
}

function isValidProblem(problem) {
  const config = getDifficultyConfig();
  const resultAtOrBelowOne =
    problem.simplifiedResult.numerator <= problem.simplifiedResult.denominator;
  const divisionCanBeImproper =
    problem.operation === "divide" &&
    getProblemDifficultyLevel() >= 4 &&
    Math.max(problem.rawResult.numerator, problem.rawResult.denominator) <= config.maxProductValue;

  return (
    problem.simplifiedResult.numerator > 0 &&
    (resultAtOrBelowOne || divisionCanBeImproper) &&
    isWithinSizeLimits(problem, config) &&
    hasFriendlyReduction(problem, config)
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
  if (problem.operation === "multiply") {
    return buildMultiplicationSteps(problem);
  }

  if (problem.operation === "divide") {
    return buildDivisionSteps(problem);
  }

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
    "first-move",
    "What is the best first move?",
    makeFirstMoveChoices(problem),
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

function buildMultiplicationSteps(problem) {
  const steps = [];

  steps.push(makeStep(
    "first-move",
    "What is the best first move?",
    makeFirstMoveChoices(problem),
    "Right. Multiply straight across: numerator times numerator, denominator times denominator."
  ));

  steps.push(makeStep(
    "multiply-product",
    "What is the product before simplifying?",
    makeMultiplicationProductChoices(problem),
    "Correct strike. That is the product before simplifying."
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

function buildDivisionSteps(problem) {
  const steps = [];

  steps.push(makeStep(
    "first-move",
    "What is the best first move?",
    makeFirstMoveChoices(problem),
    "Right. Divide fractions by multiplying by the reciprocal."
  ));

  steps.push(makeStep(
    "division-rewrite",
    "Which multiplication expression matches this division problem?",
    makeDivisionRewriteChoices(problem),
    "Nice rewrite. Now multiply straight across."
  ));

  steps.push(makeStep(
    "multiply-product",
    "What is the product before simplifying?",
    makeMultiplicationProductChoices(problem),
    "Correct strike. That is the product before simplifying."
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

function makeFirstMoveChoices(problem) {
  if (problem.operation === "add" || problem.operation === "subtract") {
    if (problem.needsCommonDenominator) {
      return [
        { text: "Find a common denominator", correct: true },
        { text: "Denominators already match; combine the numerators", correct: false },
        { text: "Multiply numerators and denominators", correct: false },
        { text: "Add or subtract the denominators too", correct: false }
      ];
    }

    return [
      { text: "Denominators already match; combine the numerators", correct: true },
      { text: "Find a common denominator", correct: false },
      { text: "Multiply numerators and denominators", correct: false },
      { text: "Add or subtract the denominators too", correct: false }
    ];
  }

  if (problem.operation === "divide") {
    return [
      { text: "Multiply by the reciprocal", correct: true },
      { text: "Find a common denominator", correct: false },
      { text: "Multiply numerators and denominators", correct: false },
      { text: "Flip both fractions", correct: false }
    ];
  }

  return [
    { text: "Multiply numerators and multiply denominators", correct: true },
    { text: "Make common denominators first", correct: false },
    { text: "Add numerators and add denominators", correct: false },
    { text: "Flip the second fraction before multiplying", correct: false }
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

function makeDivisionRewriteChoices(problem) {
  const first = problem.fractions[0];
  const second = problem.fractions[1];
  const reciprocalSecond = reciprocalFraction(second);

  return makeUniqueChoices([
    { text: formatMultiplicationExpression(first, reciprocalSecond), correct: true },
    { text: formatMultiplicationExpression(first, second), correct: false },
    { text: formatMultiplicationExpression(reciprocalFraction(first), second), correct: false },
    { text: `${formatFraction(first)} + ${formatFraction(reciprocalSecond)}`, correct: false },
    { text: formatMultiplicationExpression(reciprocalFraction(first), reciprocalSecond), correct: false }
  ]);
}

function makeMultiplicationProductChoices(problem) {
  const first = problem.fractions[0];
  const second = problem.operation === "divide" ? reciprocalFraction(problem.fractions[1]) : problem.fractions[1];

  return makeFractionChoices(problem.rawResult, [
    {
      numerator: first.numerator + second.numerator,
      denominator: first.denominator + second.denominator
    },
    {
      numerator: first.numerator * second.numerator,
      denominator: first.denominator + second.denominator
    },
    {
      numerator: first.numerator + second.numerator,
      denominator: first.denominator * second.denominator
    },
    {
      numerator: first.numerator * second.denominator,
      denominator: first.denominator * second.numerator
    },
    {
      numerator: first.denominator * second.denominator,
      denominator: first.numerator * second.numerator
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
  if (game.running && !game.gameOver) return;

  levelOverlayEl.classList.remove("show", "game-over", "paused");
  levelOverlayEl.textContent = "LEVEL UP";
  game.score = 0;
  game.combo = 0;
  game.itemsForged = 0;
  game.level = 1;
  game.progress = 0;
  game.heat = 100;
  game.running = true;
  game.gameOver = false;
  game.paused = false;
  game.transitionId++;
  game.lastHeatUpdate = getNow();
  game.forgedSlots = [];
  game.resetSlotsOnNextProblem = false;
  game.recentSimplificationNeeds = [];
  renderForgedSlots();
  updateRunButtonState();
  startProblem();
}

function startProblem() {
  if (!game.running || game.gameOver) return;

  if (game.resetSlotsOnNextProblem) {
    game.forgedSlots = [];
    game.resetSlotsOnNextProblem = false;
    renderForgedSlots();
  }

  game.currentProblem = makeProblem();
  game.stepIndex = 0;
  game.progress = 0;
  game.active = true;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  expressionEl.textContent = formatExpression(game.currentProblem);
  statusEl.textContent = "Choose the best next fraction step.";
  renderStep();
  updateHud();
  updateRunButtonState();
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
  if (!game.running || !game.active || game.gameOver || game.paused) return;

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
  applyHeatChange(getCorrectHeatBonus());
  updateHighScore();

  button.classList.add("correct-flash");
  feedbackEl.textContent = game.currentProblem.steps[game.stepIndex].correctFeedback;
  feedbackEl.className = "feedback correct";
  triggerForgeEffect("strike");
  game.stepIndex++;

  if (game.stepIndex >= game.currentProblem.steps.length) {
    finishProblem();
  } else {
    const transitionId = game.transitionId;
    setTimeout(() => {
      if (game.running && !game.gameOver && !game.paused && transitionId === game.transitionId) {
        renderStep();
      }
    }, 550);
  }

  updateHud();
  updateForgeVisual();
}

function handleWrongChoice(button) {
  game.combo = 0;
  game.score = Math.max(0, game.score - 3);
  game.progress = Math.max(0, game.progress - 8);
  applyHeatChange(-wrongHeatPenalty);
  const didGameOver = game.gameOver;
  updateHighScore();

  button.classList.add("wrong-flash");
  feedbackEl.textContent = game.gameOver ? "Game Over. Press Start to try again." : "Not quite. Try that step again.";
  feedbackEl.className = "feedback wrong";
  if (!didGameOver) {
    triggerForgeEffect("cool");
  }
  updateHud();
  updateForgeVisual();
}

function finishProblem() {
  if (!game.running || game.gameOver) return;

  const previousLevel = game.level;
  game.active = false;
  game.transitionId++;
  game.itemsForged++;
  game.forgedSlots.push(forgedItemNames[(game.itemsForged - 1) % forgedItemNames.length]);
  game.level = Math.floor(game.itemsForged / forgedItemsPerLevel) + 1;
  game.resetSlotsOnNextProblem = game.level > previousLevel;
  game.score += itemScoreBonus;
  game.progress = 100;
  applyHeatChange(itemHeatBonus);
  updateHighScore();
  renderForgedSlots();
  expressionEl.textContent = formatFraction(game.currentProblem.simplifiedResult);
  feedbackEl.textContent = "Item forged!";
  feedbackEl.className = "feedback correct";
  statusEl.textContent =
    game.level > previousLevel
      ? `Level Up! ${getLevelUpMessage(game.level)}`
      : "Item forged! New problem coming up.";
  triggerForgeEffect(game.level > previousLevel ? "level" : "complete");
  updateHud();
  updateRunButtonState();
  updateForgeVisual();
  const transitionId = game.transitionId;
  setTimeout(() => {
    if (game.running && !game.gameOver && !game.paused && transitionId === game.transitionId) {
      startProblem();
    }
  }, 1300);
}

function getNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function applyHeatChange(amount) {
  if (game.gameOver) return;

  game.heat = Math.max(0, Math.min(100, game.heat + amount));
  if (game.heat <= 0) {
    endGame();
  }
}

function endGame() {
  if (game.gameOver) return;

  game.running = false;
  game.active = false;
  game.gameOver = true;
  game.paused = false;
  game.transitionId++;
  game.heat = 0;
  updateHighScore();
  setChoiceButtonsDisabled(true);
  statusEl.textContent = "Game Over";
  promptEl.textContent = "Game Over";
  feedbackEl.textContent = "Game Over. Press Start to try again.";
  feedbackEl.className = "feedback wrong";
  levelOverlayEl.textContent = "FORGE COOLED";
  levelOverlayEl.classList.remove("paused");
  levelOverlayEl.classList.add("show", "game-over");
  updateHud();
  updateRunButtonState();
  updateForgeVisual();
}

function updateHeatDrain(now) {
  if (!game.lastHeatUpdate) {
    game.lastHeatUpdate = now;
  }

  const elapsedSeconds = Math.min(0.25, (now - game.lastHeatUpdate) / 1000);
  game.lastHeatUpdate = now;

  if (game.running && game.active && !game.gameOver && !game.paused) {
    applyHeatChange(-getHeatDrainRate() * elapsedSeconds);
    updateForgeVisual();
  }
}

function runHeatLoop(now) {
  updateHeatDrain(now);
  requestAnimationFrame(runHeatLoop);
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
  levelEl.textContent = game.level;
}

function updateRunButtonState() {
  startButton.disabled = game.running && !game.gameOver && !game.paused && !game.active;
  startButton.textContent = game.running && !game.gameOver
    ? game.paused ? "Resume" : "Pause"
    : "Start Forging";
  workPanelEl.classList.toggle("is-paused", game.paused);
  pauseOverlayEl.setAttribute("aria-hidden", game.paused ? "false" : "true");
}

function pauseGame() {
  if (!game.running || game.gameOver || game.paused || !game.active) return;

  game.paused = true;
  game.lastHeatUpdate = getNow();
  setChoiceButtonsDisabled(true);
  statusEl.textContent = "Forge paused.";
  levelOverlayEl.textContent = "PAUSED";
  levelOverlayEl.classList.remove("game-over");
  levelOverlayEl.classList.add("show", "paused");
  updateRunButtonState();
}

function resumeGame() {
  if (!game.running || game.gameOver || !game.paused) return;

  game.paused = false;
  game.lastHeatUpdate = getNow();
  levelOverlayEl.classList.remove("show", "paused");
  levelOverlayEl.textContent = "LEVEL UP";
  statusEl.textContent = "Choose the best next fraction step.";
  if (game.stepIndex < game.currentProblem.steps.length) {
    renderStep();
  }
  updateRunButtonState();
}

function renderForgedSlots() {
  forgedSlotEls.forEach((slot, index) => {
    const itemName = game.forgedSlots[index];
    slot.innerHTML = itemName
      ? `<span class="forged-icon item-${itemName.toLowerCase()}"></span><span>${itemName}</span>`
      : "";
    slot.classList.toggle("filled", Boolean(itemName));
    slot.setAttribute("aria-label", itemName ? `${itemName} forged` : "Empty forged item slot");
  });
}

function updateForgeVisual() {
  heatFillEl.style.width = `${game.heat}%`;
  progressFillEl.style.width = `${game.progress}%`;
  itemEl.style.width = `${Math.max(42, 42 + game.progress * 1.55)}px`;
  stageEl.classList.toggle("heat-critical", game.heat < 20);
  stageEl.classList.toggle("heat-low", game.heat >= 20 && game.heat < 40);
  stageEl.classList.toggle("heat-mid", game.heat >= 40 && game.heat < 70);
  stageEl.classList.toggle("heat-high", game.heat >= 70);
  heatFillEl.classList.toggle("heat-critical", game.heat < 20);
  heatFillEl.classList.toggle("heat-low", game.heat >= 20 && game.heat < 40);

  for (let level = 1; level <= 5; level++) {
    stageEl.classList.toggle(`forge-upgrade-${level}`, Math.min(5, game.level) === level);
  }
}

function triggerForgeEffect(type) {
  stageEl.classList.remove("forge-strike", "forge-cool", "forge-complete", "forge-level-up");
  levelOverlayEl.classList.remove("show", "game-over", "paused");
  levelOverlayEl.textContent = "LEVEL UP";
  hammerEl.classList.remove("forge-hammer-hit");
  void stageEl.offsetWidth;
  if (type === "strike" || type === "complete" || type === "level") {
    stageEl.classList.add(type === "level" ? "forge-level-up" : type === "complete" ? "forge-complete" : "forge-strike");
    hammerEl.classList.add("forge-hammer-hit");
    if (type === "level") {
      levelOverlayEl.classList.add("show");
    }
  } else {
    stageEl.classList.add("forge-cool");
  }
}

startButton.addEventListener("click", () => {
  if (!game.running || game.gameOver) {
    startGame();
    return;
  }

  if (game.paused) {
    resumeGame();
  } else {
    pauseGame();
  }
});

updateHud();
updateRunButtonState();
updateForgeVisual();
requestAnimationFrame(runHeatLoop);

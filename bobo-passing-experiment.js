const BOBO_CONFIG = {
  demoRounds: 3,
  totalRounds: 7,
  baselineRounds: 2,
  treatmentRounds: 5,
  defaultBreachType: 'performance',
  defaultIntensity: 'low',
  breachRoundsByIntensity: {
    low: [2],
    high: [2, 4, 5],
  },
  storageKey: 'boboPassingExperimentResponses',
  perRoundMeasures: [
    {
      key: 'nextSuccessExpectation',
      label: '我预期 Bobo 下一轮能够成功接到球。',
      low: '非常不认同',
      high: '非常认同',
    },
    {
      key: 'continueCooperationExpectation',
      label: '我预期 Bobo 下一轮会继续和我合作。',
      low: '非常不认同',
      high: '非常认同',
    },
    {
      key: 'collaborativeSoA',
      label: '在刚才这一轮中，我感到自己和 Bobo 共同影响了游戏结果。',
      low: '非常不认同',
      high: '非常认同',
    },
    {
      key: 'trust',
      label: '我信任 Bobo 能够和我一起完成这个游戏。',
      low: '非常不认同',
      high: '非常认同',
    },
  ],
  finalMeasures: [
    {
      key: 'enjoymentInteresting',
      label: '和 Bobo 一起玩传球游戏是有趣的。',
      low: '非常不认同',
      high: '非常认同',
    },
    {
      key: 'enjoymentPleasant',
      label: '这次互动体验让我感到愉快。',
      low: '非常不认同',
      high: '非常认同',
    },
    {
      key: 'enjoymentFun',
      label: '我享受和 Bobo 一起完成传球任务的过程。',
      low: '非常不认同',
      high: '非常认同',
    },
  ],
};

const refs = {
  screens: document.querySelectorAll('.screen'),
  introStart: document.getElementById('introStart'),
  demoPassButton: document.getElementById('demoPassButton'),
  demoNextButton: document.getElementById('demoNextButton'),
  gameIntroStart: document.getElementById('gameIntroStart'),
  demoStage: document.getElementById('demoStage'),
  demoDogWrap: document.getElementById('demoDogWrap'),
  demoBall: document.getElementById('demoBall'),
  demoBasket: document.getElementById('demoBasket'),
  demoHint: document.getElementById('demoHint'),
  greenChoice: document.getElementById('greenChoice'),
  orangeChoice: document.getElementById('orangeChoice'),
  roundLabel: document.getElementById('roundLabel'),
  phaseLabel: document.getElementById('phaseLabel'),
  ownBasket: document.getElementById('ownBasket'),
  otherBasket: document.getElementById('otherBasket'),
  dogWrap: document.getElementById('dogWrap'),
  ball: document.getElementById('ball'),
  passButton: document.getElementById('passButton'),
  gameHint: document.getElementById('gameHint'),
  feedbackModal: document.getElementById('feedbackModal'),
  feedbackTitle: document.getElementById('feedbackTitle'),
  feedbackMessage: document.getElementById('feedbackMessage'),
  feedbackContinue: document.getElementById('feedbackContinue'),
  measureModal: document.getElementById('measureModal'),
  measureTitle: document.getElementById('measureTitle'),
  measureSubtitle: document.getElementById('measureSubtitle'),
  measureForm: document.getElementById('measureForm'),
  measureItems: document.getElementById('measureItems'),
  measureSubmit: document.getElementById('measureSubmit'),
  finalModal: document.getElementById('finalModal'),
  finalForm: document.getElementById('finalForm'),
  finalItems: document.getElementById('finalItems'),
  finalSubmit: document.getElementById('finalSubmit'),
  completionScreen: document.getElementById('completionScreen'),
  completionSummary: document.getElementById('completionSummary'),
  downloadJson: document.getElementById('downloadJson'),
  downloadCsv: document.getElementById('downloadCsv'),
};

const state = {
  screen: 'intro',
  basketChoice: null,
  ownBasket: null,
  otherBasket: null,
  demoRound: 1,
  round: 1,
  interactionStartedAt: null,
  interactionEndedAt: null,
  sessionId: `bobo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  condition: readConditionFromUrl(),
  rounds: [],
  currentOutcome: null,
  currentMeasureRound: null,
  demoCompletedAt: null,
  responseData: null,
};

function readConditionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const breachType = params.get('type') === 'goal' ? 'goal' : BOBO_CONFIG.defaultBreachType;
  const intensity = params.get('intensity') === 'high' ? 'high' : BOBO_CONFIG.defaultIntensity;
  return { breachType, intensity };
}

function showScreen(screenId) {
  refs.screens.forEach((screen) => screen.classList.toggle('active', screen.id === screenId));
  state.screen = screenId;
}

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function getTreatmentRound() {
  return state.round - BOBO_CONFIG.baselineRounds;
}

function isBreachRound() {
  if (state.round <= BOBO_CONFIG.baselineRounds) return false;
  return BOBO_CONFIG.breachRoundsByIntensity[state.condition.intensity].includes(getTreatmentRound());
}

function getCurrentOutcome() {
  if (!isBreachRound()) return { kind: 'success', message: 'bobo成功接到球，并把球放进了我方篮子里！' };
  if (state.condition.breachType === 'goal') {
    return { kind: 'goalBreach', message: '哎呀！bobo把球丢到别人的篮子里了。' };
  }
  return { kind: 'performanceBreach', message: '哎呀！bobo没有接到球。' };
}

function updateRoundHeader() {
  refs.roundLabel.textContent = `第 ${state.round} / ${BOBO_CONFIG.totalRounds} 轮互动`;
  refs.phaseLabel.textContent = state.round <= BOBO_CONFIG.baselineRounds ? '正常合作阶段' : `正式互动第 ${getTreatmentRound()} / ${BOBO_CONFIG.treatmentRounds} 轮`;
}

function setBasketChoice(color) {
  state.basketChoice = color;
  state.ownBasket = color === 'green' ? refs.ownBasket : refs.otherBasket;
  state.otherBasket = color === 'green' ? refs.otherBasket : refs.ownBasket;
  state.ownBasket.classList.add('target');
  state.otherBasket.classList.remove('target');
  state.ownBasket.dataset.color = color;
  state.otherBasket.dataset.color = color === 'green' ? 'orange' : 'green';
  refs.gameHint.textContent = '每一轮请点击“传球给 Bobo”，观察 Bobo 是否成功完成合作。';
  showScreen('gameScreen');
  updateRoundHeader();
  state.interactionStartedAt = new Date().toISOString();
}

function resetDemoBall() {
  refs.demoBall.classList.remove('hidden');
  refs.demoBall.style.left = '50%';
  refs.demoBall.style.top = 'auto';
  refs.demoBall.style.bottom = '74px';
  refs.demoBall.style.transform = 'translateX(-50%)';
}

function resetBall() {
  refs.ball.classList.remove('hidden');
  refs.ball.style.left = '50%';
  refs.ball.style.top = 'auto';
  refs.ball.style.bottom = '74px';
  refs.ball.style.transform = 'translateX(-50%)';
}

function getCenter(element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

async function moveBallToTarget(ball, stage, element) {
  const stageRect = stage.getBoundingClientRect();
  const ballRect = ball.getBoundingClientRect();
  const targetCenter = getCenter(element);
  const ballWidth = ballRect.width;
  const ballHeight = ballRect.height;
  const targetLeft = targetCenter.x - stageRect.left - ballWidth / 2;
  const targetTop = targetCenter.y - stageRect.top - ballHeight / 2;
  ball.style.transform = 'none';
  ball.style.left = `${ballRect.left - stageRect.left}px`;
  ball.style.top = `${ballRect.top - stageRect.top}px`;
  ball.style.bottom = 'auto';
  await wait(30);
  ball.style.left = `${targetLeft}px`;
  ball.style.top = `${targetTop}px`;
  await wait(760);
}

async function moveBallTo(element) {
  await moveBallToTarget(refs.ball, document.getElementById('gameStage'), element);
}

function setDogMood(mood) {
  setDogMoodOn(refs.dogWrap, mood);
}

function setDogMoodOn(dogWrap, mood) {
  dogWrap.classList.remove('happy', 'catching', 'sad');
  if (mood) {
    void dogWrap.offsetWidth;
    dogWrap.classList.add(mood);
  }
}

async function handleDemoPass() {
  if (refs.demoPassButton.disabled) return;
  refs.demoPassButton.disabled = true;
  const currentDemoRound = state.demoRound;
  refs.demoHint.textContent = `第 ${currentDemoRound} / ${BOBO_CONFIG.demoRounds} 轮：观察 Bobo 接球，并把球放入篮子。`;
  await moveBallToTarget(refs.demoBall, refs.demoStage, refs.demoDogWrap);
  setDogMoodOn(refs.demoDogWrap, 'catching');
  await wait(540);
  await moveBallToTarget(refs.demoBall, refs.demoStage, refs.demoBasket);
  refs.demoBasket.classList.remove('received');
  void refs.demoBasket.offsetWidth;
  refs.demoBasket.classList.add('received');
  setDogMoodOn(refs.demoDogWrap, 'happy');
  refs.demoBall.classList.add('hidden');

  if (state.demoRound < BOBO_CONFIG.demoRounds) {
    state.demoRound += 1;
    await wait(420);
    resetDemoBall();
    setDogMoodOn(refs.demoDogWrap, null);
    refs.demoHint.textContent = `第 ${state.demoRound} / ${BOBO_CONFIG.demoRounds} 轮：请再次点击“传球给 Bobo”。`;
    refs.demoPassButton.disabled = false;
    return;
  }

  state.demoCompletedAt = new Date().toISOString();
  refs.demoHint.textContent = '三轮互动示范完成。接下来请选择一个颜色的篮子，开始正式实验。';
  refs.demoNextButton.classList.add('show');
}

async function playSuccess() {
  await moveBallTo(refs.dogWrap);
  setDogMood('catching');
  await wait(540);
  await moveBallTo(state.ownBasket);
  state.ownBasket.classList.remove('received');
  void state.ownBasket.offsetWidth;
  state.ownBasket.classList.add('received');
  setDogMood('happy');
  refs.ball.classList.add('hidden');
}

async function playPerformanceBreach() {
  await moveBallTo(refs.dogWrap);
  setDogMood('sad');
  await wait(520);
  refs.ball.classList.add('hidden');
}

async function playGoalBreach() {
  await moveBallTo(refs.dogWrap);
  setDogMood('catching');
  await wait(500);
  await moveBallTo(state.otherBasket);
  state.otherBasket.classList.remove('received');
  void state.otherBasket.offsetWidth;
  state.otherBasket.classList.add('received');
  setDogMood('sad');
  refs.ball.classList.add('hidden');
}

function renderScaleItems(items, prefix) {
  return items.map((item) => `
    <fieldset class="measure-item">
      <legend>${item.label}</legend>
      <div class="likert-row">
        ${[1, 2, 3, 4, 5, 6, 7].map((value) => `
          <span class="likert-option">
            <input id="${prefix}-${item.key}-${value}" type="radio" name="${prefix}-${item.key}" value="${value}" required>
            <label for="${prefix}-${item.key}-${value}">${value}</label>
          </span>
        `).join('')}
      </div>
      <div class="likert-anchors"><span>1 = ${item.low}</span><span>7 = ${item.high}</span></div>
    </fieldset>
  `).join('');
}

function collectScaleValues(form, items, prefix) {
  return Object.fromEntries(items.map((item) => {
    const selected = form.querySelector(`input[name="${prefix}-${item.key}"]:checked`);
    return [item.key, selected ? Number(selected.value) : null];
  }));
}

function openRoundMeasure(outcome) {
  state.currentMeasureRound = state.round;
  refs.measureTitle.textContent = `第 ${state.round} 轮互动后的评价`;
  refs.measureSubtitle.textContent = outcome.message;
  refs.measureItems.innerHTML = renderScaleItems(BOBO_CONFIG.perRoundMeasures, 'round');
  refs.measureModal.classList.remove('hidden');
  refs.measureSubmit.focus();
}

function closeRoundMeasure() {
  refs.measureModal.classList.add('hidden');
  refs.measureForm.reset();
}

function openFeedback(outcome) {
  refs.feedbackTitle.textContent = `第 ${state.round} 轮互动结果`;
  refs.feedbackMessage.textContent = outcome.message;
  refs.feedbackModal.classList.remove('hidden');
  refs.feedbackContinue.focus();
}

function continueToRoundMeasure() {
  refs.feedbackModal.classList.add('hidden');
  openRoundMeasure(state.currentOutcome);
}

function openFinalMeasure() {
  refs.finalItems.innerHTML = renderScaleItems(BOBO_CONFIG.finalMeasures, 'final');
  refs.finalModal.classList.remove('hidden');
  refs.finalSubmit.focus();
}

function closeFinalMeasure() {
  refs.finalModal.classList.add('hidden');
  refs.finalForm.reset();
}

function getRoundRecord(outcome) {
  return {
    globalRound: state.round,
    phase: state.round <= BOBO_CONFIG.baselineRounds ? 'baseline' : 'treatment',
    treatmentRound: state.round <= BOBO_CONFIG.baselineRounds ? null : getTreatmentRound(),
    plannedBreach: isBreachRound(),
    conditionType: state.condition.breachType,
    conditionIntensity: state.condition.intensity,
    expectedOutcome: outcome.kind,
    breachType: outcome.kind === 'success' ? null : state.condition.breachType,
    intensity: outcome.kind === 'success' ? null : state.condition.intensity,
    actionAt: new Date().toISOString(),
    responseAt: null,
    responseDelayMs: null,
    measures: null,
  };
}

async function handlePass() {
  if (state.screen !== 'gameScreen' || refs.passButton.disabled) return;
  refs.passButton.disabled = true;
  refs.gameHint.textContent = '传球中，请观察 Bobo 的接球和放球动作。';
  const outcome = getCurrentOutcome();
  const roundRecord = getRoundRecord(outcome);
  state.currentOutcome = outcome;
  const responseStartedAt = performance.now();
  if (outcome.kind === 'success') await playSuccess();
  if (outcome.kind === 'performanceBreach') await playPerformanceBreach();
  if (outcome.kind === 'goalBreach') await playGoalBreach();
  roundRecord.responseAt = new Date().toISOString();
  roundRecord.responseDelayMs = Math.round(performance.now() - responseStartedAt);
  state.rounds.push(roundRecord);
  refs.gameHint.textContent = '互动结果已显示，请点击“继续评价”。';
  openFeedback(outcome);
}

function finishRoundMeasure(event) {
  event.preventDefault();
  const latestRound = state.rounds[state.rounds.length - 1];
  latestRound.measures = collectScaleValues(refs.measureForm, BOBO_CONFIG.perRoundMeasures, 'round');
  closeRoundMeasure();
  if (state.round >= BOBO_CONFIG.totalRounds) {
    openFinalMeasure();
    return;
  }
  state.round += 1;
  resetBall();
  setDogMood(null);
  refs.passButton.disabled = false;
  updateRoundHeader();
  refs.gameHint.textContent = '请点击“传球给 Bobo”，开始这一轮互动。';
}

function buildFinalResponse() {
  const finalMeasures = collectScaleValues(refs.finalForm, BOBO_CONFIG.finalMeasures, 'final');
  const formData = new FormData(refs.finalForm);
  return {
    sessionId: state.sessionId,
    study: 'bobo-passing-trust-violation',
    condition: state.condition,
    basketChoice: state.basketChoice,
    startedAt: state.interactionStartedAt,
    demoCompletedAt: state.demoCompletedAt,
    completedAt: new Date().toISOString(),
    rounds: state.rounds,
    finalMeasures,
    controls: {
      age: formData.get('age') || null,
      gender: formData.get('gender') || null,
      aiExperience: formData.get('aiExperience') || null,
      petExperience: formData.get('petExperience') || null,
      gameDifficulty: formData.get('gameDifficulty') || null,
      attentionCheck: formData.get('attentionCheck') || null,
    },
    userAgent: navigator.userAgent,
  };
}

function saveResponse(response) {
  const saved = JSON.parse(localStorage.getItem(BOBO_CONFIG.storageKey) || '[]');
  saved.push(response);
  localStorage.setItem(BOBO_CONFIG.storageKey, JSON.stringify(saved));
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJson() {
  if (!state.responseData) return;
  downloadFile(`${state.responseData.sessionId}.json`, JSON.stringify(state.responseData, null, 2), 'application/json');
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv() {
  if (!state.responseData) return;
  const headers = [
    'sessionId', 'conditionType', 'conditionIntensity', 'basketChoice', 'globalRound', 'phase',
    'treatmentRound', 'plannedBreach', 'conditionType', 'conditionIntensity', 'outcome', 'breachType', 'roundIntensity', 'actionAt', 'responseAt',
    'responseDelayMs', ...BOBO_CONFIG.perRoundMeasures.map((item) => `round_${item.key}`),
  ];
  const rows = state.responseData.rounds.map((roundRecord) => [
    state.responseData.sessionId,
    state.responseData.condition.breachType,
    state.responseData.condition.intensity,
    state.responseData.basketChoice,
    roundRecord.globalRound,
    roundRecord.phase,
    roundRecord.treatmentRound,
    roundRecord.plannedBreach,
    roundRecord.conditionType,
    roundRecord.conditionIntensity,
    roundRecord.expectedOutcome,
    roundRecord.breachType,
    roundRecord.intensity,
    roundRecord.actionAt,
    roundRecord.responseAt,
    roundRecord.responseDelayMs,
    ...BOBO_CONFIG.perRoundMeasures.map((item) => roundRecord.measures[item.key]),
  ]);
  downloadFile(`${state.responseData.sessionId}.csv`, [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8');
}

function finishExperiment(event) {
  event.preventDefault();
  state.responseData = buildFinalResponse();
  saveResponse(state.responseData);
  closeFinalMeasure();
  showScreen('completionScreen');
  refs.completionSummary.textContent = `本次实验数据已保存到当前浏览器。本次包含 ${state.responseData.rounds.length} 轮互动记录。`;
}

if (refs.demoDogWrap && refs.dogWrap) refs.demoDogWrap.innerHTML = refs.dogWrap.innerHTML;
refs.introStart.addEventListener('click', () => {
  state.demoRound = 1;
  resetDemoBall();
  setDogMoodOn(refs.demoDogWrap, null);
  refs.demoPassButton.disabled = false;
  refs.demoNextButton.classList.remove('show');
  refs.demoHint.textContent = `第 1 / ${BOBO_CONFIG.demoRounds} 轮：请点击“传球给 Bobo”，观察 Bobo 如何接球并把球放入篮子。`;
  showScreen('demoScreen');
});
refs.demoPassButton.addEventListener('click', handleDemoPass);
refs.demoNextButton.addEventListener('click', () => showScreen('gameIntroScreen'));
refs.gameIntroStart.addEventListener('click', () => showScreen('basketScreen'));
refs.greenChoice.addEventListener('click', () => setBasketChoice('green'));
refs.orangeChoice.addEventListener('click', () => setBasketChoice('orange'));
refs.passButton.addEventListener('click', handlePass);
refs.feedbackContinue.addEventListener('click', continueToRoundMeasure);
refs.measureForm.addEventListener('submit', finishRoundMeasure);
refs.finalForm.addEventListener('submit', finishExperiment);
refs.downloadJson.addEventListener('click', downloadJson);
refs.downloadCsv.addEventListener('click', downloadCsv);

window.BoboPassingExperiment = {
  CONFIG: BOBO_CONFIG,
  state,
  downloadJson,
  downloadCsv,
};

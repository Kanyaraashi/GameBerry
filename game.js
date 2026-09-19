/* ========== WANO FARM — Game Logic ========== */

const state = {
  coins: 2845,
  energy: 5,
  maxEnergy: 5,
  level: 12,
  xp: 0,
  inventory: {
    tomato: 3,
    wheat: 2,
    carrot: 2
  },
  currentTool: null,
  plots: Array(12).fill(null).map(() => ({
    crop: null,      // 'tomato' | 'wheat' | 'carrot' | null
    stage: 0,        // 0 empty, 1 planted, 2 watered, 3 ready
    timer: null
  })),
  hasBetterCan: false,
  farmer: {
    x: 8, y: 72, targetX: 8, targetY: 72, facing: 1,
    moving: false, action: null, actionTimer: null, onArrive: null
  }
};

const CROP_DATA = {
  tomato: { emoji: '🍅', growTime: 12000, sell: 80, name: 'Tomato' },
  wheat:  { emoji: '🌾', growTime: 9000,  sell: 60, name: 'Wheat' },
  carrot: { emoji: '🥕', growTime: 10000, sell: 55, name: 'Carrot' }
};

const STAGES = ['', '🌱', '🌿', '✨']; // empty, planted, watered, ready visual
const ENERGY_REGEN_MS = 5000;
let nextEnergyAt = Date.now() + ENERGY_REGEN_MS;
function xpToNextLevel(level) { return 100 + (level - 1) * 50; }

// ---------- DOM helpers ----------
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return document.querySelectorAll(sel); }

function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function updateUI() {
  $('#coin-count').textContent = state.coins;
  $('#farm-coins').textContent = state.coins;
  $('#shop-coins').textContent = state.coins;
  $('#energy-count').textContent = state.energy;
  $('#farm-energy').textContent = state.energy;
  $('#level-count').textContent = state.level;
  const nextXp = xpToNextLevel(state.level);
  $('#farm-level-label').textContent = state.level;
  $('#xp-label').textContent = `${state.xp} / ${nextXp} XP`;
  $('#xp-fill').style.width = `${Math.min(100, (state.xp / nextXp) * 100)}%`;
  const energyPercent = (state.energy / state.maxEnergy) * 100;
  $('#energy-meter-fill').style.width = `${energyPercent}%`;
  const rechargeText = $('#energy-recharge-text');
  if (state.energy >= state.maxEnergy) {
    rechargeText.textContent = 'Full';
    $('#energy-recharge-fill').style.width = '100%';
  } else {
    const remaining = Math.max(0, nextEnergyAt - Date.now());
    const progress = Math.min(100, ((ENERGY_REGEN_MS - remaining) / ENERGY_REGEN_MS) * 100);
    $('#energy-recharge-fill').style.width = `${progress}%`;
    rechargeText.textContent = `+1 in ${Math.ceil(remaining / 1000)}s`;
  }
  const status = $('#energy-status');
  const statusText = $('#energy-status-text');
  status.classList.toggle('warning', state.energy <= 1);
  status.classList.toggle('empty', state.energy === 0);
  statusText.textContent = state.energy === 0
    ? 'Not enough energy — wait for it to recharge'
    : state.energy <= 1 ? 'Low energy — move carefully' : 'Energy ready';
}

// ---------- Screen navigation ----------
function showScreen(id) {
  $all('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  updateUI();
  if (id === 'farm') updateFarmerPosition();
}

$all('[data-screen]').forEach(btn => {
  btn.addEventListener('click', () => {
    const screen = btn.dataset.screen;
    showScreen(screen);
    if (screen === 'farm') renderPlots();
  });
});

// ---------- Farm plots ----------
function renderPlots() {
  const grid = $('#plot-grid');
  grid.innerHTML = '';

  state.plots.forEach((plot, i) => {
    const div = document.createElement('div');
    div.className = 'plot';
    if (!plot.crop) div.classList.add('empty');
    else if (plot.stage === 1) div.classList.add('planted');
    else if (plot.stage === 2) div.classList.add('watered');
    else if (plot.stage === 3) div.classList.add('ready');

    let emoji = '🟫';
    if (plot.crop && plot.stage === 1) emoji = '🌱';
    else if (plot.crop && plot.stage === 2) emoji = '🌿';
    else if (plot.crop && plot.stage === 3) emoji = CROP_DATA[plot.crop].emoji;

    div.innerHTML = `
      <span>${emoji}</span>
      ${plot.crop && plot.stage > 0 ? `<span class="plot-label">${CROP_DATA[plot.crop].name}</span>` : ''}
    `;

    div.addEventListener('click', () => handlePlotClick(i));
    grid.appendChild(div);
  });
}

function updateFarmerPosition() {
  const farmer = $('#farm-sprout');
  if (!farmer) return;
  farmer.style.left = `${state.farmer.x}%`;
  farmer.style.top = `${state.farmer.y}%`;
  farmer.classList.toggle('walking', state.farmer.moving);
  farmer.classList.toggle('face-left', state.farmer.facing < 0);
  farmer.classList.toggle('busy', Boolean(state.farmer.action));
  farmer.dataset.action = state.farmer.action || '';
}

function moveFarmer(dx, dy) {
  if (!$('#farm').classList.contains('active')) return;
  setFarmerTarget(
    Math.max(4, Math.min(96, state.farmer.targetX + dx)),
    Math.max(10, Math.min(88, state.farmer.targetY + dy))
  );
}

function setFarmerTarget(x, y, callback) {
  if (state.farmer.action) return;
  state.farmer.targetX = x;
  state.farmer.targetY = y;
  state.farmer.moving = true;
  if (x !== state.farmer.x) state.farmer.facing = x > state.farmer.x ? 1 : -1;
  state.farmer.onArrive = callback;
}

function getPlotTarget(index) {
  const playArea = $('#farm-play-area');
  const plot = $('#plot-grid')?.children[index];
  if (!playArea || !plot) return null;

  const areaRect = playArea.getBoundingClientRect();
  const plotRect = plot.getBoundingClientRect();
  return {
    x: ((plotRect.left + plotRect.width / 2 - areaRect.left) / areaRect.width) * 100,
    y: ((plotRect.top + plotRect.height / 2 - areaRect.top) / areaRect.height) * 100
  };
}

function animateFarmer(timestamp) {
  const farmer = state.farmer;
  const distance = Math.hypot(farmer.targetX - farmer.x, farmer.targetY - farmer.y);
  if (distance > 0.08) {
    // Time-based interpolation remains smooth on high-refresh displays.
    const step = Math.min(1, (timestamp - (farmer.lastFrame || timestamp)) / 1000 * 24);
    farmer.x += (farmer.targetX - farmer.x) * step;
    farmer.y += (farmer.targetY - farmer.y) * step;
    farmer.moving = true;
  } else if (farmer.moving) {
    farmer.x = farmer.targetX;
    farmer.y = farmer.targetY;
    farmer.moving = false;
    const callback = farmer.onArrive;
    farmer.onArrive = null;
    if (callback) callback();
  }
  farmer.lastFrame = timestamp;
  updateFarmerPosition();
  requestAnimationFrame(animateFarmer);
}

function harvestNearby() {
  const readyPlots = [...document.querySelectorAll('.plot.ready')];
  if (!readyPlots.length) {
    showToast('No crops are ready yet!');
    return;
  }

  const nearest = readyPlots
    .map((plot) => {
      const index = [...plot.parentElement.children].indexOf(plot);
      const target = getPlotTarget(index);
      return target ? {
        index,
        x: target.x,
        y: target.y
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const distanceA = Math.hypot(a.x - state.farmer.x, a.y - state.farmer.y);
      const distanceB = Math.hypot(b.x - state.farmer.x, b.y - state.farmer.y);
      return distanceA - distanceB;
    })[0];
  if (nearest && state.plots[nearest.index]?.stage === 3) {
    walkToPlot(nearest.index, 'harvest');
  }
}

function handlePlotClick(index) {
  const tool = state.currentTool;
  if (!tool) {
    showToast('Select a tool first!');
    return;
  }
  walkToPlot(index, tool);
}

function walkToPlot(index, tool) {
  const target = getPlotTarget(index);
  if (!target) return;
  setFarmerTarget(target.x, target.y, () => performPlotAction(index, tool));
}

function performPlotAction(index, tool) {
  const plot = state.plots[index];

  if (tool === 'plant') {
    if (plot.crop) {
      showToast('Plot already has a crop!');
      return;
    }
    // Pick first available seed
    const seed = Object.keys(state.inventory).find(k => state.inventory[k] > 0);
    if (!seed) {
      showToast('No seeds left! Buy some in the Shop.');
      return;
    }
    if (state.energy < 1) {
      showEnergyWarning();
      return;
    }

    animateAction('plant', 900, () => {
      state.inventory[seed]--;
      state.energy--;
      plot.crop = seed;
      plot.stage = 1;
      gainXP(8);
      showToast(`Luffy planted ${CROP_DATA[seed].name}! 🌱`);
      updateUI();
      renderPlots();
    });
  }

  else if (tool === 'water') {
    if (!plot.crop) {
      showToast('Nothing to water!');
      return;
    }
    if (plot.stage !== 1) {
      showToast(plot.stage === 2 ? 'Already watered!' : 'Crop is ready!');
      return;
    }
    if (state.energy < 1) {
      showEnergyWarning();
      return;
    }

    animateAction('water', 1200, () => {
      state.energy--;
      plot.stage = 2;
      gainXP(12);
      showToast('Luffy watered the crop! 💧');
      const growTime = state.hasBetterCan
        ? CROP_DATA[plot.crop].growTime * 0.7
        : CROP_DATA[plot.crop].growTime;
      clearTimeout(plot.timer);
      plot.timer = setTimeout(() => {
        plot.stage = 3;
        showToast(`${CROP_DATA[plot.crop].name} is ready to harvest! ✨`);
        renderPlots();
      }, growTime);
      updateUI();
      renderPlots();
    });
  }

  else if (tool === 'harvest') {
    if (!plot.crop || plot.stage !== 3) {
      showToast('Nothing ready to harvest!');
      return;
    }

    animateAction('harvest', 1050, () => {
      const reward = CROP_DATA[plot.crop].sell;
      state.coins += reward;
      gainXP(25);
      showToast(`Luffy harvested ${CROP_DATA[plot.crop].name}! +${reward} 🪙`);
      clearTimeout(plot.timer);
      plot.crop = null;
      plot.stage = 0;
      plot.timer = null;
      updateUI();
      renderPlots();
    });
  }

}

function gainXP(amount) {
  state.xp += amount;
  while (state.xp >= xpToNextLevel(state.level)) {
    state.xp -= xpToNextLevel(state.level);
    state.level++;
    const levelReward = 100 + state.level * 10;
    state.coins += levelReward;
    if (state.level % 3 === 0) state.maxEnergy++;
    const rewardSeed = ['tomato', 'wheat', 'carrot'][(state.level - 1) % 3];
    state.inventory[rewardSeed] = (state.inventory[rewardSeed] || 0) + 2;
    showToast(`Rank up! Farm level ${state.level} • +${levelReward} coins ⭐`);
  }
  updateUI();
}

function showEnergyWarning() {
  const status = $('#energy-status');
  status.classList.add('warning', 'flash');
  showToast('Not enough energy! ❤️');
  setTimeout(() => status.classList.remove('flash'), 700);
}

function animateAction(action, duration, callback) {
  if (state.farmer.action) return;
  state.farmer.action = action;
  updateFarmerPosition();
  clearTimeout(state.farmer.actionTimer);
  state.farmer.actionTimer = setTimeout(() => {
    state.farmer.action = null;
    callback();
    updateFarmerPosition();
  }, duration);
}

document.addEventListener('keydown', (event) => {
  const moves = {
    ArrowUp: [0, -5], w: [0, -5], W: [0, -5],
    ArrowDown: [0, 5], s: [0, 5], S: [0, 5],
    ArrowLeft: [-5, 0], a: [-5, 0], A: [-5, 0],
    ArrowRight: [5, 0], d: [5, 0], D: [5, 0]
  };
  if (moves[event.key]) {
    event.preventDefault();
    moveFarmer(...moves[event.key]);
  } else if (event.key === ' ' || event.key === 'e' || event.key === 'E') {
    event.preventDefault();
    harvestNearby();
  }
});

$all('[data-move]').forEach((button) => {
  button.addEventListener('click', () => {
    const moves = { up: [0, -5], down: [0, 5], left: [-5, 0], right: [5, 0] };
    moveFarmer(...moves[button.dataset.move]);
  });
});

$('#nearby-harvest').addEventListener('click', harvestNearby);

// Tool selection
$all('.action-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $all('.action-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentTool = btn.dataset.tool;
    const playArea = $('#farm-play-area');
    playArea.classList.toggle('harvest-mode', state.currentTool === 'harvest');
    $('#field-mode-label').textContent = state.currentTool === 'harvest'
      ? 'HARVEST WINDOW'
      : state.currentTool === 'water' ? 'IRRIGATION' : 'FIELD READY';

    const msgs = {
      plant: 'Tap an empty plot to plant a seed!',
      water: 'Tap a planted plot to water it!',
      harvest: 'Select a marked crop, then move in to make the cut.'
    };
    $('#tool-info').textContent = msgs[state.currentTool];
  });
});

// ---------- Shop ----------
$all('.buy-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const item = e.target.closest('.shop-item');
    const type = item.dataset.item;
    const price = parseInt(item.dataset.price, 10);

    if (state.coins < price) {
      showToast('Not enough coins!');
      return;
    }

    state.coins -= price;

    if (type === 'can') {
      state.hasBetterCan = true;
      e.target.disabled = true;
      e.target.textContent = 'Owned';
      showToast('Better Watering Can bought! Crops grow faster 🪴');
    } else {
      state.inventory[type] = (state.inventory[type] || 0) + 3;
      showToast(`Bought 3 ${CROP_DATA[type].name} seeds!`);
    }

    updateUI();
  });
});

// ---------- Settings ----------
$('#reset-progress').addEventListener('click', () => {
  if (confirm('Reset all progress? This cannot be undone.')) {
    state.coins = 500;
    state.energy = 5;
    state.maxEnergy = 5;
    state.level = 1;
    state.xp = 0;
    state.inventory = { tomato: 2, wheat: 2, carrot: 1 };
    state.hasBetterCan = false;
    nextEnergyAt = Date.now() + ENERGY_REGEN_MS;
    state.farmer = {
      x: 8, y: 72, targetX: 8, targetY: 72, facing: 1,
      moving: false, action: null, actionTimer: null, onArrive: null
    };
    state.plots.forEach(p => {
      clearTimeout(p.timer);
      p.crop = null;
      p.stage = 0;
      p.timer = null;
    });
    showToast('Progress reset!');
    updateUI();
    showScreen('lobby');
  }
});

// Fast, visible energy regeneration with a continuously updating storage bar.
setInterval(() => {
  if (state.energy < state.maxEnergy && Date.now() >= nextEnergyAt) {
    state.energy++;
    nextEnergyAt = Date.now() + ENERGY_REGEN_MS;
    if (document.getElementById('farm').classList.contains('active')) {
      showToast('Energy restored! ❤️');
    }
  }
  if (state.energy >= state.maxEnergy) nextEnergyAt = Date.now() + ENERGY_REGEN_MS;
  updateUI();
}, 250);

// Speech bubble rotation
const speeches = [
  "Welcome to Wano Farm, Luffy! Ready to grow?",
  "The Wano fields are looking beautiful today!",
  "Don't forget to water your crops!",
  "Harvest time is the best time!",
  "New seeds are waiting in the farm shop!",
  "You're doing great, Luffy!"
];
let speechIdx = 0;
setInterval(() => {
  speechIdx = (speechIdx + 1) % speeches.length;
  const bubble = $('#speech');
  if (bubble) {
    bubble.style.opacity = 0;
    setTimeout(() => {
      bubble.textContent = speeches[speechIdx];
      bubble.style.opacity = 1;
    }, 300);
  }
}, 8000);

// Init
updateUI();
renderPlots();
updateFarmerPosition();
requestAnimationFrame(animateFarmer);
console.log('Wano Farm loaded! 🌱');

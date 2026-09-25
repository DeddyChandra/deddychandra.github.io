import {
  FilesetResolver,
  HandLandmarker,
  FaceLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

// ---------------------------------------------------------------------------
// Catalogue: fictional brands & types
// ---------------------------------------------------------------------------
const BRANDS = [
  { name: "Marlbrook", tagline: "Come to where the flavour is.", color: "#e63946" },
  { name: "Camelot", tagline: "A pleasure worth walking a mile for.", color: "#d4a373" },
  { name: "Lucky Stroke", tagline: "It's toasted.", color: "#2a9d8f" },
  { name: "Dji Sam Su", tagline: "Kretek asli, rasa sejati.", color: "#b5838d" },
  { name: "Sampoerno", tagline: "Gaya hidup, cita rasa.", color: "#e9c46a" },
  { name: "Gudang Emas", tagline: "Pria punya selera.", color: "#f4a261" },
  { name: "Winstone", tagline: "Tastes good like it should.", color: "#e76f51" },
  { name: "Dunhall", tagline: "Quietly exceptional.", color: "#8d99ae" },
  { name: "Pall Mell", tagline: "Wherever particular people congregate.", color: "#a8dadc" },
  { name: "Benson & Hodges", tagline: "Turn to gold.", color: "#ffd166" },
  { name: "Kents", tagline: "The taste of a fresh idea.", color: "#06d6a0" },
  { name: "Gitanes Bleu", tagline: "Liberté, égalité, fumée.", color: "#4361ee" },
];

const TYPES = [
  { name: "Regular", burn: 1.0, length: 1.0, filter: "cork", filterLabel: "Cork", paper: "#f6f1e7", smoke: "220,220,230", label: "Standard burn" },
  { name: "Light", burn: 0.85, length: 1.0, filter: "white", filterLabel: "White", paper: "#f9f7f2", smoke: "230,230,240", label: "Mellow" },
  { name: "Menthol", burn: 0.9, length: 1.0, filter: "green", filterLabel: "Menthol", paper: "#f2f7f4", smoke: "190,240,235", label: "Cool" },
  { name: "Slim", burn: 1.25, length: 1.15, filter: "white", filterLabel: "Slim", paper: "#fbfaf7", smoke: "225,225,235", label: "Fast" },
  { name: "Kretek", burn: 0.7, length: 0.95, filter: "cork", filterLabel: "Cork", paper: "#f0e6d3", smoke: "235,215,190", label: "Slow, crackling" },
  { name: "100s", burn: 0.8, length: 1.3, filter: "cork", filterLabel: "Cork", paper: "#f6f1e7", smoke: "220,220,230", label: "Long" },
  { name: "Filterless", burn: 1.3, length: 0.85, filter: "none", filterLabel: "None", paper: "#f4eee2", smoke: "210,210,220", label: "Harsh" },
  { name: "Ultra Light", burn: 0.75, length: 1.0, filter: "white", filterLabel: "White", paper: "#fbfaf7", smoke: "235,235,245", label: "Very mellow" },
];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const video = $("video");
const canvas = $("canvas");
const ctx = canvas.getContext("2d");
const ui = {
  overlay: $("overlay-start"), startBtn: $("btn-start"), startError: $("start-error"),
  status: $("status"), statusText: $("status-text"), toast: $("toast"),
  packCard: $("pack-card"), packBrand: $("pack-brand"), packType: $("pack-type"), packTagline: $("pack-tagline"),
  packLength: $("pack-length"), packFilter: $("pack-filter"), packBurn: $("pack-burn"),
  burnFill: $("burn-fill"), burnPct: $("burn-pct"),
  statPuffs: $("stat-puffs"), statSmoked: $("stat-smoked"), statFps: $("stat-fps"),
  hintHold: $("hint-hold"), hintLight: $("hint-light"), hintPuff: $("hint-puff"), hintFlick: $("hint-flick"),
  history: $("history"),
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  handLandmarker: null, faceLandmarker: null, running: false,
  lastVideoTime: -1, lastFrame: performance.now(), fpsSmooth: 0,
  hand: null, // { pinch:{x,y}, palm:{x,y}, scale, isPinching, vel:{x,y} }
  lighter: null, // { x, y, scale } thumb tip of the lighter hand
  lightProgress: 0,
  mouth: null, // { x, y, r }
  cig: null, // current cigarette
  particles: [],
  exhaleUntil: 0,
  puffs: 0, smoked: 0,
  history: [],
  toastTimer: null,
  prevPinch: null, prevT: 0,
};

const CIG = { IDLE: "idle", HOLDING: "holding", PUFFING: "puffing", FINISHED: "finished", THROWN: "thrown" };

function newCigarette() {
  const prev = state.cig;
  let brand = rnd(BRANDS), type = rnd(TYPES);
  while (prev && brand === prev.brand) brand = rnd(BRANDS);
  while (prev && type === prev.type) type = rnd(TYPES);
  state.cig = {
    brand, type, burn: 0, lit: false, phase: CIG.IDLE,
    pos: null, angle: 0, len: 0, thrown: null, spawnedAt: performance.now(),
    ash: 0, releasedAt: 0,
  };
  renderPack();
  showToast(`Fresh smoke: <b>${brand.name}</b> · ${type.name}`);
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function renderPack() {
  const { brand, type } = state.cig;
  ui.packCard.style.setProperty("--pack-color", brand.color);
  ui.packBrand.textContent = brand.name;
  ui.packType.textContent = type.name;
  ui.packTagline.textContent = brand.tagline;
  ui.packLength.textContent = type.length >= 1.25 ? "King 100s" : type.length >= 1.1 ? "Long" : type.length < 0.9 ? "Short" : "Regular";
  ui.packFilter.textContent = type.filterLabel;
  ui.packBurn.textContent = type.label;
  renderBurn();
}
function renderBurn() {
  const remaining = Math.max(0, 1 - state.cig.burn);
  ui.burnFill.style.width = `${remaining * 100}%`;
  ui.burnPct.textContent = `${Math.round(remaining * 100)}%`;
}
function setStatus(stateName, text) {
  ui.status.dataset.state = stateName;
  ui.statusText.textContent = text;
  const unlit = state.cig && !state.cig.lit && stateName === "holding";
  ui.hintHold.classList.toggle("active", stateName === "idle" && state.running);
  ui.hintLight.classList.toggle("active", unlit);
  ui.hintPuff.classList.toggle("active", (stateName === "holding" && !unlit) || stateName === "puffing");
  ui.hintFlick.classList.toggle("active", stateName === "done");
}
function showToast(html, ms = 2600) {
  ui.toast.innerHTML = html;
  ui.toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => ui.toast.classList.remove("show"), ms);
}
function pushHistory(cig, puffs, tossedEarly = false) {
  state.history.unshift({ label: `${cig.brand.name} ${cig.type.name}`, puffs, tossedEarly });
  state.history = state.history.slice(0, 8);
  ui.history.innerHTML = state.history
    .map((h) => `<li>${h.label}<span>${h.puffs} puff${h.puffs === 1 ? "" : "s"}${h.tossedEarly ? " · tossed" : ""}</span></li>`)
    .join("");
}

// ---------------------------------------------------------------------------
// Model + camera setup
// ---------------------------------------------------------------------------
async function loadModels() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  const [hand, face] = await Promise.all([
    HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO", numHands: 2,
      minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.5,
    }),
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO", numFaces: 1,
    }),
  ]);
  state.handLandmarker = hand;
  state.faceLandmarker = face;
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await new Promise((res) => (video.onloadedmetadata = res));
  await video.play();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);

// Map normalized landmark → canvas px, mirrored and object-fit: cover aware
function project(lm) {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
  const scale = Math.max(W / vw, H / vh);
  const dw = vw * scale, dh = vh * scale;
  const ox = (W - dw) / 2, oy = (H - dh) / 2;
  return { x: W - (ox + lm.x * dw), y: oy + lm.y * dh };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------
const DEMO = new URLSearchParams(location.search).has("demo");
const demo = { x: 0, y: 0, down: false };
if (DEMO) {
  canvas.addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); demo.x = e.clientX - r.left; demo.y = e.clientY - r.top; });
  canvas.addEventListener("pointerdown", () => (demo.down = true));
  window.addEventListener("pointerup", () => (demo.down = false));
  window.addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "l") demo.lighter = true; });
  window.addEventListener("keyup", (e) => { if (e.key.toLowerCase() === "l") demo.lighter = false; });
}

function updateTrackingDemo(now) {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const pinch = { x: demo.x, y: demo.y };
  let vel = { x: 0, y: 0 };
  if (state.prevPinch) {
    const dt = Math.max((now - state.prevT) / 1000, 1e-3);
    vel = { x: (pinch.x - state.prevPinch.x) / dt, y: (pinch.y - state.prevPinch.y) / dt };
  }
  state.prevPinch = pinch; state.prevT = now;
  const scale = 90;
  const palm = { x: pinch.x + 40, y: pinch.y + 90 };
  state.hand = { pinch, palm, scale, isPinching: demo.down, vel, landmarks: Object.assign(Array(21).fill(pinch), { 4: { x: pinch.x - 8, y: pinch.y }, 8: { x: pinch.x + 8, y: pinch.y } }) };
  state.mouth = { x: W / 2, y: H * 0.42, r: 34 };
  state.lighter = demo.lighter ? { x: W * 0.75, y: H * 0.7, scale: 90 } : null;
}

function analyzeHand(L) {
  const wrist = L[0], midMcp = L[9], thumbTip = L[4], indexTip = L[8], middleTip = L[12];
  const scale = dist(wrist, midMcp);
  const pinchD = dist(thumbTip, indexTip);
  const scissorsD = dist(indexTip, middleTip);
  const isPinching = pinchD < scale * 0.45 || scissorsD < scale * 0.3;
  const pinch = isPinching && pinchD <= scissorsD
    ? { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 }
    : { x: (indexTip.x + middleTip.x) / 2, y: (indexTip.y + middleTip.y) / 2 };
  // Lighter: index/middle/ring/pinky curled (tip closer to wrist than the PIP joint), thumb extended
  const curled = [[8, 6], [12, 10], [16, 14], [20, 18]].every(([tip, pip]) => dist(L[tip], wrist) < dist(L[pip], wrist) * 1.05);
  const thumbOut = dist(thumbTip, L[5]) > scale * 0.55 && dist(thumbTip, wrist) > dist(L[3], wrist);
  const isLighter = curled && thumbOut && !isPinching;
  return { pinch, palm: midMcp, scale, isPinching, isLighter, thumbTip, landmarks: L };
}

function updateTracking(now) {
  if (DEMO) return updateTrackingDemo(now);
  if (video.currentTime === state.lastVideoTime) return;
  state.lastVideoTime = video.currentTime;

  const hr = state.handLandmarker.detectForVideo(video, now);
  const fr = state.faceLandmarker.detectForVideo(video, now);

  // Hands: one holds the cigarette (pinch), the other may act as a lighter (fist + thumb up)
  const hands = (hr.landmarks || []).map((lm) => analyzeHand(lm.map(project)));
  hands.sort((a, b) => (b.isPinching - a.isPinching) || (a.isLighter - b.isLighter));
  const holder = hands[0] || null;
  const lighterHand = hands.find((h) => h !== holder && h.isLighter) || null;

  if (holder) {
    let vel = { x: 0, y: 0 };
    if (state.prevPinch) {
      const dt = Math.max((now - state.prevT) / 1000, 1e-3);
      vel = { x: (holder.pinch.x - state.prevPinch.x) / dt, y: (holder.pinch.y - state.prevPinch.y) / dt };
    }
    state.prevPinch = holder.pinch; state.prevT = now;
    state.hand = { ...holder, vel };
  } else {
    state.hand = null; state.prevPinch = null;
  }
  state.lighter = lighterHand ? { x: lighterHand.thumbTip.x, y: lighterHand.thumbTip.y, scale: lighterHand.scale } : null;

  // Mouth
  if (fr.faceLandmarks && fr.faceLandmarks.length) {
    const F = fr.faceLandmarks[0];
    const upper = project(F[13]), lower = project(F[14]);
    const left = project(F[61]), right = project(F[291]);
    state.mouth = { x: (upper.x + lower.x) / 2, y: (upper.y + lower.y) / 2, r: dist(left, right) / 2 };
  } else {
    state.mouth = null;
  }
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------
function updateCigarette(dt, now) {
  const cig = state.cig;
  const hand = state.hand, mouth = state.mouth;

  if (cig.phase === CIG.THROWN) {
    const t = cig.thrown;
    t.vx *= 0.995; t.vy += 1800 * dt;
    t.x += t.vx * dt; t.y += t.vy * dt; t.rot += t.vr * dt;
    if (now - t.at > 1400 || t.y > canvas.clientHeight + 100) newCigarette();
    return;
  }

  if (hand && hand.isPinching) cig.releasedAt = 0;
  else if (cig.pos && !cig.releasedAt) cig.releasedAt = now;
  const thrown = detectThrow(now);

  if (!hand || !hand.isPinching) {
    // Released
    if (cig.pos && (thrown || cig.phase === CIG.FINISHED) && hand) {
      throwCigarette(thrown || hand.vel);
      return;
    }
    if (hand && cig.pos && now - cig.releasedAt < 180) return; // grace window for a throw
    cig.phase = cig.burn >= 1 ? CIG.FINISHED : CIG.IDLE;
    cig.pos = null;
    setStatus(hand ? "idle" : "idle", hand ? "Pinch to hold your cigarette" : "Show your hand to the camera");
    return;
  }

  // Holding: place cigarette between fingers, pointing away from the palm
  const dir = { x: hand.pinch.x - hand.palm.x, y: hand.pinch.y - hand.palm.y };
  const dl = Math.hypot(dir.x, dir.y) || 1;
  cig.angle = Math.atan2(dir.y / dl, dir.x / dl);
  cig.pos = hand.pinch;
  cig.len = hand.scale * 1.7 * cig.type.length;

  const speed = Math.hypot(hand.vel.x, hand.vel.y);
  const flickThreshold = canvas.clientWidth * 2.2;

  if (thrown) { throwCigarette(thrown); return; }

  if (cig.burn >= 1) {
    cig.phase = CIG.FINISHED;
    setStatus("done", "Finished — flick your hand to toss it");
    return;
  }

  // Lighting: flame from the lighter hand touching the tip
  const tip = tipPosition();
  const lighter = state.lighter;
  const flameOnTip = !cig.lit && lighter && dist(lighter, tip) < hand.scale * 0.5;
  if (flameOnTip) {
    state.lightProgress = Math.min(1, state.lightProgress + dt / 0.7);
    emitSmoke(tip, 1, "120,120,130", 0.3);
    if (state.lightProgress >= 1) {
      cig.lit = true; state.lightProgress = 0;
      showToast("Lit. Take a drag.");
      for (let i = 0; i < 6; i++) emitSmoke(tip, 1, cig.type.smoke, 0.6);
    }
  } else {
    state.lightProgress = Math.max(0, state.lightProgress - dt / 0.4);
  }

  const nearMouth = mouth && dist(hand.pinch, mouth) < mouth.r * 1.6 + hand.scale * 0.15;
  if (!cig.lit) {
    cig.phase = CIG.HOLDING;
    setStatus("holding", flameOnTip ? "Lighting…" : lighter ? "Touch the flame to the tip" : "Unlit — make a lighter with your other hand (fist, thumb up)");
    renderBurn();
    return;
  }
  if (nearMouth) {
    if (cig.phase !== CIG.PUFFING) {
      state.puffs++; ui.statPuffs.textContent = state.puffs;
    }
    cig.phase = CIG.PUFFING;
    cig.burn = Math.min(1, cig.burn + dt * 0.11 * cig.type.burn);
    cig.ash = Math.min(0.12, cig.ash + dt * 0.02);
    emitSmoke(tipPosition(), 3, cig.type.smoke, 0.7);
    setStatus("puffing", "Taking a drag…");
    if (cig.burn >= 1) finishCigarette();
  } else {
    if (cig.phase === CIG.PUFFING) state.exhaleUntil = now + 1500;
    cig.phase = CIG.HOLDING;
    if (cig.lit) {
      cig.burn = Math.min(1, cig.burn + dt * 0.012 * cig.type.burn);
      cig.ash = Math.min(0.12, cig.ash + dt * 0.005);
      if (cig.burn >= 1) finishCigarette();
      emitSmoke(tipPosition(), 1, cig.type.smoke, 0.35);
      if (speed > flickThreshold * 1.3) cig.ash = 0;
    }
    setStatus("holding", "Bring it back to your lips");
  }

  renderBurn();
}

// Throw gesture: the pinch point travels a large distance quickly (a flick/throw).
// Works while pinching and for a short moment after releasing (a natural throw opens the hand).
const throwTrail = [];
function detectThrow(now) {
  const hand = state.hand, cig = state.cig;
  if (!hand) { throwTrail.length = 0; return null; }
  const W = canvas.clientWidth;
  const wasHolding = cig.pos != null;
  if (hand.isPinching || (wasHolding && cig.releasedAt && now - cig.releasedAt < 180)) {
    throwTrail.push({ x: hand.pinch.x, y: hand.pinch.y, t: now });
  } else {
    throwTrail.length = 0;
    return null;
  }
  while (throwTrail.length && now - throwTrail[0].t > 220) throwTrail.shift();
  if (throwTrail.length < 3 || !wasHolding) return null;
  const a = throwTrail[0], b = throwTrail[throwTrail.length - 1];
  const dtS = Math.max((b.t - a.t) / 1000, 1e-3);
  const dx = b.x - a.x, dy = b.y - a.y;
  const travel = Math.hypot(dx, dy);
  const speed = travel / dtS;
  if (travel > W * 0.18 && speed > W * 1.3) {
    throwTrail.length = 0;
    return { x: dx / dtS, y: dy / dtS };
  }
  return null;
}

let puffsAtSpawn = 0;
function finishCigarette() {
  const cig = state.cig;
  cig.phase = CIG.FINISHED;
  state.smoked++; ui.statSmoked.textContent = state.smoked;
  pushHistory(cig, state.puffs - puffsAtSpawn);
  puffsAtSpawn = state.puffs;
  state.exhaleUntil = performance.now() + 1500;
  showToast("That one's done. <b>Flick</b> to toss it.");
  renderBurn();
}

function tipPosition() {
  const cig = state.cig;
  const remaining = cig.len * (1 - cig.burn) + cig.len * 0.25;
  return { x: cig.pos.x + Math.cos(cig.angle) * remaining, y: cig.pos.y + Math.sin(cig.angle) * remaining };
}

function throwCigarette(vel) {
  const cig = state.cig;
  const p = cig.pos || state.hand?.pinch || { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
  const speed = Math.hypot(vel.x, vel.y);
  const vx = speed > 50 ? vel.x * 0.9 : (Math.random() - 0.5) * 600;
  const vy = speed > 50 ? vel.y * 0.9 - 300 : -600;
  cig.thrown = { x: p.x, y: p.y, vx, vy, rot: cig.angle, vr: (Math.random() - 0.5) * 20, at: performance.now() };
  if (cig.phase !== CIG.FINISHED) {
    pushHistory(cig, state.puffs - puffsAtSpawn, true);
    puffsAtSpawn = state.puffs;
  }
  cig.phase = CIG.THROWN;
  setStatus("done", "Tossed. Dealing a fresh one…");
  for (let i = 0; i < 8; i++) emitSmoke(p, 1, "200,200,200", 0.4);
}

// ---------------------------------------------------------------------------
// Smoke particles
// ---------------------------------------------------------------------------
function emitSmoke(at, count, rgb, alpha, bias = { x: 0, y: -40 }) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x: at.x + (Math.random() - 0.5) * 6, y: at.y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 30 + bias.x, vy: (Math.random() - 0.5) * 20 + bias.y,
      r: 4 + Math.random() * 6, life: 0, max: 1.6 + Math.random() * 1.2, rgb, alpha: alpha * 0.6,
    });
  }
  if (state.particles.length > 400) state.particles.splice(0, state.particles.length - 400);
}
function updateParticles(dt) {
  const t = performance.now() / 1000;
  for (const p of state.particles) {
    p.life += dt;
    p.x += (p.vx + Math.sin(t * 2 + p.y * 0.02) * 15) * dt;
    p.y += p.vy * dt;
    p.vy -= 10 * dt;
    p.r += 9 * dt;
  }
  state.particles = state.particles.filter((p) => p.life < p.max);
}
function drawParticles() {
  for (const p of state.particles) {
    const k = p.life / p.max;
    const a = p.alpha * (1 - k) * Math.min(1, k * 6);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, `rgba(${p.rgb},${a})`);
    g.addColorStop(1, `rgba(${p.rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
const FILTER_COLORS = { cork: ["#c98a45", "#a86a2d"], white: ["#fbfaf7", "#d9d4cc"], green: ["#c9e8d3", "#8fc9a3"], none: null };

function drawCigarette(x, y, angle, len, burn, thickness, lit, phase, ash, brand, type, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  const filterLen = type.filter === "none" ? 0 : len * 0.25;
  const bodyLen = len * (1 - burn);
  const r = thickness / 2;

  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;

  // Filter
  if (filterLen > 0) {
    const [c1, c2] = FILTER_COLORS[type.filter];
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    roundRect(-filterLen, -r, filterLen, thickness, r);
    ctx.fill();
    // brand band
    ctx.fillStyle = brand.color;
    ctx.fillRect(-filterLen * 0.15, -r, Math.max(2, thickness * 0.18), thickness);
  }

  // Paper body
  if (bodyLen > 1) {
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, type.paper); g.addColorStop(1, "#cfc8bb");
    ctx.fillStyle = g;
    roundRect(0, -r, bodyLen, thickness, filterLen > 0 ? 0 : r);
    ctx.fill();
    // brand text
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = "rgba(60,50,40,0.6)";
    ctx.font = `${Math.max(6, thickness * 0.55)}px "Playfair Display", serif`;
    ctx.textBaseline = "middle";
    if (bodyLen > thickness * 4) ctx.fillText(brand.name.toUpperCase(), thickness * 0.6, 0.5);
  }

  // Ash + ember
  if (lit || phase === CIG.FINISHED) {
    const ashLen = len * ash;
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if (ashLen > 0.5) {
      ctx.fillStyle = "#8d8a86";
      roundRect(bodyLen, -r * 0.95, ashLen, thickness * 0.95, 2);
      ctx.fill();
    }
    const ex = bodyLen + ashLen;
    const glow = phase === CIG.PUFFING ? 1 : 0.55;
    const pulse = 0.85 + Math.sin(performance.now() / 90) * 0.15;
    ctx.shadowColor = `rgba(255,120,40,${glow})`; ctx.shadowBlur = 18 * glow * pulse;
    const g = ctx.createRadialGradient(ex, 0, 0, ex, 0, r * 1.1);
    g.addColorStop(0, `rgba(255,240,180,${glow})`);
    g.addColorStop(0.5, `rgba(255,110,30,${glow})`);
    g.addColorStop(1, `rgba(120,30,10,${0.8 * glow})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(ex, 0, r * 0.5, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function roundRect(x, y, w, h, rad) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, rad) : ctx.rect(x, y, w, h);
}

function drawGuides() {
  const { hand, mouth, cig } = state;
  if (DEMO && mouth) {
    ctx.save(); ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.beginPath(); ctx.ellipse(mouth.x, mouth.y, mouth.r, mouth.r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "12px Inter"; ctx.textAlign = "center"; ctx.fillText("mouth", mouth.x, mouth.y + mouth.r + 16); ctx.restore();
  }
  if (mouth && hand && hand.isPinching && cig.phase !== CIG.THROWN && cig.burn < 1) {
    const rr = mouth.r * 1.6 + hand.scale * 0.15;
    ctx.save();
    ctx.strokeStyle = cig.phase === CIG.PUFFING ? "rgba(255,122,61,0.9)" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -performance.now() / 40;
    ctx.beginPath(); ctx.arc(mouth.x, mouth.y, rr, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (hand) {
    ctx.save();
    ctx.fillStyle = hand.isPinching ? "rgba(255,184,107,0.9)" : "rgba(255,255,255,0.35)";
    for (const i of [4, 8]) {
      const p = hand.landmarks[i];
      ctx.beginPath(); ctx.arc(p.x, p.y, hand.isPinching ? 3 : 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawFlame(l, intensity) {
  const t = performance.now() / 1000;
  const s = l.scale * 0.22;
  const flicker = 1 + Math.sin(t * 23) * 0.08 + Math.sin(t * 41) * 0.05;
  const h = s * 2.2 * flicker * (0.8 + intensity * 0.5);
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.shadowColor = "rgba(255,150,50,0.9)"; ctx.shadowBlur = 24;
  const outer = ctx.createLinearGradient(0, 0, 0, -h);
  outer.addColorStop(0, "rgba(255,120,30,0.95)"); outer.addColorStop(0.6, "rgba(255,190,60,0.9)"); outer.addColorStop(1, "rgba(255,230,150,0)");
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.moveTo(-s * 0.55, 0);
  ctx.bezierCurveTo(-s * 0.7, -h * 0.4, -s * 0.15, -h * 0.75, Math.sin(t * 17) * s * 0.15, -h);
  ctx.bezierCurveTo(s * 0.15, -h * 0.75, s * 0.7, -h * 0.4, s * 0.55, 0);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  const inner = ctx.createLinearGradient(0, 0, 0, -h * 0.55);
  inner.addColorStop(0, "rgba(90,140,255,0.9)"); inner.addColorStop(1, "rgba(255,255,220,0.95)");
  ctx.fillStyle = inner;
  ctx.beginPath(); ctx.ellipse(0, -h * 0.22, s * 0.28, h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function draw() {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);
  drawParticles();
  drawGuides();
  if (state.lighter) drawFlame(state.lighter, state.lightProgress);
  const cig = state.cig;
  if (!cig) return;
  const thickness = Math.max(8, (state.hand?.scale || 80) * 0.16);
  if (cig.phase === CIG.THROWN) {
    const t = cig.thrown;
    const k = Math.min(1, (performance.now() - t.at) / 1400);
    drawCigarette(t.x, t.y, t.rot, cig.len || 120, cig.burn, thickness, false, CIG.FINISHED, cig.ash, cig.brand, cig.type, 1 - k * 0.6);
  } else if (cig.pos) {
    drawCigarette(cig.pos.x, cig.pos.y, cig.angle, cig.len, cig.burn, thickness, cig.lit || state.lightProgress > 0.35, cig.phase, cig.ash, cig.brand, cig.type);
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
function loop(now) {
  if (!state.running) return;
  const dt = Math.min(0.05, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  state.fpsSmooth = state.fpsSmooth * 0.9 + (1 / Math.max(dt, 1e-3)) * 0.1;
  ui.statFps.textContent = Math.round(state.fpsSmooth);

  try { updateTracking(now); } catch (e) { console.error(e); }
  updateCigarette(dt, now);
  if (now < state.exhaleUntil && state.mouth) emitSmoke(state.mouth, 2, state.cig.type.smoke, 0.5, { x: 0, y: -30 });
  updateParticles(dt);
  draw();
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  if (DEMO) {
    ui.startBtn.textContent = "Start demo (mouse controls)";
    ui.startBtn.onclick = () => {
      ui.overlay.classList.add("hidden");
      resizeCanvas();
      state.running = true; state.lastFrame = performance.now();
      newCigarette();
      setStatus("idle", "Hold the mouse button to pinch");
      requestAnimationFrame(loop);
    };
    return;
  }
  ui.startBtn.disabled = true;
  ui.startBtn.textContent = "Loading models…";
  try {
    await loadModels();
    setStatus("idle", "Models ready — enable your camera");
    ui.startBtn.disabled = false;
    ui.startBtn.textContent = "Enable camera";
  } catch (e) {
    console.error(e);
    setStatus("error", "Failed to load models");
    ui.startError.textContent = "Couldn't load the hand-tracking models. Check your connection and reload.";
    ui.startBtn.textContent = "Retry";
    ui.startBtn.disabled = false;
    ui.startBtn.onclick = () => location.reload();
  }
}

ui.startBtn.addEventListener("click", async () => {
  if (DEMO || !state.handLandmarker) return;
  ui.startBtn.disabled = true;
  ui.startBtn.textContent = "Starting camera…";
  ui.startError.textContent = "";
  try {
    await startCamera();
    resizeCanvas();
    ui.overlay.classList.add("hidden");
    state.running = true;
    state.lastFrame = performance.now();
    newCigarette();
    setStatus("idle", "Show your hand to the camera");
    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
    ui.startError.textContent = e.name === "NotAllowedError"
      ? "Camera permission was denied. Allow camera access and try again."
      : `Couldn't start the camera: ${e.message}`;
    ui.startBtn.disabled = false;
    ui.startBtn.textContent = "Try again";
  }
});

boot();

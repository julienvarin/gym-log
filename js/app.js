"use strict";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const PARTS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];

// Ideas shown before you've logged an exercise yourself.
const STARTERS = {
  Chest: ["Bench press", "Incline dumbbell press", "Chest fly", "Push-ups", "Dips"],
  Back: ["Deadlift", "Pull-ups", "Barbell row", "Lat pulldown", "Seated cable row"],
  Legs: ["Squat", "Leg press", "Romanian deadlift", "Lunges", "Leg curl", "Leg extension", "Calf raise"],
  Shoulders: ["Overhead press", "Lateral raise", "Rear delt fly", "Face pull"],
  Arms: ["Biceps curl", "Hammer curl", "Triceps pushdown", "Skull crusher"],
  Core: ["Plank", "Hanging leg raise", "Cable crunch", "Russian twist"],
  Cardio: ["Rowing", "Bike", "Treadmill", "Jump rope"],
};
const DEFAULTS = { kg: 20, reps: 10, sets: 3, rest: 90 };

// The wheel: `per` steps make one full turn, so every step is 360/per degrees.
const FIELDS = {
  kg: { unit: "kg", step: 2.5, per: 20, min: 0, max: 500 },     // 50 kg per turn
  reps: { unit: "reps", step: 1, per: 20, min: 1, max: 100 },   // 20 reps per turn
  sets: { unit: "sets", step: 1, per: 10, min: 1, max: 20 },    // 10 sets per turn
  rest: { unit: "rest", step: 15, per: 20, min: 0, max: 900 },  // 5 min per turn
};
const ORDER = ["kg", "reps", "sets", "rest"];
const PRESETS = {
  reps: [5, 6, 8, 10, 12, 15],
  sets: [2, 3, 4, 5],
  rest: [45, 60, 90, 120, 180],
};

const STORE = "gymlog.v1";

/* ------------------------------------------------------------------ */
/*  State (this phone only)                                            */
/* ------------------------------------------------------------------ */
// workouts: finished sessions, newest last.
// active:   the session in progress, or null.
// item:     { id, name, part, kg, reps, sets, rest, done: [{ kg, reps, at }] }
let state = load();

function blank() {
  return { workouts: [], templates: [], active: null, settings: { sound: true, awake: true } };
}

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "null");
    if (v && Array.isArray(v.workouts)) {
      const b = blank();
      return { ...b, ...v, settings: { ...b.settings, ...(v.settings || {}) } };
    }
  } catch (e) {}
  return blank();
}

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); }
  catch (e) { toast("Couldn't save on this phone", true); }
}

// For undo: a copy of everything before a destructive change.
const snapshot = () => JSON.stringify(state);
function restore(snap) { state = JSON.parse(snap); save(); renderHome(); }

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ------------------------------------------------------------------ */
/*  Tiny DOM helpers                                                   */
/* ------------------------------------------------------------------ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showScreen(id) {
  $$(".screen").forEach((s) => s.classList.remove("active"));
  $("#" + id).classList.add("active");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer = null;
let toastAction = null;
// action: optional { label, fn }, e.g. Undo. Toasts with an action stay a bit longer.
function toast(msg, isErr, action) {
  const t = $("#toast");
  $("#toast-msg").textContent = msg;
  const btn = $("#toast-act");
  toastAction = action ? action.fn : null;
  btn.hidden = !action;
  if (action) btn.textContent = action.label;
  t.classList.toggle("err", !!isErr);
  t.classList.toggle("high", !$("#rest").hidden && $("#screen-home").classList.contains("active"));
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; toastAction = null; }, action ? 5000 : 2400);
}

/* ------------------------------------------------------------------ */
/*  Feel: haptics + sound                                              */
/* ------------------------------------------------------------------ */
// Android has navigator.vibrate. iOS Safari doesn't, but since iOS 18 toggling a
// <input type="checkbox" switch> plays the system haptic, so we click a hidden one.
let hapticLabel = null;
function haptic() {
  if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} return; }
  if (!hapticLabel) {
    hapticLabel = document.createElement("label");
    hapticLabel.setAttribute("aria-hidden", "true");
    hapticLabel.style.display = "none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    hapticLabel.appendChild(input);
    document.body.appendChild(hapticLabel);
  }
  hapticLabel.click();
}

let ac = null;
function audio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    // "ambient" mixes with your music instead of pausing it.
    try { if (navigator.audioSession) navigator.audioSession.type = "ambient"; } catch (e) {}
    ac = new AC();
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}

function tone(freq, dur, vol, type, delay) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (delay || 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type || "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// One detent of the wheel.
function click() {
  haptic();
  if (state.settings.sound) tone(2400, 0.025, 0.06, "triangle");
}

function beep() {
  [0, 0.22, 0.44].forEach((d, i) => tone(i === 2 ? 1320 : 880, 0.16, 0.22, "sine", d));
  if (navigator.vibrate) { try { navigator.vibrate([120, 80, 120]); } catch (e) {} }
}

// Audio can only start from a touch, so wake it on the first one.
document.addEventListener("pointerdown", () => { if (state.settings.sound) audio(); }, { once: true, capture: true });

/* ------------------------------------------------------------------ */
/*  Formatting                                                         */
/* ------------------------------------------------------------------ */
function fmtKg(v) {
  if (!v) return "BW";
  return String(Math.round(v * 100) / 100);
}
function fmtRest(s) {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? h + ":" + String(m).padStart(2, "0") + ":" + ss : m + ":" + ss;
}
function fmtMins(ms) {
  const m = Math.round(ms / 60000);
  return m < 60 ? m + " min" : Math.floor(m / 60) + "h " + String(m % 60).padStart(2, "0");
}
function fmtVolume(kg) {
  return kg >= 1000 ? (Math.round(kg / 100) / 10) + " t" : Math.round(kg) + " kg";
}
function fmtField(f, v) {
  if (f === "kg") return fmtKg(v);
  if (f === "rest") return fmtRest(v);
  return String(v);
}
function specLine(it) {
  const w = it.kg ? "<b>" + fmtKg(it.kg) + " kg</b>" : "<b>Bodyweight</b>";
  return w + " × " + it.reps + " · " + it.sets + " sets · " + fmtRest(it.rest) + " rest";
}
const key = (name) => String(name).trim().toLowerCase();

/* ------------------------------------------------------------------ */
/*  Library: everything you've done, so repeats are one tap            */
/* ------------------------------------------------------------------ */
// name -> { name, part, kg, reps, sets, rest, best, count, at }
function library() {
  const lib = new Map();
  const put = (it, at, real) => {
    const k = key(it.name);
    const prev = lib.get(k);
    const done = (it.done || []).filter((d) => d.kg != null);
    const best = Math.max(prev ? prev.best : 0, ...done.map((d) => d.kg));
    lib.set(k, {
      name: it.name, part: it.part || (prev && prev.part) || "",
      kg: it.kg, reps: it.reps, sets: it.sets, rest: it.rest,
      best, count: (prev ? prev.count : 0) + (real ? 1 : 0), at: at || (prev && prev.at) || 0,
    });
  };
  // templates first, so anything you actually did wins
  state.templates.forEach((t) => t.items.forEach((it) => { if (!lib.has(key(it.name))) put(it, 0, false); }));
  state.workouts.forEach((w) => w.items.forEach((it) => put(it, w.start, true)));
  return lib;
}

/* ------------------------------------------------------------------ */
/*  Home                                                               */
/* ------------------------------------------------------------------ */
function renderHome() {
  const a = state.active;
  $("#home-idle").hidden = !!a;
  $("#home-active").hidden = !a;
  if (a) renderWorkout(); else renderIdle();
  renderRest();
  tickClock();
  keepAwake();
}

function renderIdle() {
  const last = state.workouts[state.workouts.length - 1];
  $("#idle-sub").textContent = last
    ? "Last workout " + new Date(last.start).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }) +
      (last.name ? " · " + last.name : "")
    : "Tap start, pick an exercise, spin the wheel.";

  const list = $("#tpl-list");
  list.innerHTML = "";
  $("#tpl-wrap").hidden = !state.templates.length;
  state.templates.forEach((t) => {
    const el = document.createElement("div");
    el.className = "tpl";
    el.innerHTML =
      '<div class="tpl-main"><div class="tpl-name">' + escapeHtml(t.name) + "</div>" +
      '<div class="tpl-sub">' + escapeHtml(t.items.map((i) => i.name).join(" · ")) + "</div></div>" +
      '<span class="tpl-go">Start</span>' +
      '<button class="mini-btn" type="button" aria-label="Delete training">✕</button>';
    el.querySelector(".tpl-main").onclick = () => startWorkout(t.items, t.name);
    el.querySelector(".tpl-go").onclick = () => startWorkout(t.items, t.name);
    el.querySelector(".mini-btn").onclick = (e) => {
      e.stopPropagation();
      const snap = snapshot();
      state.templates = state.templates.filter((x) => x.id !== t.id);
      save(); renderIdle();
      toast("Deleted “" + t.name + "”", false, { label: "Undo", fn: () => restore(snap) });
    };
    list.appendChild(el);
  });
}

// From a training or a past workout: the same exercises, at the values you used last.
function startWorkout(items, name) {
  const lib = library();
  state.active = {
    id: uid(), start: Date.now(), name: name || "", rest: null,
    items: (items || []).map((it) => {
      const l = lib.get(key(it.name)) || it;
      return { id: uid(), name: it.name, part: it.part || l.part || "", kg: l.kg, reps: l.reps, sets: l.sets, rest: l.rest, done: [] };
    }),
  };
  save();
  renderHome();
  if (!state.active.items.length) openPick();
}

function nextItem() {
  return state.active && state.active.items.find((it) => it.done.length < it.sets);
}

function renderWorkout() {
  const a = state.active;
  const list = $("#ex-list");
  list.innerHTML = "";
  const next = nextItem();
  a.items.forEach((it) => {
    const complete = it.done.length >= it.sets;
    const el = document.createElement("div");
    el.className = "ex" + (complete ? " complete" : "") + (it === next ? " next" : "");
    const n = Math.max(it.sets, it.done.length);
    let dots = "";
    for (let i = 0; i < n; i++) dots += '<button class="dot' + (i < it.done.length ? " on" : "") + '" data-i="' + i + '" type="button">' + (i < it.done.length ? "✓" : "") + "</button>";
    el.innerHTML =
      '<div class="ex-main"><div class="ex-name">' + escapeHtml(it.name) +
      '<span class="part-tag">' + escapeHtml(it.part || "") + "</span></div>" +
      '<div class="ex-spec">' + specLine(it) + "</div>" +
      '<div class="dots">' + dots + "</div></div>" +
      '<button class="tick' + (complete ? " all" : "") + '" type="button" aria-label="Set done">' +
      (complete ? "✓" : it.done.length + 1 + "") + "</button>";
    el.querySelector(".ex-main").onclick = (e) => {
      const dot = e.target.closest(".dot");
      if (dot) setDone(it, +dot.dataset.i < it.done.length ? +dot.dataset.i : +dot.dataset.i + 1);
      else openWheel({ mode: "edit", item: it });
    };
    el.querySelector(".tick").onclick = () => {
      if (complete) { toast(it.name + " is done"); return; }
      setDone(it, it.done.length + 1);
    };
    list.appendChild(el);
  });
  const add = $("#add-ex");
  add.classList.toggle("first", !a.items.length);
  $("#save-tpl").hidden = !a.items.length;
}

// Tick (or untick) sets so exactly `count` are done.
function setDone(it, count) {
  const before = it.done.length;
  if (count > before) {
    for (let i = before; i < count; i++) it.done.push({ kg: it.kg, reps: it.reps, at: Date.now() });
    haptic();
    const after = nextItem();
    if (after) startRest(it.rest, after === it ? "Next: set " + (it.done.length + 1) + " of " + it.sets : "Next: " + after.name);
    else { state.active.rest = null; toast("All sets done 💪 — tap Finish"); }
  } else {
    it.done.length = count;
    haptic();
  }
  save();
  renderHome();
}

/* ------------------------------------------------------------------ */
/*  Rest timer                                                         */
/* ------------------------------------------------------------------ */
function startRest(secs, label) {
  if (!secs) { state.active.rest = null; return; }
  state.active.rest = { end: Date.now() + secs * 1000, total: secs, label, rang: false };
}

const REST_C = 2 * Math.PI * 19;
function renderRest() {
  const r = state.active && state.active.rest;
  const bar = $("#rest");
  bar.hidden = !r;
  $("#home-active").classList.toggle("resting", !!r);
  $("#toast").classList.toggle("high", !!r && $("#screen-home").classList.contains("active"));
  if (!r) return;
  const left = (r.end - Date.now()) / 1000;
  const over = left <= 0;
  bar.classList.toggle("over", over);
  $("#rest-time").textContent = over ? "Go!" : fmtRest(Math.ceil(left));
  $("#rest-label").textContent = over ? r.label + " · +" + fmtRest(-left) : r.label;
  const arc = $("#rest-arc");
  arc.style.strokeDasharray = REST_C;
  arc.style.strokeDashoffset = over ? 0 : REST_C * (1 - left / r.total);
  if (over && !r.rang) {
    r.rang = true;
    save();
    beep();
  }
  // nobody needs the bar a minute after it rang
  if (left < -60) { state.active.rest = null; save(); renderRest(); }
}

function adjustRest(d) {
  const r = state.active && state.active.rest;
  if (!r) return;
  const left = Math.max(0, r.end - Date.now());
  r.end = Date.now() + Math.max(0, left + d * 1000);
  r.total = Math.max(r.total + d, 1);
  r.rang = false;
  save(); haptic(); renderRest();
}

$("#rest-plus").onclick = () => adjustRest(15);
$("#rest-minus").onclick = () => adjustRest(-15);
$("#rest-skip").onclick = () => { if (state.active) { state.active.rest = null; save(); renderRest(); } };

function tickClock() {
  const el = $("#clock");
  if (state.active) {
    el.textContent = fmtClock(Date.now() - state.active.start);
    el.classList.add("live");
  } else {
    el.textContent = "Gym";
    el.classList.remove("live");
  }
}

setInterval(() => {
  if (!state.active) return;
  tickClock();
  if (state.active.rest) renderRest();
}, 250);

/* ------------------------------------------------------------------ */
/*  Keep the screen on during a workout                                */
/* ------------------------------------------------------------------ */
let wakeLock = null;
async function keepAwake() {
  const want = !!state.active && state.settings.awake && !document.hidden;
  if (want && !wakeLock && "wakeLock" in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch (e) { wakeLock = null; }
  } else if (!want && wakeLock) {
    try { await wakeLock.release(); } catch (e) {}
    wakeLock = null;
  }
}
document.addEventListener("visibilitychange", () => {
  keepAwake();
  if (!document.hidden && state.active) renderRest();
});

/* ------------------------------------------------------------------ */
/*  Pick an exercise                                                   */
/* ------------------------------------------------------------------ */
let pickPart = "";

function openPick() {
  $("#ex-name").value = "";
  showScreen("screen-pick");
  renderParts();
  renderSuggest();
}

function renderParts() {
  const wrap = $("#parts");
  wrap.innerHTML = "";
  ["", ...PARTS].forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (p === pickPart ? " selected" : "");
    b.textContent = p || "All";
    b.onclick = () => { pickPart = p; haptic(); renderParts(); renderSuggest(); };
    wrap.appendChild(b);
  });
}

function partOf(name) {
  const k = key(name);
  return PARTS.find((p) => STARTERS[p].some((s) => key(s) === k)) || "";
}

function renderSuggest() {
  const q = key($("#ex-name").value);
  $("#name-next").hidden = !q;
  const lib = library();
  const inWorkout = new Set(state.active ? state.active.items.map((i) => key(i.name)) : []);
  const match = (name, part) => (q ? key(name).includes(q) : !pickPart || part === pickPart);

  const recent = Array.from(lib.values())
    .filter((e) => match(e.name, e.part) && !inWorkout.has(key(e.name)))
    .sort((a, b) => b.at - a.at || b.count - a.count);
  const known = new Set(Array.from(lib.keys()));
  const ideas = [];
  (pickPart && !q ? [pickPart] : PARTS).forEach((p) =>
    STARTERS[p].forEach((n) => {
      if (!known.has(key(n)) && !inWorkout.has(key(n)) && match(n, p)) ideas.push({ name: n, part: p });
    })
  );

  const list = $("#suggest");
  list.innerHTML = "";
  const head = (t) => {
    const h = document.createElement("div");
    h.className = "sg-head";
    h.textContent = t;
    list.appendChild(h);
  };
  const row = (name, right, cls, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sg " + cls;
    b.innerHTML = '<span class="sg-name">' + escapeHtml(name) + '</span><span class="sg-last">' + right + "</span>";
    b.onclick = fn;
    list.appendChild(b);
  };

  if (recent.length) head("Yours");
  recent.slice(0, 12).forEach((e) =>
    row(e.name, escapeHtml(fmtKg(e.kg) + (e.kg ? " kg" : "") + " · " + e.sets + "×" + e.reps), "recent", () =>
      openWheel({ mode: "known", name: e.name, part: e.part, vals: e, last: e })
    )
  );
  if (ideas.length) head(recent.length ? "Ideas" : "Pick one");
  ideas.forEach((e) => row(e.name, escapeHtml(e.part), "", () => openWheel({ mode: "new", name: e.name, part: e.part })));
}

function pickTyped() {
  const name = $("#ex-name").value.trim();
  if (!name) return;
  const e = library().get(key(name));
  if (e) openWheel({ mode: "known", name: e.name, part: e.part, vals: e, last: e });
  else openWheel({ mode: "new", name: name.charAt(0).toUpperCase() + name.slice(1), part: pickPart || partOf(name) });
}

$("#ex-name").addEventListener("input", renderSuggest);
$("#ex-name").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); pickTyped(); } });
$("#name-next").onclick = pickTyped;
$("#pick-back").onclick = () => {
  // a fresh workout you backed out of before adding anything isn't a workout
  if (state.active && !state.active.items.length) { state.active = null; save(); }
  showScreen("screen-home");
  renderHome();
};

/* ------------------------------------------------------------------ */
/*  The wheel                                                          */
/* ------------------------------------------------------------------ */
// mode: "new" walks Weight → Reps → Sets → Rest; "known" is prefilled from last
// time, one tap adds it; "edit" changes an exercise already in the workout.
let W = null;

function openWheel(opts) {
  const src = opts.item || opts.vals || DEFAULTS;
  W = {
    mode: opts.mode,
    item: opts.item || null,
    name: opts.item ? opts.item.name : opts.name,
    part: opts.item ? opts.item.part : opts.part || "",
    vals: { kg: src.kg, reps: src.reps, sets: src.sets, rest: src.rest },
    last: opts.last || (opts.item ? library().get(key(opts.item.name)) : null) || null,
    field: "kg",
    seen: new Set(opts.mode === "new" ? ["kg"] : ORDER),
  };
  $("#wheel-name").textContent = W.name;
  $("#wheel-del").hidden = W.mode !== "edit";
  $("#wheel-spacer").hidden = W.mode === "edit";
  closeInput(false);
  showScreen("screen-wheel");
  buildTicks();
  renderWheel();
}

function renderWheel() {
  const f = W.field;
  const cfg = FIELDS[f];
  const v = W.vals[f];

  $("#wheel-part").textContent = W.part || "+ part";

  $$(".fcell").forEach((c) => {
    const k = c.dataset.f;
    c.classList.toggle("active", k === f);
    c.classList.toggle("todo", !W.seen.has(k));
    c.querySelector("b").textContent = fmtField(k, W.vals[k]);
  });

  // ring: one full turn = `per` steps, extra turns show as a tinted lap behind
  const rev = cfg.step * cfg.per;
  let laps = Math.floor(v / rev);
  let frac = v / rev - laps;
  if (frac < 1e-9 && laps > 0) { laps -= 1; frac = 1; }
  const C = 2 * Math.PI * 128;
  const arc = $("#w-arc");
  arc.style.strokeDasharray = C;
  arc.style.strokeDashoffset = C * (1 - frac);
  $("#w-lap").style.opacity = laps > 0 ? 1 : 0;
  placeOnRing($("#w-thumb"), frac);

  const lastV = W.last && W.last[f];
  const lastDot = $("#w-last");
  lastDot.style.display = lastV != null && (f === "kg" || f === "reps") ? "" : "none";
  if (lastV != null) placeOnRing(lastDot, (lastV / rev) % 1 || (lastV ? 1 : 0));

  $("#w-value").textContent = f === "kg" && !v ? "BW" : fmtField(f, v);
  $("#w-unit").textContent = f === "kg" && !v ? "bodyweight" : cfg.unit;

  // the note under the number: how this compares to last time
  let note = "";
  let beat = false;
  if (f === "kg" && W.last) {
    if (W.last.best && v > W.last.best) { note = "New best!"; beat = true; }
    else if (v > W.last.kg) { note = "+" + fmtKg(v - W.last.kg) + " kg vs last"; beat = true; }
    else if (v === W.last.kg) note = "Same as last time";
    else note = "Last: " + fmtKg(W.last.kg) + " kg";
  } else if (f === "reps" && W.last) {
    if (v > W.last.reps) { note = "+" + (v - W.last.reps) + " vs last"; beat = true; }
    else note = v === W.last.reps ? "Same as last time" : "Last: " + W.last.reps;
  }
  $("#w-note").textContent = note;
  $("#wheel").classList.toggle("beat", beat);

  renderPresets();

  const go = $("#wheel-go");
  if (W.mode === "edit") go.textContent = "Save";
  else if (W.mode === "new" && ORDER.indexOf(f) < ORDER.length - 1) go.textContent = "Next";
  else go.textContent = state.active ? "Add to workout" : "Start with this";
}

function placeOnRing(el, frac) {
  const a = frac * 2 * Math.PI - Math.PI / 2;
  el.setAttribute("cx", 150 + 128 * Math.cos(a));
  el.setAttribute("cy", 150 + 128 * Math.sin(a));
}

// One small tick per step, like detents on a click wheel.
function buildTicks() {
  const per = FIELDS[W.field].per;
  const g = $("#w-ticks");
  let html = "";
  for (let i = 0; i < per; i++) {
    const a = (i / per) * 2 * Math.PI - Math.PI / 2;
    const c = Math.cos(a), s = Math.sin(a);
    html += '<line class="w-tick" x1="' + (150 + 100 * c) + '" y1="' + (150 + 100 * s) + '" x2="' + (150 + 106 * c) + '" y2="' + (150 + 106 * s) + '"/>';
  }
  g.innerHTML = html;
}

function renderPresets() {
  const f = W.field;
  const v = W.vals[f];
  const wrap = $("#presets");
  wrap.innerHTML = "";
  const chip = (label, val, cls, advance) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip " + (cls || "") + (val === v && !cls ? " selected" : "");
    b.textContent = label;
    b.onclick = () => {
      setVal(val, true);
      if (advance && W.mode === "new" && ORDER.indexOf(f) < ORDER.length - 1) setTimeout(nextField, 140);
    };
    wrap.appendChild(b);
  };
  if (f === "kg") {
    chip("−5", Math.max(0, v - 5), "nudge");
    chip("−2.5", Math.max(0, v - 2.5), "nudge");
    if (W.last && W.last.kg !== v) chip("Last " + fmtKg(W.last.kg), W.last.kg, "");
    else chip("BW", 0, "");
    chip("+2.5", v + 2.5, "nudge");
    chip("+5", v + 5, "nudge");
  } else {
    PRESETS[f].forEach((p) => chip(fmtField(f, p), p, "", true));
  }
}

function setVal(v, fromTap) {
  const cfg = FIELDS[W.field];
  v = Math.min(cfg.max, Math.max(cfg.min, Math.round(v * 100) / 100));
  if (v === W.vals[W.field]) return false;
  W.vals[W.field] = v;
  if (fromTap) haptic();
  renderWheel();
  return true;
}

function setField(f) {
  if (W.field === f) return;
  closeInput(true);
  W.field = f;
  W.seen.add(f);
  buildTicks();
  renderWheel();
}

function nextField() {
  const i = ORDER.indexOf(W.field);
  if (i < ORDER.length - 1) { setField(ORDER[i + 1]); haptic(); }
}

$$(".fcell").forEach((c) => (c.onclick = () => { setField(c.dataset.f); haptic(); }));

$("#wheel-part").onclick = () => {
  // tap the tag to cycle the body part
  const i = PARTS.indexOf(W.part);
  W.part = i < 0 ? PARTS[0] : i === PARTS.length - 1 ? "" : PARTS[i + 1];
  haptic();
  renderWheel();
};

$("#wheel-go").onclick = () => {
  closeInput(true);
  if (W.mode === "new" && ORDER.indexOf(W.field) < ORDER.length - 1) return nextField();
  commitWheel();
};

$("#wheel-back").onclick = () => {
  closeInput(false);
  if (W.mode === "edit") { showScreen("screen-home"); renderHome(); }
  else openPick();
};

$("#wheel-del").onclick = () => {
  const snap = snapshot();
  state.active.items = state.active.items.filter((it) => it !== W.item);
  save();
  showScreen("screen-home");
  renderHome();
  toast("Removed " + W.name, false, { label: "Undo", fn: () => restore(snap) });
};

function commitWheel() {
  const v = W.vals;
  if (W.mode === "edit") {
    Object.assign(W.item, { part: W.part, kg: v.kg, reps: v.reps, sets: v.sets, rest: v.rest });
    save();
    showScreen("screen-home");
    renderHome();
    return;
  }
  if (!state.active) startWorkout([], "");
  state.active.items.push({ id: uid(), name: W.name, part: W.part, kg: v.kg, reps: v.reps, sets: v.sets, rest: v.rest, done: [] });
  if (W.part) pickPart = W.part;
  save();
  showScreen("screen-home");
  renderHome();
  toast("Added " + W.name);
}

/* turning: the angle your finger moves around the centre becomes steps */
(function wheelGestures() {
  const el = $("#wheel");
  let drag = null;

  const angleAt = (e) => {
    const r = el.querySelector("svg").getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return { a: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI, d: Math.hypot(e.clientX - cx, e.clientY - cy), r: r.width / 2 };
  };

  el.addEventListener("pointerdown", (e) => {
    // the middle is for typing; everything around it turns
    if (!W || !$("#w-input").hidden || e.target.closest("#w-center")) return;
    const p = angleAt(e);
    drag = { id: e.pointerId, last: p.a, acc: 0 };
    el.setPointerCapture(e.pointerId);
    el.classList.add("turning");
    e.preventDefault();
  });

  el.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const a = angleAt(e).a;
    let d = a - drag.last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    drag.last = a;
    drag.acc += d;
    const cfg = FIELDS[W.field];
    const deg = 360 / cfg.per;
    while (Math.abs(drag.acc) >= deg) {
      const dir = Math.sign(drag.acc);
      drag.acc -= dir * deg;
      if (setVal(W.vals[W.field] + dir * cfg.step, false)) click();
    }
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    el.classList.remove("turning");
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
})();

/* tap the number to type it */
$("#w-center").onclick = () => {
  const inp = $("#w-input");
  const f = W.field;
  inp.value = f === "kg" && !W.vals.kg ? "" : fmtField(f, W.vals[f]);
  inp.placeholder = f === "kg" ? "kg" : f === "rest" ? "sec" : "";
  inp.inputMode = f === "kg" ? "decimal" : "numeric";
  inp.hidden = false;
  inp.focus();
  inp.select();
};

function parseTyped(f, s) {
  s = String(s).trim().replace(",", ".");
  if (!s) return f === "kg" ? 0 : null;
  if (f === "rest") {
    if (s.includes(":")) {
      const [m, sec] = s.split(":");
      return (parseInt(m, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
    }
    const n = parseFloat(s);
    if (isNaN(n)) return null;
    return n < 10 ? Math.round(n * 60) : Math.round(n); // "2" means 2 minutes
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : f === "kg" ? n : Math.round(n);
}

function closeInput(apply) {
  const inp = $("#w-input");
  if (inp.hidden) return;
  inp.hidden = true;
  if (apply && W) {
    const v = parseTyped(W.field, inp.value);
    if (v != null) setVal(v, true);
  }
  inp.blur();
}

$("#w-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    closeInput(true);
    if (W.mode === "new") nextField();
  }
});
$("#w-input").addEventListener("blur", () => closeInput(true));

/* ------------------------------------------------------------------ */
/*  Finish, trainings                                                  */
/* ------------------------------------------------------------------ */
function workoutStats(w) {
  let sets = 0, volume = 0;
  w.items.forEach((it) => it.done.forEach((d) => { sets++; volume += (d.kg || 0) * (d.reps || 0); }));
  const exercises = w.items.filter((it) => it.done.length).length;
  return { sets, volume, exercises, ms: (w.end || Date.now()) - w.start };
}

let lastFinished = null;

$("#finish").onclick = () => {
  const a = state.active;
  const st = workoutStats(a);
  const snap = snapshot();
  a.rest = null;
  if (!st.sets) {
    state.active = null;
    save(); renderHome();
    toast("Nothing ticked — workout discarded", false, { label: "Undo", fn: () => restore(snap) });
    return;
  }
  a.end = Date.now();
  delete a.rest;
  state.workouts.push(a);
  state.active = null;
  save();
  lastFinished = a;
  keepAwake();
  $("#done-stats").innerHTML =
    '<div class="stat"><b>' + fmtMins(st.ms) + "</b><span>time</span></div>" +
    '<div class="stat"><b>' + st.sets + "</b><span>sets</span></div>" +
    '<div class="stat"><b>' + fmtVolume(st.volume) + "</b><span>lifted</span></div>";
  $("#done-tpl").hidden = state.templates.some((t) => a.name && t.name === a.name);
  showScreen("screen-done");
};

$("#done-ok").onclick = () => { showScreen("screen-home"); renderHome(); };
$("#done-tpl").onclick = () => askName(lastFinished, () => { $("#done-tpl").hidden = true; });
$("#save-tpl").onclick = () => askName(state.active);

function guessName(w) {
  const parts = [];
  w.items.forEach((it) => { if (it.part && parts.indexOf(it.part) < 0) parts.push(it.part); });
  return parts.slice(0, 3).join(" + ");
}

// "Save as training": a name sheet, then the exercises are stored (values included).
let sheetFn = null;
function askName(w, after) {
  if (!w || !w.items.length) return;
  const inp = $("#sheet-input");
  inp.value = w.name || guessName(w);
  $("#sheet").hidden = false;
  sheetFn = () => {
    const name = inp.value.trim();
    if (!name) return;
    const items = w.items.map((it) => ({ name: it.name, part: it.part, kg: it.kg, reps: it.reps, sets: it.sets, rest: it.rest }));
    const existing = state.templates.find((t) => key(t.name) === key(name));
    if (existing) existing.items = items;
    else state.templates.push({ id: uid(), name, items });
    w.name = name;
    save();
    closeSheet();
    toast((existing ? "Updated “" : "Saved “") + name + "”");
    if (after) after();
  };
  setTimeout(() => { inp.focus(); inp.select(); }, 50);
}
function closeSheet() { $("#sheet").hidden = true; $("#sheet-input").blur(); sheetFn = null; }
$("#sheet-ok").onclick = () => sheetFn && sheetFn();
$("#sheet-cancel").onclick = closeSheet;
$("#sheet").onclick = (e) => { if (e.target.id === "sheet") closeSheet(); };
$("#sheet-input").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); sheetFn && sheetFn(); } });

/* ------------------------------------------------------------------ */
/*  History                                                            */
/* ------------------------------------------------------------------ */
function renderHistory() {
  const wrap = $("#hist-list");
  wrap.innerHTML = "";
  if (!state.workouts.length) {
    wrap.innerHTML = '<div class="empty">No workouts yet.<br />Finish one and it shows up here.</div>';
    return;
  }
  let month = "";
  state.workouts.slice().reverse().forEach((w) => {
    const d = new Date(w.start);
    const m = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (m !== month) {
      month = m;
      const h = document.createElement("div");
      h.className = "month";
      h.textContent = m;
      wrap.appendChild(h);
    }
    const st = workoutStats(w);
    const el = document.createElement("div");
    el.className = "hw";
    const lines = w.items.filter((it) => it.done.length).map((it) => {
      const top = Math.max(...it.done.map((x) => x.kg || 0));
      const reps = it.done.map((x) => x.reps);
      const same = reps.every((r) => r === reps[0]);
      return '<div class="hw-ex"><span>' + escapeHtml(it.name) + "</span><span>" +
        (same ? it.done.length + " × " + reps[0] : reps.join(" / ")) + (top ? " · " + fmtKg(top) + " kg" : "") + "</span></div>";
    }).join("");
    el.innerHTML =
      '<div class="hw-top"><span class="hw-date">' +
      escapeHtml(d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + (w.name ? " · " + w.name : "")) +
      '</span><span class="hw-meta">' + fmtMins(st.ms) + " · " + st.sets + " sets · " + fmtVolume(st.volume) + "</span></div>" +
      lines +
      '<div class="hw-acts"><button class="pill rep" type="button">↻ Do again</button>' +
      '<button class="pill tpl-b" type="button">☆ Save as training</button>' +
      '<button class="pill del" type="button" aria-label="Delete">✕</button></div>';
    el.querySelector(".rep").onclick = () => {
      if (state.active) { toast("Finish the current workout first", true); return; }
      startWorkout(w.items, w.name);
      showScreen("screen-home");
    };
    el.querySelector(".tpl-b").onclick = () => askName(w);
    el.querySelector(".del").onclick = () => {
      const snap = snapshot();
      state.workouts = state.workouts.filter((x) => x !== w);
      save(); renderHistory();
      toast("Workout deleted", false, { label: "Undo", fn: () => { restore(snap); renderHistory(); } });
    };
    wrap.appendChild(el);
  });
}

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */
function renderSettings() {
  $("#opt-sound").classList.toggle("on", state.settings.sound);
  $("#opt-awake").classList.toggle("on", state.settings.awake);
}
$("#opt-sound").onclick = () => { state.settings.sound = !state.settings.sound; save(); renderSettings(); if (state.settings.sound) click(); };
$("#opt-awake").onclick = () => { state.settings.awake = !state.settings.awake; save(); renderSettings(); keepAwake(); };

$("#export").onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "gym-log-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};
$("#import").onclick = () => $("#import-file").click();
$("#import-file").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const v = JSON.parse(await file.text());
    if (!v || !Array.isArray(v.workouts) || !Array.isArray(v.templates)) throw new Error("bad");
    if (!confirm("Replace what's on this phone with this backup (" + v.workouts.length + " workouts)?")) return;
    const snap = snapshot();
    const b = blank();
    state = { ...b, ...v, settings: { ...b.settings, ...(v.settings || {}) } };
    save();
    toast("Backup imported", false, { label: "Undo", fn: () => restore(snap) });
  } catch (err) {
    toast("That isn't a Gym Log backup", true);
  }
};
$("#wipe").onclick = () => {
  if (!confirm("Erase every workout and training on this phone?")) return;
  const snap = snapshot();
  state = blank();
  save();
  renderSettings();
  toast("Erased", false, { label: "Undo", fn: () => restore(snap) });
};

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */
$("#start-empty").onclick = () => startWorkout([], "");
$("#add-ex").onclick = openPick;
$("#go-history").onclick = () => { renderHistory(); showScreen("screen-history"); };
$("#hist-back").onclick = () => { showScreen("screen-home"); renderHome(); };
$("#go-settings").onclick = () => { renderSettings(); showScreen("screen-settings"); };
$("#set-back").onclick = () => { showScreen("screen-home"); renderHome(); };
$("#toast-act").onclick = () => {
  const fn = toastAction;
  $("#toast").hidden = true;
  toastAction = null;
  if (fn) fn();
};

/* ------------------------------------------------------------------ */
/*  Boot                                                               */
/* ------------------------------------------------------------------ */
renderHome();
// ask the browser not to clear our data when space runs low
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

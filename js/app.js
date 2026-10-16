"use strict";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const PARTS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];

// Ideas shown before you've logged an exercise yourself, per language.
// Body parts are stored by their English key and only translated on screen.
const STARTERS = {
  en: {
    Chest: ["Bench press", "Incline dumbbell press", "Chest fly", "Push-ups", "Dips", "Chest press machine", "Pec deck", "Cable crossover"],
    Back: ["Deadlift", "Pull-ups", "Barbell row", "Lat pulldown", "Seated cable row", "Assisted pull-up", "T-bar row", "Back extension", "TRX row"],
    Legs: ["Squat", "Leg press", "Romanian deadlift", "Lunges", "Leg curl", "Leg extension", "Calf raise", "Hack squat", "Smith machine squat", "Hip thrust", "Abductor machine", "Adductor machine", "Cable glute kickback"],
    Shoulders: ["Overhead press", "Lateral raise", "Rear delt fly", "Face pull", "Shoulder press machine", "Cable lateral raise", "Shrugs"],
    Arms: ["Biceps curl", "Hammer curl", "Triceps pushdown", "Skull crusher", "Preacher curl", "Cable curl", "Overhead triceps extension", "Dip machine"],
    Core: ["Plank", "Hanging leg raise", "Cable crunch", "Russian twist", "Ab crunch machine", "Cable woodchop", "Ab wheel"],
    Cardio: ["Running", "Treadmill", "Bike", "Rowing", "Cross trainer", "Stair climber", "Jump rope"],
  },
  fr: {
    Chest: ["Développé couché", "Développé incliné haltères", "Écarté", "Pompes", "Dips", "Presse pectoraux machine", "Pec deck", "Écarté poulie vis-à-vis"],
    Back: ["Soulevé de terre", "Tractions", "Rowing barre", "Tirage vertical", "Tirage horizontal", "Tractions assistées", "Rowing T-bar", "Extension lombaire", "Rowing TRX"],
    Legs: ["Squat", "Presse à cuisses", "Soulevé de terre jambes tendues", "Fentes", "Leg curl", "Leg extension", "Mollets", "Hack squat", "Squat à la Smith machine", "Hip thrust", "Machine abducteurs", "Machine adducteurs", "Kickback fessiers à la poulie"],
    Shoulders: ["Développé militaire", "Élévations latérales", "Oiseau", "Face pull", "Presse épaules machine", "Élévations latérales à la poulie", "Shrugs"],
    Arms: ["Curl biceps", "Curl marteau", "Extension triceps poulie", "Barre au front", "Curl pupitre", "Curl à la poulie", "Extension triceps au-dessus de la tête", "Dips à la machine"],
    Core: ["Gainage", "Relevé de jambes suspendu", "Crunch à la poulie", "Russian twist", "Machine à abdos", "Bûcheron à la poulie", "Roue abdominale"],
    Cardio: ["Course à pied", "Tapis de course", "Vélo", "Rameur", "Vélo elliptique", "Simulateur d'escalier", "Corde à sauter"],
  },
};

// Exercises measured in time, not reps: everything in Cardio, plus these.
const TIMED = new Set(["plank", "gainage"]);

// Two kinds of exercise. "reps": weight × reps × sets with rest between.
// "time": a duration, plus a distance and/or a machine level if you want them.
const DEFAULTS = { kg: 20, reps: 10, sets: 3, rest: 90, time: 600, km: 0, level: 0 };

// Weights are stored in kg and shown in your unit. The wheel's step and the
// starting weight follow the body part: a curl moves in small steps, a squat in big ones.
const LB = 0.45359237;
const WSCALE = {
  kg: { small: { step: 1, def: 8 }, mid: { step: 2.5, def: 20 }, big: { step: 5, def: 40 } },
  lb: { small: { step: 2.5, def: 15 }, mid: { step: 5, def: 45 }, big: { step: 10, def: 90 } },
};
const PART_SCALE = { Arms: "small", Shoulders: "small", Core: "small", Chest: "mid", Back: "mid", Legs: "big" };

// The wheel: `per` steps make one full turn, so every step is 360/per degrees.
const FIELDS = {
  kg: { per: 20, min: 0 },                           // step: see WSCALE
  reps: { step: 1, per: 20, min: 1, max: 100 },      // 20 reps per turn
  sets: { step: 1, per: 10, min: 1, max: 20 },       // 10 sets per turn
  rest: { step: 15, per: 20, min: 0, max: 900 },     // 5 min per turn
  time: { step: 15, per: 24, min: 15, max: 10800 },  // 6 min per turn
  km: { step: 0.5, per: 20, min: 0, max: 200 },      // 10 km per turn, 0 = not tracked
  level: { step: 1, per: 20, min: 0, max: 30 },      // 0 = not tracked
};
const ORDER = { reps: ["kg", "reps", "sets", "rest"], time: ["time", "km", "level"] };
const PRESETS = {
  reps: [5, 6, 8, 10, 12, 15],
  sets: [2, 3, 4, 5],
  rest: [45, 60, 90, 120, 180],
  time: [60, 300, 600, 1200, 1800, 2700],
  km: [0, 1, 2, 5, 10],
  level: [0, 4, 6, 8, 10, 12],
};

// Every word on screen. A function takes the values it shows.
const NB = " "; // French puts a non-breaking space before ? ! :
const STR = {
  en: {
    locale: "en-GB", gym: "Gym", history: "History", settings: "Settings", back: "Back", remove: "Remove",
    type: "Type a value", kind: "Reps or time", edit: "Edit",
    newTr: "New training", training: "Training", addEx: "Add exercise", start: "Start", del: "Delete",
    minimize: "Back to trainings", overview: "All exercises", setDone: "Done", skip: "Skip", restGo: "Go!",
    finish: "Finish", exName: "Exercise name", next: "Next", save: "Save", cancel: "Cancel",
    f_kg: "kg", f_reps: "reps", f_sets: "sets", f_rest: "rest", f_time: "time", f_km: "km", f_level: "level",
    bw: "bodyweight", bwShort: "BW", off: "–",
    sound: "Click sound", awake: "Keep screen on",
    dataHint: "Stored on this phone only.", export: "Export", import: "Import", wipe: "Erase all data",
    nameTplPh: "e.g. Push day", undo: "Undo",
    all: "All", addPart: "+ body part",
    Chest: "Chest", Back: "Back", Legs: "Legs", Shoulders: "Shoulders", Arms: "Arms", Core: "Core", Cardio: "Cardio",
    best: "New best!", plus: (d) => "+" + d + " vs last", same: "Same as last time", last: (v) => "Last: " + v,
    lastChip: (v) => "Last " + v,
    deleted: (n) => "Deleted “" + n + "”", removed: (n) => "Removed " + n, added: (n) => "Added " + n,
    discarded: "Nothing done, workout discarded", saved: "Workout saved",
    finishFirst: "Finish the running workout first", empty: "Add an exercise first",
    noWorkouts: "No workouts yet.", wDeleted: "Workout deleted",
    replace: (n) => "Replace what's on this phone with this backup (" + n + " workouts)?",
    imported: "Backup imported", badBackup: "That isn't a Gym Log backup",
    wipeQ: "Erase every workout and training on this phone?", erased: "Erased", saveFail: "Couldn't save on this phone",
    setOf: (i, n) => "Set " + i + "/" + n, nOfM: (i, n) => i + " / " + n, nSets: (n) => n + (n > 1 ? " sets" : " set"),
    keepQ: (n) => "Update “" + n + "” with today's changes?", keepYes: "Update plan", keepNo: "Just today",
  },
  fr: {
    locale: "fr-FR", gym: "Muscu", history: "Historique", settings: "Réglages", back: "Retour", remove: "Retirer",
    type: "Saisir une valeur", kind: "Répétitions ou durée", edit: "Modifier",
    newTr: "Nouvel entraînement", training: "Entraînement", addEx: "Ajouter un exercice", start: "Commencer", del: "Supprimer",
    minimize: "Retour aux entraînements", overview: "Tous les exercices", setDone: "Fait", skip: "Passer", restGo: "Go" + NB + "!",
    finish: "Terminer", exName: "Nom de l'exercice", next: "Suivant", save: "Enregistrer", cancel: "Annuler",
    f_kg: "kg", f_reps: "rép.", f_sets: "séries", f_rest: "repos", f_time: "durée", f_km: "km", f_level: "niveau",
    bw: "poids du corps", bwShort: "PDC", off: "–",
    sound: "Son de clic", awake: "Garder l'écran allumé",
    dataHint: "Stocké sur ce téléphone uniquement.", export: "Exporter", import: "Importer", wipe: "Tout effacer",
    nameTplPh: "ex. Haut du corps", undo: "Annuler",
    all: "Tout", addPart: "+ zone",
    Chest: "Pectoraux", Back: "Dos", Legs: "Jambes", Shoulders: "Épaules", Arms: "Bras", Core: "Abdos", Cardio: "Cardio",
    best: "Record" + NB + "!", plus: (d) => "+" + d + " vs la dernière fois", same: "Comme la dernière fois",
    last: (v) => "Dernière fois" + NB + ": " + v, lastChip: (v) => "Dernier " + v,
    deleted: (n) => "« " + n + " » supprimé", removed: (n) => n + " retiré", added: (n) => n + " ajouté",
    discarded: "Rien de fait, séance annulée", saved: "Séance enregistrée",
    finishFirst: "Termine d'abord la séance en cours", empty: "Ajoute d'abord un exercice",
    noWorkouts: "Aucune séance pour l'instant.", wDeleted: "Séance supprimée",
    replace: (n) => "Remplacer les données de ce téléphone par cette sauvegarde (" + n + " séances)" + NB + "?",
    imported: "Sauvegarde importée", badBackup: "Ce n'est pas une sauvegarde Gym Log",
    wipeQ: "Effacer toutes les séances et entraînements de ce téléphone" + NB + "?", erased: "Effacé", saveFail: "Impossible d'enregistrer sur ce téléphone",
    setOf: (i, n) => "Série " + i + "/" + n, nOfM: (i, n) => i + " / " + n, nSets: (n) => n + (n > 1 ? " séries" : " série"),
    keepQ: (n) => "Mettre à jour « " + n + " » avec les changements du jour" + NB + "?", keepYes: "Mettre à jour", keepNo: "Juste aujourd'hui",
  },
};

const STORE = "gymlog.v1";

/* ------------------------------------------------------------------ */
/*  State (this phone only)                                            */
/* ------------------------------------------------------------------ */
// trainings: the plans, each { id, name, auto, items: [item] }.
//   auto: the name follows the body parts until you rename it.
// item: { id, name, part, kind, kg, reps, sets, rest, time, km, level }
// active: the workout being done, or null. A copy of a training whose items also
//   carry done: [{ kg, reps, at }] (reps) or [{ time, km, level, at }] (time), plus
//   run: { acc, from } for the stopwatch of a timed exercise.
// workouts: finished ones, newest last.
let state = load();

function blank() {
  const nl = navigator.language || "";
  const lang = /^fr/i.test(nl) ? "fr" : "en";
  const unit = /^en-(US|LR|MM)/i.test(nl) ? "lb" : "kg";
  return { trainings: [], workouts: [], active: null, settings: { sound: true, awake: true, lang, unit } };
}

function normItem(it) {
  const kind = it.kind === "time" ? "time" : "reps";
  return {
    id: it.id || uid(), name: it.name, part: it.part || "", kind,
    kg: it.kg ?? DEFAULTS.kg, reps: it.reps ?? DEFAULTS.reps, sets: kind === "time" ? 1 : it.sets ?? DEFAULTS.sets,
    rest: it.rest ?? DEFAULTS.rest, time: it.time ?? DEFAULTS.time, km: it.km ?? 0, level: it.level ?? 0,
  };
}

// Older versions kept "templates" and logged workouts without a plan.
function migrate(v) {
  const b = blank();
  const s = { ...b, ...v, settings: { ...b.settings, ...(v.settings || {}) } };
  if (Array.isArray(v.templates)) {
    s.trainings = (s.trainings || []).concat(v.templates.map((tp) => ({ id: tp.id || uid(), name: tp.name, auto: false, items: tp.items.map(normItem) })));
    delete s.templates;
  }
  s.workouts = (s.workouts || []).map((w) => ({ ...w, items: w.items.map((it) => ({ ...it, ...normItem(it), done: it.done || [] })) }));
  if (s.active) {
    const a = s.active;
    a.items = a.items.map((it) => ({ ...it, ...normItem(it), done: it.done || [], run: it.run || null }));
    if (a.idx == null) a.idx = Math.max(0, a.items.findIndex((it) => !complete(it)));
    if (!a.phase) a.phase = a.rest ? "rest" : "ex";
    if (!a.segs) a.segs = [];
    if (!a.items.length) s.active = null;
  }
  return s;
}

function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORE);
    const v = JSON.parse(raw || "null");
    if (v && Array.isArray(v.workouts)) return migrate(v);
  } catch (e) {
    // never overwrite data we couldn't read: keep a copy to recover from
    try { if (raw) localStorage.setItem(STORE + ".unreadable-" + Date.now(), raw); } catch (e2) {}
  }
  return blank();
}

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); }
  catch (e) { toast(t("saveFail"), true); }
}

// For undo: a copy of everything before a destructive change.
const snapshot = () => JSON.stringify(state);
function restore(snap) { state = JSON.parse(snap); save(); route(); }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ------------------------------------------------------------------ */
/*  Language                                                           */
/* ------------------------------------------------------------------ */
const lang = () => (state.settings.lang === "fr" ? "fr" : "en");
function t(k, ...args) {
  const v = STR[lang()][k] ?? STR.en[k] ?? k;
  return typeof v === "function" ? v(...args) : v;
}
const partName = (p) => (p ? t(p) : "");
// Small inline icon from the sprite in index.html.
const ic = (name, cls) => '<svg class="ic' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';

/* ------------------------------------------------------------------ */
/*  Tiny DOM helpers                                                   */
/* ------------------------------------------------------------------ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const onScreen = (id) => $("#" + id).classList.contains("active");

function showScreen(id) {
  $$(".screen").forEach((s) => s.classList.remove("active"));
  $("#" + id).classList.add("active");
  $("#toast").hidden = true; // a message belongs to the screen it was shown on
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer = null;
let toastAction = null;
// action: optional { label, fn }, e.g. Undo. Toasts with an action stay a bit longer.
function toast(msg, isErr, action) {
  const el = $("#toast");
  $("#toast-msg").textContent = msg;
  const btn = $("#toast-act");
  toastAction = action ? action.fn : null;
  btn.hidden = !action;
  if (action) btn.textContent = action.label;
  el.classList.toggle("err", !!isErr);
  el.classList.toggle("high", onScreen("screen-plan") || onScreen("screen-do"));
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; toastAction = null; }, action ? 5000 : 2400);
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
  if (!state.settings.sound) return;
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + (delay || 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type || "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

// One detent of the wheel.
function click() {
  haptic();
  tone(2400, 0.025, 0.06, "triangle");
}

function beep() {
  [0, 0.22, 0.44].forEach((d, i) => tone(i === 2 ? 1320 : 880, 0.16, 0.22, "sine", d));
  if (navigator.vibrate) { try { navigator.vibrate([120, 80, 120]); } catch (e) {} }
}

// iOS only lets audio start inside a finished tap (touchend / click), not on
// touch-down or while dragging. So on each tap, until the audio is running, wake
// it and play one silent sample; after that the wheel can click while you turn it.
function unlockAudio() {
  if (!state.settings.sound) return;
  const a = audio();
  if (!a) return;
  try {
    const src = a.createBufferSource();
    src.buffer = a.createBuffer(1, 1, 22050);
    src.connect(a.destination);
    src.start(0);
  } catch (e) {}
  if (a.state === "running") {
    document.removeEventListener("touchend", unlockAudio, true);
    document.removeEventListener("click", unlockAudio, true);
  }
}
document.addEventListener("touchend", unlockAudio, true);
document.addEventListener("click", unlockAudio, true);

/* ------------------------------------------------------------------ */
/*  Formatting                                                         */
/* ------------------------------------------------------------------ */
function num(v) {
  return String(Math.round(v * 100) / 100).replace(".", lang() === "fr" ? "," : ".");
}
const unit = () => (state.settings.unit === "lb" ? "lb" : "kg");
// stored kg -> the number shown in your unit, and back
const toU = (kg) => (unit() === "lb" ? Math.round((kg / LB) * 10) / 10 : kg);
const fromU = (v) => (unit() === "lb" ? v * LB : v);
const wscale = (part) => WSCALE[unit()][PART_SCALE[part] || "mid"];
// a stored weight, in your unit: "60" or "BW"
function fmtKg(kg) { return kg ? num(toU(kg)) : t("bwShort"); }
function fmtDur(s) {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? h + ":" + String(m).padStart(2, "0") + ":" + ss : m + ":" + ss;
}
function fmtMins(ms) {
  const m = Math.round(ms / 60000);
  return m < 60 ? m + " min" : Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0");
}
function fmtVolume(kg) {
  if (unit() === "lb") { const lb = kg / LB; return lb >= 10000 ? num(Math.round(lb / 100) / 10) + "k lb" : Math.round(lb) + " lb"; }
  return kg >= 1000 ? num(Math.round(kg / 100) / 10) + " t" : Math.round(kg) + " kg";
}
// a wheel value, already in your unit
function fmtField(f, v) {
  if (f === "kg") return v ? num(v) : t("bwShort");
  if (f === "rest" || f === "time") return fmtDur(v);
  if (f === "km") return v ? num(v) : t("off");
  if (f === "level") return v ? String(v) : t("off");
  return String(v);
}
// The short line under an exercise name: "60 kg · 4×8 · ⏱1:30" or "⏱20:00 · 5 km · L8".
function specHtml(it) {
  if (it.kind === "time") {
    return ic("timer", "xs") + fmtDur(it.time) + (it.km ? " · " + num(it.km) + " km" : "") + (it.level ? " · L" + it.level : "");
  }
  return (it.kg ? fmtKg(it.kg) + " " + unit() : t("bwShort")) + " · " + it.sets + "×" + it.reps + " · " + ic("timer", "xs") + fmtDur(it.rest);
}
const key = (name) => String(name).trim().toLowerCase();
const isTimed = (name, part) => part === "Cardio" || TIMED.has(key(name));
// (a function declaration, so loading old data can use it before this line runs)
function complete(it) { return it.done.length >= (it.kind === "time" ? 1 : it.sets); }

/* ------------------------------------------------------------------ */
/*  Library: everything you've done, so repeats are one tap            */
/* ------------------------------------------------------------------ */
// name -> item values last used, plus best kg / longest time, and when.
function library() {
  const lib = new Map();
  const put = (it, at) => {
    const k = key(it.name);
    const prev = lib.get(k);
    const done = it.done || [];
    const best = Math.max(prev ? prev.best : 0, ...done.map((d) => d.kg || 0));
    if (prev && prev.at > at) { prev.best = best; return; }
    lib.set(k, { ...normItem(it), best, at });
  };
  state.trainings.forEach((tr) => tr.items.forEach((it) => put(it, 0)));
  state.workouts.forEach((w) => w.items.forEach((it) => { if (it.done.length) put(it, w.start); }));
  return lib;
}

/* ------------------------------------------------------------------ */
/*  Routing: show whatever the state says                              */
/* ------------------------------------------------------------------ */
function route() {
  if (onScreen("screen-do") && state.active) renderDo();
  else if (onScreen("screen-plan") && plan()) renderPlan();
  else if (onScreen("screen-history")) renderHistory();
  else { showScreen("screen-home"); renderHome(); }
  keepAwake();
}

/* ------------------------------------------------------------------ */
/*  Home: trainings                                                    */
/* ------------------------------------------------------------------ */
function renderHome() {
  const a = state.active;
  $("#resume").hidden = !a;
  if (a) {
    $("#resume-name").textContent = a.name;
    $("#resume-clock").textContent = fmtDur((Date.now() - a.start) / 1000);
  }
  const list = $("#tr-list");
  list.innerHTML = "";
  state.trainings.forEach((tr) => {
    if (a && a.trainingId === tr.id) return; // the green bar above already stands for it
    const el = document.createElement("div");
    el.className = "tr";
    el.innerHTML =
      '<div class="tr-main"><div class="tr-name">' + escapeHtml(tr.name) + "</div>" +
      '<div class="tr-sub">' + escapeHtml(tr.items.map((i) => i.name).join(" · ")) + "</div></div>" +
      '<button class="play" type="button" aria-label="' + t("start") + '">' + ic("play") + "</button>";
    el.querySelector(".tr-main").onclick = () => openPlan(tr.id);
    el.querySelector(".play").onclick = () => startTraining(tr.id);
    list.appendChild(el);
  });
  $("#new-tr").classList.toggle("first", !state.trainings.length);
}

$("#resume").onclick = () => { showScreen("screen-do"); renderDo(); };

$("#new-tr").onclick = () => {
  const tr = { id: uid(), name: t("training") + " " + (state.trainings.length + 1), auto: true, items: [] };
  state.trainings.push(tr);
  save();
  planId = tr.id;
  openPick("plan");
};

/* ------------------------------------------------------------------ */
/*  Plan: one training's exercises                                     */
/* ------------------------------------------------------------------ */
let planId = null;
const plan = () => state.trainings.find((x) => x.id === planId);

function autoName(tr) {
  if (!tr.auto) return;
  const parts = [];
  tr.items.forEach((it) => { if (it.part && parts.indexOf(it.part) < 0) parts.push(it.part); });
  if (parts.length) tr.name = parts.slice(0, 3).map(partName).join(" + ");
}

function openPlan(id) {
  planId = id;
  showScreen("screen-plan");
  renderPlan();
}

function renderPlan() {
  const tr = plan();
  $("#plan-name").textContent = tr.name;
  const list = $("#plan-list");
  list.innerHTML = "";
  tr.items.forEach((it) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "row-card";
    el.innerHTML =
      '<span class="rc-main"><span class="rc-name">' + escapeHtml(it.name) + '<span class="part-tag">' + escapeHtml(partName(it.part)) + "</span></span>" +
      '<span class="rc-spec">' + specHtml(it) + "</span></span>";
    el.onclick = () => openWheel({ ctx: "plan", mode: "edit", item: it });
    list.appendChild(el);
  });
  $("#plan-add").classList.toggle("first", !tr.items.length);
  $("#plan-start").disabled = !tr.items.length;
}

$("#plan-back").onclick = () => {
  const tr = plan();
  // a training you never put anything in isn't a training
  if (tr && !tr.items.length) { state.trainings = state.trainings.filter((x) => x !== tr); save(); }
  showScreen("screen-home");
  renderHome();
};
$("#plan-add").onclick = () => openPick("plan");
$("#plan-start").onclick = () => startTraining(planId);
$("#plan-name").onclick = () => askName(plan());
$("#plan-del").onclick = () => {
  const tr = plan();
  const snap = snapshot();
  state.trainings = state.trainings.filter((x) => x !== tr);
  save();
  showScreen("screen-home");
  renderHome();
  toast(t("deleted", tr.name), false, { label: t("undo"), fn: () => restore(snap) });
};

// Rename sheet.
let sheetFn = null;
function askName(tr) {
  const inp = $("#sheet-input");
  inp.value = tr.name;
  $("#sheet").hidden = false;
  sheetFn = () => {
    const name = inp.value.trim();
    if (!name) return;
    tr.name = name;
    tr.auto = false;
    save();
    closeSheet();
    renderPlan();
  };
  setTimeout(() => { inp.focus(); inp.select(); }, 50);
}
function closeSheet() { $("#sheet").hidden = true; $("#sheet-input").blur(); sheetFn = null; }
$("#sheet-ok").onclick = () => sheetFn && sheetFn();
$("#sheet-cancel").onclick = closeSheet;
$("#sheet").onclick = (e) => { if (e.target.id === "sheet") closeSheet(); };
$("#sheet-input").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); sheetFn && sheetFn(); } });

/* ------------------------------------------------------------------ */
/*  Do: the workout, one exercise at a time                            */
/* ------------------------------------------------------------------ */
function startTraining(id) {
  const tr = state.trainings.find((x) => x.id === id);
  if (!tr) return;
  if (state.active) {
    if (state.active.trainingId !== id) toast(t("finishFirst"), true);
    else { showScreen("screen-do"); renderDo(); }
    return;
  }
  if (!tr.items.length) { toast(t("empty"), true); return; }
  // src: the plan item it came from, so the finish can tell extras and removals apart
  state.active = {
    id: uid(), trainingId: tr.id, name: tr.name, start: Date.now(), idx: 0, rest: null, phase: null, segs: [],
    items: tr.items.map((it) => ({ ...normItem(it), id: uid(), src: it.id, done: [], run: null })),
  };
  setPhase("ready");
  save();
  haptic();
  showScreen("screen-do");
  renderDo();
  keepAwake();
}

const cur = () => state.active.items[state.active.idx];
const elapsed = (it) => (it.run ? it.run.acc + (it.run.from ? Date.now() - it.run.from : 0) : 0) / 1000;
// The next exercise with sets left, looking forward from the current one.
function nextOpen(from) {
  const items = state.active.items;
  for (let k = 1; k <= items.length; k++) {
    const j = (from + k) % items.length;
    if (!complete(items[j])) return j;
  }
  return -1;
}

// The session is a row of segments: "ready" (between exercises), "ex", "rest".
function setPhase(k) {
  const a = state.active;
  const now = Date.now();
  const last = a.segs[a.segs.length - 1];
  if (last && last.t1 == null) last.t1 = now;
  a.phase = k;
  if (k !== "end") a.segs.push({ k, i: a.idx, t0: now });
}

// Go to an exercise: straight back into it if it's under way, else its start screen.
function goTo(i) {
  const a = state.active;
  a.idx = i;
  a.rest = null;
  setPhase(a.items[i].done.length ? "ex" : "ready");
}

// The timeline: each block as wide as the time it took.
function lineHtml(w) {
  const segs = w.segs || [];
  if (!segs.length) return "";
  const now = Date.now();
  return segs.map((g) => {
    const d = Math.max(1, (g.t1 || w.end || now) - g.t0);
    return '<i class="tl ' + g.k + (g.t1 == null && !w.end ? " now" : "") + '" style="flex-grow:' + d + '"></i>';
  }).join("");
}

// Active time per exercise, from the "ex" blocks.
function exTimes(w) {
  const t = new Map();
  (w.segs || []).forEach((g) => { if (g.k === "ex") t.set(g.i, (t.get(g.i) || 0) + ((g.t1 || w.end || Date.now()) - g.t0)); });
  return t;
}

const BIG_C = 2 * Math.PI * 96;
function renderDo() {
  const a = state.active;
  if (!a) { showScreen("screen-home"); renderHome(); return; }
  const allDone = a.items.every(complete);
  if (allDone && a.phase !== "end" && !a.rest) setPhase("end");
  if (a.phase === "end" && !allDone) goTo(Math.max(0, nextOpen(a.items.length - 1)));

  $("#do-clock").textContent = fmtDur((Date.now() - a.start) / 1000);
  $("#do-line").innerHTML = lineHtml(a);

  const ph = a.rest ? "rest" : a.phase;
  $("#do-rest").hidden = ph !== "rest";
  $("#do-end").hidden = ph !== "end";
  $("#do-ready").hidden = ph !== "ready";
  $("#do-ex").hidden = ph !== "ex";
  if (ph === "rest") return renderRest();
  if (ph === "end") return renderEnd();

  const it = cur();
  if (ph === "ready") {
    $("#ready-count").textContent = t("nOfM", a.idx + 1, a.items.length);
    $("#ready-name").textContent = it.name;
    $("#ready-part").textContent = partName(it.part);
    $("#ready-spec").innerHTML = it.kind === "time"
      ? "<b>" + fmtDur(it.time) + "</b>" + [it.km ? num(it.km) + " km" : "", it.level ? "L" + it.level : ""].filter(Boolean).map((x) => "<small>" + x + "</small>").join("")
      : "<b>" + (it.kg ? fmtKg(it.kg) + "<em>" + unit() + "</em>" : t("bwShort")) + " × " + it.reps + "</b><small>" + t("nSets", it.sets) + "</small>";
    return;
  }

  $("#do-name").textContent = it.name;
  $("#do-part").textContent = partName(it.part);
  const big = $("#do-big");
  const main = $("#do-main");
  const doneBtn = $("#do-done");
  if (it.kind === "time") {
    const el = elapsed(it);
    const frac = Math.min(1, el / it.time);
    const over = el >= it.time;
    big.className = "do-big timed" + (over ? " over" : "");
    big.innerHTML =
      '<svg class="big-ring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="96" class="br-track"/>' +
      '<circle cx="100" cy="100" r="96" class="br-arc" style="stroke-dasharray:' + BIG_C + ";stroke-dashoffset:" + BIG_C * (1 - frac) + '"/></svg>' +
      '<span class="br-in"><b>' + fmtDur(el) + "</b><small>/ " + fmtDur(it.time) + "</small></span>";
    $("#do-sub").innerHTML = [it.km ? num(it.km) + " km" : "", it.level ? "L" + it.level : ""].filter(Boolean).join(" · ");
    const running = it.run && it.run.from;
    main.innerHTML = ic(running ? "pause" : "play", "lg");
    main.setAttribute("aria-label", running ? "pause" : t("start"));
    doneBtn.hidden = el < 1;
  } else {
    big.className = "do-big";
    big.innerHTML = "<b>" + fmtKg(it.kg) + "</b>" + (it.kg ? "<small>" + unit() + "</small>" : "") +
      '<span class="x">×</span><b>' + it.reps + "</b>";
    let dots = "";
    for (let i = 0; i < Math.max(it.sets, it.done.length); i++) {
      dots += '<button class="dot' + (i < it.done.length ? " on" : "") + '" data-i="' + i + '" type="button">' + (i < it.done.length ? ic("check") : "") + "</button>";
    }
    $("#do-sub").innerHTML = '<div class="dots">' + dots + "</div>";
    main.innerHTML = ic("check", "xl");
    main.setAttribute("aria-label", t("setDone"));
    doneBtn.hidden = true;
  }
}

function pulse(sel) {
  const m = $(sel);
  m.classList.remove("pulse");
  void m.offsetWidth;
  m.classList.add("pulse");
}

function renderRest() {
  const a = state.active;
  const r = a.rest;
  const left = (r.end - Date.now()) / 1000;
  if (left <= 0) {
    // rest is over: the next set, or the next exercise's start button
    endRest();
    beep();
    pulse(a.phase === "ready" ? "#ready-go" : "#do-main");
    return;
  }
  $("#rest-time").textContent = fmtDur(Math.ceil(left));
  const n = r.next || {};
  $("#rest-next").textContent = n.name ? n.name : n.set ? t("setOf", n.set, n.of) : "";
  const C = 2 * Math.PI * 90;
  const arc = $("#rest-arc");
  arc.style.strokeDasharray = C;
  arc.style.strokeDashoffset = C * (1 - left / r.total);
}

function endRest() {
  const a = state.active;
  const after = (a.rest && a.rest.after) || "ex";
  a.rest = null;
  setPhase(after);
  save();
  renderDo();
}

function renderEnd() {
  const a = state.active;
  $("#do-stats").innerHTML = statsHtml(workoutStats(a));
  $("#do-split").innerHTML = splitHtml(a);
}

function statsHtml(st) {
  return '<div class="stat">' + ic("timer") + "<b>" + fmtMins(st.ms) + "</b></div>" +
    '<div class="stat">' + ic("check") + "<b>" + st.sets + "</b></div>" +
    (st.volume ? '<div class="stat">' + ic("weight") + "<b>" + fmtVolume(st.volume) + "</b></div>" : "");
}

// Each exercise and how long it took.
function splitHtml(w) {
  const times = exTimes(w);
  return w.items.map((it, i) => !it.done.length ? "" :
    '<div class="sp-row"><span>' + escapeHtml(it.name) + (it.extra ? ' <i class="plus-tag">+</i>' : "") + "</span><span>" +
    (times.get(i) ? fmtDur(times.get(i) / 1000) : "") + "</span></div>").join("");
}

// Tick a set (reps) or finish a timed exercise, then rest and/or move on.
function doneSet() {
  const a = state.active;
  const it = cur();
  if (it.kind === "time") {
    const secs = Math.round(elapsed(it));
    it.run = null;
    it.done = [{ time: secs, km: it.km, level: it.level, at: Date.now() }];
  } else {
    it.done.push({ kg: it.kg, reps: it.reps, at: Date.now() });
  }
  haptic();
  const finished = complete(it);
  const nxt = finished ? nextOpen(a.idx) : a.idx;
  if (nxt < 0) {
    a.rest = null;
    setPhase("end");
  } else {
    const restSecs = it.kind === "time" ? 0 : it.rest;
    const after = finished ? "ready" : "ex";
    a.idx = nxt;
    if (restSecs) {
      a.rest = { end: Date.now() + restSecs * 1000, total: restSecs, after,
        next: finished ? { name: a.items[nxt].name } : { set: it.done.length + 1, of: it.sets } };
      setPhase("rest");
    } else setPhase(after);
  }
  save();
  renderDo();
}

$("#ready-go").onclick = () => {
  const it = cur();
  setPhase("ex");
  // a timed exercise starts its stopwatch on the same tap
  if (it.kind === "time" && !(it.run && it.run.from)) it.run = { acc: it.run ? it.run.acc : 0, from: Date.now() };
  haptic();
  save();
  renderDo();
};
$("#ready-spec").onclick = () => openWheel({ ctx: "do", mode: "edit", item: cur() });

$("#do-main").onclick = () => {
  const it = cur();
  if (it.kind === "time") {
    // play / pause the stopwatch
    if (!it.run) it.run = { acc: 0, from: null };
    if (it.run.from) { it.run.acc += Date.now() - it.run.from; it.run.from = null; }
    else it.run.from = Date.now();
    haptic();
    save();
    renderDo();
  } else doneSet();
};
$("#do-done").onclick = doneSet;
$("#do-big").onclick = () => openWheel({ ctx: "do", mode: "edit", item: cur() });

// tap a ticked dot to untick it
$("#do-sub").addEventListener("click", (e) => {
  const dot = e.target.closest(".dot");
  if (!dot) return;
  const it = cur();
  const i = +dot.dataset.i;
  if (i < it.done.length) it.done.length = i;
  else for (let k = it.done.length; k <= i; k++) it.done.push({ kg: it.kg, reps: it.reps, at: Date.now() });
  haptic();
  save();
  renderDo();
});

function adjustRest(d) {
  const r = state.active.rest;
  r.end = Math.max(Date.now() + 1000, r.end + d * 1000);
  r.total = Math.max(r.total + d, 1);
  save(); haptic(); renderRest();
}
$("#rest-plus").onclick = () => adjustRest(15);
$("#rest-minus").onclick = () => adjustRest(-15);
$("#rest-skip").onclick = () => { haptic(); endRest(); };

$("#do-min").onclick = () => { showScreen("screen-home"); renderHome(); };

// swipe left / right to move between exercises
(function swipe() {
  ["#do-ex", "#do-ready"].forEach((sel) => {
    const el = $(sel);
    let s = null;
    el.addEventListener("touchstart", (e) => { const p = e.touches[0]; s = { x: p.clientX, y: p.clientY }; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (!s || !state.active) return;
      const p = e.changedTouches[0];
      const dx = p.clientX - s.x, dy = p.clientY - s.y;
      s = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const a = state.active;
      const j = a.idx + (dx < 0 ? 1 : -1);
      if (j < 0 || j >= a.items.length) return;
      goTo(j);
      save();
      haptic();
      renderDo();
      const shown = a.phase === "ready" ? $("#do-ready") : $("#do-ex");
      shown.classList.remove("slide-l", "slide-r");
      void shown.offsetWidth;
      shown.classList.add(dx < 0 ? "slide-l" : "slide-r");
    });
  });
})();

// Overview sheet: every exercise, jump to one, add one, finish.
function openOver() {
  const a = state.active;
  const list = $("#over-list");
  list.innerHTML = "";
  a.items.forEach((it, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "over-row" + (i === a.idx ? " cur" : "") + (complete(it) ? " done" : "");
    const prog = it.kind === "time" ? (complete(it) ? ic("check") : "") : it.done.length + "/" + it.sets;
    b.innerHTML = '<span class="or-name">' + escapeHtml(it.name) + (it.extra ? ' <i class="plus-tag">+</i>' : "") + '</span><span class="or-prog">' + prog + "</span>";
    b.onclick = () => { goTo(i); save(); closeOver(); renderDo(); };
    list.appendChild(b);
  });
  $("#sheet-over").hidden = false;
}
function closeOver() { $("#sheet-over").hidden = true; }
$("#do-list").onclick = openOver;
$("#sheet-over").onclick = (e) => { if (e.target.id === "sheet-over") closeOver(); };
$("#over-add").onclick = () => { closeOver(); openPick("do"); };
$("#over-finish").onclick = () => { closeOver(); finishWorkout(); };
$("#do-finish").onclick = finishWorkout;

function workoutStats(w) {
  let sets = 0, volume = 0;
  w.items.forEach((it) => it.done.forEach((d) => { sets++; volume += (d.kg || 0) * (d.reps || 0); }));
  return { sets, volume, ms: (w.end || Date.now()) - w.start };
}

function finishWorkout() {
  const a = state.active;
  const snap = snapshot();
  // a stopwatch still running counts up to now
  a.items.forEach((it) => { if (it.kind === "time" && !it.done.length && elapsed(it) >= 1) it.done = [{ time: Math.round(elapsed(it)), km: it.km, level: it.level, at: Date.now() }]; it.run = null; });
  const st = workoutStats(a);
  state.active = null;
  if (!st.sets) {
    save();
    showScreen("screen-home");
    renderHome();
    keepAwake();
    toast(t("discarded"), false, { label: t("undo"), fn: () => { restore(snap); showScreen("screen-do"); renderDo(); } });
    return;
  }
  a.end = Date.now();
  const last = a.segs[a.segs.length - 1];
  if (last && last.t1 == null) last.t1 = a.end;
  delete a.rest;
  delete a.idx;
  delete a.phase;
  state.workouts.push(a);
  save();
  showScreen("screen-home");
  renderHome();
  keepAwake();

  const tr = state.trainings.find((x) => x.id === a.trainingId);
  if (!tr) { toast(t("saved")); return; }
  // what changed against the plan today: exercises added, exercises dropped
  const kept = new Set(a.items.map((it) => it.src).filter(Boolean));
  const added = a.items.filter((it) => !it.src);
  const dropped = tr.items.filter((it) => !kept.has(it.id));
  if (!added.length && !dropped.length) { learn(tr, a, false); toast(t("saved")); return; }
  $("#keep-q").textContent = t("keepQ", tr.name);
  $("#keep-list").innerHTML =
    added.map((it) => '<div class="kl add">+ ' + escapeHtml(it.name) + "</div>").join("") +
    dropped.map((it) => '<div class="kl drop">− ' + escapeHtml(it.name) + "</div>").join("");
  $("#sheet-keep").hidden = false;
  const done = (keep) => { $("#sheet-keep").hidden = true; learn(tr, a, keep); save(); renderHome(); toast(t("saved")); };
  $("#keep-yes").onclick = () => done(true);
  $("#keep-no").onclick = () => done(false);
  $("#sheet-keep").onclick = (e) => { if (e.target.id === "sheet-keep") done(false); };
}

// The plan learns: next time starts from the weights and reps you used today.
// keep: also take today's added / dropped exercises and their order into the plan.
function learn(tr, w, keep) {
  const plain = (it, id) => normItem({ ...it, id });
  if (keep) { tr.items = w.items.map((it) => plain(it, it.src)); return; }
  const used = new Map(w.items.filter((it) => it.src).map((it) => [it.src, it]));
  tr.items = tr.items.map((pi) => (used.has(pi.id) ? plain(used.get(pi.id), pi.id) : pi));
}

setInterval(() => {
  const a = state.active;
  if (!a) return;
  if (onScreen("screen-do")) {
    $("#do-clock").textContent = fmtDur((Date.now() - a.start) / 1000);
    $("#do-line").innerHTML = lineHtml(a);
    if (a.rest) renderRest();
    else {
      const it = cur();
      if (a.phase === "ex" && it && it.kind === "time" && it.run && it.run.from) {
        const was = it._over;
        renderDo();
        // one beep when the target time is reached
        if (!was && elapsed(it) >= it.time) { it._over = true; beep(); }
      }
    }
  } else if (onScreen("screen-home")) {
    $("#resume-clock").textContent = fmtDur((Date.now() - a.start) / 1000);
  }
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
  if (!document.hidden && state.active && onScreen("screen-do")) renderDo();
});

/* ------------------------------------------------------------------ */
/*  Pick an exercise                                                   */
/* ------------------------------------------------------------------ */
let pickPart = "";
let pickCtx = "plan"; // "plan": into the training; "do": into the running workout

function openPick(ctx) {
  pickCtx = ctx;
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
    b.textContent = p ? t(p) : t("all");
    b.onclick = () => { pickPart = p; haptic(); renderParts(); renderSuggest(); };
    wrap.appendChild(b);
  });
}

function partOf(name) {
  const k = key(name);
  return PARTS.find((p) => ["en", "fr"].some((l) => STARTERS[l][p].some((s) => key(s) === k))) || "";
}

function pickItems() {
  return pickCtx === "do" ? state.active.items : plan() ? plan().items : [];
}

function renderSuggest() {
  const q = key($("#ex-name").value);
  $("#name-next").hidden = !q;
  const lib = library();
  const taken = new Set(pickItems().map((i) => key(i.name)));
  const match = (name, part) => (q ? key(name).includes(q) : !pickPart || part === pickPart);

  const recent = Array.from(lib.values())
    .filter((e) => match(e.name, e.part) && !taken.has(key(e.name)))
    .sort((a, b) => b.at - a.at);
  const known = new Set(Array.from(lib.keys()));
  const ideas = [];
  (pickPart && !q ? [pickPart] : PARTS).forEach((p) =>
    STARTERS[lang()][p].forEach((n) => {
      if (!known.has(key(n)) && !taken.has(key(n)) && match(n, p)) ideas.push({ name: n, part: p });
    })
  );

  const list = $("#suggest");
  list.innerHTML = "";
  const row = (name, right, cls, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sg " + cls;
    b.innerHTML = '<span class="sg-name">' + escapeHtml(name) + '</span><span class="sg-last">' + right + "</span>";
    b.onclick = fn;
    list.appendChild(b);
  };
  recent.slice(0, 12).forEach((e) => row(e.name, specHtml(e), "recent", () => openWheel({ ctx: pickCtx, mode: "known", vals: e, last: e })));
  ideas.forEach((e) => row(e.name, escapeHtml(t(e.part)), "", () => openWheel({ ctx: pickCtx, mode: "new", name: e.name, part: e.part })));
}

function pickTyped() {
  const name = $("#ex-name").value.trim();
  if (!name) return;
  const e = library().get(key(name));
  if (e) openWheel({ ctx: pickCtx, mode: "known", vals: e, last: e });
  else openWheel({ ctx: pickCtx, mode: "new", name: name.charAt(0).toUpperCase() + name.slice(1), part: pickPart || partOf(name) });
}

$("#ex-name").addEventListener("input", renderSuggest);
$("#ex-name").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); pickTyped(); } });
$("#name-next").onclick = pickTyped;
$("#pick-back").onclick = backFromPick;
function backFromPick() {
  if (pickCtx === "do") { showScreen("screen-do"); renderDo(); return; }
  const tr = plan();
  if (tr && !tr.items.length) { state.trainings = state.trainings.filter((x) => x !== tr); save(); showScreen("screen-home"); renderHome(); return; }
  openPlan(planId);
}

/* ------------------------------------------------------------------ */
/*  The wheel                                                          */
/* ------------------------------------------------------------------ */
// ctx: "plan" or "do" — where the exercise lives and where we go back to.
// mode: "new" walks through every field; "known" is prefilled from last time, one
// tap adds it; "edit" changes an exercise already in the plan or the workout.
let W = null;

function openWheel(o) {
  const src = o.item || o.vals || null;
  const name = src ? src.name : o.name;
  const part = src ? src.part : o.part || "";
  const kind = src ? src.kind : isTimed(name, part) ? "time" : "reps";
  const vals = { ...DEFAULTS, ...(src ? normItem(src) : {}) };
  if (!src && TIMED.has(key(name))) vals.time = 60; // a plank isn't ten minutes
  // the wheel works in your unit; a new exercise starts at a weight that suits its body part
  vals.kg = src ? toU(vals.kg) : wscale(part).def;
  let last = o.last || library().get(key(name)) || null;
  if (last) last = { ...last, kg: toU(last.kg), best: toU(last.best || 0) };
  W = {
    ctx: o.ctx, mode: o.mode, item: o.item || null, name, part, kind, vals,
    kg0: src ? { u: vals.kg, kg: src.kg } : null, last,
    field: ORDER[kind][0],
    seen: new Set(o.mode === "new" ? [ORDER[kind][0]] : [...ORDER.reps, ...ORDER.time]),
  };
  $("#wheel-name").textContent = W.name;
  $("#wheel-del").hidden = W.mode !== "edit";
  $("#wheel-kind").hidden = W.mode === "edit" && W.ctx === "do" && W.item.done.length > 0;
  closeInput(false);
  showScreen("screen-wheel");
  buildFields();
  buildTicks();
  renderWheel();
}

// FIELDS, with the weight step that suits this exercise's body part
function fieldCfg(f) {
  if (f !== "kg") return FIELDS[f];
  return { ...FIELDS.kg, step: wscale(W.part).step, max: unit() === "lb" ? 1100 : 500 };
}

function buildFields() {
  const wrap = $("#fields");
  wrap.innerHTML = "";
  wrap.style.gridTemplateColumns = "repeat(" + ORDER[W.kind].length + ", 1fr)";
  ORDER[W.kind].forEach((f) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "fcell";
    b.dataset.f = f;
    b.innerHTML = '<span class="fl">' + (f === "kg" ? unit() : t("f_" + f)) + "</span><b></b>";
    b.onclick = () => { setField(f); haptic(); };
    wrap.appendChild(b);
  });
  $("#wheel-kind-use").setAttribute("href", W.kind === "time" ? "#i-timer" : "#i-weight");
}

const lastStep = () => ORDER[W.kind].indexOf(W.field) === ORDER[W.kind].length - 1;

function renderWheel() {
  const f = W.field;
  const cfg = fieldCfg(f);
  const v = W.vals[f];

  $("#wheel-part").textContent = W.part ? t(W.part) : t("addPart");
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

  const lastV = W.last && W.last.kind === W.kind ? W.last[f] : null;
  const lastDot = $("#w-last");
  lastDot.style.display = lastV ? "" : "none";
  if (lastV) placeOnRing(lastDot, (lastV / rev) % 1 || 1);

  $("#w-value").textContent = fmtField(f, v);
  $("#w-unit").textContent = f === "kg" ? (v ? unit() : t("bw")) : t("f_" + f);

  // the note under the number: how this compares to last time
  let note = "";
  let beat = false;
  if (lastV != null && ["kg", "reps", "time", "km", "level"].includes(f)) {
    if (f === "kg" && W.last.best && v > W.last.best) { note = t("best"); beat = true; }
    else if (v > lastV) { note = t("plus", f === "time" ? fmtDur(v - lastV) : num(v - lastV)); beat = true; }
    else if (v === lastV) note = t("same");
    else note = t("last", fmtField(f, lastV));
  }
  $("#w-note").textContent = note;
  $("#wheel").classList.toggle("beat", beat);

  renderPresets();
  const goNext = W.mode === "new" && !lastStep();
  $("#wheel-go-use").setAttribute("href", goNext ? "#i-next" : "#i-check");
  $("#wheel-go").setAttribute("aria-label", goNext ? t("next") : t("save"));
}

function placeOnRing(el, frac) {
  const a = frac * 2 * Math.PI - Math.PI / 2;
  el.setAttribute("cx", 150 + 128 * Math.cos(a));
  el.setAttribute("cy", 150 + 128 * Math.sin(a));
}

// One small tick per step, like detents on a click wheel.
function buildTicks() {
  const per = fieldCfg(W.field).per;
  let html = "";
  for (let i = 0; i < per; i++) {
    const a = (i / per) * 2 * Math.PI - Math.PI / 2;
    const c = Math.cos(a), s = Math.sin(a);
    html += '<line class="w-tick" x1="' + (150 + 100 * c) + '" y1="' + (150 + 100 * s) + '" x2="' + (150 + 106 * c) + '" y2="' + (150 + 106 * s) + '"/>';
  }
  $("#w-ticks").innerHTML = html;
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
      if (advance && W.mode === "new" && !lastStep()) setTimeout(nextField, 140);
    };
    wrap.appendChild(b);
  };
  if (f === "kg") {
    const st = fieldCfg("kg").step;
    chip("−" + num(st * 2), Math.max(0, v - st * 2), "nudge");
    chip("−" + num(st), Math.max(0, v - st), "nudge");
    if (W.last && W.last.kind === "reps" && W.last.kg !== v) chip(t("lastChip", fmtField("kg", W.last.kg)), W.last.kg, "");
    else chip(t("bwShort"), 0, "");
    chip("+" + num(st), v + st, "nudge");
    chip("+" + num(st * 2), v + st * 2, "nudge");
  } else {
    PRESETS[f].forEach((p) => chip(fmtField(f, p), p, "", true));
  }
}

function setVal(v, fromTap) {
  const cfg = fieldCfg(W.field);
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
  const o = ORDER[W.kind];
  const i = o.indexOf(W.field);
  if (i < o.length - 1) { setField(o[i + 1]); haptic(); }
}

$("#wheel-part").onclick = () => {
  // tap the tag to cycle the body part
  const i = PARTS.indexOf(W.part);
  const was = wscale(W.part).def;
  W.part = i < 0 ? PARTS[0] : i === PARTS.length - 1 ? "" : PARTS[i + 1];
  // an untouched starting weight follows the new body part
  if (W.mode === "new" && W.vals.kg === was) W.vals.kg = wscale(W.part).def;
  haptic();
  renderWheel();
};

$("#wheel-kind").onclick = () => {
  // reps ↔ time
  W.kind = W.kind === "time" ? "reps" : "time";
  W.field = ORDER[W.kind][0];
  W.seen.add(W.field);
  haptic();
  buildFields();
  buildTicks();
  renderWheel();
};

$("#wheel-go").onclick = () => {
  closeInput(true);
  if (W.mode === "new" && !lastStep()) return nextField();
  commitWheel();
};

function leaveWheel() {
  closeInput(false);
  if (W.ctx === "do") { showScreen("screen-do"); renderDo(); }
  else if (W.mode === "edit") openPlan(planId);
  else openPick(W.ctx);
}
$("#wheel-back").onclick = leaveWheel;

$("#wheel-del").onclick = () => {
  const snap = snapshot();
  if (W.ctx === "do") {
    const a = state.active;
    const i = a.items.indexOf(W.item);
    a.items.splice(i, 1);
    if (!a.items.length) state.active = null;
    else a.idx = Math.min(a.idx, a.items.length - 1);
  } else {
    plan().items = plan().items.filter((it) => it !== W.item);
  }
  save();
  const name = W.name;
  if (W.ctx === "do" && state.active) { showScreen("screen-do"); renderDo(); }
  else if (W.ctx === "do") { showScreen("screen-home"); renderHome(); }
  else openPlan(planId);
  toast(t("removed", name), false, { label: t("undo"), fn: () => restore(snap) });
};

function commitWheel() {
  const v = { ...W.vals, name: W.name, part: W.part, kind: W.kind };
  // back to kg; an unchanged weight keeps its exact stored value
  v.kg = W.kg0 && W.kg0.u === v.kg ? W.kg0.kg : fromU(v.kg);
  if (W.kind === "time") v.sets = 1;
  if (W.mode === "edit") {
    Object.assign(W.item, normItem({ ...v, id: W.item.id }));
    if (W.ctx === "do") W.item._over = false;
  } else if (W.ctx === "do") {
    // an extra for today: the finish asks whether it joins the plan
    const a = state.active;
    const wasDone = a.items.every(complete);
    a.items.push({ ...normItem(v), extra: true, done: [], run: null });
    if (wasDone || a.phase === "ready") goTo(a.items.length - 1);
  } else {
    const tr = plan();
    tr.items.push(normItem(v));
    autoName(tr);
  }
  if (W.part) pickPart = W.part;
  save();
  if (W.ctx === "do") { showScreen("screen-do"); renderDo(); }
  else openPlan(planId);
  if (W.mode !== "edit") toast(t("added", W.name));
}

/* turning: the angle your finger moves around the centre becomes steps */
(function wheelGestures() {
  const el = $("#wheel");
  let drag = null;

  const angleAt = (e) => {
    const r = el.querySelector("svg").getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  };

  el.addEventListener("pointerdown", (e) => {
    // the middle is for typing; everything around it turns
    if (!W || !$("#w-input").hidden || e.target.closest("#w-center")) return;
    drag = { id: e.pointerId, last: angleAt(e), acc: 0 };
    el.setPointerCapture(e.pointerId);
    el.classList.add("turning");
    e.preventDefault();
  });

  el.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const a = angleAt(e);
    let d = a - drag.last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    drag.last = a;
    drag.acc += d;
    const cfg = fieldCfg(W.field);
    const deg = 360 / cfg.per;
    while (Math.abs(drag.acc) >= deg) {
      const dir = Math.sign(drag.acc);
      drag.acc -= dir * deg;
      // land on the step grid, so 44.1 lb turns to 45, not 46.6
      const q = W.vals[W.field] / cfg.step;
      const to = (dir > 0 ? Math.floor(q + 1e-6) + 1 : Math.ceil(q - 1e-6) - 1) * cfg.step;
      if (setVal(to, false)) click();
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
  const v = W.vals[f];
  inp.value = (f === "kg" || f === "km" || f === "level") && !v ? "" : fmtField(f, v);
  inp.placeholder = f === "rest" || f === "time" ? "m:ss" : f === "kg" ? unit() : t("f_" + f);
  inp.inputMode = f === "kg" || f === "km" ? "decimal" : f === "rest" || f === "time" ? "text" : "numeric";
  inp.hidden = false;
  inp.focus();
  inp.select();
};

function parseTyped(f, s) {
  s = String(s).trim().replace(",", ".");
  if (!s) return f === "kg" || f === "km" || f === "level" ? 0 : null;
  if (f === "rest" || f === "time") {
    if (s.includes(":")) {
      const p = s.split(":").map((x) => parseInt(x, 10) || 0);
      return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
    }
    const n = parseFloat(s);
    if (isNaN(n)) return null;
    // a small number means minutes ("2" = 2 min), a big one seconds
    return f === "time" ? (n <= 300 ? Math.round(n * 60) : Math.round(n)) : n < 10 ? Math.round(n * 60) : Math.round(n);
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : f === "kg" || f === "km" ? n : Math.round(n);
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
/*  History                                                            */
/* ------------------------------------------------------------------ */
function doneLine(it) {
  if (it.kind === "time") {
    const d = it.done[0];
    return ic("timer", "xs") + fmtDur(d.time) + (d.km ? " · " + num(d.km) + " km" : "") + (d.level ? " · L" + d.level : "");
  }
  const top = Math.max(...it.done.map((x) => x.kg || 0));
  const reps = it.done.map((x) => x.reps);
  const same = reps.every((r) => r === reps[0]);
  return (same ? it.done.length + "×" + reps[0] : reps.join("/")) + (top ? " · " + fmtKg(top) + " " + unit() : "");
}

function renderHistory() {
  const wrap = $("#hist-list");
  wrap.innerHTML = "";
  if (!state.workouts.length) {
    wrap.innerHTML = '<div class="empty">' + t("noWorkouts") + "</div>";
    return;
  }
  let month = "";
  state.workouts.slice().reverse().forEach((w) => {
    const d = new Date(w.start);
    const m = d.toLocaleDateString(t("locale"), { month: "long", year: "numeric" });
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
    el.innerHTML =
      '<div class="hw-top"><span class="hw-date">' +
      escapeHtml(d.toLocaleDateString(t("locale"), { weekday: "short", day: "numeric", month: "short" })) +
      (w.name ? ' <span class="hw-name">' + escapeHtml(w.name) + "</span>" : "") +
      '</span><span class="hw-meta">' + statsHtml(st) + "</span></div>" +
      (w.segs && w.segs.length ? '<div class="timeline small">' + lineHtml(w) + "</div>" : "") +
      w.items.filter((it) => it.done.length).map((it) =>
        '<div class="hw-ex"><span>' + escapeHtml(it.name) + (it.extra ? ' <i class="plus-tag">+</i>' : "") + "</span><span>" + doneLine(it) + "</span></div>").join("") +
      '<div class="hw-acts"><button class="mini-btn rep" type="button" aria-label="' + t("start") + '">' + ic("again") + "</button>" +
      '<button class="mini-btn del" type="button" aria-label="' + t("del") + '">' + ic("trash") + "</button></div>";
    el.querySelector(".rep").onclick = () => {
      if (state.active) { toast(t("finishFirst"), true); return; }
      // do it again: its training if it still exists, else a new one from it
      let tr = state.trainings.find((x) => x.id === w.trainingId);
      if (!tr) {
        tr = { id: uid(), name: w.name || t("training"), auto: false, items: w.items.map((it) => normItem({ ...it, id: undefined })) };
        state.trainings.push(tr);
      }
      startTraining(tr.id);
    };
    el.querySelector(".del").onclick = () => {
      const snap = snapshot();
      state.workouts = state.workouts.filter((x) => x !== w);
      save(); renderHistory();
      toast(t("wDeleted"), false, { label: t("undo"), fn: () => restore(snap) });
    };
    wrap.appendChild(el);
  });
}

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */
function renderSettings() {
  $$("#opt-lang button").forEach((b) => b.classList.toggle("on", b.dataset.v === lang()));
  $$("#opt-unit button").forEach((b) => b.classList.toggle("on", b.dataset.v === unit()));
  $("#opt-sound").classList.toggle("on", state.settings.sound);
  $("#opt-awake").classList.toggle("on", state.settings.awake);
}
$$("#opt-lang button").forEach((b) => (b.onclick = () => { state.settings.lang = b.dataset.v; save(); haptic(); applyLang(); renderSettings(); }));
$$("#opt-unit button").forEach((b) => (b.onclick = () => { state.settings.unit = b.dataset.v; save(); haptic(); renderSettings(); }));
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
    if (!v || !Array.isArray(v.workouts)) throw new Error("bad");
    if (!confirm(t("replace", v.workouts.length))) return;
    const snap = snapshot();
    state = migrate(v);
    save();
    applyLang();
    toast(t("imported"), false, { label: t("undo"), fn: () => restore(snap) });
  } catch (err) {
    toast(t("badBackup"), true);
  }
};
$("#wipe").onclick = () => {
  if (!confirm(t("wipeQ"))) return;
  const snap = snapshot();
  const keep = state.settings;
  state = blank();
  state.settings = keep;
  save();
  renderSettings();
  toast(t("erased"), false, { label: t("undo"), fn: () => restore(snap) });
};

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */
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
/*  Language (Settings)                                                */
/* ------------------------------------------------------------------ */
function applyLang() {
  document.documentElement.lang = lang();
  $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  // whatever is on screen re-renders in the new language
  renderHome();
  if (onScreen("screen-pick")) { renderParts(); renderSuggest(); }
  if (onScreen("screen-wheel") && W) { buildFields(); renderWheel(); }
  if (onScreen("screen-plan") && plan()) renderPlan();
  if (onScreen("screen-do") && state.active) renderDo();
  if (onScreen("screen-history")) renderHistory();
}

/* ------------------------------------------------------------------ */
/*  Boot                                                               */
/* ------------------------------------------------------------------ */
save(); // stores the migrated shape
applyLang();
// a workout left running opens straight on it
if (state.active) { showScreen("screen-do"); renderDo(); }
keepAwake();
// ask the browser not to clear our data when space runs low
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

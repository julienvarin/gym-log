# Gym Log 🏋️

Log your gym sets in as few taps as possible — a home-screen web app (PWA) hosted on
GitHub Pages, in the same style as [Saver](https://github.com/julienvarin/saver).

**Two modes.**

Home has one switch at the top: **Train** or **Plan**.

- **Plan** — your trainings, each with ✎ to edit it. **+ Plan a training** makes a new one:
  add exercises and set each one on the wheel. Nothing is timed while you plan.
- **Train** — tap a training to start it. The one you've gone longest without doing sits
  on top, marked *Up next*. While a workout runs, home shows only that workout.
- **Do** — once started: A big session clock sits on top, with a timeline under it
  that splits the session into blocks: each exercise, each rest, to scale. Every exercise
  starts on its own screen — name, weight × reps, sets — and one big **▶**. Each ✓ ticks a set
  and turns the screen into the rest countdown (−15 / skip / +15), which beeps and hands back.
  After the last set you rest, then tap ▶ for the next exercise. Three round buttons sit at
  the bottom of every screen: blue ⇅ **do it later** (machine taken: the next one comes first),
  amber ⏭ **skip** this exercise, red ■ **end now** (the rest is skipped, you land on the
  summary; Undo brings it back). Swipe left / right to jump; ☰ lists every exercise — tap one
  to do it now (it moves up in the order) — adds one you forgot, or finishes. Weights read
  reps first: **10 × 20 kg**. **⌄** goes back to your trainings while the
  workout keeps running (a green bar brings you back). The end screen shows how long each
  exercise took.
- **Changes on the day.** An exercise you add during a workout is marked **+** and kept in the
  history. When you finish, if you added or removed exercises, one question: **Update plan**
  or **Just today**. Either way the plan keeps the weights and reps you used.

**Reps or time.** Weight exercises log kg × reps × sets with a rest. Timed ones (everything in
Cardio, planks) log a duration, plus a distance and/or a machine level if you set them; in Do
mode they're a stopwatch (▶ / ⏸, ✓ when done) with a ring that fills up to your target. The
icon at the top of the wheel switches an exercise between the two.

**The wheel.** Turn the ring like an iPod click wheel; every tick is one step (2.5 kg, 1 rep,
1 set, 15 s, 0.5 km, 1 level). The weight step follows the body part: 1 kg for arms,
shoulders and core, 2.5 kg for chest and back, 5 kg for legs (2.5 / 5 / 10 lb), and a new
exercise starts at a weight that suits it. Tap the number to type it. The chips are shortcuts and jump to
the next field. An exercise you've done before comes back with last time's values; the ring
turns green when you beat them.

**The plan learns.** When you finish, the training keeps the values you actually used, so
next time starts from there.

**Settings (⚙).** English / Français, kg / lb, click sound, keep screen on, backup. History (📊) shows every
finished workout; ↻ does one again.

No build step, no framework, no account — plain HTML/CSS/JS.

## Your data

Everything is stored **on your phone only** (browser storage). Nothing is sent anywhere.
Use **Settings → Export** now and then, and **Import** it on a new phone. Clearing Safari's
website data, or deleting the home-screen app, erases it.

## About haptics on iPhone

Safari doesn't support the web vibration API. On **iOS 18 and later** the app plays the
system haptic through a trick (toggling a hidden switch control), so you feel the wheel's
ticks; on older iOS you get the click sound only. Android vibrates normally. The
rest-timer beep can't vibrate an iPhone, and while the screen is locked it can't play at
all — that's why the app keeps the screen on during a workout (⚙ to turn off).

## Deploy to GitHub Pages

The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publishes
the site on every push to `main`. After merging, the app is live at
`https://julienvarin.github.io/gym-log/`. If the first run asks you to enable Pages, go to
**Settings → Pages**, set **Source = GitHub Actions**, and re-run it.

## Add it to your iPhone home screen

Open the URL in **Safari** → **Share** → **Add to Home Screen**. It opens full-screen like
a native app.

## Customising

- **Exercise ideas / body parts:** `PARTS` and `STARTERS` at the top of [`js/app.js`](js/app.js).
- **Wording, in both languages:** `STR` just below.
- **Wheel steps and chips:** `FIELDS`, `WSCALE` / `PART_SCALE` (weight per body part) and `PRESETS`.
- **Colours / look:** the CSS variables at the top of [`css/style.css`](css/style.css).
- **App icon:** re-run `python3 scripts/gen_icons.py` after tweaking the colours there.
- After changing any file, bump `CACHE` in [`sw.js`](sw.js) so phones pick up the update.

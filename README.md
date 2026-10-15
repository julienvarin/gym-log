# Gym Log 🏋️

Log your gym sets in as few taps as possible — a home-screen web app (PWA) hosted on
GitHub Pages, in the same style as [Saver](https://github.com/julienvarin/saver).

**Two modes.**

- **Plan** — Home lists your trainings. Tap **+** for a new one, or tap a training to edit it:
  add exercises and set each one on the wheel. Nothing is timed while you plan.
- **Do** — Tap **▶** on a training. The screen is just the current exercise: the weight × reps,
  one dot per set and one big **✓**. Each ✓ turns the whole screen into the rest countdown
  (−15 / skip / +15), which beeps and hands back when it's over. After the last set it moves on
  to the next exercise; swipe left / right to jump. A small clock in the corner shows the
  total time; ☰ lists every exercise, adds one, or finishes. **⌄** goes back to your trainings
  while the workout keeps running (a green bar brings you back).

**Reps or time.** Weight exercises log kg × reps × sets with a rest. Timed ones (everything in
Cardio, planks) log a duration, plus a distance and/or a machine level if you set them; in Do
mode they're a stopwatch (▶ / ⏸, ✓ when done) with a ring that fills up to your target. The
icon at the top of the wheel switches an exercise between the two.

**The wheel.** Turn the ring like an iPod click wheel; every tick is one step (2.5 kg, 1 rep,
1 set, 15 s, 0.5 km, 1 level). Tap the number to type it. The chips are shortcuts and jump to
the next field. An exercise you've done before comes back with last time's values; the ring
turns green when you beat them.

**The plan learns.** When you finish, the training keeps the values you actually used, so
next time starts from there.

**English / Français.** Tap the round flag on the home screen. History (📊) shows every
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
- **Wheel steps and chips:** `FIELDS` and `PRESETS` just below.
- **Colours / look:** the CSS variables at the top of [`css/style.css`](css/style.css).
- **App icon:** re-run `python3 scripts/gen_icons.py` after tweaking the colours there.
- After changing any file, bump `CACHE` in [`sw.js`](sw.js) so phones pick up the update.

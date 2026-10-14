# Gym Log 🏋️

Log your gym sets in as few taps as possible — a home-screen web app (PWA) hosted on
GitHub Pages, in the same style as [Saver](https://github.com/julienvarin/saver).

**The flow:** Start workout → pick an exercise → spin the wheel → Add. Then tap the big
round button each time you finish a set; the rest timer starts on its own.

- **The wheel.** Weight, reps, sets and rest are on one screen. Turn the ring like an iPod
  click wheel: every tick is one step (2.5 kg, 1 rep, 1 set, 15 s), with a haptic tick and a
  click sound. One full turn is 50 kg / 20 reps / 10 sets / 5 min. Tap the number in the
  middle to type it instead. The chips under it are shortcuts (8 · 10 · 12 reps, 3 · 4 · 5
  sets, 1:30 rest…) and jump straight to the next field.
- **Last time.** An exercise you've done before comes back with last time's values, so
  adding it is two taps. The yellow dot on the ring is last time; the ring turns green
  when you beat it, and says *New best!* past your heaviest set.
- **Body parts.** Filter exercises by Chest, Back, Legs… Tap the tag next to the name on
  the wheel screen to change it.
- **Sets.** Each exercise shows a dot per set. The round button ticks the next one; tap a
  dot to tick up to it, or tap a ticked dot to untick. Tap the exercise to change its
  weight / reps / sets, or remove it.
- **Rest timer.** Starts when you tick a set, with −15 / +15 / Skip. It beeps when rest is
  over (sounds mix with your music instead of pausing it).
- **Trainings.** *Save as training* stores the workout's exercises. Start one from the home
  screen — it fills in the values you used last time. From History, *Do again* repeats any
  past workout.
- **History.** Every finished workout with time, sets and total weight lifted.
- **English / Français.** Tap the round flag at the top of the home screen to switch. It
  starts in French if your phone is set to French. Exercise ideas come in both languages.

No build step, no framework, no account — plain HTML/CSS/JS.

## Your data

Everything is stored **on your phone only** (browser storage). Nothing is sent anywhere.
Use **⚙ → Export backup** now and then, and **Import** it on a new phone. Clearing Safari's
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

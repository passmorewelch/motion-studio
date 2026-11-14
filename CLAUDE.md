# Motion Studio — working notes for Claude

- One video = one HTML file in `videos/` that sets `window.DURATION`, `window.SIZE = [w, h]`
  and `window.render(t)`. render(t) must be a pure function of t: no CSS animations/transitions,
  timers, Date.now() or unseeded randomness.
- Colors and fonts come from `brand.css` (CSS variables: --bg --accent --text --muted --gold --pink --cream,
  --font-headline (Poppins), --font-body (Montserrat)). Use them rather than hard-coding values.
  Font files live in `fonts/` so renders work offline.
- Check with `node render.mjs videos/<name>.html --stills 3` and look at the PNGs before a full render.
- Full render: `node render.mjs videos/<name>.html` → `out/<name>.mp4` at 30 fps.
- **Every time a video is rendered: commit the MP4 in `out/` (with its HTML) and push it**, so the
  user can download it from GitHub. Still PNGs are gitignored.
- In a fresh cloud container ffmpeg may be missing: `apt-get update && apt-get install -y ffmpeg`.
  Playwright + Chromium are preinstalled globally; render.mjs loads it via createRequire. Don't reinstall it.
- Reusable briefs live in `templates/` with [brackets] for the parts that change. When the user approves a
  video made from a brief that says "NEVER TWICE", save that brief there.
- Logos and images go in `assets/`.

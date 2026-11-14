# Motion Studio — working notes for Claude

- Scenes live in `scenes/*.html`, use `lib/motion.js`, and must be deterministic functions of `t`.
- Render with `node render.js scenes/<name>.html` → `out/<name>.mp4`.
- Before a full render, check key moments with `--still <seconds>` (write stills to the scratchpad) and look at them.
- **Every time a video is rendered: commit the MP4 in `out/` and push it** (with the scene source),
  so the user can download it from GitHub. Stills/PNGs are not committed (see .gitignore).
- In a fresh cloud container, ffmpeg may be missing: `apt-get update && apt-get install -y ffmpeg`.
  Playwright + Chromium are preinstalled globally; don't reinstall them.

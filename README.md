# motion-studio

Motion graphics written as code. Each video is an HTML/CSS/JS **scene**; the renderer
opens it in headless Chromium (Playwright), steps time frame by frame, screenshots each
frame and pipes them into ffmpeg to produce an H.264 MP4 in `out/`.

## Requirements
- Node 18+
- Playwright with Chromium (`require('playwright')` must resolve)
- ffmpeg (`apt-get install -y ffmpeg`)

## Render
```bash
node render.js scenes/hello.html                 # -> out/hello.mp4
node render.js scenes/hello.html --still 2.5     # -> out/hello-still.png (single frame)
node render.js scenes/hello.html --fps 60 --duration 8 --audio music.mp3 --out out/x.mp4
```
Other flags: `--width`, `--height`, `--crf` (quality, default 18), `--frames 0-90`.

## Writing a scene
Copy `scenes/hello.html`. A scene loads `lib/motion.js` and calls:

```js
M.scene({ duration: 6, fps: 30, width: 1920, height: 1080 }, (t) => {
  // set every element's style as a pure function of t (seconds)
});
```

Never use CSS transitions/animations, `setTimeout`, or `Date.now()` — the renderer
controls time, so everything must be derived from `t`.

Helpers on `M`: `ease.*` (quad/cubic/quart/expo/back/elastic/bounce), `prog`, `tween`,
`keyframes`, `spring`, `lerp`, `clamp`, `rng(seed)` (deterministic random), `splitChars(el)`.

Open a scene in a normal browser with `?preview` to loop it live, or `?t=2.5` to
freeze at a time.

Fonts installed locally and safe to use: Inter, Inter Display, JetBrains Mono, DejaVu, Free*.

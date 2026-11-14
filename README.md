# motion-studio

Motion graphics written as code.

```
videos/<name>.html   one file per video
brand.css            shared colors and fonts (CSS variables)
fonts/               Poppins + Montserrat, loaded locally by brand.css (SIL OFL)
render.mjs           renders a video to out/<name>.mp4
assets/              logos and images used by videos
templates/           reusable video briefs with [brackets] to fill in
out/                 rendered MP4s (stills are not committed)
```

## A video file
Each HTML file in `videos/` sets three things:

```js
window.DURATION = 3;              // seconds
window.SIZE = [1920, 1080];       // [width, height]
window.render = (t) => { ... };   // draw the exact frame at time t (seconds)
```

`render(t)` must depend only on `t`: no CSS animations or transitions, no timers,
no `Date.now()`, no unseeded `Math.random()`. That way every render is identical.
Link brand styles with `<link rel="stylesheet" href="../brand.css">` and use
`var(--accent)`, `var(--font-headline)` and so on.

## Render
```bash
node render.mjs videos/hello.html               # -> out/hello.mp4 (30 fps, H.264)
node render.mjs videos/hello.html --stills 3    # -> out/hello-still-1..3.png, evenly spaced
```

## Requirements
Node 18+, Playwright with Chromium, and ffmpeg (`apt-get install -y ffmpeg`).

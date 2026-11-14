#!/usr/bin/env node
// Motion Studio renderer.
// Loads an HTML scene in headless Chromium, steps time frame-by-frame
// (deterministic — no real-time playback), screenshots each frame and
// pipes the frames into ffmpeg to produce an H.264 MP4 in out/.
//
// Usage: node render.js scenes/<name>.html [--out out/<name>.mp4]
//          [--fps 30] [--duration 5] [--width 1920] [--height 1080]
//          [--audio path/to/audio.mp3] [--frames 0-30] [--still 2.5]

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    } else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenePath = args._[0];
  if (!scenePath) {
    console.error('Usage: node render.js scenes/<name>.html [--out out/<name>.mp4] [--still <seconds>]');
    process.exit(1);
  }
  const abs = path.resolve(scenePath);
  const name = path.basename(abs, path.extname(abs));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', (m) => { if (m.type() === 'error') console.error('[scene]', m.text()); });
  page.on('pageerror', (e) => console.error('[scene error]', e.message));

  await page.goto('file://' + abs);
  await page.waitForFunction(() => typeof window.renderFrame === 'function', null, { timeout: 15000 });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null));

  const cfg = await page.evaluate(() => window.SCENE || {});
  const width = +(args.width || cfg.width || 1920);
  const height = +(args.height || cfg.height || 1080);
  const fps = +(args.fps || cfg.fps || 30);
  const duration = +(args.duration || cfg.duration || 5);
  await page.setViewportSize({ width, height });
  await page.evaluate(() => window.SCENE && window.SCENE.ready);

  fs.mkdirSync(path.resolve('out'), { recursive: true });

  // Single still frame (for quick previews)
  if (args.still !== undefined) {
    const t = +args.still;
    await page.evaluate((t) => window.renderFrame(t), t);
    const file = path.resolve(args.out || `out/${name}-still.png`);
    await page.screenshot({ path: file });
    console.log(`Still at ${t}s -> ${path.relative(process.cwd(), file)}`);
    await browser.close();
    return;
  }

  const total = Math.round(duration * fps);
  let [f0, f1] = [0, total - 1];
  if (args.frames) [f0, f1] = String(args.frames).split('-').map(Number);

  const outFile = path.resolve(args.out || `out/${name}.mp4`);
  const ffArgs = ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
  if (args.audio) ffArgs.push('-i', path.resolve(args.audio));
  ffArgs.push('-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf || 18),
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (args.audio) ffArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  ffArgs.push(outFile);

  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));

  console.log(`Rendering ${name}: ${width}x${height} @ ${fps}fps, ${duration}s (${f1 - f0 + 1} frames)`);
  const start = Date.now();
  for (let f = f0; f <= f1; f++) {
    await page.evaluate((t) => window.renderFrame(t), f / fps);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % fps === 0 || f === f1) {
      process.stdout.write(`\r  frame ${f + 1}/${f1 + 1}`);
    }
  }
  ff.stdin.end();
  await ffDone;
  await browser.close();
  console.log(`\nDone in ${((Date.now() - start) / 1000).toFixed(1)}s -> ${path.relative(process.cwd(), outFile)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

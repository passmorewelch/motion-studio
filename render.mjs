#!/usr/bin/env node
// Motion Studio renderer.
//
//   node render.mjs videos/<name>.html             -> out/<name>.mp4
//   node render.mjs videos/<name>.html --stills 3  -> out/<name>-still-1.png ... (evenly spaced)
//
// A video is an HTML file that sets:
//   window.DURATION  seconds
//   window.SIZE      [width, height]
//   window.render(t) draws the exact frame at time t (seconds)
// The renderer calls render(t) for every frame at 30 fps, screenshots it,
// and pipes the frames into ffmpeg. Nothing plays in real time, so every
// render of the same file is identical.

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Playwright is installed globally; ESM `import` ignores NODE_PATH, require does not.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const FPS = 30;

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
const stillsIdx = argv.indexOf('--stills');
const stills = stillsIdx >= 0 ? parseInt(argv[stillsIdx + 1] ?? '3', 10) : 0;

if (!file) {
  console.error('Usage: node render.mjs videos/<name>.html [--stills 3]');
  process.exit(1);
}

const abs = path.resolve(file);
const name = path.basename(abs, '.html');
const outDir = path.resolve('out');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[video error]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('[video]', m.text()));

  await page.goto(pathToFileURL(abs).href);
  await page.waitForFunction(() => typeof window.render === 'function', null, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);

  const { duration, size, audio } = await page.evaluate(() => ({ duration: window.DURATION, size: window.SIZE, audio: window.AUDIO }));
  // Optional soundtrack: window.AUDIO is a path relative to the video's HTML file.
  const audioPath = audio ? path.resolve(path.dirname(abs), audio) : null;
  if (audioPath && !existsSync(audioPath)) throw new Error(`window.AUDIO file not found: ${audioPath}`);
  if (!(duration > 0)) throw new Error('window.DURATION must be a positive number of seconds');
  if (!Array.isArray(size) || size.length !== 2) throw new Error('window.SIZE must be [width, height]');
  const [width, height] = size;
  await page.setViewportSize({ width, height });

  const frameAt = async (t) => {
    await page.evaluate(async (t) => { await window.render(t); }, t);
    return page.screenshot({ type: 'png' });
  };

  if (stills > 0) {
    // Evenly spaced through the video, e.g. 3 stills -> 25%, 50%, 75%.
    for (let i = 1; i <= stills; i++) {
      const t = (duration * i) / (stills + 1);
      const out = path.join(outDir, `${name}-still-${i}.png`);
      await page.evaluate(async (t) => { await window.render(t); }, t);
      await page.screenshot({ path: out });
      console.log(`still ${i}/${stills} at ${t.toFixed(2)}s -> ${path.relative(process.cwd(), out)}`);
    }
  } else {
    const total = Math.round(duration * FPS);
    const out = path.join(outDir, `${name}.mp4`);
    const ff = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      ...(audioPath ? ['-i', audioPath, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-t', String(duration)] : []),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      out,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited with code ${c}`)))));

    console.log(`Rendering ${name}: ${width}x${height}, ${duration}s, ${total} frames @ ${FPS}fps`);
    const start = Date.now();
    for (let f = 0; f < total; f++) {
      const buf = await frameAt(f / FPS);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if ((f + 1) % FPS === 0 || f === total - 1) process.stdout.write(`\r  ${f + 1}/${total} frames`);
    }
    ff.stdin.end();
    await done;
    console.log(`\nDone in ${((Date.now() - start) / 1000).toFixed(1)}s -> ${path.relative(process.cwd(), out)}`);
  }
} finally {
  await browser.close();
}

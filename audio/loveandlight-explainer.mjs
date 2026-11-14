#!/usr/bin/env node
// Soundtrack for videos/loveandlight-explainer.html — music bed + sound effects, synthesized in code.
// Deterministic: same output every run (seeded noise, no samples, no stock audio).
//
//   node audio/loveandlight-explainer.mjs   -> audio/loveandlight-explainer.wav
//
// Every sound effect time below matches a moment in the video's render(t) timeline.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SR = 48000;
const DURATION = 16.5;
const N = Math.round(SR * DURATION);
const L = new Float32Array(N), R = new Float32Array(N);       // dry mix
const RL = new Float32Array(N), RR = new Float32Array(N);     // reverb send

// ---------- the video's timeline (seconds) ----------
const STEP_START = [4.0, 7.05, 10.1], STEP_LEN = 3.15;
const HITS = {
  logoReveal: 0.15,               // logo light-wipe reveal
  titleLines: [1.0, 1.5, 2.0],    // each title line rises in
  titleRule: 2.6,                 // gold line under the title draws
  toCorner: 3.55,                 // title blurs out, logo glides to the corner
  steps: STEP_START.map((a) => ({
    number: a + 0.1,              // big number pops in + progress dot fills
    headline: a + 0.15,           // headline slides in
    rule: a + 0.45,               // short gold rule draws
    sheen: a + 0.4,               // metallic sweep across the number
    out: a + STEP_LEN - 0.55,     // step blurs away
  })),
  logoReturn: 13.0,               // logo glides back to centre (13.0–14.0)
  ring: 13.5,                     // ring of light radiates out
  brand: 13.9,                    // LOVEANDLIGHT AI
  endRule: 14.7,                  // gold line
  tagline: 14.9,                  // tagline
};

// ---------- helpers ----------
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;
let seed = 20261114;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const add = (i, l, r, send = 0) => { if (i < 0 || i >= N) return; L[i] += l; R[i] += r; RL[i] += l * send; RR[i] += r * send; };

// ---------- music bed: D major, chords change with the scenes ----------
const sections = [
  { t: 0.0,   bass: 38, pad: [50, 57, 61, 66] },        // Dmaj7  — title
  { t: 4.0,   bass: 35, pad: [47, 54, 57, 62] },        // Bm7    — step 1
  { t: 7.05,  bass: 31, pad: [55, 59, 62, 66] },        // Gmaj7  — step 2
  { t: 10.1,  bass: 33, pad: [45, 52, 57, 62] },        // Asus4  — step 3
  { t: 11.9,  bass: 33, pad: [45, 52, 57, 61] },        // A      — resolves toward the close
  { t: 13.5,  bass: 38, pad: [50, 57, 61, 64, 66] },    // Dmaj9  — brand close (lands on the ring hit)
];
const XF = 0.7;                                          // chord crossfade
const masterEnv = (t) => smooth(t / 1.5) * (1 - smooth((t - 15.6) / 0.9));

for (let s = 0; s < sections.length; s++) {
  const sec = sections[s];
  const t0 = sec.t, t1 = s + 1 < sections.length ? sections[s + 1].t : DURATION;
  const i0 = Math.max(0, Math.floor((t0 - XF) * SR)), i1 = Math.min(N, Math.ceil((t1 + XF) * SR));
  const voices = sec.pad.map((m, k) => ({ f: mtof(m), pan: (k / (sec.pad.length - 1)) * 0.8 - 0.4, det: 1 + (k % 2 ? 0.0025 : -0.0025) }));
  for (let i = i0; i < i1; i++) {
    const t = i / SR;
    const w = (s === 0 ? 1 : smooth((t - t0 + XF) / XF)) * (s + 1 < sections.length ? 1 - smooth((t - t1 + XF / 2) / XF) : 1);
    if (w <= 0) continue;
    const env = w * masterEnv(t) * (0.85 + 0.15 * Math.sin(TAU * 0.25 * t));   // slow breathing swell
    let l = 0, r = 0;
    for (const v of voices) {
      // soft additive pad: a few harmonics, two slightly detuned copies
      let x = 0;
      for (let h = 1; h <= 5; h++) x += (Math.sin(TAU * v.f * h * t) + Math.sin(TAU * v.f * v.det * h * t + h)) / Math.pow(h, 1.8);
      l += x * (0.5 - v.pan * 0.5); r += x * (0.5 + v.pan * 0.5);
    }
    const sub = Math.sin(TAU * mtof(sec.bass) * t) * 0.9 + Math.sin(TAU * mtof(sec.bass + 12) * t) * 0.25;
    add(i, (l * 0.022 + sub * 0.06) * env, (r * 0.022 + sub * 0.06) * env, 0.35);
  }
}

// gentle bell arpeggio (8th notes at 120 bpm), restarting with each chord
const bell = (t0, f, amp, pan = 0, decay = 0.6, send = 0.5) => {
  const i0 = Math.floor(t0 * SR), len = Math.floor(decay * 5 * SR);
  for (let j = 0; j < len; j++) {
    const t = j / SR, e = Math.exp(-t / decay) * Math.min(1, t / 0.004);
    const x = Math.sin(TAU * f * t + 1.2 * Math.exp(-t / 0.15) * Math.sin(TAU * f * 3.01 * t)) + 0.25 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t / (decay * 0.4));
    add(i0 + j, x * e * amp * (1 - pan) * 0.5, x * e * amp * (1 + pan) * 0.5, send);
  }
};
const ARP = [0, 1, 2, 3, 2, 1];
for (let s = 0; s < sections.length; s++) {
  const sec = sections[s], start = Math.max(1.0, sec.t), end = s + 1 < sections.length ? sections[s + 1].t : 15.4;
  let k = 0;
  for (let t = start; t < end - 0.05; t += 0.25, k++) {
    const m = sec.pad[ARP[k % ARP.length] % sec.pad.length] + 12;
    bell(t, mtof(m), 0.035 * masterEnv(t), Math.sin(k * 1.3) * 0.5, 0.45, 0.55);
  }
}

// ---------- sound effects ----------
// filtered-noise whoosh: bandpass sweeping from f0 to f1, panned from p0 to p1
const whoosh = (t0, dur, f0, f1, amp, p0 = 0, p1 = 0, attack = 0.5) => {
  const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR);
  let low = 0, band = 0;
  for (let j = 0; j < len; j++) {
    const p = j / len;
    const f = f0 * Math.pow(f1 / f0, p);
    const F = 2 * Math.sin(Math.PI * Math.min(f, SR / 6) / SR), Q = 1.1;
    const n = rand() * 2 - 1;
    low += F * band; const high = n - low - Q * band; band += F * high;
    const env = p < attack ? Math.sin((p / attack) * Math.PI / 2) ** 2 : Math.cos(((p - attack) / (1 - attack)) * Math.PI / 2) ** 2;
    const pan = p0 + (p1 - p0) * p;
    add(i0 + j, band * env * amp * (1 - pan) * 0.5, band * env * amp * (1 + pan) * 0.5, 0.25);
  }
};
// soft low thump (pitch drop) for the big number hits
const thump = (t0, amp) => {
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.5 * SR);
  let ph = 0;
  for (let j = 0; j < len; j++) {
    const t = j / SR, f = 48 + 70 * Math.exp(-t / 0.05);
    ph += TAU * f / SR;
    const x = Math.sin(ph) * Math.exp(-t / 0.16) * Math.min(1, t / 0.003);
    add(i0 + j, x * amp, x * amp, 0.1);
  }
};
// sparkle shimmer: a seeded cluster of tiny high bells
const shimmer = (t0, dur, count, amp, rising = true, base = 86) => {
  const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];          // D major pentatonic-ish
  for (let k = 0; k < count; k++) {
    const p = count === 1 ? 0 : k / (count - 1);
    const t = t0 + p * dur + (rand() - 0.5) * (dur / count) * 0.6;
    const idx = rising ? Math.floor(p * (scale.length - 1)) : Math.floor(rand() * scale.length);
    bell(t, mtof(base + scale[idx]), amp * (0.6 + 0.4 * rand()), (rand() - 0.5) * 1.2, 0.35, 0.7);
  }
};
const tick = (t0, amp) => bell(t0, mtof(98), amp, 0.2, 0.08, 0.3);

// title
shimmer(HITS.logoReveal, 1.2, 14, 0.05, true, 81);                  // logo light-wipe
bell(HITS.logoReveal + 0.75, mtof(74), 0.11, 0, 1.4, 0.6);          // logo "lands"
HITS.titleLines.forEach((t, k) => {                                 // one soft pluck per line, rising
  bell(t + 0.08, mtof([69, 71, 74][k]), 0.09, [-0.3, 0.3, 0][k], 0.7, 0.5);
  whoosh(t - 0.05, 0.5, 1800, 5000, 0.05, 0, 0, 0.4);
});
whoosh(HITS.titleRule, 0.8, 3000, 9000, 0.06, -0.6, 0.6, 0.3);      // gold line shimmer
shimmer(HITS.titleRule + 0.1, 0.7, 6, 0.03, true, 88);
whoosh(HITS.toCorner, 0.8, 4000, 600, 0.13, 0.4, -0.7, 0.45);       // title out, logo to corner

// steps
const stepNotes = [74, 76, 78];                                      // D5, E5, F#5 — climbing with 1, 2, 3
HITS.steps.forEach((s, k) => {
  thump(s.number, 0.32);
  bell(s.number, mtof(stepNotes[k]), 0.13, -0.35, 1.0, 0.55);       // number hit
  bell(s.number + 0.02, mtof(stepNotes[k] + 12), 0.05, -0.35, 0.6, 0.6);
  bell(s.number + 0.05, mtof(98 + k * 2), 0.03, 0, 0.12, 0.3);      // progress dot fills
  whoosh(s.headline - 0.08, 0.55, 900, 4500, 0.09, 0.7, 0.1, 0.55); // headline slides in from the right
  tick(s.rule, 0.04);                                               // gold rule
  shimmer(s.sheen + 0.2, 1.2, 7, 0.022, true, 86);                  // metallic sweep over the number
  whoosh(s.out, 0.5, 3500, 700, 0.08, 0, -0.7, 0.35);               // step blurs away to the left
});

// brand close
whoosh(HITS.logoReturn - 0.1, 1.15, 400, 6000, 0.12, -0.5, 0, 0.85); // logo glides back, rising swell
thump(HITS.ring, 0.38);                                              // ring of light
[62, 69, 74, 78, 81].forEach((m, k) => bell(HITS.ring + k * 0.012, mtof(m), 0.08, (k - 2) * 0.25, 1.8, 0.65));
shimmer(HITS.ring + 0.05, 1.3, 16, 0.035, false, 86);
bell(HITS.brand + 0.1, mtof(86), 0.07, 0.15, 1.2, 0.6);              // name appears
tick(HITS.endRule, 0.035);                                           // gold line
bell(HITS.tagline + 0.1, mtof(81), 0.06, -0.15, 1.6, 0.65);          // tagline

// ---------- reverb (Freeverb-style combs + allpasses) on the send ----------
const reverb = (input, spread) => {
  const out = new Float32Array(N);
  const scale = SR / 44100;
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0, lp: 0 }));
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.75 + c.lp * 0.25;
      c.buf[c.i] = input[n] * 0.015 + c.lp * 0.86;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    out[n] = s;
  }
  for (const d of [556, 441, 341]) {
    const buf = new Float32Array(Math.round((d + spread) * scale)); let i = 0;
    for (let n = 0; n < N; n++) { const b = buf[i]; const x = out[n]; buf[i] = x + b * 0.5; out[n] = b - x; i = (i + 1) % buf.length; }
  }
  return out;
};
const wetL = reverb(RL, 0), wetR = reverb(RR, 23);

// ---------- master: mix, soft-clip, normalize to -1 dBFS, write 16-bit WAV ----------
const outL = new Float32Array(N), outR = new Float32Array(N);
let peak = 0;
for (let n = 0; n < N; n++) {
  outL[n] = Math.tanh((L[n] + wetL[n] * 2.2) * 1.4);
  outR[n] = Math.tanh((R[n] + wetR[n] * 2.2) * 1.4);
  peak = Math.max(peak, Math.abs(outL[n]), Math.abs(outR[n]));
}
const gain = Math.pow(10, -1 / 20) / peak;
const fadeOut = (n) => 1 - smooth((n / SR - (DURATION - 0.6)) / 0.6);   // last 0.6s fades to silence

const data = Buffer.alloc(N * 4);
for (let n = 0; n < N; n++) {
  const f = fadeOut(n);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[n] * gain * f)) * 32767), n * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[n] * gain * f)) * 32767), n * 4 + 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(data.length, 40);

const outFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'loveandlight-explainer.wav');
writeFileSync(outFile, Buffer.concat([header, data]));
console.log(`Wrote ${path.relative(process.cwd(), outFile)} (${DURATION}s, ${SR} Hz stereo)`);

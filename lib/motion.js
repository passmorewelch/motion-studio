// Motion Studio helpers — load in a scene with <script src="../lib/motion.js"></script>
// Everything is a pure function of time t (seconds), so renders are deterministic.

(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;

  const ease = {
    linear: (x) => x,
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) * (1 - x),
    inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    inOutQuart: (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2),
    outExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inOutExpo: (x) => x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    inBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * x * x * x - c1 * x * x; },
    outElastic: (x) => x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
    outBounce: (x) => {
      const n1 = 7.5625, d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
      if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
    },
  };

  // progress of t through [start, start+dur], eased, clamped 0..1
  const prog = (t, start, dur, e = ease.linear) => e(clamp((t - start) / dur));

  // tween(t, start, dur, from, to, easing) -> number
  const tween = (t, start, dur, from, to, e = ease.inOutCubic) => lerp(from, to, prog(t, start, dur, e));

  // keyframes(t, [[time, value, easing?], ...]) -> number (easing applies to segment ending at that key)
  const keyframes = (t, keys) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e = ease.inOutCubic] = keys[i];
      const [t0, v0] = keys[i - 1];
      if (t <= t1) return lerp(v0, v1, e((t - t0) / (t1 - t0)));
    }
    return keys[keys.length - 1][1];
  };

  // damped spring 0 -> 1 starting at `start`
  const spring = (t, start = 0, { stiffness = 120, damping = 12, mass = 1 } = {}) => {
    const x = t - start;
    if (x <= 0) return 0;
    const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * x) * (Math.cos(wd * x) + (z * w0 / wd) * Math.sin(wd * x));
    }
    return 1 - Math.exp(-w0 * x) * (1 + w0 * x);
  };

  // deterministic PRNG (mulberry32)
  const rng = (seed = 1) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };

  // split an element's text into <span class="ch"> per character; returns the spans
  const splitChars = (el) => {
    const text = el.textContent;
    el.textContent = '';
    return [...text].map((c) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.display = 'inline-block';
      s.style.whiteSpace = 'pre';
      s.textContent = c;
      el.appendChild(s);
      return s;
    });
  };

  // Set up a scene. render(t) is called once per frame with time in seconds.
  // Adds ?t=<seconds> URL support and a live-preview loop when opened in a normal browser.
  const scene = (config, render) => {
    window.SCENE = { width: 1920, height: 1080, fps: 30, duration: 5, ...config };
    window.renderFrame = (t) => render(t);
    const params = new URLSearchParams(location.search);
    if (params.has('t')) render(+params.get('t'));
    else if (params.has('preview')) {
      const t0 = performance.now();
      const loop = () => { render(((performance.now() - t0) / 1000) % window.SCENE.duration); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    } else render(0);
  };

  window.M = { clamp, lerp, ease, prog, tween, keyframes, spring, rng, splitChars, scene };
})();

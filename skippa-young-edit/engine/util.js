// Small math / animation helpers shared by the whole engine.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sat = (x) => clamp(x, 0, 1);
export const smooth = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const remap = (x, a, b, c, d) => lerp(c, d, sat((x - a) / (b - a)));

// Easing library (t in 0..1)
export const ease = {
  lin: (t) => t,
  in2: (t) => t * t,
  out2: (t) => 1 - (1 - t) * (1 - t),
  io2: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  in3: (t) => t * t * t,
  out3: (t) => 1 - Math.pow(1 - t, 3),
  io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out4: (t) => 1 - Math.pow(1 - t, 4),
  out5: (t) => 1 - Math.pow(1 - t, 5),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  // the "whip": slow out of the hold, violent in the middle, hard landing
  whip: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBackSoft: (t) => { const c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  cut: (t) => (t >= 1 ? 1 : 0),
};

// progress of x through [a,b] with easing
export const prog = (x, a, b, e = 'lin') => (ease[e] || ease.lin)(sat((x - a) / (b - a || 1e-6)));

// Seeded RNG (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  const f = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.sign = () => (f() < 0.5 ? -1 : 1);
  return f;
}

// cheap hash + value noise (deterministic, no tables)
export function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
export function vnoise1(x) { const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f); return lerp(hash1(i), hash1(i + 1), u); }
export function fbm1(x, oct = 3) { let a = 0.5, s = 0, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise1(x); n += a; x = x * 2.03 + 17.1; a *= 0.5; } return s / n; }
// smooth camera-shake style signal in -1..1
export const wobble = (t, seed = 0) => fbm1(t + seed * 31.7, 3) * 2 - 1;

// Keyframe track: keys = [[x, value, easeName?], ...] sorted by x. The ease on a key describes the
// segment that ARRIVES at that key. Values can be numbers or arrays of numbers.
export function track(keys, x) {
  if (!keys.length) return 0;
  if (x <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (x >= last[0]) return last[1];
  let i = 1;
  while (keys[i][0] < x) i++;
  const a = keys[i - 1], b = keys[i];
  const t = (ease[b[2]] || ease.lin)((x - a[0]) / (b[0] - a[0] || 1e-6));
  if (Array.isArray(a[1])) return a[1].map((v, k) => lerp(v, b[1][k], t));
  return lerp(a[1], b[1], t);
}

// Pulse: 1 at x=c decaying over `len` (frames) with a tiny attack
export function pulse(x, c, len = 6, attack = 0.6) {
  if (x < c - attack) return 0;
  if (x < c) return (x - (c - attack)) / attack;
  return Math.pow(sat(1 - (x - c) / len), 2);
}

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

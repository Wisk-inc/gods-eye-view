#!/usr/bin/env node
// Headless renderer: drives the WebGL engine frame by frame in Chromium and pipes frames into ffmpeg.
//
//   node render.mjs                                   full 1080p render -> out/edit.mp4 (+ audio)
//   node render.mjs --scale 0.5 --samples 3           fast preview
//   node render.mjs --frames 21-48 --stills out/t     dump JPEG stills (reference-frame numbers)
//   node render.mjs --frames 21-48 --step 3 --sheet out/b.jpg [--ref <dir with f_0001.jpg…>]
//   node render.mjs --audio my_clip.mp3 --bpm 140 --offset 0.21     re-time to another song
//
// --frames always refers to REFERENCE frame numbers (0–657); they are mapped to output frames.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2); const A = {};
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; A[k] = v; } }

const cfgPath = path.resolve(ROOT, A.config || 'edit.config.json');
const base = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
// optional lyrics file: one slot per line, in slot order (see README)
const lyricsPath = path.resolve(ROOT, A.lyrics || base.lyricsFile || 'lyrics.txt');
if (fs.existsSync(lyricsPath)) {
  const lines = fs.readFileSync(lyricsPath, 'utf8').split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean);
  const order = base.slotOrder || []; const words = { ...(base.words || {}) };
  if (lines.length === order.length || !Array.isArray(base.groups)) lines.forEach((l, i) => { if (order[i]) words[order[i]] = l.toUpperCase(); });
  else { // running text: split into words and deal them into the slots by the song's words-per-slot map
    const all = lines.join(' ').toUpperCase().split(/\s+/).filter(Boolean); const G = base.groups; const total = G.reduce((a, b) => a + b, 0); let cum = 0;
    if (all.length !== total) console.log(`note: lyrics.txt has ${all.length} words, the timing map expects ${total}; distributing proportionally`);
    order.forEach((slot, i) => { const a = Math.round((cum / total) * all.length), b = Math.round(((cum + G[i]) / total) * all.length); cum += G[i]; const piece = all.slice(a, Math.max(b, a + 1)).join(' '); if (piece) words[slot] = piece; });
  }
  base.words = words;
}
// optional song timing (tools/fit_slots.py): tempo, first beat, per-slot anchors, words per slot
const timingPath = A.timing ? path.resolve(A.timing) : (base.timingFile ? path.resolve(ROOT, base.timingFile) : null);
if (timingPath && fs.existsSync(timingPath) && !A['no-timing']) { const T = JSON.parse(fs.readFileSync(timingPath, 'utf8')); for (const k of ['bpm', 'offset', 'anchors', 'groups', 'audioStart']) if (T[k] !== undefined) base[k] = T[k]; }
const scale = parseFloat(A.scale || 1);
const cfg = { ...base, width: Math.round(((base.width || 1920) * scale) / 2) * 2, height: Math.round(((base.height || 1080) * scale) / 2) * 2 };
if (A.samples) cfg.samples = parseInt(A.samples, 10);
if (A.shutter) cfg.shutter = parseFloat(A.shutter);
if (A.bpm) cfg.bpm = parseFloat(A.bpm);
if (A.offset !== undefined) cfg.offset = parseFloat(A.offset);
if (A.fps) cfg.fps = parseFloat(A.fps);
if (A.only) cfg.only = String(A.only).split(',');
cfg.fps = cfg.fps || 30; cfg.bpm = cfg.bpm || 114; if (cfg.offset === undefined) cfg.offset = 0.116;

const REF = { fps: 30, bpm: 114, phase: 0.116, frames: 658 };
let rfTimes = null; // filled from the engine (it owns the time map, including anchors)
const outFrameOfRf = (rf) => Math.round(rfTimes[Math.round(rf)] * cfg.fps);

// ---- static server
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]); const p = path.join(ROOT, rel);
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end('not found'); } else { res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); } });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const page = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height }, deviceScaleFactor: 1 });
const quiet = !!A.quiet;
page.on('console', (m) => { const t = m.text(); if (/GPU stall|GL Driver Message/.test(t)) return; if (m.type() === 'error' || m.type() === 'warning' || !quiet) console.log(`  [page ${m.type()}] ${t.slice(0, 600)}`); });
page.on('pageerror', (e) => console.log('  [pageerror]', String(e && e.stack ? e.stack : e).slice(0, 1200)));
await page.goto(`http://127.0.0.1:${port}/engine/index.html`);
await page.waitForFunction('window.__engineLoaded === true', null, { timeout: 60000 });
const info = await page.evaluate((c) => window.EDIT.init(c), cfg);
if (info.errors && info.errors.length) { console.log('SECTION BUILD ERRORS:\n' + info.errors.join('\n')); }
rfTimes = await page.evaluate((n) => Array.from({ length: n + 1 }, (_, rf) => window.EDIT.timeOfRf(rf)), REF.frames);
if (!quiet) console.log(`engine ready: ${cfg.width}x${cfg.height} @${cfg.fps}fps, ${info.frames} frames (${info.duration.toFixed(2)}s), bpm ${cfg.bpm}, samples ${cfg.samples || 8}, sections: ${info.sections.map((s) => s.id).join(' ')}`);

// ---- frame list
let list = [];
if (A.frames) {
  for (const part of String(A.frames).split(',')) { const m = part.split('-').map((x) => parseFloat(x)); const a = m[0], b = m.length > 1 ? m[1] : m[0]; const step = parseFloat(A.step || 1); for (let rf = a; rf <= b + 1e-6; rf += step) list.push({ rf: Math.round(rf), n: outFrameOfRf(rf) }); }
} else { for (let n = 0; n < info.frames; n++) list.push({ rf: null, n }); }

if (A.chunk) { const [ci, cn] = String(A.chunk).split('/').map(Number); list = list.slice(Math.floor((ci * list.length) / cn), Math.floor(((ci + 1) * list.length) / cn)); }
const grab = async (n) => { const url = await page.evaluate(([i]) => window.EDIT.renderFrame(i), [n]); return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'); };
const t0 = Date.now();

if (A.stills || A.sheet) {
  const dir = path.resolve(ROOT, A.stills || fs.mkdtempSync(path.join(os.tmpdir(), 'edit-stills-'))); fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < list.length; i++) { const { rf, n } = list[i]; const buf = await grab(n); fs.writeFileSync(path.join(dir, `f_${String(rf ?? n).padStart(4, '0')}.jpg`), buf); if (!quiet && (i % 10 === 0 || i === list.length - 1)) console.log(`  still ${i + 1}/${list.length} (rf ${rf ?? n}) ${((Date.now() - t0) / 1000).toFixed(1)}s`); }
  if (A.sheet) {
    const args = [path.join(ROOT, 'tools/sheet.py'), '--frames', dir, '--list', list.map((x) => x.rf ?? x.n).join(','), '--out', path.resolve(ROOT, A.sheet), '--cols', String(A.cols || 6), '--tw', String(A.tw || 320)];
    if (A.ref) args.push('--ref', path.resolve(A.ref));
    const r = spawnSync('python3', args, { stdio: 'inherit' }); if (r.status !== 0) console.log('sheet.py failed');
  }
  console.log(`done: ${list.length} stills in ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${A.sheet ? path.resolve(ROOT, A.sheet) : dir}`);
} else {
  const out = path.resolve(ROOT, A.out || 'out/edit.mp4'); fs.mkdirSync(path.dirname(out), { recursive: true });
  const silent = out.replace(/\.mp4$/, '.silent.mp4');
  if (A.parts && !A.chunk) {
    // ---- parallel render: N child processes each encode one contiguous chunk, then the chunks are joined losslessly
    const N = Math.max(1, parseInt(A.parts)); const base = out.replace(/\.mp4$/, ''); const fwd = []; const raw = process.argv.slice(2);
    for (let i = 0; i < raw.length; i++) { if (['--parts', '--out', '--audio', '--audio-start'].includes(raw[i])) { i++; continue; } if (raw[i] === '--no-audio') continue; fwd.push(raw[i]); }
    const kids = Array.from({ length: N }, (_, i) => new Promise((res) => { const c = spawn(process.execPath, [fileURLToPath(import.meta.url), ...fwd, '--quiet', '--no-audio', '--chunk', `${i}/${N}`, '--out', `${base}.part${i}.mp4`], { stdio: ['ignore', 'inherit', 'inherit'] }); c.on('close', (code) => res(code)); }));
    const codes = await Promise.all(kids); if (codes.some((c) => c !== 0)) { console.log('a chunk failed: ' + codes.join(',')); process.exit(1); }
    const lst = `${base}.parts.txt`; fs.writeFileSync(lst, Array.from({ length: N }, (_, i) => `file '${base}.part${i}.mp4'`).join('\n') + '\n');
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', silent], { stdio: 'inherit' }); if (r.status !== 0) process.exit(1);
    for (let i = 0; i < N; i++) fs.rmSync(`${base}.part${i}.mp4`, { force: true }); fs.rmSync(lst, { force: true });
  } else {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(cfg.fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(A.crf || 15), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < list.length; i++) {
    const buf = await grab(list[i].n);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (!quiet && (i % 20 === 0 || i === list.length - 1)) { const el = (Date.now() - t0) / 1000; console.log(`  frame ${i + 1}/${list.length}  ${el.toFixed(0)}s elapsed, ~${((el / (i + 1)) * (list.length - i - 1)).toFixed(0)}s left`); }
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  }
  // ---- audio: user clip if given, else the bundled original guide beat
  let audio = A.audio ? path.resolve(A.audio) : null;
  if (!audio && !A['no-audio']) {
    const guide = path.join(path.dirname(out), 'guide_beat.wav');
    const r = spawnSync('python3', [path.join(ROOT, 'tools/guide_beat.py'), '--bpm', String(cfg.bpm), '--offset', String(cfg.offset), '--duration', String(info.duration), '--out', guide], { stdio: 'inherit' });
    if (r.status === 0) audio = guide;
  }
  if (audio && !A['no-audio']) {
    const st = A['audio-start'] ?? (A.audio ? cfg.audioStart : undefined); const start = st !== undefined ? ['-ss', String(st)] : [];
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, ...start, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
    if (r.status === 0) fs.unlinkSync(silent); else fs.renameSync(silent, out);
  } else fs.renameSync(silent, out);
  console.log(`done: ${out} (${list.length} frames) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close(); server.close();

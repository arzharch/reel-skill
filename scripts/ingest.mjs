#!/usr/bin/env node
// Makes the footage legible to Claude: one timestamped contact sheet per clip
// (4 frames/sec) plus footage.json with duration/fps, so the edit step picks
// real moments (a door swinging open, a foliage wipe) by looking at them.
//
//   node reelkit/ingest.mjs <footage dir> [--out <dir>]
//
// Defaults: footage from public/footage, sheets to reelkit/ingest/<dir name>.

import fs from "node:fs";
import path from "node:path";
import { ffmpeg, labelFont, probe } from "./ff.mjs";

const args = process.argv.slice(2);
const outFlag = args.indexOf("--out");
const dir = args.find((a, i) => !a.startsWith("--") && i !== outFlag + 1) || "public/footage";
const outDir = outFlag >= 0 ? args[outFlag + 1] : path.join("reelkit", "ingest", path.basename(path.resolve(dir)));
fs.mkdirSync(outDir, { recursive: true });
const font = labelFont();
const clips = [];

for (const f of fs.readdirSync(dir).filter((f) => /\.(mp4|mov|m4v)$/i.test(f))) {
  const file = path.resolve(dir, f).replace(/\\/g, "/");
  const p = probe(file);
  const duration = +p.duration.toFixed(2);
  const fps = +p.fps.toFixed(2);
  const name = path.parse(f).name;
  const cols = 10;
  const rows = Math.max(1, Math.ceil((duration * 4) / cols));
  const sheet = path.join(outDir, `${name}.jpg`);
  ffmpeg([
    "-v", "error", "-y", "-i", file,
    "-vf", `fps=4,scale=150:-1,drawtext=fontfile='${font}':text='%{pts\\:flt}':x=4:y=4:fontsize=14:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=${cols}x${rows}:padding=2`,
    "-frames:v", "1", sheet,
  ]);
  const portrait = p.height > p.width;
  clips.push({ clip: file, duration, fps, width: p.width, height: p.height, portrait, slowmoOk: fps >= 50, sheet: sheet.replace(/\\/g, "/") });
  console.log(`${name}: ${duration}s @ ${fps}fps ${p.width}x${p.height}${portrait ? "" : " (not portrait: will be centre-cropped)"}`);
}
if (!clips.length) console.warn(`no .mp4/.mov/.m4v clips in ${dir}`);
fs.writeFileSync(path.join(outDir, "footage.json"), JSON.stringify(clips, null, 2));
console.log(`-> ${path.join(outDir, "footage.json")}`);

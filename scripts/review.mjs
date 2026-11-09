#!/usr/bin/env node
// Turns a rendered reel into images Claude can actually look at, so the
// critique step judges the pixels, not the edit plan:
//   <name>-sheet.jpg  one frame every 0.5s, timestamped
//   <name>-hook.jpg   full-res frame at 0.6s (what the scroller decides on)
//   <name>-mid.jpg    full-res frame at the midpoint (text legibility check)
//
//   node reelkit/review.mjs reelkit/out/<name>.mp4

import path from "node:path";
import { ffmpeg, labelFont, probe } from "./ff.mjs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node reelkit/review.mjs <video.mp4>");
  process.exit(1);
}
const base = file.replace(/\.mp4$/, "");
const dur = probe(file).duration;
const font = labelFont();
const cols = 8;
const rows = Math.ceil(dur / 0.5 / cols);

ffmpeg([
  "-v", "error", "-y", "-i", file,
  "-vf", `fps=2,scale=200:-1,drawtext=fontfile='${font}':text='%{pts\\:flt}':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=${cols}x${rows}:padding=3`,
  "-frames:v", "1", `${base}-sheet.jpg`,
]);
ffmpeg(["-v", "error", "-y", "-ss", "0.6", "-i", file, "-frames:v", "1", "-q:v", "3", `${base}-hook.jpg`]);
ffmpeg(["-v", "error", "-y", "-ss", String(dur / 2), "-i", file, "-frames:v", "1", "-q:v", "3", `${base}-mid.jpg`]);
console.log([`${base}-sheet.jpg`, `${base}-hook.jpg`, `${base}-mid.jpg`].map((p) => path.normalize(p)).join("\n"));

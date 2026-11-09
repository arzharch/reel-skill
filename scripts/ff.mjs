// Shared plumbing for the reelkit scripts: where ffmpeg and the fonts are,
// and how to probe a clip. Kept separate so the same scripts run unchanged on
// this Windows machine and inside a claude.ai chat sandbox (Linux), where
// there may be no ffprobe and no Windows fonts.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
export const FFMPEG = process.env.FFMPEG || "ffmpeg";
export const FFPROBE = process.env.FFPROBE || "ffprobe";

export function ffmpeg(args, opts) {
  return execFileSync(FFMPEG, args, opts);
}

// Escape a path for use inside a filtergraph option value.
export function filterPath(p) {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

// Duration, fps and size of a clip's first video stream. Falls back to
// parsing `ffmpeg -i` when ffprobe isn't installed (pip's imageio-ffmpeg
// ships ffmpeg only).
export function probe(file) {
  try {
    const j = JSON.parse(
      execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:format=duration", "-of", "json", file]).toString()
    );
    const [n, d] = j.streams[0].r_frame_rate.split("/").map(Number);
    return { duration: +j.format.duration, fps: n / d, width: j.streams[0].width, height: j.streams[0].height };
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  let err = "";
  try {
    execFileSync(FFMPEG, ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    err = String(e.stderr || ""); // ffmpeg exits 1 with no output file; the info is on stderr
  }
  const dur = err.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const video = err.match(/Stream #0:\d+.*?: Video: .*?(\d{2,5})x(\d{2,5}).*?([\d.]+) fps/);
  if (!dur || !video) throw new Error(`could not probe ${file}`);
  return { duration: +dur[1] * 3600 + +dur[2] * 60 + +dur[3], fps: +video[3], width: +video[1], height: +video[2] };
}

// Fonts. If reelkit/fonts/fonts.json exists (the open-licence set the chat
// skill ships with), use it. Otherwise use the Windows system fonts the
// original reels were designed in.
//
// fonts.json: { "files": [...], "label": "<file for timestamp labels>",
//               "faces": { "serif": {"family": "..."}, "condensed": {"family": "...", "scaleX": 82}, ... } }
const WINDOWS = {
  src: "C:/Windows/Fonts",
  files: ["BOD_R.TTF", "BOD_I.TTF", "BOD_CR.TTF", "BOD_CI.TTF", "Gabriola.ttf", "segoeuil.ttf", "arial.ttf"],
  label: "arial.ttf",
  faces: {
    serif: { family: "Bodoni MT" },
    condensed: { family: "Bodoni MT Condensed" },
    script: { family: "Gabriola" },
    sans: { family: "Segoe UI Light" },
  },
};

export function fontSet() {
  const dir = path.join(HERE, "fonts");
  const manifest = path.join(dir, "fonts.json");
  if (fs.existsSync(manifest)) {
    const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
    return { src: dir, files: m.files, label: path.join(dir, m.label), faces: m.faces };
  }
  if (fs.existsSync(path.join(WINDOWS.src, WINDOWS.files[0]))) {
    return { ...WINDOWS, label: path.join(WINDOWS.src, WINDOWS.label) };
  }
  throw new Error("no fonts: add reelkit/fonts/fonts.json (see reelkit/fonts/README.md)");
}

// drawtext needs an explicit fontfile (this ffmpeg build has no fontconfig).
export function labelFont() {
  return filterPath(fontSet().label);
}

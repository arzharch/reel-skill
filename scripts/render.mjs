#!/usr/bin/env node
// Renders an edit.json into a finished 1080x1920 reel.
//
// The edit file decides *taste* (which moments, which copy, which look) and is
// written by Claude in the /reel skill. This file only does mechanics, and
// every cosmetic it can produce comes from the component library below, which
// was lifted from real high-performing villa reels (see reelkit/PLAYBOOK.md):
// hard cuts, one persistent upper-third line of serif copy, a film grade,
// slow-mo on 60fps sources, a slow push-in per shot. Nothing else.
//
//   node reelkit/render.mjs reelkit/edits/<name>.json [--out <dir>]
//
// Outputs reelkit/out/<name>.mp4 (with music) and <name>-silent.mp4 (for
// posting with a trending track picked in Instagram's own audio library).
// Relative paths in the edit resolve against the repo root; absolute paths
// are used as-is.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { HERE, ffmpeg, filterPath, fontSet, probe } from "./ff.mjs";

const ROOT = path.resolve(HERE, "..");
const W = 1080;
const H = 1920;
const FPS = 30;

// ---------------------------------------------------------------------------
// Component library
// ---------------------------------------------------------------------------

// Grades are deliberately gentle. The references never look "filtered": they
// look like good light. Lifted blacks + rolled highlights is the film part.
const GRADES = {
  "goa-warm":
    "eq=contrast=1.04:saturation=1.07," +
    "colorbalance=rs=0.02:bs=-0.03:rm=0.025:bm=-0.03:rh=0.02:bh=-0.035," +
    "curves=all='0/0.035 0.25/0.235 0.75/0.77 1/0.965'",
  "clean-airy":
    "eq=contrast=0.97:brightness=0.015:saturation=0.96," +
    "colorbalance=bs=0.01:bm=0.008," +
    "curves=all='0/0.05 0.5/0.53 1/0.985'",
  "golden-hour":
    "eq=contrast=1.06:saturation=1.1," +
    "colorbalance=rs=0.04:bs=-0.05:rm=0.04:bm=-0.04:rh=0.03:bh=-0.05," +
    "curves=all='0/0.04 0.5/0.52 1/0.95'",
  none: "null",
};

const FINISH = "vignette=angle=PI/7,unsharp=5:5:0.35,noise=alls=3:allf=t";

// Fonts are copied into a temp fontsdir for libass (system fontconfig is
// broken in this ffmpeg build, and pointing at all of C:/Windows/Fonts is
// slow). Presets name a role (serif, condensed, script, sans); ff.mjs maps
// roles to families, so the open-licence set in reelkit/fonts drops in.
const FONTS = fontSet();

const BRAND_ACCENT = "F2C94C"; // warm yellow, as in "That one AIRBNB in Goa"

// Text presets. Every preset holds for the whole reel (none of the reference
// hits change copy mid-reel), sits centered in the upper third, has no box,
// and gets a blurred shadow layer instead of an outline.
const TEXT_Y = 0.29 * H;

function textPreset(preset, lines, accent) {
  const a = accent || BRAND_ACCENT;
  switch (preset) {
    // "this & going offline": one lowercase line, quiet. StayVista 9M / 8.4M.
    case "whisper":
      return [{ text: lines[0], font: "serif", size: 54, y: TEXT_Y, delay: 0 }];
    // "That one / AIRBNB / in Goa": small-big-small, hero word in the accent.
    case "lockup":
      return [
        { text: lines[0], font: "serif", italic: true, size: 56, y: TEXT_Y - 128, delay: 0 },
        { text: lines[1], font: "condensed", size: 240, y: TEXT_Y, color: a, spacing: 6, delay: 140 },
        { text: lines[2], font: "serif", italic: true, size: 56, y: TEXT_Y + 124, delay: 280 },
      ];
    // "POV: you found a / perfect villa for diwali / in pune": script kicker,
    // serif main line, small location.
    case "pov":
      return [
        { text: lines[0], font: "script", size: 72, y: TEXT_Y - 74, delay: 0 },
        { text: lines[1], font: "serif", size: 60, y: TEXT_Y, delay: 140 },
        { text: lines[2] || "", font: "serif", italic: true, size: 40, y: TEXT_Y + 62, delay: 280 },
      ].filter((l) => l.text);
    // "*Netflix* is cool but imagine living with this view": one borrowed
    // word in its own color breaks the pattern. Mark it with *word*.
    case "interrupt":
      return [{ text: lines[0], font: "serif", italic: true, size: 54, y: TEXT_Y, accent: a, delay: 0 }];
    // Ad copy that changes with the shots (client-supplied lines). Same
    // upper-third serif as whisper, one size up, so a sequence of lines still
    // reads as one voice. Long lines break onto two rows at "|".
    case "line":
      return lines[0].split("|").map((t, i, all) => ({
        text: t.trim(),
        font: "serif",
        size: 62,
        y: TEXT_Y + (i - (all.length - 1) / 2) * 76,
        delay: i * 120,
      }));
    // Sign-off under the end-card logo.
    case "signoff":
      return [{ text: lines[0], font: "serif", italic: true, size: 56, y: 0.62 * H, delay: 0 }];
    default:
      throw new Error(`unknown text preset: ${preset}`);
  }
}

// ---------------------------------------------------------------------------

function assColor(rgb, alpha = 0) {
  const r = rgb.slice(0, 2), g = rgb.slice(2, 4), b = rgb.slice(4, 6);
  return `&H${alpha.toString(16).padStart(2, "0")}${b}${g}${r}`.toUpperCase();
}
function assTime(s) {
  const cs = Math.max(0, Math.round(s * 100));
  const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), sec = Math.floor((cs % 6000) / 100), c = cs % 100;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}
function assEscape(s) {
  return s.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}
function withAccent(text, accentRgb) {
  // *word* -> accent color run
  return assEscape(text).replace(/\*([^*]+)\*/g, (_, w) => `{\\c${assColor(accentRgb)}&}${w}{\\c&HFFFFFF&}`);
}

// `text` is one block (held for the whole reel, the default) or an array of
// blocks with their own start/end, for ad copy that changes with the shots.
// Blocks that end before the reel does also fade out.
function buildAss(textSpec, totalS, watermark) {
  const blocks = Array.isArray(textSpec) ? textSpec : [textSpec];
  const ev = [];
  for (const block of blocks) ev.push(...blockEvents(block, totalS));
  return assFile(ev, totalS, watermark);
}

function blockEvents(textSpec, totalS) {
  const start = textSpec.start ?? 0.15;
  const end = textSpec.end ?? totalS;
  const fadeOut = end < totalS - 0.05 ? 280 : 0;
  const rows = textPreset(textSpec.preset, textSpec.lines, textSpec.accent);
  const ev = [];
  for (const r of rows) {
    const t0 = start + (r.delay || 0) / 1000;
    const face = FONTS.faces[r.font];
    const tags = [
      `\\fn${face.family}`,
      `\\fs${r.size}`,
      face.scaleX ? `\\fscx${face.scaleX}` : "",
      r.italic ? "\\i1" : "\\i0",
      r.spacing ? `\\fsp${r.spacing}` : "",
      `\\fad(500,${fadeOut})`,
      `\\move(540,${Math.round(r.y + 14)},540,${Math.round(r.y)},0,650)`,
    ].join("");
    const body = r.accent ? withAccent(r.text, r.accent) : assEscape(r.text);
    // Legibility without a box: a wide, soft dark glow underneath (holds up
    // on pale sky and white walls), then the crisp fill with a hairline halo.
    const plain = body.replace(/\{\\c&H[0-9A-F]+&\}/g, "");
    ev.push(`Dialogue: 0,${assTime(t0)},${assTime(end)},T,,0,0,0,,{${tags}\\c&H000000&\\3c&H000000&\\alpha&H58&\\bord6\\blur14}${plain}`);
    ev.push(`Dialogue: 1,${assTime(t0)},${assTime(end)},T,,0,0,0,,{${tags}\\c${r.color ? assColor(r.color) : "&HFFFFFF"}&\\3c&H000000&\\3a&HB0&\\bord1.2\\blur1.5}${body}`);
  }
  return ev;
}

function assFile(ev, totalS, watermark) {
  if (watermark) {
    ev.push(`Dialogue: 1,0:00:00.00,${assTime(totalS)},T,,0,0,0,,{\\fn${FONTS.faces.sans.family}\\fs30\\alpha&H60&\\pos(540,1585)\\bord0\\shad0}${assEscape(watermark)}`);
  }
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: T,${FONTS.faces.serif.family},54,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${ev.join("\n")}
`;
}

// Per-shot chain: trim -> retime -> push-in (and optional entry move) -> crop.
// The push is a continuous scale driven by t, so it never stair-steps the way
// zoompan does on short clips. The scale covers the frame whatever the
// source shape (landscape and 4:5 phone clips get a centre crop).
function shotFilter(i, shot, srcFps) {
  const speed = shot.speed ?? 1;
  const push = shot.push ?? 0.035;
  const dur = shot.dur;
  const srcDur = +(dur * speed).toFixed(3);
  let zoom = `(1+${push}*t/${dur})`;
  if (shot.transition === "punch") zoom = `${zoom}*(1+0.1*pow(max(0,1-t/0.28),2))`;
  const parts = [
    `trim=start=${shot.in}:duration=${srcDur}`,
    `setpts=(PTS-STARTPTS)/${speed}`,
    `fps=${FPS}`,
    `scale=w='trunc(max(${W},${H}*iw/ih)*${zoom}/2)*2':h=-2:eval=frame:flags=lanczos`,
    `crop=${W}:${H}`,
    `setsar=1`,
  ];
  if (shot.transition === "flash") parts.push(`fade=t=in:st=0:d=0.16:color=0xFFF3E0`);
  if (speed < 1 && srcFps < 50) console.warn(`  ! shot ${i}: ${speed}x slow-mo on a ${srcFps.toFixed(0)}fps source will stutter`);
  return `[${i}:v]${parts.join(",")}[s${i}]`;
}

function main() {
  const args = process.argv.slice(2);
  const outFlag = args.indexOf("--out");
  const editPath = args.find((a, i) => !a.startsWith("--") && i !== outFlag + 1);
  if (!editPath) {
    console.error("usage: node reelkit/render.mjs <edit.json> [--out <dir>]");
    process.exit(1);
  }
  const edit = JSON.parse(fs.readFileSync(editPath, "utf8").replace(/^﻿/, "")); // Windows editors add a BOM
  const name = edit.name || path.basename(editPath, ".json");
  const outDir = outFlag >= 0 ? path.resolve(args[outFlag + 1]) : path.join(ROOT, "reelkit", "out");
  fs.mkdirSync(outDir, { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "reelkit-"));

  const fontDir = path.join(work, "fonts");
  fs.mkdirSync(fontDir);
  for (const f of FONTS.files) {
    const src = path.join(FONTS.src, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(fontDir, f));
  }

  // validate shots against their sources before spending time rendering
  const shots = edit.shots;
  const inputs = [];
  const chains = [];
  let total = 0;
  shots.forEach((s, i) => {
    const file = path.resolve(ROOT, s.clip);
    const { duration, fps } = probe(file);
    const need = s.in + s.dur * (s.speed ?? 1);
    if (need > duration + 0.02) throw new Error(`shot ${i} (${s.clip}) needs ${need.toFixed(2)}s, source is ${duration.toFixed(2)}s`);
    inputs.push("-i", file);
    chains.push(shotFilter(i, s, fps));
    total += s.dur;
  });
  total = +total.toFixed(3);

  const grade = GRADES[edit.grade || "goa-warm"];
  if (!grade) throw new Error(`unknown grade: ${edit.grade}`);
  let graph = chains.join(";") + ";";
  graph += shots.map((_, i) => `[s${i}]`).join("") + `concat=n=${shots.length}:v=1:a=0[cat];`;
  graph += `[cat]${grade},${FINISH}[graded];`;
  let label = "graded";

  // End card: the last shot keeps playing under a brand-green tint, and the
  // logo fades in once, centered. This is the only place the logo appears.
  if (edit.endcard) {
    const ec = edit.endcard;
    const t = ec.start;
    const logoIdx = shots.length;
    inputs.push("-loop", "1", "-framerate", String(FPS), "-i", path.resolve(ROOT, ec.logo));
    graph += `color=c=0x${ec.tint || "0B3A30"}:s=${W}x${H}:r=${FPS}:d=${total},format=rgba,colorchannelmixer=aa=${ec.dim ?? 0.62},fade=t=in:st=${t}:d=0.8:alpha=1[dim];`;
    graph += `[${logoIdx}:v]scale=${ec.size || 280}:-1,format=rgba,fade=t=in:st=${t + 0.4}:d=0.8:alpha=1[logo];`;
    graph += `[graded][dim]overlay=0:0:shortest=1[tinted];[tinted][logo]overlay=(W-w)/2:${Math.round(0.45 * H)}-h/2:shortest=1[carded];`;
    label = "carded";
  }

  graph += `[${label}]`;
  if (edit.text) {
    const assFile = path.join(work, "text.ass");
    fs.writeFileSync(assFile, buildAss(edit.text, total, edit.watermark), "utf8");
    graph += `ass=filename='${filterPath(assFile)}':fontsdir='${filterPath(fontDir)}',`;
  }
  graph += `format=yuv420p[v]`;

  const silentOut = path.join(outDir, `${name}-silent.mp4`);
  const finalOut = path.join(outDir, `${name}.mp4`);
  console.log(`rendering ${name}: ${shots.length} shots, ${total}s`);
  ffmpeg(
    ["-v", "error", "-y", ...inputs, "-filter_complex", graph, "-map", "[v]", "-t", String(total), "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-movflags", "+faststart", silentOut],
    { stdio: "inherit" }
  );

  if (edit.music) {
    const m = edit.music;
    const fadeOut = Math.max(0, total - 0.6);
    ffmpeg(
      [
        "-v", "error", "-y", "-i", silentOut, "-ss", String(m.start ?? 0), "-i", path.resolve(ROOT, m.file),
        "-map", "0:v", "-map", "1:a", "-t", String(total), "-c:v", "copy",
        "-af", `afade=t=in:d=0.08,afade=t=out:st=${fadeOut}:d=0.6,volume=${m.gain ?? 1},loudnorm=I=-14:TP=-1.5:LRA=11`,
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", finalOut,
      ],
      { stdio: "inherit" }
    );
  } else {
    fs.copyFileSync(silentOut, finalOut);
  }
  fs.rmSync(work, { recursive: true, force: true });
  console.log(`-> ${finalOut}\n-> ${silentOut}`);
}

main();

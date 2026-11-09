# reel-skill

[![license](https://img.shields.io/github/license/arzharch/reel-skill.svg)](LICENSE)

A [Claude Code](https://claude.com/claude-code) skill that turns raw video
footage into a postable, vertical (9:16) Instagram Reel. Point it at a
folder of clips and it picks the best moments, writes the on-screen copy and
caption, renders the cut with ffmpeg, then scores its own result against a
rubric and re-cuts before handing it back.

## Install

```
npx github:arzharch/reel-skill
```

This copies the skill into `.claude/skills/reel/` in the current folder. No
npm account needed. Open that folder in Claude Code and ask it to make a
reel from a footage folder.

## How it works

1. **Ingest** — reads every clip in the folder and builds a timestamped
   contact sheet so Claude can see what's actually in each shot.
2. **Concept** — picks a format and writes the hook line, body copy and
   caption from the formulas in `PLAYBOOK.md`.
3. **Edit** — writes a shot list (clip, in-point, duration, speed, text,
   colour grade) as a small JSON file.
4. **Render** — `scripts/render.mjs` cuts it with ffmpeg: crops to 9:16,
   grades it, burns in the captions, adds an end card.
5. **Review** — `scripts/review.mjs` pulls hook/mid frames back out and
   Claude scores them against `RUBRIC.md`, fixing the single biggest issue
   and re-rendering, up to three rounds.
6. **Hand off** — a finished `.mp4`, a `-silent.mp4` for adding a trending
   track inside Instagram, a ready-to-paste caption, and a one-line note on
   what would make the next cut stronger.

Everything runs locally. No footage, copy or captions are sent anywhere
except through ffmpeg and Claude's own reasoning.

## Requirements

- Node.js
- ffmpeg with the `ass` filter (for burned-in captions)

## What's in here

- `SKILL.md` — the instructions Claude follows
- `scripts/` — the ffmpeg pipeline (ingest, render, review)
- `PLAYBOOK.md` — reel formats and copy formulas
- `RUBRIC.md` — the scoring Claude reviews its own renders against
- `examples/` — a worked edit file showing the JSON schema
- `brand/` — a logo placeholder used on the end card (swap in your own)

## FAQ

**What is reel-skill?**
A Claude Code skill (an instruction file plus a small ffmpeg toolchain) that
automates turning raw video clips into a short, vertical, captioned
Instagram Reel, end to end, inside a Claude Code session.

**Do I need to know ffmpeg or video editing to use it?**
No. You give Claude a folder of video files and a short request ("make a
reel from this footage"); Claude runs the pipeline and reviews its own
output for you.

**Does it post to Instagram for me?**
No. It renders the finished video file locally and gives you a caption and
a song brief. Posting, including picking a trending audio track, happens
inside the Instagram app.

**Can I use my own fonts, brand colours, or logo?**
Yes. Swap the files in `brand/` and the font set in `scripts/fonts/`, and
adjust the `grade` presets in `scripts/render.mjs`.

**Does it work outside Claude Code, e.g. in Claude.ai or Claude Desktop?**
Yes. `SKILL.md` is self-contained; the same instructions work if a non-
technical teammate unzips the skill folder and gives Claude Desktop access
to it directly.

**Is any footage or data sent to a third-party service?**
No. Rendering happens locally through ffmpeg; nothing is uploaded or
fetched from the internet by the skill itself.

## License

MIT

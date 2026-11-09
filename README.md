# reel-skill

A Claude Code skill that turns raw property/villa footage into a postable
9:16 Instagram reel. Claude picks the moments, writes the copy, renders with
ffmpeg, then critiques its own output against a rubric before handing it back.

## Install

```
npx reel-skill
```

This copies the skill into `.claude/skills/reel/` in the current folder.
Open that folder in Claude Code and ask it to make a reel from a footage
folder.

## Requirements

- Node.js
- ffmpeg with the `ass` filter (for burned-in captions)

## What's in here

- `SKILL.md` — the instructions Claude follows
- `scripts/` — the ffmpeg pipeline (ingest, render, review)
- `PLAYBOOK.md` — reel formats and copy formulas
- `RUBRIC.md` — the scoring Claude reviews its own renders against
- `examples/` — a worked edit file
- `brand/` — a logo placeholder used on the end card (swap in your own)

---
name: reel
description: Turn raw villa footage into a postable 9:16 Instagram reel. The user gives a folder path (or uploads clips); Claude picks the moments, copy and format by looking at contact sheets of the clips, renders with ffmpeg, then critiques the rendered frames against reference reels and iterates. Use when the user shares villa videos, a folder of clips, and asks for a reel, an ad, or a short video.
---

# Reel: footage in, postable reel out

You handle taste (moments, copy, format) and critique. The scripts in
`scripts/` handle the mechanics. `SKILL_DIR` below means the folder this file
is in. Read `SKILL_DIR/PLAYBOOK.md` and `SKILL_DIR/RUBRIC.md` before step 2.
They are the design rules and override instinct.

This usually arrives as an unzipped `Reel Maker` folder on the user's
computer that they gave you access to, with a message asking you to follow
this file; `SKILL_DIR` is the `reel` folder inside it. If they attached
the zip instead, unzip it to a scratch folder such as `/tmp/reel-kit/`
first. `START HERE.txt` is the user's guide, not yours. If they name no video
folder, use the `videos` folder inside `Reel Maker`.

## Who you are talking to

The people using this are not technical. They will paste a folder path such
as `C:\Users\Priya\Videos\Villa Azure` and say something like "make a reel".

- Never show them commands, code, JSON or error traces, and never ask them to
  run anything. Do all of it yourself.
- Talk in plain words: "I'm looking through your clips", "Your reel is ready".
- Ask at most one short round of questions, only if the answer changes the
  reel: the property name, any exact lines they must use, and whether they
  have a music file. If they say "you decide", decide.
- If something fails, fix it yourself. Only tell them about a problem they
  can act on, in one plain sentence ("I can't open that folder. Please give
  me access to it and send the path again.").

## 0. Preflight (once per conversation, silently)
```bash
cd SKILL_DIR && node --version && (ffmpeg -hide_banner -filters | grep -w ass) || echo MISSING
```
If `node` is missing: `pip install nodejs-wheel` (it puts `node` on PATH).
If ffmpeg is missing or has no `ass` filter:
```bash
pip install imageio-ffmpeg
export FFMPEG=$(python -c "import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())")
```
Then prefix every script command below with `FFMPEG=$FFMPEG`. (ffprobe is
optional; the scripts fall back to `ffmpeg -i`.) If there's still no `ass`
filter, tell the user in one sentence that this setup can't add text to video
and stop.

Work in a scratch folder (`/tmp/reel/` or this environment's temp folder).

## 1. Find the footage
In order:
1. **A folder path from the user.** Use it directly if you can read it. In
   Claude Desktop the folder they gave you access to may appear under a
   different path (a mounted folder). Look for the folder with the same name
   and the same video files. If you truly can't reach it, ask them once to
   give you access to that folder.
2. **Uploaded files**, usually in `/mnt/user-data/uploads/`.

Take every `.mp4`, `.mov` and `.m4v` in the folder (not in subfolders you
created). Do not copy large clips around; point the scripts at them where
they are. If the folder also holds a `.mp3`/`.m4a`/`.wav`, treat it as the
music unless the user says otherwise. If it holds a `.txt`, `.md` or `.docx`
brief, read it.

```bash
node SKILL_DIR/scripts/ingest.mjs "<footage folder>" --out /tmp/reel/ingest
```
**View** every `/tmp/reel/ingest/*.jpg` sheet (4 frames/sec, timestamped).
For each clip, note in one line:
- the best 1 to 2.5s window
- any in-camera transition (foliage wipe, door opening, walking through a
  doorway, a pan revealing a view)
- whether a person is in frame
- `slowmoOk` and `portrait` from `footage.json`

Non-portrait clips get a centre crop, so check that the subject is central.

If the user gave copy lines (typed, or in a brief), use them **verbatim**.
The logo appears once only, on the end card.

## 2. Concept
Pick one format from PLAYBOOK.md. With no supplied copy, write 5 options from
the formulas and pick the strongest. If a line describes what's on screen,
reject it. Pick a hook shot that has motion in frame 0, and an end shot that
loops back to the hook.

## 3. Edit
Write `/tmp/reel/edit.json`. `SKILL_DIR/examples/new-year-2027.json` is a
full example: copy that changes with the shots, an end card, and music.

Use **absolute paths** for every `clip`, `logo` and `music.file`. The brand
logo is `SKILL_DIR/brand/logo-white.png`.

- `shots[]`: `clip`, `in` (source seconds), `dur` (output seconds), `speed`
  (0.6 to 0.7 on 60fps sources, 1 otherwise), `push` (0.02 to 0.04), and
  optionally `transition`: `punch` or `flash`, once each at most
- `text`: one block `{preset, lines}` held all reel, or an array of blocks
  with `start`/`end`. Presets: `whisper`, `lockup`, `pov`, `interrupt`,
  `line` (rows split on `|`), `signoff`
- `grade`: `goa-warm`, `clean-airy`, or `golden-hour`
- optional `endcard` `{logo, start, size}`, `music` `{file, start}` (only if
  the user supplied a track), and `watermark`

`in + dur*speed` must fit inside the clip. The renderer rejects it otherwise.

## 4. Render and review (up to 3 rounds)
```bash
node SKILL_DIR/scripts/render.mjs /tmp/reel/edit.json --out /tmp/reel/out
node SKILL_DIR/scripts/review.mjs /tmp/reel/out/<name>.mp4
```
View the `-sheet`, `-hook` and `-mid` images. Score them with RUBRIC.md,
citing timestamps. Fix the single biggest issue and re-render. 4K clips
render slowly; tell the user once that it takes a few minutes.

## 5. Hand off
Save the finished files where the user will find them:
- If you worked from their folder, make a `Reels` folder inside it and
  put `<name>.mp4` and `<name>-silent.mp4` there.
- Otherwise put them in this environment's outputs folder
  (`/mnt/user-data/outputs/`) so they appear as downloads.

Then tell the user, in plain words:
- where the two videos are (give the full path in their own terms, for
  example `C:\Users\Priya\Videos\Villa Azure\Reels`). The "silent"
  one is for posting with a trending song picked inside Instagram
- a ready-to-paste post caption: hook line, 3 to 5 property facts, location,
  call to action, and 5 hashtags. Details go here, not on screen
- what kind of song to search for in Instagram's audio library
- one line on how good it is and what would make it better (for example
  "a slow-motion clip of the pool would make a stronger opening"). Keep the
  rubric scores to yourself unless they ask

If they ask for changes ("make it shorter", "use the pool shot first",
"change the text"), edit, re-render, review, and hand off again the same way.

# Reel playbook

Everything here comes from real villa reels watched frame by frame on
2026-11-09. They were measured with an in-browser cut detector, and their
text was read off full-res frames. Each component in `render.mjs` maps to
something below. If a cosmetic isn't in this file, don't add it.

## Reference reels

| Reel | Views | Length | Avg shot | On-screen text | Notes |
|---|---|---|---|---|---|
| StayVista — The River Story, Manali (`DV3r3Y7tvWp`) | 9M | 10.8s | 2.7s | "this and no work calls", tiny lowercase serif, upper third, whole reel | first shot is a 5.8s continuous gimbal push into a riverside setup |
| StayVista — Water's Edge, Sonmarg (`DYFYgn7IRiR`) | 8.4M | 12.0s | 2.4s | "this & going offline", same treatment | wide establishing shot with moving water, ends on the house |
| StayVista — Nestled North, Kashmir (`DNGLrT3Id10`) | 5M | 10.2s | 1.3s | "*Netflix* is cool but imagine living with this view in Kashmir". Script italic, with "Netflix" in Netflix red | window views, ends on a firepit at dusk |
| @btwitsnaman (`DegbhnwT0yM`) | 2.1M | 19.2s | 0.8s | "That one / **AIRBNB** / in Goa": small serif, big yellow condensed Didone, small serif | creator collab with people in most shots (party, kitchen, flop onto bed) |
| StayVista × creator, Pune (`DfZ1YTVhWrY`) | 98.9K | 23.9s | — | "POV: You found a / Perfect villa for Diwali Party / In Pune 📍" | runs day to sunset; creator handle as a faint watermark |
| creator (`DfR6DZuOKA0`) | 870 | 17.0s | 2.8s | tiny, unreadable | 8s of one static shot and no hook. This is what *not* to do |

Music on the hits is always a trending track from Instagram's own library
(e.g. "Sudh Budh Khoi Maine" on the 5M reel), added in-app. Long property
details go in the post caption, never on screen.

## Rules

1. **One line of copy, all reel long.** None of the hits change on-screen
   text mid-reel. The copy holds while the shots change underneath it.
2. **Copy is a feeling or a POV, never a description.** "this & going
   offline" works, and "Terrazzo floors, wide spaces" doesn't. If the line
   describes what's visible in the frame, it's wrong.
3. **Copy sits in the upper third, centered, with no box.** Elegant serif,
   held up by a soft shadow and nothing else. No black display fonts, no
   pills, no bottom-left subtitles.
4. **Hard cuts only.** None of the hits use dissolves, `hblur`, or zoom
   transitions. Movement between shots comes from the camera: foliage wipes,
   doors swinging open, walking through doorways. Allowed accents, once
   each at most: `punch` (shot enters 10% zoomed and settles) and `flash`
   (a 0.16s warm-white exposure pop).
5. **10–14s for feeling reels, 15–20s for montages.** Shorter reels loop
   more, and the 9M and 8.4M reels are both under 12s. End on something
   warm (sunset, lamps, fire) that cuts cleanly back to the first frame.
6. **Shoot 60fps, edit at 0.6–0.7x.** Slow-mo is the cheapest "luxury"
   signal there is. Every source here except `breakfast-spread` is 60fps.
7. **Every shot drifts.** A 3–4% push-in per shot, so nothing sits dead
   still.
8. **Grade gently.** Lift the blacks, roll off the highlights, warm the
   mids. It should look like good light, not a filter.
9. **Put people in it.** The creator reels outperform the brand reels by
   orders of magnitude because a human is living in the space. Prefer shots
   with someone in them.

## Formats (`text.preset`)

| Preset | Lines | Use when | Example |
|---|---|---|---|
| `whisper` | 1 | quiet, aspirational, short (10–13s) | `["this & no checkout time"]` |
| `lockup` | 3: kicker, HERO, place | montage, creator energy (15–20s) | `["that one", "VILLA", "in goa"]` |
| `pov` | 2–3: script kicker, serif line, place | a specific occasion or audience | `["POV: you found a", "villa for the whole gang", "in goa"]` |
| `interrupt` | 1, with `*word*` accented | contrast or pattern-break joke | `["*netflix* is cool but have you tried this pool"]` |

Copy formulas that show up across the hits:
- `this & <thing you escape from, negated>`: "this & no work calls", "this & going offline"
- `<everyday thing> is cool but <this>`
- `that one <category> in <place>`
- `POV: you found a <specific villa for a specific occasion>`

Keep it lowercase (except the lockup HERO), at most about 8 words, and with
no exclamation marks or emoji in the burned-in text.

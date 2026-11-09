# Critique rubric

Score from the review images (`review.mjs` output), never from the edit plan.
The old app scored plans against hard-coded mood weights, which is how
"Red skirt on the bed" got a 10/10 for text quality. Every score below has
to point at something visible in a frame.

Anchors. Calibrate against these before scoring anything:
- **9**: StayVista 9M / 8.4M reels, @btwitsnaman 2.1M
- **3**: the old generator's `gen-mw65sr1d-zl66-ai-plan-1-elegant-interiors.mp4`

| # | Dimension | 9 looks like | 3 looks like |
|---|---|---|---|
| 1 | Hook (first frame and first 1s) | motion or a reveal in frame 0, and the copy is readable by 0.6s | a static corridor or curtain, with no text until later |
| 2 | Copy | a feeling or POV you'd send to a friend | describes the visible object ("Terrazzo floors") |
| 3 | Typography | elegant serif, upper third, readable on the brightest shot, no box | heavy black sans at bottom-left, subtitle-sized |
| 4 | Cut and transitions | hard cuts, with motion carrying across cuts | crossfades, blur wipes, zoom transitions |
| 5 | Finish | graded, 1080p, slow-mo, gentle drift, no dead frames | flat colour, 720p, static holds |
| 6 | Audio | trending track (posted silent and added in-app) or on-beat | generic stock bed with no relation to the cuts |
| 7 | Length and loop | 10–14s, last frame cuts cleanly back into the first | 25s+, ends on a random shot |

Report each score with one sentence that cites a frame (e.g. "11.0s: copy
low-contrast on pale sky"), then the average, then the **single** most
important fix. Apply that fix and re-render. Stop after 3 rounds, or once
every dimension is 7 or higher.

Don't score above 8 unless it would hold up next to the 9-anchors in the
same feed. Ground truth comes later: Instagram Insights at 48h (views,
3-second hold rate, shares per 1k reach). Log those against each edit in
`reelkit/results.csv` so the rubric can be recalibrated against real data.

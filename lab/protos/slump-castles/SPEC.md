# Slump Castles

- **Verb:** heap
- **Depth engine:** expression
- **Age band:** 5 to 8
- **Lens:** physical-toy (sandpit)
- **Hooks declared:** none

## Loop
A flat sandpit seen from above, drawn as contour bands. With the shovel the child drags to scoop sand (up to a load), and stopping or lifting pours the load into a heap; a first touch scoops a little. With the bucket the child holds or drags to sprinkle water. Damp sand holds a steep wall; dry sand slumps to a gentle slope. Sand dries from the top down, and a thick dry skin slows the drying of the damp core beneath it, so a damp tower slowly slumps by itself into a ridge, a ring, or a saddle. Too much water turns the sand to soup that holds nothing, then drains.

## What should vary on repeat play
Given play 5: The child builds with the drying in mind, a wet core under a dry skin or a wet ring wall around a pit, so the slump finishes an even crater rim or a saddle between two peaks that hands alone could not push into place on play 1.

How the sim produces it: each column keeps a height and a dry-skin depth. Stability depends on how much of a column is damp (dry holds 1 band per cell, damp holds 4.5, soaked 0.6), so the same pile of sand ends up as different landforms depending on when and where it was wet. Evaporation thickens the skin by about the square root of time, so a thick wet core outlasts a thin wet strip, and each session's hidden weather (cloudy, mild, sunny) changes the drying pace, so a learned timing has to be re-read from the sand's colour. The observed signature is the landform (flat, pit, mound, ridge, saddle, scatter, ring) crossed with the sand's condition (settled, standing on damp sand, slumping, soupy). A closed rim is found by flood fill, so a ring exists only when its wall is complete, and a ring whose wall is too thin slumps inward, fills its own crater, and falls back to a mound.

Features: `peak` (up), `enclosed` (up), `damp`, `standing`.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: kaia, tess, arch-6, arch-7, arch-8, arch-9 (18 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 1 of 18 runs (6%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 1, 1, 1 of 18.
- **Play 5 against play 1:** change 0.55 (0.55 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 24 adopted, 0 made progress. Tried: damp down, damp up, enclosed up, peak up, standing down, standing up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective peak up; outcome variety 1.76 bits (by policy: greedy 0.00, random 2.22, repeat-one 0.00). Dominant strategy: no (no policy dominates).
- **Hook flags:** none declared.
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 1 of 18 target-panel runs (6%) start session 3, 44.4 points short of the 50% line (8 more runs needed).
- No self-set aim made progress (0 of 24 adopted).
- Left first: `arch-7` and `tess`, starting 1.0 of 5 sessions on average (the best in the target panel starts 2.3).

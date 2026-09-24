# Dawdle Parade

- **Verb:** lead
- **Depth engine:** other-minds
- **Age band:** 2 to 5
- **Lens:** other
- **Hooks declared:** pond

## Loop
The child drags a mother duck across a meadow (or taps to send her there) and three ducklings trail her, each by its own habit. The yellow dawdler follows her path but stops at any flower it walks over; the orange cutter follows her path but barges up a place on any bend, freezing whoever it passes; the blue follower ignores her and follows only the duckling directly ahead, so it waits when that one waits and copies its shortcuts. The line stretches behind a dawdler, snarls when the cutter barges, and reforms in a new order. Two more levers reorder it: a hairpin turn flips the whole line, and a pause after a walk sends the last duckling running to the front. The `pond` hook adds a pond to lead the parade to (all three ducklings on its shore ends the parade), then a fresh meadow with one more flower patch.

## What should vary on repeat play
The child knows the dawdler stalls at flowers and the corner-cutter jumps the line on any bend, so they walk a loop on purpose to shuffle the corner-cutter to the front and steer wide of the flowers.

In the sim: each meadow is seeded, with the duckling order, the flowers, and the pond laid out fresh, so play 5 never repeats play 1's layout, but the three habits never change, so what the child learned in session 1 is exactly what pays in session 5. A straight walk to the pond always runs over one flower (the dawdler stalls for 3 to 4 seconds and the line strings out). A bend moves the cutter up and bumps the one it passes; a loop of two or three bends brings the cutter to the front, where turning no longer bumps anyone. A hairpin sends it back, so the child learns to swing wide instead of turning around; a pause rotates the line. The line order (6 orders), how the line hangs (tight, loose, strung, snarl), and whether the dawdler is stopped make up the signature, so a child who steers on purpose reaches signatures a wandering child does not. Flowers grow from 4 to 7 patches as parades come home (pond hook), so routes have to be planned, not just walked.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: kaia, tess, arch-3, arch-6 (12 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 2 of 12 runs (17%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 2, 1, 1 of 12.
- **Play 5 against play 1:** change 1.75 (1.75 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 18 adopted, 2 made progress. Tried: cutter_place down, dawdling down, home up, hops down, hops up, spread down, spread up, stalls down, stalls up, together up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective together up; outcome variety 3.97 bits (by policy: greedy 3.63, random 4.30, repeat-one 1.41). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 16.7% with every hook on, 25.0% with all off):
  - `pond`: not needed; without it 25.0%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 2 of 12 target-panel runs (17%) start session 3, 33.3 points short of the 50% line (4 more runs needed).
- Left first: `arch-6` and `tess`, starting 1.3 of 5 sessions on average (the best in the target panel starts 3.0).

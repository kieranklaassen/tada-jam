# Under the Cloth

- **Verb:** dowse
- **Depth engine:** mystery (secondary: variation)
- **Age band:** 6 to 9
- **Lens:** physical-toy (magnets)
- **Hooks declared:** score, level

## Loop
A blank cloth hides magnets (north-up or south-up) and iron plates. The child drags a hand magnet over it and taps to flip its pole. Beads scattered on the cloth react inside the hand magnet's zone: they clump toward a hidden thing that attracts the current pole and ring away from one that repels it. Iron attracts under both poles; a magnet flips with the pole. The hand magnet lurches (pulled or pushed off the finger) and snaps onto an attractor; flipping the pole then holds it on iron but shoves it off a magnet. The child drops guess tokens (north magnet, south magnet, iron) on the cloth and lifts it to check; each lift shows the truth and calls each guess right or wrong, then a fresh cloth with a new hidden layout is laid.

Characteristic moment: with the hand magnet held near a hidden magnet the beads ring away; a flip of the pole turns the ring into a clump and the hand snaps on. A flip on a snapped magnet shoves the hand off; on iron it holds firm. That flip is how a magnet is told from an iron plate.

## What should vary on repeat play
The given play-5 line: the child reads a clump versus a ring at a glance, flips the pole first to tell a magnet from an iron plate, and goes after the spot where two hidden magnets sit close and half cancel each other.

How the sim produces it: every session lays a new hidden layout from the seed (3 to 5 things, kinds and places random, and a close opposite pair, the "twin", on about four cloths in ten), so the same skill has to be spent again on new ground. The rule that decodes the cloth is never stated. Under one pole a hidden thing clumps or rings; only the pair of readings across both poles separates north magnet, south magnet, and iron (clump then ring: south magnet under a north hand; ring then clump: north magnet; clump both ways: iron). A twin reads as "mixed" (one side clumps, the other rings, and the hand lurches sideways), so the child who only reads single clumps misses it. The lift gives honest feedback per guess, which is what turns play 1's blind sweeping into play 5's targeted probing. The `level` hook makes a clean cloth lead to a bigger one that always holds a twin.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: tess, arch-6, arch-7, arch-8, arch-9 (15 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 6 of 15 runs (40%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 6, 4, 3 of 15.
- **Play 5 against play 1:** change 1.91 (1.91 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 47 adopted, 17 made progress. Tried: correct up, lifts down, lifts up, marks down, marks up, swept down, swept up, tested down, tested up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective correct up; outcome variety 4.10 bits (by policy: greedy 2.58, random 4.83, repeat-one 2.58). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 40.0% with every hook on, 40.0% with all off):
  - `score`: inconclusive (the persona model has no reward response); without it 40.0%
  - `level`: inconclusive (the persona model has no reward response); without it 40.0%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 6 of 15 target-panel runs (40%) start session 3, 10.0 points short of the 50% line (2 more runs needed).
- Hook ablation says little for `score`, `level`: removing them changed nothing the personas can register.
- Left first: `arch-6`, starting 1.3 of 5 sessions on average (the best in the target panel starts 3.3).

# Singing Plate

- **Verb:** tune
- **Depth engine:** expression (secondary: mystery)
- **Age band:** 8 to 11
- **Lens:** other
- **Hooks declared:** none

## Loop

The child touches a square plate to pour sand (a pinch on touch, a trickle while held, a drag draws a line of sand) and holds a finger on a pitch bar under it. Seven hidden tones sit along the bar (ring, cross, ex, star, diamond, target, grid, low to high). Inside a tone's window the plate shivers: every grain that is far from that tone's quiet lines hops, and hops again, until it lands on a quiet line and stops. Between tones the plate is still and the sand stays exactly where it is. A touch inside a window plucks the tone; sliding into a window takes about a tenth of a second to sing, so a fast sweep across a tone does not sound it. Found tones are marked on the bar and in a journal. A tip button empties the plate.

## What should vary on repeat play

Play 5 line: The child chains three tones in an order that walks the sand from a ring to a star to a cross, a mandala only that order makes, having learned the quiet lines of each tone and that the next tone scatters only the sand that sits on its shaking places.

How the sim produces it:

- Sand has memory. It is a set of grains that only move while a tone sounds and only when they are off that tone's quiet lines. Whatever the last tone left is the starting point for the next one.
- Tones overlap by design. The star's quiet lines contain the cross's and the ex's, so a cross pile sings the star without moving a grain (`fits`), while a star pile sung to cross or ex moves half its sand. Ring then star leaves eight beads on the ring's radius; star straight from a heap does not.
- The signature names the pile: `bare`, `bare-ring`, `heap`, `dancing`, the tone that last shaped it (`ring`), or the tone and the one before it (`cross<star`). Order shows: ring, star, cross gives `cross<star` with three different shapes worn; cross, star, ring gives `ring<cross` with two, because the star fitted and shaped nothing. 4 + 7 + 42 = 53 possible values.
- Tone positions are fixed, so the map from pitch to pattern is learnable across visits and the second-order facts (what fits, what scatters, what leaves beads) are what a child arrives with on play 5.
- The `woven` feature (distinct tones that have shaped the current pile since the last tip, objective up) is the self-set aim: build a pile three or more tones have worked.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-7, arch-8, arch-9, arch-11 (12 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 5 of 12 runs (42%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 5, 5, 4 of 12.
- **Play 5 against play 1:** change 6.74 (6.74 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 32 adopted, 9 made progress. Tried: found down, found up, grains down, grains up, ringing down, ringing up, settled down, settled up, woven up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective woven up; outcome variety 2.46 bits (by policy: greedy 0.79, random 2.57, repeat-one 0.67). Dominant strategy: yes, repeat-one beats random on the objective while its variety collapses.
- **Hook flags:** none declared.
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 5 of 12 target-panel runs (42%) start session 3, 8.3 points short of the 50% line (1 more run needed).
- Dominant strategy in self-play: repeat-one beats random on the objective while its variety collapses.
- Left first: `arch-8` and `arch-9`, starting 2.7 of 5 sessions on average (the best in the target panel starts 3.7).

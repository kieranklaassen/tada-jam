# Dip, Shrink, Sift

- **Verb:** divert
- **Depth engine:** combination
- **Age band:** 6 to 9
- **Lens:** physical-toy (marble-run)
- **Hooks declared:** orders

## Loop

A pegboard of five columns and six rows sits under a dispenser that drops a marble every second, over and over, from a bag of six (always two plain ones, a medium, a small, a large). The child drags pieces from a tray onto the pegboard, or picks one in the tray and taps empty cells to stamp it (the last piece picked stays the brush). Each marble meets the piece in every row it passes, in order: a **dip** paints a plain marble (only plain ones take paint), a **shrinker** takes it one size down, a **fork** sends it left or right by its colour, a **sieve** lets small ones (or small and medium) drop straight through and shoves the rest aside, a **slope** shoves it sideways, a **bell** rings and flashes what passed. A new dip or fork comes set to the first colour an order asks for. Tap a placed piece to change its setting (paint, size, direction); hold it to flip which side a fork or sieve uses; drag it off the board to remove it. Bins along the bottom each ask for something (red marbles, small marbles, small red marbles) and show green or red lights for the last three that landed. A bin is content when its last three were what it asked for. The middle bin, right under the dispenser, never asks for anything: it catches whatever falls straight down, so an empty board meets no order. Bins that ask for nothing take whatever arrives.

Because forks and sieves read what a marble has BECOME by the time it reaches them, the order of the pieces is the puzzle: a dip above a fork paints a plain marble so the fork turns it, and the same two pieces the other way round do nothing of the kind (the sim marks these as `chain-color` and `chain-size`, and the wrong order as `late-paint` and `late-shrink`).

## What should vary on repeat play

> The child puts the dip before the fork so only red marbles turn left, and the shrinker before the sieve so only small ones drop through, chaining two changes in an order that works one way round and not the other.

The seed builds a different bag of marbles and puts the bins' wants in different places every session, so the machine that worked last time does not work again and the child has to reason with what the pieces do, not replay a layout. Session one is mostly poking (the fork alone splits by colour, the dip alone changes nothing a fork can see); by session two or three a child who has learned that a dip only paints plain marbles, and that a fork reads the colour it sees *now*, puts the dip above the fork on purpose. Orders get harder when the `orders` hook is on: order 2 asks for two colours and a size, order 3 asks for small red marbles, which needs a shrinker above a sieve and a dip above a fork in the same machine, with the marbles routed to the right bins. Machines carry over from one order to the next, so the child edits rather than starts again.

The signature names the machine's chain class (bare, plain, painted, shrunk, both), how many wanting bins are content (0 to 3), and the order level (1 to 3): at most 60 classes.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: tess, arch-6, arch-7, arch-8, arch-9 (15 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 3 of 15 runs (20%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 3, 3, 2 of 15.
- **Play 5 against play 1:** change 0.39 (0.39 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 40 adopted, 11 made progress. Tried: chains down, chains up, content down, content up, order down, order up, pieces down, pieces up, purity up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective purity up; outcome variety 0.97 bits (by policy: greedy 0.00, random 1.41, repeat-one 0.00). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 20.0% with every hook on, 20.0% with all off):
  - `orders`: inconclusive (the persona model has no reward response); without it 20.0%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 3 of 15 target-panel runs (20%) start session 3, 30.0 points short of the 50% line (5 more runs needed).
- Hook ablation says little for `orders`: removing it changed nothing the personas can register.
- Left first: `arch-6`, starting 1.0 of 5 sessions on average (the best in the target panel starts 2.7).

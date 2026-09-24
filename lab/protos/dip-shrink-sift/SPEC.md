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
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses
_Filled after the panel run._

# Stones That Breathe

- **Verb:** leap
- **Depth engine:** variation
- **Age band:** 7 to 10
- **Lens:** other
- **Hooks declared:** bloom, widen

## Loop

A frog sits on the left bank, a lily on the right, and between them a river of stones (two lanes, four columns) that each rise and sink on their own slow period. The child taps a stone in reach and the frog leaps to it; taps queue, so a quick run of taps is a run of leaps (each leap takes a third of a second), and a last tap on the far bank ends the run. A leap that lands on a stone that is down, or a frog left sitting on a stone that sinks, is a soft splash back to the bank the run began from (nothing is lost, and the frog can go again at once). Reaching the far bank is a crossing; a crossing with no splash since the last one is a clean crossing, which is the loop's own aim. The `bloom` hook flowers the lily on a clean crossing (a win state); the `widen` hook adds a fifth column of stones to the river after a clean crossing (an unlock).

## What should vary on repeat play

> The child watches one full bob to find the day's shared beat, then waits at the bank for the instant the whole path is up and crosses in one run, where on play 1 they leapt stone by stone and got dunked.

Every session is a fresh day. The seed draws one hidden beat (about 3.6 to 5 seconds) and gives every stone a period that is a whole multiple of it, in one of four patterns: `unison` (1x and 2x), `thirds` (1x and 3x), `march` (1x, 2x, 4x, with a wave rolling across the river a quarter beat per column), and `zipper` (1x and 2x, the far lane half a beat behind). The world clock starts mid-cycle, so nothing lines up on the first tick. Because every period divides the day's cycle, the pond repeats exactly, and the moment the whole path is up comes back on a schedule the child can find by watching the slower stones. A generator only keeps days where some run works from at least 10% of the cycle (5% once widened) and where the wait for the next good moment never passes about 16 seconds, so the strategy is always available and never too far away. A scripted player that waits for a good instant and taps its route in one quick run crossed cleanly 80 times in 80 days (longest wait 4.7 seconds); a scripted player that just taps the forward stone that looks up right now succeeds about one attempt in three. Which routes and instants work changes with the pattern, so what was learned about waiting carries over but the exact answer does not.

## Findings
<!-- findings:start -->
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses
_Filled after the panel run._

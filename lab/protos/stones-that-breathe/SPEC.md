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
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-6, arch-7, arch-8, arch-9, arch-11 (15 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 2 of 15 runs (13%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 2, 0, 0 of 15.
- **Play 5 against play 1:** change 2.71 (2.71 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 21 adopted, 2 made progress. Tried: clean down, clean up, crossings up, landings up, progress down, progress up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective landings up; outcome variety 3.58 bits (by policy: greedy 3.28, random 2.56, repeat-one 3.92). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 13.3% with every hook on, 13.3% with all off):
  - `bloom`: inconclusive (the persona model has no reward response); without it 13.3%
  - `widen`: not needed; without it 13.3%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 2 of 15 target-panel runs (13%) start session 3, 36.7 points short of the 50% line (6 more runs needed).
- Hook ablation says little for `bloom`: removing it changed nothing the personas can register.
- Left first: `arch-7` and `arch-9`, starting 1.0 of 5 sessions on average (the best in the target panel starts 1.7).

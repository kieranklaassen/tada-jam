# Toes in Clouds

- **Verb:** pump
- **Depth engine:** mastery
- **Age band:** 5 to 8
- **Lens:** physical-toy (swing)
- **Hooks declared:** flag (a win marker: a flag planted on the far hill), island (an unlock: a cloud island opens after the first hill landing)

## Loop
A rider sits on a swing that is always moving. Holding the legs pad stretches the rider's legs out, which pushes the seat forward: it adds energy while the seat is going forward and takes it away while it comes back, so the arc grows only when the pumping is in step (holding all the time or in the wrong half does nothing). Tapping the let-go pad, or the rider, drops the rope: the rider leaves along the arc with the speed the seat had and flies as a plain projectile onto a lawn, a pond, a far hill, or a sandpit behind. Then the rider hops back on the still-coasting swing.

## What should vary on repeat play
Given play-5 line: the child now waits at the forward peak of a wide arc and lets go so the rider sails onto the far hill, having learned that where in the arc they release decides where the rider lands.

How the sim produces it: two stacked skills with one physical rule each. Pumping in step (rhythm) is the entry skill; it decides how wide the arc gets, which decides which places the rider can reach at all (a small swing only reaches the lawn or pond, a wide one reaches the far hill). Release timing is the ceiling: landing distance is a hump along the forward swing, poor at the bottom (fast but low), best a little before the peak (fast and already rising), poor again at the very top (no speed, the rider drops straight down, which lands on the lawn). The window that reaches the hill widens as the arc widens. After the first hill landing the island hook opens a cloud island that catches the higher releases (steeper, later in the arc), so "farther" and "higher" become two different targets along the same axis.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: kaia, tess, arch-6, arch-7, arch-8, arch-9 (18 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 0 of 18 runs (0%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 0, 0, 0 of 18.
- **Play 5 against play 1:** change 0.00 (0.00 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 27 adopted, 7 made progress. Tried: arc down, arc up, flights down, flights up, height down, height up, reach up, sync down, sync up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective arc up; outcome variety 1.79 bits (by policy: greedy 1.82, random 1.77, repeat-one 1.68). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 0.0% with every hook on, 0.0% with all off):
  - `flag`: inconclusive (the persona model has no reward response); without it 0.0%
  - `island`: inconclusive (the persona model has no reward response); without it 0.0%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 0 of 18 target-panel runs (0%) start session 3, 50.0 points short of the 50% line (9 more runs needed).
- Hook ablation says little for `flag`, `island`: removing them changed nothing the personas can register.
- Play 5 shows no measured change from play 1: no new signatures and no new action kinds.
- Left first: `arch-6`, `arch-7`, `arch-8` and 1 more, starting 1.0 of 5 sessions on average (the best in the target panel starts 1.3).

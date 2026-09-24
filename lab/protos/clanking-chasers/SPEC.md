# Clanking Chasers

- **Verb:** lure
- **Depth engine:** rule-play
- **Age band:** 7 to 10
- **Lens:** other
- **Hooks declared:** level, stars

## Loop
A board of 12 by 8 squares holds the child and a squad of robots. The child taps a square and steps one square toward it (or taps their own square to wait). Then every robot takes one straight step toward the child, all at once. Robots that land on the same square tangle into a scrap heap; a robot that lands on a heap is stopped and joins it; a robot that lands on the child ends the round. A caught child sees the same layout again (every layout is checked to be winnable by a planner that looks two turns ahead); a cleared round brings a new formation (line, ring, corners, pillars, scatter).

## What should vary on repeat play
Play 5: The child steps to a square where the robots' straight-line steps drive them into each other, herding the whole squad into one scrap heap on purpose instead of running from each robot.

How the sim produces it: the robot rule never changes, but a runner never wins (a child who only steps away from the nearest robot clears about three layouts in ten, mostly by luck) while a child who plans two or three steps ahead clears nearly all of them, and clears them with the whole squad in one heap far more often. So the depth is in the rule, not in more content: first the child runs, then notices that bumped robots stop, then stands so that robots bump, then aims all of them at one heap (the stars hook pays one star for exactly that). Layouts are seeded per round and per formation, so a memorised solution does not carry over.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-6, arch-7, arch-8, arch-9, arch-11 (15 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 1 of 15 runs (7%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 1, 1, 0 of 15.
- **Play 5 against play 1:** change 1.15 (1.08 new signatures per 100 actions plus 0.07 new action kinds).
- **Self-set aims:** 37 adopted, 14 made progress. Tried: caught down, caught up, cleared down, cleared up, pile up, piles down, piles up, robots down, turns down, turns up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective robots down; outcome variety 2.83 bits (by policy: greedy 2.58, random 2.57, repeat-one 2.30). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 6.7% with every hook on, 0.0% with all off):
  - `level`: not needed; without it 0.0%
  - `stars`: not needed; without it 6.7%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 1 of 15 target-panel runs (7%) start session 3, 43.3 points short of the 50% line (7 more runs needed).
- Left first: `arch-6`, `arch-7`, `arch-8` and 1 more, starting 1.3 of 5 sessions on average (the best in the target panel starts 2.3).

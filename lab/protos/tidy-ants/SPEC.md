# Tidy Ants

- **Verb:** scatter
- **Depth engine:** emergence
- **Age band:** 3 to 6
- **Lens:** physical-toy (ant-farm)
- **Hooks declared:** tidy (a cheer when every colour has one heap), pink (a fifth colour cup appears after the first tidy)

## Loop
The child holds a finger on a sand cross-section to pour beads (mixed, or one colour from a cup), and eight ants wander it: an ant lifts a bead with no friends beside it and sets it down next to beads of its own colour, so heaps grow with nobody planning them. A quick tap with a colour in hand plants a seed bead the ants never lift, and any ant carrying that colour walks to it from across the sand and sets its bead down beside it. Shake re-scatters the loose beads (seeds stay); tip out clears the sand.

## What should vary on repeat play
Play 5: The child plants a single bead where a heap should start, knowing the ants will pile that colour around it, and steers each colour into the corner they chose.

How the sim produces it: with no seeds the heaps form wherever the pour happened to fall (the rule is Deneubourg-style sorting: lift probability falls with how pure and full a bead's 5 by 5 neighbourhood is, drop probability rises with it), so which colour ends up where is different every time. A seed bead changes the rule for its colour: laden ants of that colour only set down beside a seed, and heaps of that colour far from a seed are only half as settled, so they slowly move. That turns "watch what the ants do" into "decide where each colour goes" (four seeds, four corners), with real timing to learn (seeds planted before the pour steer cleanly; planted late they pull a heap across slowly; two seeds of one colour split the colour). The signature records the stage of the sand, how many biggest heaps sit in a corner, and how many grew round a seed, so a steered board and a wild one are different outcome classes.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: kaia, tess, arch-3, arch-6, arch-7 (15 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 0 of 15 runs (0%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 0, 0, 0 of 15.
- **Play 5 against play 1:** change 0.00 (0.00 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 18 adopted, 5 made progress. Tried: beads down, beads up, cornered up, heaps down, heaps up, seeds down, seeds up, tidy up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective tidy up; outcome variety 2.04 bits (by policy: greedy 1.80, random 0.69, repeat-one 1.74). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 0.0% with every hook on, 13.3% with all off):
  - `tidy`: inconclusive (the persona model has no reward response); without it 0.0%
  - `pink`: not needed; without it 13.3%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 0 of 15 target-panel runs (0%) start session 3, 50.0 points short of the 50% line (8 more runs needed).
- Hook ablation says little for `tidy`: removing it changed nothing the personas can register.
- Play 5 shows no measured change from play 1: no new signatures and no new action kinds.

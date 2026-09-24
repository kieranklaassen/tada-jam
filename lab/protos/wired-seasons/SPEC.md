# Wired Seasons

- **Verb:** prune
- **Depth engine:** expression (secondary: emergence)
- **Age band:** 10 to 12
- **Lens:** other
- **Hooks declared:** picture

## Loop
The child starts with a sapling: a trunk, an upright leader, and a side shoot. They tap a limb to snip it, drag a limb to wire it toward the finger, and tap "next season" to let a year pass. The tree answers with three rules the child can find by playing. A snipped tip sprouts two buds below the cut and forks next season (a cut right at a joint takes the whole limb off clean, with no buds). A wired limb grows on along the heading it was bent to, while an unwired one curls toward the light a little more each season. A limb whose whole subtree stands in another limb's shade for two seasons drops away; the first shaded season turns it brown, so there is a season to free it. Growth is shared, so a tree with many tips grows each tip less. The optional `picture` hook shows a dashed target silhouette (umbrella, column, vase, windswept lean) and fires when a season leaves the tree filling it, then offers the next one.

## What should vary on repeat play
The given play 5: The child cuts the leader early and wires two low limbs outward to grow the windswept cascade they pictured, knowing that a cut forks the growth, a wire sets its heading, and shaded limbs die.

How the sim produces it: the seed sets the sapling's lean, its side shoot's side and angle, and the random side shoots that sprout at joints, so no two trees are the same and the old plan has to be read against the new tree. The three rules are stable and discoverable, but they interact: two forks of a flat wired limb sit one above the other, so the lower one starves unless the child wires it out of the shade; wiring a limb carries everything grown on it; a wired limb ignores the pull to the light while its unwired neighbours climb into its light. A child who knows the rules can plan several seasons ahead (top the leader at the right height, wire the fork flat, keep the side shoot or take it off clean) and read the result against a shape they picked. With `picture` on, the target changes by seed, and each match brings the next silhouette.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-9, arch-11 (6 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 2 of 6 runs (33%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 2, 0, 0 of 6.
- **Play 5 against play 1:** change 2.48 (2.48 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 15 adopted, 5 made progress. Tried: fit up, height down, height up, limbs down, limbs up, lit up, lost down, season down, season up, spread up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective spread up; outcome variety 2.93 bits (by policy: greedy 2.01, random 1.94, repeat-one 1.03). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 33.3% with every hook on, 16.7% with all off):
  - `picture`: needed; without it 16.7%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 2 of 6 target-panel runs (33%) start session 3, 16.7 points short of the 50% line (1 more run needed).
- Leans on hook `picture`: removing it drops session-3 return from 33.3% to 16.7%.

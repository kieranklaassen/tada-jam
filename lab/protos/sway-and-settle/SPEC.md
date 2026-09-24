# Sway and Settle

- **Verb:** hang
- **Depth engine:** combination (secondary: mastery)
- **Age band:** 4 to 7
- **Lens:** other
- **Hooks declared:** next-mobile

## Loop

The child drags pieces from the tray and hangs them from the slots of a bar: shapes, and small bars that take more shapes. Every bar tips toward its heavier side (weight times distance from its middle, summed over what hangs on it), swings past, and settles. A bar loaded on both sides and exactly balanced sits level, and then turns slowly on its hook; when every bar is level and every piece is used, the whole mobile turns. A shape's size and colour say its weight; a small bar weighs its own 1 plus everything hung on it. A touch that grabs nothing is a breeze that sets the nearest bar swinging.

Hook `next-mobile`: once the whole mobile (every bar) has turned for about five seconds, it is taken down and a fresh set, one piece bigger (up to nine), is dealt. Without it a session is one puzzle at a time and the finished mobile just keeps turning, so the panel can tell whether the lever law alone brings the child back.

## What should vary on repeat play

Play 5: The child slides a heavy shape close to the middle and a light one far out because they learned a bar balances that way, and hangs a small whole mobile from one end to balance a big shape.

How the sim produces it: each session deals a different tray, cut from a random mobile that really balances (0 to 3 small bars, shapes weighing 1 to 5), so the law carries over but the answer does not. Equal pairs on equal distances only go so far because the tray rarely holds the pairs; the child needs heavy-near/light-far, then a hung sub-mobile as a composite weight (a small bar and its shapes count as their sum at the hook), then sub-mobiles nested in each other. Signatures are the mobile's outcome class (bars hung x bare, lopsided, tipped, partly, level, counter-weighed x every piece used), so discovering a counter-weighed level mobile is a new place to be, not a longer session.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: kaia, tess, arch-3, arch-6, arch-7, arch-8 (18 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 2 of 18 runs (11%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 2, 0, 0 of 18.
- **Play 5 against play 1:** change 0.42 (0.42 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 33 adopted, 10 made progress. Tried: balanced up, held down, held up, hung down, hung up, round down, round up, tilt down, tilt up, turning down, turning up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective balanced up; outcome variety 0.00 bits (by policy: greedy 0.00, random 0.00, repeat-one 0.00). Dominant strategy: no (the objective never varied).
- **Hook flags** (raw material for the guidelines; session 3 return 11.1% with every hook on, 11.1% with all off):
  - `next-mobile`: inconclusive (the persona model has no reward response); without it 11.1%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 2 of 18 target-panel runs (11%) start session 3, 38.9 points short of the 50% line (7 more runs needed).
- Hook ablation says little for `next-mobile`: removing it changed nothing the personas can register.
- Left first: `arch-6` and `arch-7`, starting 1.0 of 5 sessions on average (the best in the target panel starts 1.7).

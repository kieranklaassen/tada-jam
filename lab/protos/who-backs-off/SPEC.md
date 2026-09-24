# Who Backs Off

- **Verb:** usher
- **Depth engine:** rule-play (secondary: other-minds)
- **Age band:** 5 to 8
- **Lens:** other
- **Hooks declared:** stars, levels

## Loop
A cat, a mouse, and an elephant cross a one-lane bridge from two banks. When two meet head on, the scarier one walks on and the other backs off (and so does everything queued behind it), but scariness runs in a circle: the cat scares the mouse, the mouse scares the elephant, the elephant scares the cat. Each round one animal wears a crown and has to get across, but its scarier animal is already on the bridge, sitting down and refusing to budge (so the biggest-goes-first habit leaves the bridge jammed). The child ushers: a tap sends an animal now, a hold keeps the front animal back (the others get impatient and set off by themselves). The world answers with who backs off and who walks on.

## What should vary on repeat play
Given play 5: The child sends the mouse onto the bridge first to clear the elephant off it, and holds the cat back until the elephant is gone, using the scare circle on purpose to get past an order that the biggest-goes-first habit leaves jammed.

How the sim produces it: the round's crowned animal, its bank, and its blocker are seeded, so the tool that clears the blocker is a different animal each time (mouse for the cat, elephant for the mouse, cat for the elephant). The sitting blocker cannot be waited out and only its scarier animal clears it, so a child who has learned the circle sends the tool first and the crowned animal right behind it, while a child on the size habit sends the biggest or the marked animal straight in and is turned back. Impatient animals set off by themselves, so holding the wrong one back (or not) changes what meets what. With the `levels` hook later rounds add queued animals ahead of the helper (a decoy that sets off first and loses), a follower behind the blocker, more traffic, and some rounds with no helper on the crowned animal's bank where the blocker keeps walking and waiting it out is right. Stars rate setbacks and speed.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: kaia, tess, arch-6, arch-7, arch-8, arch-9 (18 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 8 of 18 runs (44%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 8, 5, 2 of 18.
- **Play 5 against play 1:** change 2.55 (2.55 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 48 adopted, 7 made progress. Tried: crossed down, crossed up, onBridge down, onBridge up, rounds down, rounds up, setbacks down, setbacks up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective crossed up; outcome variety 3.66 bits (by policy: greedy 3.56, random 3.70, repeat-one 3.56). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 44.4% with every hook on, 16.7% with all off):
  - `stars`: inconclusive (the persona model has no reward response); without it 44.4%
  - `levels`: needed; without it 16.7%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 8 of 18 target-panel runs (44%) start session 3, 5.6 points short of the 50% line (1 more run needed).
- Hook ablation says little for `stars`: removing it changed nothing the personas can register.
- Leans on hook `levels`: removing it drops session-3 return from 44.4% to 16.7%.
- Left first: `arch-7`, starting 2.0 of 5 sessions on average (the best in the target panel starts 3.7).

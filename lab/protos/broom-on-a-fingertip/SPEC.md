# Broom on a Fingertip

- **Verb:** balance
- **Depth engine:** mastery (secondary: mystery)
- **Age band:** 10 to 12
- **Lens:** other
- **Hooks declared:** flags (destination flags to walk the balanced broom to and plant it at; a win state), best (a live upright-run timer and a personal best)

## Loop
A tall broom is pinned to a fingertip point on a rail. The child drags the point; the broom is an inverted pendulum, so the more it tilts the harder gravity leans it, and the only way to keep it up is to slide the point under the lean. Held upright and still over a flag for a second it plants the flag and the next flag appears across the field, so the child walks the balanced broom from side to side. Let it fall and it swings down and hangs from the point. Three brooms sit in a rack at the bottom left (long is slow to fall, short is quick): tapping one stands a fresh broom of that size at the left edge, so a reset costs the walk back from wherever the child was.

## What should vary on repeat play
Given play 5: "The child now moves under the broom before a lean is visible instead of chasing it, and shakes a hanging broom up to standing, a trick found by fiddling on an earlier play."

How the sim produces it:

- **Move before the lean shows.** Reacting to a lean fails: from a 0.06 rad start the mid broom passes 20 degrees in about 1.1 s and 69 degrees (a fall) in about 1.7 s, and gravity's pull grows with the tilt. Moving under it while it still looks upright works. The `wobble` feature (smoothed lean while held) falls as a child learns to lead, and `bestRun` and `uprightTime` rise. Nothing is scripted: it is a 4-substep pendulum with the fingertip following the finger as a critically damped spring (time constant 40 ms).
- **A harder version the child can pick.** The rack's short broom falls about 20 percent quicker than the mid one and a third quicker than the long one, so a child who has mastered the mid broom reaches for it unprompted. The flags add a second axis (walk under control, stop, hold still) that pure balancing never asks for.
- **The swing-up trick (mystery half).** No rule or hint says a fallen broom can stand again. It is the physics: a hanging pendulum whose pivot is moved in time with its swing gains energy, and about 2 units of swing energy (`energy` feature) carries it over the top, where a caught broom stands. The sim recognises it only when the broom spent at least 3 s low or hanging and then stood for 10 ticks (a rebound catch straight after a fall is a `save`, not the trick). Finding it flips a latch that shows in the signature (`.../swung`). Random shaking finds it in some fuzz sessions.
- **Fall and reset are cheap but not free.** A swap resets the broom at the left edge, so a far flag makes shaking it back up in place worth learning.

## Characteristic moments (asserted in `sim.test.ts`)
1. Sliding the fingertip under the lean keeps the broom up for over 12 s; holding still lets it fall.
2. A scripted balancer walks it to the flag and plants it, the next flag lands at least 200 px away.
3. A scripted shaker feeds a hanging broom until it stands: the `swing-up` event fires and the signature ends in `/swung`.

## Signature
`<broom>/<pose>/<flag>[/swung]`: broom long, mid or short; pose up (under 20 degrees), lean, low, or hang (over 130 degrees); flag `at-flag` when the point is on the flag (only with the flags hook), else `open`; `/swung` once the trick has been found this session. Bound 48 (3 x 4 x 2 x 2). Fuzz sessions of random play reach 20 to 38.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-9, arch-11 (6 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 0 of 6 runs (0%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 0, 0, 0 of 6.
- **Play 5 against play 1:** change 0.90 (0.90 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 12 adopted, 5 made progress. Tried: bestRun down, broom down, broom up, energy up, falls up, held up, planted down, walked up, wobble up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective uprightTime up; outcome variety 2.55 bits (by policy: greedy 1.27, random 2.88, repeat-one 1.27). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 0.0% with every hook on, 16.7% with all off):
  - `flags`: not needed; without it 16.7%
  - `best`: inconclusive (the persona model has no reward response); without it 0.0%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 0 of 6 target-panel runs (0%) start session 3, 50.0 points short of the 50% line (3 more runs needed).
- Hook ablation says little for `best`: removing it changed nothing the personas can register.
- Left first: `arch-9`, starting 1.3 of 5 sessions on average (the best in the target panel starts 1.7).

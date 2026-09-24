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
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses
_Filled after the panel run._

Builder's notes, ahead of the run:

- Personas aim with jitter and emit taps, drags and holds; a stand-up broom needs continuous, well-timed correction (many small `move` events a second). If personas emit sparse drags they may never keep it up, and the panel would then read as a loop with no ceiling reached rather than a loop with no depth. Watch mode will show which.
- Cue-blind touches only change the sim on the broom's column (150 px either side, top to bottom) and on the rack. A touch on a flag when the broom is elsewhere does nothing.
- The `best` hook changes no affordance and no signature, so the panel will read it as inconclusive by construction. The `flags` hook does change both.
- The idle "shake" hint (a wiggle line under the point once the broom hangs) gives the trick away; it is only on when hints are on, which the return runs turn off.
- The rack reset is the cheap way back up. If personas prefer it every time, the swing-up will never be found by fiddling on the first sessions, only by accident (it does happen in random play).

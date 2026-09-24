# Chant Rope

- **Verb:** skip
- **Depth engine:** mastery
- **Age band:** 4 to 7
- **Lens:** physical-toy (jump-rope)
- **Hooks declared:** streak, tempo

## Loop
Two turner creatures swing a rope through one fixed chant: slow, slow, quick, quick (30, 30, 15, 15 ticks, one beat each; the rope sweeps the ground at the end of every beat). The child holds anywhere off the turners to crouch the jumper and lets go to leap. How long the finger has been down decides the hang time: 8 ticks plus 3 per tick held, capped at 20 ticks of hold (68 ticks of hang). A swing is cleared if the jumper is in the air when it sweeps the ground, and it trips the jumper if the jumper is standing or crouching. A trip tangles the jumper for a moment, the turners stop, and the next hold starts the chant again from the first slow beat.

Two details make the chant a puzzle rather than a reflex test:
- Holding on through a sweep also trips, so a long hold has to fit inside the gap between two sweeps.
- A landing squashes for 7 ticks before the next leap, and a leap that lands too close before a sweep cannot be followed by a hop in time. A finger that goes down in mid-air keeps charging through the landing, so a child can start the next big leap before the last one has landed.

A tap on a turner makes them wave and echo the chant on the bar (a free listen; it never changes the outcome).

## What should vary on repeat play
The given play-5 line: the child has learned the chant the turners keep and leaps once with a long held hang over both quick swings, landing back on the slow beat, instead of chasing each swing one at a time.

How the sim produces it: the chant never changes, so what the child learned about it carries over. The quick beats are only 15 ticks apart. A plain hop (a tap) hangs 11 to 17 ticks and then squashes for 7, so chasing both quicks takes two well-timed taps, the first one early in its window. One held leap needs a charge of about 5 ticks or more, has a release window as wide as its hang minus the gap, and lands before the next slow sweep. The hold both delays the launch and lengthens the hang, so the child has to learn the relationship (hold about half a beat to hang about a beat and a half) and where in the gap it fits. Reach goes further than the quick pair: one long charge in the second slow gap hangs over that swing and both quicks (`long`). The outcome classes the signature names (hop-slow, hop-quick, pair-slow, pair-quick, pair-mixed, long, whiff, trip) let the panel see the shift from hops to chunks. Probing with noisy scripted players (not the panel): a per-swing tapper trips on about one clear in three to four, a quick-pair chunker does better, and a player who takes the second slow swing and both quicks in one leap does best. The seed only picks the turners' colours and cheers; the rope keeps the same time every play.

Hooks:
- `streak` shows swings cleared in a row and fires a milestone every fourth. It changes no affordance and no signature (expected to read as inconclusive).
- `tempo` speeds the turners up one level after every eighth swing in a row (at most two levels; 85 and 70 percent of the beat lengths and of the base hop, applied at the start of the next chant), and a trip puts them back. It changes the world, so the panel can measure it. At level 2 the slow beat is 21 ticks and hop-per-swing barely fits, so it pushes toward bigger leaps.

## Findings
<!-- findings:start -->
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses
_Filled after the panel run._

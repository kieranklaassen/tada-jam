# Sideways Rain Day

- **Verb:** shelter
- **Depth engine:** variation
- **Age band:** 3 to 5
- **Lens:** other
- **Hooks declared:** rainbow

## Loop

The child holds a leaf umbrella over damp little creatures while rain slants across the yard and gusts sway the drops in beats. A creature the drops miss for a few moments relaxes (its bar fills, its eyes close); one the drops hit does not. Touching anywhere sends the leaf there, dragging the leaf itself moves it and sets its height, and a leaf nobody holds is blown downwind by each gust. When every creature is relaxed at once (the `rainbow` hook) the sun peeks out and the rain thins for a few seconds. The day comes from the seed: which of five slants, which of three gust rhythms and two gust strengths, drizzle to downpour, and three or four visitors from six kinds, laid out differently each time.

The fall is real geometry, not a mask. Every drop keeps the slope it was born with, so the leaf's dry patch lands on the creatures shifted downwind by slope times the gap between the leaf and the creature. A leaf held straight overhead therefore works on a straight-down day and misses on a slanted one.

## What should vary on repeat play

Given play 5: the child reads the slant of the falling streaks and holds the leaf on the windward side instead of straight overhead, and shifts it a beat ahead of each gust.

How the sim produces it:

- **The slant moves the answer.** On a hard-slant day the leaf must sit up to about 350 px upwind of a creature at the starting height (`idealX` in `sim.ts`); straight overhead leaves the creature soaked. Across the five slant classes the best leaf position is different every day, and the streaks are the only cue.
- **Height trades reach for reliability.** A lower leaf needs less windward shift (the offset is slope times the gap) and rides gusts better, but it covers one creature; a high leaf can cover a close pair on a calm day.
- **The gust is visible before it lands.** Drops keep the slope they were born with, so the sky leans harder about a second before the drops reach the leaf (a band along the top swells too). Moving the leaf a beat ahead (`shelterX`) beats holding the steady slant: on strong, quick-gust days a scripted tour of the yard gains about 0.1 to 0.17 mean comfort (table below).
- **Rain and visitors change the tempo.** Drizzle lets a relaxed creature stay relaxed while the leaf tours the yard; a downpour on a hard slant leaves little slack. Kinds differ in size (a bigger creature needs a wider shadow), how much a drop bothers it, and how fast it relaxes.

Measured by scripted policies (a tour of the yard: stay on a creature until it relaxes, then go to the nearest one that is not; 300 seeded days, 80 sim-seconds each, leaf at its starting height unless noted; mean comfort 0 to 1, from `sim.ts` alone):

| policy | straight days | mid slant | hard slant | straight and strong quick gusts | hard and strong quick gusts |
|---|---|---|---|---|---|
| leaf straight overhead | 0.69 | 0.25 | 0.17 | 0.58 | 0.11 |
| leaf on the steady windward side | 0.68 | 0.61 | 0.53 | 0.59 | 0.38 |
| windward, and a beat ahead of each gust | 0.70 | 0.65 | 0.56 | 0.76 | 0.48 |
| windward, a beat ahead, leaf held low | 0.73 | 0.69 | 0.62 | 0.78 | 0.54 |

Reading the slant is worth about +0.3 to +0.4 comfort on a slanted day; leading the gusts is worth up to +0.17 on a gusty one; holding the leaf low adds a little more but covers one creature at a time. Rainbows (everyone relaxed at once) come 0 times in 80 s to a straight-overhead leaf on a slanted day and about 1.6 to 3.6 times to a leaf that reads both slant and gusts.

## Findings
<!-- findings:start -->
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses
_Filled after the panel run._

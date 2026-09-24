# Spot or Stripe

- **Verb:** dab
- **Depth engine:** emergence
- **Age band:** 5 to 8
- **Lens:** other
- **Hooks declared:** none

## Loop

A blank animal (body, tail, four legs; its proportions and tail angle change with the seed). The child drops dye on it: a tap is one drop, a drag lays a row of drops 30 px apart. Nothing moves while the child plans: drops sit as wet blue dots. Pressing GO (or being quiet for about eight seconds) lets the dye run under one local rule until it stops: a cell holds dye when the dye close to it outweighs the dye in the ring around that, so dye spreads a little and then pushes back on itself. The world answers with a coat: a lone drop settles into a round spot, a long close row runs together into a stripe, a short row breaks into two or three spots, two drops right beside each other merge, a crowd is pushed apart, a ring stays a ring. The coat is read region by region (body, tail, legs) and named blank, spots, stripes, or swirl; wash wipes it and the child starts again on the same animal.

The dye is a fixed amount (34 cells per drop), so a stripe cannot run on forever. The edge of the animal pushes back a little, so dye does not creep along the outline.

## What should vary on repeat play

> The child dabs lone drops to grow round spots and a close row to grow stripes, and plans a zebra tail and a leopard back on the same animal before any dye moves.

How the sim produces it: the settled coat is a function of where the drops sit, not of how many, and the rule is learnable in stages. Play 1 is dabs and surprise (a lone drop swells into a spot; a row of five does not make a stripe but two beads). By play 5 the child knows the reach of the push-back and plans with it: spots need about 8 cells (80 px) between them or they merge; a stripe needs a close straight row of about seven or more drops, and a shorter row splits into beads; parallel rows need about 10 cells between them or they collapse into spots; a ring of drops stays a ring (a swirl), and a bent row beads or curves. Because the coat is read per region and the animal changes each visit (tail angle, leg length, body size), a plan such as "stripes down the tail, spots across the back, legs left bare" has to be laid out with those gaps in mind before GO. The objective feature `coatVariety` counts the different coats on one animal (0 to 3).

Nothing carries between sessions; the depth is in the rule, not in progression.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: kaia, tess, arch-6, arch-7, arch-8, arch-9 (18 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 2 of 18 runs (11%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 2, 1, 0 of 18.
- **Play 5 against play 1:** change 1.18 (1.13 new signatures per 100 actions plus 0.06 new action kinds).
- **Self-set aims:** 44 adopted, 19 made progress. Tried: coatVariety up, coverage down, coverage up, dabs down, dabs up, spots down, spots up, stripes down, stripes up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective coatVariety up; outcome variety 3.07 bits (by policy: greedy 2.66, random 2.10, repeat-one 1.24). Dominant strategy: no (no policy dominates).
- **Hook flags:** none declared.
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 2 of 18 target-panel runs (11%) start session 3, 38.9 points short of the 50% line (7 more runs needed).
- Left first: `arch-6`, `arch-7`, `arch-9` and 1 more, starting 1.3 of 5 sessions on average (the best in the target panel starts 2.0).

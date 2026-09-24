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
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses
_Filled after the panel run._

Builder's notes, known before any run:

- The dye rule is knife-edged. A small change to the inhibition (0.33) turns "a row makes a stripe" into "every row runs on across the whole animal" or "every row breaks into beads". The numbers were found in a spike on an open field; the animal's outline shifts them a little (a wall term corrects most of it).
- A scripted 8-drop row down the tail makes a clean stripe on roughly 7 animals in 10; on the rest the straight row still beads into 3 spots, so a child can do the right thing and be told "spots". That is honest emergence but can read as noise to a 5 year old.
- Nothing draws the child to try a curve or a ring, so swirls are rare in random play; a persona has to stumble on them.
- Stripes that reach a region border count towards both regions, so a long body stripe can make the legs read as striped.
- Once the rule is known, the space of coats is explored quickly: a dominant plan (one long row per region, everything far apart) is likely.
- The GO button and the auto-run after about 8 quiet seconds make the world answer a cue-blind child, but a child who plans slowly can be pre-empted by the auto-run.

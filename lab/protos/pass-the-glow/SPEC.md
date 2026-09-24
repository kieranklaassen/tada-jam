# Pass the Glow

- **Verb:** chase
- **Depth engine:** other-minds
- **Age band:** 5 to 8
- **Lens:** physical-toy (tag)
- **Hooks declared:** sweep

## Loop

You are the glowing It in a night field with three other creatures. A finger anywhere steers the glow (it heads for the touch, faster the farther the finger is, at the speed of the body it is in). Touch a runner and the glow and your control jump into that runner's body, while the old It scampers off the way it always does. You cannot tag back whoever just handed you the glow, and a freshly lit glow is dazzled for under a second, so the choice is always "whose body do I want next, and how do I corner it".

Four bodies, each with its own feel as the glow and its own habit as a runner:

| Body | As the glow | As a runner, when the glow comes near |
|---|---|---|
| hare | fast, slippery, spooks everyone from far away | bolts away, doubles back swinging wide of the chaser, then catches its breath |
| tortoise | very slow, precise, long reach, spooks nobody until close | freezes in its shell (untouchable) if rushed, plods away if crept up on |
| magpie | fairly fast, medium in every way | runs toward whoever tagged it (flees plainly if nobody ever did), then perches beside it |
| mouse | quick, tiny reach | dashes into a burrow, hides, and pops out of the OTHER burrow |

The `sweep` hook: once every body has had a turn as the glow, the glow turns golden for about five seconds (faster, longer reach, quieter) and the turns start over. Remove it and the game is plain tag.

## What should vary on repeat play

The child knows the hare bolts then doubles back, the tortoise freezes, and the magpie runs toward whoever tagged it, so they choose whose body to be next and corner each runner by its habit.

How the sim produces it: the seed shuffles who starts where, who starts as the glow, and where the two burrows are, so nothing carries over except knowledge of the habits. Habits are what reward that knowledge: waiting where the hare will swing back, creeping (not rushing) the tortoise, stepping into the body that tagged the magpie so it runs into you, ambushing the mouse at the burrow it will pop out of. Bodies trade off (the tortoise is slow but quiet and long-armed, so it can walk up on a hare that the loud, quick hare body could never sneak on), and every tag changes the body you wear and the magpie's memory, so no two sessions walk the same chain of bodies.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: kaia, tess, arch-6, arch-7, arch-8, arch-9 (18 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 4 of 18 runs (22%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 4, 1, 1 of 18.
- **Play 5 against play 1:** change 2.84 (2.78 new signatures per 100 actions plus 0.06 new action kinds).
- **Self-set aims:** 35 adopted, 1 made progress. Tried: alert down, alert up, bodies up, near down, near up, pinned down, pinned up, sweeps down, sweeps up, tags up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective tags up; outcome variety 3.68 bits (by policy: greedy 3.58, random 3.09, repeat-one 3.81). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 22.2% with every hook on, 33.3% with all off):
  - `sweep`: not needed; without it 33.3%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 4 of 18 target-panel runs (22%) start session 3, 27.8 points short of the 50% line (5 more runs needed).
- Left first: `arch-8`, starting 1.3 of 5 sessions on average (the best in the target panel starts 3.3).

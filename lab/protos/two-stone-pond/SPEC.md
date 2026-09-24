# Two-Stone Pond

- **Verb:** pulse
- **Depth engine:** emergence
- **Age band:** 8 to 11
- **Lens:** other
- **Hooks declared:** none

## Loop
The child taps the pond to drop a stone: a short ring that spreads, crosses other rings, and adds to them. Holding keeps a stone ringing steadily (it goes on ringing for about eight seconds after the finger lifts, so one finger can lay two stones one after the other), a held stone follows the finger when it slides, and a finger dropped near a stone that is still ringing picks it back up to slide it, so the spacing can be tuned by hand. Only two stones ring at once unless three fingers are down: a third hold lets the oldest one fade. Two steady stones make a fixed pattern of bright bands and lines of dead-still water, and the number of still lines depends only on how far apart the stones are, measured in ripple widths. Three corks float on the pond: they bob with the water under them, slide slowly toward still water when they are within about 40 pixels of a still line, and count as parked once they rest in a still spot while the water around them is alive. The water is a real grid wave equation with an absorbing edge, so nothing about the pattern is scripted.

## What should vary on repeat play
Play 5 line: The child drops two ripples the right distance apart to make a line of dead-still water and parks a cork there to watch it rest, a rule found by crossing rings that one ring could never show.

How the sim produces it: one ring only ever shows a spreading circle, so the rule (crests plus troughs cancel) can only be found by putting two stones on the water together. Held stones give the steady pattern, and the spacing decides its shape: under about three quarters of a ripple width apart there are no still lines, about 0.8 to 1.6 widths gives two, 2 to 2.8 gives four, and 3.2 and up gives five to eight (the lines right beside a stone are too narrow for the grid, so a wide pair reads a little low). Each session's pond has one of three ripple widths (84, 108, or 132 pixels, from the seed), so a spacing that worked on play 1 has to be re-read from the visible ring width on play 5; the rule stays, the distance changes. Cork positions are seeded too. Three fingers down at once should make dotted still spots instead of lines (physics says so; no test checks it), a further pattern the child can go looking for. The signature names the pattern reached (still, rings, one stone, a pair as flat, two, four, or six-plus lines, a crowd) times how many corks rest (0 to 3).

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-7, arch-8, arch-9, arch-11 (12 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 1 of 12 runs (8%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 1, 0, 0 of 12.
- **Play 5 against play 1:** change 0.11 (0.11 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 22 adopted, 5 made progress. Tried: energy down, energy up, lines up, parked up, sources down, sources up, spacing down, spacing up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective parked up; outcome variety 1.41 bits (by policy: greedy 0.00, random 1.73, repeat-one 0.00). Dominant strategy: no (the objective never varied).
- **Hook flags:** none declared.
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 1 of 12 target-panel runs (8%) start session 3, 41.7 points short of the 50% line (5 more runs needed).
- Left first: `arch-8` and `arch-9`, starting 1.3 of 5 sessions on average (the best in the target panel starts 1.7).

# Scrapyard Toolbox

- **Verb:** rig
- **Depth engine:** variation
- **Age band:** 6 to 9
- **Lens:** other
- **Hooks declared:** none

## Loop
Each "day" deals three of five scrap tools (plank, spring pad, fan, sponge, bumper) and puts a sleepy cat in a tray on a far shelf. The child drags the tools from the tray into the yard, turns them (drag the white knob, or tap a placed tool to turn it), then taps the chute to let a ball roll. The world answers with plain physics: the plank guides, the spring throws the ball along its face, the fan pushes it through a stream of air (a fan aimed up can lift it), the sponge soaks up bounce and speed, the bumper knocks it off its line. A miss is soft: the ball comes home and the rig stays, with a dotted trail of the last try. Reaching the cat wakes it and opens the next day: new deal, new chute, new wall, new cat spot.

Days are built backwards from a rig that works (the ball's own path is used to drop each tool, then the cat's shelf goes where the ball lands). A day is kept only if that rig reaches the cat within about 12 seconds, the bare yard does not, every tool is needed, and a small nudge of the rig still works. Many days also pass a sampled check that no single tool solves them.

## What should vary on repeat play
The child asks what each tool can do besides its obvious job, like using the fan to lift the ball over a wall or the sponge to stop it mid-ramp, and builds a working rig from a dealt set that has no obvious answer.

How the sim produces it: the physics of each tool is the same every day, so what the child learns about a tool on day 1 is the only thing that helps on day 5. What changes is the deal (10 possible sets of three), the chute height and launch speed, the wall, and where the cat sits, so the plain use of a tool (a plank as a slide to the cat) is not the answer and a tool's second job (the fan as a lift, the sponge as a brake, the spring as a launcher, the bumper as a turn) has to be found and reused. Signatures carry the deal while rigging (`rig-RSF`) and the route the ball took at the end (`reached-ramp+fan`, `missed-none`), so two different days or two different solutions show as different outcomes.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: tess, arch-6, arch-7, arch-8, arch-9 (15 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 2 of 15 runs (13%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 2, 1, 1 of 15.
- **Play 5 against play 1:** change 1.29 (1.29 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 29 adopted, 3 made progress. Tried: attempts down, attempts up, closeness up, placed down, placed up, touched down, touched up, woken down, woken up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective closeness up; outcome variety 2.06 bits (by policy: greedy 2.19, random 0.96, repeat-one 1.58). Dominant strategy: no (no policy dominates).
- **Hook flags:** none declared.
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 2 of 15 target-panel runs (13%) start session 3, 36.7 points short of the 50% line (6 more runs needed).
- Left first: `arch-7`, starting 1.0 of 5 sessions on average (the best in the target panel starts 2.3).

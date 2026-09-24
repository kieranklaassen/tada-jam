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
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses
_Filled after the panel run._

Builder notes from before the panel run:
- About half the days pass the sampled one-tool check; the rest are "robust" days where a single well-placed tool may also solve the day (the generator settles for these after a long search). Blind flailing woke the cat in roughly 1 session in 10 of 3 minutes.
- Physics is hand-rolled (a point ball against capsules, circles, and a fan stream) and simple by design; unusual stacks of tools can trap the ball, which ends the try after it lies still or stays in one place for about 3 seconds.
- Building a day costs about 70 ms on average (up to about half a second) and is cached by seed, so greedy replays stay cheap.
- Turning by the knob needs a drag; tapping a placed tool turns it 30 degrees. Angles snap to 15 degrees.

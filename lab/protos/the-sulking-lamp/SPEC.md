# The Sulking Lamp

- **Verb:** arrange
- **Depth engine:** mystery (secondary: variation)
- **Age band:** 10 to 12
- **Lens:** other
- **Hooks declared:** warmer (the graded glow; naming the rule is the loop itself, so it is not a hook)

## Loop
Eight coloured shapes (four colours, three shapes, two sizes) wait in a tray. The child drags some onto a stage; a lamp above glows warm when the arrangement obeys a rule nobody states and sulks dim when it does not, live while a piece is still in the hand. Twelve families of rule hide behind the lamp (all alike, all different, a banned kind, a count, a half of the stage, an order, a row, a huddle, personal space, a touching pair, leaning, balance), each with its own parameters, so every round hides a different secret. Once the child has seen the lamp both warm and dim, twelve chips open; tapping the chip that names the rule's type solves the round (the lamp reveals the rule in words and a new one begins on a fresh tray). Two wrong names show the answer and move on; tapping the lamp after 15 seconds of being stuck does the same. The piece whose move last flipped the lamp is ringed, to help isolate the cause.

## What should vary on repeat play
The given play-5 line: The child builds a pair of near-identical arrangements that differ in one thing to isolate the rule, names its type after two tests, and goes after the rules that only hold when two shapes touch.

How the sim produces it: each session shuffles a deck of the twelve families, so the secret, its parameters (which colour, which shape, which half), and the eight pieces all differ by seed. The method carries over: change one piece and watch the lamp, read the ringed piece as the cause, name the family only after seeing both lamp states (wrong names cost one of two guesses, so guessing blind stops paying). The families split into rules about what is on the stage (alike, different, banned, how many), where it sits (corner, left of, row, huddle, balanced) and contact (space, touching, leaning). Contact rules are only visible if the child pushes shapes together, so the ones who have met "touching" once know to go looking for it.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-9, arch-11 (6 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** pass. 3 of 6 runs (50%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 3, 3, 2 of 6.
- **Play 5 against play 1:** change 3.93 (3.93 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 14 adopted, 1 made progress. Tried: guessesLeft down, guessesLeft up, onStage down, onStage up, solved up, warmth up.
- **First 10 seconds:** clear. 30% of 67 cue-blind touches changed the sim, first change at tick 83 (about 2.7 s) on average, 3 action kinds tried.
- **Self-play:** objective solved up; outcome variety 1.71 bits (by policy: greedy 1.58, random 1.86, repeat-one 1.58). Dominant strategy: no (the objective never varied).
- **Hook flags** (raw material for the guidelines; session 3 return 50.0% with every hook on, 33.3% with all off):
  - `warmer`: needed; without it 33.3%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Leans on hook `warmer`: removing it drops session-3 return from 50.0% to 33.3%.
- Left first: `arch-9`, starting 2.0 of 5 sessions on average (the best in the target panel starts 3.7).

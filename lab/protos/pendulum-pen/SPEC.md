# Pendulum Pen

- **Verb:** pluck
- **Depth engine:** expression (secondary: mastery)
- **Age band:** 10 to 12
- **Lens:** other
- **Hooks declared:** guess, target

## Loop

Two rods hang side by side, each with a weight that slides to one of five notches (higher is faster). The child pulls a rod's tip sideways and lets go, and a pen on the swinging table draws: the left rod moves it left and right, the right rod up and down, both fading. Weights set the swing rates, so the rate ratio (and the petal count of the knot) can be read from the weights alone. The moment the second rod goes sets the phase: together folds the knot into a thin arc, a moment later opens it wide. The knot shrinks into a spiral until both swings die, the drawing is kept on a small wall of past figures, and pulling a rod again starts fresh paper. A swinging rod can be caught and let go again, or a weight slid mid-swing.

Two hooks, each removable alone. `guess` is a strip of petal counts: say how many petals before the second rod goes and the sim tells you. `target` is a ghost figure on the table (and an aim card to tap for a different one) that stays until it has been drawn.

## What should vary on repeat play

Play 5 line: The child sets the weights to a two-to-three swing and lets one rod go a moment after the other to draw the clover knot they aimed at, saying how many petals it will have from the weights before letting go.

How the sim produces it: the weights make 19 distinct reduced ratios, and the petal count is a + b - 1 for the reduced ratio a to b (2 to 3 is four petals; 2 to 4 draws the same shape as 1 to 2, an equivalence to discover). The two rods are exact damped oscillators. The knot's openness is |sin| of the phase gap b times the x rod's phase minus a times the y rod's phase, measured at the moment the second rod is released, so the timing that opens one ratio folds another (odd against even numbers). Nothing is scripted: the only randomness is the starting notches and the order of aims per seed.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-9, arch-11 (6 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 1 of 6 runs (17%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 1, 0, 0 of 6.
- **Play 5 against play 1:** change 4.88 (4.55 new signatures per 100 actions plus 0.33 new action kinds).
- **Self-set aims:** 12 adopted, 1 made progress. Tried: amp down, amp up, figures down, matches up, open down, open up, petals down.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective kinds up; outcome variety 1.11 bits (by policy: greedy 0.00, random 1.46, repeat-one 0.00). Dominant strategy: no (the objective never varied).
- **Hook flags** (raw material for the guidelines; session 3 return 16.7% with every hook on, 0.0% with all off):
  - `guess`: needed; without it 0.0%
  - `target`: needed; without it 0.0%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 1 of 6 target-panel runs (17%) start session 3, 33.3 points short of the 50% line (2 more runs needed).
- Leans on hook `guess`: removing it drops session-3 return from 16.7% to 0.0%.
- Leans on hook `target`: removing it drops session-3 return from 16.7% to 0.0%.
- Left first: `arch-9`, starting 1.3 of 5 sessions on average (the best in the target panel starts 2.3).

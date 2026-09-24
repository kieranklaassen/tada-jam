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
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses
_Filled after the panel run._

# Clanking Chasers

- **Verb:** lure
- **Depth engine:** rule-play
- **Age band:** 7 to 10
- **Lens:** other
- **Hooks declared:** level, stars

## Loop
A board of 12 by 8 squares holds the child and a squad of robots. The child taps a square and steps one square toward it (or taps their own square to wait). Then every robot takes one straight step toward the child, all at once. Robots that land on the same square tangle into a scrap heap; a robot that lands on a heap is stopped and joins it; a robot that lands on the child ends the round. A caught child sees the same layout again (every layout is checked to be winnable by a planner that looks two turns ahead); a cleared round brings a new formation (line, ring, corners, pillars, scatter).

## What should vary on repeat play
Play 5: The child steps to a square where the robots' straight-line steps drive them into each other, herding the whole squad into one scrap heap on purpose instead of running from each robot.

How the sim produces it: the robot rule never changes, but a runner never wins (a child who only steps away from the nearest robot clears about three layouts in ten, mostly by luck) while a child who plans two or three steps ahead clears nearly all of them, and clears them with the whole squad in one heap far more often. So the depth is in the rule, not in more content: first the child runs, then notices that bumped robots stop, then stands so that robots bump, then aims all of them at one heap (the stars hook pays one star for exactly that). Layouts are seeded per round and per formation, so a memorised solution does not carry over.

## Findings
<!-- findings:start -->
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses
_Filled after the panel run._

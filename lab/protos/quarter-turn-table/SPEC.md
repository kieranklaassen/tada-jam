# Quarter-Turn Table

- **Verb:** flip
- **Depth engine:** emergence
- **Age band:** 7 to 10
- **Lens:** physical-toy (pinball)
- **Hooks declared:** none

## Loop

A floaty pinball table with nine arrow bumpers in a 3 by 3 lattice. The child holds the left or right half of the screen to raise that flipper and bat the ball up into the lattice. A ball that hits a bumper on its side or back is caught and slung out of the bumper's nose along its arrow, straight to the next bumper the arrow points at. A ball that hits a bumper's nose bounces off, and that bumper turns a quarter-turn clockwise, so the table remembers every hit and the same shot goes somewhere new next time. When the arrows of four (or six, or eight) bumpers close into a loop, a ball slung into it circles for as long as nothing hits a nose. After a dozen slings in a row it is trapped, and a second ball is served down the side lane so the child can try to build a second loop, or knock the first one apart.

Every table starts with no closed loop but with a hidden 2 by 2 loop two or three turns from closing, plus five random arrows, so which loop is available and what it needs is different every session.

## What should vary on repeat play

Given play-5 line: The child reads the bumpers' turned arrows and bats the ball to bump three of them into a closed loop that keeps it circling, a trap that play 1's random bounces never held long enough to notice.

How the sim produces it: the arrows are the readable state (each shows where it will sling the ball, and a nose hit steps it round by one quarter-turn, never back), so play 1 is random ricochets and the odd two-sling chain, and the skill is reading which arrows are one, two, or three turns from a track and delivering nose hits to exactly those bumpers, from the direction that lands on the nose. Loops come in fours (four squares, two directions each), sixes, and the eight-bumper rim, so there is a ladder of bigger traps after the first. Slings need no aim (the arrow decides), and nose hits are never wasted (a turned arrow persists), which is what lets a child plan across several shots.

## Findings

<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-6, arch-7, arch-8, arch-9, arch-11 (15 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 0 of 15 runs (0%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 0, 0, 0 of 15.
- **Play 5 against play 1:** change 1.09 (1.03 new signatures per 100 actions plus 0.07 new action kinds).
- **Self-set aims:** 18 adopted, 0 made progress. Tried: balls down, balls up, bestChain up, chain down, chain up, drains down, links up, orbit down, orbit up, turns down, turns up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective bestChain up; outcome variety 1.11 bits (by policy: greedy 1.03, random 1.24, repeat-one 1.03). Dominant strategy: no (no policy dominates).
- **Hook flags:** none declared.
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 0 of 15 target-panel runs (0%) start session 3, 50.0 points short of the 50% line (8 more runs needed).
- No self-set aim made progress (0 of 18 adopted).
- Left first: `arch-7` and `arch-8`, starting 1.0 of 5 sessions on average (the best in the target panel starts 1.3).

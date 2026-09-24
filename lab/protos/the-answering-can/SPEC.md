# The Answering Can

- **Verb:** knock
- **Depth engine:** mystery
- **Age band:** 7 to 10
- **Lens:** physical-toy (tin-can-telephone)
- **Hooks declared:** stack-wakes

## Loop

Three tin cans sit on strings that run through a hedge to three hidden friends. The child drags a can out until its string pulls straight, then knocks on it (taps). A taut string carries the knocks and the friend answers, one knock at a time, with the child's rhythm changed by a rule nobody states; a slack string is dead and answers nothing. A phrase is up to three knocks, and only its gaps (short or long) matter. The rules are echo, flip (short and long swap), reverse (gaps turned around), and double (each knock answered by two); one friend per session stacks two of them. After a friend has answered twice the child can tap its bush and name the rule from a row of chips; a right name reveals the friend, a wrong one costs a short wait. With the `stack-wakes` hook on, the stacked friend sleeps until one other friend is solved.

## What should vary on repeat play

> The child sends one lone knock and then two spaced knocks to test a guess on purpose, tells within a few exchanges whether this friend echoes, reverses, or doubles, and seeks out the friend that stacks two rules together.

Each session's seed deals a fresh set of friends: two different single rules and one stacked pair, shuffled across the three slots and the three can colours, so colour and position never predict the rule and nothing carries over but the child's method. Play 1 is fumbling: knock whatever, notice the answer is odd. By play 5 the child has a protocol (one knock separates the doublers from the rest, a spaced pair separates flippers, a short-then-long triple separates the reversers) and spends the visit on the stacked friend, where the first single-rule guess is wrong and a second probe is needed. The puzzle is fair by construction: any two of the seven rules differ on some phrase of at most three knocks (asserted in `sim.test.ts`).

Signature: pose (slack, taut, guess) times what was last heard (nothing, dead line, same, twice, changed, twice-changed) times solved (none, some, all), 54 at most.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-6, arch-7, arch-8, arch-9, arch-11 (15 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 1 of 15 runs (7%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 1, 0, 0 of 15.
- **Play 5 against play 1:** change 1.43 (1.43 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 29 adopted, 8 made progress. Tried: probes down, probes up, solved down, solved up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective solved up; outcome variety 1.98 bits (by policy: greedy 1.28, random 2.56, repeat-one 1.28). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 6.7% with every hook on, 6.7% with all off):
  - `stack-wakes`: not needed; without it 6.7%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 1 of 15 target-panel runs (7%) start session 3, 43.3 points short of the 50% line (7 more runs needed).
- Left first: `arch-7`, starting 1.0 of 5 sessions on average (the best in the target panel starts 2.0).

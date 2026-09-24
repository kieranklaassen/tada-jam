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
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses

_Filled after the panel run._

Known before the run:

- Personas tap at a steady pace, so they mostly send long-gap or short-gap runs by accident and rarely design a probe; the panel measures exploration, not the child's deliberate test.
- The rule is re-dealt every session, so there is nothing to remember across visits except the method, which the sim cannot see.
- A friend answers two exchanges before it can be named, but a determined child can still brute-force the seven chips (one wrong guess costs about five seconds).
- Rhythm timing is quantised to short or long, which will feel coarse to a child who taps expressively.

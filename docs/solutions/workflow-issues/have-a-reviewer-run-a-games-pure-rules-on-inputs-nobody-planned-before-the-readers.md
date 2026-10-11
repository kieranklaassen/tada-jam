---
title: "Have a reviewer run a game's pure rules on inputs nobody planned, before the readers, because reading the code does not find a cycle that never ends"
date: 2026-10-11
category: workflow-issues
module: parallel-agents
problem_type: workflow_issue
component: development_workflow
severity: high
related_components:
  - testing_framework
  - documentation
applies_when:
  - Briefing a builder for a jam game whose rules are pure modules played from a seed
  - Deciding what the lead's one reading or the code review before a pull request should do
  - A game has a cycle the child starts (a raid, a night, a test run) that the sheet says ends by itself
  - Every hand-made test picture has a flat floor, one party and one wall
  - Reading a test whose name promises more than its assertions ask
symptoms:
  - Five rounds on the design sheet, four readings by the builder's reader and one whole-folder reading passed a game whose raid could run for ever
  - CI was green on every commit
  - A cycle cut off by its safety cap was judged as one that went well and moved the hidden position
  - Eight tests passed with the behaviour they name broken
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [parallel-agents, code-review, property-test, pure-rules, cloud-vm, fresh-reader, learning-games, mierennest]
---

# Have a reviewer run a game's pure rules on inputs nobody planned, before the readers

## Context

Mierennest (`games/mierennest/`) is a jam game in which a child digs an ant nest and calls raids on it. A raid is played by pure modules on a copy of the nest (`raid.ts`, `routes.ts`, `walls.ts`), so a test or a script can play a whole raid with no browser.

Before its pull request the game had been checked by everyone the wave's process names. The design sheet went through five rounds: three read by checkers who did not write it, and two that were only pasted replacements, confirmed by the lead from the diff. The builder's own reader read the folder four times and stopped at the bound ([bound a builder's loop of fresh readers](bound-a-builders-fresh-reader-loop-at-four-readings-and-give-the-last-read-to-the-lead.md)). The lead's reader then read all the files once and played a few cases from the modules. CI was green on every push. All of these read the sheet and the code, and each found things, so the folder looked more settled after every pass.

Then a code-review session did something none of them had done as its main work. It imported the rule modules from scripts of its own, kept outside the repository, and played 4,716 raids on 262 random nests and twelve random games of 2,500 actions each, counting the kit after every action. Its report is kept whole in `docs/build/answers/mierennest-10.md`. It found:

- **A raid that never ends.** Where the floor of a room has a dip, two invaders end up waiting for each other and stand still until the raid's cap of 200 seconds. That happened in 56 of the 4,716 raids, and its smallest case is three ants at the second place of the designed order.
- **The cap hid it.** A raid cut off by the cap, with nobody having finished an act, was judged as one that went well, so the hidden position moved forward for a child who had built nothing.
- **A beetle sent home by any change.** A beetle on its way down the shaft gave up whenever anything in the nest moved: in 96 of the 810 raids with two or more beetles or balls, a wall was met by one beetle where the sheet sends two.
- **Two holes in found-as-left and in the kit**: a raid started under a working finger, and a stone made by a shot.
- **Eight tests that passed with the behaviour broken.** One held "balls do not push together" with pictures in which two balls never lean at once. One asserted what the code sets at the end of every raid. One checked that the position is a place of the ladder, which no position can fail.

The builder fixed each with the test the review named. One of those tests was the first in the folder to run on nests nobody had drawn: every party of the order on nests made by a seed, none cut off by the clock. Its lane reports that this test then found a fault the review had not: two beetles in a pit beside a bed of sand passed one lump to and fro for as long as the raid ran.

## Guidance

**1. Ask for a test on made-up inputs in the first rules run.** Where a game's rules are pure, the brief asks for it beside the hand-made pictures: inputs made by a seed (random nests, random play through the same entry points the Mount uses) and the invariants the sheet states, held on all of them. For Mierennest those were: every raid ends by itself and before the cap; no lump is made or lost; the position moves only after a raid that went well; a raid leaves the nest cell for cell as built. A hand-made picture shows that a rule works where the builder thought of it. A seed finds the floor with a dip.

**2. Give one review to running, and do it before the readers.** The lead's reading or the code review is a session that imports the pure modules from scripts of its own, plays many cases, and reports the smallest one that fails with the numbers it saw (how many of how many). It needs no build and no browser, so it fits a cloud session that reads files (`docs/build/runs/check.md`). Run it when the rules are whole, before the builder's reader loop starts: readers then read code whose cycles are known to end.

**3. A safety cap is not an ending.** A cycle that a cap cuts off is not judged. Mierennest's raid now sets a field when the clock ends it with someone still on the way, and that raid moves nothing, as a put-away moves nothing. A test holds that no party on the seeded nests is ever cut off, so the cap is never what a child meets.

**4. A test's name is a claim, and the reviewer tries it.** For each test of a rule, the reviewer changes the rule (takes the clause out, turns `&&` into `||`, adds where it should not) and sees whether the test fails. A test that still passes is reported with the smallest picture that would fail. Three shapes to look for: an expected value the code itself sets, a picture in which the named thing never happens, and an assertion that holds for every possible state.

## Why This Matters

The fault that mattered most was not in any one line a reader could point at. It came from two invaders, a floor that was not flat and the order in which they arrived: a state, not a statement. Reading finds statements that are wrong. Only playing finds states nobody drew, and a child will dig a dip into a floor within the first minute.

The cap made it worse than a hang. Because a cut-off raid counted as won, the fault did not look like a fault in play: the raid seemed long and then the next party arrived. Without the count of 56 in 4,716 nobody would have known to look.

The cost was one cloud session of about half an hour, after eight passes of reading. Had it run when the rules were first whole, the readers' later passes would have stood on rules that held.

## When to Apply

- A game whose rules can be imported and played without the view: a grid, a set of pieces, a state machine with a seed.
- Any cycle the sheet says "ends by itself", and any rule of the kind "never made, never lost", "never moves by chance", "found as left".
- Not for a game whose behaviour lives in a physics engine or in shaders: there the intersection audit and the stills do this job ([run the intersection audit before showing the owner](run-the-intersection-audit-before-showing-the-owner.md)).

## Examples

The smallest case of the raid that never ends, as the review gave it (three ants; `#` earth, `.` open, `X` turf and bedrock; the mouth at columns 4 to 6):

```
XXXX...XXXXXXXXXXXXXXXXX
####...#################
####...#################
####...........#########
########.........#######
########.........#######
###########..###########
########################
XXXXXXXXXXXXXXXXXXXXXXXX
```

With the two cells bitten out of the floor: 200 seconds, no act finished, judged as gone well. With a flat floor: 17.3 seconds, three acts, judged as not gone well. The fix was one condition in the function that decides whether an invader waits.

The shape of the brief line that would have caught it in the first run:

> Beside your pictures, one test plays every party of the order on nests made by a seed (rooms, halls of several heights, mouthfuls out of floors, lumps set down at random) and holds what the sheet says of every raid: it ends by itself before the cap, nothing is made or lost, and the nest is as built afterwards.

## Related

- [Bound a builder's loop of fresh readers at four readings](bound-a-builders-fresh-reader-loop-at-four-readings-and-give-the-last-read-to-the-lead.md): what readers converge on and what they do not.
- [Converge a parallel-agent corpus with independent checkers](converge-a-parallel-agent-corpus-with-independent-checkers-exact-fixes-lead-rulings-and-hash-bound-verdicts.md): findings that carry their exact fix, which the running review also did.
- `docs/build/answers/mierennest-10.md`: the review itself, with every case and count.

---
title: "Change a passed design sheet only by pairs the lead pastes, refuse a pair that weakens it, and keep the log true after every paste"
date: 2026-10-12
category: workflow-issues
module: parallel-agents
problem_type: workflow_issue
component: development_workflow
severity: high
related_components:
  - documentation
  - testing_framework
applies_when:
  - A builder agent finds that its game and its passed design sheet say different things
  - Deciding as the lead whether to accept a proposed change to a sentence of a sheet
  - Pasting a round of accepted pairs into a sheet, and before the push that follows
  - Writing or reading the status block of a game's REFINEMENT.md
  - Closing the last reading of a game and writing its pull request
symptoms:
  - A status block still said that pairs wait for the lead after the lead had pasted them
  - A log kept a sentence about what holds "until pairs 31 to 38 are pasted" after they were pasted, and it was found after a push
  - A status block claimed an owner checkpoint that nobody had held
  - A docs test failed when a pair was pasted, or when a later pair replaced part of an earlier one
  - A test set state by hand where play could reach it, and a model check was reported as if it were the audit
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [parallel-agents, orchestration, design-sheet, sheet-pairs, status-block, fresh-reader, docs-test, lead-rulings]
---

# Change a passed design sheet only by pairs the lead pastes, and keep the log true

## Context

From 10 to 12 October 2026 one lead and one builder agent per game rebuilt 35 lab demos as jam games. The builders' brief is `docs/build/demo-to-game.md` and the reader's page is `docs/build/runs/reader.md`. The design sheet is everything above `## The look` in a game's `ART.md` (`docs/build/runs/reader.md:11`). It is checked before the game is built, and the brief has the builder paste the checker's exact replacements and "change nothing else above the art guide" (`docs/build/demo-to-game.md:50`).

Then the game is built, and a fresh reader goes through the sheet sentence by sentence against the code (`docs/build/runs/reader.md:16`). Every game came back with sentences the code did not keep. The reader's page gives two ways out: the promise is built, or the sheet's sentence is changed and the next round asked for (`docs/build/runs/reader.md:29`). The second way needs a rule. A builder that may edit its own sheet can make the sheet say what the code does, and the sheet stops being a promise.

The rule of this run was pairs. After the sheet's check a builder never edits the sheet (`games/box-fort/REFINEMENT.md:102`). Where game and sheet differ, it builds the sheet, or it proposes a pair: the sentence as it stands, found exactly once in the sheet, and the sentence as it should stand, with a reason. The lead decides, pastes the accepted pairs with a script that asserts each "as it stands" occurs once, and records the round in the status block with the sheet's hash. Box Fort had 54 pairs pasted in four rounds (`games/box-fort/REFINEMENT.md:7`) and Lantern Walk 45 (`games/lantern-walk/REFINEMENT.md:7`).

The pairs worked. What came back, game after game, was the log around them: lines that were true before a paste and false after it.

## Guidance

**1. The sheet changes only by pairs the lead pastes.**
A pair is one sentence as it stands, found once above `## The look`, its replacement, and a reason. The builder lists pairs in a table in `REFINEMENT.md` and touches nothing above the art guide. The lead pastes with a script that fails when an "as it stands" is found zero times or twice, then writes the round, the pair numbers and the new hash into the status block (`games/nature-walk/REFINEMENT.md:7`).

**2. Refuse a pair that weakens the sheet to match weaker code.**
The test is what the pair does to the promise. A pair that adds where the sheet is silent is accepted. A pair that takes a promise away is refused, and the builder builds the sentence. The one exception is a fact of the frame that forces the change, written into the reason (`games/box-fort/REFINEMENT.md:118`).

**3. After every paste, search the log and fix every line before the push.**
Search `REFINEMENT.md` for "wait", "will read", "are pasted" and "will paste". Each hit is either a pair that really waits or a line that the paste made false. Do the same in `ART.md` below the sheet.

**4. A status block says only what has happened, and names who did it.**
"Pasted by the lead." "Run four times by the lead." For a checkpoint the owner did not hold, the honest line is the one the games ended with: `Toy checkpoint: passed by the lead only. The owner has not seen the game` (`games/box-fort/REFINEMENT.md:8`).

**5. A test about the sheet's words must survive pasting.**
A test that checks the pair table against the sheet has to pass before a pair is pasted, after it, and after a later pair has replaced part of what an earlier one put in.

**6. Every fix gets a named test that fails when the fix is taken out.**
Where a touch is involved the test goes through the Mount's path, and it reaches its state by play wherever play can reach it. A test that sets the state by hand never plays the behaviour its name claims. A check of the model with no browser is reported as that and never as the intersection audit.

**7. The last close is announced as the last.**
The lead's message says so in these words: "no further reading follows; after this close the lead takes the game as it stands and says so in the pull request". The builder then does its own reading of the sheet, sentence by sentence, against the finished code, and reports what is still untrue.

**8. The pull request lists what was not checked and what is weak, a child's view first.**
The brief already asks the builder's report for "what is still weak" (`docs/build/demo-to-game.md:69`). The log keeps both lists under their own headings, and the weak list puts first what a child would notice.

## Why This Matters

The status block is all that carries from one run of a builder to the next, and the lead and the owner read it in place of the session. A line that says pairs wait, when they are pasted, sends the next run to wait for something that will never come. A line that claims an owner checkpoint tells the lead that a look is settled when the owner has never seen it.

A refused pair costs one more build and keeps the promise. Box Fort's pairs 1 and 2 would have ended a cut when the finger lifts. The sheet says a traced line survives a lifted finger (`games/box-fort/ART.md:10`, `games/box-fort/ART.md:23`), the lead refused both, and the builder then built it (`games/box-fort/REFINEMENT.md:104`). Accepted, they would have removed the one thing the age rule asks of tracing.

A model check that says zero is not the audit. Box Fort's stepped check said 0 open before the second and third audit runs, and each of those runs found 4 (`games/box-fort/REFINEMENT.md:10`).

Taking each fix out once is cheap and finds the tests that test nothing. Lantern Walk did 48 removals at one close and 17 at the next, and a named test failed each time (`games/lantern-walk/REFINEMENT.md:248`, `games/lantern-walk/REFINEMENT.md:265`).

## When to Apply

- A game has a passed sheet and a builder that is still changing code.
- A lead is about to paste, or has just pasted, a round of pairs.
- A status block is about to be pushed.
- A folder has a test that reads `ART.md` or `REFINEMENT.md` as text.
- A lead is sending the message that closes the last reading.

## Examples

A refused pair and what followed (`games/box-fort/REFINEMENT.md:7`):

```text
Round 2: pairs 3 to 15 pasted by the lead; pairs 1 and 2 refused (a cut
survives a lifted finger, as the sheet says, and the game now does that).
```

A pair accepted because the frame forces it (`games/box-fort/REFINEMENT.md:118`): wearing a box, the grandmother stands where it stood. A walk in a box would sweep the lane where pieces and cushions lie and where the cat and the baby cross.

Lines the paste made false. The first was in Box Fort's status block and is recorded as fixed at `games/box-fort/REFINEMENT.md:422`, with the heading that said the same at `games/box-fort/REFINEMENT.md:384`. The second was found in Nature Walk's log after a push:

```text
Before: pairs wait for the lead.
After:  Sheet pairs: none waits. Pairs 16 to 56 are pasted and listed under
        "The sheet against the code".

Before: until pairs 31 to 38 are pasted, the sentences they replace say
        what the game no longer does.
After:  Open: no pair waits. Pairs 31 to 38 for the sheet, from the close
        of the second reading, are pasted by the lead.
```

The "After" lines are `games/box-fort/REFINEMENT.md:12` and `games/nature-walk/REFINEMENT.md:10`.

A docs test that survives pasting (`games/wool-picture/docs.test.ts:154-180`, "lesson 12"). For a pair that waits, it finds "as it stands" once in the sheet. For a pasted pair, it finds the replacement once, after applying every later pasted pair to it. Where a later pair replaced a sentence that only the start or the end of this replacement was part of, the test strips that overlapping prefix or suffix when it is at least 20 characters long, and looks for what is left.

A test that set state by hand (`games/box-fort/REFINEMENT.md:372`): the acts let a cushion go on board and set `cushions` by hand, which hid that a cushion let go on an opening flopped on the rug. Now the acts let go on the opening, "and where play can put a cushion in a box, play does".

The last close and the builder's own reading (`games/lantern-walk/REFINEMENT.md:8`, `games/lantern-walk/REFINEMENT.md:265`): "No further reading follows: the lead takes the game as it stands after pass 7." With pairs 39 to 45 pasted, the builder read the sheet once more and named three sentences still not wholly true, each listed under "Weak". The same log keeps "Not checked" at `games/lantern-walk/REFINEMENT.md:90` and "Weak" at `games/lantern-walk/REFINEMENT.md:97`.

## Related

- [Bound a builder's loop of fresh readers](bound-a-builders-fresh-reader-loop-at-four-readings-and-give-the-last-read-to-the-lead.md): how many readings a game gets and who does the last one; this document covers what may change in the sheet between readings and what the log says afterwards.
- [Make a parallel-agent corpus converge](converge-a-parallel-agent-corpus-with-independent-checkers-exact-fixes-lead-rulings-and-hash-bound-verdicts.md): exact replacement sentences, numbered lead rulings and verdicts bound to a hash, which the pairs carry over from records to a sheet.
- [Build a jam game](../conventions/building-a-jam-game.md): "The design sheet", "The check of the sheet" and "Building several games at once".
- [The builders' brief](../../build/demo-to-game.md), [the reader's brief](../../build/runs/reader.md) and [the closing run](../../build/runs/closing.md): the run's own pages.
- [CONCEPTS.md](../../../CONCEPTS.md): Design sheet, Wave, Reader.

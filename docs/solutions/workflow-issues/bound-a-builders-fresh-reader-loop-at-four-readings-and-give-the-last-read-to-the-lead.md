---
title: "Bound a builder's loop of fresh readers at four readings and give the last read to the lead, because reading your own work until one reader says READY does not converge"
date: 2026-10-04
category: workflow-issues
module: parallel-agents
problem_type: workflow_issue
component: development_workflow
severity: high
related_components:
  - documentation
  - tooling
applies_when:
  - Telling a builder agent to have its own work read by a fresh agent, fix what comes back, and repeat until a reading ends READY
  - Running many builders at once on one account, where every reading spends from the same usage limit
  - A lane's finding counts have fallen to between one and four and each new reading names other things than the one before
  - Deciding as the lead whether a game is ready to merge after its builder has stopped its readings
  - Changing a standing page that lanes read, such as docs/build/runs/reader.md, after the lanes have started
symptoms:
  - Every reading of a game folder of 70 to 100 files against its design sheet found other things than the reading before
  - Finding counts fell fast and then stayed between one and four
  - Six lanes ran 21 to 30 readings each, and three of them never got a READY
  - The loop used up the account's usage limit, and every lane was cut off at once
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [parallel-agents, fan-out, orchestration, cloud-vm, fresh-reader, review-loop, usage-limit, learning-games]
---

# Bound a builder's loop of fresh readers at four readings and give the last read to the lead

## Context

Nineteen builder agents on cloud machines each built one learning game from the template, on its own branch `lane/<key>`, steered by a lead (`docs/build/CLOUD.md`). After the build, each builder had its whole game folder, 70 to 100 files, read against its design sheet by a fresh subagent that had not seen the build, handed the reader's brief and the folder's path and nothing else. The brief has six rules (`docs/build/runs/reader.md:11-16`): official wording, web addresses and outside requests, names, record ids in the build, drawn text, and "the game does what its sheet says". The builder fixed what came back and had it read again by another fresh subagent, until the last line said `READY`.

The loop did not end. Each reading found other things than the one before. Rules 1 to 4 went clean within a few readings and stayed clean, and rule 5 kept turning up a drawn shape now and then (`games/monster-hotel/REFINEMENT.md:21`). Rule 6 never reached zero: one lane's first five counts were 20, 13, 7, 6, 6 (`games/tea-time/REFINEMENT.md:52`), and the lanes that ran past twenty readings stayed between one and four a reading for as long as they ran (one lane's own account: `games/monster-hotel/REFINEMENT.md:22`). The late findings were small and real: a detail of one character in one state, a touch in the frame a scene ends, a shape that could be taken for a sign. Six lanes ran between 21 and 30 readings; four of them are in the tree, and two were not yet merged when this was written. Three reached `READY`: on the twenty-third reading (`games/who-made-that-sound/REFINEMENT.md:91`), on the thirtieth (`games/seed-lab/REFINEMENT.md:22`), and, in one of the unmerged lanes, on the twenty-second. Three never did: after 21 readings (`games/princess-playground/REFINEMENT.md:20`), after 24 (`games/monster-hotel/REFINEMENT.md:19`), and after 21 in the other unmerged lane. By the lead's record of the wave, the loops used up the account's usage limit, which cut off all nineteen lanes at once on 3 October, and messages sent afterwards were swallowed until each lane was sent a short "resume" message.

The [corpus learning](converge-a-parallel-agent-corpus-with-independent-checkers-exact-fixes-lead-rulings-and-hash-bound-verdicts.md) covers short records checked against a source text, where exact replacement sentences and numbered rulings make rounds converge. A whole program read against a prose sheet does not converge, and needs a bound.

## Guidance

**1. Bound the loop on the page that states it.**
The reader's page now says: if the fourth reading is still not `READY`, fix what it found, write `Reader: stopped after four readings` in the status block with what is judged left and why it is slight, and stop (`docs/build/runs/reader.md:3`).

**2. Judge by the kind of finding, not by a count of zero.**
A finding holds a game back when it touches the mechanic, the error, a saved field, the learning claim, or one of rules 1 to 5. A detail of one figure in one state does not.

**3. The last read belongs to someone else.**
The lead has the folder read once by its own fresh reader, on a stable copy of the lane's tip. That reader is told what the builder's readers already found, names only what is still true of the code (`docs/build/runs/reader.md:23`), and says for each thing the builder left whether it agrees it is slight. The lead sends the builder one "last points" message with everything in it.

**4. No reading after the last points.**
Where the sheet changed, the changed sentences are checked (`docs/build/runs/closing.md:8`), and the game is brought in.

**5. Send a change to a standing page.**
A builder reads the standing pages when it starts; at a stage boundary it fetches only the answers folder (`docs/build/CLOUD.md:72`). The bound came to the reader's page on the base branch after the lanes had started. Lanes that had read the page once ran past twenty readings, until the lead sent each a message to stop, write the line and hand over. Some lanes saw the bound only because they happened to fetch the page again, one of them before its twenty-second reading (`games/princess-playground/REFINEMENT.md:20`). Either the builder fetches the page again before each loop, or the lead sends the change.

## Why This Matters

Each fresh reviewer samples a large thing differently, so findings reach a floor and not zero. An exit condition of zero then has no cost limit: here, more than twenty readings in each of six lanes, and the usage limit of all nineteen lanes at once.

The lead's reader found real things every time: a promise of the sheet unkept, something that looks touchable and answers as something else, a test that does not test what its name says, a drawn shape that reads as a sign. By the lead's record, it also said plainly, of a game that had been through 24 rounds of fixes, that no fix had undone an earlier one.

With the bound and the lead's one read, the remaining lanes went from handed over to merged in one or two short runs each. Twelve games were on main when this was written (pull requests #38 to #43 of `kieranklaassen/tada-jam`).

## When to Apply

- Any "repeat an independent review until it passes" loop with a fresh reviewer each time, over something large.
- The count of findings has stopped falling and what is found is of one small kind.
- Many agents run the same loop on one usage budget.
- A page that running agents read once is about to change.

## Examples

What a builder writes when it stops (abridged from `games/monster-hotel/REFINEMENT.md:19-22`):

```text
Reader: stopped after four readings.
Left: rule 6, one to four a reading, each a detail of one guest in one state.
Slight because: rules 1 to 4 clean since the second reading; the last change
to a rule of the game came with the twentieth.
```

What the lead adds to the reader's page for its one read (paraphrased from this session's):

```text
Read the folder at <stable copy of the lane's tip>.
The builder's readers found and fixed: <the lists in the status block>.
Name only what is still true of the code.
For each thing the builder left, say whether you agree it is slight.
```

## Related

- [Make a parallel-agent corpus converge](converge-a-parallel-agent-corpus-with-independent-checkers-exact-fixes-lead-rulings-and-hash-bound-verdicts.md): a closed check of one record against one source, which exact replacements and rulings bring to an end; this document covers the open reading of a whole folder, which they do not.
- [Build a jam game](../conventions/building-a-jam-game.md): "The check of the sheet" is the closed check the reader's step sits beside, and "Building several games at once" is the wave this happened in.
- [The reader's brief](../../build/runs/reader.md) and [the closing run](../../build/runs/closing.md): the wave's own pages for the step.
- [Fan parallel agents out from an explicit base SHA](fan-out-parallel-agents-in-worktrees-from-an-explicit-base-sha.md): how such a fan-out is set up.
- [CONCEPTS.md](../../../CONCEPTS.md): Wave, Lane, Design sheet, Reader.

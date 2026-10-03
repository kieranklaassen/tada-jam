---
title: Make a parallel-agent corpus converge with independent checkers, exact replacement sentences, numbered lead rulings and hash-bound verdicts
date: 2026-10-02
category: workflow-issues
module: parallel-agents
problem_type: workflow_issue
component: development_workflow
severity: high
related_components:
  - tooling
  - documentation
applies_when:
  - Fanning writer agents out over a large corpus of records that a second agent must check against a source text
  - A fix round introduces new faults, or the same sentence flips back and forth between check rounds
  - Two checkers read one rule of the brief differently in more than one lane
  - Records can still be edited after their check, and nobody can say which verdicts still hold
  - Before the first push of a branch to a public repository when some text must never be published, even in a commit that a later commit cleaned up
symptoms:
  - A fixer given a finding that only described the fault rewrote the sentence and introduced a new fault, which the next checker flagged
  - Some lanes flipped the same sentence back and forth between rounds, because two checkers read one rule differently
  - A ruling written to settle one disagreement produced over-flagging until a later ruling narrowed its scope
  - The check of the final tree passed, while the check of each commit about to be pushed found four lines in two intermediate commits holding runs of eight or more words of wording that must not be committed
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [parallel-agents, fan-out, orchestration, second-check, lead-rulings, content-hash, education-pack, git-history]
---

# Make a parallel-agent corpus converge with independent checkers, exact replacement sentences, numbered lead rulings and hash-bound verdicts

## Context

The education pack (`education/`, on the branch `feat/education-pack`, unmerged as of this writing) is a reference corpus of 3,434 records in 52 lanes, where a lane is one jurisdiction, level and subject. Each record holds an official statement (or a hash of it) and sections the pack wrote itself. Writer agents wrote those sections lane by lane in parallel, and a second check by other agents judged every record against its source.

The first check rounds did not converge, for two reasons seen in this session:

- A finding that only described a fault left the fixer to rewrite the sentence. The rewrite often carried a new fault, which the next checker flagged.
- Two checkers read one rule differently, so some lanes flipped the same sentence back and forth between rounds.

A separate problem showed just before the first push. The repo is public and one jurisdiction's official wording may never be committed. The check of the working tree (`npm run education:overlap`) passed, but the check of each commit (`npm run education:reuse-history`) failed: four lines in two intermediate commits held runs of eight or more official words that later commits had removed. A push would have published them in history.

The checker brief, the fixer brief and the numbered rulings were session notes. They were not committed to the repo, which is why this document exists.

## Guidance

**1. Make the checker independent by construction.**
The checker of a lane is a different agent from its writer. The checker of a later round is a different agent from the writer, the fixer and every earlier round's checker. A checker sees the record and the source, never the writer's notes or reasoning. Tell it that a verdict of confirmed is a claim it makes, not a default. The `checker` field of a verdict is a short label such as the lane and batch, never a person (`education/tools/review.ts:80-81`).

**2. Every finding carries the exact replacement sentence.**
A checker that flags a sentence in the pack's own text writes the sentence that should stand there, in the verdict's free-text `note` (`education/tools/review.ts:69-70`). The fixer pastes it. The closing check then only confirms the paste. The lead may apply a prescribed one-sentence fix itself, and a fresh agent still does the closing check.

**3. Settle each recurring disagreement once, as a numbered ruling.**
When the same disagreement shows in more than one lane, the lead decides it and adds a numbered ruling to the checker brief. A ruling names the case, the verdict to give (one reason from the closed list at `education/tools/review.ts:28-36`), the form of the fix, and the near case that is not a fault. Every later checker and fixer gets the brief with all rulings. This build ended with twelve (two are shown under Examples). A ruling can over-flag: ruling 12 exists only to narrow ruling 11. Expect to write scope rulings.

**4. Bind each verdict to hashes of the text it judged.**
A verdict stores `wording_sha256` and `text_sha256` (`education/tools/review.ts:62-65`). The second is a hash of the pack's own sections, headings included (`education/tools/review.ts:118-126`). The checker takes both hashes after it finishes reading (`node education/tools/review.ts <record file>...`, `education/tools/review.ts:313-321`). The join never stores a state on a record. It computes one: the verdict of the highest round decides (`education/tools/review-join.ts:229`), and the record is stale when either hash differs from the record as it is now (`education/tools/review-join.ts:261`). A fix therefore makes its record stale until a higher round checks it. Nobody keeps a list of what was edited after its check.

Two limits. The hashes bind the text, not the rules: a ruling that lands late does not make earlier confirmed lanes stale, so the lead keeps that list by hand (in this session, rulings 8 to 12 were not swept over lanes confirmed before them; that sweep is an open follow-up). And the verdict binds the wording and the pack's own text only; in this session the code review recorded as a residual risk that a record's code and its accompanying official text are outside both hashes.

**5. Script the mechanical part of the check.**
A scripted first pass (`npm run education:match`, `education/tools/match.ts:1-3`) finds each statement in the lane's check rendition (a second official rendition where one exists, otherwise the same file read again), so checkers spend their attention on meaning.

**6. Keep an honest unconfirmed state.**
A record that cannot be confirmed stays, with one reason from the closed list. The final gate allows exactly one such reason, `wording-differs`, for a real difference between two official renditions (`education/tools/review-join.ts:343`, `:380-381`).

**7. The lead merges and commits.**
Agents never run a git command that writes. For a lane checked in batches, each checker writes a batch file outside the tree, and the lead merges them into the lane's one review file through `serialiseReview`, which fixes key and verdict order (`education/tools/review.ts:303-311`). The parser rejects a second verdict for one record in one round (`education/tools/review.ts:281-282`). The lead commits by specific paths. In this session, agents that shared one scratchpad folder collided on a script name; give each a private subfolder.

**8. Check every commit before a push, not only the tree.**
`npm run education:reuse-history` reads each commit of `origin/main..HEAD` by default, or a range given as `<base>..<head>` (`education/tools/reuse-history.ts:40`, `:102`, `:187`). It checks the files under `education/` that each commit adds or changes, as they are in that commit (`education/tools/reuse-history.ts:9-10`, `:127`). It reads nothing outside that folder, so a plan or a commit message is kept clean by hand.

When intermediate commits held such text, rebuild the unpushed history from the final tree. In this session the affected commits were first repaired with a filter. The tool finds only a run of eight consecutive words outside a record (`education/tools/overlap.ts:27-28`, `:34-36`), so short near-copies could not be proven absent from 186 intermediate commits. The branch was rebuilt as eight commits made from the final tree, with an identical tree hash. The detailed history stays in a local backup branch that is never pushed. The check then passed on all eight commits.

## Why This Matters

Without replacement sentences and rulings, each round creates about as many findings as it closes, and the number of rounds has no bound. With them, a lane in this session needed at most four rounds. The tree now holds 3,434 records: 3,404 confirmed, 30 unconfirmed (all `wording-differs`), none stale, none unchecked (`education/docs/COVERAGE.md:23`). Sample audits against the publishers' live documents in this session found 50 of 50 and 58 of 58 equal.

The computed state is what lets many agents edit in parallel without the lead tracking edits. CI runs it without the wording store: `npm run education:tree` after `npm run education:check` (`.github/workflows/ci.yml:105-107`).

A must-not-publish text in an intermediate commit is published by the push, whatever the final tree holds. No later commit removes it.

## When to Apply

- A corpus, catalogue or content set is written by many agents and judged against a source of truth.
- A fix round keeps producing new findings, or a sentence flips between rounds.
- Records keep changing after their check and someone has to know which checks still hold.
- A public repository must never hold a given text, and the branch has intermediate commits made while that text was being worked out.

## Examples

A finding that only describes a fault, for an invented record (verdict abridged):

```json
{ "id": "example-sorting-1", "verdict": "unconfirmed", "reason": "notes-contradict",
  "note": "The age sentence states amounts the goal does not state." }
```

The same finding with its replacement:

```json
{ "id": "example-sorting-1", "verdict": "unconfirmed", "reason": "notes-contradict",
  "note": "The age sentence sets amounts (three, ten) that the goal does not state. Replace it with: 'A child of 4 sorts buttons by colour; a child of 6 sorts leaves by shape.'" }
```

Rulings as they stand in a checker brief (paraphrased from this session's):

```text
(5) In the age sentence, a bare "one" that sets an amount is a count, like any
    numeral: notes-contradict, with the replacement in the note. A number that
    describes the case and sets no amount is not a fault.
(12) Scope of ruling 11: a fault only where the text shows the child doing, or
    names as expected, what a higher level states as its own goal. A sentence
    that is merely near such a goal is a remark in the note of a confirmed verdict.
```

The commands (`package.json:41-42`, `:50-52`):

```bash
node education/tools/review.ts <record file>...      # the two hashes a verdict carries
npm run -s education:verify -- --summary             # state per lane; always exits 0
npm run education:tree                               # no store: second-check gate, frames, coverage report
npm run education:gate                               # with the store: the same and the frame texts
npm run education:overlap                            # the working tree
npm run education:reuse-history                      # each commit of origin/main..HEAD
npm run education:reuse-history -- <base>..<head>    # each commit of another range
```

`education:gate` runs four checks one after another and `education:tree` leaves out the one that needs the store (`education/tools/gate.ts:37-42`, `:49-51`).

## Related

- [Fan parallel agents out from an explicit base SHA](fan-out-parallel-agents-in-worktrees-from-an-explicit-base-sha.md): how such a fan-out is set up (base, one writer per file, shared files written by the lead); this document covers how its second check converges.
- [Push branches and keep secrets out](agent-delivery-push-branches-and-keep-secrets-out.md): the other kind of text that must never be published, and the push and CI routine.
- [The education pack guide](../../../education/README.md): the mechanism itself (check state, the gate, how the corpus was built and checked).
- [California wording is never pasted](../../../education/california-wording-is-never-pasted.md): the pack rule that defines the text the history check protects.
- [CONCEPTS.md](../../../CONCEPTS.md): Education pack, Lane, Check state, Description-only.

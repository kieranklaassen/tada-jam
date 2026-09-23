---
title: When git push returns 403 from a cloud VM, publish a jam branch with the GitHub MCP in import order, judge CI on the final head, and keep the local history in a bundle
date: 2026-09-23
category: workflow-issues
module: agent-delivery
problem_type: workflow_issue
component: development_workflow
severity: medium
related_components:
  - tooling
  - testing_framework
applies_when:
  - git push returns 403 from a cloud VM and the worker brief routes publishing through the GitHub MCP
  - Publishing a new jam game, or a refinement of one, in more than one push_files batch
  - A jam PR conflicts with main in a file other games also edit, such as the claimed-styles table
  - Reading CI on a branch that was published in batches
  - Finishing work on a VM that holds the only copy of the per-pass commits
symptoms:
  - Every Hillside Spring batch before index.ts failed one Vitest check, and only the index.ts batch was green
  - Cosy Scarf's first batch pushed index.ts and the mount before the modules they import and failed TypeScript with nine TS2307 errors
  - A Kite Tower batch dropped a field from a type while the files that read it came in the next batch, and failed TS2339
  - The claimed-styles table conflicted with main, and push_files cannot write the merge commit that would resolve it
tags: [agent-delivery, github-mcp, push-files, cloud-vm, ci, merge-conflicts, git-bundle, kids-games]
---

# When git push returns 403 from a cloud VM, publish a jam branch with the GitHub MCP in import order, judge CI on the final head, and keep the local history in a bundle

## Context

The ten style-showcase games (PRs #2 to #10 and #14) were built by agents on cloud VMs and published through the GitHub MCP. From those VMs `git push` returns 403 (PRs #2, #3, #6 to #9, and #14 say so), and the worker briefs route publishing through the MCP when it does. `docs/plans/2026-09-23-cosy-scarf-plan.md`, for example, says "publish (GitHub MCP when `git push` is refused)", and PR #8's body calls it the owner-sanctioned route.

The MCP's `push_files` takes a branch, a commit message, and a list of files with their full text, and writes them as one new commit on the remote branch. It cannot delete a file or write a merge commit, and it knows nothing about local commits. That shaped four things across the jam:

- A game too large for one call goes up in several batches. Every batch is a pushed commit, and CI runs on every pushed branch (`.github/workflows/ci.yml` triggers on `push` with `branches: ['**']`), so a branch collects runs on states that never existed locally.
- The remote branch's history is a run of publish commits, not the pass-by-pass commits made on the VM (PR #2 says so).
- A file several games edit, like the claimed-styles table in `docs/art-direction.md`, is replaced whole on every write.
- A conflict with `main` cannot be resolved locally and pushed, because there is no way to push the merge commit.

The Mac mini setup in [agent delivery](agent-delivery-push-branches-and-keep-secrets-out.md) is the other way round: `git push` works there, and the PR tool is what points at the wrong repository. Its PR hand-off and secrets rules apply here unchanged.

## Guidance

### Publishing

1. Try `git push -u origin <branch>` once. If it returns 403 and the brief routes publishing through the GitHub MCP, use the MCP. Do not work around the 403 some other way (another token, a credential helper, raw API calls), and write no token or key anywhere.
2. Create the remote branch from `main` with `create_branch` (`from_branch: main`).
3. Push new files in import order, so each batch holds only files whose local imports are already on the branch, and push `games/<key>/index.ts` last. TypeScript then passes on every batch. The one expected failure until `index.ts` lands is the Vitest check "every game folder has an index.ts exporting a game" in `test/games.test.ts`, which lists the folders under `games/` and needs an `index.ts` in each. A file pushed before a file it imports fails TypeScript with TS2307 (cannot find module) instead, and those errors bury any real one in the batch.
4. When a batch changes existing files, put a changed type or signature in the same batch as every file that uses it. Import order alone does not cover this: a batch that drops a field from a type fails if the files that read the field come in a later batch.
5. Build each file's content from a local tree that already contains everything on the remote branch. After any change made on the remote (a merge of `main`, a coordinator's commit), fetch and bring it into the local branch before the next `push_files`: rebase onto `origin/main` after a merge of `main`, or merge the fetched branch. A whole-file write from an older copy reverts what that change brought in, with no conflict to warn you and possibly a green run.
6. `push_files` cannot delete. When a file was removed or renamed locally, remove the old path with the MCP's `delete_file`, or the remote keeps it.

### Checking

7. Judge CI on the final head. Compare trees, not SHAs, because the publish commits never share SHAs with the local ones:

```bash
git fetch origin <branch>
git diff --quiet HEAD origin/<branch> && echo "remote tree matches local"
gh run list --branch <branch> --commit "$(git rev-parse origin/<branch>)"
```

A red run on an earlier batch is expected when it is the one `index.ts` check. Anything else on an intermediate batch is either a real failure or a batch that split a change from its users (step 4), so read it before moving on. Say in the PR body that earlier red runs were intermediate batches; PRs #3, #6, and #10 did.

### A conflict in a file other games edit

8. When the PR conflicts with `main` only because both sides edited a shared file, let GitHub make the merge:
   1. Push the shared file as it is at the merge base, so the branch no longer changes any file that `main` changed. The content is `git show "$(git merge-base origin/main origin/<branch>)":docs/art-direction.md`.
   2. Call `update_pull_request_branch` on the open PR. GitHub merges `main` into the branch without a conflict.
   3. Rebase the local branch onto `origin/main`, resolving the shared file there as `main`'s version plus your change, and push that file. Cosy Scarf's bundle holds its history rebased this way.

   If the conflict is in more than the shared file, or the PR is not open yet, leave the merge to the coordinator.

### Keeping the history

9. Before the VM can go away, write the local branch to a git bundle in the Project store, and name its path in the PR body:

```bash
git bundle create <Project store>/internal/jam-10-games/bundles/<key>.bundle origin/main..HEAD
```

A bundle made this way needs only commits that are on `main`, so it fetches onto any clone: `git fetch <bundle> HEAD:refs/heads/<branch>`.

10. Open the PR with `create_pull_request` only when the brief says to. Otherwise hand the description to the coordinator, as [agent delivery](agent-delivery-push-branches-and-keep-secrets-out.md) describes. Leave the base, draft state, and merge to the coordinator.

## Why This Matters

- On some branches the red runs are most of the history. Among push runs, Shadow Lantern's branch has 13 failed and 9 green, Hillside Spring's 9 and 9, Kite Tower's 10 and 25, and Cosy Scarf's 10 and 24. An agent that reads the newest red run without checking which tree it ran on either chases a batch that no longer exists or waves a real failure through as "just a batch".
- Keeping intermediate failures to the one known check is what makes every other failure a signal. Hillside Spring's first publish (PR #10) failed only the `index.ts` check on each of its nine batches before `index.ts`, and the `index.ts` batch was green. Cosy Scarf's first batch (PR #14) held `index.ts`, the mount, and modules that import `./state`, but not `state.ts`, the controller, or the views. TypeScript failed with nine TS2307 errors and two implicit-any errors in the same files.
- A whole-file write is not a patch. The claimed-styles table holds one row per game, so a write from a stale copy drops rows other games added, and nothing complains.
- Without the merge-base reset, only someone who can push a merge commit can resolve a conflict, and the PR waits on them.
- The VM is the only place the per-pass commits exist. PR #14's body points to `internal/jam-10-games/bundles/cosy-scarf.bundle` for a clean linear history, while the remote branch keeps the batches.

## When to Apply

- `git push` returns 403 from a cloud VM and the worker brief routes publishing through the GitHub MCP.
- Publishing a new game or a refinement pass in more than one `push_files` batch.
- A jam PR conflicts with `main` in a file other games also edit, such as `docs/art-direction.md`, or `CONCEPTS.md` for a compound doc.
- Reading CI on a branch that was published in batches.
- Finishing work on a VM that may be reset.

## Examples

**Import order on a refinement (PR #9).** Kite Tower published passes 21 to 30 in four batches: layout, physics, the climb planner, and guidance; then the controller; then the views; then the tests. All four were green. Passes 16 to 20 were not all green: their first batch removed `grade` from the `Tier` type in `games/kite-tower/quality.ts`, while `games/kite-tower/view/stage.tsx` and `games/kite-tower/quality.test.ts`, which still read it, came in the second batch:

```
games/kite-tower/quality.test.ts(12,21): error TS2339: Property 'grade' does not exist on type 'Tier'.
games/kite-tower/view/stage.tsx(269,17): error TS2339: Property 'grade' does not exist on type 'Tier'.
```

Shadow Lantern hit the same thing (PR #5): between batches the remote mixed first-playable files with refined ones, old code read a tier field the new `tiers.ts` had dropped, and the runs went green once the matching tests landed.

**The registry reset (PRs #9 and #14).** Both branches carry the same three commits:

1. "Temporarily restore docs/art-direction.md to the merge base so main merges cleanly".
2. "Merge branch 'main' into cursor/kite-tower-eb1b" (and `cosy-scarf`), committed by GitHub.
3. "Register Kite Tower (Cosy Scarf) in the claimed-styles table on top of main's registry, keeping every game's row".

Before the reset, a trial merge of either branch with `main` conflicts in `docs/art-direction.md`. After it, no file is changed on both sides, the merge's `docs/art-direction.md` equals `main`'s, and the third commit adds one line, the game's row. CI was green on both merges and both re-adds.

Cosy Scarf had earlier pushed a table that already held every row from `main` plus its own, onto a branch still based on the old `main`. The content was right, and it still conflicted, because both sides had changed the same lines of the old table in different ways. Leaving the file at the merge base until `main` was merged in is what made the merge clean.

**Restoring a checkpoint.** Seven games left bundles in the Project store's `internal/jam-10-games/bundles/`. Each one verifies against a clone of `main`:

```bash
git bundle verify <Project store>/internal/jam-10-games/bundles/cosy-scarf.bundle
git fetch <Project store>/internal/jam-10-games/bundles/cosy-scarf.bundle HEAD:refs/heads/cosy-scarf-history
```

## Related

- [`agent-delivery-push-branches-and-keep-secrets-out.md`](agent-delivery-push-branches-and-keep-secrets-out.md): delivery from the Mac mini, where `git push` works; the PR hand-off and the secrets rules that apply here too.
- [`building-a-jam-game.md`](../conventions/building-a-jam-game.md): step 11 lists the checks to run before any push.
- [`jam-perf-global-declaration-must-match-in-every-game.md`](../build-errors/jam-perf-global-declaration-must-match-in-every-game.md): a branch that is green alone can still break `main` once merged, which is why the run on GitHub's merge commit matters.

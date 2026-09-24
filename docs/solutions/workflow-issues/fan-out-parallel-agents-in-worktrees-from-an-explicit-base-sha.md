---
title: When fanning parallel agents out into git worktrees, give every agent an explicit base SHA and make it verify or reset to it, because the harness cuts worktrees from main and removes empty ones
date: 2026-09-23
category: workflow-issues
module: parallel-agents
problem_type: workflow_issue
component: development_workflow
severity: medium
related_components:
  - tooling
applies_when:
  - Dispatching more than a few agents at once, each in its own isolated git worktree, to build or write on a feature branch
  - The default branch is moving while the fan-out runs, because other pull requests merge in the meantime
  - An agent stopped early (a failed guard, a question) and was resumed by message
  - Many agents each own one file or folder and their branches are merged back one by one
symptoms:
  - "A builder stopped with: git merge --ff-only refused (Not possible to fast-forward), because its worktree was cut from a newer main than the feature branch's base"
  - Five of thirty builders built nothing, and each one reported a setup failure rather than a problem with its assignment
  - A resumed agent found its worktree and branch gone and asked what to do, or quietly recreated a worktree and carried on
  - A branch-commit monitor fired for every worktree branch because a fast-forwarded branch already counts as ahead of the old base
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [git-worktree, parallel-agents, fan-out, base-sha, fast-forward, workflow, agent-delivery, orchestration]
---

# When fanning parallel agents out into git worktrees, give every agent an explicit base SHA and make it verify or reset to it, because the harness cuts worktrees from main and removes empty ones

## Context

While building the mechanic prototype lab (30 prototypes, 8 idea shards, and several builders), the work was fanned out to dozens of agents, each asked to run in its own isolated git worktree and commit on its own branch. The brief told each agent to run `git merge --ff-only <lab tip>` first, so its branch sat on the feature branch. The agent did the assigned unit and reported its branch, and the lead merged the branches one by one.

Two behaviours of the harness broke that plan:

- **The worktree base is not the feature branch.** Each isolated worktree was cut from the default branch (`main`), not from the branch the lead was on. While the run was going, other pull requests merged into `main` (#17 and #18 among them), so the base moved. For five of thirty builders the fast-forward was refused, because `main`'s new tip is not an ancestor of the feature branch. The agents stopped as the brief told them to and built nothing.
- **An empty worktree does not survive an early stop.** When an agent stopped before writing anything (for example on that failed guard), the harness removed its worktree and branch. Resuming the agent by message could not fast-forward a directory that no longer existed. Several agents recreated a worktree themselves with `git worktree add`, which worked but was not in the brief.

## Guidance

Treat the worktree base as something the brief sets, never something the harness provides, and make the check destructive-safe:

1. **Put an explicit `BASE_SHA` in every agent's prompt.** It is the tip of the branch the work must land on, captured after the last commit the agents depend on.

2. **First command: land on that SHA.** Tell the agent to run `git merge --ff-only <BASE_SHA>`. If the harness refuses because the worktree was cut from a moved `main`, the worktree is fresh and holds nothing of the agent's, so `git reset --hard <BASE_SHA>` is safe. Then require both `git rev-parse HEAD` to equal `BASE_SHA` and `git status --short` to be clean before the agent does anything else. If either still fails, the agent stops and reports.

3. **Prefer creating the worktrees yourself for anything you may resume.** `git worktree add -b <branch> <path> <BASE_SHA>` at a path outside the repo, plus a symlink from the worktree's `node_modules` to the main checkout's, gives an agent a base you control and a directory that outlives an early stop. Tell the agent to use absolute paths under it and to leave the main checkout alone.

4. **Give every file one writer.** Shards of idea files, one folder per prototype, one report file per engine: with disjoint ownership the sequential `git merge <branch>` of thirty branches had no conflicts. Anything shared (a package script, an index that imports every shard) is written by the lead once, before the fan-out or after the merges.

5. **Do not count fast-forwarded branches as progress.** A monitor that fires when a branch is ahead of the old base reports every worktree branch the moment it moves onto the new base. Watch for a commit whose subject is the assigned unit's, or read each agent's own return.

6. **Check that a behaviour-preserving edit really preserved it.** For deterministic code, fingerprint each simulation's `observe` and `snapshot` stream over fixed seeds before and after, and re-run the seeded panel to require byte-identical committed reports. That proved a 119-item simplification pass safe across thirty prototypes without reading the diff.

## Why This Matters

The failure looks like an agent problem and is a setup problem: the agent obeys a guard that the environment makes impossible to pass, reports politely, and the fan-out silently produces fewer results than the count that was asked for. Five of thirty is easy to miss if the lead only counts what came back. A moved `main` is the normal case on a shared repository, so the base has to be an input, not an assumption.

## When to Apply

- Any time more than a handful of agents each get an isolated worktree, and especially when the default branch is active.
- When the branch the agents must build on has commits `main` does not, which is every long-running feature branch.
- Before resuming an agent by message: check its worktree still exists.

## Examples

The setup lines that worked, as they appeared in each builder's brief:

```text
1. Run `git merge --ff-only <BASE_SHA>`. If it says it cannot fast-forward, your worktree is
   fresh and holds nothing of yours, so run `git reset --hard <BASE_SHA>`. Confirm
   `git rev-parse HEAD` equals BASE_SHA and `git status --short` is clean. If that
   still fails, stop and report.
2. `ln -s /path/to/main-checkout/node_modules node_modules` in the worktree root.
3. Touch only your assigned folder. Do not push.
```

The same guard, when the lead pre-creates the worktree so an early stop cannot lose it:

```bash
git worktree add -b lab-ideas-other-minds "$SCRATCH/wt-other-minds" "$BASE_SHA"
ln -s "$PWD/node_modules" "$SCRATCH/wt-other-minds/node_modules"
```

Related: [Push branches and let the owner open PRs](agent-delivery-push-branches-and-keep-secrets-out.md) covers how the finished branch is published, and [Record a deterministic walkthrough](record-a-deterministic-walkthrough-on-software-gl-with-a-paused-clock.md) uses the same seed-and-compare idea to prove two captures are the same.

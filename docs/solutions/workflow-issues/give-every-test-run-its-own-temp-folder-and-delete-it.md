---
title: Give every test run its own temp folder and delete it afterwards, because each vitest run leaves a cache folder in the shared temp folder and the disk allowance is fixed
date: 2026-10-12
category: workflow-issues
module: parallel-agents
problem_type: workflow_issue
component: development_workflow
severity: high
related_components:
  - testing_framework
  - tooling
  - documentation
applies_when:
  - Many builder agents share one machine and each runs vitest often
  - Writing the brief for a builder in a wave of jam games
  - A build or a test fails with "no space left on device" or an ENOENT on a cache file while df shows little used
  - An intersection audit has just finished in a worktree
  - A lead is about to clear leftovers in the shared temp folder that other agents made
symptoms:
  - Builds and tests failed with "no space left on device" or with an ENOENT on a cache file
  - df showed little used while writes were refused
  - 5,417 folders with 21-character random names sat directly under the system temp folder and took 20 GB
  - The machine's fixed disk allowance filled twice during one run
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [vitest, temp-folder, tmpdir, disk-space, parallel-agents, intersection-audit, builder-brief, cleanup]
---

# Give every test run its own temp folder and delete it afterwards, because each vitest run leaves a cache folder in the shared temp folder and the disk allowance is fixed

## Context

From 2026-10-10 to 2026-10-12 many builder agents built 35 games on one machine and ran tests constantly. In this repo each `npx vitest run` creates a folder with a 21-character random name directly under the system temp folder. The folder holds an `ssr/` transform cache and often a `client/` one, it is anywhere from under 1 MB to about 60 MB, and the run does not remove it.

Over that run 5,417 such folders took 20 GB and filled the machine's fixed disk allowance twice. Each time, builds and tests failed with "no space left on device" or with an ENOENT on a cache file, while `df` showed little used. So `df` did not point at the cause.

The intersection audit adds to it. `npm run check:intersections` needs `dist/` (it stops with "no dist/" without a build) and leaves `test-results/`, which for one 3D game was hundreds of MB of reports and shots.

The builder's brief for that run, [`docs/build/demo-to-game.md`](../../build/demo-to-game.md), does not carry a temp folder line. It lists `npx vitest run games/<key>` "as often as you like" and sends stills, recordings and probe output to the scratch folder, but says nothing about where a test run's temp files go. It should carry the line in Guidance 1 and 2.

## Guidance

1. **Run tests with a temp folder of your own.** Point `TMPDIR` at a folder inside your own scratch folder, so the leftovers land where you can find them:

   ```bash
   TMPDIR=<own scratch folder>/tmp npx vitest run games/<key>
   ```

2. **Delete that folder afterwards.** It is yours, so no one needs to be asked.

3. **Put both lines in every builder's brief.** A builder that is not told will use the shared temp folder, and a wave multiplies that by every builder and every test run.

4. **After an intersection audit, copy the summary out, then delete `dist` and `test-results`.** Both are ignored by version control and both can be made again.

5. **A lead that wants to sweep the shared temp folder for others' leftovers asks the owner first.** The system temp folder is shared scratch, and other work on the machine may have files there. In this run the owner approved the sweep on a card. It removed only folders that met all of these: directly under the temp folder, a 21-character name, a `client` or `ssr` subfolder, and older than an hour.

## Why This Matters

The disk allowance is fixed for the session. It does not grow, and when it is spent every lane fails at once, whichever lane spent it. A builder then reports a build or test failure that has nothing to do with its game.

Deleting still works while writing fails, so the way out of a full disk is to delete, and the cheapest time to delete is right after each run, by the agent that made the files.

## When to Apply

- Every `npx vitest run` by a builder that shares a machine with others, and every brief written for such a builder.
- Right after `npm run check:intersections`, once its summary is copied.
- When a failure reads "no space left on device" or ENOENT on a cache file: look for these folders before looking at the game.

## Examples

A builder's test run, with its own temp folder made first and removed after:

```bash
mkdir -p <own scratch folder>/tmp
TMPDIR=<own scratch folder>/tmp npx vitest run games/<key>
rm -rf <own scratch folder>/tmp
```

After an audit, in the worktree where it ran:

```bash
npm run check:intersections -- <key>
# copy the summary to the scratch folder, then:
rm -rf dist test-results
```

## Related

- [`fan-out-parallel-agents-in-worktrees-from-an-explicit-base-sha.md`](fan-out-parallel-agents-in-worktrees-from-an-explicit-base-sha.md): the other things a brief must set for a builder in a fan-out and never leave to the machine.
- [`run-the-intersection-audit-before-showing-the-owner.md`](run-the-intersection-audit-before-showing-the-owner.md): the audit whose `dist` and `test-results` are deleted here.
- [`building-a-jam-game.md`](../conventions/building-a-jam-game.md): "Building several games at once", where each local builder gets a private scratch folder.
- [`docs/build/demo-to-game.md`](../../build/demo-to-game.md): the builder's brief that should carry the temp folder line.

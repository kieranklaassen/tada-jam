---
title: Push branches and let the owner open PRs, run CI on every push, and keep secrets out of the repo when an agent delivers a jam game
date: 2026-09-22
last_updated: 2026-09-23
category: workflow-issues
module: agent-delivery
problem_type: workflow_issue
component: development_workflow
severity: high
related_components:
  - tooling
  - documentation
applies_when:
  - An agent is ready to deliver a tada-jam branch and needs a pull request opened or its description edited
  - The agent's PR tool is bound to a different repository or gh is read-only
  - Checking CI status on a branch that has no pull request yet
  - A tool such as compound-cli needs an API key the owner already keeps in another project's env file
  - Scripting shell commands in the agent environment, especially zsh, or reading a file right after writing it
symptoms:
  - ManagePullRequest on the Mac mini was bound to the thinkroom repo, so it could not create or edit tada-jam PRs
  - CI ran only on main and on pull requests, so a pushed feature branch showed no status until the owner opened PR 1
  - compound-cli needed TYPESAFE_API_KEY, which lived only in the owner's baby-agent env file
  - A freshly written file was sometimes not visible to the next tool call for a few seconds
  - A command stored in a zsh variable ran as one word instead of being split into arguments
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [agent-delivery, pull-requests, ci, github-actions, secrets, compound-cli, zsh, file-sync-lag]
---

# Push branches and let the owner open PRs, run CI on every push, and keep secrets out of the repo when an agent delivers a jam game

## Context

Pebble Table was delivered by an agent running on the owner's Mac mini, on the branch `cursor/pebble-table-cceb` (merged in PR #1). Four things about that setup cost time and are easy to get wrong the next time.

- The agent's pull request tool is bound to a different repository (thinkroom), so it cannot create or edit tada-jam PRs. `gh` is authenticated but read-only for the agent.
- Until CI was changed, a pushed branch had no status until someone opened a PR.
- compound-cli needs `TYPESAFE_API_KEY` for `compound find` (see the Documented knowledge section of `AGENTS.md`). The owner said to take the key from baby-agent, which meant searching the owner's files for a secret without leaking it.
- The agent environment has a few quirks: file-sync lag between tool calls, zsh word-splitting rules, and long browser measurements that outlive a single command.

The ten style-showcase games (PRs #2 to #10 and #14) were built on cloud VMs, where `git push` returns 403 and the worker brief routes publishing through the GitHub MCP instead. That route has its own rules, in [delivering from a cloud VM](deliver-from-a-cloud-vm-through-the-github-mcp-when-git-push-is-refused.md); the PR hand-off and secrets rules here apply there too.

## Guidance

### Pull requests: push, keep green, hand off the description

1. Do not try to create or edit a tada-jam PR with the agent's PR tool, and do not work around it with other tools (for example raw API calls or a write-capable token). The binding is to another repository; `gh` is read-only on purpose. The GitHub MCP route on the cloud VMs is not such a workaround: the brief sanctions it there.
2. Push the feature branch with `git push -u origin <branch>` and make sure CI is green on it.
3. Write the PR description to the Project store's `internal/` folder (Pebble Table used `internal/pebble-table-pr-body.md`), not into the repo. Tell the coordinator or owner the path; they open or edit the PR.
4. Follow the quality bar in `AGENTS.md` when writing that description: say how the game meets each line of the bar, with a measured frame rate.
5. When asked for follow-up work on an open PR, stack it on a new branch cut from the PR branch (`git checkout -b cursor/<name>-<suffix> <pr-branch>`) and hand off a description for that branch the same way.

### CI: read status from the branch, not the PR

`.github/workflows/ci.yml` triggers on `push` with `branches: ['**']` plus `pull_request`, so every pushed branch gets a run before any PR exists. Read it with the read-only CLI:

```bash
gh run list --branch <branch> --limit 5
gh run view <run-id> --log-failed
```

The job runs typecheck, vitest, both egress checks, the wordless check, the strict compound docs audit, and the production build. Run `npm run check` locally before pushing so CI is a confirmation, not the first signal.

### Secrets: say where a key lives, never its value

- Never write a key value into the repo, a commit, PR text, logs, tool output, or the Project store. Do not report its length or a prefix either.
- Search by variable name and print file names only, or mask values before they reach the terminal:

```bash
grep -rl 'TYPESAFE_API_KEY' ~/.config 2>/dev/null
grep -h 'TYPESAFE_API_KEY' ~/.config/baby-agent/deploy.env | sed -E 's/=.*/=****/'
```

- Prefer loading from the owner's existing store over copying the value. For compound-cli, `TYPESAFE_API_KEY` stays in `~/.config/baby-agent/deploy.env` (owner-only permissions) and a block in `~/.zshenv` reads that file into the environment. Nothing new holds the value.
- Check presence without printing: `[ -n "$TYPESAFE_API_KEY" ] && echo set || echo missing`.
- Keep CI keyless when possible. The compound step in `ci.yml` runs `audit --strict`, which needs no key (the workflow comment says so), and `.compound-engineering/config.yaml` holds only schema and audit settings, no credentials. If a future step truly needs a key, ask the owner to add a GitHub Actions secret; do not commit one.
- Without the key, fall back to grepping the frontmatter under `docs/solutions/`, as `AGENTS.md` describes.

### Agent environment gotchas

- File-sync lag: a file just written (screenshots especially) may not be visible to the next tool call for a few seconds. Wait and re-read before concluding the write failed. For images, reading through the `/private/tmp/...` path worked when `/tmp/...` lagged.
- zsh does not word-split an unquoted variable, so `R="npx playwright test"; $R` tries to run a command literally named `npx playwright test`. Use a function instead: `r() { npx playwright test "$@"; }`.
- Long browser measurements (fps sampling, perf profiles, a preview server) belong in a named tmux session or a committed script such as `scripts/pebble-perf.mjs` (`npm run perf:pebble`), not an ad hoc one-shot command that can time out and lose its output. Keep the dev server and the production preview in separate sessions.

## Why This Matters

- Working around the PR tool binding with other credentials would act on a repository the agent was not authorized to change. Handing off a ready description keeps the owner in control and costs one paste.
- Branch-level CI means "green" is checkable at push time. Without it, broken work sits invisible until a PR is opened, often by someone else.
- A secret printed once is in a transcript, a log, or the Project store for good, and those are shared with other agents and people. Masked search and load-in-place remove that risk entirely, and a keyless CI means no repository secret to rotate.
- The environment gotchas each look like real failures (a missing file, a broken command, a hung measurement) and send the agent debugging the wrong thing.

## When to Apply

- Delivering any jam game or follow-up change from the Mac mini agent setup, where the PR tool is not bound to tada-jam.
- Checking whether a pushed branch passes before a PR exists.
- Any task that needs a credential the owner keeps elsewhere, including running `compound find`.
- Running screenshots, fps sampling, or profiles from agent tool calls.

## Examples

Handing off a finished branch:

```bash
npm run check
git push -u origin cursor/pebble-table-cceb
gh run list --branch cursor/pebble-table-cceb --limit 1
# then write the description to <Project store>/internal/pebble-table-pr-body.md
# and tell the coordinator: "branch pushed, CI green, PR body at internal/pebble-table-pr-body.md"
```

Stacking a follow-up on the open PR:

```bash
git checkout -b cursor/pebble-table-motion-<suffix> cursor/pebble-table-cceb
# work, commit, push, check CI, hand off a second description
```

Reporting a key's location in a handoff: "compound-cli reads `TYPESAFE_API_KEY` from `~/.config/baby-agent/deploy.env` via the `~/.zshenv` loader; CI does not need it." No value, no length, no prefix.

## Related

- [`share-a-production-build-not-the-dev-server.md`](share-a-production-build-not-the-dev-server.md): what to share with the owner once a branch is pushed.
- [`deliver-from-a-cloud-vm-through-the-github-mcp-when-git-push-is-refused.md`](deliver-from-a-cloud-vm-through-the-github-mcp-when-git-push-is-refused.md): publishing when `git push` returns 403, in batches through the GitHub MCP.
- [`AGENTS.md`](../../../AGENTS.md): documented knowledge and compound-cli, including the key `compound find` needs.

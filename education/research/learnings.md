## Institutional Learnings Search Results

Repo: `/Users/kieranklaassen/tada-jam/.claude/worktrees/game-prototypes-ideation-253d02`. All learning paths below are relative to it.

### Search Context

- **Feature/Task**: Build an education pack in the jam repo: 1,000+ Markdown records with constrained YAML frontmatter, one per official learning standard (California and the Netherlands; ages 2 to 5, first school years, ages 9 to 12; four subjects), researched by many parallel agents with one lane each, checked a second time by independent agents, with a validator, a generated JSON index, a lookup, a coverage report and a guide. Development-time only, never shipped to children, not part of the published jam.
- **Keywords Used**: parallel agents, fan-out, worktree, base SHA, one writer per file, merge; agent delivery, secrets, key value; age band, childAge, numeral, wordless, standard, Pre-K, grade; generated, frontmatter, compound audit, `applies_when`, validator, index; persona, model guess, measurement; wrong, corrected, claim, stale, verify; lab, published, `dist`.
- **Files Scanned**: 22 (every file under `docs/solutions/`; frontmatter of all 22 read, 9 read in full or in the relevant part). `CONCEPTS.md` read as grounding. No `docs/solutions/patterns/critical-patterns.md` exists.
- **Relevant Matches**: 5 strong, 4 adjacent.
- **Grounding note**: `CONCEPTS.md` already carries **Education pack** and **Lane** (uncommitted edit on this branch). Use those names. Its "Avoid" list says not to call the pack a "curriculum" or a "content pack".

### Evidence against a settled decision

None of the five settled decisions is contradicted by a learning. Three constraints shape how they are carried out, and each is checked against the code as it stands today:

1. **"In this repo" cannot mean `docs/solutions/`.** `.compound-engineering/config.yaml` makes `applies_when` required (at most 5 items) and the audit strict, and CI runs `compound audit --strict` on every push. A pack record has its own frontmatter and no `applies_when`, so 1,000 records under `docs/solutions/` would fail CI. `CLAUDE.md` states the same rule for the lab ("Specs, reports, and the idea catalog live under `lab/`, not `docs/solutions/`").
2. **"Not part of the published jam" is not automatic under `lab/`.** `CLAUDE.md` says lab output "lands in `lab/dist`, never the published `dist/`". That is stale. `package.json` has `"build": "vite build && npm run lab:publish"`, which builds the lab into `dist/lab/`, and the header of `lab/kit/isolation.test.ts` names that bridge. Anything the lab shell or the jam home page imports is published. A pack placed under `lab/` stays unpublished only while nothing in either bundle imports it.
3. **Source links would fail the egress scan if they reach a bundle or a scanned folder.** `scripts/egress-check.ts` flags any external `http(s)` host in `games/`, `harness/`, `showcases/`, and, with `--built`, in every file under `dist/`. Every pack record carries a source URL (plan R6). So the pack and its JSON index must sit outside those three folders and outside every build input. A test that asserts this (in the style of `lab/kit/isolation.test.ts`) would hold the plan's R15.

One scale point, not a blocker: the cloud-VM route through the GitHub MCP tops out at about 150 KB of changed files per branch (learning 6 below). A 1,000-record pack is far larger, so the fan-out has to run where `git push` works, or hand off bundles.

### Relevant Learnings

#### 1. When fanning parallel agents out into git worktrees, give every agent an explicit base SHA and make it verify or reset to it

- **File**: `docs/solutions/workflow-issues/fan-out-parallel-agents-in-worktrees-from-an-explicit-base-sha.md` (2026-09-23)
- **Module**: parallel-agents
- **Problem Type**: `workflow_issue`
- **Severity**: medium
- **Relevance**: This is the direct precedent. The lab fanned 30 prototypes and 8 idea shards out to dozens of agents and merged thirty branches one by one. The pack's lane researchers and second-check agents are the same shape.
- **Key Insight**:
  - The harness cuts each isolated worktree from `main`, not from the feature branch. `main` moved during the run and 5 of 30 builders stopped on a refused fast-forward and built nothing. Put a `BASE_SHA` in every brief. First command: `git merge --ff-only <BASE_SHA>`, and if refused, `git reset --hard <BASE_SHA>` (safe, the worktree is fresh). Then require `git rev-parse HEAD` to equal it and `git status --short` to be clean, or stop and report.
  - An agent that stops before writing loses its worktree and branch. For anything that may be resumed, the lead creates the worktree (`git worktree add -b <branch> <path> <BASE_SHA>`, plus a `node_modules` symlink).
  - **One writer per file.** "Shards of idea files, one folder per prototype, one report file per engine: with disjoint ownership the sequential `git merge <branch>` of thirty branches had no conflicts. Anything shared (a package script, an index that imports every shard) is written by the lead once, before the fan-out or after the merges."
  - Count units delivered against units asked for. "Five of thirty is easy to miss if the lead only counts what came back." A fast-forwarded branch is not progress.
  - For generated output, prove sameness by fingerprint: re-run and require byte-identical committed reports.

#### 2. Push branches and let the owner open PRs, run CI on every push, and keep secrets out of the repo

- **File**: `docs/solutions/workflow-issues/agent-delivery-push-branches-and-keep-secrets-out.md` (2026-09-22, updated 2026-09-23)
- **Module**: agent-delivery
- **Problem Type**: `workflow_issue`
- **Severity**: high
- **Relevance**: Governs how the pack branch is delivered, and what a research agent may do if a source needs a login or an API key.
- **Key Insight**:
  - Push the branch, get CI green on the pushed head, write the PR body to the Project store's `internal/` folder, and let the coordinator open the PR. Do not work around a tool binding with another token or raw API calls.
  - "Never write a key value into the repo, a commit, PR text, logs, tool output, or the Project store. Do not report its length or a prefix either." Say where a key lives, never its value. Keep CI keyless: the compound audit step needs no key.
  - CI's `check` job runs typecheck, vitest, both egress checks, the wordless check, the strict compound audit and the production build. The root `tsconfig.json` includes `scripts` and `test`, so a validator placed there joins `npm run check`; one placed under `lab/` joins `lab:check` instead and is not run by the root checks.
  - Environment gotchas that bite a 1,000-file write: a file just written may not be visible to the next tool call for a few seconds, and zsh does not word-split an unquoted variable.

#### 3. Every jam game is understandable at the youngest age in its declared age band, through wordless cues alone

- **File**: `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md` (2026-09-22, updated 2026-09-23)
- **Module**: game-design
- **Problem Type**: `convention`
- **Severity**: high
- **Relevance**: This is the one place the jam already holds statements about ages and school standards, and it sets the rule the pack's design notes (plan R7) must not contradict.
- **Key Insight**:
  - **What the jam already claims about standards, and how thin it is.** The age-band cue table says "recognizing numerals 0–10 is a US Pre-K expectation" and "Texas 2022 orders concrete, then pictorial, then abstract", with subitizing ages from Clements & Sarama. All of it is quoted from an ideation doc that lives outside the repo (Project store, `docs/ideation-math-game-4yo.md`). None names a California or Dutch source, and one is a Texas standard. These are secondary claims; the pack should not seed records from them, and its second check could confirm or correct them.
  - **The table labels its own provenance.** A "Basis" column "separates what the cited research supports from defaults chosen by the owner or the agent". The 7+ row says "Mostly owner/agent default", and "Rows below 3 are not covered ... no research in the doc speaks to 2-year-olds". The pack's ages 2 to 5 and 9 to 12 are exactly the bands with the least behind them. The Basis column is the house precedent for plan R13 (official wording, reviewed gloss, pack inference kept apart).
  - **Standards ask for numerals and reading; the kid side forbids them by default.** No words or numerals on the kid side, enforced by `npm run wordless:check` (which scans `games/**` only, so the pack is not scanned). A kid-side numeral needs a `wordless-ok: <reason>` comment and must be optional, reached for, never required. Spoken number words fall under Δ3. Design notes should say what a standard looks like "in a child's hands" without prescribing a digit or a word on screen, or the later games will be designed into a failing check.
  - **Age is a dial, never a gate.** `ctx.childAge` sets defaults and may be `null`; every child reaches everything. A record's level or age is a hint for a designer, not a content gate.
  - **Band limits.** `test/games.test.ts` holds `ageBand` to whole years, 2 to 12, at most five wide. Each of the pack's three ranges fits one band; a game spanning two ranges does not.
  - **A cautionary example of a claimed alignment.** Tada's `math-meadow` declared `ageBand [4,10]` with an "age 4-5" path where "every answer ... is a digit to read". It named an audience and did not serve it. That is the failure the plan's problem frame describes ("games built now would claim an alignment nobody could check").

#### 4. A perf probe that compares builds must drive every build by the same input, and must check that each build did the work

- **File**: `docs/solutions/workflow-issues/drive-a-build-comparison-perf-probe-by-layout-screen-positions-not-object-names.md` (2026-09-25)
- **Module**: performance
- **Problem Type**: `workflow_issue`
- **Severity**: high
- **Relevance**: The clearest record of an agent-written claim that was wrong, reached the coordinator's report, and had to be corrected. Different domain, same failure the pack's second check exists to catch.
- **Key Insight**:
  - The probe found its targets by name; `main` had no such names, "so the probe pressed nothing and measured an idle table". The wrong column "had already gone into the coordinator's report when the mistake was found", and "nothing in its output showed that `main` had been idle". A run that did nothing looked like a good result.
  - **Check that the work happened before reading the result.** The fix added a sanity count read "for every build before reading any fps". For the pack: a lane that returns no records, or a checker that returns "confirmed" without fetching the source, must be visible. Have each record carry evidence that the source was read (a locator, a retrieval date, a quoted span), and have the validator fail a "confirmed" record without it.
  - **Give both passes the same input from what they share.** The second check should work from the official source and the record's locator, not from the first agent's summary of the source.
  - "Publish the correction before anyone decides on the wrong numbers ... correct it where it was reported, say which numbers were wrong and why." This matches plan R12: mark unconfirmed with the reason; neither drop nor keep as confirmed.

#### 5. Run the intersection audit on moments that reach every state, allow only reasoned and capped contacts, and enforce it in CI

- **File**: `docs/solutions/workflow-issues/run-the-intersection-audit-before-showing-the-owner.md` (2026-09-24)
- **Module**: intersection-audit
- **Problem Type**: `workflow_issue`
- **Severity**: high
- **Relevance**: The jam's worked case of a validator whose green result was read as proof. It bears on the pack's validator and coverage report.
- **Key Insight**:
  - "A pass proves only what its script reached. A clean run on moments that never reach the fault ... reads exactly like a real pass." Moon Phases' audit was clean on `main` while a sweep of 2,880 states found the fault in 1,899. For the pack: a validator that passes proves the frontmatter is well formed, not that the wording is right or that the lane is complete. Completeness (plan R4) needs an expected count per lane taken from the source's own table of contents, which the coverage report compares against.
  - An ignore list hid real faults (a whole group ignored "as see-through" also held two solid rings). Every exception carries a written reason and a cap. For the pack: an "unconfirmed" or "summary only" status needs its reason on the record, and a blanket exemption for a whole lane hides errors.
  - A result that differs from run to run fails CI at random. The generated JSON index and coverage report must be deterministic (sorted keys, no timestamps), or a CI freshness check will flake.
  - **A corrected claim, in this file's own history.** Commit `71f57e3` is titled "correct 1128ffa's claim about Critter Clay": an earlier commit message credited a change with an effect it did not have, and an instrumented build disproved it. The correction was written into the learning with the evidence.

#### Adjacent, with caveats

- **6. `docs/solutions/workflow-issues/deliver-from-a-cloud-vm-through-the-github-mcp-when-git-push-is-refused.md`** (`workflow_issue`, medium). Applies only if agents run on cloud VMs. Two points carry over anyway. "A whole-file write is not a patch": a shared file written from a stale copy "drops rows other games added, and nothing complains", which is the risk for a hand-edited index, a coverage table or `CONCEPTS.md`. And CI is judged on the final pushed head, by comparing trees.
- **7. `docs/solutions/build-errors/jam-perf-global-declaration-must-match-in-every-game.md`** (`build_error`, medium). "A branch that passes alone can still break `main`", and CI never ran on the merged tree. For the pack: per-lane validation is not enough. Run the validator on the merged tree, where duplicate identifiers across lanes and schema drift between agents first show. The root cause there was a shape "specified only in prose" that each agent re-typed; give every lane agent the record schema as a file and a validator to run, not a description.
- **8. `docs/solutions/conventions/building-a-jam-game.md`** (`convention`, high). Step 12: one learning per `ce-compound` run, new terms go to `CONCEPTS.md`, then `compound audit --strict`. Its opening records the owner's choice of compounded knowledge over a repo skill because "a skill is a frozen copy that drifts". The pack's guide (plan R18) should link to records and the lookup, not restate them.
- **9. `docs/solutions/conventions/distinct-visual-style-per-game-shared-quality-bar.md`** (`convention`). "The first art-direction doc ... made a wrong generalization" (one game's look written up as the jam's), and the owner corrected it. The parallel risk is plan R14: an agent generalizing a California standard into a Dutch lane, or the reverse.

#### Outside the search root, named by the caller

The lab's lesson about model guesses versus measurements is not in `docs/solutions/` (lab knowledge lives under `lab/` by rule). It is in `CONCEPTS.md` (Child persona: "Personas are model guesses at children, so real children still test the last few finalists"), `lab/README.md` and `lab/reports/INSTRUMENT.md`. Three practices there fit the pack:

- State the kind of evidence at the top of the artifact. `INSTRUMENT.md` opens with "The panel numbers are model guesses at children, not measurements". The pack's design notes are the same kind of thing and should say so in the record and the guide.
- Freeze the pass criteria before scoring. Thresholds "were chosen against the five fixtures ... then frozen before any real prototype was scored", and "nothing is retuned to make more pass". Fix what "confirmed" means, with a few fixture records of known status, before the second check runs.
- An independent skeptic per builder is already house practice. `lab/reports/BUILDER-NOTES.md` keeps each builder's report and "what the independent skeptic found", in "the builders' own words, kept as written; they are not panel findings". That is a ready model for keeping the researcher's record and the checker's finding as separate, attributed text.

### Recommendations

- **Where the pack lives.** Outside `docs/solutions/` (strict audit), outside `games/`, `harness/` and `showcases/` (egress scan), and outside every Vite build input (the built scan covers all of `dist/`, including `dist/lab/`). Add a small isolation test that fails if anything bundled imports the pack. Correct the stale "never the published `dist/`" line in `CLAUDE.md` when the pack's own section is added there.
- **Fan-out brief.** `BASE_SHA` with the verify-or-reset guard in every brief; one folder per lane with exactly one writer; the lead writes the schema, the validator, the index generator and any shared file before the fan-out, and regenerates the index and coverage report after the merges. No lane agent touches a shared file. Count lanes returned against lanes dispatched.
- **Second check.** Give the checker the source and the locator, not the first agent's reasoning. Require proof that the source was read on every "confirmed" record. Freeze the confirm criteria on fixtures first. Keep researcher text and checker finding separately attributed.
- **Validator and coverage.** Treat a green validator as a format result only. Compare record counts per lane with an expected count from the source's own index. Run the validator on the merged tree. Make generated files deterministic.
- **Design notes.** Label them as the pack's inference (the Basis-column precedent). Do not prescribe on-screen digits or words; note where a standard itself requires a numeral or reading so the later game can plan a `wordless-ok` exception or Δ3 speech. Treat level and age as a hint, never a gate.
- **Existing standards claims.** The Pre-K and Texas statements in the wordless-clarity table are unverified secondary claims with no in-repo source. Do not import them; consider checking them once the pack exists.
- **Delivery.** Run where `git push` works, CI green on the pushed head, PR body to the coordinator, no key value written anywhere. If a source needs credentials, stop and ask the owner.
- **After it lands.** Nothing in `docs/solutions/` yet covers fanning out research (as opposed to code) or verifying agent-written factual claims against web sources. Both are worth a `ce-compound` run each.

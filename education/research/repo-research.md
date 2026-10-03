## Repository Research Summary

Scope: patterns. Repo: tada-jam worktree, branch `feat/education-pack`. All paths are repo-relative unless they name the Tada plan (`tada/docs/plans/2026-08-22-001-feat-tada-education-pack-corpus-plan.md`, a different repo). Nothing in the repo was edited. Two read-only commands were run to confirm claims: `node lab/ideas/render.ts --check` (exit 0, "CATALOG.md is up to date") and `compound audit --strict` (22 files, 22 passing).

### Implementation Patterns

#### Findings that change the plan (read these first)

1. **Every root check is an allowlist, so a new top-level folder is checked by nothing until it is wired in.** Root typecheck, root vitest, the source egress scan, the wordless check and the compound audit each name the folders they look at. `education/` (or `packs/education/`) is in none of them. This is safe (thousands of source URLs trip nothing) and also means the plan must add the wiring itself.
2. **The repo has no YAML parser and no frontmatter parser, and no Ruby.** `package.json:37-63` lists no `yaml`, `js-yaml` or `gray-matter`, and none is in `node_modules`. No file under `scripts/`, `test/`, `harness/` or the lab tooling mentions "frontmatter" or "yaml". Every existing data corpus here is typed TypeScript modules, not Markdown with YAML. The Tada plan's tooling is a Ruby standard-library CLI (Tada plan KTD6, line 164); CI here installs Node 24 and bun only (`.github/workflows/ci.yml:13-16`, `26-28`). So the validator needs either one new devDependency (a lockfile change), or a hand-written parser for a constrained subset (which the Tada plan already asks for: "Parse only the documented YAML subset", line 368). Either way the tooling language is a departure from the Tada plan to write down under R10. It does not block the record format.
3. **"Generated file committed, and a check fails if it is stale" exists as a mechanism but is not enforced anywhere.** `lab/ideas/render.ts` has a `--check` mode, but no npm script, CI step or test runs it against the real `lab/ideas/CATALOG.md`. The pack's index freshness gate (Tada plan R13: "CI fails when it is stale relative to Markdown") would be the first enforced one. Small, but new.
4. **No positive guard keeps a folder out of the published build; the built egress scan is an accidental tripwire.** A top-level folder stays out of `dist/` only because nothing imports it. Games are blocked from importing it (`import-outside-game`), but `harness/` and `showcases/` are not. If pack JSON or Markdown ever reached `dist/`, `npm run egress:built` would fail on every source URL, because it scans `.md` and `.json` and allows only eight hosts. The plan should add its own isolation test, as the lab did.
5. **The repo is public on GitHub** (`gh repo view`: `kieranklaassen/tada-jam`, visibility PUBLIC), under a LICENSE that grants rights over "this software and associated documentation files" (`LICENSE:5-10`). `AGENTS.md:81-83` speaks only to copying code. Nothing in the repo addresses committing third-party text. Verbatim official wording for 1,000+ standards would be published the moment the branch is pushed, so the per-publisher reuse check (jam plan R9, AE3; Tada plan R16, R26) has to finish before records with copied wording are pushed, not after.
6. **Size: the pack would roughly double the repo's file count.** The tree is 1,149 files today; the largest single area is `lab/arcade` at 220 files. There is no `.gitattributes`. Nothing forbids 1,000+ files, and nothing here has been tried at that scale.
7. **A naming clash to settle.** `compound` (the CLI this repo's CI runs) already uses "pack" for something else: `compound packs resolve | list | suggest | add`, `compound audit --packs`, `--pack-dir`, `compound.audit.pack_dirs`. A top-level `packs/` folder would read as Compound Packs. `education/` avoids that. Also, the uncommitted CONCEPTS entry defines **Lane** as jurisdiction + level + subject (`CONCEPTS.md:161-162`), while the jam plan's R1 says "two jurisdictions ... as separate lanes" (`docs/plans/2026-10-01-1954-feat-education-pack-plan.md:53`). The Tada plan uses the CONCEPTS meaning ("four independently grounded lanes", Tada plan line 57). One of the two jam texts needs to change.
8. **Citing a record by URL inside `games/<key>/` fails CI.** The source egress scan runs the URL rule over every `.md` and `.json` under `games/` (`scripts/egress-check.ts:69`, `129-135`). Today no Markdown file under `games/` contains a URL. The guide (R18) must tell designers to cite the pack ID or official code, never the source link, in `games/<key>/ART.md` or any other file under `games/`. `docs/plans/` is not scanned.

#### 1. Where a new top-level area can live and be checked

**Root TypeScript.** `tsconfig.json:19`:

```
"include": ["harness", "games", "showcases", "scripts", "test", "vite.config.ts"]
```

Options at `tsconfig.json:2-18` include `strict`, `noUnusedLocals`, `noUnusedParameters`, `allowImportingTsExtensions`, `types: ["vite/client", "node"]`. It does not set `erasableSyntaxOnly` or `verbatimModuleSyntax`; the lab's does (`lab/tsconfig.json:12-13`). Scripts run by `node` directly need erasable-only syntax, and under the root config the compiler does not enforce that.

**Root vitest.** There is no `vitest.config.*`; the config is in `vite.config.ts:9-12`:

```
include: ['games/**/*.test.{ts,tsx}', 'harness/**/*.test.{ts,tsx}', 'showcases/**/*.test.{ts,tsx}', 'test/**/*.test.ts'],
environment: 'node',
```

**Source egress scan.** `scripts/egress-check.ts:3` "scan games/, harness/ and showcases/ source". `scanTree` walks `games/` (`:128-135`), then `harness/` and `showcases/` with the URL rule only (`:136-141`), and with `--built` also `dist/` (`:142-151`). Text extensions scanned: `.ts .tsx .js .jsx .mjs .css .html .json .svg .md` (`:69`). URL pattern: `(?:https?|wss?):\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*` (`:53`).

**Wordless check.** `scripts/wordless-check.ts:167-175`: `isKidSideFile` returns false unless `parts[0] === 'games'`. `scanGames` reads `join(root, 'games')` only (`:185-190`).

**`npm run check`.** `package.json:35`: `npm run typecheck && npm run test && npm run egress:check && npm run wordless:check`.

**CI.** `.github/workflows/ci.yml` has three jobs:
- `check` (`:9-35`): typecheck, vitest, source egress, wordless, `compound audit --strict` through bun (`:29-31`, "Compound docs audit (docs/solutions frontmatter)"), `npm run build`, `npm run egress:built`.
- `intersections` (`:40-69`): four shards, Playwright, plays each game's production build.
- `lab` (`:73-86`): `npm run lab:check` then `npm run lab:build`. Comment at `:71-72`: "The mechanic prototype lab (lab/) has its own typecheck, tests, and build. It shares nothing with the jam's checks above."

**How `lab/` got its own toolchain.** Decided in `docs/plans/2026-09-23-1534-feat-mechanic-prototype-lab-plan.md:145` (KTD1): "The lab is a top-level `lab/` directory with its own toolchain, and it changes no existing check. The root checks use explicit allowlists (tsconfig `include`, vitest `include`, the `games/*/index.ts` glob, the `games/` and `harness/` scans), so nothing under `lab/` reaches them." Rejected there: "adding exemptions to the existing checks (edits the contract surface) and a folder under `games/` (the registry test demands `index.ts` and a manifest)". Also: "Ideas, specs, and reports stay under `lab/`, because `compound audit --strict` requires frontmatter on `docs/solutions/`."
- `lab/tsconfig.json:18-19`: `"include": ["./**/*.ts"]`, `"exclude": ["dist", "node_modules"]`.
- `lab/vitest.config.ts:5-9`: `root: import.meta.dirname`, `include: ['**/*.test.ts']`; comment `:3-4` "The root config lists explicit include globs (games, harness, test), so nothing under lab/ reaches `npm test`."
- Scripts `package.json:24-34` (`lab:typecheck` = `tsc --noEmit -p lab/tsconfig.json`, `lab:test` = `vitest run --config lab/vitest.config.ts`, `lab:check` = both).
- `lab/kit/isolation.test.ts` holds the boundary: root tsconfig and root `vite.config.ts` must not mention `lab` (`:66-77`); no file under `lab/` imports from `games/` or `harness/` (`:80-84`); "nothing under games/, harness/, scripts/, or test/ imports from lab/" (`:86-90`); a self-test that the detector catches a crossing import (`:92-112`); the lab's Vite output resolves under `lab/` (`:116-121`); and the package scripts point at the lab configs (`:123-138`).
- Documented in `AGENTS.md:68-79` and `lab/README.md`.

**Which checks a new folder falls under.**

| Check | `education/` or `packs/education/` (new top-level) | Under `lab/` | Tooling in `scripts/`, tests in `test/`, data top-level |
|---|---|---|---|
| Root `tsc` (`tsconfig.json:19`) | ignored | ignored | tooling checked; data folder ignored |
| Root vitest (`vite.config.ts:10`) | ignored | ignored | tests run |
| Source egress scan | ignored | ignored | ignored (the scan walks `games/`, `harness/`, `showcases/`; `scripts/` and `test/` are not walked) |
| Wordless check | ignored | ignored | ignored |
| Compound audit (`docs/solutions/` only) | ignored | ignored | ignored |
| Lab typecheck and tests (`lab/tsconfig.json:18`, `lab/vitest.config.ts:8`) | ignored | covered with no config change | ignored |
| Lab isolation test | untouched (it only looks for the word `lab`) | bound by it | tooling in `scripts/` or `test/` may not import from `lab/` (`:86-90`) |
| `vite build` of the jam | not bundled unless imported | not bundled unless a lab entry imports it | not bundled |
| `lab:publish` into `dist/lab` | not bundled | at risk: any lab shell import or lab Vite plugin could emit it | not bundled |
| Built egress scan of `dist/` | only if it leaks into `dist/` | only if it leaks | only if it leaks |

Three ways to get the pack checked, each with a precedent:
- **Its own island, as the lab did**: own `tsconfig.json`, own vitest config, `edu:*` scripts, one new CI job, its own isolation test. Changes no existing check (lab plan KTD1). Costs a second config set.
- **`scripts/` plus `test/`**, as the egress and wordless checks do (`scripts/egress-check.ts` with `test/egress.test.ts`; `scripts/wordless-check.ts` with `test/wordless.test.ts`). No config edits; the tooling joins `npm run check` and the existing `check` job. The data folder stays top-level and the tooling reads it by path.
- **Add the folder to the two root include lists.** No precedent; the lab plan chose not to touch root configs (`lab plan:171`, "neither root `tsconfig.json` nor root `vite.config.ts`, changes").

Putting the pack under `lab/` needs no wiring at all, but `AGENTS.md:70` defines `lab/` as "throwaway mechanic prototypes ... exempt from every rule above", and the lab is the one area that is published beside the jam (`AGENTS.md:78`). That is the wrong home for a corpus that must never ship.

#### 2. Node scripts written in TypeScript and run directly

Node runs the `.ts` files with no build step: `package.json:7-9` requires `node >=24`, CI uses Node 24 (`ci.yml:15`), and scripts are wired as `node <path>.ts` (`package.json:16-18`, `31-33`). Arguments pass after `--` (`README.md:44`, `lab/README.md:40`).

Shared shape across `scripts/egress-check.ts`, `scripts/wordless-check.ts`, `lab/ideas/render.ts`, `lab/panel/run.ts`, `lab/panel/report.ts`:

- **A header comment that is the usage text.** `scripts/egress-check.ts:1-12`, `lab/ideas/render.ts:1-9`, `lab/panel/report.ts:1-20`.
- **A pure exported core and a thin CLI at the bottom.** "The scanner core is exported so test/egress.test.ts can prove it flags what it claims to flag" (`scripts/egress-check.ts:11-12`).
- **Three is-main idioms are in use**: `resolve(process.argv[1]) === fileURLToPath(import.meta.url)` (`scripts/egress-check.ts:155`, `scripts/wordless-check.ts:192`), `import.meta.main` (`lab/ideas/render.ts:194`), `process.argv[1] === import.meta.filename` (`lab/panel/report.ts:181`, `lab/panel/run.ts:325`). Root scripts use the first.
- **Findings are data with a stable rule name, and validators never throw.** `Finding = { file, line, rule, match }` (`scripts/egress-check.ts:18`); `Problem { rule; id?; message }` (`lab/ideas/validate.ts:12-18`); "given the joined records it returns a list of problems and never throws, the way `validateManifest` does in harness/contract.ts" (`lab/ideas/validate.ts:1-4`). Rule names are short kebab-case strings such as `join-duplicate-id` (`lab/ideas/catalog.ts:34`). CLI output is one line per finding, `file:line  rule  match`, then exit 1 (`scripts/egress-check.ts:159-163`).
- **A CLI as a pure function with injected inputs**, so tests drive it in a temp folder: `runCatalogCli(argv, { target, load })` returns `{ exitCode, out, err }` (`lab/ideas/render.ts:157-192`); unknown arguments exit 2 with a usage line (`:170-173`). Tests: `lab/ideas/render.test.ts:249-325`.
- **Deterministic output.** "The output is a pure function of the records (sorted by id, no dates), so running the script twice changes nothing and `--check` proves it" (`lab/ideas/render.ts:8-9`). Sort by code-unit order, "the same on every machine, unlike localeCompare" (`:27-30`). JSON through `stableStringify` with sorted keys and a trailing newline (`lab/panel/run.ts:30-47`). One newline at the end and no trailing spaces is tested (`lab/ideas/render.test.ts:208`).
- **All-or-nothing writes.** "Reads everything, checks everything, and only then writes. Any problem means nothing is written" (`lab/panel/report.ts:114-118`).
- **Folder discovery by `readdirSync`, sorted**, because Node has no `import.meta.glob` (`lab/panel/load.ts:24-38`; lab plan `:345`).
- **Import style.** Explicit `.ts` extensions and `import type` (`lab/README.md:56`; `test/egress.test.ts:4`).

Test conventions:
- Unit tests of the core, then one test on the real tree: `it('passes on this repository', ...)` (`test/egress.test.ts:53-55`); `describe('the real catalog', ...)` with "joins and validates with no problems" (`lab/ideas/real-catalog.test.ts:17-20`).
- Validator tests mutate one compact valid in-memory catalog (`lab/ideas/validate.test.ts:9-18`). The Tada plan's "one-fault-per-fixture" rule (Tada plan line 342) fits this.
- Negative tree tests build a temp folder (`test/showcases.test.ts:45-50`).
- Real-data tests pin the expected shape and counts (`lab/ideas/real-catalog.test.ts:22-27`, `:43-49`).

**The data-plus-validator pattern in `lab/ideas/`.**
- Data is typed TypeScript split by writer: "Parallel writers each own one file, so the record is split by writer and joined by catalog.ts: drafts (ideators), critiques (critics), decisions (the selector ...)" (`lab/ideas/types.ts:1-3`). Eight shards of 14 ideas in `lab/ideas/shards/<engine>.ts`, eight critique files in `lab/ideas/critiques/<engine>.ts`, one `decisions.ts`.
- IDs are prefixed per shard so parallel writers cannot collide (`lab/ideas/types.ts:12`; lab plan `:155`, "each file has exactly one writer").
- The second pass was independent by construction: "eight critics, each critiquing the next engine's shard in the list so no ideator judges its own work" (lab plan `:155`), written to separate files.
- `lab/ideas/catalog.ts` joins the files and reports what does not line up without throwing (`:7-8`): duplicate IDs (`:29-37`), a draft with no critique or decision (`:54-57`), an orphan critique or decision (`:58-63`). `loadCatalog()` returns join problems then validator problems (`:75-78`).
- `lab/ideas/validate.ts` holds the rules as named constants (`:27-49`) and returns `Problem[]` (`:67-82`).
- `lab/ideas/render.ts` renders `CATALOG.md` with a summary of counts first (`:70-111`), then a Problems section (`:113-121`), then the records.

This maps directly onto R12 (a second check by a pass that did not write the record): records in one file per writer, check receipts in separate files written by the checker, a join that reports any record with no receipt and any receipt with no record. The Tada format instead keeps the review receipt inside the record's frontmatter (`reviewed_by`, `reviewed_on`, `reviewed_version`, `reviewed_sha256`; Tada plan line 236). Those two shapes conflict on "one writer per file"; the plan has to pick. Note also that Tada's `authority: reviewed` means a registered human educational reviewer (Tada plan R18, line 67), which an agent's second check is not, so the "confirmed / unconfirmed" state in R12 needs its own field rather than reusing `authority`.

**`lab/arcade/catalog.ts` and `lab/arcade/registry.test.ts`.** "Pure data: no DOM, no imports. registry.test.ts checks that every prototype folder appears here exactly once" (`lab/arcade/catalog.ts:6-7`). The test checks that the catalog and the folders agree in both directions and have no duplicates (`lab/arcade/registry.test.ts:71-77`), that each entry's required fields are non-blank strings (`:37-51`), kebab-case keys (`:14`, `:61-63`), and that prototype source contains no `https?://` and no network or storage API (`:94-98`).

#### 3. Generated artifacts

Committed generated files today:
- `lab/ideas/CATALOG.md` (70 KB, 1,218 lines for 112 ideas), with the header `<!-- Generated by \`npm run lab:catalog\` from lab/ideas. Do not edit by hand. -->` (`lab/ideas/render.ts:130`, `lab/ideas/CATALOG.md:3`).
- `lab/reports/<key>.json` (30 files, 32 to 61 KB each), written by `npm run lab:panel`: "Same seed, same bytes: no timestamps, sorted keys, stable ordering" (`lab/panel/run.ts:1-5`).
- `lab/reports/SHORTLIST.md`, `HOOKS.md`, `INSTRUMENT.md` and the findings block in each `lab/protos/<key>/SPEC.md`, written by `npm run lab:report` (`lab/panel/report.ts:1-13`).
- One generated file is not committed: `arcade/catalog.json` is emitted into the build by a Vite plugin (`lab/vite.config.ts:94-124`).

Is "a test fails if the committed file is stale" an existing pattern? **Partly.**
- The mechanism exists: `node lab/ideas/render.ts --check` "write nothing; exit 1 if the file differs from what the data renders to" (`lab/ideas/render.ts:5-6`, `183-187`).
- It is not enforced. `lab:catalog` is wired without `--check` (`package.json:31`). CI's lab job runs only `lab:check` and `lab:build` (`ci.yml:83-86`). `lab/ideas/render.test.ts:249-325` exercises `--check` in temp folders only; no test reads the real `CATALOG.md`. The lab plan lists it as a manual gate: "`npm run lab:catalog` (no diff after running)" (lab plan `:422`, `:504`).
- For the reports, `lab/panel/report.test.ts:993-1035` regenerates three reports into a temp folder and checks a second run changes nothing; it never compares against the committed `lab/reports/`.
- Deliberate split of duties worth copying: "Problems do not fail either mode: the tests own validity, this owns drift" (`lab/ideas/render.ts:180`).

For the pack: a committed `corpus-index.json` with an `index --check` gate is consistent with what is here, but the gate has to be wired (a root test that renders in memory and compares with the committed file, or a CI step). The index must hold no generation time; the retrieval date in each record is data and is fine.

#### 4. The published build

`package.json:12`: `"build": "vite build && npm run lab:publish"`.
- **`vite build`** has the repo root as Vite root and one entry: `index.html:14` loads `/harness/main.tsx`. The harness finds games and showcases by glob: `harness/games.ts:5` (`'../games/*/index.ts'`) and `:13` (`'../showcases/*/index.ts'`). `public/` (only `public/alien-frontier/`) is copied as is. Nothing else reaches `dist/`.
- **`lab:publish`** (`package.json:29`) builds the lab's two HTML entries into `dist/lab` (`lab/vite.config.ts:139-148`), plus the emitted `arcade/catalog.json`.
- **Deploy** serves `dist` only (`vercel.json:5-6`). There is no `.vercelignore`.

What keeps a new folder out:
- Not being imported. For games this is enforced: a relative import that leaves the game folder is `import-outside-game` (`scripts/egress-check.ts:101-106`). For `harness/` and `showcases/` it is not enforced; they get the URL rule only (`:136-141`).
- Not being under `public/` or `lab/`.
- The anti-pattern is in the repo already: the harness reads a JSON file the lab build writes (`harness/demos.ts:8`, `DEMO_CATALOG_URL = 'lab/arcade/catalog.json'`; `lab/kit/isolation.test.ts:3-6` calls it "the one bridge"). The pack must not get a bridge like it (jam plan R15).

What the built scan flags: every `http(s)://` or `ws(s)://` host in any text file under `dist/` (including `.md` and `.json`) that is not a local host, `www.w3.org`, or one of eight `BUILT_BENIGN_HOSTS` (`scripts/egress-check.ts:20-32`, `:147-150`). Protocol-relative `src|href|url` values are flagged too (`:54`, `:83-85`).

Would thousands of source URLs in Markdown under a new top-level folder trip an existing check? **No.** The source scan does not walk the folder and the built scan only sees `dist/`. They would trip a check in three cases: the folder is placed under `games/`, `harness/` or `showcases/` (every URL is a finding); pack content leaks into `dist/` (every URL is a finding, which is useful); or a game's own files under `games/<key>/` quote a source link (finding 8 above).

There is no test today that says "nothing in `dist/` came from folder X". The Tada plan asks for one in its own repo: "Add a dedicated build-boundary check so application/frontend imports from `plugins/tada-education` fail without overloading the existing egress scanner" (Tada plan line 483). `lab/kit/isolation.test.ts` is the local template: assert that no file under `games/`, `harness/`, `showcases/` or `lab/` imports from the pack folder, that the pack's tooling imports from none of them, and that neither Vite config names the folder.

#### 5. How docs are organised and audited

- **`docs/solutions/<category>/*.md`**: 22 files in eight categories (`build-errors`, `conventions`, `design-patterns`, `performance-issues`, `test-failures`, `tooling-decisions`, `ui-bugs`, `workflow-issues`). Frontmatter fields seen: `title`, `date`, `last_updated`, `category`, `module`, `problem_type`, `component`, `severity`, `related_components`, `applies_when`, `symptoms`, `root_cause`, `resolution_type`, `tags` (`docs/solutions/build-errors/jam-perf-global-declaration-must-match-in-every-game.md:1-23`).
- **The audit**: CI runs `compound audit --strict` pinned to a commit (`ci.yml:29-31`). Repo config `.compound-engineering/config.yaml:4-11` makes `applies_when` required with at most 5 items and turns strict on. The CLI "Checks every file under <root>/solutions/" (`compound audit --help`). Pack records carry a different frontmatter schema and would fail there, so they cannot live under `docs/solutions/`. The lab set the precedent: "Specs, reports, and the idea catalog live under `lab/`, not `docs/solutions/` (the compound audit needs frontmatter there)" (`AGENTS.md:75`).
- **`docs/plans/`**: 12 plans, named `YYYY-MM-DD[-HHMM]-<type>-<topic>-plan.md`, with `ce-unified-plan/v1` frontmatter (`docs/plans/2026-09-23-1534-feat-mechanic-prototype-lab-plan.md:1-9`). Not audited and not scanned for URLs.
- **`CONCEPTS.md`**: a glossary ("Glossary only, not a spec or catch-all", `CONCEPTS.md:3`), each entry a `###` heading, a definition, and an optional `*Avoid:*` line. The two new entries are uncommitted and sit under `## Mechanics`:
  - `CONCEPTS.md:157-159` **Education pack**: "The reference corpus of official learning standards that game designers read while planning a game: one record per standard, per Lane, with its official wording, source and status, plus design notes kept apart from that wording. It is used only while designing and building; no game reads it while it runs and no child sees it." Avoid: "curriculum", "content pack".
  - `CONCEPTS.md:161-162` **Lane**: "One jurisdiction's standards for one level and subject inside the Education pack, for example California grade 4 mathematics or Netherlands groep 7 rekenen. Lanes stand alone: a record in one lane is never stated to equal a record in another."
- **Area docs live with the area**: `lab/README.md` (what is here, scripts table, how to add one), `lab/arcade/BUILD.md`, and a section in `AGENTS.md:68-79`. The pack's short guide (R18) fits as the pack folder's own README, with a matching section in `AGENTS.md` and a pointer from `docs/solutions/conventions/building-a-jam-game.md` if designers are meant to find it through `compound find`. A guide placed under `docs/solutions/` must carry the audited frontmatter.
- The Tada plan's own layout, for lift-ability (Tada plan lines 329-336, 363, 391, 421): `corpus/<jurisdiction>/<level>/<subject>/*.md`, `corpus/sources/`, `generated/corpus-index.json`, `docs/corpus.md`, `docs/coverage.md`, `schema/`. Mirroring those relative paths under the pack folder keeps the later move a copy.

#### 6. Size and repo hygiene

Committed tree (`git ls-tree -r -l HEAD`): 1,149 files, about 17 MB.

| Area | Bytes | Files |
|---|---:|---:|
| `lab/` | 9,142,254 | 521 |
| `games/` | 5,290,935 | 514 |
| `public/` | 1,369,604 | 14 |
| `docs/` | 637,897 | 35 |
| `lab/arcade/` | 5,568,255 | 220 |
| `lab/reports/` | 1,470,417 | 34 |
| `lab/protos/` | 1,333,135 | 180 |
| `lab/ideas/` | 318,773 | 30 |

- `lab/ideas/shards/*.ts`: eight files of about 9 KB and 190 lines each, 14 records per file. Records are grouped many to a file, never one file per record.
- Largest committed text files: `lab/reports/BUILDER-NOTES.md` 172 KB, `games/pebble-table/intersections.test.ts` 95 KB.
- 109 Markdown files in the whole repo today.
- No `.gitattributes` (none in the tree, none tracked). `.gitignore` covers `dist/`, `test-results/`, `.context/`, `.env*`, `lab/arcade/shots/`, `lab/.dist-next/` (`.gitignore:1-15`). `.context/` is an ignored place for downloaded source documents during research; the Tada plan keeps source bytes out of Git entirely (Tada plan R17, line 66) and fails validation on any non-Markdown file in the corpus tree (line 406).
- At one Markdown file per standard, 1,000+ records is roughly five times the file count of the largest area today and about doubles the repo. At 2 to 4 KB per record the bytes (2 to 5 MB) are in line with `games/`.

Licensing of committed content:
- `AGENTS.md:81-83`: "The repo is under the O'Saasy license (same as Tada). Never copy code from Tada's pre-rebuild git history (AGPL). The jam shell in `harness/` is an independent re-implementation of the contract's behavior, not a copy of Tada's shim."
- `AGENTS.md:52` (tech menu): new packages must be "egress-free, bundled, and license-clean (no AGPL/copyleft)". This is about game packages; a devDependency used only by a Node script is not in `ALLOWED_GAME_PACKAGES` and is not scanned, but the lab chose "no new packages" (lab plan `:146`).
- `LICENSE:3-10`: copyright "Tada Computer (Lucas Huizinga & Kieran Klaassen)", permission over "this software and associated documentation files".
- `README.md:96`: "nothing here is copied from Tada's pre-rebuild (AGPL) history."
- Nothing in `AGENTS.md`, `README.md` or `LICENSE` covers third-party text held in the repo. The Tada plan's handling is the only stated position: quote only where reuse permits, otherwise a paraphrase plus a passage hash, "no tool infers permission from public accessibility" (Tada plan R16, line 65); `reuse_status` and `quote_policy` on every source record (line 236); a `LICENSE-STATUS.md` in the pack (line 303); licensing "remain[s] release decisions" (R26, line 81). Because this repo is public, a pack-level licence note stating that official wording belongs to its publishers and is not covered by the root LICENSE is needed before the first push that contains copied wording.

#### Sequencing clues and commands

- Format and validator first, against in-memory fixtures; then a few real records per lane; then the fan-out. The lab did it in that order (lab plan `:387-389`, `:413-415`).
- One writer per file, IDs namespaced per lane, a join that reports mismatches: this is what let eight parallel writers work without collisions (lab plan `:155`). The Tada ID scheme `edu.<jurisdiction>.<level>.<subject>.<kind>.<slug>` already namespaces by lane.
- Commands that exist today: `npm run check`, `npm run lab:check`, `npm run build && npm run egress:built`, `compound audit --strict`. Commands the pack adds would follow the `lab:*` naming (`package.json:24-34`), for example a validate, an index with `--check`, a query, and a coverage report, each `node <path>.ts`.
- Files a wiring change touches: `package.json` (scripts, and `devDependencies` only if a YAML parser is added), `.github/workflows/ci.yml` (one step in `check` or one new job), `AGENTS.md` (a section like `:68-79`), `README.md` (checks list), `CONCEPTS.md` (the two entries, already drafted). The root `tsconfig.json` and `vite.config.ts` change only under the third wiring option.

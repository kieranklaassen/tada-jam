# Mechanic prototype lab

Throwaway game loops, built to find out which ones have **depth on repeat play**: play 5 should differ from play 1 because of how the loop works, not because there is more content. This is phase 2 of the jam (phase 1 was looks, phase 3 will be the factory that polishes winners into cartridges).

Everything here is **exempt from the jam's rules**: no cartridge shape, no wordless or egress checks, and words, scores, wins, and timers are allowed. Graphics are flat shapes on purpose. Nothing under `lab/` imports from `games/` or `harness/`, and the jam's checks do not look inside it.

## Play it

```bash
npm run lab:serve
```

That builds the lab and serves the production build on port **4174** (the jam's `npm run serve:lan` uses 4173, so both can run at once). Open the printed URL and pick a card. Never share the dev server (`npm run lab:dev`) for judging feel.

- `#/play/<key>`: one prototype. Add `?chrome=0` to hide the grown-up strip, `?seed=7` for a different world.
- `?watch=<persona>` (for example `kaia`, `tess`, `arch-3`): a simulated child plays the prototype instead of you. It is the same driver the panel measures with.
- `lab/kit/example/` (the "reference" card) is the template for a new prototype.

## What is here

| Path | What |
|---|---|
| `ideas/` | The idea catalog: 112 written ideas from eight parallel ideators (`shards/`), their critiques (`critiques/`), the selector's decisions (`decisions.ts`), the toy list, and the generated `CATALOG.md`. |
| `protos/<key>/` | The 30 prototypes: `meta.ts` and `sim.ts` (pure, seeded, Node-importable), `view.ts` (canvas, flat shapes), `index.ts`, `sim.test.ts`, and a one-page `SPEC.md`. |
| `kit/` | The sim contract (`sim.ts`), the seeded rng, the canvas and loop helpers, the reference prototype, and the shared contract suite that runs over every prototype. |
| `panel/` | The persona panel: seeded simulated children, self-play, the metrics, the frozen thresholds, and the report generator. |
| `reports/` | Per-prototype panel reports (`<key>.json`), `SHORTLIST.md`, `HOOKS.md`, `INSTRUMENT.md`. |
| `shell/` | The plain TypeScript and DOM app that lists and plays the prototypes. |

## Scripts

| Script | What it does |
|---|---|
| `npm run lab:check` | Typecheck and the whole lab test suite (contract suite, panel, catalog, reports). |
| `npm run lab:build` | Production build into `lab/dist` (never the jam's `dist/`). |
| `npm run lab:serve` | Build, then serve on port 4174. |
| `npm run lab:dev` | Vite dev server on 4174. |
| `npm run lab:panel [-- key ...]` | Run the persona panel and write `reports/<key>.json`. |
| `npm run lab:report` | Regenerate the specs' findings, `SHORTLIST.md`, `HOOKS.md`, and `INSTRUMENT.md` from the panel reports. |
| `npm run lab:catalog` | Regenerate `ideas/CATALOG.md` from the data. |
| `npm run lab:smoke` | Local browser check: every prototype renders and takes a tap in WebKit at iPad size (needs Playwright browsers and a prior `lab:build`). |

## Reading the results

Start with `reports/SHORTLIST.md`. A prototype must first pass the **depth gate** (at least half of its target-panel runs start session 3), and only then is it checked for clarity. Ranks compare prototypes with each other; absolute numbers mean little. If fewer than three prototypes pass, the shortlist says so and adds a near-the-gate list, and nothing is retuned to make more pass.

**The panel is a set of model guesses at children, not measurements.** Kaia (4) is the only documented child; Tess's age is an assumption; every other persona parameter is a default unless `reports/INSTRUMENT.md` says it is backed by research. Thresholds were frozen from five fixtures of known depth (`panel/fixtures/`) before any real prototype was scored. Treat the result as a way to decide what to put in front of real children, not as a verdict.

`reports/HOOKS.md` lists every hook (score, level, timer, win state, unlock) a prototype leaned on and whether removing it changed how often simulated children came back. It is the raw material for deciding whether the jam's rule against engagement mechanics should change; that is a decision for a person.

## Adding a prototype

1. Copy `kit/example/` to `protos/<key>/`, change every `../` import to `../../kit/`, and rewrite the toy. `<key>` is kebab-case and equals `meta.key`.
2. Keep `meta.ts` and `sim.ts` pure: no DOM, no Vite globals, no `Math.random`, `Date.now`, or `performance.now` (use `createRng(config.seed)`), explicit `.ts` import extensions, `import type` for types.
3. `affordances()` rectangles are top-left anchored like canvas `fillRect`; the sim's own hit-test in `pointer()` decides what a touch does.
4. The signature is a short discrete outcome class, never coordinates or counters.
5. Declare each hook by name in `meta.hooks` and honour the `config.hooks` list (an empty list means no hook events).
6. Write `sim.test.ts` so a scripted play reaches the loop's characteristic moment, then run `npm run lab:check`.

# Tada Jam

A jam repo for experimental kids' games that stay compatible with [Tada](https://github.com/kieranklaassen/tada.computer) cartridges. One game per folder under `games/`, a shared thin harness that runs any of them standalone, and CI that keeps every game portable.

## Run it

```bash
npm install
npm run dev
```

Open the printed URL (Vite binds to your LAN too, so an iPad on the same network can open it), pick a game, and play. The strip above the game holds grown-up controls that stand in for the Tada shell:

- **Age** and **Language** set `ctx.childAge` and `ctx.language` (changing them reopens the game, as in Tada).
- **Attended** toggles `ctx.attention.attended`, to check that loops and sound pause.
- **Park / Bring back** simulates put-away: storage flushes and the Mount is hidden but stays mounted.
- **Reset slot** forgets the game's saved state.
- **Hide** removes the strip for full-bleed play; a small dot in the top-right corner brings it back. Start hidden with `?chrome=0`.

**Judging smoothness on an iPad: use a production build.** The dev server serves unbundled modules with React in development mode and HMR, which is slower and not what a child would run. `npm run serve:lan` builds and serves the production bundle on your LAN at port 4173 (open `http://<this-machine's-LAN-IP>:4173/?chrome=0#/play/<key>` on the iPad). Pebble Table has a hidden grown-up overlay for frame rate and quality tier: triple-tap the top-left corner. `npm run perf:pebble` profiles it in Chrome, WebKit, or a software GPU against that server.

Saved state lives in the browser's `localStorage` under `tada-jam:slot:<key>`, with the same 2-second debounce, flush-on-park, flush-on-hide, and 64 KB cap the Tada server enforces. Turning the device to portrait covers the game with a wordless "turn sideways" picture.

## Deploy

The jam is a static Vite site; `vercel.json` holds the build settings. From the repo root:

```bash
vercel          # preview deployment
vercel --prod   # production
```

Routes are hash-based (`#/play/<key>`), so no rewrites are needed.

## Look

Every game looks different, and every game meets the same quality bar. [`docs/art-direction.md`](docs/art-direction.md) holds the bar (alive at idle, motion and sound on every touch, weight and squash, kid-clear, wordless guidance, 60 fps on an iPad, no external assets), the registry of claimed styles (Pebble Table is claymation 3D), and a menu of unclaimed directions.

## Checks

```bash
npm run check   # TypeScript + vitest + egress scan + wordless check
npm run build && npm run egress:built   # CI also scans the built bundle
```

The egress scan (`scripts/egress-check.ts`) fails on any external URL, CDN font, network or browser-storage API, sample player that loads URLs, import from `harness/` or another game, or package outside the Tada tech menu.

The wordless check (`scripts/wordless-check.ts`) parses kid-side game code and fails on words or numerals rendered on screen: JSX text, string children, DOM or canvas text APIs, and text components. Games for pre-readers explain themselves with cues, not text.

## Add a game

[`docs/solutions/conventions/building-a-jam-game.md`](docs/solutions/conventions/building-a-jam-game.md) walks through these steps in order, with the lessons from building Pebble Table.

1. Create `games/<key>/` where `<key>` is a kebab-case slug (it doubles as the Tada storage namespace).
2. `games/<key>/manifest.ts` — export the manifest const (`key`, `name`, `ageBand`, `permissions`, `iconIdentity`). Keep it free of JSX and React imports. `ageBand` names one audience: whole years, 2 to 12, at most five years wide.
3. `games/<key>/<key>.tsx` — export a `Cartridge` (`{ manifest, Mount }`). The Mount receives `{ ctx: CartridgeContext }`. Import contract types from `../types`.
4. `games/<key>/index.ts` — `export const game: JamGame = { cartridge, emoji: '🪨' }`.
5. Put game logic in pure modules with tests next to them (`*.test.ts`). Read saved state through a defensive `deserialize`.
6. Design for the youngest age in `ageBand`: every interaction must be understandable from wordless cues (see the age-band cue table in [`docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`](docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md)).
7. Pick an unclaimed visual style from [`docs/art-direction.md`](docs/art-direction.md), spike it on the game's real scene (screenshot at 1180×820, measure fps at DPR 2), write `games/<key>/ART.md`, and add the game to the claimed-styles registry.
8. `npm run check`, then open a PR. Say how the game meets each line of the quality bar, with the measured frame rate. See `AGENTS.md` for the full rule list.

## Port a game into Tada

The folder is shaped so the port is a copy plus Tada's four registration touchpoints:

1. Copy `games/<key>/` to `app/frontend/cartridges/<key>/` in the Tada repo. Delete `index.ts` (jam-only). The `../types` imports now resolve to `app/frontend/cartridges/types.ts` unchanged.
2. Move the manifest const from `manifest.ts` into `app/frontend/cartridges/manifests.ts` (const plus an `allManifests` entry) and point the game's import at `../manifests`.
3. Add the cartridge object to the `registered` array in `app/frontend/cartridges/registry.ts`.
4. Add the emoji from `index.ts` to `CARTRIDGE_EMOJI` in `app/frontend/kid/apps.ts`.
5. Run `npm run registry:export`, commit `config/cartridge_registry.json`, and run `npm run check` and `bin/rails test`.
6. If the game uses a jam allowance (Δ1–Δ4 in `AGENTS.md`), propose the matching contract change in the Tada PR, or switch to its fallback.
7. Add any new tech-menu dependency to Tada's `package.json` in the same PR.

## Games

| Game | Folder | Ages | What it is |
| --- | --- | --- | --- |
| Pebble Table | `games/pebble-table/` | 3–7 | A claymation table in 3D: a bag of ten clay stones, the Honest Scale, and Fair Feeding with clay guests, where quantity is felt through play. Plan: `docs/plans/2026-09-22-001-feat-pebble-table-plan.md`. |
| Bad Neighbours | `games/bad-neighbours/` | 4–8 | Drop wobbly apartment buildings onto a construction slab and watch the residents live in them. Physics stacking (matter.js) with secured foundations; a fallen building parachutes its resident out and returns to the queue. No score, no lives. |
| Moon Phases | `games/moon-phases/` | 6–10 | A brass orrery on a table in three.js: the sun lamp always lights half the moon, and a round window shows the sky from the child's home on a turning Earth, day or night, with the moon up or set and flipped south of the equator. |

## License

[O'Saasy](LICENSE), matching Tada. The harness is an independent re-implementation of the cartridge contract's behavior; nothing here is copied from Tada's pre-rebuild (AGPL) history.

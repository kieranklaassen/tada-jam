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

Saved state lives in the browser's `localStorage` under `tada-jam:slot:<key>`, with the same 2-second debounce, flush-on-park, flush-on-hide, and 64 KB cap the Tada server enforces. Turning the device to portrait covers the game with a wordless "turn sideways" picture.

## Checks

```bash
npm run check   # TypeScript + vitest + egress scan of games/ and harness/
npm run build && npm run egress:built   # CI also scans the built bundle
```

The egress scan (`scripts/egress-check.ts`) fails on any external URL, CDN font, network or browser-storage API, sample player that loads URLs, import from `harness/` or another game, or package outside the Tada tech menu.

## Add a game

1. Create `games/<key>/` where `<key>` is a kebab-case slug (it doubles as the Tada storage namespace).
2. `games/<key>/manifest.ts` — export the manifest const (`key`, `name`, `ageBand`, `permissions`, `iconIdentity`). Keep it free of JSX and React imports.
3. `games/<key>/<key>.tsx` — export a `Cartridge` (`{ manifest, Mount }`). The Mount receives `{ ctx: CartridgeContext }`. Import contract types from `../types`.
4. `games/<key>/index.ts` — `export const game: JamGame = { cartridge, emoji: '🪨' }`.
5. Put game logic in pure modules with tests next to them (`*.test.ts`). Read saved state through a defensive `deserialize`.
6. `npm run check`, then open a PR. Say how the game answers the fidelity bar (alive at idle, motion and sound on every touch, its own palette, would a kid screenshot it). See `AGENTS.md` for the full rule list.

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

None yet. Pebble Table is the first one in progress.

## License

[O'Saasy](LICENSE), matching Tada. The harness is an independent re-implementation of the cartridge contract's behavior; nothing here is copied from Tada's pre-rebuild (AGPL) history.

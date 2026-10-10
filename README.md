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

Every game looks different, and every game meets the same quality bar. [`docs/art-direction.md`](docs/art-direction.md) holds the bar (alive at idle, motion and sound on every touch, weight and squash, kid-clear, wordless guidance, 60 fps on an iPad, no external assets), the registry of claimed styles (Pebble Table is claymation 3D), and a menu of looks no game has claimed, kept as a ledger (open, reserved for a named game, or claimed).

## Checks

```bash
npm run check   # TypeScript + vitest + egress scan + wordless check
npm run build && npm run egress:built   # CI also scans the built bundle
npm run build && npm run check:intersections -- <key>   # pieces passing through each other
```

The intersection audit (`scripts/jam-intersections.mjs`, needs `npx playwright install chromium`) plays a game's production build headless on a paused, stepped clock and reads its live three.js scene every 250 ms of game time: two things crossing by more than a few percent of the smaller one, a piece sinking into what it rests on or hidden inside another, a limb or prop swinging through its own body, coplanar faces the depth buffer cannot separate (z-fighting), and anything cut by the camera's near plane. Each game scripts its moments and names its intended contacts in `scripts/intersections/games/<key>.ts`; the report, a close-up of every finding, and a contact sheet land in `test-results/intersections/<key>/`. CI runs it on every game and fails a game marked `enforce: true` on any finding it does not allow.

The egress scan (`scripts/egress-check.ts`) fails on any external URL, CDN font, network or browser-storage API, sample player that loads URLs, import from `harness/` or another game, or package outside the Tada tech menu.

The wordless check (`scripts/wordless-check.ts`) parses kid-side game code and fails on words, letters, numerals or mathematics signs rendered on screen: JSX text, string children, DOM or canvas text APIs, and text components. Games for pre-readers explain themselves with cues, not text. A game whose age band starts at 6 or above may draw numerals and mathematics symbols in its `symbols.ts`, each laid on or beside the quantity it stands for; grown-up text lives in a file named `overlay` or `perf` (in a game made from the template `perf.ts` is frozen, so there it lives in `overlay`).

## Add a game

[`docs/solutions/conventions/building-a-jam-game.md`](docs/solutions/conventions/building-a-jam-game.md) walks through these steps in order, with the lessons from building Pebble Table.

1. Run `npm run new:game -- <key> "<Name>" <youngest>-<oldest> <emoji>`. It copies the template in `templates/cartridge/` into `games/<key>/`, where `<key>` is a kebab-case slug (it doubles as the Tada storage namespace), and fills the manifest and the jam registration (`index.ts`) from what you gave it; `config.ts` is not filled: it reads the band from the manifest. The steps below say what the copy holds.
2. `games/<key>/manifest.ts` — export the manifest const (`key`, `name`, `ageBand`, `permissions`, `iconIdentity`). Keep it free of JSX and React imports. `ageBand` names one audience: whole years, 2 to 12, at most five years wide.
3. `games/<key>/<key>.tsx` — export a `Cartridge` (`{ manifest, Mount }`). The Mount receives `{ ctx: CartridgeContext }`. Import contract types from `../types`.
4. `games/<key>/index.ts` — `export const game: JamGame = { cartridge, emoji: '🪨' }`.
5. Put game logic in pure modules with tests next to them (`*.test.ts`). Read saved state through a defensive `deserialize`.
6. Design for the youngest age in `ageBand`: every interaction must be understandable from wordless cues, and symbols follow the band's first age (see the age-band cue table and the symbol rule in [`docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`](docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md)).
7. Take the first look reserved for the game in the menu in [`docs/art-direction.md`](docs/art-direction.md) (a ledger: the lead reserves rows before a builder starts and marks one claimed after the merge), spike it on the game's real scene (screenshot at 1180×820, measure fps at DPR 2), and move to the next reserved look only if that spike fails on clarity or frame rate or the owner rejects the look. Write `games/<key>/ART.md`, and have the game added to the claimed-styles registry: in a wave of games built at the same time the row is a request to the lead, and a builder working alone adds it.
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
| Felt Meadow | `games/felt-meadow/` | 4–7 | A needle-felted hillside in 3D: drag felt seeds into molehills and watch them bloom, and a felt bee that has visited two colours drops a seed of the mixed colour. The meadow's look follows the real season. Plan: `docs/plans/2026-09-23-felt-meadow-plan.md`. |
| Light Garden | `games/light-garden/` | 7–10 | A light table in a dim room in 3D: place and turn lamps, mirrors, a prism and colour filters to steer beams, and each sleeping sea-glass creature wakes when light of its own colour reaches it. Plan: `docs/plans/2026-09-23-light-garden-plan.md`. |
| Frog Choir | `games/frog-choir/` | 4–8 | A lily pond at dusk in 3D: five frogs sit on pads and each sings when the firefly passes over it. Where a frog sits sets its note, so moving frogs composes a melody. Plan: `games/frog-choir/PLAN.md`. |
| Shadow Lantern | `games/shadow-lantern/` | 6–10 | A cut-paper theatre: slide and turn paper shapes between a lamp and a screen until their shadows fill the outline of a sleeping creature, which wakes and joins the paper night sky. A shape nearer the lamp throws a bigger shadow. Plan: `docs/plans/2026-09-23-shadow-lantern-plan.md`. |
| Bedtime Forest | `games/bedtime-forest/` | 4–6 | A forest clearing at dusk, painted like a picture book in 3D: carry each of six yawning animals to its home, and when all are asleep the moon rises, a lullaby plays, and morning wakes everyone again. Plan: `docs/plans/2026-09-23-bedtime-forest-plan.md`. |
| Turning Tower | `games/turning-tower/` | 7–10 | Small faceted towers at dusk in three.js: turn handles and slide platforms until the paths line up, some of them only from the camera's view, then tap to walk the wanderer to the glowing door. Plan: `docs/plans/2026-09-23-turning-tower-plan.md`. |
| Critter Clay | `games/critter-clay/` | 4–9 | A clay workshop bench in 3D: press legs, eyes, ears, tails and horns onto a sleepy lump of plasticine, tap its nose, and it wakes and walks with a gait that comes from what it was given. Parts pull off again. Plan: `docs/plans/2026-09-23-critter-clay-plan.md`. |
| Hillside Spring | `games/hillside-spring/` | 6–10 | A painted terraced garden in 3D: place and turn bamboo pipes, a sluice gate and a waterwheel so that water from the spring runs downhill to the dry plots, which bloom. Plan: `docs/plans/2026-09-23-hillside-spring-plan.md`. |
| Cosy Scarf | `games/cosy-scarf/` | 5–10 | A knitted snowy hillside in 3D: tap yarn balls to knit stripes on a loom, and when the scarf is long enough it wraps the cold animal, which dances before the next one comes in. Plan: `docs/plans/2026-09-23-cosy-scarf-plan.md`. |
| Kite Tower | `games/kite-tower/` | 5–8 | A playroom of rainbow wood in 3D: stack arches, blocks, half-moons and planks so the peg doll can climb to a kite stuck on a shelf. Towers sway and topple softly, and a kite that is reached moves to a new perch. Plan: `docs/plans/2026-09-23-kite-tower-plan.md`. |
| Bad Neighbours | `games/bad-neighbours/` | 4–8 | Drop wobbly apartment buildings onto a construction slab and watch the residents live in them. Physics stacking (matter.js) with secured foundations; a fallen building parachutes its resident out and returns to the queue. No score, no lives. |
| Moon Phases | `games/moon-phases/` | 6–10 | A brass orrery on a table in three.js: the sun lamp always lights half the moon, and a round window shows the sky from the child's home on a turning Earth, day or night, with the moon up or set and flipped south of the equator. |
| Muddy Truck Wash | `games/muddy-truck-wash/` | 2–4 | A wash bay in three.js: rub the mud off die-cast toy vehicles with a sponge, a hose and a cloth, and send each one out shining. A learning game: its design sheet in `ART.md` names the records it is designed from. |
| Monster Pizza | `games/monster-pizza/` | 4–7 | A pizza counter drawn in felt-tip: a monster holds up a card of toppings, the child taps pieces on until the pizza matches, and the customer tastes what came out. A learning game on counting and comparing small sets. |
| Fix-it Stall | `games/fix-it-stall/` | 9–12 | A repair stall seen from above: an animal brings a gadget that has stopped, and the child clips leads, swaps parts and tests with a lamp until the circuit is whole. A learning game on closed circuits. |
| Monster Hotel | `games/monster-hotel/` | 9–12 | A cut-away hotel in pen and ink: monsters arrive with wants that pull against each other, and the child gives out rooms until the whole house settles. A learning game on conflicts and answers that suit every side. |
| Night Camp | `games/night-camp/` | 9–12 | A camp on a survey map: the child lays in wood, lamp oil and water along a ruler of hours from cards that give an amount for a span of hours, then lets the night run and sees who stays warm. A learning game on rates and amounts for one. |
| Bread Day | `games/bread-day/` | 4–6 | A badger's bakery cut in lino: push and pull the dough, hand it flour, water and seeds, let it rise or stiffen, bake it, and give each customer the bread it is showing it wants. A learning game on how stuff changes and on telling what someone wants. |
| Boo-Boo Vet | `games/boo-boo-vet/` | 3–6 | A small vet's room in glossy stickers: an animal shows what it needs by how it looks and moves, and the child gives it the care thing that helps. A learning game on reading how another feels and what a living thing needs. |
| Chalk Train | `games/chalk-train/` | 2–4 | Chalk on tar: draw a line with a finger and the chalk train rides along it to a rider at a stop and on to the rider's home. A learning game on making marks on purpose. |
| Tea Time | `games/tea-time/` | 4–6 | A tea table in blue-and-white pottery: hold the pot to pour, fill each guest's cup as far as that guest likes it, lay a saucer and a spoon at each place, and wipe up what runs over. A learning game on comparing how much cups hold and on judging enough. |
| Who Made That Sound | `games/who-made-that-sound/` | 2–4 | Eggs on a page of painted tissue: tap one to hear who is inside and tap again to let it out, then find by ear the egg that sounds like the one who is calling. A learning game on noticing and exploring sound. |
| Princess Playground | `games/princess-playground/` | 2–5 | A seesaw in a tray of sand in three.js: tap a painted pebble friend onto the plank, see which end goes down, and find who or how many will lift the one who asks. A learning game on exploring and comparing how heavy things are. |
| Seed Lab | `games/seed-lab/` | 9–12 | A page of a naturalist's journal: carry pollen from one flower to another, watch six young come up alike or unlike, and breed by seed or by runner towards the plant a visitor has sketched. A learning game on what young inherit and what their surroundings change. |
| Balloon Pop Parade | `games/balloon-pop-parade/` | 2–4 | A seaside of inflatable pool toys in 3D: tap a balloon in the sky and it flies down to a friend, who keeps one of its own colour and lets any other go. A learning game on sorting by colour and giving one to each. |
| Bridge Crew | `games/bridge-crew/` | 9–12 | A blueprint sheet with balsa parts lying on it: drag from pin to pin to lay planks, sticks, tubes and thread across a gap, test the bridge with a trolley of weights, and send a loaded vehicle over. A learning game on what makes a crossing stable and sturdy, found by testing and improving. |
| Claw Machine | `games/claw-machine/` | 4–6 | A claw machine built of stud bricks in 3D: move the claw with a finger, let it drop on a toy, and drop the toy into the gobbler that takes its colour, kind or size. Then the same toys are tipped out and sorted another way. A learning game on sorting a set by one attribute and then by another. |
| Fire Truck Hero | `games/fire-truck-hero/` | 2–4 | A sand pit of garden toys in 3D: touch the yard and the fire truck sends water there, to fill a pool, float a duck, turn a wheel, water a plant or put out a fire. A learning game on cause and effect with water. |
| Fruit Slicer | `games/fruit-slicer/` | 9–12 | A market stall drawn as a comic page: cut a fruit by eye to the share on a customer's ticket, bring the piece to the customer's tin, and see the true length open beside it. A learning game on fractions as shares of a length. |
| Hats for All | `games/hats-for-all/` | 2–4 | A foam play mat in 3D: press a foam hat out of its tile and it pops onto a bare head, until every creature has one hat. A learning game on pairing one with one and comparing two small groups. |
| Wild Hair Salon | `games/wild-hair-salon/` | 4–6 | A salon in watercolour: pull a lock longer or snip it shorter until it is as long as the friend's lock, then pull off the cape and see the two side by side. A learning game on comparing two lengths. |

## Showcases

`showcases/<key>/` holds finished games that are shown in the jam but are **not** Tada cartridges: they may need a keyboard and mouse or keep their own saves, so they are never ported. They open in the same shell, are listed apart on the home page with what they need, and get the same no-outside-requests check as the harness.

| Showcase | Folder | Needs | What it is |
| --- | --- | --- | --- |
| Alien Frontier | `showcases/alien-frontier/` (build in `public/alien-frontier/`) | keyboard & mouse | An open-world space western: an alien crash-lands in the 1880s Midwest and sets out to become a cowboy. Built from the `midwestalien` repo with `npm run showcase:jam` and run in a same-origin iframe. |

## License

[O'Saasy](LICENSE), matching Tada. The harness is an independent re-implementation of the cartridge contract's behavior; nothing here is copied from Tada's pre-rebuild (AGPL) history.

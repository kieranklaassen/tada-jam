# Alien Frontier: smoothness in the jam

Alien Frontier is an owner-approved showcase (not a cartridge). Its source lives outside this repo, so the jam
ships it prebuilt in `public/alien-frontier/` and makes it run smoothly with one small runtime shim,
[`public/alien-frontier/jam-smooth.js`](../../public/alien-frontier/jam-smooth.js), loaded by the game's
`index.html` right after its boot loader. The shim never edits the minified bundle. Every change below belongs
in the game's source, and the shim can be deleted once the source has them.

## What was slow

Measured on the Mac mini (M4), production build, WebKit and Chrome at 1180×820 and DPR 2:

- **The jam shell was not the cause.** The same build ran the same standalone (`/alien-frontier/index.html`)
  and inside the shell, and CPU profiles of the shell page showed no shell code during play.
- **Draw calls.** During play the game issued 1,678 (Chrome) to 3,292 (WebKit) draw calls per frame, against
  a jam budget of about 80. The scene holds 2,222 visible meshes (1,991 distinct geometries, 401 materials),
  1,934 of them cast shadows, and every character is 25 to 117 separate meshes. Submitting the draws cost
  7 to 12 ms of CPU per frame on the M4; the simulation itself cost about 1 ms.
- **The governor.** It guessed an M4 could run Ultra, then stepped down one tier at a time. Each step resizes
  the canvas and targets (about 170 ms). It ignored frames over 250 ms, so a very slow device never stepped
  down, and it retried failed upgrades.

## What the shim does

| Change | Why | In the source |
| --- | --- | --- |
| Merge still scenery into one mesh per material (797 meshes into 85 in play) | Draw calls. It watches play for 2 s and merges only top-level groups that nothing moved and no game system holds (characters, cows, the saucer, fires, collectibles stay separate) | Batch static props per material at world build |
| Far characters draw only their 5 largest parts (beyond 50 m) | Characters are 25 to 117 meshes each; far away the small parts are a few pixels. Done with render layers, so the game's own visibility is untouched | Build a merged or low-part LOD per rig |
| Parts under 0.25 m stop casting shadows (about 1,000) | The shadow pass draws every caster again | Only large parts cast shadows |
| The sun's shadow map is redrawn every third frame | Halves the shadow pass; the sun moves slowly | Same, or cache static casters |
| 4 of the 14 point lights stay on, the nearest ones | Every lit pixel loops over every point light; the count never changes, so no shader recompiles | A light pool |
| A new governor, following the jam's rules | Starts at Medium, counts missed frames over short windows, ignores one isolated long frame and only real stalls (over 1 s), steps up only with CPU work under 8 ms, and never retries an upgrade that failed within 20 s | Replace the tier logic with the same rules |

Dropping the composer's 4× multisampling was tried and made no difference, so the anti-aliasing stays.

`?smooth=off` (or `localStorage['jam-smooth'] = 'off'`) runs the game without the shim, and
`?smooth=merge,governor` keeps only the named parts, for comparison.

## Measured

`npm run perf:jam -- alien-frontier <engine> <throttle> auto` plays the showcase with a scripted keyboard and
mouse run (New Game, the opening cinematic, then walking and looking around, about 30 s). The numbers, before
and after, standalone and in the shell, are in the Project store's `docs/jam-games-perf.md`.

Chrome at 20× CPU throttle stays far below 60 fps: the game's own work is still about 3.5 ms per frame at 1×,
which is 70 ms at 20×. Getting there needs source changes (instanced or merged characters, fewer simulated
rigs), not a shim.

## Tests

[`smooth.test.ts`](smooth.test.ts) counts the work on real three.js objects: the merge's draw calls, what it
leaves alone, far-character detail, small shadow casters, and the governor's decisions on frames a 60 Hz display
delivers.

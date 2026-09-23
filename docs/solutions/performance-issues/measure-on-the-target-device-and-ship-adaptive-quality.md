---
title: Judge a 3D kid game's performance on a production build in WebKit, throttled Chrome, and a software-GPU proxy, profile the real hot spot, and ship adaptive quality with a grown-up fps overlay from day one
date: 2026-09-22
last_updated: 2026-09-23
category: performance-issues
module: performance
problem_type: performance_issue
component: development_workflow
severity: high
related_components:
  - tooling
  - testing_framework
applies_when:
  - Reporting fps or claiming a jam game runs smoothly before the owner tries it on an iPad
  - Building or refining a react-three-fiber or cannon-es scene that must hold 60 fps on a mid-range iPad
  - The owner or a playtester says a game is lagging on a real device while desktop numbers look fine
  - Adding physics bodies, fur shells, post-processing, or other per-frame cost to a 3D kid game
  - Starting a new 3D jam game and deciding what quality tiers and diagnostics it ships with
symptoms:
  - Every refinement pass reported 60 fps in headless Chrome on an Apple M4, yet the owner saw heavy lag on a real device
  - Chrome at 6x CPU throttling still held 60 fps, hiding GPU and fill-rate cost the iPad could not absorb
  - Chrome at 20x CPU throttling fell to 14 fps during a ten-stone spill as catch-up physics substeps spiralled, and later to 21 fps on a scale of loose parts whose thin shells never fell asleep
  - A CPU profile showed more than half of spill frame time in cannon-es convex-convex collision on 12-sided stone cylinders
  - The adaptive quality governor never stepped down on a very slow device because frames over 250 ms were filtered out as stalls
root_cause: missing_workflow_step
resolution_type: code_fix
tags: [ipad-performance, adaptive-quality, react-three-fiber, cannon-es, webkit, cpu-throttling, fps-overlay, kids-games]
---

# Judge a 3D kid game's performance on a production build in WebKit, throttled Chrome, and a software-GPU proxy, profile the real hot spot, and ship adaptive quality with a grown-up fps overlay from day one

## Problem

Pebble Table (`games/pebble-table/`, PR #1) is a claymation 3D math toy (react-three-fiber plus cannon-es) for a 4-year-old on an iPad. Through the whole visual refinement loop, every pass "held 60 fps", and every one of those numbers came from headless Chrome under Playwright on the Apple M4 Mac mini the agent worked on. The owner then played it on a real device and said: "make sure it's not lagging, right now it's lagging a lot."

60 fps on an M4 said nothing about a mid-range iPad at DPR 2. The M4 GPU hid fill and shader cost, and its CPU hid a physics cost that only shows up when a frame runs slow. The game had no way to adapt to a weaker device and no way for a grown-up to see what it was doing.

## Symptoms

- The owner saw heavy lag on the device while every recorded measurement said 60 fps.
- Chrome at 20x CPU throttle showed a spill death spiral: 14 fps while ten stones tumbled out of the bag, 23 fps while dragging a stone.
- A slow frame made the next frame slower: the physics loop ran up to 6 catch-up substeps to make up for lost time, which cost more time, which asked for more substeps.
- On a software GPU (SwiftShader), the full tier was far too slow and the game did nothing about it.
- There was no on-device readout, so the only feedback from the iPad was "it lags".

## What Didn't Work

- **Headless Chrome on the M4.** Fast CPU and a strong GPU. Every refinement pass logged 60 fps in `games/pebble-table/REFINEMENT.md`, and none of those numbers predicted the iPad.
- **6x CPU throttle in Chrome.** Still 60 fps idle, spill, and drag. CPU throttling only slows JavaScript, and in normal play the per-frame JS was cheap; the iPad lag was mostly GPU and fill bound (DPR 2, fur shells, a full-screen post pass). The physics spiral only appeared at 20x, where the spill finally cost more than a frame.
- **A stall filter at 250 ms.** The governor ignores very long frame intervals so a hidden tab or a paused debugger does not count as "slow". At 250 ms it also ignored every frame on a very slow device (SwiftShader at the full tier), so the governor saw no samples and never stepped down. `STALL_MS` in `games/pebble-table/quality.ts` is now 1000: only real gaps are ignored.
- **A minimal tier that just dropped the post pass.** The colour grade (saturation, S-curve, warmth) lived only in the post pass, so the minimal tier rendered milky and washed out. It looked right only after the same curve moved into the materials through three's `CustomToneMapping` hook (`installClayToneMapping` in `games/pebble-table/view/finish.ts`).
- **WebKit as a slow-device proxy.** WebKit in Playwright cannot be CPU-throttled (the CDP `Emulation.setCPUThrottlingRate` call is Chrome only), and on the M4 it ran 60 fps everywhere. It is a correctness and "does Safari's engine behave" check, not a weak-device check.

## Solution

**Profile first.** A CPU profile of the spill in Chrome at 20x throttle showed more than half of the time in cannon-es convex-convex collision (`project`, `findSeparatingAxis`, `clipFaceAgainstHull`) between 12-sided stone cylinders, plus up to 6 catch-up substeps per frame. That pointed the fix at colliders and substeps, not at rendering.

**Cheaper colliders, capped substeps** (`games/pebble-table/physics3d.ts`):

- `STONE_SIDES = 8` for stone colliders and `FIXTURE_SIDES = 10` for fixtures such as guests and stools (scale pans use 12). Convex-convex cost grows with faces times edges, and a spill is nearly all stone-on-stone contacts. The drawn pebbles are separate round meshes, so nothing visible changed.
- `DEFAULT_MAX_SUBSTEPS = 3`. `step` clamps the accumulator to `STEP * maxSubsteps`, so an overloaded frame slows game time slightly instead of spiralling. The cap follows the quality tier: `games/pebble-table/view/game.tsx` sets `table.physics.maxSubsteps = settings.physicsSubsteps` in its `onSettings` callback.
- Resting bodies must fall asleep. The jars of loose parts (stacked branch `cursor/pebble-table-explore-cceb`) first modelled shells as thin cones (`Cylinder(2, 1.65, 0.7)`, mass 1). Six of them piled together kept nudging each other awake, so in 2 of 8 headless trials some parts were still moving 20 s after the tip and physics cost about 1 ms a step on the M4 indefinitely. Flat discs of equal radii plus firmer sleep settings (`angularDamping: 0.9`, `sleepSpeedLimit: 2`, `sleepTimeLimit: 0.3` in `addPart`) settled most trials, with steps under 0.2 ms, and took the scene from 21 to 49 fps at 20x. But the controller test "lets every tipped-out part come to rest" still failed about once in 13 runs: shells or sticks stacked on each other kept bouncing at up to 6 units/s, the convex-on-convex stacking jitter cannon is known for. Two more changes made it reliable (0 failures in 320 trials). Shells and sticks now collide as clusters of small spheres (`SHELL_BALLS`, `STICK_BALLS`), which stack stably and are cheap to test. And a calm timer (`settleLooseParts`) puts any loose part to sleep once it has moved slower than 4 units/s for a second, so parts nudging each other just above cannon's sleep limit still go quiet. Run a new rest test in a loop (dozens of runs) before trusting it; a single green run proved nothing here.

**Adaptive quality** (`QualityGovernor` and `TIERS` in `games/pebble-table/quality.ts`). The game watches its own frame intervals and CPU time and steps between four tiers:

| Tier | DPR cap | Fur shells | Post | Physics substeps |
|---|---|---|---|---|
| full | 2 | 6 | tilt-shift blur plus grade | 3 |
| balanced | 1.5 | 3 | tilt-shift blur plus grade | 3 |
| lean | 1.25 | 0 | grade and vignette only | 2 |
| minimal | 1 | 0 | off; grade runs in materials via `CustomToneMapping` | 2 |

Rules as they are in code:

- Frames are judged in windows of 40. A frame over `DROPPED_FRAME_MS` (20 ms) counts as dropped. A window is bad when more than 10% of its frames dropped (`BAD_DROP_RATIO`).
- Two bad windows in a row step down one tier. One bad window steps down at once when its average interval is over 26 ms (`TERRIBLE_AVERAGE_MS`).
- Stepping up takes 6 clean windows in a row (`GOOD_WINDOWS_TO_UPGRADE`): zero dropped frames and average CPU work under `WORK_BUDGET_MS` (8 ms). If a step down comes within 8 windows of an upgrade, the clean stretch needed doubles, up to 48 windows (`MAX_GOOD_WINDOWS_TO_UPGRADE`), so tiers do not flicker.
- Intervals over `STALL_MS` (1000 ms) are ignored as stalls. The first window after any tier change is skipped (`settle`) because it pays for shader compiles and resized buffers.
- `startingTier` starts touch devices (coarse pointer) at balanced so the first seconds do not lag while the governor learns.
- `force` pins a tier from the overlay; `force(null)` returns to automatic.

`games/pebble-table/quality.test.ts` pins these behaviours: steady 60 fps stays put, one hitch does not step down, a terrible window does, slow frames walk all the way to minimal, upgrades need CPU headroom, a failed upgrade backs off, stalls are ignored, and a pinned tier holds.

**Applying the tier and pacing frames** (`QualityProvider` in `games/pebble-table/view/quality.tsx`). One frame hook at priority -2 records the interval and start time, another at priority 2 records CPU work and the renderer's draw calls and triangles (with `gl.info.autoReset` off so all passes are counted), and both feed the governor. A tier change sets the DPR (never above the screen's own), writes `data-quality` on the canvas, and skips two frames before sampling again; `data-calls` and `data-triangles` are written every frame for scripts. The canvas runs on demand (`frameloop="demand"` in `games/pebble-table/view/stage.tsx`), driven by a pacer that invalidates every display frame while anything happens and every other frame once the table has rested for `REST_BEFORE_PACING` (20 s: untouched, still, no demonstration). `Finish` in `games/pebble-table/view/stage.tsx` turns the post pass into blur plus grade, grade only (blur radius 0), or no composer at all (`DirectRender` plus `THREE.CustomToneMapping`).

**Grown-up overlay** (`GrownUpOverlay` in `games/pebble-table/view/overlay.tsx`). Triple-tap (three taps within 700 ms) the invisible 72 px top-left corner to show fps, frame time, CPU time, dropped frames per window, tier, effective DPR, auto or pinned, draw calls, and triangles, with buttons to pin any tier or go back to auto. The corner is backdrop, so a child does not open it by accident.

**Frame-budget test in CI** (`games/pebble-table/perf.test.ts`). It spills ten stones from the bag through the real `TableController` and times 180 frames of `step`, five runs, and fails if the best average exceeds 0.75 ms per frame. It runs in `npm test`, which CI runs on every push. The budget is loose enough not to flake on a busy runner and tight enough to catch a collider or substep regression, which costs several times that.

Smaller fixes in the same change: per-frame matrix allocations removed, lighter quill geometry.

**The committed profile harness** (`scripts/pebble-perf.mjs`, `npm run perf:pebble`). It loads a seeded busy Fair Feeding table at 1180x820 and measures three phases with a rAF frame recorder: 5 s idle, a ten-stone spill, and a stone dragged there and back. It prints one JSON line per run with fps, average ms, p90, p99, percent of frames over 20 ms per phase, and the tier with draw calls and triangles.

```bash
npm run serve:lan                              # production build on http://localhost:4173
npx playwright install webkit                  # for the webkit engine
node scripts/pebble-perf.mjs chrome 20         # Chrome (installed channel) at 20x CPU throttle
node scripts/pebble-perf.mjs webkit            # WebKit, no throttle possible
node scripts/pebble-perf.mjs swift             # Chrome on SwiftShader, a weak-GPU proxy
TIER=minimal node scripts/pebble-perf.mjs swift   # pin a tier through the overlay
SETTLE=8000 node scripts/pebble-perf.mjs swift    # let the automatic governor settle first
```

Arguments are `[chrome|webkit|swift] [cpuThrottle=1] [base=http://localhost:4173] [dpr=2]`; `SHOT=path.png` saves a screenshot. Through npm, pass them after `--` (`npm run perf:pebble -- chrome 20`).

**Before and after** (production build, 1180x820, DPR 2):

| Run | Before | After |
|---|---|---|
| Chrome 20x throttle, spill | 14 fps | 48 fps |
| Chrome 20x throttle, drag | 23 fps | 60 fps |
| Chrome 6x throttle, idle / spill / drag | 60 | 60 |
| WebKit, idle / spill / drag | not measured | 60 |
| SwiftShader, automatic | stuck at full | stepped to minimal; minimal about 2.7x faster than full |

After the later animation work, Chrome at 20x held 60 idle, 52 spill, 60 drag with the governor at balanced, and draw calls were 48. Not yet measured on a physical iPad.

**Jam-wide follow-up: one probe for every game, a fill stress test, and warm-up.** The ten-game workers measured on GPU-less cloud VMs, so their numbers were stand-ins. Re-measured on the Mac mini's M4, every game held 60 at iPad size, including the three flagged "slow at full quality". Two problems only showed up once the test was made harder:

- **A GPU that is only fast enough at iPad size.** The M4's GPU is several times stronger than a mid-range iPad's. Running each game in WebKit at full quality with four times the pixels (a 2360x1640 viewport at DPR 2) separated the games with GPU margin from the one without. Eight held 60; Felt Meadow fell to 39. Its automatic tier then retried full quality every 8 s, dropping to 38 to 43 fps each time.
  - **The cause:** the top tier's multisampled post target. Trying variants one at a time, pinned at 4x pixels, gave 38 fps with it and 60 without. The tilt-shift blur and a fuzz shell made no difference.
  - **The governor fix:** a fresh upgrade is judged on short windows, a failed upgrade becomes a ceiling at once, and stepping up needs CPU work under 8 ms (`games/felt-meadow/perf.ts`).
- **A long frame the first time an activity opens.** Pebble Table built the scale, jars, parts and house geometry on first mount, compiled their shaders on the first draw, and created its AudioContext inside the first tap. That added up to one frame of about 100 ms in WebKit and 350 ms at 20x, which knocked the tier down. The fix, in `useWarmup` in `games/pebble-table/view/models.tsx` and `TableAudio.prepare`:
  - build every model a child can bring out later after load, one small task per timer slot (WebKit has no `requestIdleCallback`);
  - compile their shaders with `renderer.compileAsync(warmScene, camera, liveScene)`, so the live scene's lights are used. Do it twice: once for the screen and once with an offscreen target bound, because the post pass renders into one and three.js builds a different variant there (no tone mapping, linear output). The warm objects must match the real ones' variants, including per-instance colour; the hedgehog's quills were missed until `setColorAt` was added;
  - draw the warm objects once, inside the live scene, into a 1x1 half-float target;
  - build the audio graph suspended ahead of the first tap;
  - have the governor leave out each window's single longest frame.

  Afterwards the first scale visit's worst frame was 27 ms in WebKit and 17 ms at 6x, and the tier held even at 20x. One 60 ms WebKit frame remains the first time the feeding table opens.

The shared probe is `npm run perf:jam -- <game> [webkit|chrome] [cpuThrottle] [auto|full|tierN] [base]` (`scripts/jam-perf.mjs`). It runs a scripted play-through of about 40 s and reports average fps, the worst one-second window, p99 frame time, frames over 25 ms, draw calls, the tiers visited, and the p95 of the game's `window.__jamPerf.cpuMs`. `SIZE=2` quadruples the pixels. Its Chrome runs use the installed Google Chrome with Metal, as on the Mac mini. `full` pins tier 3 in the three games that count their tiers up (`COUNTS_UP`) and tier 0 in every other game, so a new game that numbers down from full at 0 needs no probe change. On a machine with no GPU, read it as [measure on a GPU-less cloud VM](../workflow-issues/measure-jam-game-performance-on-a-gpu-less-cloud-vm.md) describes. The per-game results and before/after numbers are in the Project store's `docs/jam-games-perf.md`, outside this repo.

**Jam-wide follow-up: five governor rules, checked across eleven games.** Pebble Table and the ten style-showcase games (PRs #2 to #10 and #14) each ship their own tier governor. Reading all eleven and driving them through the same synthetic frame patterns (a throwaway vitest run against `main`, not committed) showed five rules that separate the governors that behave from those that don't. Tier numbering differs: Light Garden, Bedtime Forest, and Critter Clay count up to full quality at 3; the rest count down from full at 0.

1. **Step up on the frame's own work, not its interval.** At 60 Hz the display paces every interval at 16.7 ms however light the frame is, so the interval never shows spare time (the comment on `LIGHT_WORK_MS` in `games/critter-clay/perf.ts`). Eight governors step up only when the frame's CPU work is under a budget: Pebble Table, Hillside Spring, Kite Tower, Critter Clay, Felt Meadow, Shadow Lantern, and Cosy Scarf at 8 ms, Turning Tower at a 90th percentile under 6 ms. Three look only at the interval: Bedtime Forest, Frog Choir, and Light Garden. Fed 60 Hz intervals with 12 ms of work per frame from one tier down, the eight stayed put, while Bedtime Forest, Frog Choir, and Light Garden climbed into a tier with no CPU headroom, where only their backoff limits how often the dip repeats. The work gate sees CPU headroom only: a GPU-bound device looks light and on time one tier down, which is why Felt Meadow still retried full quality on the M4 until a failed upgrade became a ceiling. A step-up threshold below the display's interval is worse: it never fires. Bedtime Forest (14.5 ms, pass 1 of its `REFINEMENT.md`), Critter Clay (15 ms, its "Whole-game check after pass 30"), and Cosy Scarf (14.5 ms) all shipped that and fixed it. Cosy Scarf's was the last: after one step down it stayed there through 120 s of perfect 60 Hz frames, where every other governor climbed back within 4.5 to 11 s, and its test fed 10 ms frames, which a 60 Hz display never delivers. A follow-up merge on `main` after PR #14 made it climb on on-time frames with CPU work under 8 ms (`LIGHT_WORK_MS` in `games/cosy-scarf/tiers.ts`); fed the same frames with 3 ms of work it now climbs back in about 9.4 s, and its test feeds 60 Hz frames.
2. **Step down by counting missed frames in short windows, not by averaging intervals.** An average hides steady judder and magnifies one hiccup. Four frames at 16.7 ms and one at 33.3 average 20 ms, under the 21 to 22 ms thresholds of the averaging governors, while visibly stuttering at 48 fps. Fed that pattern from the top tier, Pebble Table, Hillside Spring, and Kite Tower (a window is bad when more than 10% of 40 frames run over 20 ms) stepped down, and so did Frog Choir, whose 19.5 ms average threshold sits just under 20; the other seven stayed at full quality. Bedtime Forest and Critter Clay count too, but only call a window slow at a quarter and a half of its frames. The other side: **Felt Meadow's one-second averages step down on a single frame of 260 ms or more** (200 ms did not; 900 ms dropped two tiers), and a second failure at a tier makes it a ceiling for the session, so a 300 ms hiccup every 10 s walked it from full quality to its lowest tier within a minute. None of the other ten moved on the same hiccups, and Pebble Table also leaves each window's longest frame out. Close windows on time as well as frame count, so a very slow device is judged in seconds: at 400 ms frames Pebble Table and Hillside Spring, with 40-frame windows only, took 32 s to take a first step, while Kite Tower (40 frames or 2 s) and Turning Tower (90 frames or 1.5 s) took 4 and 6.4 s. Keep stalls at 1 s, not 250 ms: Kite Tower pass 0 and Turning Tower pass 16 found the 250 ms filter this doc records, and **Cosy Scarf still ignores every interval over 250 ms** (`IGNORE_OVER_MS`), so at 400 ms frames it never left the top tier. Frog Choir keeps a 250 ms gap filter but counts three long gaps in a row as slow frames, which works.
3. **Let a very slow second drop two tiers.** Bedtime Forest (three quarters of a half-second window over 80 ms), Frog Choir (a one-second average over 40 ms), and Felt Meadow (over 34 ms) drop two tiers at once. At 120 ms frames they took their first step within 1.1 to 2.3 s and landed two tiers down; the one-tier governors took 1.7 to 9.6 s for a first step, and Pebble Table and Hillside Spring were still a tier above their lowest after 20 s.
4. **Start touch devices one tier down.** The governor needs seconds to learn, and those are the child's first seconds. Nine governors start a coarse pointer one tier down. Bedtime Forest (`new FrameGovernor(options.tier ?? TOP_TIER, ...)` in `games/bedtime-forest/view/stage.tsx`) and Turning Tower (`new TierGovernor(0, ...)` in `games/turning-tower/view/view.ts`) start every device at full quality. Playwright's `hasTouch` matches `(pointer: coarse)` in both engines, so a probe with touch on measures the touch start.
5. **Compile what a tier change needs before it happens.** A tier change comes exactly when the device is struggling (the comment on `prewarm` in `games/cosy-scarf/view/scene.ts`), and a tier that switches a post pass or a material variant may need programs not yet linked; linking them on the first frame at the new tier can fail the upgrade the governor just made. Cosy Scarf compiles every tier's variants at load and draws the scene once into one pixel. Bedtime Forest renders linear output so the screen and the post target share programs, and "a tier change that drops the pass never recompiles the scene" (`games/bedtime-forest/view/stage.tsx`). Critter Clay compiles both clay variants at load (`games/critter-clay/view/stage.tsx`). Turning Tower draws its whole scene once at mount and Pebble Table warms each activity; Felt Meadow, Frog Choir, Light Garden, Shadow Lantern, Hillside Spring, and Kite Tower compile nothing ahead, and whether any of their tier changes link new programs has not been checked. Kite Tower's tiers shed only DPR, motes, tail links, and substeps (its pass 19), which need no new programs.

## Why This Works

The lag had two causes that a fast desktop hides in different ways. Fill and shader cost (DPR 2, fur shells, a blur pass) scale with the GPU, and only a weak GPU, or SwiftShader standing in for one, makes them visible. Collision cost scales with the CPU, and only shows up once a frame is slow enough to trigger catch-up substeps, which is why 6x throttle looked fine and 20x did not. Measuring against both kinds of slowness found both problems; measuring on the M4 found neither.

Fewer collider sides attack the dominant cost directly, and the substep cap breaks the feedback loop so a slow frame costs a little game time instead of the next frame. The governor makes the game fit whatever device it lands on without a device list: it measures, steps down fast when frames are clearly bad, and steps up slowly and only with CPU headroom, so it neither lags for long nor flickers between looks. Moving the grade into `CustomToneMapping` means the cheapest tier still looks like the game. The overlay turns "it lags" into numbers on the actual device, and the CI test keeps the physics fix from quietly regressing.

## Prevention

Day one of the next game, before building gameplay:

- [ ] **Budgets, written down.** About 12 ms per frame on an iPad at 60 Hz, with the GPU taking most of it. Never below 45 fps in the heaviest moment (spill, burst, crowd). Under about 80 draw calls. DPR capped at 2. At most one full-screen post pass. The DPR, draw-call, and post-pass budgets match the "60 fps on a mid-range iPad" line of `docs/art-direction.md`; the 12 ms frame and the 45 fps floor are added here.
- [ ] **Judge on a production build**, never the dev server: the iPad had been loading the unbundled dev server, and `npm run serve:lan` builds and serves production on port 4173.
- [ ] **Measure in more than one place**, on the production build, for idle, the heaviest interaction, and a drag:
  - WebKit (`node scripts/pebble-perf.mjs webkit`) for Safari engine behaviour.
  - Chrome at 6x and 20x CPU throttle (`node scripts/pebble-perf.mjs chrome 20`) for CPU cost and spirals.
  - Chrome on SwiftShader (`node scripts/pebble-perf.mjs swift`) as a weak-GPU proxy; the automatic governor should step down and the lowest tier should still look like the game.
  - WebKit at full quality with four times the pixels (`SIZE=2 npm run perf:jam -- <game> webkit 1 full`) as a fill stress test on a strong GPU. A game with margin holds 60 there; one that doesn't will likely lag on an iPad.
  - A real iPad whenever one is available, read through the overlay.
  - The shared probe (`npm run perf:jam -- <game> ...`) runs every configuration above on any jam game that exposes `window.__jamPerf`. Adapt `scripts/pebble-perf.mjs` only when a game needs seeded state or game-specific gestures.
- [ ] **Profile before fixing.** Capture a CPU profile of the heaviest moment under 20x throttle and fix the top of it. Do not guess at rendering when the profile says physics, or the reverse.
- [ ] **Check that piles go to sleep.** After adding a new kind of body, pile a lot of them up headlessly and count awake bodies after 10 s over several trials. Thin, light, or cone-shaped colliders are the usual jitterers. Add a test that asserts they sleep.
- [ ] **Warm up lazily built scenes during idle.** Anything built or compiled the first time it appears (merged geometry, shader variants, audio graphs) costs a long frame at the worst moment: a child's first tap on something new. After load, build it one small task per timer slot, compile its shaders against the live scene for every render target it will use, and draw it once offscreen. Then check that no new shader programs link on the first visit or on a tier change: hook `linkProgram` in a Playwright init script, then pin each tier in turn with the overlay.
- [ ] **Cap physics catch-up.** Clamp the accumulator to `STEP * maxSubsteps` with a cap of 3 or less, and keep physics colliders simpler than the drawn meshes (low side counts for cylinders).
- [ ] **Ship adaptive quality from the start.** Tiers that step down DPR, per-object detail (fur, particles), the post pass, and physics substeps. Start from `QualityGovernor` in `games/pebble-table/quality.ts` with its current thresholds: windows of 40 frames, dropped frame over 20 ms, bad window over 10% dropped, step down after two bad windows or one window averaging over 26 ms, step up after 6 clean windows with CPU work under 8 ms, doubling up to 48 after a failed upgrade, stalls over 1000 ms ignored, one settle window after a change, touch devices start one tier down. Leave out each window's single longest frame, so a one-off build or GC pause never changes the tier. Make a failed upgrade a ceiling at once rather than retrying it on a timer; every retry is a visible dip. Never make stepping up depend on frame intervals under 16.7 ms: a 60 Hz screen never delivers them. Cosy Scarf required 14.5 ms, so on a touch device it would never have left the tier it started on; read headroom from the frame's own CPU work instead. Add what Pebble Table lacks: close a window after 2 s as well as 40 frames (Kite Tower), and drop two tiers when a window is far off the pace (Bedtime Forest). Test the governor with frames a real display delivers: steady 16.7 ms intervals must climb back when the work is light and must not when it is heavy, one frame in five at 33 ms must step down, a single 300 ms frame must not, and 400 ms frames must reach the lowest tier within seconds.
- [ ] **Keep the look at the lowest tier.** If the grade lives in a post pass, also run it in materials (three's `CustomToneMapping`, as `installClayToneMapping` does) so turning the pass off does not wash the scene out.
- [ ] **Pace idle frames.** Render on demand, drop to half rate after a stretch of rest, stop when unattended or hidden.
- [ ] **Add the grown-up overlay** (triple-tap a corner): fps, frame ms, CPU ms, dropped frames, tier, DPR, draws, triangles, and tier pinning.
- [ ] **Add a frame-budget test to CI** that drives the heaviest simulation through the real controller and asserts a best-of-five average CPU cost per frame (Pebble Table: under 0.75 ms for a ten-stone spill).
- [ ] **Report honestly.** In the PR, name the engine, throttle, DPR, and build for every fps number, and say plainly when a physical iPad has not been measured.

## Related

- [`measure-jam-game-performance-on-a-gpu-less-cloud-vm.md`](../workflow-issues/measure-jam-game-performance-on-a-gpu-less-cloud-vm.md): the other wrong target, a machine with no GPU, and which of its numbers still carry over.
- [`refinement-loop-for-kid-3d-readability.md`](../workflow-issues/refinement-loop-for-kid-3d-readability.md): the visual passes whose 60 fps numbers came from the wrong target.
- [`distinct-visual-style-per-game-shared-quality-bar.md`](../conventions/distinct-visual-style-per-game-shared-quality-bar.md): the quality bar's frame-rate line and the render-budget techniques.
- [`games/pebble-table/ART.md`](../../../games/pebble-table/ART.md): adaptive quality, the grown-up overlay, and cheap colliders as built.

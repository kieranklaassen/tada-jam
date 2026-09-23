---
title: Refine a young child's 3D scene in fixed-seed screenshot passes, one honest critique and one focused fix set per pass, reverting fixes that hurt
date: 2026-09-22
category: workflow-issues
module: art-direction
problem_type: workflow_issue
component: development_workflow
severity: medium
related_components:
  - tooling
  - documentation
applies_when:
  - Asked to polish, refine, or run N iterations on the look of a 3D jam game scene
  - A 3D kid scene reads flat, pastel, or cheap in screenshots
  - Choosing camera pitch, lens, lighting, colour grade, or character framing for a young child on an iPad
  - Adding shader fur, hair, or other surface detail to characters a child must read at play distance
  - Deciding whether a visual change helped or should be reverted
symptoms:
  - Owner said the fur looked a little bad and asked for ten passes to make the scene more refined
  - From a 56 degree camera, stones read as flat discs and guests showed the tops of their heads
  - Grading before tone mapping turned highlights pink and washed out the table
  - The first fur shells covered faces and bellies and read like towelling
  - A deeper scale pan hid the stones inside it
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [visual-refinement, screenshot-loop, kids-games, react-three-fiber, claymation, shader-fur, color-grading, camera-framing]
---

# Refine a young child's 3D scene in fixed-seed screenshot passes, one honest critique and one focused fix set per pass, reverting fixes that hurt

## Context

Pebble Table (`games/pebble-table/`, in PR #1, unmerged as of writing) is a claymation 3D math toy (react-three-fiber plus cannon-es) for a 4-year-old on an iPad. After the claymation style was picked, the owner said the fur "looks a little bad" and asked for shader fur plus ten iterations "to make it even more refined."

Asking for "more refined" invites a vague, sprawling rewrite. What worked instead was a fixed loop: screenshot a seeded scene, critique it honestly from a small child's point of view, make one focused set of fixes, re-screenshot, check fps. Each pass is logged as a row in `games/pebble-table/REFINEMENT.md` (critique, change, fps). Before and after screenshots and a walkthrough video live outside the repo in the Project store under `media/pebble-table-v3/`, not in the repo.

The loop caught four regressions that a one-shot "make it nicer" change would have shipped:

- Grading before tone mapping turned the bag's highlights pink and washed out the table.
- The first fur shells covered the bear's muzzle and belly and read like towelling.
- Deeper scale pans hid the stones inside them, so that change was reverted.
- A warmer grade went too gold and was eased back.

One caveat: every pass logged 60 fps, but those numbers came from headless Chrome on an Apple M4. The owner then reported heavy lag on a real device. The desktop numbers had hidden it: the device was loading the unbundled dev server, stone collisions spiralled on a slower CPU, and the fill cost of DPR 2 and fur shells that an M4 absorbs mattered too. Treat the fps column in the log as "did not regress on a fast desktop," not as proof the scene runs on the target. The performance learning in docs/solutions/ (see Related) covers measuring on the right target and the adaptive quality tiers that followed.

## Guidance

### The loop

1. **Freeze the scene.** Seed one representative, busy game state into storage before load so every pass looks at the same table. Pebble Table seeded a Fair Feeding table with three guests, two stones each, a leftover in the bowl (so the knife is out), loose whole stones and two halves. The committed perf harness `scripts/pebble-perf.mjs` shows the same pattern: it writes the state to `localStorage` under `tada-jam:slot:pebble-table` (plus prefs with `childAge: 4`), then reloads `/?chrome=0#/play/pebble-table`. If a pass changes a different screen, seed that screen for that pass (pass 7 used an Honest Scale table because it changed the scale).
2. **Shoot at a fixed size and a fixed delay.** 1180×820 at DPR 2, taken 6.4 s after load. The delay matters: guidance glows start at 3 s idle and the ghost hand at 5 s, so a 6.4 s shot always includes the idle guidance, which is the part a child relies on most.
3. **Critique in writing, as the child.** Write down what reads badly or looks cheap at play distance: can she tell what each thing is, does each guest have a face, can she see the stones, is the "touch here" cue visible on this surface? Put the critique in the log before changing code.
4. **Make one focused set of fixes.** One theme per pass (camera, guests, colour and light, stones, bowl and halves, scale, glow, handmade detail, sound). Mixing themes makes it impossible to tell which change caused a regression.
5. **Re-screenshot and compare side by side with the previous pass.** If a fix hurts readability, revert or ease it back in the same pass and log it. Do not carry a regression forward hoping a later pass fixes it.
6. **Sample fps separately, with no screenshots running.** Record frame intervals for about 4 s with a `requestAnimationFrame` counter (as `startFrames`/`stopFrames` do in `scripts/pebble-perf.mjs`) and log average fps and the 99th-percentile frame. Screenshots stall the page and pollute the numbers. Also watch draw calls (Pebble Table went from about 45 to about 55 over ten passes against an 80 budget).
7. **Log the pass** as one table row in the game's `REFINEMENT.md`: critique, change, fps. End with a "Still weak" list so the next person knows what the loop did not fix.
8. **Then measure on the real device class.** Desktop fps only rules out gross regressions. See the performance learning.

Tooling gotcha when repeating the loop: the image viewer sometimes showed a stale or missing file right after a screenshot was written. Waiting a moment and reading the file through its `/private/tmp/...` path worked.

### What moved readability, roughly in order of impact

The order is the judgment made from the pass screenshots, not a measured ranking.

| Change | Why it helps a young child | Cost |
| --- | --- | --- |
| Lower the camera: 56° to 46° pitch, 30° to 27° lens, target nudged back (`games/pebble-table/view/stage.tsx` `PITCH`, `FOV`, `TARGET`) | From high up, stones are flat orange discs and guests are the tops of heads. Lower, stones show thickness (a thing you can pick up) and guests show faces. 46° is still high enough to see every plate. | Free. Any code that projects screen to world must use the same constants (the perf script duplicates them). |
| Bigger, friendlier guests: 14% bigger, turned toward the child (head-look clamp ±0.38 rad in `games/pebble-table/view/models.tsx`), bigger bead eyes with a double shine (two `PALETTE.shine` spheres per eye) | Side guests in profile read as objects; a face looking at you reads as a character who wants something. Eye shine makes them feel alive at small size. | Seats moved back and the guest collision radius went from 58 to 64 so bodies clear the plates. |
| Rim light from behind (the third `directionalLight` in `games/pebble-table/view/stage.tsx` `Lights`, warm, from behind the table) plus a warmer, stronger key, less ambient, a cool fill | Separates characters from the table by an edge of light, so silhouettes read even when colours are close. | One extra light, no shadow maps. Cheap. |
| Grade after tone mapping: ACES first, then a display-space S-curve and saturation (`games/pebble-table/view/finish.ts` `ClayFinishEffect`, composed after `<ToneMapping mode={ACES_FILMIC}>` in `games/pebble-table/view/stage.tsx` `Finish`) | Stronger, cleaner colour without pastel wash. Grading linear HDR values before tone mapping pushed channels negative and turned highlights pink. | Runs in the existing single post pass. For the no-post tier the same curve runs inside materials via `installClayToneMapping` (three's `CustomToneMapping` hook), so keep the two copies in sync. Warmth is now 0.3; a stronger gold was eased back. |
| Domed pebbles with baked underside shading (`games/pebble-table/view/geometry.ts` `pebble`: top flattened to 0.47, belly to 0.3, darker vertex colours below; stones material roughness 0.42 vs 0.62 for clay in `games/pebble-table/view/clay.ts`) | A stone that looks round and solid invites grabbing; flat lozenges read as stickers. | Free: geometry and vertex colours only. |
| Shader clay fur with bare face and belly (`games/pebble-table/view/fur.ts` `furMaterial`, `tuftTexture`, `withShells`) | The guests look soft and huggable while faces stay clean. Front-facing surfaces are bare (`vBare = smoothstep(0.3, 0.62, normal.z)`); the first try without this hid the muzzle and belly and read like towelling. Tufts are fat tool strokes, not realistic hair, to stay in the clay style. | The biggest cost in the set: instanced alpha-tested shells mean extra draws and fill. Shell count comes from on-screen size (3 to 6, `MAX_SHELLS` in `games/pebble-table/view/fur.ts`, chosen in `games/pebble-table/view/models.tsx`), later capped per quality tier (6, 3, 0, 0 in `games/pebble-table/quality.ts`). |
| Deep bowl and true half and quarter pebbles (`games/pebble-table/view/geometry.ts` `bowl`, `cutPebble` with flat cut faces) | A saucer does not read as "stones go in here." A sliver does not read as "half a stone"; the whole pebble with a flat cut face does, which is the math. | Physics bowl wall raised from 3.2 to 4.8 (`BOWL_WALL` in `games/pebble-table/physics3d.ts`); glows and shadows for stones in the bowl moved onto the bowl floor; halves and quarters are their own instanced meshes (one draw each). |
| Golden ring glow (`games/pebble-table/view/clay.ts` `ringTexture`, colour `PALETTE.glow` `#ffd76a`) that breathes in size | The old soft blob vanished on the cream rug. A ring with a clear bright edge and a faint core reads as "touch here" on both the pale rug and the sage table. | Free: a 128 px canvas texture. |

Changes that were tried and backed out are as useful as the ones kept: deeper scale pans (hid the stones; the pans kept their original depth with rolled rims instead) and a too-gold grade.

## Why This Matters

A 4-year-old cannot read instructions, so the scene itself has to say what everything is and what to touch. Readability failures are visual and only show up when you look at the actual frame at play distance: a correct shader can still make a bear look like a towel, and a "better" grade can still turn highlights pink. The loop forces a look at every change, one theme at a time, with a written critique, so regressions get caught and reverted inside the pass that caused them. The per-pass log also gives the next agent a record of what was tried, what was reverted, and what is still weak, instead of an unexplained final state.

The same discipline keeps performance honest, but only if the fps sample is taken on the target device class. Fast-desktop fps that stays flat across ten passes says little about an iPad.

## When to Apply

- The owner asks to "refine," "polish," or "make it look better" on an existing 3D (or 2D) scene.
- A game's style has been picked and the next step is raising it to the jam quality bar.
- A visual change could affect whether a child can read the scene: camera, colour grade, lighting, character proportions, fur or surface shaders, guidance cues.
- Not for first-pass style exploration (that is the style spike in the distinct-visual-style convention) and not a substitute for on-device performance measurement.

## Examples

Pass 4 (colour and light), from `REFINEMENT.md`. Critique: washed out and pastel, guests flat against the table. First try graded before tone mapping; the re-screenshot showed pink highlights on the bag and a washed-out table. Fix in the same pass: move the grade after ACES as a display-space S-curve plus saturation, add the rim light, and ease warmth back after a too-gold try. The current order is visible in `games/pebble-table/view/stage.tsx` `Finish`:

```tsx
<EffectComposer multisampling={0} enableNormalPass={false}>
  <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
  <primitive object={effect} />
</EffectComposer>
```

Pass 1 (shader fur). Critique after the first shells: the bear's light belly and muzzle were covered and read like towelling. Fix: suppress tufts on front-facing surfaces in the vertex shader of `furMaterial` (`games/pebble-table/view/fur.ts`):

```glsl
vBare = smoothstep(0.3, 0.62, normalize(objectNormal).z);
```

and in the fragment shader multiply the tuft height by `(1.0 - vBare)` before the alpha test, so faces and bellies stay bare clay.

Pass 7 (scale). Critique: pencil-thin beam, hair-thin hangers, flat pans. First try deepened the pans; the re-screenshot showed the stones hidden inside them, which breaks the point of a balance (seeing what is in each pan). Reverted to the original pan depth with rolled rims, kept the chunky beam and thicker rope hangers.

Starting the loop for a new game: copy the seeding approach from `scripts/pebble-perf.mjs` (seed a busy save into `localStorage`, reload into the game with `?chrome=0`), wait past the guidance delay, take the screenshot, then run the frame sampler with no screenshot, and add a row to a new `REFINEMENT.md` in the game folder.

## Related

- [`measure-on-the-target-device-and-ship-adaptive-quality.md`](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md): why the 60 fps numbers from these passes came from the wrong target, and the adaptive quality that followed.
- [`distinct-visual-style-per-game-shared-quality-bar.md`](../conventions/distinct-visual-style-per-game-shared-quality-bar.md): the shared quality bar these passes polish toward.
- [`wordless-clarity-for-the-declared-age-band.md`](../conventions/wordless-clarity-for-the-declared-age-band.md): clarity for the declared age, which the passes serve.
- [`games/pebble-table/REFINEMENT.md`](../../../games/pebble-table/REFINEMENT.md): the per-pass log.
- [`games/pebble-table/ART.md`](../../../games/pebble-table/ART.md): the resulting art guide.

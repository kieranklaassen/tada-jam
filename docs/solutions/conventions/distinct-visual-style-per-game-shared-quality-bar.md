---
title: Every jam game picks its own visual style; all games meet one shared quality bar
date: 2026-09-22
last_refreshed: 2026-09-22
category: conventions
module: art-direction
problem_type: convention
component: documentation
severity: medium
related_components:
  - development_workflow
applies_when:
  - Adding a new game under games/ in tada-jam
  - Choosing or changing a game's visual style or art direction
  - Writing jam-wide art or quality guidance that could be mistaken for one game's look
  - Building a 3D kid game that must hold 60 fps on a mid-range iPad
  - Reviewing a game PR against the shared quality bar
symptoms:
  - First 2D canvas slice of Pebble Table was judged ugly by the owner
  - Art-direction doc generalized Pebble Table's claymation look into a jam-wide style
  - Risk of every jam game converging on the same look
root_cause: inadequate_documentation
resolution_type: documentation_update
tags: [art-direction, visual-style, quality-bar, style-registry, kids-games, react-three-fiber, ipad-performance, claymation]
---

# Every jam game picks its own visual style; all games meet one shared quality bar

## Context

tada-jam is a jam repo for experimental, Tada-compatible kids' games. Each game lives in its own folder under `games/<key>/`. The first game is Pebble Table, a quantity and early-math toy aimed at a 4-year-old playing on an iPad.

The first playable slice was drawn with 2D canvas. The owner judged it "ugly" and asked for something much more ambitious, either 3D or very detailed. A separate exploration produced ten 3D style concepts (claymation, felted wool, rainbow wood, paper-craft, painterly Ghibli-like, pastel toon, geometric Monument Valley, knitted yarn, glass and light table, picture-book gouache), each scored on kid clarity, artistry, and iPad performance risk. The owner picked claymation, and Pebble Table was rebuilt with react-three-fiber and cannon-es in that style.

The first art-direction doc written after the rebuild made a wrong generalization: it said every future jam game would share the claymation look. The owner corrected it: "all games should look different, not the same, but HIGH quality." Two things had been conflated. The *style* belongs to one game. The *quality bar* belongs to the whole jam.

The correction is in PR [#1](https://github.com/kieranklaassen/tada-jam/pull/1), which is still open (not merged) as of writing. It splits the guidance into two layers:

- `docs/art-direction.md` holds the jam-wide quality bar, the rule for picking a style, a registry of claimed styles, and a menu of unclaimed directions.
- `games/pebble-table/ART.md` holds everything specific to claymation (palette, material, motion rules).

The rule is also stated in `AGENTS.md` (`CLAUDE.md` is a symlink to it) and in the README's "Add a game" step 7.

## Guidance

**Every game picks its own visual style, and every game meets the same quality bar.** A style is a look. The bar is a set of properties any look must have. Keep them in separate documents so one game's look never leaks into jam-wide guidance.

### The rule for a new game

From `docs/art-direction.md` (section 2) and the "A distinct look per game" rule in `AGENTS.md`:

1. Pick a direction nobody has claimed in the registry in `docs/art-direction.md`.
2. Spike it on the game's real scene, not a mood board. Take a screenshot at 1180×820 and measure the frame rate at DPR 2.
3. Register it in the same PR, with a link to the game's own art guide at `games/<key>/ART.md`.

Techniques may be shared across games (merged meshes, blob shadows, the ghost-hand guidance). A look may not. The test is whether two games could be mistaken for each other in a screenshot (`docs/art-direction.md`).

When writing guidance, put style-specific details (palette, material, surface texture, lighting mood) in `games/<key>/ART.md`. Put style-independent requirements in `docs/art-direction.md`. If a sentence would be wrong for a paper-craft game, it does not belong in the shared doc.

### The shared quality bar

`docs/art-direction.md` (section 1) lists the lines every game must meet, whatever its style: alive at idle; motion and sound on every touch; weight, squash, and follow-through; kid-clear silhouettes; wordless clarity for the declared age band (see [`wordless-clarity-for-the-declared-age-band.md`](wordless-clarity-for-the-declared-age-band.md)); wordless guidance; 60 fps on a mid-range iPad; procedural or committed assets only; and a recognisably distinct art direction. The PR for a game must say how it meets each line, with a measured frame rate.

### What made Pebble Table's 3D read clearly and hold 60 fps

These lessons came from building the claymation style, but most of them are techniques, so they carry over to any style.

**Clarity for a young child**

- Big, distinct silhouettes, few objects, and an uncluttered backdrop.
- Countable pieces should sit on a surface of contrasting hue and temperature. The claymation concept image had rust stones on a rust table. The fix was a cool sage-teal table (`PALETTE.table` `#6e9a9b` against `PALETTE.stone` `#c9683d`, `games/pebble-table/view/clay.ts`).

**Draw calls and geometry**

- Merge each rigid prop into a single geometry, which means one draw call per prop (`merge()` built on `mergeGeometries`, `clay.ts`). Characters are split into about six parts (body, head, eyes, mouth, two arms) so they can still animate (`games/pebble-table/ART.md`).
- Instance anything that repeats. Stones are three `instancedMesh` draws (whole, half, quarter), and each instance gets its own squash matrix (`games/pebble-table/view/models.tsx`). Plates, stools, and chain links are instanced the same way (`models.tsx`).
- Build geometry once per page, not on every mount. `once()` caches geometry by key (`models.tsx`), and `prewarm()` builds the bag, the scale mat, and all three characters' geometry shortly after startup (`models.tsx`); Fair Feeding's plates, stools, bowl, and knife are still built the first time that mat mounts, so prewarming those too is an open improvement.

**Lighting and shading on a budget**

- Use blob shadows instead of shadow maps. One instanced mesh of soft radial blobs widens and fades with height above the ground, and the same mesh in warm light draws the guidance glows (`models.tsx`). The stage sets up no shadow maps (`stage.tsx`).
- Bake contact occlusion into vertex colours. `paint()` darkens vertices near the surface a piece sits on, so no AO pass is needed (`clay.ts`).
- Draw textures procedurally at startup. The thumbprint normal map is drawn on a canvas and wrapped in a `CanvasTexture` (`clay.ts`, with the `CanvasTexture` created at `clay.ts`; used at `clay.ts`). Nothing is fetched, which also satisfies the zero-egress rule.

**Post-processing and resolution**

- Allow at most one full-screen post pass. `ClayFinishEffect` merges tilt-shift depth of field, a warm grade, and a vignette into one shader (`games/pebble-table/view/finish.ts`). ACES tone mapping follows it in the same composer (`stage.tsx`).
- Cap DPR at 2 and let the adaptive quality tier lower it (full 2, balanced 1.5, lean 1.25, minimal 1; `TIERS` in `games/pebble-table/quality.ts`). The composer runs without MSAA (`multisampling={0}`, `stage.tsx`).

**Attention and guidance**

- Pause the render loop when the game is unattended. `running` is `ctx.attention.attended && !hidden` (`games/pebble-table/pebble-table.tsx`), and the canvas uses `frameloop={running ? 'demand' : 'never'}` with a pacer that renders every display frame during play and every other frame after 20 s of rest (`games/pebble-table/view/quality.tsx`).
- Show guidance without words, as a camera-facing sprite of a ghost hand (`models.tsx`). Per the build session, an earlier 3D ghost-hand model (never committed) was foreshortened into an unreadable blob by the angled camera, so the committed version is a sprite. Timing lives in `guidance.ts`: a glow after 3 seconds of idle, demonstrations after 5 seconds and then 10, 20, and 40 second gaps, and at most four per idle stretch (`games/pebble-table/guidance.ts`).

**Motion**

- Use one damped spring helper, `springStep` (`models.tsx`), for all motion. Low damping overshoots, and that overshoot is the charm.
- Stones squash on landing and stretch on pickup, with a spring per size (`STONE_FEEL` in `models.tsx`: whole stones heavy and slow, quarters quick). The balance beam is a slightly underdamped spring. Characters move by personality, not by one shared animation (`games/pebble-table/motion.ts`).

**Measurement**

- Measure with a scripted walkthrough rather than by eye, and on the right target. Headless Chrome on an Apple M4 reported 59.9 fps for Pebble Table while the owner saw heavy lag on a real device; the committed profile (`scripts/pebble-perf.mjs`, `npm run perf:pebble`) now runs a production build in WebKit, in Chrome with CPU throttling, and on a software GPU, and the game adapts its quality at runtime.
- Do not take screenshots during the timed run. They cause stalls that pollute the numbers.
- Pebble Table has not yet been measured on a physical iPad, so treat desktop numbers as a floor check, not proof; the grown-up overlay (triple-tap the top-left corner) shows the real frame rate on the device.

## Why This Matters

- **Distinct looks are part of the jam's value.** It is a space for experiments. If every game inherits the first game's look, the jam produces one aesthetic with several mechanics, and a child switching games in the Tada shell sees the same world over and over. The owner explicitly rejected that.
- **A shared bar keeps variety from becoming uneven quality.** Without it, "a different style" could turn into a cheaper style, or one that runs at 30 fps on an iPad. The bar is deliberately style-independent: a paper-craft game and a claymation game are held to the same standard for idle life, feedback, clarity, guidance, and frame rate.
- **Mixing the two layers causes drift.** The first art-direction doc showed what happens when a style decision is written into jam-wide guidance: later agents read it as a rule and copy the look. Keeping style in `games/<key>/ART.md` and the bar in `docs/art-direction.md` makes the boundary visible.
- **Claiming a style early prevents collisions.** The registry plus a spike on the real scene makes the choice concrete (a screenshot and a number) before any visuals are built. Two parallel agents can't silently pick the same look, and a style that can't hit 60 fps is caught before the build starts.
- **The performance techniques are hard-won and reusable.** Merging, instancing, blob shadows, baked AO, one post pass, and the DPR cap are what keep Pebble Table at about 48 draw calls. A new game in a different style can reuse all of them without borrowing the clay look.

## When to Apply

- Starting any new game under `games/`, before building visuals.
- Writing or editing art guidance. Decide whether each statement is style-specific (it goes in `games/<key>/ART.md`) or jam-wide (it goes in `docs/art-direction.md`).
- Reviewing a game PR. Check that the style is registered and unclaimed by another game, that the PR says how each quality-bar line is met, and that it includes a measured frame rate.
- Reworking an existing game's look. Update its registry row and its `ART.md` in the same PR.
- Building any 3D kids' game in the jam. The clarity and performance techniques apply regardless of style.

This does not stop games from sharing code-level techniques or the style-independent guidance logic. Only the look must differ.

## Examples

**Wrong framing (the `AGENTS.md` rule added with the first art-direction doc, now replaced):**

> **Art direction.** Jam games share the claymation look and its iPad budget: see `docs/art-direction.md`.

**Corrected framing (`docs/art-direction.md`):**

> Every Tada Jam game must meet the same **quality bar**, and every game must **look different**. Claymation is Pebble Table's style, not the jam's.

**Registering a new game's style.** Say a second game spikes picture-book gouache from the unclaimed menu (`docs/art-direction.md`). In its PR it would add `games/<new-key>/ART.md` and one row to the registry (in `docs/art-direction.md` the art-guide column holds links):

```markdown
| Game | Style | Art guide |
| --- | --- | --- |
| Pebble Table | Claymation 3D: plasticine with thumbprints, stop-motion lighting, terracotta on cool sage-teal | `games/pebble-table/ART.md` |
| (new game) | Picture-book gouache: opaque colour fields, dry brush, loose ink outlines | `games/<new-key>/ART.md` |
```

It would reuse techniques freely, such as instancing, blob shadows, one post pass, the DPR cap, and the ghost-hand guidance. It would replace everything that makes the look: a ramp shader and ink outlines instead of the clay material with thumbprint normals, and its own palette.

**Figure-ground fix in the palette (`games/pebble-table/view/clay.ts`):**

```ts
table: '#6e9a9b',
tableEdge: '#5e8788',
stone: '#c9683d',
```

**The iPad-safe render setup (`games/pebble-table/view/stage.tsx`):**

```tsx
<Canvas
  dpr={Math.min(window.devicePixelRatio || 1, 2)}
  frameloop={running ? 'demand' : 'never'}
  flat
  gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
>
  <QualityProvider governor={governor} running={running} restingFor={restingFor} onSettings={onSettings}>
  ...
<EffectComposer multisampling={0} enableNormalPass={false}>
```

## Related

- [`docs/art-direction.md`](../../art-direction.md): the canonical quality bar, style rule, claimed-styles registry, and menu of unclaimed directions. This doc records why; that doc is the rule.
- [`games/pebble-table/ART.md`](../../../games/pebble-table/ART.md): the worked example of one claimed style (claymation 3D) and its measured budget.
- [`AGENTS.md`](../../../AGENTS.md): the "Quality bar" and "A distinct look per game" rules, plus the jam 3D stack allowance.
- [`README.md`](../../../README.md): "Add a game" step 7 (pick, spike, register a style).
- [`wordless-clarity-for-the-declared-age-band.md`](wordless-clarity-for-the-declared-age-band.md): the quality-bar line on clarity for the declared age.

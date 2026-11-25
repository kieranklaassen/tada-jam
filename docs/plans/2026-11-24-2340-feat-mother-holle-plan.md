---
title: "feat: Mother Holle, shake the featherbed and the village slides"
date: 2026-11-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Mother Holle

## Goal Capsule

- **Objective:** a child of 3 to 7 shakes a giant featherbed, sees the feathers come down as snow right below it, and laughs at a walrus in a bathtub that slides exactly as far as the snow reaches. Later visits: shape the snow (a jump, a bridge over the pond), and choose who ends up sitting on whose head.
- **Means:** a new three.js jam game in `games/mother-holle/`, made from the template.
- **Authority:** `AGENTS.md`, then `docs/solutions/conventions/building-a-jam-game.md`, then the game-design pack, then this plan.
- **Stop when:** an official gate cannot pass without changing shared code.
- **Ships as** one draft pull request; merging stays with the owner.

## Product Contract

### Requirements

- R1. The first picture holds the whole loop: a fat quilt in Mother Holle's hands with feathers in the air, green grass, and right below it a walrus in a bathtub paddling without moving, looking up at the quilt.
- R2. A touch anywhere that is not somebody is a shake: the quilt is held over the finger's place and feathers fall straight down from it. A drag carries it along and shakes more.
- R3. Feathers are conserved: what is in the quilt, in the air, on the ground and on heads is one fixed amount. The quilt is as fat as what is left in it.
- R4. Where snow lies, a sled slides downhill; where it ends, the sled stops in the grass with a thump and its rider looks at what it wants. Nothing slides without a shake, a tap or a let-go first.
- R5. One sled at first. The next waits in view and comes to the start on the child's next shake after the one before has got down to the bottom.
- R6. Whoever runs into somebody ends up with them on one sled: a runner hops onto whom it meets, and a stander is scooped onto the runner. At most four high.
- R7. An empty quilt is patted, by the same touch: each pat draws a quarter of the snow back up as feathers. The last pat leaves it fat and the grass green, and everybody hops home to the top. This is how it begins again.
- R8. A tap on somebody at the bottom sends them hopping back to the top; a drag carries anyone anywhere.
- R9. The sun, tapped, goes down: everyone hops up and rides down once over the snow as it lies, with lanterns, and Mother Holle sleeps. A shake or a tap on the moon is morning.
- R10. Put away at any instant, the village is found as left. No words, no numerals, no counts, no rewards, no learning goal, nothing by date.

### Scope Boundaries

No window to close, no separate snow shapes or tools, no recorded sound, no music.

## Planning Contract

- KTD1. The rules are a pure one-dimensional heightfield (`snow.ts`) and a fixed-step world (`village.ts`) with no renderer; `play.ts` takes pointers.
- KTD2. Look: Quilted patchwork (3D), the first look set aside; Stacked contour-card terrain is the backup. Raw three.js, one material over one atlas, all puff in geometry.
- KTD3. No three.js object at module load.
- KTD4. Template frozen files untouched; `state.ts`, `scene.ts` and `input.ts` are replaced by `save.ts`, `village.ts` and `play.ts`.
- KTD5. The sheet in `games/mother-holle/ART.md` holds the design decisions.

## Implementation Units

- U1. Sheet and its check. U2. `layout.ts`, `snow.ts`, `village.ts`, `play.ts`, `save.ts`, `guide.ts`, `voices.ts`, each with tests. U3. View: fabric, puffs, figures, land, quilt. U4. Mount, tiers, budget test. U5. Refinement passes, cold playtest, intersection audit. U6. README row, registry row, shelf line, cover.

## Verification Contract

`npm run check`; `npm run build`, `npm run egress:built`, `npm run education:built`; `npm run check:intersections -- mother-holle --ci`; `npm run perf:jam -- mother-holle`.

## Definition of Done

All gates green locally and on CI, draft pull request open, what is not tested said (no child, no iPad, no ear).

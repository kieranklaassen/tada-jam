# Art direction: one quality bar, a different look for every game

Every Tada Jam game must meet the same **quality bar**, and every game must **look different**. Claymation is Pebble Table's style, not the jam's. A new game picks an unclaimed visual direction, spikes it, and registers it below before building.

## 1. The shared quality bar

A game ships only when it meets every line. The bar is style-independent: a paper-craft game and a claymation game are held to the same standard.

- **Alive at idle.** Something breathes, blinks, sways, or drifts while the child just watches. It never asks, flashes, or beckons, and it stops when the game is unattended or hidden.
- **Motion and sound on every touch.** Nothing the child does lands in silence on a still screen. Sound is synthesized (or a repo-committed clip under the Δ3 allowance).
- **Weight, squash, and follow-through.** Objects have physical weight. They squash on landing, stretch on pickup, and springs overshoot and settle. Characters anticipate before they act and follow through after.
- **Kid-clear.** Big, distinct silhouettes; few objects; an uncluttered background; strong figure-ground contrast. Countable pieces sit on a surface of a contrasting hue and temperature. What can be touched looks touchable.
- **Wordless clarity for the declared age.** The manifest's `ageBand` names who the game is for, and a child at the bottom of that band can work out every interaction from cues alone: what can be touched looks touchable, one next act is offered at a time, and the world answers physically instead of with a verdict. No words or numerals on the kid side (the wordless check in `npm run check` fails the build) and no voice instructions. Which cues work at which age is in [`docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`](solutions/conventions/wordless-clarity-for-the-declared-age-band.md).
- **Wordless guidance.** When the child is idle, the game shows (never tells) one possible next act: a glow on touchable things, a ghost hand demonstration, an inviting wiggle. It backs off, stops after a few tries, and vanishes on any touch. No text, no voice instructions, no verdicts.
- **60 fps on a mid-range iPad.** Target an A12-to-M1-class iPad in Safari WebGL2 at DPR 2:
  - Cap DPR at 2.
  - Keep draw calls under about 80: merge rigid props, instance anything that repeats.
  - No real-time shadow maps: use blob or baked contact shadows.
  - At most one full-screen post pass.
  - Build geometry once, not on every mount.
  - Pause the render loop when unattended.
  - Measure it with a scripted walkthrough: about 60 fps average and no frame over 25 ms in normal play.
- **Procedural or committed assets only.** No external URLs, CDNs, remote fonts, textures, HDRIs, or models (Tada R20). Prefer procedural textures drawn at runtime; compress anything committed.
- **Its own art direction.** A screenshot must be recognisably this game, and something a kid would screenshot.

Say in the PR how the game meets each line, with a measured frame rate.

## 2. Each game picks its own style

1. Pick a direction nobody has claimed (the registry below).
2. Spike it: render the game's real scene in that style, screenshot it at 1180×820, and measure the frame rate at DPR 2.
3. Register it here in the same PR, with a link to the game's own art guide (for example `games/<key>/ART.md`).

Styles may share techniques (merged meshes, blob shadows, the ghost-hand guidance) but not a look. Two games should never be mistakable for each other in a screenshot.

## 3. Claimed styles

| Game | Style | Art guide |
| --- | --- | --- |
| Pebble Table | Claymation 3D: plasticine with thumbprints, stop-motion lighting, terracotta on cool sage-teal | [`games/pebble-table/ART.md`](../games/pebble-table/ART.md) |
| Felt Meadow | Felted wool 3D: a needle-felted nature table, heathered dyes, soft fuzzy halos on a few hero objects, light and saturated pieces on a mid-dark sage hill | [`games/felt-meadow/ART.md`](../games/felt-meadow/ART.md) |
| Light Garden | Glass and light table 3D: frosted sea-glass creatures and glass tools on a milky light table in a dim teal room, beams of additive primary light | [`games/light-garden/ART.md`](../games/light-garden/ART.md) |
| Frog Choir | Dusk-pastel toon 3D: three-step cel shading, plum ink outlines, a firefly that lights in stepped bands, coral-to-butter frogs on lilac pads over mint water under a peach sky | [`games/frog-choir/ART.md`](../games/frog-choir/ART.md) |
| Shadow Lantern | Paper-craft diorama: layered cut paper on deep indigo, a brass lamp throwing geometric shadows onto a lit paper screen, offset dark shadow cards | [`games/shadow-lantern/ART.md`](../games/shadow-lantern/ART.md) |
| Bedtime Forest | Picture-book gouache 3D: opaque pigment in 2–3 painted tone bands, dry brush, a loose brown ink line, paper grain; warm animals in blue-green woods under an apricot-to-violet dusk | [`games/bedtime-forest/ART.md`](../games/bedtime-forest/ART.md) |
| Turning Tower | Geometric (Monument Valley): faceted flat-shaded towers on stepped plinths under a peach-to-lavender dusk, orthographic, with a hard hue split (mint paths, sunflower handles, indigo wanderer) | [`games/turning-tower/ART.md`](../games/turning-tower/ART.md) |
| Critter Clay | Claymation 3D, second entry (owner-approved): a clay workshop bench in cool daylight, cobalt, lemon, and bubblegum-pink plasticine on a slate-blue board, 12 fps boil only while moving | [`games/critter-clay/ART.md`](../games/critter-clay/ART.md) |
| Hillside Spring | Painterly, Ghibli-like: a hand-painted terraced garden, unlit painted scenery, cel-lit movers, afternoon light shafts, gold bamboo on sage | [`games/hillside-spring/ART.md`](../games/hillside-spring/ART.md) |

## 4. Menu of unclaimed directions

These came out of Pebble Table's 10-style concept exploration, scored for kid clarity (1–5), artistry (1–5), and iPad performance risk. Claymation is taken; the rest are open. Each note says what makes it read and how to keep it at 60 fps.

| Style | Kid clarity | Artistry | iPad risk | What it is, and how to build it cheaply |
| --- | --- | --- | --- | --- |
| Picture-book gouache | 5 | 5 | Low–Med | Storybook look: opaque gouache colour fields, dry brush, a loose ink line around everything. Ramp shader with 2–3 painted bands, inverted-hull outlines, one paper-grain pass with no depth read. Best combined clarity and artistry in the set. |
| Rainbow wood | 5 | 4 | Low | Grimm's-style stained beech toys, a colour per character. Plain PBR, one tiling grain texture tinted per object, lathe and capsule primitives, baked contact shadows. The cheapest good-looking option. |
| Paper-craft diorama | 5 | 4 | Low | Layered cut paper on folded stands. Extruded SVG cards with paper grain, offset shadow cards instead of real shadows. Top clarity; objects feel light rather than weighty. |
| Painterly, Ghibli-like | 4 | 5 | Low–Med | Sunlit farmhouse table, painted light. Hand-painted albedo rendered unlit for static props, half-Lambert on moving ones. Heavy on painting time and texture memory (atlas at most 2k, compressed). |
| Soft pastel toon | 5 | 3 | Low | Sunny pastels, squat round characters. Toon material with a 2–3 step ramp, optional outlines, blob shadows. Very readable, but the most generic "kids' app" look. |
| Geometric (Monument Valley) | 3 | 4 | Low | Faceted low-poly on a stepped plinth under a dusk gradient. Flat shading, no textures. Needs a strong hue split so countable pieces don't blend into the palette. |
| Knitted / crochet yarn | 3 | 4 | Low–Med | Amigurumi characters on a knitted blanket. Tiling knit normal and AO maps, clean UVs. Keep the play surface plain: stitch texture everywhere is noise behind counting. |
| Felted wool | 4 | 5 | Med–High | Needle-felted nature table. Fresnel rim plus fibre-noise normal and a fuzz shell on a few hero objects only (real multi-shell fur is 8–16× overdraw). |
| Glass and light table | 3 | 5 | High | Glowing sea-glass pieces on a light table. Fake the glass (matcap, fresnel, emissive core), never real transmission. Bloom and transparency sorting are the iPad frame-time killers; weak figure-ground. |

Where a style scores low on clarity, the fix is usually palette (split the hue of countable pieces from the surface) and outline (give every piece a hard silhouette).

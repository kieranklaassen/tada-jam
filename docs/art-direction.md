# Art direction: claymation

Tada Jam games share one look: a plasticine tabletop set, shot like a stop-motion film, running at 60 fps on an iPad. Pebble Table is the reference build (`games/pebble-table/view/`). New games should reuse its clay kit rather than invent a second style.

## The bar

- **Everything is clay.** Soft matte surfaces with thumbprints and tool drags, shapes that are round and slightly lumpy, never CAD-perfect. If a prop would be wood or metal in real life, it is clay painted that colour.
- **A kid can read it at a glance.** Big, distinct silhouettes; few objects; uncluttered backdrop; strong figure-ground contrast. Countable things (stones) are one clear colour on a surface of a contrasting temperature: terracotta stones on a cool sage-teal table.
- **Motion carries the charm.** Real physics weight, squash on landing, stretch on pickup, springs that overshoot and settle, characters that anticipate and follow through. A still frame should look good; a moving one should feel alive.
- **Calm, not busy.** Idle life breathes and blinks; nothing flashes, beckons, or nags. Guidance is a gentle glow and a ghost hand that appear only when the child is idle.

## Palette

Warm set, cool stage. The backdrop and props are warm; the play surface is cool so the warm pieces pop.

| Role | Colour | Notes |
| --- | --- | --- |
| Backdrop / floor | `#f2e2c6` / `#e9d4b3` | Warm cream, fog to the same colour |
| Table slab | `#7fa4a6` | Cool sage-teal; never rust or orange under rust pieces |
| Stones | `#c9683d` | Terracotta clay, identical by design |
| Bag | `#dcaa3c` with cream cord `#efe1c3` | Mustard |
| Scale | wood-clay `#9a5a38`, pans ochre `#d8a54c` | |
| Rug, bowl | `#e8d7b6`, `#f0dec2` | Cream |
| Plates | `#3f9a8e` | Teal |
| Characters | rabbit `#e6d3b2`, bear cub `#a0613d`, hedgehog `#efd8b0` with spikes `#6b4a33` | Black bead eyes with a white shine, pink cheeks |

All colours live in `PALETTE` in `view/clay.ts`.

## How it is built (and why it stays at 60 fps)

- **One shared clay material** (`MeshStandardMaterial`, vertex colours, roughness about 0.6, double-sided) with a procedural thumbprint normal map drawn on a canvas at startup. Nothing is fetched or committed as an image.
- **Merged meshes.** Each rigid prop (bag, scale post, beam, bowl, knife, shelf rack) and each character part is built from primitives with `piece()` (lump, place, paint) and merged into one geometry: one draw call each. Characters are six parts (body, head, eyes, mouth, two arms) so they can animate.
- **Lumps are geometry, not shaders.** `lump()` pushes vertices along their normals with 3D noise once, at build time.
- **Contact occlusion is baked** into vertex colours (`paint()` darkens vertices near the surface they sit on). No AO pass.
- **Blob shadows, no shadow maps.** One instanced mesh of soft radial blobs; height above the ground widens and fades each blob. The same trick, in warm light, draws guidance glows.
- **Instanced stones.** All stones are one draw, with per-instance squash matrices and brightness.
- **One post pass.** A single merged effect: gentle tilt-shift depth of field (the near and far table edges soften), a warm grade, a soft vignette, then ACES tone mapping. DPR is capped at 2; MSAA is off at DPR 2.
- **Budget.** About 45 draw calls in a full Fair Feeding scene (target under 80), one full-screen pass, zero network requests. The render loop stops whenever the game is unattended or hidden.
- **Geometry is built once per page** (`once()` in `view/models.tsx`), so swapping mats never stalls a frame.

## Motion rules

- **Stones** are cannon-es rigid bodies. Landing drives a squash spring (`springStep`, stiffness about 330, damping about 11); pickup stretches; a held stone follows the finger with a little lag, which reads as weight, and passes through other stones instead of shoving them.
- **The beam** is a spring toward an honest tilt, slightly underdamped: it overshoots once and settles. It is silent when level.
- **Characters** breathe and blink out of phase with each other, turn their heads toward what matters (clamped so a child still sees their face), hop when a stone lands on their plate (anticipation squash, jump, landing squash, wobble), munch together (lean back, three chomps, follow-through), and pop in with an overshoot.
- **The bag** anticipates before it tips, lurches, then wobbles back; it slumps as it empties; on first open it wiggles and a stone peeks out.
- **Stop-motion boil** (per-frame surface jitter) is allowed only if it costs nothing in smoothness. It is off by default and not built yet.

## Guidance (style-independent)

`guidance.ts` decides what to demonstrate; the view only draws it. After 3 seconds of idle, touchable things glow; after 5 seconds a big cartoon ghost hand (a camera-facing sprite, identical in every scene) shows one next act and carries a translucent stone for drags. Demonstrations back off (5, 10, 20, 40 seconds) and stop after four per idle stretch. Any touch fades everything at once. No text, no voice instructions, no verdicts.

## Checklist for a new jam game

1. Use `view/clay.ts` (palette, material, `piece`, `merge`, textures) and the `Stage` pattern from `view/stage.tsx`.
2. Keep the countable pieces warm on a cool surface (or the reverse), and never the same temperature.
3. Stay under 80 draw calls: merge rigid props, instance repeats, no shadow maps, one post pass.
4. Give every touch a squash, a spring, or a hop, and every idle character a breath and a blink.
5. Measure: 60 fps at 1180×820, DPR 2, with the scripted walkthrough; no frame over 25 ms in normal play.

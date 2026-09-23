# Pebble Table: ten refinement passes

The owner asked for shader fur ("the hair looks a little bad") and ten passes to make the scene more refined. Each pass: screenshot at 1180×820 (DPR 2) → honest critique → one focused set of fixes → re-screenshot → fps check.

**How each pass was measured.** A fixed Fair Feeding table is seeded into storage (three guests with two stones each, one leftover in the bowl so the knife is out, loose whole stones and two halves). The shot is taken 6.4 seconds after load, so the idle glow and the ghost-hand demonstration are in frame. Frame times are then sampled for 4 seconds with no screenshots (headless Chrome on an Apple M4, DPR 2). Pass 7 uses a seeded Honest Scale table, because that pass changed the scale.

Screenshots are in the Project store under `media/pebble-table-v3/` (`iter-00-before.png` to `iter-10.png`, `before-after.png`, `pebble-table-v3-walkthrough.mp4`).

| Pass | Critique (what reads badly or looks cheap) | Change | fps (avg / p99 frame) |
| --- | --- | --- | --- |
| 0: before | Guests are smooth balls; hedgehog spikes are pasted-on cones. Colours are soft and pastel. Stones read as flat orange discs from the high camera. Side guests are near profile. The bowl is a shallow dish. Halves are slivers. Scale rods are hair-thin and straight. The glow disappears on the cream rug. | Baseline | 60.0 / 16.8 ms |
| 1: shader fur | Fur needed to be sculpted clay, not realistic hair. The first shell pass covered the bear's light belly and muzzle and read like towelling. | Instanced clay-tuft shells over rabbit and bear body and head: alpha-tested against fat tool-stroke tufts, darker root and lighter tip, soft rim, breath and wind sway in the vertex shader. Front-facing surfaces stay bare so faces and bellies read cleanly. Shell count 3 to 6 from on-screen size. Hedgehog quills are instanced tapered clay spikes that sway out of phase. | 60.0 / 16.8 ms |
| 2: camera | The 56° camera flattens stones into discs and shows the tops of heads. | 46° pitch, 27° lens, target nudged back. Stones gain visible thickness; guests face out more. | 60.0 / 16.8 ms |
| 3: guests | Guests are small for a four-year-old; side guests still read as profiles; eyes are small dots. | Guests 14% bigger, turned further toward the child (head-look clamp tightened), bigger bead eyes with a double shine, seats moved back so bodies clear the plates (guest collision radius 58 → 64). | 60.0 / 16.8 ms |
| 4: colour and light | Washed out and pastel; guests sit flat against the table. The first try (grade before tone mapping) turned the bag's highlights pink and washed the table out. | Deeper sage table, warmer backdrop; warmer, stronger key, less ambient, cool fill, and a new rim light from behind. The grade moved after ACES tone mapping and became a display-space S-curve plus saturation; warmth eased back after a too-gold try. | 60.0 / 16.8 ms |
| 5: stones | Stones still look like flat lozenges with a dull finish. | Domed pebble profile (thicker on top), underside shading baked into vertex colours, a lower-roughness clay sheen, tighter and darker contact shadows. | 60.0 / 16.8 ms |
| 6: bowl and halves | The bowl reads as a saucer; halves are slivers that don't look like half a stone. | Deep flared bowl with a rolled lip and a darker floor (physics wall 3.2 → 4.8 cm to match). Halves and quarters are the whole pebble with flat cut faces, drawn as their own instanced meshes. | 60.0 / 16.8 ms |
| 7: scale | Pencil-thin beam, hair-thin straight hangers, flat pans. A deeper pan first try hid the stones in it, so it was reverted. | Chunky beam with bead collars, twisted clay-rope hangers (three times thicker), rolled pan rims at the original pan depth. | 60.0 / 16.8 ms |
| 8: guidance glow | The idle glow is invisible on the cream rug; the leftover's glow drew under the new, deeper bowl floor. | Golden ring texture (clear edge, soft core) that breathes in size; glows and shadows for stones in the bowl sit on the bowl floor. | 60.0 / 16.8 ms |
| 9: handmade detail | Empty stools are plain cylinders; the rug edge is bare; thumbprints on the slab are faint. | Pinched clay cushions with a piped seam and button, a rolled clay rope around the rug hem, deeper slab thumbprints. No new props where a child plays. | 60.0 / 16.8 ms |
| 10: sound and final polish | Sounds were unchanged since the 2D slice: bright wooden ticks, a plain sine number voice, thin munch. The focus band was tuned for the old camera. | Clay sound pass: dull thocks with a low body, soft pats, a muffled cloth-bag clatter, a marimba-like number voice, a blooming chord, "nom" munches, a boing hop, and a small procedural room reverb. Tilt-shift focus moved onto the play area; vignette slightly stronger. | 60.0 / 16.8 ms |

**Whole-game check after pass 10.** The scripted walkthrough (spill, sweep, feed, knife, scale, portrait; about 57 seconds) runs at 59.9 fps average, 99th-percentile frame 16.8 ms, with one frame over 25 ms, the same as before the passes. The draw count rose from about 45 to about 55 (fur shells, quills, three stone meshes, rug rope), still under the 80 target.

## Still weak

- The fur is convincing at play distance but reads as flocking up close; the tuft pattern needs a real flow direction per body part (it follows sphere UVs, which pinch at the poles).
- The rabbit's ears and the bear's arms have no fur shells, so they read as smoother clay than the body.
- The backdrop is still one flat colour; a soft, out-of-focus room behind the table would add depth.
- The new sounds were tuned by reasoning, not by ear on an iPad speaker; they need a listening pass.
- Not yet measured on a physical iPad.

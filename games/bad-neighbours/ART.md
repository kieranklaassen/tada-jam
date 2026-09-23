# Bad Neighbours art: pixel-drawn city façades

Bad Neighbours' own visual style: flat, pixel-crisp apartment façades drawn in canvas 2D, stacked on a construction slab in front of a hazy blue city at midday. This style is claimed by Bad Neighbours. The jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md).

## The look

- **Every building is a little street of lives.** Seven façades (café, laundromat, terracotta terrace, bluebird apartments, red row, olive shop, night owl), each with brickwork, shutters, sills, plants and air conditioners drawn inside the exact square-cell collision outline. Nothing decorative sticks out past the physics.
- **Residents are the charm.** Tiny pixel people walk behind the windows, curtains slide, the laundromat drum spins and the Night Owl's television flickers. Tipping a building makes them throw up their arms and spill books, socks, plants and papers; a lost building sends its resident down on a parachute.
- **Kid-clear.** Saturated, warm façades against a pale, cool sky and a desaturated skyline. One falling building at a time, a dotted drop guide, and the next delivery pinned on a paper note.
- **Wordless.** Address plaques are dots, not numbers. The controls are icons only.

## Palette

| Role | Colour |
| --- | --- |
| Sky | `#94cce7` → `#b7dfeb` → `#d4e6db` |
| Distant city | `#8ab0b9`, `#95b9bc`, `#9cc0c1`, `#a1c8d0` |
| Façades (main) | café `#d6aa59`, laundromat `#d2c6a4`, terrace `#dd7754`, bluebird `#6b92ad`, red row `#cb644e`, olive `#8c9f77`, night owl `#879eaf` |
| Lit windows | `#e6b369`, `#ffce75` |
| Slab | `#3a4d59` with a `#d4b35f` hazard stripe |
| Ink / controls | `#233c50` on paper `#fff3d9` |

## Performance

Canvas 2D, no WebGL. Each façade is drawn once into a sprite; only residents animate. The background city is painted once per resize. Physics (matter.js) runs at a fixed 120 Hz, and settled buildings become static colliders, so tall towers stay cheap.

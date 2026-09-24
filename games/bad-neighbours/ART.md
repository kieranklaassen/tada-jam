# Bad Neighbours art: pixel-drawn city façades

Bad Neighbours' own visual style: flat, pixel-crisp apartment façades drawn in canvas 2D, stacked on a construction slab in front of a hazy blue city at midday. This style is claimed by Bad Neighbours. The jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md).

## The look

- **Every building is a little street of lives.** Seven façades (café, laundromat, terracotta terrace, bluebird apartments, red row, olive shop, night owl), each with brickwork, shutters, sills, plants and air conditioners drawn inside the exact square-cell collision outline. Nothing decorative sticks out past the physics.
- **Residents are the charm.** Tiny pixel people walk behind the windows, curtains slide, the laundromat drum spins and the Night Owl's television flickers. Tipping a building makes them throw up their arms and spill books, socks, plants and papers; a lost building sends its resident down on a parachute.
- **Kid-clear.** Saturated, warm façades against a pale, cool sky and a desaturated skyline. One falling building at a time, a dotted drop guide, and the next delivery pinned on a paper note.
- **Wordless.** Every window has the same small wall lamp where an address plaque would be: nothing is numbered or counted. The controls are icons only.

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

- **Adaptive quality** ([`quality.ts`](quality.ts)). The governor watches its own frames: 40-frame (or 2 s) windows with each window's longest frame left out; two bad windows, or one averaging over 26 ms, drop a tier, and one over 34 ms drops two; six clean windows in which nine frames in ten did under 8 ms of work step up. A fresh upgrade is judged on 12-frame windows and one bad one takes it back and makes it a ceiling; one that fails later doubles the wait before the next climb. Touch devices start one tier down. `?tier=N` pins a tier.

  | Tier | Pixel ratio cap | Pedestrians | Buildings with moving residents | Particles | Props in the air | 120 Hz steps a frame may catch up |
  | --- | --- | --- | --- | --- | --- | --- |
  | 0 | 2 | 9 | 40 | 64 | 72 | 6 |
  | 1 | 1.5 | 9 | 16 | 48 | 48 | 5 |
  | 2 | 1.25 | 5 | 8 | 24 | 24 | 4 |
  | 3 | 1 | 3 | 4 | 12 | 12 | 3 |

  The canvas also keeps a total budget of two million pixels. Residents keep moving in the newest buildings, at the top of the tower where the child is looking; the older ones show their façade. A slow frame catches up at most the tier's steps and drops the rest, so it never asks the next frame for more.
- **Grown-up handle.** `window.__jamPerf` (the declaration every game shares) reports the frame's own work, the tier, and the sprites and figures drawn.
- **Frame budget** ([`frameBudget.test.ts`](frameBudget.test.ts)), counted rather than timed: through a twenty-storey tower and a collapse braced with scaffolding, exactly two physics steps a 60 Hz frame, at most 32 contact pairs and 10 moving bodies a step, and each tier's catch-up cap.
- The audio context is built, suspended, a second after load, so the first tap is not a long frame.

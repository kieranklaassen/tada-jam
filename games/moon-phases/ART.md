# Moon Phases art: brass orrery by lamplight

Moon Phases' own visual style: a brass-and-walnut orrery on a varnished table in a dim room at night, lit by a single warm sun lamp, with a starry or daytime sky seen from the child's home. This style is claimed by Moon Phases. The jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md).

## The look

- **An instrument, not a diagram.** Turned brass stands, a spoked gear train that turns with the moon's arm, an engraved brass scale for the moon's path, enamel phase medallions set into the table, a counterweight on the arm.
- **Light you can see.** One lamp, parallel rays with travelling pulses that stop where they hit Earth or the moon. Only the sun lights the moon, so every phase on screen is physically right.
- **A real place.** Earth turns; the child stands at their home (profile country, or a tap on the globe). The round window and the "stand on Earth" view show their sky: blue by day, dusky orange at sunset, starry at night, with the moon up or set, and flipped south of the equator.
- **Kid-clear.** Three big bodies (sun, Earth, moon) with glass pins over them; everything else is the warm, softer setting. One pulsing ring on the moon invites the first drag.
- **Wordless.** Icons, phase pictures and a day/night dial. No numbers, no words.

## Palette

| Role | Colour |
| --- | --- |
| Room | `#070a16` night blue, wall gradient `#1a0f0b` → `#0b1030` |
| Brass | `#d4a456`, dark brass `#8f6530` |
| Table | walnut `#462816` → `#8a5832`, varnished |
| Sun lamp | `#ffd46e` core, `#ffbf6b` pool of light |
| Moon | `#c4c0b4` lit, fully dark night side |
| Day sky | `#5c8fcc` horizon → `#143d9e` zenith; dusk `#ff7330` |
| Glass UI | `rgba(16, 18, 30, 0.58)` with `#f6f2e8` active states |

## Performance

Procedural textures painted once at load, then uploaded, with every tier's shader programs compiled, behind the opening curtain. No shadow maps (contact shadows are blobs).

- **Few draws, few materials.** On a slow device most of a frame is draw submission, and every distinct material costs a full uniform upload. The eight medallion bodies are one instanced draw and their enamel faces another (the phase pictures share one atlas, and each instance reads its cell and glows by its own amount). All metalwork (bright brass, dark brass, blackened steel) is one lacquered material coloured per vertex: what never moves is one draw, and the arm, the pinion and the big gear one each. The child is two draws. The main view is 21 draws (24 with the halves on).
- **The round window never stalls the GPU.** Its view is drawn in a corner of the screen, copied to a texture on the GPU, and laid into the main canvas as a disc under the brass ring (the button itself is clear). Earth, its clouds and air, the moon and the sun draw there with their own copies of their materials, so they never switch between the screen's programs and the post target's.
- **Adaptive quality** ([`quality.ts`](quality.ts)), with the same governor as Bad Neighbours: 40-frame (or 2 s) windows, the longest frame left out, a step up only after six clean windows in which nine frames in ten did under 8 ms of work, a fresh upgrade on probation (one bad 12-frame window takes it back and makes it a ceiling). Touch devices start at tier 1 and never climb to tier 0: its depth of field and film grade are extra full-screen passes an iPad's budget (one post pass) has no room for, so it is the desktop look. `?tier=N` pins a tier.

  | Tier | Pixel ratio cap | Post chain | Bloom blur levels | Multisampling | Window refreshed | Frosted glass |
  | --- | --- | --- | --- | --- | --- | --- |
  | 0 | 2 | depth of field, bloom, film grade | 5 | 4× | every frame | yes |
  | 1 | 1.5 | bloom | 3 | off | every 3rd frame | yes |
  | 2 | 1.25 | output pass only | - | off | every 3rd frame | no |
  | 3 | 1 | output pass only | - | off | every 4th frame | no |

  Without bloom the lamp's glow sprite burns brighter, so the lowest tier still reads as a lit room. The canvas also keeps a total budget of 2.4 million pixels.
- **Grown-up handle.** `window.__jamPerf` (the declaration every game shares) reports the frame's own work, the tier, draw calls and triangles.
- **Frame budget** ([`frameBudget.test.ts`](frameBudget.test.ts)), counted rather than timed: it builds the real scene with blank textures, drives the moon all the way round with the halves on and a step onto Earth and back through the real per-frame logic, and counts the draws each view submits the way three decides them. Each tier has an average and a worst-frame budget, and each tier down must submit less.
- Earth and the moon are hit-tested as spheres; the sun's rays are laid again only once the moon has moved by a pixel's worth; the pins move on every other frame (every frame while a finger turns the view) and only by whole pixels, and the day dial only by a visible turn; a moon swept fast rings one bell per beat, not per phase; the audio context is built, suspended, during the opening flight.

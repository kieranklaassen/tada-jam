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

Procedural textures painted once at load. No shadow maps (contact shadows are blobs). On touch devices the post chain is bloom only; desktops add a shallow depth of field and a film grade (vignette, grain), and fall back to bloom only, then to 1× resolution, if frames run long.

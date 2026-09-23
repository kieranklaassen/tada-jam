# Light Garden art: glass and light table

Light Garden's own visual style: a Montessori light table glowing in a dim teal room, with frosted sea-glass creatures and glass tools on it, and beams of light you can see. This style is claimed by Light Garden; the jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The techniques below (opaque fake glass, additive light ribbons, one batched sprite pass, a selective half-resolution glow) are reusable; the glowing-table look is not.

## The look

- **The table is the light.** A warm, milky panel is the brightest thing in the room: cream at the centre, cooling to teal at its edges, set in a dark teal glass slab with a thick glowing lip and a thin line of light piped along the near edge, in a dim teal room. Everything a child can touch sits on that glow.
- **Glass you can read at a glance.** Every glass thing is opaque fake glass: a frosted pastel body lit from the panel below, a soft overhead glint, and a bright opaque rim. Silhouettes are chunky: a little glass lighthouse lamp, a bevelled prism, silvered mirrors in brass frames, slabs of coloured glass, and four plump creatures, each carrying its colour in its tint. Turning knobs are small frosted beads in their piece's own glass on a brass collar, so they never outshine the pieces.
- **Light is the toy.** Beams are ribbons of additive light: a slim core and a wide soft wash landing on the frosted panel. Red, green, and blue are pure primaries, so crossing beams really add up on screen: red and green read yellow, all three read white. Glass lit by a beam answers in its own way: a filter fills with its colour, a prism stays pale aqua with rainbow edges, a mirror only glints.
- **Calm, dreamy, alive.** Sleeping creatures breathe and dream of the colour that wakes them (little orbs of that light float above them). One sleeper at a time is the scene's want: it turns toward the child and dreams out loud. Awake, each moves in its own way. Nothing flashes or beckons; the ghost hand appears only when the child is idle.

## Palette

Warm light, cool room. Colours are authored in display space in [`view/palette.ts`](view/palette.ts) and written straight to the canvas (no tone mapping), so additive light blends the way it looks.

| Role | Colour | Notes |
| --- | --- | --- |
| Room | `#091618`, glow `#1a3336` | Dim teal, brightest round the table |
| Table slab | `#1a3033`, lit lip `#5c8f8c`, sides `#081213` | Dark teal glass with a fine frosted speckle, darker than the panel so the play area reads |
| Panel | centre `#b8b5a1`, edge `#4f6969`, rim `#9ec7c2` | A warm milky glow held just short of washing out the coloured beams |
| Tray | felt `#112426`, slots `#0a1a1c` | |
| Light | red `#ff291a`, green `#1fff38`, blue `#2957ff` | Pure primaries so mixes add up |
| Moth | near-white glass, lilac forewings, rose hindwings, violet eyespots | Wakes in white light; its colour lives in the wings so bright light cannot wash it out |
| Fish | coral | Wakes in red light |
| Snail | amber coil, pale cream body | Wakes in yellow (red + green); the coil stays pigment awake so shell and body still read apart |
| Jellyfish | aqua | Wakes in aqua (green + blue) |
| Metal | brass on lamps, mirror frames, and knob collars | The only warm metal; it ties the tools together |

## How it is built (and why it stays cheap)

- **Opaque fake glass, never transmission.** One `ShaderMaterial` ([`view/materials.ts`](view/materials.ts)): a matcap-like environment (ceiling light above, the glowing panel below), a fresnel rim mixed to an opaque bright rim colour, a frosted body that scatters the panel's light, an emissive core when light passes through, and per-vertex part ids for lenses, mirror faces, prism facets, eyespots, and knobs. Markings that must survive waking light (the moth's eyespots, the snail's coil) are pigment and take little of the awake glow. Because glass is opaque there is no transparency sorting and no overdraw on pieces. Creature parts (wings, bell, tentacles, tail, fins, eye stalks) move in the vertex shader from three pose numbers, so a creature is still one draw call.
- **Merged meshes, built once.** Each piece kind and each creature is one merged geometry from primitives (colour, part id, and glow weight per vertex); the table, slab, and tray are one more.
- **Light is additive and batched.** All beams are one preallocated ribbon geometry (a camera-facing core, a flat wash on the panel, and a thin line inside glass). Glows, caustic decals, sparkles, dream orbs, ripples, and dust motes are one instanced additive sprite batch; blob shadows and eyes are one instanced shade batch. A full garden is 18 draw calls, 23 with the glow pass.
- **One selective glow pass.** In the top tier only, beam cores, sparkles, and motes are re-rendered at half resolution, blurred in two small separable steps, and added back in one full-screen pass. Broad halos and caustics stay out of it, so glass never blooms to white. Lower tiers fake the glow with wider sprite halos. No threshold bloom, so glass edges never smear.
- **Figure-ground on a bright panel.** Opaque bright rims, blob contact shadows under everything, a darker slab and panel vignette, and a dim room.
- **Rest costs half.** After 20 seconds of rest (untouched, nothing held or flying, no demonstration, nobody waking) the stage renders every other frame, and the governor ignores those frames. The lowest tier (DPR 1, no glow pass, no motes or caustics, wider halos) still reads as the same glass garden.
- **Grown-up overlay.** Triple-tap the invisible top-left corner for frame rate, frame time, CPU time, missed frames, tier, DPR, draw calls, and triangles, with buttons to pin a tier. `?fps=1` shows a wordless bar graph instead.

## Motion

Each creature has its own routine ([`motion.ts`](motion.ts)); no two share one, and `motion.test.ts` fails if their paths or gestures match:

- **Jellyfish** pulses: a sharp squeeze and a slow relax lift it, and it sinks between beats, tentacles trailing. As the want, it floats up in its sleep.
- **Moth** sleeps with its wings folded back into a tent, flutters in restless loops when awake, lands, fans its wings, and flutters again. As the want, it lifts its antennae and half-opens its wings, sniffing for light.
- **Snail** oozes out of its shell stalks first and slides in slow peristaltic waves. As the want, one stalk peeks out and springs back.
- **Fish** sleeps on its side, wakes with a C-start, then bursts and glides in figure eights. As the want, it swims a couple of lazy tail beats in its sleep.

A poke is the child's own touch, so it never reuses a reaction built for a game event. Each creature has two answers, taken in turn (never the same one twice running), each with its own sound in that creature's voice: the moth flurries up in a loop or hides under its wings and fans them wide; the fish dodges sideways in a C or twirls once round; the snail tucks in and scoots back or rears up with both stalks out to see who is there; the jellyfish boings up high or sparkles with its tentacles splayed. A poked sleeper also dreams out loud for a moment, which tells the child what colour it wants. `motion.test.ts` fails if two answers are near-copies or a poke copies the stir or the nudge.

Moving creatures ease around each other instead of flying through, so two silhouettes never merge. Pieces have weight: lifted pieces rise and lag the finger a little, drops squash and ripple the panel, a tap turns a piece one step with a springy overshoot, and a woken creature sometimes nudges a nearby piece in its own way (the fish headbutts, the snail leans, the moth bumps it from above, the jelly buzzes it), which wobbles and springs back while its beam wobbles with it.

## Guidance (style-independent)

`guidance.ts` decides what to demonstrate; the view only draws it. From the first frame one sleeper is the want (the one the next act is for) and dreams out loud; the others dream quietly. After 3 seconds idle, touchable pieces glow and every sleeper's dream brightens; after 5 seconds a ghost hand shows one next act for the want, chosen from the table (tap the lamp toward it, bring the prism or a filter into the white beam, carry a sleeper into a spot already lit in its own colour, bring a mirror to a coloured beam). The ghost's press gets a small silent answer so the demonstration shows what the move does without doing it: the lamp swings part of a step and back, a tray piece hops, a sleeper stirs. While a demonstration runs, the sleeper facing the child is the one the ghost hand is helping. A dream orb swells and sparkles while its primary already reaches the sleeper, so the missing part of a mix is the one left dim. Demonstrations back off and stop after four; any touch clears them. No text, no voice, no verdicts.

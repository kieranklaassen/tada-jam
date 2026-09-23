# Frog Choir art: dusk-pastel toon 3D

Frog Choir's own visual style: a lily pond at dusk built like a toy diorama on a table, drawn as a cel-shaded cartoon. This style is claimed by Frog Choir. The jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The techniques below (stepped toon ramp, inverted-hull outlines, rigid-bone rigs in one draw call, a light that is a shader band instead of a lamp) are reusable; the dusk pond is not.

## The look

- **Dusk, not noon.** "Soft pastel toon" is the jam's most generic kids'-app look, so this pond is lit by a setting sun: a painted peach-to-lilac sky with a low sun and rim-lit clouds, mint water that blushes pink near the bank, lilac lily pads, and a gold rim on the side of every frog that faces the sunset. Shadows are lilac and plum, never grey or black.
- **Cel shading with a hand-drawn line.** One `MeshToonMaterial` with a three-step ramp (dark, mid, lit) and flat vertex colours. Every character and prop has a plum inverted-hull outline, thicker on frogs than on reeds so the frogs lead.
- **The firefly is the light.** It is the only moving light in the scene, and it lights in bands: pads, water, and frogs brighten in three stepped rings around it, so its glow looks drawn, not rendered. When a frog sings the firefly flares.
- **Five frogs, five people.** Each frog has its own hue, size, silhouette prop, voice, and way of moving, so a child can tell them apart with the sound off. Showoff (coral, a lily flower on its head), Bouncy (sky blue, spots and tufts), Sleepy (big and green, a floppy lilac nightcap), Shy (butter yellow, small, holds a leaf parasol), Crooner (tan, warts, round spectacles, bushy brows, a bow tie).
- **A kid can read it at a glance.** Warm frogs on cool pads on mint water; big eyes and big throat bubbles; one moving glow. Near pads are big and far pads are small, so "near is low, far is high" reads as depth before it is heard as pitch.
- **Calm.** Idle life is breathing, blinking, and each frog's own fidget. The only loop is the firefly's slow drift; nothing flashes, counts, or asks.

## Palette

Warm characters, cool stage, a warm sky.

| Role | Colour | Notes |
| --- | --- | --- |
| Sky | `#a995d8` → `#ffe2ae` in six bands | Painted once to a canvas; a low sun `#fff4cf`, peach clouds |
| Bank, bushes | `#6fae9c`, `#79b9a0` | Cool sage mounds with a gold top rim |
| Water | `#8fd8c6` near, `#b9e3d2` far, `#f4c7c0` dusk band | Shader bands, not gradients; sun glints `#fff1d6` |
| Lily pads | `#c7a2e4` with a light heart `#dcc2f2` and veins | Six slightly different lilac tints |
| Outline | `#574373` | Plum; never black |
| Firefly | glow `#ffe48c`, tail `#fff27a`, body `#5b4668` | The only warm light |
| Showoff, Bouncy, Sleepy, Shy, Crooner | `#ff9270`, `#72bdf0`, `#8fd173`, `#ffd873`, `#d9a36b` | Cream bellies, pink cheeks `#ff97ad` |
| Guidance glow | `#ffe07a` | A warm ring under a pad, readable on mint water |

Scene colours live in `PALETTE` in [`view/palette.ts`](view/palette.ts); the frogs' colours live in `CAST` in [`view/frog.ts`](view/frog.ts).

## How it is built (and why it stays cheap)

- **One toon material, patched.** `MeshToonMaterial` with a three-texel ramp, extended in `onBeforeCompile` with the firefly's stepped light bands, the directional sunset rim, and reed sway. No lights beyond one warm key and one hemisphere fill.
- **Characters are one skinned mesh each.** Every frog is built from primitives, painted with vertex colours, and merged into one geometry whose parts are bound rigidly to 14 bones (body, head, lids, pupils, mouth, throat bubble, arms, legs, prop, cheeks). Squash, blinks, the throat bubble, and every gesture are bone transforms. The outline hull shares the same skeleton, so a frog is two draw calls.
- **Instanced everything else.** Pads, pad outlines, pad ripples, blob shadows, guidance rings, and tap ripples are each one `InstancedMesh`. The bank, bushes, stones, and reeds are merged meshes.
- **Particles move on the GPU.** The firefly trail and the far fireflies are `Points` with their motion in the vertex shader; the CPU only writes a birth time.
- **No post pass, no shadow maps, no antialiasing buffer.** Outlines hide aliasing; blob shadows ground the frogs.
- **The camera frames itself.** A 30° lens pitched 41° down; on every resize it pulls back until the near pads touch the bottom edge, the widest row fits, and the far frogs' heads stay below the painted sky, which is refitted to fill the top.
- **Tiers.** Four adaptive tiers (DPR 2, 1.5, 1.25, 1) with hysteresis. Lower tiers drop far fireflies, shorten the trail, shrink the halo, hide pad outlines, and freeze reed sway. `?tier=N` pins one; `?fps=1` shows a wordless frame-time bar graph.
- **Nothing allocates per frame**, geometry is built once per page, and the loop stops whenever the game is unattended or hidden.

## Motion rules

Every frog has its own idle, anticipation, reaction, carry pose, and landing ([`view/personalities.ts`](view/personalities.ts)). None of them share a routine.

- **Showoff** struts in a slow sway, winks, and sings with a fast double swell and arms flung wide. Tapped, it crouches, pirouettes, and winks. Carried, it flies like a superhero. It lands with a "ta-da" and its flower springs.
- **Bouncy** bops on every beat and turns its whole body to follow the firefly. It sings in two puffs with a little jump. Tapped, it backflips. Carried, its legs cycle. It lands in decaying boings.
- **Sleepy** breathes deeply, nods off, and yawns now and then; its lids stay half shut. It sings a slow hum with a big, slow bubble. Tapped, it startles awake and its cap flies up. Carried, it dangles limp. It lands like jelly.
- **Shy** looks at its feet, blinks fast, and blushes as the firefly nears. It sings a small bubble with its eyes shut. Tapped, it hides behind its leaf, then peeks out. Carried, it curls up and trembles.
- **Crooner** sways like a lounge singer and conducts on the beat; its brows rise when the firefly comes close. It sings with a vibrato bubble and a sweeping arm. Tapped, it bows and pushes up its spectacles. Carried, it stays stiff with a hand on its glasses. It lands, settles, and bows.
- **Pads** bob on the water, dip and ring when a frog lands or a finger taps them, and lift a little when a carried frog hovers over them.
- **The firefly** drifts left to right across the columns in a slow loop and turns toward where it is going. Tapped, it does a loop-the-loop.

## Sound

All sound is Web Audio synthesis; nothing is recorded or fetched. Each frog has its own voice on its note: Showoff a bright sawtooth scoop, Bouncy two square-wave plucks, Sleepy a low triangle hum with a sub an octave down, Shy a breathy sine whistle an octave up, and Crooner a formant-filtered sawtooth an octave down with late vibrato. Pads plink, water bloops, lifts and landings thump by weight, a frog dropped in the water splashes, and tapping the firefly chimes. Everything goes through one soft lowpassed echo, like sound over still water.

## Guidance (style-independent)

`guidance.ts` decides what to demonstrate; the view only draws it. Before the very first touch, the frog nearest the child puffs its throat and bounces toward them (at most three times). After 3 seconds idle, the frogs' pads glow warm; after 5 seconds a big ghost hand taps the nearest frog, and once the child has tapped, it carries a translucent frog to another pad instead. Demonstrations back off and stop after four per idle stretch. Any touch clears everything. No text, no voice, no verdicts.

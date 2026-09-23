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
| Lily pads | `#c7a2e4` with a light heart `#dcc2f2` and veins | Tinted by row on a five-step ramp, `#d8ccf6` (near, low notes) to `#ffeff1` (far, high notes), so the scale can be seen |
| Splash | `#eefffa` | Droplets thrown when a frog drops in the water |
| Outline | `#574373` | Plum; never black |
| Firefly | glow `#ffe48c`, tail `#fff27a`, body `#5b4668` | The only warm light |
| Showoff, Bouncy, Sleepy, Shy, Crooner | `#ff9270`, `#72bdf0`, `#8fd173`, `#ffd873`, `#d9a36b` | Cream bellies, pink cheeks `#ff97ad` |
| Guidance glow | `#ffe07a` | A warm ring under each pad that can be touched, readable on mint water, plus a cream-gold band around every frog's silhouette |

Scene colours live in `PALETTE` in [`view/palette.ts`](view/palette.ts); the frogs' colours live in `CAST` in [`view/frog.ts`](view/frog.ts).

## How it is built (and why it stays cheap)

- **One toon material, patched.** `MeshToonMaterial` with a three-texel ramp, extended in `onBeforeCompile` with the firefly's stepped light bands, the directional sunset rim, and reed sway. No lights beyond one warm key and one hemisphere fill.
- **Characters are one skinned mesh each.** Every frog is built from primitives, painted with vertex colours, and merged into one geometry whose parts are bound rigidly to 14 bones (body, head, lids, pupils, mouth, throat bubble, arms, legs, prop, cheeks). Squash, blinks, the throat bubble, and every gesture are bone transforms. The outline hull shares the same skeleton, so a frog is two draw calls.
- **Instanced everything else.** Pads, pad outlines, pad ripples, blob shadows, guidance rings, tap ripples, and splash droplets are each one `InstancedMesh`; the droplets are hidden when no splash is in flight. The bank, bushes, stones, and reeds are merged meshes.
- **Particles move on the GPU.** The firefly trail and the far fireflies are `Points` with their motion in the vertex shader; the CPU only writes a birth time.
- **No post pass, no shadow maps, no antialiasing buffer.** Outlines hide aliasing; blob shadows ground the frogs.
- **The camera frames itself.** A 30° lens pitched 41° down; on every resize it pulls back until the near pads touch the bottom edge, the widest row fits, and the far frogs' heads stay below the painted sky, which is refitted to fill the top.
- **Tiers.** Four adaptive tiers (DPR 2, 1.5, 1.25, 1) with hysteresis. Lower tiers thin the far fireflies (14 down to 4), shorten the trail, and shrink the halo, and the bottom tier hides the pad outlines, which are about a pixel wide at DPR 1. The monitor steps down after two slow seconds and drops two tiers at once when a second is far over budget, so a very slow device settles within about 5 s. It climbs back only after ten steady seconds, and never into a tier that was just slow. Touch devices start one tier down and earn the top the same way. `?tier=N` pins one; `?fps=1` shows a wordless frame-time bar graph.
- **Game code allocates nothing per frame.** A sampling heap profile finds only the browser's boxed timestamps, about 300 B a frame. Geometry is built once per page, and the loop stops whenever the game is unattended or hidden.

## Measured performance

These numbers come from the production build and the jam probe: 1180×820, DPR 2, touch, twelve taps over 15 s after 5 s of warm-up. The machine is a GPU-less cloud VM. Chromium's WebGL there is SwiftShader (`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))` from `WEBGL_debug_renderer_info`); WebKit reports only "Apple GPU" but is software too. So frame rates are fill-bound and far below an iPad's, and CPU time is the number that transfers. No physical iPad was measured. [`REFINEMENT.md`](REFINEMENT.md) has the per-pass numbers.

| Measure | Result |
| --- | --- |
| Chromium, 6× CPU throttle, `cpuP95Ms` | 4.1, 5.0, and 5.8 ms over three runs (target under 8 ms); median frame 2.2 to 2.9 ms |
| Chromium, 4× CPU throttle, `cpuP95Ms` | 3.1, 4.0, and 4.1 ms |
| Chromium, 20× CPU throttle | `cpuP95Ms` 17.3 and 20.4 ms, median 10 to 11 ms, 7.6 to 7.8 fps at the bottom tier; Pebble Table 1.8 fps in the same session. A CPU profile at 20× spends 13.3 of 14.9 s in native code (SwiftShader); the largest script costs are three.js's program and matrix updates, the game's own posing adds about 100 ms over 12 s, and GC 18 ms |
| WebKit, same session as Pebble Table | Frog Choir 26.4 and 27.7 fps, p95 frame 39 to 43 ms; Pebble Table 21.7 and 21.9 fps, p95 frame 81 ms |
| Frame-budget test (`perf.test.ts`, in CI) | The busiest pond costs the controller and five personalities about 0.01 ms a frame (budget 0.15 ms) |
| Draw calls | 30 at the top tier, 29 at the bottom, one more while a splash is in flight |
| Triangles | 144k at the top tier, 138k at the bottom |
| Post passes, shadow maps | None |
| Tiers | Four, with hysteresis and `?tier=N`; at 6× with touch the pond starts at tier 1 and reaches the bottom 2.2 s after load (4.7 s from the top tier) |
| Garbage | About 300 B a frame of browser timestamps; at 6× with taps, four minor GCs in 15 s (longest 5 ms throttled) and no major GC |

## Motion rules

Every frog has its own idle, anticipation, reaction, carry pose, and landing ([`view/personalities.ts`](view/personalities.ts)). None of them share a routine, and [`view/personalities.test.ts`](view/personalities.test.ts) fails if two frogs' reactions to any event come within 0.3 of each other.

- **Showoff** struts in a slow sway, winks, and sings with a fast double swell and arms flung wide. Tapped, it crouches, pirouettes, and winks. Carried, it flies like a superhero. It lands with a "ta-da" and its flower springs.
- **Bouncy** bops on every beat and turns its whole body to follow the firefly. It sings in two puffs with a little jump. Tapped, it backflips. Carried, its legs cycle. It lands in decaying boings.
- **Sleepy** breathes deeply, nods off, and yawns now and then; its lids stay half shut. It sings a slow hum with a big, slow bubble. Tapped, it startles awake and its cap flies up. Carried, it dangles limp. It lands like jelly.
- **Shy** looks at its feet, blinks fast, and blushes as the firefly nears. It sings a small bubble with its eyes shut. Tapped, it hides behind its leaf, then peeks out. Carried, it curls up and trembles.
- **Crooner** sways like a lounge singer and conducts on the beat; its brows rise when the firefly comes close. It sings with a vibrato bubble and a sweeping arm. Tapped, it takes a stage bow, leaning aside with its free arm swept wide (the camera looks down, so a straight bow would foreshorten away), then pushes up its spectacles. Carried, it stays stiff with a hand on its glasses. It lands, settles, and bows.
- **Carrying** lifts a frog just above the fingertip. Over each pad it softly tries that pad's note in its own voice. Let go right above a pad, it falls with weight and lands in its own way. A frog whose pad is hovered scoots aside and looks up at the visitor, because letting go there swaps them. Dropped in the water, a frog throws a crown of droplets and hops home.
- **Pads** bob on the water, dip, flush warm, and ring when a frog lands or a finger taps them, and lift a little when a carried frog hovers over them.
- **The firefly** drifts left to right across the columns in a slow loop and turns toward where it is going. Tapped, it does a loop-the-loop. Its touch area trails it along the last 0.3 s of its path, so a child who taps where they saw it still catches it.

## Sound

All sound is Web Audio synthesis; nothing is recorded or fetched. Each frog has its own voice on its note: Showoff a bright sawtooth scoop, Bouncy two square-wave plucks, Sleepy a low triangle hum with a soft partial on its note and a sub an octave down, Shy a breathy sine whistle an octave up, and Crooner a formant-filtered sawtooth an octave down with late vibrato. The five were balanced offline through a tablet-speaker model to within 0.9 dB of each other. Each frog has one mouth, so a new note fades the one it is still singing, and a child tapping fast re-sings the note instead of stacking copies. Pads plink, water bloops, lifts and landings thump by weight, a frog dropped in the water splashes, and tapping the firefly chimes. Everything goes through one soft lowpassed echo, like sound over still water.

## Guidance (style-independent)

`guidance.ts` decides what to demonstrate; the view only draws it. Before the very first touch, the frog nearest the child puffs its throat and bounces toward them (at most three times). After 3 seconds idle, the frogs' pads glow warm; after 5 seconds a big ghost hand taps the nearest frog, and once the child has tapped, it carries a translucent frog to another pad instead. Demonstrations back off and stop after four per idle stretch, and the glow fades after the last one, so an idle pond goes quiet except for the firefly's song. Any touch clears everything and restarts the ladder. No text, no voice, no verdicts.

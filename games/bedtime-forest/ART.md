# Bedtime Forest art: picture-book gouache 3D

Bedtime Forest's own visual style: a storybook clearing painted in opaque gouache, like a spread from an Elsa Beskow picture book, running on an iPad. This style is claimed by Bedtime Forest; the jam-wide quality bar and the claimed-styles registry live in [`docs/art-direction.md`](../../docs/art-direction.md). The techniques below (part-skinned animals, merged scenery with per-home uniforms, a screen-space sky, one post pass) are reusable; the gouache look is not.

## The look

- **Everything is painted.** Flat, opaque pigment in two or three tone bands (a cool violet shadow, the colour itself, a warm light), never a smooth gradient. The band edges wander because a procedural dry-brush texture pushes them around, and the same texture varies the pigment a little, so every surface looks brushed rather than rendered.
- **A loose brown ink line around everything.** Inverted hulls pushed out in screen space, thicker and thinner along each shape like a brush line. Ink is warm brown (`#3d2a1f`), never black, and goes cooler and softer at night.
- **Paper under the paint.** One full-screen pass multiplies a static paper grain (tooth, fibre, a soft cloud) and nudges the image by about a pixel of static noise, so painted edges wobble like a hand-drawn line. It never moves and never reads depth.
- **Warm animals in cool woods.** The six animals are the warmest, most saturated things on screen (rust fox, red-orange fish, cobalt songbird, cocoa bear, tawny owl, oat rabbit), against blue-green crowns and a yellow-green meadow. The youngest child finds them at a glance.
- **Dusk, night, morning.** An apricot horizon under a violet sky; at night the whole forest is graded to moonlit blue, the camera tilts up a little to show the full moon rising with its ink ring and stars coming out one by one, and each lit doorway glows warm, so the whole bedtime (six sleepers, moon, and stars) fits one page. At dawn the moon sets, a painted sun climbs over the treeline, and the light brightens to pale gold before it eases back to dusk.
- **Calm, not busy.** Idle life is yawning, blinking, breathing, glancing. Nothing flashes or nags. Guidance is a painted cream ring and a ghost hand that appear only when the child is idle.

## Palette

| Role | Colour | Notes |
| --- | --- | --- |
| Ink | `#3d2a1f` | Warm brown line on everything |
| Sky | top `#46558f`, mid `#a784a6`, horizon `#f3b27c` | Dusk; night `#121838` → `#3a4a7e`; morning `#7fa9d6` → `#fde6b4` |
| Meadow | `#93ab58` → `#5d7a44` → `#3b5a3c` | Light grass in the clearing, moss toward the woods, a sandy path `#b9a46e` |
| Woods | leaves `#4b7a4a` / `#335c44` / `#79a257`, firs `#2f5a4d`, trunks `#7a5236` | Cool and quiet so animals pop |
| Homes | earth `#95693f`, rock `#8e879b`, water `#467fa6`, nest `#a47a44`, doorways `#24160f` | Doorways glow `#ffc75e` when their animal sleeps |
| Animals | owl `#a8703b`, fox `#e2682a`, rabbit `#c7b39c`, bear `#7a4b2a`, fish `#f05a36`, songbird `#3f7fcf` | Dark eyes with a white highlight; owl eyes amber |
| Guidance | ring `#fff3cf` | A cream ring readable on the grass at dusk |
| Shadow | `#2b2350` | Violet, not grey, like a gouache shadow |

All colours live in `PALETTE` in [`view/palette.ts`](view/palette.ts). Colours are display sRGB and the shaders paint in display space, so nothing converts them.

## How it is built

- **One gouache material** ([`view/gouache.ts`](view/gouache.ts)) for every painted surface: vertex-colour pigment, half-Lambert light split into bands at about 0.45 and 0.78 whose edges are perturbed by the dry-brush texture, sampled biplanar in each shape's rest space so strokes stick to a body as it moves. Water gets painted ripples; doorways mix toward the glow colour. The dusk/night/morning grade, the light, and the haze are shared uniforms, one write per frame.
- **The dry-brush texture** is painted on a canvas at startup: 520 wrapped strokes (red channel), bristle speckle (green), soft clouds (blue), seamless. Nothing is fetched.
- **Animals are part-skinned.** Each animal is one merged geometry whose vertices carry a part index; the vertex shader applies `parts[part]` from a uniform array of rigid matrices computed on the CPU. One fill and one ink draw per animal, however many ears and legs it has. Fill and ink share the same matrix array.
- **Scenery is one merged geometry.** Trees, flowers, mushrooms, stones, and all six homes: one fill draw and one ink draw. Each home's pieces carry part = home index + 1, so uniform arrays can shake a home when it is knocked or bumped and light its doorway, with no extra draws.
- **The sky is one screen-space triangle** drawn at the far plane after the opaque scene, so it only paints the pixels the forest leaves uncovered: banded wash, dry-brush clouds, a far painted treeline, the moon, the dawn sun, and hashed stars. When the camera tilts up at night the sky shifts with it.
- **Nearest first.** At build time the merged scenery's pieces are reordered nearest-first along the camera's forward direction, and the meadow draws after everything standing on it, so the depth test throws away hidden fragments before they're shaded. It costs nothing at runtime and matters most on fill-bound GPUs (WebKit's software GL gained 8 to 18%).
- **Overlays in three draws** ([`view/overlays.ts`](view/overlays.ts)): instanced ground decals (violet blob shadows that spread and fade with height, the breathing guidance ring), one points cloud (dust, splashes, leaves, sparkles, snore bubbles, feathers, fireflies, and a warm halo round each lit doorway), and the ghost hand (a canvas-painted gouache hand on a camera-facing quad).
- **No lights, no shadow maps, no tone mapping.** Light is in the shader; shadows are blobs.
- **Budget.** 19 draw calls at full quality, 20 while the ghost hand shows (target under 80); about 173k triangles; one full-screen pass; zero network requests; geometry built once. The render loop stops whenever the forest is unattended or hidden.
- **No hitches.** Every shader is compiled before the first frame, hidden ones too (the ghost hand). The canvas outputs linear because the shaders paint display sRGB themselves, which also gives the screen and the paper pass's target one shared set of programs, so a tier change that drops the pass never recompiles the scene.
- **Adaptive quality** ([`perf.ts`](perf.ts)). Four tiers chosen from measured frame intervals with hysteresis: full (DPR 2, paper pass, 12 fireflies), DPR 1.5, DPR 1.25 with 6 fireflies, and minimal (DPR 1, no paper pass, half the particles, no fireflies). Touch devices start one tier down (DPR 1.5) and earn the top tier. `?tier=N` pins a tier; `?fps=1` shows a wordless bar graph of frame times.

## Motion rules

Every animal has its own motion personality; none is a shared cycle with different numbers, and none reuses Pebble Table's motions ([`view/rigs.ts`](view/rigs.ts)).

- **Owl:** waddles with a level head; at rest, sways its head and tilts it deeply to alternate sides; for its tricks, turns its head all the way round, or spreads its wings and hops; hangs head-stabilised when carried with slow wing flaps; fluffs up into a ball to sleep; stretches one wing at a time on waking.
- **Fox:** trots on diagonal leg pairs; at rest, glances, flicks its ears, and lifts its nose to sniff the air; yawns in a play-bow; pounces, or chases its tail round and sits panting; paddles all four legs when carried; curls nose-to-tail to sleep; shakes itself dry after the pond.
- **Rabbit:** hops in discrete arcs with ears that follow through; sits up and sniffs; binkies, or sits up tall and thumps twice with its ears swivelling; ears flop when carried; loafs to sleep; ears pop up on waking.
- **Bear:** lumbers in a heavy pace; sits to scratch; yawns arms-up; drums its belly, or rears up and waves; hangs limp and swings slowly and far when carried; wiggles stuck in a small entrance and pops back out onto its bottom; sleeps slumped belly-up.
- **Fish:** hops on its tail across the grass; blubs; puffs up to yawn; backflips, or does a barrel roll; flip-flops when carried; lies on its side and flops home from a dry bed; floats asleep in the pond.
- **Songbird:** two-footed hops with jerky head turns; stretches a wing to yawn; trills, or hovers and flutters; flutters when carried; sleeps as a fluffed ball with its head tucked.
- **Weight.** Carried animals hang from the finger as pendulums: heavier ones lag more and swing slower and further (the bear swings well over one and a half times the songbird). Landings squash on a spring tuned per animal.
- **Kept apart by a test.** [`view/rigs.test.ts`](view/rigs.test.ts) poses every animal through walk, rest, yawn, both tricks, and carry, and fails if any two move too alike (or any trick copies another, the animal's own included), or if the tempo stops following nature (the bear slowest, the songbird quickest).

## Guidance

After 3 s idle, one awake animal gets a breathing cream ring and its home's doorway glows faintly while every animal turns to look toward its own home. After 5 s a ghost hand presses that animal, lifts it, and carries it part of the way toward its home, then sets it down: one move, not the answer. Gaps of 10, 20, 40 s, at most four demonstrations per idle stretch; a few seconds after the last one the ring fades and the animals go back to their evening, and any touch clears everything and starts the idle clock again. On first open, one animal gives a big invitation yawn toward the child (at most three times), and until the first touch the ring and the ghost hand show that same animal, so a newcomer follows one animal from its yawn to the demonstration. No guidance at night.

Only a real carry reaches a home: a tap is a hello (one of the animal's two tricks, taken in turns, right where it stands), and a still hold sets it down where it was. A carried animal always stays in sight under the finger; over the back of the clearing it rises up the finger's ray in front of the homes instead of sinking behind the rock. Drop zones cover what a child sees as the home, including the whole cave rock.

A knock on a home says whose it is: if its animal is up and about, it stops, looks at its home, and calls in its own voice. Nobody spends the evening out of sight: an animal mostly hidden behind a taller one nearer the child steps sideways into view, even while everyone is gazing home.

## Sound

All synthesized with Web Audio ([`audio.ts`](audio.ts)): each animal's voice and yawn, thuds that follow weight, a music-box chime in the animal's own note when it settles, soft snores, the physical sounds of a wrong fit (a pillowy boing, a splash, a slide whistle, a flop), a knock for each kind of home (answered by its animal's call), a moon chime at nightfall, a music-box "Twinkle Twinkle" (public domain) over a soft pad at night, and birdsong at dawn. A small procedural room reverb warms everything. The settle chime is the loudest moment (about -20.5 dB over its loudest 50 ms, rendered offline through the real graph); every other cue, and every wrong fit, sits at least 2 dB under it.

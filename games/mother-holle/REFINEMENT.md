<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: Quilted patchwork, first of the two set aside (backup not spiked).
- Open: not played by a child, not heard by a person, not measured on an iPad.

### Template notes

- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`, `audio.ts`, `overlay.ts`, `rng.ts`: used as copied.
- `guidance.ts`: glow at 2 s and the hand at 3.2 s, sooner than the template's 3 and 5, because earlier games' loops were not clear soon enough to a four-year-old.
- `config.ts`: the game's own tier field (`bits`). `state.ts`, `scene.ts`, `input.ts`, `stage.ts` gave way to `village.ts`, `play.ts`, `save.ts` and `view/`.
- **For the template:** `scripts/intersections` imports a game's modules in Node's strip-only mode, so any module it needs must not use parameter properties.

### For the owner to decide

- Whether a tap on the quilt itself carrying her a step towards the bare grass (so taps alone make a run) stays.

## Pass log

Screenshots at 1180×820 from a production build in Chromium's software renderer, which cannot give an honest frame rate.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | First touch | She looks cross; the sky is grey; everyone is small; a third of the picture is bare grass; feathers are slivers | Lids, brows and mouth; brighter lights and dyes; everyone a quarter larger; flowers, cabbages and a sheep in front; feathers thicker | not measured | Cloud still grey |
| 2 | First eight seconds | Nothing shows a hand doing it | White cloud; a ghost hand does the first shake at 1.4 s; glow and hand sooner; two flakes drawn for each feather | not measured | Full and empty quilt look alike |
| 3 | Heap of four, empty quilt, night | Over a tall heap her face leaves the picture; the empty quilt reads as full | She gathers the quilt up; full it is a row of buns, empty it hangs limp; a lighter night | not measured | Cap just touches the top edge |
| 4 | Tests | A village opened again started to slide; a sled sat in the dip for good; a pat near the sun brought the night; two could wait in one place | Only the showing may set a sled off by itself; a shove out of the dip; the quilt comes before the sun; everybody waits behind the lane; places settled until still | | |
| 5 | Cold playtest (a reader who had seen no code) | Five taps in one place do little; no finish; the cow stands in the way; she looks cross when she blinks | A tap on the quilt carries her a step on; poles and flags at the foot; the cow further back; lashes the other way | | What an empty quilt wants is told by the glow and the hand only |
| 6 | Intersection audit | The quilt through heaps; boards into humps; riders up through each other | She hangs behind the lane, drawn to look the same; sleds laid on their highest touch; up first and then across; seats and sizes measured from the figures | | |
| 7 | Code review (a reader of the code, with 1,500 seeded plays) | A full head sneezed on opening; the quilt rose on opening; a hen snapped into a tub; the evening replayed on opening; a wobbly tap on the sun undid itself | All nine findings fixed, five with tests | | |

## For the pull request

### How the game meets the quality bar

- **Alive at idle.** Everybody breathes, looks and asks in their own way; the cloud drifts; cap and blink.
- **Motion and sound on every touch.** Anywhere that is nobody is the quilt, which billows and lets feathers go in the frame the finger lands. Tested.
- **Weight.** A heavy tub, a quick door, squash on landing; snow slumps; the quilt swings after the finger.
- **Wordless, age 3.** No word, letter, numeral or sign. One asker. The first shake is shown with a hand before anybody touches. Taps alone play all of it.
- **Found as left.** Forty seeded plays put away at random instants and opened again: nothing lost, nothing moves by itself.
- **60 fps.** Measured: 53 draws, 107,000 triangles, about 2 ms of the game's own work a frame on the desk machine here. One texture, no shadow maps, no post pass. The frame rate could not be measured: only a software renderer was here (3 fps, filling pixels), without WebKit. No physical iPad was measured.
- **Nothing through anything.** The audit is enforced; every allowance has its reason.

### The learning claim

None. The game has no learning goal and claims no school skill.

### Defaults taken for the owner

- Band 3 to 7. At five and older the grandmother is out from the first visit.
- She speaks no word; the tale is told by nothing but the featherbed.
- Merged on the owner's word before a child has tried it.

### What the next builder should know

- A long thin board on a curved hill needs to be laid on its highest touch, not on its middle.
- Two lots of depth: putting the giant behind the lane with an equal and opposite scale keeps every hit test and every picture the same and ends all crossings at once.

<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: toy. The sheet, the look spike, the toy and the rules are pushed. The game is not built on the toy: this run stops here, as its brief says.
- Sheet: whole in `ART.md` as it stands at commit `c5edd65`, and unchanged since. Hash of the sheet part (everything above `## The look`): `2bdd3321af364369a6dec9009cc63700c8c293dd8712678156a7a37973bdd404`. Not yet checked.
- Rules: written while the check was still to run, at the builder's own risk, against the sheet at commit `c5edd65`. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: inflatable vinyl toys, the first reserved look. It is clear at the youngest age in software-rendered stills at 1180 by 820, so the second look was not spiked. Its frame rate at pixel ratio 2 is the lead's to take.
- What the Mount shows at load: the toy, on the first moment of a new game (fixed seed), played by the real rule with nothing to finish. `look=pair`, `look=solo`, `look=bunches` or `look=mixed` in the address opens another moment, so each kind and each kind of sky can be seen; `tier=0` pins full quality and `fps=1` shows the grown-up overlay.
- Open: sheet ready for check, round 1

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### For the lead

Requests:

- **The check of the sheet**, round 1, on the text at `c5edd65`.
- **The still and the frame rate** of the look at 1180 by 820, pixel ratio 2, on a real graphics card. The heaviest moment is `look=bunches` (39 draw calls).
- **Loudness.** Nobody has heard the game. Every voice is in `voices.ts` as numbers; the peaks are at or under 0.5 before the template's master gain of 0.6.
- **A registry row** for the claimed-styles table in `docs/art-direction.md`, when the look is accepted: `| Balloon Pop Parade | Inflatable vinyl toys 3D: puffy pool-toy animals and plain balloons with welded seams, a broad sheen and a pale rim, in four saturated hues on a pink air-bed hill under a pale open sky | [games/balloon-pop-parade/ART.md](../games/balloon-pop-parade/ART.md) |`

To know:

- **How the sheet reads the brief.** The brief has one friend who shows two and gets two. The sheet shows the amount by how many friends of one kind come by together (a troop of one, two or three, one balloon each), because whole bodies in a row are the only thing on a friend that a two-year-old can take in as two or three alike. If the amount must sit on a single friend, say so and the representation, the grid and the rules change with it.
- **Records.** Of the eight records in the brief, two are not named: `us-ca 2.1` of the infant-toddler lane and the peuter card's Hoeveelheden / 1. Both are about number words or counting, and the game has neither. Three are added, read through the lookup on 2026-10-03, all confirmed: `us-ca 1.6` of the preschool mathematics foundations, and the peuter card's Hoeveelheden / 3 and Hoeveelheden / 4.
- **Where the rules say a little more than the sheet.** (1) A first visit that starts at `pair-singles` opens with the pass-by for "one for each", which also marks "giving" as shown; the sheet names only "giving" for a new game. (2) A troop served again after one of its balloons was popped does not play the ending a second time. (3) At `bunches-own-colour` a troop of three cannot slip on its first send, since every bunch is its colour and none holds more than three. If the checker finds any of these against the sheet, the rule is the thing to change.
- **Where the cloud page and the guide differ.** The guide says a remote builder's commit messages name no tool; the cloud page gives a fixed last line that names one. The commits on this branch end with the cloud page's line.
- No pull request is opened from this branch: the lead builds it. Stills and probe output were kept outside the repository, and none is committed.
- A subagent wrote the eight rule modules from a brief made of the sheet; it ran no git and touched no existing file.

Not yet fixed, for the game stage:

- The idle guidance ladder (glow, ghost hand) is wired in the Mount as the template has it and shows nothing yet.
- The ending, the step-in, the pass-by, and saving through `save.ts` are rules only; the theatre does not play them and the toy does not save.
- Every kind holds its string in its hand. The duck's beak, the hippo's yawn and the crab's snip are in the motion and not yet in where the string goes; the frog's tongue is drawn.
- Each action has one variant per kind. A director that picks among two or three without repeats is step 6 of the guide.
- A cloud and the hill answer a touch only with the soft sound of the air, not yet with the drops and the dimple the sheet's grid promises.
- A waiting troop of three stands so close that its members overlap, and at the far left the hill hides the feet of the furthest.
- On a narrow (portrait) surface the balloons are about 80 logical pixels across: above the jam's floor of 48, under the 100 a two-year-old should have. A test holds both numbers.
- No audit config yet (`scripts/intersections/games/balloon-pop-parade.ts`). Every mesh is named and every friend's root carries `userData.jamObject`, ready for it. The three batches are instanced and will need `userData.jamInstanceObjects` or an `instances` rule.

### Template notes

One entry a copied file, for the lead and the games after this one.

- `manifest.ts`, `index.ts`, `overlay.ts`, `input.ts`, `scene.ts`, `guidance.ts`, `state.ts` and every copied test: used as copied, byte for byte. `scene.ts` and `guidance.ts` are not yet exercised by this game.
- `state.ts`: wrapped by `save.ts` in the way its header describes (its `deserialize` for its own fields, then the same raw record again for the game's). That worked with no change.
- `config.ts`: changed where it is meant to be: the `LADDER` ids, three `FIRST_VISIT` rows, and three fields on `Tier` with a row per tier. **For the template:** the generated `FIRST_VISIT` gives a band two rows however wide it is; a comment saying a wider band may want a row per year would have saved a look.
- `audio.ts`: used as copied. Its `tick` is no longer played. **For the template:** a voice of more than one partial needs a small builder that every game will write again (`sounds.ts` here: a list of partials, each a tone or a band of noise with a start, a glide, a peak, an attack and a decay). The cloud page asks every remote game to keep its voices as numbers, so that list and its builder could come with the template.
- The Mount (`balloon-pop-parade.tsx`): changed only where its comments say a game goes in: the stage is made beside the audio and the touch; `applyTier` sets the stage's look; `resize` hands the size and the pixel ratio to the stage; `draw` paints; `act` turns gestures into the theatre's press, release and cancel; the loop steps the theatre; the cleanup disposes the stage. **For the template, three things any three.js game meets:** (1) `resize` sets `canvas.width` and `canvas.height` itself, which a `WebGLRenderer` must do through `setSize` and `setPixelRatio`, so those two lines have to go, and a comment could say so; (2) the loop calls `clock.advance(now)` and drops the step it returns, though the comment above says the rules advance by it; (3) nothing says where programs should be compiled ahead of play (`renderer.compile` after the first `resize` here).
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen and untouched.

### For the owner to decide

- **The look**: inflatable vinyl toys, and within it a pink hill, since green is the frog's colour and the friends' four hues have to stand apart from the ground and the sky.
- **The toy**: tap a balloon and it goes to the friend.
- **The amount is the friends themselves.** One, two or three friends of a kind come by together and each wants one balloon, where the brief had one friend showing two.
- **Colour is the only attribute.** The brief says colour first. A second attribute (a long balloon and a round one, say) is not in the sheet. Should one follow later?
- No default of the guide is asked to change.

## Pass log

Every still was drawn in software (SwiftShader) on a paused clock at 1180 by 820. No frame rate is a result here; the frame-CPU column is Chromium at 6 times CPU throttle with tier 0 pinned, on the production build.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike, `look=pair`: two ducks, five balloons, three frogs waiting | The balloons read at once and want to be touched. The ducks are small with pin-prick eyes and stick wings, a cloud sits behind the balloons, the waiting frogs are a green heap sunk in the hill, and a third of the screen is empty pink | Bigger heads, eyes about three times the size, chubby wings; friends drawn larger; the hill flattened so nothing sinks in it and lowered so the friends have the middle of the screen; clouds moved below the row of balloons | Not measured | The waiting troop of three overlaps |
| 2 | All four moments on one sheet | Each kind reads as itself. Two crabs side by side cross claws; a held balloon covers the string of the one above it; the hippo's arms point sideways, so it does not look as if it reaches | Arms swing nearer to straight up for every kind; the crab narrower; the gap between friends, their scale and the waiting troop set so tests hold "side by side without touching"; the sky row raised and its strings shortened; duck and crab hues moved apart after a test found them 37 degrees from each other | Not measured | The far hill is a pale blob with nothing on it yet |
| 3 | The toy, 46 stills of four scripted walkthroughs (press, flight, catch, refusal, lift-off, pop, poke) with each kind | It answers and it is funny: the crab's eyes shooting up, the frog carried off by its bunch. But a pressed balloon goes flat as a plate, the frog's throat covers its whole face, a refused bunch of three hides the crab it hangs beside, the wrong duck (the one with a balloon) does the refusing, and the hippo's eyes vanish when it looks up | Squash kept within what a pillow does; the throat smaller; a refused bunch hangs further out by its own width; the refusal goes to a friend still without a balloon; the hippo looks up without tipping back; the frog's tongue drawn; caps on what one frame may hold after a test of fast tapping drew 35 balloons into a batch of 28 | Frame CPU: p50 5.6 to 5.9 ms, p95 10 to 16 ms over about 75 frames a run (`look=bunches` and `look=mixed`, 33 to 39 draw calls); p50 4.0 to 4.2 ms with 21 draw calls. The p95 is over the 8 ms the jam aims at; at about four frames a second it is the fourth-worst frame of a run, and it was not chased here | The list under "Not yet fixed" above |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far, at the toy stage. No physical iPad was measured, and no frame rate is given: every number below is from a machine with no graphics card (renderer: ANGLE, Vulkan 1.3, SwiftShader).

- **Alive at idle.** Balloons bob and their strings sway; each kind breathes, blinks and fidgets at its own rhythm (the duck's tail, the frog's throat, the hippo's sway, the crab's side steps); the waiting troop bobs. Everything stops while unattended or hidden, since all of it runs on the attended clock.
- **Motion and sound on every touch.** Every press is answered in the same call with a sound, wherever it lands (a test holds this), and a balloon squashes under the finger in that frame.
- **Weight, squash and follow-through.** Balloons spring back past round; friends squash on landing and wobble after; each kind's weight differs (the hippo's toes barely leave the ground).
- **Kid-clear.** At most twelve balloons and six friends, all one flat hue, on a pale sky. Tests hold the sizes: balloons 108 logical pixels across at 1180 by 820, friends wider, bunches further apart than half a balloon, nothing to touch in the bottom eighth.
- **Wordless clarity for the band (2 to 4).** No word, numeral or symbol; `npm run wordless:check` passes. The friends reach up at the balloons from the first frame.
- **Wordless guidance.** Not yet: the ladder is wired and shows nothing (game stage).
- **60 fps on a mid-range iPad.** Not measured. Budget met so far: 39 draw calls at the heaviest moment, about 51,000 triangles, no shadow map, no post pass, pixel ratio capped at 2, geometry built once per kind, the loop paused when unattended. Frame CPU at 6 times throttle is in pass 3.
- **Procedural or committed assets only.** Everything is geometry and shader code; no texture, font or file is loaded. `node scripts/egress-check.ts`, `npm run egress:built` and `npm run education:built` pass.
- **Its own art direction.** Inflatable vinyl toys, in `ART.md` under "The look".

### The learning claim

As the sheet has it, with every check state read through the lookup on 2026-10-03; to be read again on the day of the pull request.

Balloon Pop Parade is designed from four California learning foundations published by a state department, which are foundations and not standards (`us-ca 2.3` of the infant-toddler foundations, and `us-ca 2.5`, `1.4` and `1.6` of the preschool and transitional kindergarten mathematics foundations), and from five statements of Dutch curriculum-institute guidance, which is guidance and not law (Opereren met vormen en figuren / 1 and Hoeveelheden / 3, 4 and 6 of the peuter card, and Opereren met vormen en figuren / 1 of the fase 1 card); all nine records are confirmed.

The sheet has not been checked yet.

### Defaults taken for the owner

- Every default under "Symbols, and the defaults awaiting the owner" in the guide, as written: no symbol, letter or word; no reading on an object; no camera shake and no impact pause (the answer is carried by chains, sound and squash); no speech (the friends' voices are invented and synthesized); the first reserved look; the demo's fantasy and feel kept under a new verb.
- From the sheet: sets of one to three; colour as the one attribute; a cycle judged by slips (none is well, one is mixed, two or more is badly).

### What the next builder should know

- The education lookup prints a record's standing and check state, and the Limits are in the file it names. Two of the brief's eight records turned out to be about number words, which a wordless game cannot carry; read each record against the verb before keeping it.
- A custom `ShaderMaterial` gets instancing for free from three.js's own prefix (`USE_INSTANCING`, `USE_INSTANCING_COLOR`), and the right normal for a squashed form is the normal divided by each axis's scale squared.
- Keep the view as two halves: a pure "theatre" that plays the rules' outcomes and tells a painter where everything is, and a stage that only draws. The theatre's tests then run with no renderer, and one of them (fast random tapping for forty seconds) found a batch overflow that no still had shown.
- Blend every clip in and out of the resting pose over a few frames. Clips that set an arm outright snapped on their first frame until they did.
- Write the string hand's position as plain arithmetic and test it against the meshes once; then nothing in the frame loop has to ask three.js where a hand is.
- On software GL a run of twenty seconds holds about 75 frames, so a p95 is the fourth-worst frame. Report the p50 beside it and the draw calls, and leave the verdict to a real graphics card.

<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: toy, built and waiting for the owner. First run, cut from base commit 2a133cc. This run covered the sheet, the look spike, the toy and the rules, and stops here as the brief says: the game is not built on the toy yet.
- Sheet: whole in `ART.md` at commit aca7545; the sha256 of its sheet part (everything above `## The look`) is `8970639df47bb1e583488fb5883598fda91dde597fd3285b33e42a2b12ae81aa`. It has not been checked. The sheet was changed once after it was first pushed, at that commit: the finger holds the pot and not the cup, because a finger on the cup hides the tea it has to judge.
- Rules: written while the check runs, at the builder's own risk, against the sheet at aca7545: `forms.ts`, `layout.ts`, `world.ts`, `party.ts`, `tastes.ts`, `sitting.ts`, `grid.ts`, `order.ts`, `save.ts`, `pour.ts`, each with its test. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them. They are not wired into the Mount: the toy uses `world.ts` and `pour.ts` only.
- Look in use: blue-and-white glazed pottery, the first and only reserved row. Spiked on the game's real scene and on the toy; clear at age 4 as far as a still can say. Not measured: this machine draws in software.
- What the Mount shows at load: the toy (one cup on its saucer, the pot beside it). With `look=1` in the address it shows the game's real scene with a fixed layout: the Mouse, the Bear and the Hen at a laid table, each cup at its ring. For the lead's still at 1180 by 820: `?chrome=0&look=1#/play/tea-time`; for the toy: `?chrome=0#/play/tea-time`.
- Open: sheet ready for check, round 1

Open besides the check:

- **Requests to the lead.**
  1. `docs/art-direction.md`, section 3: a registry row for the look, when the owner accepts it. Proposed text: Tea Time | Blue-and-white glazed pottery 3D: white tin glaze with one hard highlight, hand-painted cobalt brushwork and crazing, a wall of picture tiles, glazed figurine guests on a plain blue cloth, honey gilt only on what can be touched | `games/tea-time/ART.md`.
  2. The frame rate of the look scene and of a held pour, on a real graphics card at pixel ratio 2. None was taken here.
  3. The loudness of the voices on a real machine. `voices.ts` holds every voice as numbers and `voices.test.ts` holds them in range, but nobody has heard them.
- **Not done yet, by the brief's order of work.** The intersection audit config (`scripts/intersections/games/tea-time.ts`) is not written; meshes are named for it. The model's side is tested: nothing stands in anything on any table the game can lay (`tableau.test.ts`), and the pot keeps clear of every other thing when called, carried and set down (`pour.test.ts`). No motion module for the guests, no frame-budget test, no cold playtest proxy, and no measurement with the shared probe: they come with the game.
- **Findings not fixed.**
  - The toy keeps nothing: put away and opened again, the cup is empty and the cloth dry. `save.ts` holds the whole saved shape and its defensive read, and is wired in with the game.
  - A puddle is flat blots of one colour and reads a little like a stain. The stream is hard to see where it falls in front of tea.
  - A quality tier changes the pixel ratio only. The lathe's slice count is taken from the tier the game starts on and is not rebuilt when the governor steps.
  - The ghost hand shows one move only, holding the pot. It does not yet show the sponge when there is a puddle.
  - In the look scene the guests only breathe, blink and look. A touch on a guest is taken as a touch on the cloth behind it.
  - Where the sheet says the Bear licks tea from his saucer, the rules give only the fact that the saucer is wet (`saucer-wet`); nothing empties the saucer yet. The sponge giving its tea back over a cup is in the sheet's grid and not in `grid.ts`.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a copied file.

- `tea-time.tsx` (the Mount). Changed, as it must be: the table's view and the toy are made in the effect, `draw` takes the frame's seconds and calls the toy, sizing goes to the renderer, a gesture goes to the toy, and `look=1` picks the opening table. **For the template:** `draw` has no way to be given the step the frame plays, and a three.js game needs it for springs and liquid; here `draw(seconds = 0)` is called with the clock's step in the loop and with nothing from `resize` and the load. The comment on `act` says a gesture that changes the state hands it to storage there; a toy that keeps nothing has no call to make, which reads as a gap until the game is built.
- `input.ts`. Used as copied. **For the template:** there is no hold. A finger held on a thing for three seconds drifts more than `TAP_SLOP` (14 px), so the tracker reports a drag. A game whose verb is a hold has to treat `dragMove` within a slop of its own as still holding and `dragLift` as the release (`HOLD_SLOP` in `toy.ts`). A hold gesture, or that pattern written into the file's comment, would serve any game with a press that lasts.
- `audio.ts`. Used as copied. **For the template:** it plays one-shot voices only. A sound that lasts as long as a touch (a running stream) is made here of short grains, one every 90 ms, each built from the level at that moment. A voice that can be held and steered (a pitch, a gain) and let go would be simpler and cheaper for any game with a continuous sound.
- `guidance.ts`. Used as copied. **For the template:** `handPose` shows a tap or a drag. A hold is shown here with the drag's pose and its travel ignored (`guide.ts`); a hold pose would say it outright.
- `state.ts`. Used as copied, and wrapped by `save.ts` as its top comment says. **For the template:** `deserialize` gives no way to tell "not this game's record" from a fresh result, so the wrapper repeats its two tests (is a record, the version matches) before reading its own fields.
- `config.ts`. Changed where it is meant to be: `LADDER` holds the ten position ids and `FIRST_VISIT` its two rows. The tier table is as copied.
- `scene.ts`, `overlay.ts`. As copied. `scene.ts` is not used yet.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`. Frozen and untouched.

### For the owner to decide

- **The look**, at the toy checkpoint: blue-and-white glazed pottery, with glazed figurines as the guests and a plain blue cloth. It is the game's only reserved row.
- **The toy**, at the toy checkpoint: the pot pours for as long as it is held.
- **Where the finger goes.** The brief says hold to pour, let go in time. This build puts the finger on the pot, which waits beside the cup, and never on the cup: a finger on the cup would cover the tea. A tap on a cup, a saucer or the cloth calls the pot over.
- **The pot never runs out.** It is where tea comes from and may go back to. A pot that empties would add "enough for everyone", and a dead end.
- **How much of the claim California carries.** Pouring to a painted ring, the first six positions, is designed from the Dutch records only. The California records come in where two cups are compared, three are ordered and a place is laid. The sheet says so; the alternative is a design that compares containers from the first position.
- No default awaiting the owner had to be broken: no symbol, letter or word, no reading on the object, no camera shake or impact pause, no speech.

## Pass log

One row per pass. The stills were drawn in software with the clock paused before load, so no frame rate could be measured on this machine; the column says so.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The look scene (`look=1`), first still, 0.6 s after the first frame, 1180 by 820 | I can see a bear, a mouse and a hen and three cups with brown tea at different heights, and a pretty wall. But there are thin sticks by the cups and no spoons, a funny ring pattern in the spare saucer, the mouse stands on a dark drum, and everything is far away at the top with a lot of empty cloth below. | The spoon's bowl is turned on the lathe so its hollow shows; every row of a painted form stays inside its atlas region (a face from the region to the plain patch dragged other paintings across the saucer); the stool is white with one band; the camera comes closer and lower; the tray moves toward the child. | Not measurable here (software GL). 36 draw calls, about 32,000 triangles. | The puddle is a flat brown stain. The Bear seems to have eyes on his ears. |
| 2 | The toy: at rest, 1.4 s into a hold, after a hold of 5.7 s, and idle at 6.4 s | The pot is nice and I can press it. But its spout hangs right over the cup, so I cannot see into the cup while it pours; when the cup runs over I see tea in the saucer and then nothing, the puddle is hiding under the saucer; a drop falls on the saucer and not in the cup; and the pot flies very high with a big dark shadow. | The pot stands further off and its spout stops at the cup's rim, the stream arcing the rest of the way; tea that runs over reaches the cloth just past the saucer's edge on the child's side; drops fly out as far as the stream; the pot lifts less and its shadow stays under it; the cup's ear is on the side away from the pot. The idle glow, the ghost hand that holds the pot and the wisp of steam went in with this pass. | Not measurable here. 8 draw calls at rest, 13 in a pour with an overflow. | The stream is hard to see against the tea. The toy sits small in a wide empty cloth. |
| 3 | The pot called by a tap on the cloth next to the cup, and carried over the cup | When I tap near the cup the pot jumps and lands half on the saucer, and on the way it goes through the cup. | A station is taken on the first side of the target that is on the cloth and clear of every other thing; a pot let go over something comes down beside it; a carried or hopping pot rides above the tallest cup. Tests hold all three, and a model test holds that nothing stands in anything on any table of the designed order (the spoons and the tray were respaced to pass it). The Bear's ears lost their dark dots. | Not measurable here. | A hop is a straight arc, so the pot can still pass over a cup on its way, above it. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far, for the toy and the look scene. No frame rate has been measured: this build was made on a machine with no graphics card, and no physical iPad was measured.

- **Alive at idle.** A wisp of steam rises from the spout of a resting pot. In the look scene each guest breathes, blinks and looks from its cup to the pot in its own tempo. All of it runs on the attended clock and stops when the game is unattended or hidden.
- **Motion and sound on every touch.** Every press is answered in the same frame: the pot squashes, its lid rattles and one drop falls; a cup rings at a pitch set by how full it is; a saucer rattles down like a coin; the sponge squelches; the bare cloth thumps and calls the pot. All sound is synthesized from numbers in `voices.ts`.
- **Weight, squash and follow-through.** Pieces squash and ring back on springs, the tea rocks in a nudged cup, the pot rises as it tips, hops in an arc and lands with a knock, the lid chatters while tea runs and drops home after, and a last drop falls after the stream stops.
- **Kid-clear.** Few, large, white pieces on a plain blue cloth; the wall is the only busy thing and is behind everything. What can be touched carries the one warm colour.
- **Wordless clarity for age 4.** No word, letter, numeral or symbol on the kid side, and no `symbols.ts`; `npm run wordless:check` passes. One thing is offered: the pot. The world answers physically: tea runs over a rim into the saucer and onto the cloth.
- **Wordless guidance.** The template's idle ladder: a glow breathes on the cloth round the pot, then a ghost hand holds the pot, backing off and stopping after four showings. It pours nothing.
- **60 fps on a mid-range iPad.** Not measured. Built to the budget: pixel ratio capped at 2 by the tier table, 36 draw calls in the fullest scene so far, no shadow maps (one instanced draw of blob shadows), no post pass, one material for all pottery, geometry built once, the loop paused when unattended.
- **Procedural or committed assets only.** Every texture is painted on a canvas at load from a seeded stream. Nothing is fetched; `node scripts/egress-check.ts` and `npm run egress:built` pass.
- **Its own art direction.** Blue-and-white glazed pottery, the row reserved for this game; the guide is in `ART.md`.

### The learning claim

As the sheet has it, unchecked, with each record's state read on 2026-10-03:

Tea Time is designed from two of California's preschool and transitional kindergarten learning foundations for mathematics (`us-ca 3.1` and `us-ca 3.2` of Mathematics Strand 3.0, department-published foundations, both confirmed), two kindergarten mathematics standards adopted by the State Board of Education (`us-ca K.MD.2` and `us-ca K.CC.6`, both confirmed) and one statement of California's voluntary guidance on social and emotional learning (`us-ca 2.H.1`, in a cross-grade band tied to no grade, confirmed); and from five statements of the Dutch curriculum institute's guidance, which is not law: three fase 1 goals (`nl rw/m/3/02/fase1`, `nl rw/m/3/04/fase1`, `nl ojw/ds/1/01/fase1`) and two bullets of the peuter mathematics card (`nl Inhoud / 2`, `nl Hoeveelheden / 3`), all confirmed. From the California records it takes comparing two cups, ordering three, and a place for each thing; pouring to a level is designed from the Dutch records only. The game says nothing about what a child has reached.

The toy on this branch makes no claim: it has no goal.

### Defaults taken for the owner

- Every default in "Symbols, and the defaults awaiting the owner" of the guide, as written.
- From the sheet: the amounts (a house cup is one cupful, the Hen's ring and the middle cup half of it, the Mouse's ring and the thimble about a seventh); a pour is to taste within about a finger's width of the ring; a house cup takes about four seconds to fill and the stream never speeds up; a party is at most four; the pot never runs out; a first visit at 6 or older starts at `lay-a-place`.

### What the next builder should know

- **Put the finger where it does not cover what the child must read.** The first design had the child press the cup. The finger then sits on the tea. The pot waits beside the cup and is what is held.
- **Stop a spout short of the cup.** A spout that hangs over the cup hides the level as surely as a finger. The tea lands further out than the spout reaches, and the stream arcs the rest.
- **A lathe form that is painted from an atlas must keep every row inside its region.** A face that runs from the region to a plain patch elsewhere in the atlas samples everything between them, and shows as rings of other pieces' paint.
- **Spill past the edge of what overflowed.** A puddle that starts under the saucer cannot be seen until it is large.
- **A matcap can keep a glaze's highlight over painted colour** with one line in the material: where the matcap is nearly white, the output is white whatever the map says.
- **A model test can hold "nothing stands in anything" before there is a scene to audit:** footprints as radii, every pair of standing things on every table the designed order can lay.
- **On software GL a still at pixel ratio 2 can outlast the screenshot's default timeout.** Give it two minutes and take it at device scale.

<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates
- Sheet: round 1, checker label checker-1, six findings, each replacement pasted word for word (nine strings) and nothing else changed above `## The look`; round 2 confirmed by the lead from the diff. The lead's ruling on finding 3: the replacement as written, and the bag stays as designed. The game stands on the sheet with SHA-256 `a7962f540dd3ddf8243418c9bdf5a0aa84f7c26412f37f54c860c91eb8a3e42e` (every line of `ART.md` above `## The look`).
- Sheet change after the reader's reading 1: round 2, checked and pasted by the lead; two replacements (Pib's neck, the cheese's roll), nothing else above the look part changed. The hash above is of the sheet before these two.
- Open: nothing from the builder. Unmeasured: the frame rate. Unheard: every sound.
- Reader, reading 3 (the last): rules 1 to 5 clean, five slight points under rule 6 and one on put-away. All built, no sentence proposed:
  1. An ice hangs straight and never swings, on arrival or carried (`play.ts`, the claw's step and `arrive`; `play.test.ts`, "hangs an ice stiff").
  2. A snack comes back up off the floor once and its next landing holds it; the cheese goes highest (`jar.ts`, `hops`; `jar.test.ts`, "lets a cheese land, bounce once more, higher than anything else does, and stay down").
  3. A burped-out snack sounds where it is drawn to touch: a cheese at the start of each of its two bounces, an ice where its slide ends (`play.ts`, `comeDown`, `touchesOf`; `play.test.ts`, "sounds a burped-out snack where it is drawn to touch the counter").
  4. A tap on a counter snack still flying back turns it round in the air and brings it to the claw, with its call (`play.ts`, `take`; `play.test.ts`, "answers a tap on a counter snack that is still flying back to its place").
  5. Every later bump is drawn as itself, with no more than the speed the snack came with: the cheese bounces off, the egg slips, the jelly sticks, the chilli and its neighbour jump, the ice clacks off. The arriving snack is now picked by the speeds before the two met (`jar.ts`, `bump`; `jar.test.ts`, "draws every later bump as the thing it is too"). The pile's rest tests hold.
  6. Put away in the middle of a pull: the pull ends silently and at once (`play.ts`, `putAway`; `snack-merge.tsx`, the rest path; `play.test.ts`, "ends a pull that is under way silently and at once"). On return the child sees the jar standing upright and still and hears nothing until they touch.
  - Lookalikes the reader named, seen and left as they are: the window's crossing bars and the pane reflection on the jar, the gold idle ring, the doilies, Oon's nose bubble, the wobble cheese's holes, two wisps of steam, the squeezed mouth, the ice cube's inner edge, Mumf's fork and checked napkin, the stool's legs. Each is the thing it is in its place and none stands alone as a sign.
- Reader, reading 2 (a new reader): rules 1 to 5 clean, NOT READY on rule 6 with six (one a child would notice, five slight). All six are built:
  1. An ice that lands on the floor slides on until the glass or a snack stops it (`jar.ts`, `ICE_SLIDE`; `jar.test.ts`, "slides an ice along the floor from where it lands until it meets something").
  2. Two that can join squeeze together for 0.14 seconds and then pop (`jar.ts`, `SQUEEZE`, `mate`; `view.ts`, `squeezed`; `jar.test.ts`, "squeezes two that can join together for a beat, and then pops them into one"; `frameBudget.test.ts`, "draws two that are about to join pressed thin towards each other"). No still: a screenshot takes half a second on this machine.
  3. The wobble cheese's holes are cut through the sweet (`sweets.ts`, `holes`; `sweets.test.ts`; still `game-17-wobble-cheese-holes.png`).
  4. The cap on puffs is a cap on loose dust; a flame, drip or steam is never dropped (`view.ts`, `cap`; `play.ts`, `HELD`; `frameBudget.test.ts`, "never drops a made snack's flame, drip or steam for the cap on puffs").
  5. A touch that lands while a let-go still waits for the claw first carries the let-go out, where the finger lifted, so the snack let go is the one that drops (`play.ts`, `carryOut`; `play.test.ts`, "drops the thing the child let go, not the one tapped just after").
  6. From the lift on, the save holds the snack as dropped where the finger lifted, and the lift asks for a save at once (`play.ts`, `release`, `toSave`; `play.test.ts`, "saves a let-go as done from the lift on, before the claw has carried it out").
  - The back shelf has six jars and ends at 1092 units, clear of the grown-up's corner (`layout.ts`, `BACK_SHELF`, `BACK_JARS`; `layout.test.ts`, "stands no jar of the back shelf in the grown-up corner"). The comment on Pib's neck in `view.ts` is corrected.
- Reader, reading 1 (the lead's reader): rules 1 to 5 clean, NOT READY on rule 6 with seven promises unkept and three differences I had listed. All seven are built, and the trolley is moved:
  1. A sixth kind of snack goes down in the fifth mouthful (`play.ts`, `mouthfulOf`; `scenes.test.ts`, "sends a sixth kind of snack down in the fifth mouthful", six kinds that all hold bread).
  2. A burped snack with chilli rides a flame and leaves a line of smoke (`play.ts`, `stepFlights`; `view.ts`, the flame under a thrown snack; `play.test.ts`, "leaves an arc of smoke ...").
  3. A burped snack with jelly jiggles for four seconds where it lands (`play.ts`, `jiggle`; `view.ts`, the counter; the same test).
  4. A made snack is thrown out as all its things together (`play.ts`, `throwOf`, `airOf`, `flightAt`; `play.test.ts`, "throws a snack of two or three things out as its things fly, together").
  5. Every made snack with fire breathes a flame every 3.4 seconds and every one with frost shivers every 4.2, each on its own beat, in the jar, on the counter and under the claw (`play.ts`, `breathe`, `shivering`; `view.ts`; `play.test.ts`, "breathes a small flame every few seconds wherever the snack is" and "shivers a frosted snack ...").
  6. Mumf looks into the empty jar with one eye, the other shut (`view.ts`, `mumfFace` with `shut`; still `game-12-empty-jar-tipped.png`; no test, the face is drawing only).
  7. The tip's outcome is handed to storage in the move that starts it, and the rest and unmount paths take the change before they settle (`snack-merge.tsx`, `keep`; `scenes.test.ts`, "marks its outcome for storage in the very move that starts it, before a step is played").
  - The trolley: the rail hangs at 82 units, so the trolley's top is below the home control wherever the claw stands (`layout.ts`, `RAIL`, `TROLLEY`; `layout.test.ts`, "runs the rail and its trolley below the home control ...").
- My own reading of the sheet after that, sentence by sentence, found and built: all six things are on the shelf from the first frame (a thing under the claw used to leave its tray empty); a snack with jelly wobbles and one with frost shivers under the claw; a chilli hisses on while it is carried; a made snack with cheese drips, and one with fire and frost steams; the claw hangs behind the jar, so a tipped jar no longer cuts through the snack under it.
- Proposed to the lead, as it stands and the replacement (I have not edited the sheet part):
  - Pib, cheese: "Loves it: its neck shoots up to twice its length with a rising squeal and the stalks twirl" becomes "Loves it: its neck shoots up to half as long again with a rising squeal and the stalks twirl". Twice the length puts the eyes on their stalks above the top of the frame (`figures.ts`, `PIB_NECK`; `frameBudget.test.ts`, "stretches Pib's neck for cheese to half as long again").
  - Cheese, third column of the grid: "Bounces off with a high squeak, twice, like a rubber ball, and rolls to the lowest free place" becomes "Bounces off with a high squeak, twice, like a rubber ball, and rolls on until the glass or another snack stops it".
- Look in use: the first reserved choice, **jelly sweets in a glass jar** (`ART.md`, "The look"), kept by the lead at the toy checkpoint. The second reserved look was not spiked.
- Try first: let the cheese go on the bread (a toastie pops). Tap the chilli on the shelf and let it go on the toastie. Pull the jar's handle towards Mumf and watch him eat a fire toastie. Tap the one at the window. Then build a frozen wobbling cheese for Mumf, a fire egg on toast for Pib and a frozen fire cheese for Oon: their worst faces.
- Stills: `game-01-rest-mumf.png` to `game-18-ice-slides.png` in the wave scratch folder `wave-scratch/snack-merge/` (the three monsters at rest, the six answers of each as contact sheets, the tip of each one's worst face, the next monster coming in, the idle ladder, the empty jar tipped, a burp's flights, a tip with the claw behind the jar; 01 to 06, 12, 15 and 16 are from the round after the reader, 07 to 11, 13 and 14 from before it, with the rail still at its old height and a tray empty), at 1180 by 820, pixel ratio 2, tier pinned to 0, from the dev server restarted before each set. The cold playtest stills are in `playtest/` there, from the production build. The scripts are `r2.mjs`, `sheet.mjs` and `playtest.mjs` in the same folder; working shots are in `work/`.
- Draw count: 33 to 43 at rest and at idle with the glow and the hand, 38 to 50 through a tip, 50 to 62 through a burp, read from the grown-up handle while the stills were taken. One full-surface stamp a frame: the room, cached once for each surface size and pixel ratio; everything else is what moves. `frameBudget.test.ts` counts the real view: the fullest jar with a full counter, the glow and the hand at 80 or under, a burp from it at 90 or under, and each monster through the tip of its worst face, its pose and the next one coming in at 80 or under. **The frame rate is unmeasured**: this machine has no graphics card to measure on.
- Tests and checks, 2026-10-11: `npx vitest run games/snack-merge` 22 files and 283 tests passed (about 14 seconds); `npx vitest run test/games.test.ts` 136 passed; `npx tsc --noEmit` clean; `node scripts/wordless-check.ts` "wordless check passed"; `node scripts/egress-check.ts` "egress check passed". One `npx vite build` for the playtest in Run 2, none after the reader. Not run, by the brief: the whole check, the built-asset scans, the shared frame-rate probe.

What is still weak:

- Nobody has listened to the sounds. Every one, the eighteen answers included, is numbers written from the words of the sheet and held in range and apart by `voices.test.ts`.
- The frame rate is unmeasured, and the room is a full-surface stamp every frame.
- Pib is thin: beside the other two it leaves the wall round it bare.
- No reader has read the folder since the fixes for reading 3, and none of them was looked at in a still.
- Later bumps now move the snacks; the pile's rest tests hold, but a jar in play has not been watched with them.
- The squeeze before a pop is checked by tests only, not by a still.
- A let-go saved before the claw has carried it out lies where the finger lifted; played on, the swing of the claw can put it up to half a bread to the side of that.
- Stills `game-04` to `game-16` show the back shelf with seven jars; it has six now.
- While the jar is tipped it stands in front of the snack under the claw, which shows through the glass, paler.
- Mumf's one eye at the empty jar is checked by a still only.
- While the jar is tipped, the snacks whose turn has not come lie in the jar's low corner, away from the lip, and then slide to the mouth in an arc.
- A snack of three things can be hard to read at a glance (the frozen lava jelly).
- The second run of the cold playtest was on the dev server: one production build was allowed.

Requests to the lead:

- The registry row for `docs/art-direction.md`: its text is at the end of `ART.md`.
- The frame rate on a target, through the shared probe.
- For the brief: restart the dev server before each set of stills (it served old modules three times).

Considered and not built:

- A time limit that lets a snack go when the claw has not arrived: the lift waits for the claw however long it takes, so nothing drops on the way.
- A saved field for the monster's pose or for a tilt: the pose is rebuilt from `ate`, and a snack at rest lies upright.
- A search that rolls a cheese to the lowest free place: the pile does it roughly, and a search would be a second physics.
- A count or a book of the snacks found: the sheet has none, and nothing is dangled.
- The second reserved look: the first held.

### Template notes

- `snack-merge.tsx`: changed where the comments say. The view, the rules and the cast are made in the Mount; `act` hands press, move, lift and cancel to `play.ts`; `onUp` calls `touch.letGo()` because the lift is the act. **For the template:** the loop hands `playing.step` of up to a tenth of a second to the game, and a spring stepped plainly with that goes off to infinity (it did here: the claw left its rail on a slow machine). The comment at the step should say that the game cuts the step into short ones.
- `config.ts`: changed. Backdrop, the tiers' own fields (`puffs`, `glint`), `TAP_PRESSES` 1, the designed order and the first visit by age.
- `state.ts`: used as copied, wrapped by `save.ts` as its header describes.
- `audio.ts`: used as copied; `tick` is no longer imported. `input.ts`, `guidance.ts`, `scene.ts`, `stage.ts`, `rng.ts`, `overlay.ts`, `manifest.ts`, `index.ts` and every copied test: used as copied.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- **For the template:** a canvas game needs a context that counts stamps and strokes to test its frame budget against the real view. I wrote one inside `frameBudget.test.ts`; the template could carry it.
- **For the template:** `IdleLadder` knows nothing of a pile that is still settling or a snack in the air; the Mount touches the ladder while either is true. The comment names scenes only.

### For the owner to decide

- The look, and the three monsters as drawn.
- The paper bag: when a burp finds the counter full, the snacks nearest the bag hop into it and are gone. It is the one thing that can go for good; any snack can be made again from the shelf.
- Every snack has a face, since the snacks are the characters here. In the jar and on the shelf they lie still; only what joining gave a made snack moves (a flame, a wobble, a shiver).
- The first visit is split at seven years: six and under, and no age, find a bread in the jar and cheese under the claw.
- A pull of the handle that gets halfway tips the jar; a tap on it only rocks it.
- A jar of things that never join takes about twenty-eight let-goes before it burps. The jar could be narrower.
- The sounds, once heard.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The first stills of the toy at 1180 by 820: rest, slide, falling, a jar in mid-play, and a jar filled with bread (`work/a-*.png`, `work/b-*.png`) | "The cheese is in a hook and I can put it in the big glass. The purple one wants it, his mouth is open and he dribbles. The green one outside wants it too." "I put lots of bread in and it never burped, it just went up and up out of the top." "All the bread is lying on its side and looks at me sideways." "Then the hook went away and the bread was in the corner." "What is he holding? His arm is in front of it." | One set, "the jar does what it says": the jar burps as soon as a snack lies over its rim, whether or not the pile under it is still, and a snack set down gently counts as landed; the pile comes to rest (it was waking itself for ever); the claw, the jar's rock and the cast are stepped in short steps, so a long frame no longer throws the claw off the rail; a bread sits up when its yawn is over; a chilli hops clear so the one it touched can jump; the claw lets go once it has arrived, so a tap lands within a few units of the finger; the fork stands in front of the paw. Shot again: `toy-1` to `toy-10`. | Not measured (Run 2). Draw count 34 to 60 in the stills. | Mumf's arms read as two dark poles. The ghost hand covers the face of the snack it points at. The trolley stands under the home control when the claw is in the middle (nothing there answers a tap). The wall between the window and the rail is bare but for the lamp. A snack of three things can be hard to read (the frozen lava jelly). Two snacks wedged deep in a full jar can press up to a quarter of a radius into each other. The sounds are unheard. |
| 2 | The toy's stills again with a full jar and with taps (`work/c-*.png`), and the lead's notes on Run 1 | "I only touched it and the cheese fell, I did not mean to." "The ones at the bottom are squashed into each other." "They never stop wriggling." "His arms are two sticks." "The hand is on the cheese's face, I can't see it." | One set, "nothing happens that I did not do": a touch over the jar carries the claw there and lets go only at the lift, once the claw has arrived; the pile comes to rest by itself (sleepers no longer wake each other, only a snack's first bump throws it, resting snacks rub to a stop; 480 let-goes, none laid to rest by force, the deepest pair at rest 4.3 units); the live fall and the saved rest are one computation, the burp included; snacks in the jar and on the shelf lie still; the ghost hand shows its touch under or beside the target. Shot again: `work/rest-0.png` to `rest-2.png`, `work/idle-*.png`. | Not measured. Draw count 35 to 41. | Mumf's arms, see pass 3. |
| 3 | The three monsters at rest and the eighteen answers as found on load (`work/rest-*.png`, `work/pose-*.png` before the fix) | "The purple one has funny corners on his arms." "The green one's neck is a lump." "The green one and the orange one are little and the purple one is huge." "When the green one eats cheese his eyes go off the top." | One set, "each one large and itself": Mumf's arms are two tapered strokes that bend at an elbow inside the seat, with paws on the counter; Pib's neck is thinner and rises from its shoulders; Pib and Oon are drawn larger about the stool's seat; Pib's long neck and drooping stalks stay inside the frame. Shot again: `game-01` to `game-06`. | Not measured. Draw count 35 to 41. | Pib is thin beside the other two. |
| 4 | The scenes in motion: the tip for each monster's worst face, the next monster coming in, the empty jar tipped, the idle ladder (`work/tip-*.png`, `work/next-*.png`, `work/gag-*.png`, `work/idle-*.png`), and the cold playtest | "The hand goes into the glass and goes away. Do I touch the glass?" "When a new one popped it was inside the other one for a bit." "I tapped the egg and got the cheese." | One set, "what I touch is what I get": the jar leans with the ghost hand while it shows the pull, and stands back when the hand lets go; a new snack is born no bigger than the room it has and swells from there (in motion no pair presses deeper than 3.5 units over three seeded jars; the test holds 8); a tap between two shelf things or two counter snacks takes the nearer one. Shot again: `game-07` to `game-14`. | Not measured. Draw count 38 to 50 through a tip. | As listed under "What is still weak". |
| 5 | The reader's report, then the sheet read sentence by sentence against the code, then the burp, the empty jar tipped, the three at rest and Pib's cheese (`work/burp-*.png`, `work/gag-0.png`, `work/rest-*.png`, `work/pose-1-cheese.png`) | "The fire one just flew like the others, where is the fire?" "The jelly one sat still on the plate." "The purple one looks in with both eyes." "The hook is under the house button." "The cheese is gone from its tray." "The glass goes through the bread on the hook." | One set, "the code does what the sheet says": the seven points of the reader and the rest listed in the status block. Shot again: `game-01` to `game-06`, `game-12`, `game-15`, `game-16`. | Not measured. Draw count 33 to 43 at rest, 39 to 42 through a tip, 50 to 62 through a burp. | As listed under "What is still weak". |

### The cold playtest proxy

Run once on the production build (`npx vite build`, then the preview on the wave's port), fresh state, no age, 1180 by 820; stills `playtest/before-01` to `before-21`.

- **Ten seconds untouched.** A cheese hangs from a claw over a big glass jar with one bread in it; a purple monster sits at the jar with its mouth open at the rim, watching the cheese; a green one presses its face to the window. After three seconds the cheese glows, and then a hand slides it along the rail under it and lets go. The scene invites one thing: drop the cheese.
- **The first minute.** Slide and lift: the cheese falls on the bread and a toastie pops. Left alone, the handle glows and the hand pulls it. A tap on the egg on the shelf hangs the egg under the claw and the cheese goes back to its tray. Egg and jelly dropped beside the toastie lie there. A pull on the handle tips the jar, the snacks go into the mouth one mouthful at a time and the monster answers each; it keeps the last pose. Left alone, the one at the window glows and the hand taps it. A tap brings it in. Loaded again, the shop is as it was left, with no scene.
- **Unclear moments, before.** (1) The hand that shows the pull crossed into the jar and faded there, and nothing moved with it: it could be read as "touch the glass". (2) A tap on the shelf at the edge of one thing's reach took its left neighbour.
- **Fixed.** (1) The jar leans with the hand. (2) The nearer one is taken.
- **After**, on the dev server (`work/idle-handle-*.png`, `game-14`): the jar leans as the hand pulls and stands back as it lets go. List: empty.

### The frame

For `game-01-rest-mumf.png`:

- Empty: about a tenth of the frame is bare wall or bare counter with nothing on it (the strip of wall between the window and the jar above the lamp, and the counter between the bag and the first doily). The inside of the jar is another seventh, empty but for what the child put there: it is the working space and fills as the child plays. With Pib at the jar (`game-02-rest-pib.png`) the wall round it is bare too, about another twentieth.
- Funny: Mumf, half the frame high, slumped at the counter with heavy lids, an underbite with two teeth, a thread of drool, a checked napkin and a fork held ready; Pib outside with its nose flat on the pane, mouth open, eyes on stalks that look two ways; Oon as a wide orange dome with three heavy lids and its tongue hanging out; the snack in the claw smiling at where it is about to go.
- Alive: Mumf breathes, blinks slowly, his jaw sways and his pupils follow the snack a moment late; Pib's neck jumps to a new lean every second or so and it winks one eye at a time; Oon's three heavy lids blink slowly; the one at the window fogs the glass and wipes it; the mouse sniffs in bursts and its string tail sways; the lamp swings in a draught; a glint drifts on the glass. The snacks lie still.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle.** The monster at the jar breathes, blinks and follows the snack under the claw; the one at the window fogs the glass and wipes it; the mouse sniffs and its tail sways; the lamp swings; a glint drifts on the glass; every made snack with fire breathes a flame every few seconds, one with frost shivers, one with cheese drips. All of it stands still while the game is unattended (`cast.test.ts`, "stands still while no time passes").
- **Motion and sound on every touch.** Every place a finger can land answers at touch-down with a sound (`play.test.ts`, "answers every place a finger can land with a sound"), and the claw sets off in that frame. The one exception is the top right corner of the surface, 72 pixels square, which is the grown-up's: a press there never reaches the game and nothing answers it. No jar of the back shelf stands in it (`layout.test.ts`).
- **Weight, squash and follow-through.** Each thing has its own swing, landing, bounce, grip and wobble (`kinds.ts`); a new snack swells past its size and settles; the jar rocks, tips and stands back; each monster's answer is played large and then held calmer.
- **Kid-clear silhouettes and tappables.** Six things in six shapes and six colours on paper trays; a handle; four doilies; three monsters of three shapes and colours. Targets are 80 units and more, clear of the home control and the grown-up corner (`layout.test.ts`).
- **Wordless clarity for the band.** No word, letter, numeral or sign on the kid side; `node scripts/wordless-check.ts` passes. One want a scene: the open mouth at the rim.
- **Wordless idle guidance.** A gold glow after three seconds on the one thing the scene wants touched, then a ghost hand that shows the touch: the slide and let-go, a shelf thing, the pull of the handle (the jar leans with it), the one at the window.
- **Frame rate.** Unmeasured. Canvas 2D, one full-surface stamp a frame (the cached room), 33 to 62 draws in the stills, held at 80 and 90 by `frameBudget.test.ts`; pixel ratio capped at 2 with four tiers and the grown-up overlay.
- **Assets.** All procedural, painted once into sprites; no file is loaded. Sound is synthesized.
- **Found as left.** A let-go saves the pile as it comes to rest, the burp's outcome included; a tip and the next monster hand their outcome to storage in the move that starts them; no scene plays on load (`play.test.ts` "found as left", `scenes.test.ts`).
- **Nothing passes through anything.** Model tests at 60 frames a second with seeded let-goes hold every pair of snacks in the jar in motion and at rest and the glass (`jar.test.ts`); nothing the game brings to rest covers a target (`layout.test.ts`).
- **No engagement mechanics.** Nothing is counted, timed or shown as found. The next monster waits at the window for the child's touch.

### The learning claim

The game has no learning goal and claims none; `ART.md` says so under its records heading.

### Defaults taken for the owner

- The age split of the first visit at seven; no age opens as for the youngest.
- A touch over the jar carries the claw there; the lift lets go once it has arrived.
- Four places on the counter; the overflow goes into the paper bag and is gone.
- Faces on the snacks, and no idle motion in the jar but what joining gave a made snack.
- Half a pull tips the jar.
- Three monsters in a fixed round: Mumf, Pib, Oon.

### What the next builder should know

- A plainly stepped spring needs short steps: cut the frame's step before stepping it.
- Restart the dev server before stills; it can serve old modules.
- Keep "falling" and "has touched something" apart from "landed hard": a snack set down gently never made a landing event and was treated as still falling.
- The save at a let-go is a copy of the pile played to rest. It matches the live pile only because the pile burps and lays itself to rest inside its own step; keep anything that changes the pile inside `jar.ts`.
- A pile that never sleeps is the usual cause of a save that differs from the screen: look for sleepers waking each other and for bumps that kick again.

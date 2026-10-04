# What the two pilot games learned

For a cloud builder about to build a toy or a game on it. Muddy Truck Wash (three.js) and Monster Pizza (canvas 2D) went first, and this page holds what they found that the template does not yet carry. It changes no rule: [`CLOUD.md`](CLOUD.md), your brief and the guide still decide. Read it before the stage your message names.

Template version 3 carries several of these itself: the Mount keeps what the idle ladder returns and the frame's step, `rng.ts` reads the seed, `stage.ts` fits the stage, and `voiceOf` in `audio.ts` is the bridge from numbers to sound. [`template-notes-v3.md`](template-notes-v3.md) lists what changed. A game on version 2 still does these by hand, as written below.

Both pilots keep their own notes in the status block and the pass log of their `REFINEMENT.md`. You may read them as a worked example (`git fetch origin`, then `git show origin/lane/muddy-truck-wash:games/muddy-truck-wash/REFINEMENT.md`, or the same for `monster-pizza`). Read them for how a step was done and never copy code or a look from another game.

## The Mount, for every game

- **Something to draw before the load has finished.** `resize` calls `draw` before the slot is read. Give `draw` a case with no state: the bare backdrop of your look.
- **Build the game when the slot has been read, not before.** The loading `then` draws once itself, or a parked game shows the empty backdrop until the next frame.
- **Sound inside the handler.** Let the game queue its voices, and play them in the gesture handler right after the game has answered, and again after the game's step in the loop. The first sound then falls inside the touch, where `audio.ts` can hold it for the unlock.
- **Two speeds of saving.** A small change is saved at the throttle (`cadence.change(now)`); the outcome of a scene or the end of a cycle is saved at once (`cadence.change(now, true)`). Before it serializes, the save takes every piece at rest: nothing is saved in the air.
- **A scene playing is not idleness.** Call `ladder.touch` while a scene runs, next to the template's own call for a working finger.
- **Keep what the idle ladder returns.** The Mount calls `ladder.update` in the loop and drops the result. Keep it in a variable and hand it to `draw`, so the glow and the ghost hand reach the renderer without a second call.
- **A fixed seed for the lead's stills.** Read `?seed=<n>` from the address for the game's random stream, and otherwise draw a new seed for the visit.
- **One finger works at a time.** A second finger does nothing; for the youngest band that is the safer rule. Whatever starts on `press` must not wait for a move: no `dragMove` comes until the finger has passed `TAP_SLOP`. Every press has one ending. A tap ends as `tap`. A press that is taken away ends as `pressEnd`, which is not a tap. A drag ends as `dragEnd` when the finger let go, which is a drop, and as `dragCancel` when the game was parked under the finger or the browser took it, which is not: the piece goes back where it came from. `dragLift` comes first when a finger lifts mid-drag, and is not yet the end unless the game calls `letGo`. (Since template version 3; a game on version 2 has no `dragCancel`, and puts the piece back itself at a put-away.)
- **The top right corner is the grown-up's.** Keep 72 by 72 there bare of anything that answers a touch (`overlay.ts`). Since template version 3 the overlay opens on a finger held a second in that corner and lifted there, then three taps within three seconds, and only the working finger counts.

## Scenes and state, for every game

- Call the scene's `finish()` first thing in every press, before the press is answered: a touch ends the scene and is then an ordinary touch. A scene that a press starts is started after that call.
- A beat that lays things down as it goes counts what it has laid, since a finish jumps its progress to the end.
- A scene set off by a rub lets go of the finger first, or the rub that caused it is read as the touch that ends it.
- `deserialize` in `state.ts` returns the template's fields only. A game with more reads the raw record a second time in its own wrapper; that is the intended way.
- Where the next customer is already on screen, the position moves when a cycle is judged and shows on the customer after next. Say in the sheet which customer the new position lays out.
- Write a test for what each scene saves when it starts. The sheet check asks every scene for that list, and the pilots had to add both the list and the test afterwards.

## Canvas 2D

- **At most one full-surface composite a frame.** Two full-surface stamps a frame cost about 9 ms in software drawing at pixel ratio 2; a thin band at an edge and clipping the figures behind it cost about 0.3 ms for the same picture. Draw large still areas once to an offscreen canvas and stamp that once.
- **Tell the view the new size and ratio before it draws,** and make the sprites again at that density, or they blur on a tablet.
- **Fit a stage into the surface.** Draw in fixed stage units with one scale and offset from the surface's size, and use the inverse for every touch. About twenty lines of your own (`fit` and `toStage`).
- **A bridge from numbers to sound.** If your voices are plain numbers, as a machine that cannot hear needs them, write one small function that turns a list of notes into a `Voice` with `tone` and `noise`.
- **Random placement does not fill a set.** Pieces dropped at random free spots jam before the full count fits. A set that must always hold its count needs spots that always fit, or pieces that shuffle up.

## three.js

- **Stills on a machine with no graphics card.** Take them on a paused clock with the random stream seeded, at 1180 by 820. Frame rates read there mean nothing; the lead measures.
- **The tier reaches the view through `applyTier`** (the template has the hook since version 2). Give every field of your `Tier` a visible effect, or drop the field.
- **The intersection audit takes passes.** The pilot's first run had 44 findings. Most were flush faces and parts so close they overlapped; the rest were things in motion that needed an allowance with a reason and a cap. Write the moments so that they reach every state (each scene, each tool on each part a taste belongs to, a touch in the middle of a scene, a rest), and give the flying things no body.

## The cold playtest proxy

Run it on the production build with a fresh slot and the shell's default age: ten seconds hands off, then a newcomer's minute, with stills. The pilot's found six unclear moments that no test had: a glow that hazed the whole scene instead of marking the next thing, a ghost hand that pointed at the wrong tool, a first showing hidden behind another object. Each is one fix, and none shows up until someone who has not seen the game looks.

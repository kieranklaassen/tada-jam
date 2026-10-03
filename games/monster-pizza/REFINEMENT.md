<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: gates. The game is built on the toy as the game run asks: the cycle, the error as a consequence, every cell of the grid, the scenes, how a cycle restarts, found as left, the customers, the idle ladder, the frame budget and the overlap tests. The gates were run as far as this machine takes them (below).
- The sheet the game stands on:
  - Round 1: open, 14 findings (checker: B), on hash `a8217b75…bad02`. All pasted, none disputed.
  - Round 2: open, 6 findings (checker: D), on commit `26f2cd6`, hash `820efe60115003a06970823c287d363024f249cc56119db116d02fa1e025011f`. All pasted, none disputed.
  - Round 3: passed with no finding (checker: E), on the sheet part whose hash is `ed05cde911737d84c479b34f1db3dff57a2f60dca57d8e55211b1ac036db202c`, as it stands at commit `7d3502ba781cc9348e8202467ef79da0782971bb`. The sheet part of `ART.md` has not changed since and must keep this hash until the game is merged; a change to it asks for a new round.
- Open, for the lead: the owner's answer on the look and the toy, and the pull request.
- The game was built before the sheet passed, and stands on the text that passed. The game was brought into line with round 1 in commit `255f2e2` and with round 2 in the commit after `7d3502b`; what each finding reopened is in the notes on the two rounds, below the pass log.
- Look in use: the first reserved row, felt-tip marker drawing, in canvas 2D. The owner has been shown the toy and has not answered. If he rejects the look, only the drawing changes: `view.ts`, `scenery.ts`, `monsterArt.ts`, `effects.ts` and `marker.ts`. The rules, the scenes, the motion and the sounds draw nothing.
- **What the lead should try first:**
  1. Open the game cold and touch nothing for ten seconds. The customer pokes a tub and one piece hops on. Then tap the tub once for every drawn piece on the card, bake and serve: the pizza is one over, because the shown piece is already there. This is as the sheet has it, and it is the first thing a real child will meet. The tasting then plays one beat and one sizzling piece.
  2. Listen. Every voice is numbers in `voices.ts`; nobody has heard one. The count should climb a scale as pieces land, and each kind's rumble should end differently.
  3. The frame rates are taken (pass log, the lead's reading of commit `297536b9`).
  4. `?seed=23` gives Mops and three socks on a first visit; `?spike=1` shows the still scene of the look spike.
- Open requests to the lead: the registry row for the look (its text is at the end of `ART.md`); the listen.
- One commit on this branch was pushed red: `30e6cd5` went out with one failing test of this game. `24fe275` fixed it, and every push since has gone through all four checks first.
- Still weak (the full list is under the pass log):
  - The first order a child ever makes comes out one over if the child taps once for each picture.
  - A pizza slides over the oven's wall on its way into the mouth and out.
  - "Fed by hand" and "too few" are thin beside the eating.
  - No real screen, no real ears, no child.
- Gates run on 2026-10-03, on a cloud machine with no graphics card and no sound: `npx tsc --noEmit`, `npx vitest run games/monster-pizza test/games.test.ts test/new-game.test.ts` (24 files, 333 tests, one of them longer after round 2; the game's own tests take about 5 seconds), `npm run -s wordless:check`, `node scripts/egress-check.ts`, `npm run build`, `npm run egress:built`, `npm run education:built`. All passed. The overlap gate of a canvas game is its own `intersections.test.ts`, which is in that run.
- Could not be run here, and why: `npm run perf:jam` (it drives WebKit and installed Chrome on a graphics card; this machine has neither); the whole `npm run check` was not run as one command, only its four parts on this game and the two shared tests that read it; `compound audit` (no file under `docs/solutions/` was touched).

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a file copied from the template, written for the lead and for the games that come after. This is the pilot for canvas 2D. "Used as copied" means the running game uses the file and not one byte of it was changed.

- **The generator and the untouched copy.** `npm run new:game` worked as the guide says, and the untouched copy passed every check.
- **`ART.md` (the outline).** Used as copied. **For the template:** the outline for "The scenes" does not ask what each scene saves when it starts, though "Found as left" in the guide requires it; this sheet added a "Saved at the start" entry to each scene.
- **`input.ts`.** Used as copied. The Mount passes `press`, `tap`, `dragMove`, `dragLift`, `dragEnd` and `pressEnd` straight to the game. `dragStart` needed no handler: the piece is already in the hand from `press`, and the first `dragMove` carries it. The rule that every press has one ending held: a piece that pops into the hand on `press` goes down on whichever of the three arrives. `countsAsDone` decides the slide of the pizza: half the way to the oven bakes, half the way to the customer serves. It worked as written, with one thing to know: its target has to be a point the finger can reach. The pizza is held clear of the oven's wall, so the target is the end of the slide (`OVEN_WAY`), not the oven's mouth; measured against the mouth, no slide a hand could make ever counted.
- **`audio.ts`.** Used as copied. Its `tick` is no longer used. The two building blocks were enough for every voice so far. **For the template:** a game that keeps its voices as numbers needs one small bridge from numbers to `tone` and `noise` (here `sounds.ts`, 15 lines, with the type in `voices.ts`); every game on a machine that cannot hear will write the same one.
- **`guidance.ts`.** Used as copied: `IdleLadder` for the glow and the demonstrations, `handPose` for the ghost hand's press and its carry. Two things. **For the template:** the Mount calls `ladder.update` in the loop and throws the result away, so a game has to call it a second time in `draw` to get the guidance to its renderer; keeping the returned object in a variable of the Mount would save that. And the number of presses: `config.ts` gives a band that starts at 4 two presses for a tap, and warns that a second tap must do no harm. Here one tap is one piece, so a child who copies two presses lays two; this game passes `1` to `handPose` itself. **For the template:** a game whose tap counts something wants one press whatever its band, and the comment in `config.ts` could say so. What the hand shows is the game's own (`hint.ts`): it knows where things are and what stage the job is at, and nothing about the card, so it cannot give the answer away, and a test holds that a right pizza and a wrong one are shown the same moves.
- **`state.ts`.** Used as copied, and wrapped by `save.ts` as its header describes: `save.ts` calls its `deserialize` and `serialize` and reads the same raw record again for the game's own fields. That worked without touching the file. The position rules are used as written: `finishCycle` when the eating starts, with the outcome judged from how many pizzas were pushed back, and `beginCycle` when the child calls the next customer in. Two things the header could say, **for the template**: a game with a harder option the child picks needs a rule for it that `finishCycle` does not have (here a cycle on the big roll counts as `mixed` unless it went well, in `outcomeFor`); and a game that seats its first customer before any touch has to save at once on a first visit, or a put-away before the first touch finds a different customer on return.
- **`config.ts`.** Changed only where it is meant to be: `LADDER` holds the sheet's eight places and `FIRST_VISIT` four rows by age. The tiers are the template's (pixel ratio only), since every figure is a sprite made at the surface's density. The copied tests of `state.ts` read both generically and passed without a change.
- **`scene.ts`.** Used as copied, for eight scenes (`scenes.ts`): stepping up, the two showings, baking, a pizza handed back, the tasting, the raw tasting, the eating, and a piece fed by hand. The contract held up: the outcome goes into the state in `start`, a press calls `finish` first, and every beat lands at progress 1. What a builder has to work out alone, **for the template**:
  - `start` does not play the beats that begin at once; the first frame of a scene is drawn before its first `update`. The game calls `update(now)` straight after `start`.
  - `finish` runs every cue that has not played, sounds included, so a touch that ends a scene sets off all its remaining sounds at once. The game passes its beats a `sound` that goes quiet while a scene is being ended. A flag on `finish`, or a second kind of beat that is skipped when a scene is cut short, would save every game from finding this.
  - Beats that overlap in time and write the same thing are played in list order, and the later one wins; a tween that eases from where something is (`from ??=` on its first frame) is the safe form, since a touch may have left the thing anywhere.
  - A scene needs somewhere to keep what it moves that is not a rule (where the pizza is on its way to the oven, how far the card has opened). Here that is `staging.ts`, with one `calm` that every scene's last beat calls. The template has no name for this.
- **`overlay.ts`.** Used as copied. Its corner (72 by 72 at the top right) is kept bare of anything that answers a touch: the card stands clear of it, and a test says so.
- **The Mount (`monster-pizza.tsx`).** Changed, in these places and for these reasons:
  - It makes the view and, once the slot is read, the game. `draw` has three cases: the game, the still scene of the spike, and bare paper before the slot is read. **For the template:** `resize` calls `draw` before the load has finished, so every game needs something to draw with no state; a comment says so, but a blank Mount gives no hint of how.
  - `resize` tells the view the new size and ratio before it draws, so the sprites are made again at that density.
  - `act` turns each gesture's point into stage units and hands it to the game, then plays the voices the game queued and hands its change to storage. The same two calls follow the game's step in the loop. Sounding in the handler keeps the pop inside the touch, where `audio.ts` can hold it for the unlock.
  - The state is the game's, not the Mount's: the write function asks the game for a save (`toSave`), which is the outcome of whatever is playing with every piece at rest. The Mount's own `state` variable went.
  - The ladder is kept at the bottom while a scene plays, as the Mount's comment says to (`kitchen.busy`).
  - `seedOf` reads `?seed=` for stills and otherwise draws a new seed for the visit. **For the template:** the cloud page asks for "a fixed seed" for the lead's still and the template has no place for one.
- **Nothing in the template fits a stage into a surface.** A canvas game drawn in fixed units needs a fit (scale and offset from the surface's size) and its inverse for touches. Here that is `fit` and `toStage` in `layout.ts`, 20 lines. **For the template**, if the other canvas games lay out the same way.
- **A finding the other canvas games should have before they build their toys.** The first version drew the counter and the worktop as one sprite over most of the surface, so that the customers' feet were hidden behind it. Two full-surface stamps a frame cost about 9 ms a frame in software drawing at pixel ratio 2; with the worktop left as bare paper, the customers clipped at the counter and the counter's edge as a thin band, a frame cost about 0.3 ms on the same machine. The look ledger's note on 2D rows says at most one full-surface composite a frame, and it means it.
- **A test can take a view without a canvas.** `recording.ts` is a stand-in for a 2D context that keeps what was stamped where and counts strokes and fills, and `marker.ts` lets a test supply the canvases sprites are drawn into. With those two the frame budget and the overlap tests run the real view in node. They found a real fault (a newcomer drawn on top of the customer being called in). **For the template**, if canvas games are to have a counted frame budget without each writing its own recorder.
- **Random placement does not fill a pizza.** Dropping pieces at random free spots jams before twelve fit (10 or 11 in two of eight seeded runs). A set that must always hold its full count needs spots that always fit, or pieces that shuffle up; this game does the second (`makeRoom` in `table.ts`). A canvas game with scattered countable pieces will meet the same thing.

### For the owner to decide

One line for each thing only the owner can settle.

- The look and the toy, at the toy checkpoint.
- The first showing leaves its piece on the pizza. A child who then taps once for each picture on the card makes the first order one over, and the first thing the game does is push a pizza back. Keep it as the sheet has it (the tasting explains it in one beat), or have the shown piece hop back into its tub when the showing ends.
- The game counts with a rising note on each piece and no spoken number word, under the default that no game depends on speech until it has been tried on the owner's iPad. The representation the pack names for one-to-one counting has a number word on each object, so this is the first thing to revisit when speech is decided.
- Two customers wait at the door and the child picks one. For a four-year-old that is two things to touch where the cue table offers one next act; the sheet takes it as one act (call a customer in) with a bigger and a smaller version. If that reads as too much, one customer waits and the bigger order goes.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak. Every still was taken by the builder at 1180 by 820, pixel ratio 2, in headless Chromium drawing in software (SwiftShader), and none is committed. No frame rate can be taken on this machine; the column holds the game's own work per frame (`window.__jamPerf.cpuMs`) where it was read, which is not a frame rate.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The look spike's first still: a customer with a card, two at the door, two tubs, a pizza with two pieces | "The bowls are squashed in under the round thing and I can't press them. A stick pokes up over the yellow line." | Tubs moved out from under the board to stand beside it; the board's handle turned to the bottom; the card's pictures made bigger; the chimney shortened so it stays under the counter | Not taken | The wall is bare. Left bare on purpose: the cue table asks for an uncluttered ground |
| 2 | The toy, idle for 5.6 s: the glow on three tubs and the ghost hand | "The sparkles are all tangled up, I can't tell which bowl is sparkling." And a frame cost about 9 ms of the game's own work | The ring of dashes made smaller, ten dashes for twelve; the counter and worktop, which was a second full-surface stamp, cut down to a thin band, with the customers clipped at the counter | 0.3 ms of own work a frame after, 9 ms before (software drawing) | The ghost hand is white on white paper and reads by its outline alone |
| 3 | The game, three walkthroughs: a right pizza through to the next customer, one with two too many, one with one too few | "It took its picture away before it ate. Where did the picture go?" "Its arm goes right across my pizza." | The card stays up through the eating and is rolled away with its last beat; the pizza held to a slide towards the oven or up to the customer, clear of tubs and oven; the two at the door spaced so the widest pair never touch | 0.4 ms of own work a frame | The reactions for a wriggle, a hiccup and a rumble are small on screen |
| 4 | Cold playtest proxy, first run (below) | "The monster's arm goes all the way over the pizza to the bowl. Then the oven lights up, but I haven't done anything yet." | The kitchen mirrored: card to the customer's right over the oven, door and tubs to its left, so its free hand reaches the tubs; the way to the oven shown only after the child has laid a piece itself | 0.4 ms of own work a frame | See "Still weak" |
| 5 | Five tastings from seeded saves, shot every 150 ms: too many peppers for Grum, a storm of mushrooms for Mops, too many and too few for Bim, cheese and socks for Fizz | "I can't see the fire. It's a little brown thing." | The flame, the hiccup bubble, the dizzy loops, the cheese string, the cloud, the wriggle, the rumble lines and the burp all drawn about twice the size; paper laid under a flame and a cloud so the marker keeps its colour over a customer's body | Not read | The big versions were shot for mushrooms only |
| 6 | Cold playtest proxy, third run (below), on the build after round 1 of the sheet | "I pressed the bowl three times for three socks and the monster made a stinky cloud. There were four." "It keeps looking at the pizza. Does it know about its picture?" | The customer now glances from the pizza to its card and back while the child is idle, and at a baked pizza its free hand comes down over the counter towards it; each kind does its own move as the pizza slides out | 0.5 ms of own work a frame | The first order comes out one over for a child who taps once a picture: left as the sheet has it, and put first on the lead's list |
| Lead's reading | Commit `297536b9`, measured by the lead on a graphics card with the reference game beside it; not this builder's measurement | None | None | 60 frames a second in Chrome at 6x CPU throttle and in WebKit; 59.8, with a worst second of 59, at 20x throttle and four times the pixels | As told to this builder; the engine versions, the build and whether a physical iPad was measured are the lead's to state |

**Reverted:** nothing was reverted for looking worse. One thing was taken out for cost: the worktop as a drawn sprite (pass 2).

### Cold playtest proxy

Run by the builder on the production build (`npm run build`, `vite preview` on a private port), fresh state, pinned seed. It stands in for a child and is not one.

**Run 1, before pass 4. Hands off for 13 s.** What the scene invites: a big purple customer holds up a card with three yellow triangles and looks from it to an empty pizza; one tub holds the same yellow triangles. At about 1.2 s its arm reaches to the tub and one triangle hops onto the pizza. At about 7 s the oven lights and the arm nudges the pizza towards it. From 9 s the tub and the oven have a ring of orange dashes and a white hand taps the tub.

Unclear moments, as a newcomer:

1. The arm that pokes the tub starts at the far shoulder and crosses the whole pizza. It reads as reaching for the pizza.
2. The oven lights and the pizza is nudged before the child has touched anything, with one piece of three on it. It reads as "bake it now".
3. The doorway is a wide blue patch; the two in it are small and half hidden by the counter. It is not clear they are waiting to come in.
4. Nothing says the card and the tub hold the same thing except that they are the same shape and colour. (Kept: that is the idea.)
5. After a tasting the pizza is back on the board looking as it did. What changed is only in the child's memory of the scene.

**Run 2, after pass 4. Hands off for 13 s, then a first cycle played.** Moment 1 is gone: the near arm reaches the tub without crossing the pizza. Moment 2 is gone in part: the oven no longer lights and nothing nudges the pizza, but from 5 s the oven had the ring of dashes beside the tub, with only the shown piece on the pizza. That was a sixth moment, and it was fixed after this run: until the child has laid a piece itself, only the tubs have the ring and the hand only taps a tub (`hint.ts`, held by a test; not shot again). Moments 3 and 5 stand, and are under "Still weak". The first cycle played through: two taps, a slide to the oven, a slide up to the customer, three bites, and the next customer came in on a touch with an order of its own.

**Run 3, on the build after round 1 of the sheet and pass 6's fixes, seed 23, the shell's default age. Hands off for 10 s, then a newcomer's minute.** Hands off: Mops holds up three socks, pokes the tub once and one sock hops on; from 3 s only the tub has the ring, and the hand taps it. The oven is left alone. The newcomer tapped the tub three times, one for each sock on the card, and had four on the pizza. After four idle seconds Mops nudged the board towards the oven and its window lit; the slide to the oven baked it; Mops's free hand came down towards the baked pizza and Mops had the ring. Served, the tasting played one cloud over one sizzling sock, and the pizza came back as it was.

Unclear moments in run 3:

1. Three taps for three pictures gives four, because the shown piece is already there. The tasting says so in one beat, and a child who counts the pizza sees it. It is still a first serving that goes wrong for a child who did the obvious thing.
2. One cloud over one sock is small beside the pizza it rises from.
3. After the tasting the pizza is back and nothing recalls which sock sizzled (as in run 1).

Moments 1 and 2 of run 1 did not come back.

### The check of the sheet, round 1: what it reopened

- Finding 1 (the big roll): drawn longer and fatter and held in both arms. No rule changed.
- Finding 2 (a sound for every cell): each kind's rumble ends in its own sound, the olive's too many has a rattle, the sock's a parp, and a sock fed by hand goes on with a snap, is worn until the customer next moves, and drops back into its tub.
- Finding 3 (nothing left on a customer): soot is shaken off as the tasting ends; a worn sock is gone at the next touch or scene; neither is in the save.
- Finding 4 (baked pieces): a baked piece keeps its size, shape and colour; only its outline is toasted, and each kind does its own move once as the pizza slides out (`pieceMotion.ts`).
- Finding 6 (a manner never adds a beat): Bim's manner had two hops to a beat and now has one.
- Findings 5, 7 and 8 were already as the new text says, and tests hold each.
- Findings 9 to 14 are wording of the records and the claim. `order.ts` did not change.

### The check of the sheet, round 2: what it reopened

- Finding 1 (a baked piece springs back): already so. Each baking move ends where it began, and `pieceMotion.test.ts` holds that.
- Finding 2 (two cells with no sound): a puff of flame now has a low thump under its rush, and an olive swallowed whole goes down with a plunk and its echo. A test holds both.
- Findings 3 to 6 are wording of the records and the claim: what is not taken stands beside each record, and the two Dutch records that come near the steps of a job are named as not used. No rule changed.

### Still weak

- The first order a child ever makes comes out one over if the child taps once for each picture, because the piece the customer showed is already on the pizza. The sheet has it so; a real child decides whether it stays.
- The reactions were made bigger in pass 5 and have not been judged on a real screen. A reaction should read from across a room.
- The doorway reads as a window, and the two who wait are small.
- After a tasting nothing on the table recalls which pieces were off. That is as designed (the child changes one thing and serves again), and it is the first thing to watch a real child at.
- A pizza slides over the oven's wall on its way into the mouth.
- "Fed by hand" and "too few" are thin beside the eating.
- No one has heard the game. No one has seen it move at a real frame rate. No child has played it.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle.** The customer at the counter breathes, blinks, follows the piece in the air with its eyes and plays its own small delights; the two at the door do the same. Each of the five has its own resting rhythm (`motion.ts`), and a test fails if two share one. Everything stops when the game is unattended or hidden: the loop, the clock and the sound are the template's.
- **Motion and sound on every touch.** A tub squashes and a piece pops up in the frame the finger lands, with a pop; the lift sends it in an arc to land a note higher than the last. The pizza, a piece, the customer, the oven, the card and the two at the door each answer a touch with a sound and a move, and a test presses each one. Every sound is synthesized.
- **Weight, squash, and follow-through.** Tubs, the pizza and every landing piece sit on springs. Each kind lands in its own way on the same spring. Customers squash, hop and settle by their own weight: Grum's belly goes on after he has stopped.
- **Kid-clear.** Few things, each large: one customer, one card, one pizza, one to four tubs, one oven, a doorway. Bare paper behind them. The pieces a child counts are flat, whole and outlined, on a pale plain pizza. Tubs are 132 units across on a 1180-unit stage.
- **Wordless clarity for the declared age.** The band is 4 to 7, so there is no word, letter, numeral or symbol, and no `symbols.ts`. An order is a picture of the pieces themselves. The game shows one want at a time: the customer with its card. Tools mean something when they are there. Two ideas are shown once by the customer, without words. `npm run wordless:check` passes.
- **One obvious want.** The customer holds its card up and, while the child is idle, glances from the pizza to the card and back; at a baked pizza its free hand comes down over the counter towards it. Once it has eaten it wants nothing, and the two at the door are what there is to touch. A test holds each.
- **Wordless guidance.** The template's idle ladder: after 3 s what can be touched gets a breathing ring of dashes, after 5 s a ghost hand shows one move, backing off and stopping after four. What it shows comes from `hint.ts`, which does not know the card, so it shows moves and never the answer; a test holds that a right pizza and a wrong one are shown the same.
- **60 fps on a mid-range iPad.** The lead measured commit `297536b9` on a graphics card with the reference game beside it: 60 frames a second in Chrome at 6x CPU throttle and in WebKit, and 59.8 with a worst second of 59 at 20x throttle and four times the pixels. Those are the lead's readings, as told to this builder; whether a physical iPad was measured is the lead's to say, and this builder measured none. What this builder measured, on a machine with no graphics card, is the game's own work per frame on the production build, in headless Chromium drawing in software (SwiftShader), at pixel ratio 2 with the top tier pinned, over a busy stretch of taps, a bake, a serve and an eating: a mean of 0.4 ms unthrottled, 4.0 ms at 6x CPU throttle and 15.5 ms at 20x. Those are CPU times with software drawing in them, and none is a frame rate. A counted budget holds in `npm test`: at most 56 stamps and 96 pen strokes and fills a frame, one full-surface stamp a frame, and no sprite made after the surface is sized. The pixel ratio is capped at 2 and stepped down by the template's governor.
- **Procedural or committed assets only.** Everything is drawn at run time in canvas 2D. No image, font or sound file, and no outside address. `egress:check` and `egress:built` pass.
- **Its own art direction.** Felt-tip marker drawing, the first row reserved for this game: wobbly bold outlines, streaky fills that miss the edges, white drawing paper. The guide is in `ART.md` under "The look".
- **Nothing passes through anything.** A canvas game is not read by the intersection audit, so `intersections.test.ts` does that job: the real model played at 60 fps through every state, every frame measured, with the real view drawing into a recording context. Three contacts are allowed, each with a reason and a cap.
- **Found as left.** Every scene saves its outcome when it starts; nothing is saved in the air; a save reopened mid-bake, mid-tasting and mid-eating is tested, and after the eating nothing starts by itself.

### The learning claim

As in the sheet, with each record's standing and check state as the lookup printed them on 2026-10-03. They are to be read again on the day of the pull request.

Monster Pizza is designed from, in California, three foundations published by a state department for preschool and transitional kindergarten (`us-ca 1.2` and `us-ca 1.6` in mathematics, and `us-ca 2.1` in approaches to learning, each in part), which are foundations and not standards, and two kindergarten content standards adopted by the State Board of Education (`us-ca K.CC.5` and `us-ca K.CC.6`, both in part); and, in the Netherlands, guidance of the curriculum institute SLO, which is not law: one statement of its content card for peuters (`nl Hoeveelheden / 3`), which says what can be offered to children before school, and three of its goals for fase 1 (`nl rw/gb/2/01/fase1`, `nl rw/gb/2/08/fase1` and, in part, `nl rw/gb/2/03/fase1`), which say what a school can offer and not what a child must know. All nine records were `confirmed`. From the California records the game takes counting a set one thing at a time, counting to find how many, and comparing two sets as more, fewer or as many, with sets of up to ten. Of 1.2 it takes one act and one note for each thing, and it asks for no number word. Of 1.6 it takes the later-age statement, and of 1.6 and K.CC.6 the comparing and not the telling of it, since the game has no words. Of K.CC.5 it takes counting to find how many and not counting out from a number that is told. Of 2.1 it takes the amount to act on and the job of several steps, without the adult support that both of its statements include. From the Dutch records it takes pairing one to one, counting to find how many, comparing two amounts and not putting amounts in order, and representing a pictured amount with objects, with sets of up to ten. Making the set from a picture is taken from the Dutch goal `nl rw/gb/2/08/fase1` alone, and an order of one to three kinds worked through in a job of several steps from the California foundation 2.1 alone. It is designed from no California record for a seven-year-old or for making a set from a picture, and from no Dutch record for the steps of a job.

The sheet this rests on passed its third check with no finding (checker: E; hash `ed05cde911737d84c479b34f1db3dff57a2f60dca57d8e55211b1ac036db202c`), after round 1 (14 findings) and round 2 (6 findings), all pasted. The check states are to be read again on the day of the pull request.

### Defaults taken for the owner

From the guide's list of defaults awaiting the owner, as they bear on this game:

- No numeral and no symbol: the band starts at 4.
- No speech: the count is a rising note on each piece, not a number word. This is the default that costs this game most, since the representation it uses is taught with a word on each object.
- No camera shake and no pause on impact: the answer to a touch is a chain (squash, flight, plop, jiggle, a customer's reaction) and sound.
- No reading on the object: nothing shows how many are on the pizza except the pieces.
- The look was the lead's first reserved row.

From the sheet, the game's own:

- An order stops at ten pieces. The pizza has room for twelve.
- Two customers wait and the child picks one; the bigger roll is an order one place higher.
- A cycle goes well on the first pizza served, mixed after one pushed back, badly after two.
- A tasting plays up to three pieces off one by one, and more than three as one big version.

### What the next builder should know

- Draw each figure once into a sprite at the surface's density and stamp it. Keep to one full-surface stamp a frame: a second one cost thirty times the frame.
- Decide early where a customer's hands have to reach. This kitchen was laid out twice because an arm crossed the pizza.
- Seed everything and give the Mount a `?seed=`. A still that changes between runs cannot be compared.
- Write the overlap tests before the scenes are polished. They found a customer drawn on top of another at the door in their first run.
- Run all four checks as one command that fails, before every push. One red commit went out here because a chain of commands hid a failing test.
- A press at the centre of a pizza usually lands on a piece. A script that means to slide the pizza takes it by the crust.

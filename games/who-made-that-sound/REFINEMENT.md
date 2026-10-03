<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet. The design sheet is whole in `ART.md`. **The text to check is the sheet as it stands at commit `8be8f23`**, sheet hash (everything above `## The look`) `d993db7d4ef5b82891cc0cc259dff9fb7f07ced85872abb1f6efb44c150b339b`. It was first whole at `7fce9b6`; three later commits changed sentences in it so that it says what the rules do (heard hides start over for a new asker; a tap on a hide also brings the next asker in; the scene lengths; when a cycle is over).
- Rules: written as pure modules with tests, against the sheet at `8be8f23`, while its check runs and at the builder's own risk: `voices.ts`, `tastes.ts`, `places.ts`, `layout.ts`, `world.ts`, `save.ts`, `grid.ts`, `guide.ts`, `beats.ts`, and the tests beside them with `play.test.ts` and `consequence.test.ts`. A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: painted-tissue collage, the first reserved look. The spike is being built in this run.
- Renderer: canvas 2D, as the brief suggests.
- Open: sheet ready for check, round 1

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a file copied from the template (version 2), for the lead and for the games that come after.

- `state.ts`: used as copied, and wrapped by the game's own `save.ts` as its comment intends. A gap **for the template**: `freshState` starts with `finished: false`, but a game whose first frame is "the next one waits at the edge" starts as a finished world does, so its own fresh state has to say `finished: true`. The wrap does that here; a line in the template's comment would save the next builder the thought.
- `config.ts`: `LADDER` and `FIRST_VISIT` hold the game's seven places, as the file means them to. `BACKDROP` is the page colour of the look. Nothing else changed.
- `audio.ts`: used as copied; the game has no voices in the build yet. A gap **for the template**: `tone` plays one steady or gliding note. It cannot warble (a slow wobble of the pitch) and takes no start offset inside a call, so a voice with a warble or with two notes needs its own oscillator code. `voices.ts` already hands the sound layer every number it needs (`callOf`), and the game will add a small module of its own at the toy stage unless the template grows a warble first.
- `guidance.ts`: used as copied. The game's `guide.ts` says where the glow and the ghost hand go; the timing stays the template's.
- `scene.ts`: used as copied. The game's `beats.ts` builds each scene as plain timed cues, which the view will turn into `Beat`s.
- `input.ts`, `overlay.ts`: used as copied. The game has no drag, so only `press` and `tap` will be used.
- The Mount (`who-made-that-sound.tsx`): changed only so that `draw` draws the look spike and counts its sprites. It still reads and saves the template's three fields; it moves to `save.ts` when the toy goes in.
- The four frozen files are untouched.

### For the owner to decide

- **The look**, at the toy checkpoint: painted-tissue collage, the first look reserved for the game.
- **The voices have never been heard.** They were written as numbers on a machine with no sound. The lead and the owner have to listen for: whether the low family (220 Hz) carries on an iPad speaker; whether a voice inside a hide (half the peak) is heard as softer and still clearly the same voice; whether the three near pairs (one note or two, steady or warbling, up or down) can be told apart at all at 3 and 4; and whether six voices are a pleasure to hear again and again.
- **The little one sounds exactly like its grown one.** No higher pitch for the small body, so that at 2 "the same" is truly the same. A little one that sounds higher would be cuter and a harder match.
- **With the sound off** the first three places can still be played by eye, since an egg moves in the shape of its call. From `leaf-piles` on a hide is told by ear alone, and a child with no sound can only try each hide. Nothing breaks, and such a child drifts back to the first places. Is that acceptable, or should the game show that it wants sound?
- **No drag at all.** Everything is a tap, which is the guide's rule for the age taken as far as it goes. The hill cannot be rearranged by hand.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it. This run covered the design sheet, the look spike and the rules; there is no toy and no gameplay on screen yet, so most lines of the quality bar say what the rules already hold and what is still to build.

### How the game meets the quality bar

- **Alive at idle.** Not built yet. The rules give the idle scene its content: one who asks at the stone and calls again by itself after 2.5 seconds idle and then at gaps of 8 seconds, three times at most (`guide.ts`), on attended time only.
- **Motion and sound on every touch.** Not built yet. Every tap the model can receive returns at least one thing that happened (`act` in `world.ts`; held by `play.test.ts` over two thousand random taps from every place), and a tap where nothing is still reaches the view as `nothing`, to be answered.
- **Weight, squash and follow-through.** Not built yet. Each kind's moves are named, one of its own for every cell of the grid and for every taste (`grid.ts`, `tastes.ts`), and tests hold that no two kinds share one.
- **Kid-clear.** The spike: few, large pieces of one bright hue each on a white page; plain eggs, all alike, on one plain darker ground strip. Layout facts are held by `stage.test.ts`.
- **Wordless clarity for the declared age.** No word, letter, numeral or symbol anywhere; `npm run -s wordless:check` passes. One want per scene is held by `guide.test.ts` in every state of a long game.
- **Wordless guidance.** Timing is the template's ladder. `guide.ts` gives its targets, and a test holds that the ghost hand never shows an attempt while someone asks: it shows how to hear, never which hide to open.
- **60 fps on a mid-range iPad.** Not measured. This machine has no graphics card, so no frame rate was taken; the lead takes the spike's still and frame rate on a real one. No physical iPad was measured.
- **Procedural or committed assets only.** Everything is drawn at run time from a seeded stream. No asset, no web address; `node scripts/egress-check.ts`, `npm run egress:built` and `npm run education:built` pass.
- **Its own art direction.** Painted-tissue collage, the first look reserved for the game. The art guide is in `ART.md` under "The look". The registry row is a request to the lead (status block).
- **Found as left.** `save.test.ts` puts the world away at every instant of a long random game and reads it back equal; every damaged field is repaired by itself; a largest legal state is under 1 KB.
- **Nothing passes through anything.** Not yet: a canvas game writes its own overlap tests when the view exists. `stage.test.ts` already holds that no two spots of the layout overlap.

### The learning claim

As the sheet has it, with each record's standing and check state read from the lookup on 2026-10-03 (read them again on the day of the pull request):

Who Made That Sound is designed from three California foundations published by a state department (`us-ca 2.2` and `us-ca 2.1` of Physical Science in the Preschool/Transitional Kindergarten Learning Foundations for science, for ages 3 and 4, and for a two-year-old `us-ca 1.1` of Exploration in the infant-toddler foundations, on cause and effect only), and from five bullets of the Dutch curriculum institute's content cards, which are guidance and not law: for peuters the sound-game bullet of the language card and two bullets of the orientation card, on sound and on exploring with the senses, and for fase 1 the sound-game bullet of the language card and the sound bullet of the orientation card. All eight records were `confirmed` on that day. It is a listening game with invented voices; matching a sound to its maker is the game's own and rests on no record. The pack ids are in `ART.md`, "The records".

### Defaults taken for the owner

From the guide's list, all kept as written: no symbol of any kind (the band starts at 2); no letters and no written words; no reading on any object; no camera shake and no impact pause; no speech, so every voice is invented and synthesized; the look is the lead's first reserved row.

The game's own, listed under "For the owner to decide" in the status block: the little one sounds exactly like its grown one; from `leaf-piles` on a hide is told by ear alone; no drag at all; the voices as numbers nobody has heard.

### What the next builder should know

- **Two taps separate hearing from choosing with one gesture.** A band that starts at 2 has only the tap. Making the first tap on a thing "hear it" and the second "try it" gives a listening game a moment of decision without a second gesture, and a child who mashes still opens everything.
- **Let the wrong choice out.** A wrong hide that simply stayed shut would be a refusal. Letting its creature out to meet the asker makes the error a scene, keeps the state consistent (its own grown one finds it later), and needs one rule: someone alone on the hill is always still waited for. `play.test.ts` holds that rule after every random tap.
- **Compute the chances of blind play exactly.** The sheet's claim about a child who guesses ("no wrong attempt one time in six") is a test that walks every branch of the model, not a sample. It caught nothing here, but it is what lets the "Guess" answer be checked.
- **Write the judging of a cycle so that a free action cannot dodge it.** A first draft let a hide be opened while nobody asked, which would have counted as no wrong attempt. A tap on a hide now brings the next asker in first and is only ever a hearing.
- **A voice you cannot hear is still testable.** `voices.test.ts` holds ranges and the steps of difference between voices (one thing within a family, pitch and length at once across families, the same pitch inside a hide). It cannot hold that they are pleasant.
- **When the sheet names lengths, make them a test.** The scene lengths in the sheet were guesses until `beats.ts` computed them from the voices; two were wrong.

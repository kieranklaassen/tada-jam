<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: gates. The game is built on the toy: the cycle, the errors as consequences, every cell of the grid, the three scenes, the idle ladder, the far hill, and the gates as far as this machine takes them. The owner has seen the toy and has not answered; the game was built on at the lane's own risk, with everything that is not drawing kept out of the view (`stage.ts`, `scenery.ts`, `friends.ts`, `vinyl.ts`, `shapes.ts`), so a rejected look means a new view and the same rules, theatre and motion.
- Sheet check, round 1 (checker: B): open, 9 findings, on the sheet with hash `2bdd3321…` (commit `c5edd65`). All pasted as given.
- Sheet check, round 2 (checker: D): **open, 6 findings**, on the sheet with hash `21be665f52a86c79fbca9099d9d71440bfddf2e557124ac726c98356ce04f1a7` (commit `da72b2c`). All six replacements are pasted as given; none was disputed.
- Sheet now, and the text the game stands on: as it stands at commit `e8f1036`. Hash of the sheet part (everything above `## The look`): `a7795c6cba5cef96195622cc9b4442874bd47380bba00df6e0f3df4e5fa0ed49`.
- Brought into line with round 2: the ending's turns go in the order the balloons were taken, and after a load those who already held a balloon go first as they stand (`theatre.ts`, tested in `scenes.test.ts`). The other five findings changed words only: what the rules and the theatre do already matched them (the cycle is judged and saved when the finger lifts; the ending plays again after a pop and never on load; every first showing that is not the opening plays inside its step-in).
- Look in use: inflatable vinyl toys, the first reserved look; the second was not spiked. Its frame rate is the lead's to take.
- Answers handled: `docs/build/answers/balloon-pop-parade-1.md` and `-2.md` on the base branch. Look there for a higher number at every stage boundary and before ending a run.
- Open: sheet ready for check, round 3

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### For the lead

Try first:

1. A new game with no age set, hands off for ten seconds: a troop passes by and takes the balloons that hang low for it, the child's troop walks in and reaches up, the sky fills, the next troop comes to the edge. Then tap a balloon of the wrong colour, then the right ones.
2. `?look=bunches`: tap the bunch of three (three hippos served at once, then the ending), tap it again (the whole troop carried off), tap a held balloon, a cloud, the hill, and the troop that waits.
3. `?look=mixed`: tap the bunch of three red ones over two crabs that already have theirs: the spare balloons bump the cloud.
4. Leave any of them alone for six seconds for the swell and the ghost hand. `seed=<n>` fixes how a new game is laid out, `tier=0` pins full quality, `fps=1` shows the overlay. A game opened with `look=` is never saved.

Requests:

- **The check of the sheet**, round 3, on the text at `e8f1036`.
- **Frame rates** on a real graphics card. The heaviest frame is a step-in between two troops of three with a third coming to the edge: nine friends, at most 72 draw calls by the counted test.
- **Loudness.** Nobody has heard the game. Every voice is in `voices.ts` as numbers; the peaks are at or under 0.5 before the template's master gain of 0.6.
- **The registry row** is at the end of `ART.md`.
- **The audit's browser.** `npm run check:intersections` asks for a browser build this machine does not have (`chromium_headless_shell-1243`); the machine has `-1194`. It was run by pointing the missing path at the one that is there, outside the repository. Nothing in the repository was changed for it.

To know:

- **How the sheet reads the brief.** The brief has one friend who shows two and gets two. The sheet shows the amount by how many friends of one kind come by together (a troop of one, two or three, one balloon each), because whole bodies in a row are the only thing on a friend that a two-year-old can take in as two or three alike. If the amount must sit on a single friend, say so and the representation, the grid and the rules change with it.
- **Records.** Of the eight records in the brief, two are not named: `us-ca 2.1` of the infant-toddler lane and the peuter card's Hoeveelheden / 1. Both are about number words or counting, and the game has neither. Three are added, read through the lookup on 2026-10-03, all confirmed: `us-ca 1.6` of the preschool mathematics foundations, and the peuter card's Hoeveelheden / 3 and Hoeveelheden / 4.
- **One thing the rules' tests showed about the design.** At `bunches-own-colour` a troop of three cannot slip on its first send, since every bunch is its colour and none holds more than three, so that cycle is nearly always judged as one that went well.
- **A passing troop that shows a bunch is never one friend alone.** When the first bunches come while one friend is on screen, the troop that passes is a pair under a bunch of two, since one balloon is no bunch (`showings.ts`). The sheet says only "a bunch for a whole troop".
- **The audit is clean and not quite the same from run to run.** AUDIT_RUNS
- **Where the cloud page and the guide differ.** The guide says a remote builder's commit messages name no tool; the cloud page gives a fixed last line that names one. The commits on this branch end with the cloud page's line. One commit (`c4f227d`) was pushed with a motion test failing; the next fixed it.
- No pull request is opened from this branch: the lead builds it. Stills, probe output and audit reports were kept outside the repository, and none is committed.
- A subagent wrote the eight rule modules from a brief made of the sheet; it ran no git and touched no existing file.

Still weak:

- Nobody has heard it, and no frame rate has been taken on a graphics card.
- The ending is quiet next to the lift-offs: each friend's proud move, three steps and a wave of balloons. It reads in motion more than in stills, and a child may not notice it is an ending.
- A served friend that takes one too many shows the second balloon in its other hand only while it is carried off.
- Each kind has two ways to take a poke and one way to do everything else; only the speed of a motion varies from one playing to the next.
- At the back of the far hill's ring the friends of a troop are seen one behind the other.
- A waiting troop of three stands so close that its members overlap as seen, though they do not touch.
- On a narrow (portrait) surface the balloons are about 80 logical pixels across: above the jam's floor of 48, under the 100 a two-year-old should have. A test holds both numbers.
- The middle friend of a troop of three refuses a bunch towards the friend on its right, where there is the least room.
- When a step-in brings a first showing, the troop that passes crosses in front of the troop that waits at the edge for about half a second.

### Template notes

One entry a copied file, for the lead and the games after this one.

- `manifest.ts`, `index.ts`, `overlay.ts`, `input.ts`, `scene.ts`, `guidance.ts`, `state.ts` and every copied test: used as copied, byte for byte.
- `scene.ts`: carries all three scenes with no change. A cue beat (`lasts: 0`) that starts a motion or a sound has to know when it is being finished by a touch and not played, so the theatre keeps a flag round `finish()`. **For the template:** `play` could be told, or `Scene` could expose `finishing`.
- `guidance.ts`: used as copied. `handPose` and the ladder's timings were enough; the game supplies what the hand points at.
- `state.ts`: wrapped by `save.ts` in the way its header describes (its `deserialize` for its own fields, then the same raw record again for the game's). That worked with no change.
- `config.ts`: changed where it is meant to be: the `LADDER` ids, three `FIRST_VISIT` rows, and three fields on `Tier` with a row per tier. **For the template:** the generated `FIRST_VISIT` gives a band two rows however wide it is; a comment saying a wider band may want a row per year would have saved a look.
- `audio.ts`: used as copied. Its `tick` is no longer played. **For the template:** a voice of more than one partial needs a small builder that every game will write again (`sounds.ts` here: a list of partials, each a tone or a band of noise with a start, a glide, a peak, an attack and a decay, and a delay and a pace for the whole voice). The cloud page asks every remote game to keep its voices as numbers, so that list and its builder could come with the template.
- The Mount (`balloon-pop-parade.tsx`): changed only where its comments say a game goes in, and as the pilot notes say: the game is built when the slot has been read; `draw` shows the bare backdrop until then; sounds are played inside the gesture handler and again after the step; a touch's outcome is saved at the throttle and the end of a cycle or a step-in at once; a scene playing keeps the ladder at the bottom; what the ladder returns is kept for the draw; `seed=` fixes a new game's layout. **For the template, three things any three.js game meets:** (1) `resize` sets `canvas.width` and `canvas.height` itself, which a `WebGLRenderer` must do through `setSize` and `setPixelRatio`, so those two lines have to go; (2) the loop calls `clock.advance(now)` and drops the step it returns; (3) nothing says where programs should be compiled ahead of play (`renderer.compile` after the first `resize` here).
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen and untouched.

### For the owner to decide

- **The look**: inflatable vinyl toys, and within it a pink hill, since green is the frog's colour and the friends' four hues have to stand apart from the ground and the sky.
- **The toy**: tap a balloon and it goes to the friend. He has been shown it and has not answered.
- **The amount is the friends themselves.** One, two or three friends of a kind come by together and each wants one balloon, where the brief had one friend showing two.
- **Colour is the only attribute.** The brief says colour first. A second attribute (a long balloon and a round one, say) is not in the sheet. Should one follow later?
- **The glow on a balloon is a swell, not a light.** A balloon that can be touched grows and settles and never changes colour, since its colour is what the child sorts by. Is that enough of a cue for him?
- No default of the guide is asked to change.

## Pass log

Every still was drawn in software (SwiftShader) on a paused clock at 1180 by 820, the random stream seeded. No frame rate is a result here; the frame-CPU figures are Chromium at 6 times CPU throttle with tier 0 pinned, on the production build.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike, `look=pair`: two ducks, five balloons, three frogs waiting | The balloons read at once and want to be touched. The ducks are small with pin-prick eyes and stick wings, a cloud sits behind the balloons, the waiting frogs are a green heap sunk in the hill, and a third of the screen is empty pink | Bigger heads, eyes about three times the size, chubby wings; friends drawn larger; the hill flattened so nothing sinks in it and lowered so the friends have the middle of the screen; clouds moved below the row of balloons | Not measured | The waiting troop of three overlaps |
| 2 | All four moments on one sheet | Each kind reads as itself. Two crabs side by side cross claws; a held balloon covers the string of the one above it; the hippo's arms point sideways, so it does not look as if it reaches | Arms swing nearer to straight up for every kind; the crab narrower; the gap between friends, their scale and the waiting troop set so tests hold "side by side without touching"; the sky row raised and its strings shortened; duck and crab hues moved apart after a test found them 37 degrees from each other | Not measured | The far hill is a pale blob with nothing on it yet |
| 3 | The toy, 46 stills of four scripted walkthroughs (press, flight, catch, refusal, lift-off, pop, poke) with each kind | It answers and it is funny: the crab's eyes shooting up, the frog carried off by its bunch. But a pressed balloon goes flat as a plate, the frog's throat covers its whole face, a refused bunch of three hides the crab it hangs beside, the wrong duck (the one with a balloon) does the refusing, and the hippo's eyes vanish when it looks up | Squash kept within what a pillow does; the throat smaller; a refused bunch hangs further out by its own width; the refusal goes to a friend still without a balloon; the hippo looks up without tipping back; the frog's tongue drawn; caps on what one frame may hold after a test of fast tapping drew 35 balloons into a batch of 28 | Frame CPU: p50 5.6 to 5.9 ms, p95 10 to 16 ms over about 75 frames a run (`look=bunches` and `look=mixed`, 33 to 39 draw calls); p50 4.0 to 4.2 ms with 21 draw calls. The p95 is over the 8 ms the jam aims at; at about four frames a second it is the fourth-worst frame of a run, and it was not chased here | The list under "Not yet fixed" above |
| 4 | The toy after the sheet's first check, 8 stills: a troop of three hippos each given one more, one more for a served friend, a refusal beside a duck | The whole troop goes up at once with a balloon in each hand and comes down in a row; the nearest friend alone takes a single in its other hand | Each kind's own sound for being carried off and for landing; catches in a run; the other hand takes the bunch when the string hand is full; a refusal knocks a held balloon; a poked friend's string hums | Not measured again | The hippos sit so flat for a moment that their heads sink into their shoulders |
| 5 | The game, a two-year-old's first minute from a new game, 17 stills | A duck comes by and takes a yellow balloon in its beak, and I see what to do. Then my hippo walks in and puts its arms up. When I do nothing a white thing with two ears comes and pokes a balloon: I do not know it is a hand. For a second in the middle there is nobody there at all | The ghost hand reshaped as a mitten with one finger and a cuff (it had read as a rabbit); the first frame-budget count | Not measured | The swell on the bunches cannot be seen in a still |
| 6 | Three hippos with bunches, 18 stills: served at once, the ending, one too many, the whole troop carried off, a pop, a cloud, the step-in | Three at once is the best thing in the game. But when they yawn for their balloons their heads tip so far back that they have no faces | The yawn tips the head back half as far; the duck's beak and the hippo's yawn take the string before the hand; a second way for each kind to take a poke | Not measured | The ending is quiet beside the lift-offs |
| 7 | The cold playtest proxy on the production build, no age set, 27 stills and then 10 more | Hands off for ten seconds the scene invites a tap on a balloon: two ducks take two, my two hippos walk in and reach up at five. Unclear moments, six: (1) at the start my own troop stands half hidden behind the ducks; (2) the middle is empty for a second after the ducks go; (3) the swell is too small to notice; (4) the far hill's troops walk right behind my right-hand friend's head; (5) the hippo's sneezed balloon flies off over the troop that waits; (6) the hand on the waiting troop sits low on the hill | One fix each for (1) to (4): the troop comes in from beyond the edge, sets off as the passing troop turns to go, the swell is 15 per cent, and the far hill's ring is further right and narrower. Rerun: (1) to (4) gone, (5) and (6) left as they are | Frame CPU: FRAME_CPU | At the back of the ring the far hill's friends are seen one behind the other |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

No physical iPad was measured, and no frame rate is given: every number below is from a machine with no graphics card (renderer: ANGLE, Vulkan 1.3, SwiftShader).

- **Alive at idle.** Balloons bob and their strings sway; each kind breathes, blinks and fidgets at its own rhythm (the duck's tail, the frog's throat, the hippo's sway, the crab's side steps); the waiting troop bobs; the troops that were served go round the far hill. Nothing beckons. Everything stops while unattended or hidden, since all of it runs on the attended clock.
- **Motion and sound on every touch.** Every press is answered in the same call with a sound, wherever it lands outside the grown-up's corner (a test holds this): a balloon squashes under the finger in that frame, a held balloon pops, a friend is poked, a cloud sheds drops, the hill wobbles.
- **Weight, squash and follow-through.** Balloons spring back past round; friends squash on landing and wobble after; each kind's weight differs (the hippo's toes barely leave the ground, and the clouds bounce when it sits).
- **Kid-clear.** At most twelve balloons and nine friends on stage, all one flat hue, on a pale sky with nothing but sky behind the row of balloons. Tests hold the sizes: balloons 108 logical pixels across at 1180 by 820, friends wider, bunches further apart than half a balloon, nothing to touch in the bottom eighth.
- **Wordless clarity for the band (2 to 4).** No word, numeral or symbol; `npm run wordless:check` passes. The friends reach up at the balloons from the first frame, a troop of another kind shows each new idea once by doing it, and every wrong try is answered by what the friend does with it.
- **Wordless guidance.** After three seconds idle what can be touched next swells and settles; after five a ghost hand shows one tap, on one bunch and then another whatever hangs there, or on the troop that waits once the troop on screen is served. It backs off, stops after four, and any touch clears it. Nothing shows while a scene plays or a bunch is in the air.
- **60 fps on a mid-range iPad.** Not measured. Budget: a counted test plays whole games fast and at random and holds the heaviest frame at or under 72 draw calls (nine friends at six draws, fourteen for everything else), no shadow map, no post pass, pixel ratio capped at 2, adaptive quality on four tiers, the loop paused when unattended. Frame CPU at 6 times throttle is in pass 7.
- **Procedural or committed assets only.** Everything is geometry and shader code; no texture, font or file is loaded. `node scripts/egress-check.ts`, `npm run egress:built` and `npm run education:built` pass.
- **Its own art direction.** Inflatable vinyl toys, in `ART.md` under "The look".
- **Nothing passes through anything.** `npm run check:intersections -- balloon-pop-parade` is enforced: nine moments from a new game and from saved games reach every scene, every way a bunch can go and every touch. AUDIT_PR The balloons, which fly, and the strings, which are thinner than the audit can read, are held by tests on the game's own layout and reviewed on the contact sheet.
- **Found as left.** A touch changes the save first, whole, and the end of a cycle and a step-in are saved at once. Tests hold what each scene has saved by the time it starts, and that no scene replays when the game is opened again in the middle of one.

### The learning claim

As the sheet has it after its second check, with every check state read through the lookup on 2026-10-03; to be read again on the day of the pull request.

Balloon Pop Parade is designed from four California learning foundations published by a state department, which are foundations and not standards: `us-ca 2.3` of the infant-toddler foundations, and, each in part, `us-ca 2.5`, `1.4` and `1.6` of the preschool and transitional kindergarten mathematics foundations (of `2.5` the earlier statement's sorting by one attribute, and not the later statement's more than one; of `1.4` seeing a small set without counting, and not telling how many; of `1.6` comparing two sets that are plainly equal or plainly unequal, and not the words for it or the later statement's comparing by counting). It is also designed from five statements of Dutch curriculum-institute guidance, which is guidance and not law: Opereren met vormen en figuren / 1 and Hoeveelheden / 3 and 6 of the peuter card; in part Hoeveelheden / 4 of the peuter card, of which it takes small amounts compared by eye, and not larger amounts or equal rows; and in part Opereren met vormen en figuren / 1 of the fase 1 card, of which it takes sorting by one attribute, and not by more than one. All nine records are confirmed. Sorting by one attribute is taken from both jurisdictions at every age of the band. Seeing a small set at a glance and comparing two small sets are taken from the Dutch peuter card and, from age 3, from the California preschool foundations; for age 2 no California record is named for them. Giving one for each is taken from the Dutch peuter card alone; no California record is named for it.

The sheet's first check found nine things and its second six, all pasted as given, this claim among them; its third round is open.

### Defaults taken for the owner

- Every default under "Symbols, and the defaults awaiting the owner" in the guide, as written: no symbol, letter or word; no reading on an object; no camera shake and no impact pause (the answer is carried by chains, sound and squash); no speech (the friends' voices are invented and synthesized); the first reserved look; the demo's fantasy and feel kept under a new verb.
- From the sheet: sets of one to three; colour as the one attribute; a cycle judged by slips (none is well, one is mixed, two or more is badly).
- From the build: a new game is laid out from a seed drawn for the visit; the glow on a balloon is a swell and never a change of colour; the friends on the far hill are drawn smaller and hazed.

### What the next builder should know

- The education lookup prints a record's standing and check state, and the Limits are in the file it names. Two of the brief's eight records turned out to be about number words, which a wordless game cannot carry; read each record against the verb before keeping it.
- A custom `ShaderMaterial` gets instancing for free from three.js's own prefix (`USE_INSTANCING`, `USE_INSTANCING_COLOR`), and the right normal for a squashed form is the normal divided by each axis's scale squared.
- Keep the view as two halves: a pure "theatre" that plays the rules' outcomes and tells a painter where everything is, and a stage that only draws. The theatre's tests then run with no renderer, and one of them (fast random tapping for forty seconds) found a batch overflow that no still had shown.
- Blend every clip in and out of the resting pose over a few frames. Clips that set an arm outright snapped on their first frame until they did.
- Write the string hand's position as plain arithmetic and test it against the meshes once; then nothing in the frame loop has to ask three.js where a hand is.
- On software GL a run of twenty seconds holds about 75 frames, so a p95 is the fourth-worst frame. Report the p50 beside it and the draw calls, and leave the verdict to a real graphics card.
- The intersection audit earns its passes. Its first full run had 238 findings. Most were the balloons, which fly and are now left to layout tests, and parts of one toy pressing into each other, which are allowed with a cap. The rest were real and each was one rule: a troop that walks keeps its places and nobody passes anybody; an arm comes round the front as it swings; a hand that holds a string stays up; a refusal goes to the side the bunch hangs on; a squashed toy spreads by half its volume; the far hill's ring is shared out evenly.
- Write the test for what each scene has saved at its start with the scene, and put the outcome in the save when the finger lifts, before anything is seen to move. A put-away at any instant then needs no special case.
- A cue in a scene (start this motion, play this sound) must not fire when a touch finishes the scene. Keep a flag round `finish()`.
- The glow on a working piece must not touch what the child sorts by. Lightening a balloon to make it glow turned red to salmon; a swell does the same job.
- The cold playtest found four things in ten seconds that forty tests had not: a troop hidden behind another, an empty beat, a cue too faint to see, and scenery walking behind a friend's head.

<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates
- Look in use: Pinball table, the first look reserved for the game (canvas 2D). The second reserved look was not tried. The lead's check of the full frame passed it: full, funny, alive.
- Sheet: round 1 is handled. Its five findings were pasted word for word as the check gave them (finding 3 in two places, finding 4 in two), and nothing else above "The look" in `ART.md` was changed. The folder is not committed yet, so there is no hash to name: the lead commits it. Round 2: thirteen replacements the builder proposed after Run 2, pasted word for word by the lead, each found exactly once above `## The look`. Round 3: pairs 14 to 24 (reading 1) pasted by the lead, each found exactly once above `## The look`. Round 4: pairs 25 to 38 pasted after the second reading (downhill roll and the fetch, no clap, fading booms, the scale under a plain ball, the seat field, never shut in) Round 5: pairs 39 to 44 pasted by the lead after the third reading, each found exactly once above `## The look`.
- Reading 1 (2 findings a child would notice, 13 slight, six weak lookalikes) is handled in pass 5, reading 2 (2 a child would notice, 13 slight, eight weak lookalikes, one thing not found as left, and the walrus's clap as praise) in pass 6, and reading 3 (nothing a child would notice, 13 new slight points, four weak lookalikes) in pass 7, each finding with a named test. Three readings were made. The game has not been read since pass 7, and no further reading is planned: the builder's own reading of the sheet against the code, sentence by sentence, was the last.
- Pairs 1 to 44 are in the sheet. Pass 7 wrote pairs 39 to 44 (the sleepy brick at the end of its row, where the toys' eyes go, where the ladybird walks, the clearing that no toy answers, the unfolding, and the save of a brick over at the rail); they are listed under "Where the game and the sheet differ", which now lists nothing that differs.
- Open: the registry row is a request to the lead; its text is the last paragraph of `ART.md`.
- Open: nobody has listened to the sounds. They are written as numbers in `voices.ts` and held by tests to their ranges and to the clock of the poses, and no ear has judged them.
- Open: no frame rate has been measured. The machine the game was built on cannot measure one. The draw count, which is sprite stamps plus live fills and strokes, is held at 80 or under by a test that plays every answer; its fullest frame counts 73. The production build of Run 2 read 58 at the top tier in play; no build was made in pass 5, 6 or 7.
- Open: `npm run build` with the built-asset scans was not run: the wave allows a builder one plain build for the cold playtest and nothing more. The lead runs them.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### What the lead should try first

1. Open the game and keep your hands off for ten seconds. Then put a finger on the red bumper and lift it.
2. Keep a finger on the floor under the ball and follow it. Lift, and let the ball land on the bumper with no finger down: it sinks in and rests.
3. Let the ball miss, and listen to the drum. Slide the bumper into the bouncing ball from the side.
4. Aim the ball off an end of the bumper into the walrus's tub, then the dragon's mouth, then the elephant's trunk, and take each ball to the wall. Take one ball twice through the same gate.
5. Put the game away in the middle of a flight and open it again. Do the same while a wall is unfolding.
6. Clear a wall and leave the table alone: no toy cheers, each turns to the folded wall. Then ring the bell with a finger. On the next cleared wall ring it with the ball.
7. Open the fourth and the last place of the order from a saved state to see the sleepy bricks, the seed and its vine, and a pool. Hit a sleepy brick at the end of a row from the inside: it goes over to the rail to lean on it.

### The stills

The stills are kept outside the repository, with the scripts that make them. All are 1180 by 820 unless the name says otherwise.

- `c-*`: the toy, from the dev server (pass 1).
- `d-*`: the first take of the whole game, staged from the game's own rules and view: `d-wall-*` each place of the order, `d-cell-*` every brick under every ball, `d-gate-*` each gate both ways, `d-balls`, `d-drum`, `d-fingers`, `d-cleared`, `d-unfold`, `d-show-hot`, `d-show-wet`, `d-ladder`, `d-everything`, `d-surface-1024`, `d-surface-820`. `e-*`: the same moments in the running game.
- `f-everything`, `f-cell-sleepy-wet`: after pass 2. `g-wall-all`, `g-surface-1024`, `g-surface-820`, `g-tier3`: after pass 3.
- `h-cold-*` and `h-new-*`: the cold playtest on the production build, hands off and then a newcomer who does not follow the ball; `i-see-*` and `j-see-*`: a newcomer who keeps a finger under the ball. `h-sheet`, `i-sheet`, `j-sheet` tile them.
- `k-cleared`, `k-everything`: after pass 4.
- `m-*`, `n-*`: pass 5. `m-everything`, `m-cleared`, `m-wall-all`, `m-wall-ice`, the three surfaces (`m-surface-820`, `m-surface-1024`, `m-surface-667`), `m-winding` (the ball round a tall vine), `m-rollout` (a ball at rest in the ice wall's middle pit rolling out), `n-vine-stays`, and `n-01` to `n-14` from the running game.
- `p-*`: pass 6, staged from the dev server. `p-wall-glass`, `p-wall-ice`, `p-wall-seed`, `p-everything` (the taller wall, the lamps, the tacks, the scattered lamps of the field), `p-fetch-dragon` and `p-fetch-elephant` (a ball at rest in a pit fetched by the tail and by the trunk), `p-roll-glass` (a ball rolling off the full first wall), `p-wallow`, `p-poke-walrus`, `p-gone-vine` (the vine without its seed, short in each row and tall), `p-unfold`, `p-cleared`, the gates, and `p-portrait-full`, `p-tablet-full`, `p-surface-820` for the other surfaces.
- `p7-r3-*`: pass 7, staged from the dev server. `p7-r3-clearing` (the clearing with the toys turning to watch, then the unfolding with the shadow taking an old pool), `p7-r3-watching`, `p7-r3-rail` and `p7-r3-rail-big` (a sleepy brick over at the rail, leaning), `p7-r3-bumper` and `p7-r3-bumper-big`, `p7-r3-scorch` and `p7-r3-scorch-big` (the smudge behind the spare ball), `p7-r3-tail` and `p7-r3-tail-big` (the tuft), `p7-r3-vine` (the standing vine in each row and tall), `p7-r3-rest` (the lamps of the apron).

### The cold playtest proxy

Run once on a production build, with an empty slot and the shell's default age.

**Ten seconds, hands off.** A wall of eighteen glass bricks with faces looks down at a steel ball on a red bumper. The three large toys watch the ball, the lamps chase, the ladybird walks. By ten seconds the bumper glows. The scene invites one thing: a finger on the ball or the red bumper. Nothing was saved and nothing moved by itself.

**A newcomer's minute.** The first finger went on the ball: the bumper squashed, sprang, and the ball rang a brick and cracked it. A finger on a brick made the faces blink. Each toy and the bell answered a poke and changed nothing; a finger on the folded wall is a finger on the bumper, which slides under it. The ball then came to bounce on the drum at the right. A newcomer who slid the bumper about without looking at the ball stopped a hand short of it for half a minute; when the hands stopped, the bumper glowed after about six seconds and a ghost hand showed the slide to where the ball was bouncing. A newcomer who kept a finger on the floor under the ball brought down thirteen of the eighteen bricks in forty seconds, and the ball went through the walrus's and the dragon's gates on the way.

**Unclear moments.**

1. The fallen bricks lay in two even rows of small eyes that filled from the left as bricks fell: a row of marks that keeps count. Pass 4 tumbled the rows; pass 5 took the rows and the order away (heaps in sand under the column each brick fell from).
2. While a child keeps poking in the wrong place nothing points at the bouncing ball; the hand comes only after six idle seconds. Left as the sheet has it: a miss shows where the bumper was not, the drum dips and the inserts light under the ball, and the ladder waits for idle hands.
3. The ball can go into a gate nobody steered it to, and comes back another colour. The toy is seen to take it in and give it back, so the cause is on screen, but the child did not choose it. Left: it is how the gates are found.
4. The first wall is eighteen glass bricks, each two hits. It took the following finger over a minute. This is for the owner.

### Reader

Readings 1, 2 and 3 found no word, letter, numeral or sign. Reading 1 found six weak lookalikes, all redrawn in pass 5; reading 2 found eight more, all redrawn in pass 6; reading 3 found four more, all redrawn in pass 7. Each is held by a test of the drawn numbers. This list is what was redrawn over the whole build, and what remains.

**Marks redrawn because a child could take them for a sign.**

- Three rings inside each other on the lower field: now an uneven burst with a face.
- The gate mats. First half-ovals inside each other like a target, then one half oval with a dark bar on its flat side: now a splash of the toy's colour with three lobes of unequal reach and no bar. Held by a test of the lobes.
- The clasp of the folded wall, a lone ring: now a slanting strap tied to the parcel.
- The crack in a glass brick, which branched: now one jagged line with no branch. In pass 1 it also crossed an eye; it runs down the right end.
- The zigzag lacing of the drum: now tacks.
- The even ribs on the bumper's stem: now two rivets. The even folds on the dragon's belly, the walrus's neck and the tin tub, and the even hairs of the elephant: one of each, with a dent in the tub.
- The bubbles of the walrus's panel, which were rings: now discs.
- The lamps of the apron, six of them exactly 80 apart on one line: now strung so that no two steps and no two heights beside each other are alike. Held by a test.
- The tub's handles, each a stroked outline like a lone ring: now solid lugs of tin; the rivet at one end of each, which read as a dot, is gone (pass 6). A test reads the paint calls and fails on any closed outline stroked on bare ground, on the board, the toys or the pieces.
- The posts on the rails, ten of them, each a ring inside a ring: each is now one red disc with a streak of gloss. Held by a test that counts the discs at each post.
- The shine on wiped glass and on a jelly, two slanting bars alike: now one long wide streak and one short thin one, at different heights; since pass 6 one leans well over and the other is nearly upright, so they are no pair of slashes. Held by a test.
- The two arcs of evenly spaced equal discs on the lower field. Pass 5 made them uneven; they still took turns (a long step and a short one, large and small, one colour and the other) and the pale ones lay in a bowl. Pass 6 scattered both by hand: the eight the ball lights and the pale six under the tray are unlike in step, height, size and colour, none of the four takes turns for more than three in a row, and the heights turn at least three times. Held by tests of both lists.
- The lamps of the apron, each a yellow disc inside an inked chrome ring: each is now one yellow dome with an ink line and a streak of gloss (pass 6). Held by a test that counts the round shapes painted at each lamp.
- The tacks of the drum skin, seventeen dots exactly 38 apart: now twelve, with no two gaps alike, at uneven depths and with heads of uneven size, none taking turns (pass 6). Held by a test.
- A short vine whose seed has gone, a stem that hooked the same way at both ends with one leaf, like a tall letter: now it has no root hook, its stem bends both ways, its tip droops and curls into a spiral of a turn and a half, and it keeps two unlike leaves on opposite sides (pass 6). Held by a test of the line.
- The elephant's hair, one curled stroke like a hook with no dot: now one solid lock swept to a point, a filled shape (pass 6). Held by a test of its outline.
- What lies in the tray. First even rows, then tumbled rows that filled from the left: now heaps in sand, each under the column its bricks fell from.
- The end of the dragon's tail, a triangle that pointed at the ball it reached for, like the head of an arrow: now a tuft, a bunch of four round lobes of unlike sizes all round the tip, with no corner; the tail curled at its side ends in the same tuft (pass 7). Held by a test of the lobes.
- The lamps of the apron, whose heights went high, low, high, low for eight in a row across the two sides: restrung so that along the whole apron neither heights nor gaps take turns for more than three in a row (pass 7). Held by a test, which also catches the old row.
- The vine of a standing seed, a stem that hooked the same way at its root and at its tip: now drawn as the vine without its seed is, a tendril with one spiral at its tip, and the root is a runner that lies nearly flat from the seed to the foot and hooks nowhere (pass 7). Held by a test of the runner.
- The scorch round the dragon's feet in the hot showing, a dashed closed ellipse that appeared whole: now a smudge of overlapping blots of uneven size, each a little in or out of the ball's way, laid only where the spare ball has been (pass 7). Held by a test of the blots.

**The tray, and why it is no measure of progress.** It is drawn as a trough of sand with dunes, grains and pebbles in it from the first frame, so it is never an empty box waiting to be filled. A fallen brick lies under the column it fell from, on top of what fell there before, so nothing fills from one end to the other and the order bricks fell in cannot be read from it. It has no slots. With every brick of a wall fallen there are six small heaps with sand between them, and the pieces cover less than half of the sand, so it is never seen full. Nothing in it is counted, lit or marked, and the shadow of the folded wall sweeps it when the next wall unfolds. What it still does is show what has fallen, which the sheet asks for: a child can see that there is more in it than before.

**What remains, kept, with the reason.**

- The strap on the folded wall is one slanted bar.
- The dragon's smoke ring is a loop, drawn as separate puffs with gaps.
- The posts are ten red discs, each on the end of a rail.
- The lamps of the apron and of the lower field are still discs in a line of sorts: ten along the top and eight over the bumper, uneven in every measure the tests hold.
- A vine ends in a small spiral, as a fern's tip does, whether its seed stands or has gone. With its bent stem and two leaves it is a plant; the spiral is the nearest thing to a written curl left on the table.
- A standing seed's vine and its runner meet at a corner at the vine's foot: an upright stem and a low line to one side. The stem bends and carries leaves and a spiral, and the runner ends in a seed with a face.
- The dragon's tail and the elephant's trunk, out over the table while a ball is fetched, are long curved strokes. Each is rooted in its toy and ends at the ball; the tail ends in a tuft.
- The scorch in the hot showing is, once the spare ball is round, a ring round the dragon's feet, as the sheet has it: a smear with a bumpy edge, half behind the dragon, which fades in a second.
- The shadow of the folded wall is a plain upright band while it sweeps, over the tray and, where the last wall left a pool or a vine, over the board.
- The tacks are still twelve dots along one edge, and the lamps of the field are still round, pale and many: scattered, and in no line, arc or bowl.
- An icicle is a point hanging from its ice.
- The quilt of a sleepy brick is a chequer of small squares.
- The ghost hand of the idle ladder is a hand.
- The lifted corner of the folded wall leans towards the bell. It is a corner of the parcel and has no head.
- The clouds in the band above a tall surface are five, of five sizes, none in a row.

### Where the game and the sheet differ

Nothing differs. Pairs 1 to 13 were pasted into the sheet in round 2, pairs 14 to 24 in round 3 and pairs 25 to 38 in round 4. Pass 7 wrote six more, numbered 39 to 44, and the sheet now says what the game does in each:

39. A sleepy brick with a brick beside it leans on that neighbour. At the end of its row it shuffles over to the rail, leans on it, snores once and shuffles back; it waits while the ball is between it and the rail. The empty column a seed keeps for its vine is no gap, and the brick leans towards it.
40. A toy's eyes follow the ball, except over a cleared wall while the ball is not in the air, when they are on the folded wall, and during the unfolding, when they are on the sheet.
41. The ladybird walks along the apron at the top of the table, above the roof rail.
42. No toy answers the clearing. Each turns, after its own delay and without a sound, to watch the folded wall in a posture of its own, and stays turned while the wall lies cleared. The bell and the unfolding are the scene, it is filled in from the rubble alone, and a touch that ends it leaves it silent from that frame.
43. In the unfolding the shadow that sweeps the tray also takes a pool or a vine the last wall left, which are seen until then; a brick that waited for the ball sounds its note once, when it stands; the toys watch and turn back when the wall stands.
44. A sleepy brick that has gone over to the rail is saved in its own place.

### Findings not yet fixed

- The tests of a ball at rest put it on every brick top of every wall of the order as laid, with each single brick gone and with eight sets of several gone, and on the last wall from ten seeds. That is not every set of fallen bricks a wall can reach.
- A ball that rolls off a flat top starts by itself, sideways, to the nearer open side. It never rises, but a top is level, so the first move is a start from rest with nothing to push it.
- Only the dragon and the elephant fetch. The walrus cannot reach the wall and the ladybird pushes nothing.
- A ball left bouncing still comes up off a drum that has gone silent, after about eighteen booms. The ball has to keep coming up so that the bumper can be slid under it.
- A sleepy brick with a pool beside it leans over the pool, where nothing stands, and one beside the empty column of a seed leans towards that column. A pool is kept in its place of the wall, so nothing else can be stored there. Only at the end of a row does the brick go over to something to lean on, the rail.
- A brick that leans on the rail in the top row at the left stands for about a second in front of the dragon's gate, and a ball flown at the gate then meets the brick.
- A touch that ends a scene cuts every sound at once, by taking the output away. Nobody has heard whether that clicks.
- A ball on the floor beside the bumper lies under the overhang of the cap, up against the stem. Seen from above that is a ball half under a red bar; the cap is drawn in front of nothing there, and the ball is drawn whole.
- The wall is laid taller on every surface, not only in portrait: the stage is one layout scaled whole. A brick's own place is 58 by 51 px at 820 by 1180 and 55 by 48 px at 768 by 1024. On a phone it is smaller than 48 px, and there the padded target and the nearer brick answer the finger.
- The walrus's wallow is a small movement beside the dragon's and the elephant's answers.
- A wide surface shows each toy's panel colour at the sides, flat. A tall one shows sky with clouds and sand with dunes.
- A hot ball out of the dragon's gate meets the top-left brick at once on a wall that has one there, so that brick is always the first to sag.
- The faces in the tray are small. Each is a pair of eyes of about five units.
- The elephant's trunk lies over its left ear when it reaches for its gate.
- The lower field under the tray is still the quietest part of the frame.

### Template notes

- `game.tsx` (here `brick-buster.tsx`): changed. The Mount keeps the template's order of work and swaps its placeholder for the table: a press goes to the rules with the stage point and whether it is in the grown-up corner, a touch in that corner does not reset the idle ladder, the sounds a step made are played once after the step, the save is asked for through the cadence, and when the game goes to rest the Mount swaps the table for the one its own save sets up. **For the template:** the Mount has no named place where a game hands over "the sounds this step made", and none where a game is swapped for its settled self on rest; a game that writes its answers as beats on game time needs both.
- `config.ts`: changed. The backdrop, the tiers (density, lights, shards), the order and the first visit by age.
- `manifest.ts`: changed. The icon family is `play`.
- `state.ts`: used as copied. `save.ts` wraps it with the wall, the tray, the bumper, the ball and what has been shown.
- `audio.ts`: changed in one place. Going to rest takes everything that is sounding off the output and gives later sounds a new master, so a sound cut by a put-away plays no tail on return; a test holds it. Since pass 7 the same cut has a public name, `hush`, which the Mount calls when a touch ends a scene. The game gives it notes with no delay; each note is handed over at the instant its beat falls. **For the template:** a suspended context plays the rest of a cut sound when it wakes, and a `Note` carries a delay, which lets a sound be timed apart from the pose it belongs to.
- `putaway.ts`: the game's own. At rest the Mount takes back the idle ladder's time, so the ghost hand does not show the moment the child returns, and swaps the table for the one its save sets up, fitted to the surface. It also holds the two steps the Mount makes after every step of the rules: `keep`, which hands a change to the save cadence, and `voice`, which plays the step's notes after cutting what was sounding if a touch ended a scene. **For the template:** the idle ladder's time carries over a rest.
- `scene.ts`: used as copied, for the clearing, the unfolding and the two showings. **For the template:** a cue of a beat needs to know that a touch is landing it, as its sound does; the game passes `finishing` on to its cues so that a brick stood up by the touch makes no sound.
- `guidance.ts`, `input.ts`, `overlay.ts`, `stage.ts`, `rng.ts`: used as copied.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, used as copied.
- `symbols.ts`: not in the folder; the band starts below six.
- The frame-budget test is `view.test.ts`. It draws into a counting surface, so it needs no browser.

### For the owner to decide

- The look and the toy, at the toy checkpoint: Pinball table as the stills show it, and sliding the bumper under the ball.
- The sounds, by ear on the tablet. Nobody has heard them.
- The length of the first wall: eighteen glass bricks, each two hits.
- Whether the ball going into a gate nobody steered it to is welcome.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The first stills of the look and the toy: rest, pressed, flight, a brick ringing, the three pokes, the idle hand. | "The clouds are on top of the game. The walrus has no teeth. The broken one has a cross on its eye. The dragon did nothing when I poked it. The line on the floor sticks out. It is empty in the middle." | Reading at a glance: the apron painted under the panels and the field; the walrus raised so its tusks show; the crack moved to the brick's right end, clear of the face; a larger flame and an inked smoke ring; the drum's ripple kept inside the rails; pale fringes and a second arc of inserts on the board; the rubble lowered clear of the foot row. Nothing reverted. | Not measured: this machine cannot measure one. Draw count 55 to 57. | The lower field is quiet. The ghost hand is faint. The ball keeps itself going on a bumper nobody holds. The ball passes over the rubble. |
| 2 | The first take of the whole game (`d-*`, `e-*`): every place of the order, every brick under every ball, the gates, the cleared wall, the unfolding, the showings, the ladder, two more surfaces. The rulings of the sheet's check were built into this take: the tray under a clear cover, a burst with a face in place of the rings, inserts in the lower field that light as the ball passes, and a dark outline on the ghost hand. | "The doors in the sides are targets, do I shoot them? There is a ring on the parcel at the top. The ladybird walks into the corner where the grown-up button is." | What each thing is: each gate one patch of its toy's colour and a dark slit along the rail; a slanting strap on the parcel in place of the ring; the ladybird's walk stopped short of the corner. One try reverted: gate mats as half-ovals inside each other read as targets. | Not measured. Draw count 49 to 62 in play. | The faces in the tray are small. The awake sleepy brick climbs down with its eyes shut. A sleepy brick turning over goes thin as paper. |
| 3 | `f-everything`, `f-cell-sleepy-wet`, then `g-*`: all five bricks at once, the sleepy brick under a wet ball and under a finger, the lowest tier. | "The bed went flat like a line when it turned over. The one that woke up is climbing with its eyes shut. The eyes in the box are too little, are they bugs?" | Faces: round open eyes on the sleepy brick that woke, all the way down; larger eyes on what lies in the tray; the turn-over as a squash and a swap, never a sliver. Nothing reverted. | Not measured. Draw count 72 at the fullest frame the test reaches. | The tray's pieces lie in even rows. The elephant's trunk crosses its ear. |
| 4 | The cold playtest on the production build (`h-*`, `i-*`, `j-*`): ten seconds hands off, then a newcomer's minute, twice. | "Where do I touch? The red one is shining, I touch that. It went up! The ball is over there now and my thing is here. Oh, the hand. All the eyes in the box are in a line, like counting." | A heap, not a count: the tray's slots tumbled, each off its place and at its own lean, the pieces a little smaller so none crosses the next, and a test that no three in a row are even. Stills `k-*`. Nothing reverted. | Not measured. Draw count 58 at the top tier in the production build. | A child who pokes away from the ball gets no pointer until the hands stop. The ball enters a gate unsteered. The first wall is long. |
| 5 | Reading 1, read whole, and new stills of every state it names (`m-*`, `n-*`): the full table, a cleared wall, three surfaces, a ball in the ice wall's pit, a tall vine, a vine without its seed. | "The ball is stuck up there and I cannot get it. It broke one and I did not do anything. The box fills up, is it full when I win? The walrus is clapping for me. The lights are in a row like dots. It showed me the dragon thing before I touched it." | Nothing by itself, and nothing that keeps score: a ball at rest rolls out and strikes nothing, and a second landing on a brick top is silent; the vine carries a ball once until it has come down; the bell is solid to a slipping ball and rings only when struck; the tray is sand with a heap under each column; no toy claps at a clearing; a showing waits for the first press and for the finger to lift; the six lookalikes redrawn; what the sheet promised and was not drawn is drawn (the ball round the tall vine, the ice's breath, the dragon's open mouth and hidden flame, a mouth and a flinch on every brick, the vine staying, the ball drawn in to each toy); bricks answer a finger over 48 px; the ladybird's walk and the bands follow the surface; put-away takes back the ladder's time and cuts the sound. One try reverted: bricks that leaned away from the ball were drawn off the box the rules meet, so only the face moves. | Not measured. Draw count 73 at the fullest frame the test reaches; 63 on the staged full table at 820 by 1180. | A lone short vine is a hook with a leaf. Side bands are flat colour. A brick's own share on a full wall in portrait is 33 px high. Enclosed pockets have no way out. |
| 6 | Reading 2, read whole; the sheet read against the code sentence by sentence; new stills of what changed (`p-*`): a ball fetched by the tail and by the trunk, a ball rolling off the first wall, the walrus wallowing and slapping its belly, the vine without its seed, the taller wall on three surfaces. | "The ball went up the wall all by itself and nothing made a noise. The walrus clapped for me when I finished. The boom keeps going and going and everybody keeps jumping. The ball is shut in the middle and I cannot get it. The little plant is a letter. The lights go big, small, big, small." | Nothing by itself, nothing for the child, nothing without end: a ball at rest rolls off downhill only, with a rumble and flinching bricks, and from a pit the nearer of the dragon and the elephant fetches it with its tail or trunk; no toy claps at all, and the walrus wallows and snorts for water and slaps its belly with one flipper; every boom is softer for every ball and what moves with it stops; an unfolding wall stands no brick that would close the ball in; under a plain ball every brick sounds its place's note; a gone seed fills no place; a sleepy brick that moves carries no stale look; the sheet is drawn under the bricks that stand up from it; the vine lifts the ball as its tip reaches it; each gate draws the ball in in its own manner; a hot ball leaves its own pool lying; a showing waits for its toy; every change to the wall asks for a save in its frame; the wall is laid taller so a brick's own place is 48 px on a tablet held upright; a ball resting off the middle is found there; eight lookalikes redrawn. Two things turned up on the way and were fixed: a ball in the mouth of a row gap is put outside both bricks, and one the bell pushes is kept inside the rail. One try reverted: rows 70 apart gave 45.6 px at 768 by 1024, so they stand 74 apart. | Not measured. Draw count 73 at the fullest frame the test reaches. | The roll off a level top starts by itself. Only two toys fetch. The drum goes silent under a ball that still bounces. A sleepy brick leans over a pool. The wallow is small. |
| 7 | Reading 3, read whole, each point checked against the code before it was changed (one number in it is off: the air between a low ball and the stem was 22 units, not 39); the sheet read against the code sentence by sentence, for the last time; new stills of what changed (`p7-r3-*`). | "They are all happy I finished, the walrus hit his tummy. The sleepy one fell asleep on nothing. The red thing pushed my ball and did not touch it. The brown ring was there before the fire ball went round. The puddle was gone before the broom came. His tail is an arrow. The lights go up, down, up, down." | The clearing is not about the child, and nothing happens across air or ahead of its cause: no toy answers a clearing, each turns to watch the folded wall and the unfolding in its own posture, without a sound; a sleepy brick at the end of its row goes over to the rail to lean on it; the bumper knocks with the shape it is painted with, cap and stem; the scorch is laid behind the spare ball; a pool and a vine of the last wall go with the sweep, in sight; a brick that waited sounds once, when it stands; every pool a hot ball made in one flight is its own; the save is asked for when the ball leaves an off-middle seat; a showing leaves the idle ladder alone; a touch that ends a scene cuts what is sounding and hushes the last brick's fall; a finger that lands wins over the bumper's own rocking; four lookalikes redrawn (the tail's tuft, the apron lamps, the standing vine, the scorch). Nothing reverted. | Not measured. Draw count 73 at the fullest frame the test reaches; 58 at most on the staged frames of this pass. | The builder's six stay: the roll off a level top starts by itself; only two toys fetch; the drum goes silent under a ball that still bounces; a sleepy brick leans over a pool; a brick's share on a phone is under 48 px; the wallow is small. And: the standing vine and its runner make a corner; a brick at the rail can stand in front of the dragon's gate for a second. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

Three readings of the folder were made by a reader who did not build it, after passes 4, 5 and 6, and each was answered in the pass that followed. No reading was made after pass 7: the builder's own sentence-by-sentence reading of the sheet against the code was the last.

### The README row

| Brick Buster | `games/brick-buster/` | 5–9 | A pinball table from above in canvas 2D: slide a rubber bumper under a steel ball to flick it into a wall of five kinds of brick with faces, and steer it through a walrus's tub, a dragon's mouth or an elephant's trunk to make it wet, hot or heavy, which changes what every brick does. No learning goal. |

### How the game meets the quality bar

- **Alive at idle.** The lamps chase, each toy breathes and blinks at its own rate, the ladybird walks, the bricks blink and watch the ball, and over a cleared wall the toys are turned to the folded wall. All of it stops while the game is unattended or hidden; a test holds that a minute with no touch changes no saved field.
- **Motion and sound on every touch.** A finger is answered in the frame it lands: the bumper squashes with a creak, a brick, a toy, the bell, the ladybird and the drum each answer in their own way. Every sound is synthesized, and is a note of a beat that also sets a pose.
- **Weight, squash and follow-through.** The bumper is a rubber spring that overshoots; the ball stretches in flight and squashes the bumper; a heavy ball flattens it and goes lower; the drum dips and ripples; each toy has its own manner and the elephant answers late.
- **Kid-clear.** Three large toys, one wall, one ball, one bumper, on the palest part of the frame. Each kind of brick has its own outline as well as its own colour.
- **Wordless clarity for the declared age.** The band starts at five: no word, letter, numeral or sign is drawn, and the marks that could be taken for one were redrawn (the "Reader" section). One want per scene: the ball over a standing wall, the bell over a cleared one.
- **Wordless guidance.** The idle ladder glows the bumper, then shows a ghost hand: a flick while the ball rests, a slide to where it bounces, the bell over a cleared wall. Any touch clears it, a touch in the grown-up corner does not reset it, and neither does a first showing, which is a toy's own act.
- **60 fps on a mid-range iPad.** Not measured: the machine the game was built on cannot measure a frame rate, and the lead measures it. What is held by test: the pixel ratio is capped at 2; a frame is one full-surface stamp and at most 73 draws at the fullest frame reached, under the bar's 80; there are no shadows and no post pass; sprites are painted once per size and density; the loop stops while unattended; four tiers step down the density and leave out the additive lights.
- **Procedural or committed assets only.** Everything is painted in code at run time. No file is loaded.
- **Its own art direction.** Pinball table, registered by the lead from the last paragraph of `ART.md`.

### What was measured

- Draw count: 73 at the fullest frame the frame-budget test reaches (every kind of brick, a vine, a pool, twelve fallen pieces, a plain ball); 58 read in the production build of Run 2 at the top tier during the cold playtest.
- Frame rate: not measured on any engine or device.
- Tests: the game's own, with the rules stepped at 1/120 of a second. Overlap is held by model tests at 1180 by 820, 1024 by 768 and 820 by 1180, by forty seconds of random play at each place of the order on three seeds, by a ball put at rest on every brick top of every wall of the order, which must roll off downhill only or be fetched and strike nothing, and by every wall that can unfold standing up round a ball put in each of its places, which must never be shut in.
- Saved state: the largest legal state is far below half of the 64 KB cap, by test.

### The learning claim

The game has no learning goal. It is designed from no record of either jurisdiction and claims no school skill.

### Defaults taken for the owner

- A first visit starts at the first wall for a child of five or younger or of no known age, at the second for six or seven, at the third for eight or older. A saved position wins. Every wall is reached by play at every age.
- The first wall is full: eighteen glass bricks.
- A ball that lands on a bumper no finger is on comes to rest there.
- The ball is never lost: a miss bounces on the drum in place for as long as the child likes.
- A first showing waits for the first press of a visit and then for two seconds with no finger down, and plays once ever.
- No ball stays on the wall: one that comes to rest there rolls off downhill only, and from a pit or a shelf the nearer of the dragon and the elephant fetches it and sets it on the bumper. It strikes nothing.
- Every boom of a ball left bouncing is softer than the last, for every kind of ball, and after about six nothing hops or jumps for it.
- The wall's rows stand 74 apart, so that a brick's own place is 48 px each way on a tablet held upright.
- A vine carries a ball once, until that ball has come down to the bumper or the drum.
- The idle ladder keeps the template's timing.
- What has fallen lies in a tray of sand below the ball, in a heap under the column it fell from, not as solid rubble and not in a row.
- No toy claps, at a clearing or at any other time. The walrus wallows and snorts for anything wet.
- No toy answers a clearing. Each turns to watch the folded wall, silently, and the bell and the unfolding are the scene.
- A sleepy brick at the end of its row shuffles over to the rail to lean on it, and shuffles back.
- A touch that ends a scene cuts whatever is sounding.

### What the next builder should know

- Write every answer once as beats that set a pose and its notes at one instant, and give the audio no delay. A sync test then needs only to compare beat times.
- Give the rules a method that returns the table its own save sets up, and have the Mount swap to it on rest. "Parked equals loaded" is then one comparison per state.
- Keep a display list beside any saved list that a scene empties when it starts, or the view has nothing to draw while the scene plays.
- A view test that draws into a counting surface holds the draw budget, the single full-surface stamp, and that every pose value the rules set is read, without a browser.
- Staging stills from the game's own rules and view, loaded from the dev server into a page, reaches every state in seconds; playing to them does not.
- A playtest script that slides about without looking at the ball tells little. One that finds the ball by what moved between two frames plays like a child who follows it.

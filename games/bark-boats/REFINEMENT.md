<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. The full game is built to the sheet (the hull choice and the bare stone, twelve makings, every cell of the bank grid, the six places of the brook, the pond, the lamp and the morning). Three readings by fresh readers who ran nothing are closed: every finding is built or paired, each built one with a named test that fails with the fix taken out (passes 6, 7 and 8, and "Reading 1", "Reading 2", "Reading 3" below). There is no fourth reading: the game is closed by the builder's own last reading of the sheet against the code, under "The sheet read against the code".
- Look in use: woodblock river print, the first look reserved for the game. The lead passed it at the toy checkpoint. The owner has not seen the game yet. Its guide is under "The look" in `ART.md`.
- Sheet: round 1 came back with 9 findings and round 2's findings are pasted too; every replacement is pasted word for word and nothing else above the art guide was changed. Round 2: pairs 1 to 10 pasted by the lead. Round 2: pairs 11 to 20 pasted by the lead. Round 3: pairs 21 to 27 pasted by the lead. Round 4: pairs 28 to 31 pasted by the lead.
- Open: no frame rate has been measured on a target. The stills came from a software renderer, where a frame's work had a median of 0.3 to 0.7 ms; that is not a frame rate. The shared probe has not been run on this game.
- Open: nobody has heard the sounds. They are held as numbers by `voices.test.ts`, to the step of their motion by `sync.test.ts`, and through endings and put-away by `endings.test.ts`.
- Open: the cold playtest has not been replayed since the first screen changed in reading 1 (one glow, and a hand that builds first). No production build was made in the passes for the three readings.
- Open: no child has played it. What a child would still notice is listed under pass 8's "Still weak" and under "For the owner to decide".
- Closed: reading 1 found seven things a child would notice, eight slight promises and three lookalikes; reading 2 three, thirteen and two; reading 3 one that was not listed and two that were, five slight ones not listed, and four weak shapes to list. Held by a still and by no test: the redrawn walnut furrows, bark strokes and rush tufts, and how the gust in the sky and the small puff off the far bank look.
- Stills: kept outside the repository with the lead. Run 2's set is the bank, each of the six places, the pond at dusk, the ghost hand at five surface sizes, a played round, and the cold playtest (thirty stills). Reading 1's set is four: the first screen with its one glow and the hand, the fall, the morning wash half way up, and the joint between the pond and the fall while the view runs back. Reading 2's set is four: the hand's first showing on a bare hull (the twig to a mast place), its next showing (the maple leaf to the twig that stands), the pond at dusk with four boats moored before and every lamp lit, and a walnut boat with two bare masts and three loads. Reading 3's set is three: the pond at dusk with the moored row at unlike heights (taken before two of its boats were moved 10 and 6 units), a pile of three blankets with a tap on the sky and one on the far bank, and a walnut boat with a full deck and the gnome under a blanket. To remake one, serve the jam and open `?chrome=0&seed=1&tier=0#/play/bark-boats`.
- Try first: press the maple leaf on the twig; carry the boat by its hull to the water; lay a finger in the water behind it and follow it down the brook; at the pond, after dusk, lift the sun. Then build a second boat with the pebble and the tall stalk and see where each place holds it. New since reading 1: wait five seconds on a first visit and follow the hand; press a berry on the boat while it floats in the eddy; touch the tip of the gnome's hat; lift the sun and watch the lamps go out as the wash passes them. New since reading 2: on a bare hull wait for the hand (a mast first, then a leaf for it, never a leaf on the deck); hold a making while a ring sends the boat off and see it stay under the finger; drop a thing on the tip of the gnome's hat; lay a finger in the water beside a floating twig; send a boat with two masts and one sail past the sprite and the stones; put the game away while the stones scrape a heavy boat to a stop and open it again. New since reading 3: touch the boat while a place is answering it (it knocks and bobs, and the answer goes on); take a bare mast by its foot; pull a sail off the boat while it floats in the eddy; tap the sky and the far hills; put a hull on the stone while the boat floats; lay a finger beside a twig as it turns in the water.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a file copied from the template.

- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts` (frozen) and their tests: used as copied.
- `audio.ts`, `input.ts`, `overlay.ts`, `rng.ts`, `stage.ts`, `state.ts`, `scene.ts` and their tests: used as copied. `scene.ts` runs the three scenes of the sheet.
- `guidance.ts`: the code is as copied and two comments were edited, the header and the line on `glow`, to say that the glow is on one thing (the thing the hand is about to take) and not on everything that can be touched. It is not one of the four frozen files, so the edit is allowed and the folder's template test passes.
- `state.test.ts`: changed in one place. The designed order of this game has one place, so the test that read the second place of the ladder reads the first, with a comment that says so. **For the template:** that test assumes a ladder of two or more places.
- `config.ts`: the backdrop is the paper colour, the tiers carry `waterLayers` beside the pixel ratio, and the ladder and the first visit are the sheet's.
- `manifest.ts`, `index.ts`: the game's own values; the icon family is `play`.
- `bark-boats.tsx`: the Mount as copied, wired to the game's `Session` (the model and every rule of touch, with no DOM in it) and its `Bus` (the sounds). **For the template:** `audio.ts` has no way to mark a sound as a scene's and shut only those when a touch ends the scene, so the game adds `bus.ts` beside it and leaves `audio.ts` as copied. A template `audio.ts` with scene lines would save every game that file.
- `recording.ts` (the test canvas): it gained `transform` and a digest folded from every call, so a test can say two frames are the same picture. **For the template:** both are useful to any canvas game.
- `symbols.ts`: not present, as the band starts at 4.
- `ART.md`, `REFINEMENT.md`: filled in.
- A note any canvas game needs: the dev page logs one 404 that is not from the game, so a still script that fails on any console error fails for nothing.

### For the owner to decide

- The gnome is now half as large again (270 units with his hat). The boat did not grow with him, so he fills the stern; a second mast stands in front of him, never behind.
- "Downwind" for his hat is read as toward the bow: the wind and the sprite's breath come from upstream, behind him, so the tip streams forward over his face. If the hat should trail behind him as he moves, that is one sign to flip.
- The small fall was redrawn after reading 1: a dark lip, strands of unequal length, foam at a ragged foot and a deeper pool below. Whether it reads as a fall before the boat reaches it is for a child to say.
- The nearest thing to praise and blame in the game: the gnome cheers when a mast is pressed in and at a broad sail (arms up), and is glum with a pebble aboard (arms folded, shifted away from it). Both are his opinion of the boat, the same every time, and neither is about the child; the pebble also gets the biggest answers in the brook, so the glum face is not a penalty. If either reads as a verdict, the faces can be made milder without touching the grid.
- **Nearest to a counter: the moored row and its lamps.** The pond shows the boats sent before, up to four beside the new one, each with its lamp lit, so a child who wants to can count them. Why they are the pond's and not a score: each is the boat the child built, as built, and is told from the others by its own hull, masts, sails and load, not by its place in a row; they lie at four unlike spots along the far side, of unlike size, height and gap, none behind the newest boat or the gnome (so three of them lie to the right of the lily field, along the far shore), and each lamp hangs on its own boat (in its cap, on its mast or on its bow), as large as that boat is drawn, so there is no row of equal dots, and since reading 3 the three to the right lie at three depths, 20 units and more apart (`pond.test.ts`); a sixth boat takes the place of the oldest, so the row stops growing; nothing is shown as a number, nothing is given or opened for a full row, and nobody on screen looks at the row or says anything about it. Since reading 2 the row answers a new lamp with one soft chord and lights inside one span of 0.9 s, whatever its length, so nothing heard grows by one for each boat. In the still the row is still five warm rounds on a dark print; if that reads as a tally, the earlier lamps can stay unlit.
- **Nearest to praise: the leaf the hand shows.** The hand's first sail is the maple leaf, which is also the one sail the gnome cheers. The birch leaf lies where the whole hand does not fit on the sand, so the hand cannot start from it without the sand being laid out again.
- The hand has to start from some thing on the sand. At five and younger it starts from the maple leaf, a sail for the twig that already stands. On a bare hull, at six and older and on every morning after the first, it shows a hull to the stone, then the twig to a mast place, then the maple leaf to the twig, and never a thing to the deck. It shows where a thing goes; a child may read it as which thing to take.
- A boat with two masts that do not both carry a sail has an answer of its own at the sprite (her breath sings in the bare mast like a flute, twice, the boat only nods and the gnome claps his hands over his ears) and at the stepping stones (it sidles through and the bare mast runs along a stone like a stick along a fence, three ticks). The sheet's row "Two masts" describes two sails, so these two answers are the builder's and are not in the sheet's grid; the lead ruled that they are built and not paired.
- On the walnut shell the three loads lie in one row: the first sits on the rim at the bow and the third beside the gnome's hip, half behind him when he is in his seat. A finger on that load takes the load, also where the gnome is drawn over it. It is the only way each load keeps a finger's room on so short a deck.
- **Touch rooms.** Lying, at 1180 by 820 and at 1024 by 768, every load and every blanket on a deck keeps 48 px or more each way with its neighbours counted (`deck.test.ts`). Standing, at 820 by 1180, the stage is 0.69 of its size and no deck is long enough for that: the things share the deck, the nearer middle taking the finger, with no gap between two things that lie side by side, and the smallest room any of them has is 38 px. The makings on a fresh bank keep 48 px standing too (`touch.test.ts`).
- **Which part takes what at a mast.** A finger on a mast takes the mast anywhere along it, from its top down to the rim of the hull; below the rim the finger is on the hull and lifts the boat. One exception: inside 29 units of the middle of a load or a blanket, the finger takes that thing. So with a second load on the deck, which lies against the bow mast, the lowest 19 units of that mast above the rim are the load's on the bark curl, 29 on the pea pod and 14 on the walnut shell; and on the walnut shell the lowest 6 units of the stern mast are the third load's. With no load there the whole mast is the mast's. A mast that carries a sail is held by it: the sail comes off first.
- Three leaves on a deck with no mast lie as a pile over the gnome's seat that leans toward the bow, each 30 units along and 30 up from the one under it. The lowest shows only an edge under the other two. It is a rare boat, and each leaf keeps its finger's room.
- Two voices are new and unheard: `chord` (the row's answer at the pond) and `flute` (the sprite's breath between two masts).
- The frog swells to half as large again at the feather, not to twice his size: at twice he would cover the kingfisher's perch above him and leave the print at its left edge. The kingfisher ruffles to nearly half as wide again. Pair 14 asks for the sheet to say so.
- A portrait surface shows the jam shell's own turn-the-screen page, so the game was not looked at in portrait; upright sizes are held by tests only (`touch.test.ts`, `frameBudget.test.ts`).

## Pass log

One row per pass. No frame rate is given where none was measured on a target; the draw count is stamps plus pen.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | Five stills of the toy at 1180 by 820 and three short sequences (the pebble and the berry let go by the frog, the idle ladder). | "My stone went in the water and then it was gone." A thing floating home went under the wide stone and the boat on it for a second and came out on the sand. "The yellow came on while my stone was still swimming." The glow rose over a thing that was still on its way. | One theme, a thing let go is never lost from sight: a floating thing rides along the shore, swings out round the stone, and comes in over the bank only at its own spot (`bank.ts`, `view.ts`, a test in `bank.test.ts`); the ladder waits while anything the child set going still moves (`moving` in `bank.ts`, the Mount); a spot on the bank is rounded before it is tested, so two things never lie a hair into each other (`pieces.ts`, found by `placement.test.ts`). | Not measured. Draw count 78 to 85 in the stills (stamps plus pen). | The gnome's hat does not clearly stream downwind in the blown still. A broad leaf floating past a boat afloat is drawn behind the hull while it is nearer. The ghost hand has not been looked at in a still. |
| 2 | Run 2's first stills: the bank and each of the six places at 1180 by 820. | "The boat is hiding." Among the reeds the boat came in under the frog, at the frame's edge. "The frog is cut in half." He sat across the edge of the print. "The tree has no top." The pine at the branch was cut by the margin with its trunk ending in the air. | One theme, whoever is in a place is whole inside the print and the boat comes in clear of them: the boat enters further in and can be pushed back upstream only a little (`journey.ts`), the frog among the reeds sits inside the frame (`layout.ts`), the pine at the branch is drawn whole, and the reed sheets are thicker so the place reads as reeds. Stills again: all six places. | Not measured. 34 to 54 draws in the stills. | The far strip showed a seam between two frames. |
| 3 | The view moving on from place to place, and a played round from the bank to the fall. | "The hill has a line in it." The far strip had a seam where it repeats, and a green band under the ochre shore. "The mountain ate the sun." At the stepping stones a second mountain stood on the sun. "The fly is on his nose." The dragonfly's loop crossed the gnome's face. | One theme, nothing in the background lands on a face or on the sun: the far strip is drawn as one run of hills over both its frames with one foot line (`sceneryArt.ts`), the second mountain moved clear of the sun, and the dragonfly's loop is low over the near water (`layout.ts`, `rig.ts`). Stills again: the six places and the pan. | Not measured. 64 draws at most while the view moves. | The ghost hand had not been looked at. |
| 4 | Stills of the ghost hand at the bank, afloat, held on the sill, on the brook and at the pond, at 1180 by 820, 667 by 375, 1600 by 700, 1024 by 768 and 568 by 320. | "The hand goes through the little man." Its carry of the boat to the water crossed the gnome. "Only some things are yellow." The glow stopped after six things. "The bird's head is under the button." At the branch the kingfisher's head lay under the home control. | One theme, the ladder shows everything and covers nobody: the boat's carry ends at the eddy's downstream end, every touchable glowed (up to fourteen then; since reading 1 the glow is on one thing, see pass 6), the kingfisher and his branch sit left of the home control, and the hand is only ever shown where the whole of it fits (`open.ts`, `layout.ts`, `view.ts`; `hand.test.ts`, `ladder.test.ts`). Stills again at all five sizes: the hand is whole in each. | Not measured. 62 draws with the glow and the hand. | See the cold playtest. |
| 5 | The cold playtest below: thirty stills of a first visit at four, on the production build. | "The hand wants the leaf." With the boat afloat, the hand's fingertip was in the water but the rest of it lay over the glowing sand. "He bumped the water girl." The boat came into her place with the gnome's lamp on her arm. | One theme, the hand and the boat are read where they are: at the bank the whole hand lies in open water behind the boat, and the boat comes into every place 40 units further downstream and can be pushed back upstream only as far as it used to come in (`open.ts`, `journey.ts`; `hand.test.ts`). Stills again: the hand afloat, the sprite's place, the branch. | Not measured. 34 to 61 draws on the build. | The fall before the boat reaches it; the gnome hidden behind the reeds for a moment, which is the place's own joke. |
| 6 | Reading 1, by a fresh reader who ran nothing, and four stills after it: the first screen at five seconds, the fall, the morning wash half way up, the view running back from the pond past the fall. | "I touched the boat and it did not come." The boat was touched where it had been, not where it was drawn, in every answer of the brook and while held. "His hat does not work." Only his middle answered. "Everything is yellow." Eleven glows, and a hand that sailed the twig boat away before anything was built. "They all went away." On the morning the gnome, the berry, the pads and the lamps vanished before the sky wiped. "It did it again." A place answered a second time after put-away. "That is a ladder." The fall. And in the new stills: "There is a line in the water." The pool below the fall ended in a straight edge where its frame joins the pond's. | One theme, what is drawn is what is there, and it stays until it is seen to go: touch, the touchables and the glow use the place the view draws (`boatShown`, `gnomeShown`); the gnome answers from belt to hat tip; a thing let go on the boat afloat goes on it; the first thing aboard gets the climb and nothing else; the glow is on one thing and the first showing is a build; the pond stays on show through the morning and its lamps go out under the wash; an answer under way at put-away is saved as given (`journey.done`); the knock is on the model's clock and seen where it sounds; the fall, the water's curls, the pine's needles, the stem's ear, the cap's scales and the mist are redrawn; the pool and the moss join without an edge; the sand is laid wider so every making has a finger's room. Stills again: the four above. | Not measured. 51 draws with the one glow and the hand, 66 at most. | The gnome is still behind the reeds for a moment. The frog swells to one and a half, not two. Nobody has listened. No child has seen the fall. |
| 7 | Reading 2, by a fresh reader who ran nothing, and four stills after it: the hand's first showing on a bare hull, its next showing, the pond at dusk with every lamp lit, a walnut boat with three loads. | "The hand put the leaf on him." On a bare hull the hand showed a leaf to the deck, the one build the gnome takes for a blanket. "My twig ran away." A making held while the brook took the boat was left behind by the view and answered in a frame nobody saw. "I touched him and nothing happened." A touch during the morning was read in the frame the view was leaving. "One, two, three, four." The pond's lamps were equal dots at even gaps, with one more chime for each boat. And in the new stills: "There is a light on his hat." A boat moored before lay behind the gnome, hidden but for its lamp, and a lit lamp is stamped over the dusk, so it was drawn on his hat. | One theme, what the child sees is what answers: the hand builds a sail (a mast first, a leaf only to a mast that stands, never the deck); what is in the hand is drawn where the finger is whatever the view does, and let go with no bank in the frame it flies back; a touch ends the scene first and is then read in the frame on show; a touch off the print is answered by nothing; the gnome is dropped on and touched where he is drawn, hat and tipped seat included; a boat put away during an answer that would hold it is found held; a ring pushes a floating making or hull; the moored boat does not hop in the morning; deck loads keep a finger's room each; the pond's row is unlike in size, height and gap, answers with one chord, and lies clear of the newest boat and of the gnome on his pad (`placement.test.ts`); the walnut's furrows, the bark's strokes and the rush tufts are redrawn uneven. Stills again: the pond, in place of the first one. | Not measured. 52 draws in the still of the hand, 45 at the pond; 67 at most in the tests, at 1024 by 768 and upright. | The pond is still five warm rounds on a dark print. The walnut's first load on the rim. A thing in the middle of an act in the water is not pushed by a ring. Nobody has listened. |
| 8 | Reading 3, by a fresh reader who ran nothing, and three stills after it: the pond, a pile of three blankets with a tap on the sky and one on the far hills, a walnut boat with a full deck and the gnome under a blanket. | "I touched my boat and the bird stopped." A tap on the boat while a place answered it cut the answer, which was never given, and the boat jumped back; at the fall it then drifted past the lip in the air. "I can't get the stick." The lower part of a bare mast lifted the boat. "The sky went knock." A tap on the sky or the far bank knocked like ground. "It went away." A hull put on the stone while the boat floated was on the moss in a blink. And found by the builder in the code: a leaf pulled over the gnome's head was drawn there but taken at the seat it had left. | One theme, a touch is answered as what it touched and takes nothing away: a finger on the boat during an answer knocks and bobs it and the answer goes on, and a lift the shell takes away puts the answer back where it was (`answer.test.ts`); set down above the lip, the boat goes over the fall; a mast is taken along its whole length and a load keeps its own room against it; parts come off afloat in the eddy as on the stone; a blanket is taken where it is drawn; three blankets lie as a pile with room for each (`deck.test.ts`); two bare masts go over the fall stern first and tipping (`grid.test.ts`); the sky gives a gust and the far bank a small puff of petals; a thing that cannot lie where it was put hops there in sight (`seen.test.ts`); a ring pushes a making in the middle of its water act (`floats.test.ts`); the three lamps to the right hang at unlike heights (`pond.test.ts`). | Not measured. 45 to 51 draws in the stills; 67 at most in the tests, at 1024 by 768 and upright. | The gust in a pale sky and the puff off the far bank are small. Three blankets: the lowest shows only an edge. The walnut's third load is half behind the seated gnome. The pond is still up to five warm rounds. Nobody has heard it and no child has played it. |

Pass 1 was Run 1. The files it names were replaced in Run 2: `pieces.ts`, `tick.ts` and `placement.test.ts` hold the same things now.

### The cold playtest proxy, as a child of four

Played on a production build of this game alone, first visit at four, by a script that knows nothing of the game: it waits, does what the ghost hand shows, and then puts a finger in the water every four seconds. It is a proxy and not a child.

- This run is older than both readings, and its first screen is no longer the game's (see the last lines of this list). As the game then was: at five seconds everything that can be picked up glows and the hand lifts the boat by its hull toward the water. Done as shown, the gnome climbs aboard and the boat floats.
- Afloat, the hand lays one finger in the water behind the boat. Done as shown, the boat leaves the bank; the same touch, repeated, takes a bare-masted boat past the reeds, the sprite, the stones, the branch and the fall. Nothing held this boat until the pond, where it stopped short of the lilies and one more ring sent it in.
- The lamp was lit on the mast and dusk came down (a first visit has no earlier boats at the pond to answer). After three still seconds the sun glowed and nothing else did; lifting it was not tried by the script, and `endings.test.ts` and `hand.test.ts` hold that the hand shows it.
- Unclear moments: the two in pass 5, both fixed. Not fixed: for about two seconds among the reeds the gnome is behind the stems.
- Since reading 1 the first screen is another: one thing glows, and the hand first shows the maple leaf carried to the twig, then the boat to the water (`hand.test.ts`, "shows a build first"). The proxy was not played again on a build, since no new production build was made in that pass; the first screen was looked at in a still from the dev page.
- Since reading 2 the hand builds a sail at every first showing: a mast to a bare hull, a leaf to a mast that stands, never a thing to the deck (`hand.test.ts`, "builds a sail and never a blanket"). Again no production build was made and the proxy was not played again; two stills from the dev page show the twig going to a mast place and the maple leaf going to the twig.

### The first still, as the brief asks

- **Empty.** About a fifth of the frame, by eye and not measured: open sky between the pine and the sun, open water between the frog, the boat and the sprite, and sand around the makings. The moss is filled. The water is never still, and the sand is the table the makings are read against.
- **Funny.** A fat frog with a pale belly who stares at the berry with both eyes; a kingfisher far too large for his branch, who eyes it too; a gnome whose hat is as tall as the rest of him, standing beside a boat he plainly thinks is his; a water sprite with blown-out pink cheeks and one hand trailing in the brook.
- **Alive.** Two sheets of water lines slide past each other; the frog's throat breathes and he blinks one eye at a time; the kingfisher bobs and flicks his tail; the sprite sways and her hair runs; the gnome rocks on his heels and follows the finger with his eyes; a dragonfly loops over the water.

### Reader

Shapes checked as lookalikes of a letter, a numeral or a sign. Redrawn: the water's level strokes, which lay in pairs, are curls of their own length (a long back and a short hook), the rows set off so that no two lie level one above the other; the small pines stand in uneven clumps and not in a row; the stones on the far shore are of three sizes at uneven gaps; the maple leaf's veins are a fan from the stalk and not a crossed stroke; the flowers are nodding bells on bent stems and not rounds on a stick.

Redrawn after reading 1, which found three lookalikes and three weaker shapes:

- **The water's lines.** Within a row every curl was the same mark at one exact step, so a row read as a line of signs. Now each curl of a row has its own length, its own gap to the next and its own curve, in an order that is the row's own; `reader.test.ts` holds that no two neighbours are alike and that no row has a step.
- **The fall.** It was a pale band with even cross-strokes, a ladder. Now it is a dark lip the brook bends over, water falling in strands that leave the lip where they like, each of its own length, weight and slant, a ragged foot, and foam in billows of unequal size scattered out into the pool, not in a column.
- **The pine's needles.** Seven even ticks a cloud read as a tally. Each cloud now has its own number of needles, of uneven length and slant.
- **The grass stem.** Its top hook is gone: the stem ends in a slanted ear with three hairs, as grass does.
- **The acorn cap.** Its chevrons are overlapping scallops, as the scales of a cap are.
- **The mist.** The three level bars are two drifts of different shape.

Redrawn after reading 2, which found two lookalikes and listed weak ones the list below did not have. The pond's row is held by `pond.test.ts`; the three drawn shapes are held by a still and by no test.

- **The walnut's furrows.** Three S-curves in a row, a line of signs. Now four creases of unlike length, gap and bend, and one dimple, as a shell is wrinkled.
- **The pond's lamps.** Up to four equal pale discs at near-even gaps, one more for each boat, with a run of chimes that grew by one: a row of dots that counts. Now each moored boat has its own size, height and gap to the next, each lamp hangs on its own boat and is as large as that boat, and the row answers with one chord. It is listed under "For the owner to decide" as the nearest thing to a counter.
- **The bark hull's strokes.** Eleven at one even step, a tally. Now each has its own length, gap and slope.
- **The rush tufts.** Seven at one even step. Now they stand in clumps, at uneven gaps and of uneven size.

Weaker ones that stay, and why:

- **Rings on the water.** A ring is a round by nature. Each is drawn as broken arcs that widen and fade in under a second, never a closed line at rest.
- **Bubbles** where the pebble sinks: open arcs, not closed rounds, in a rising cluster of uneven sizes, gone in a second.
- **Lily pads.** Round with a cleft. Each lies at its own angle, is far wider than tall, and some carry a flower.
- **Reeds and the tall stalk.** An upright stroke with a head. They lean, stand in clumps of uneven height, and bend when touched.
- **The mast with its side twig.** A stem with one short branch; it is bark brown, crooked, and has a hole to stand in.
- **The lamp.** A box with a ring on top. It is ochre, hangs on the gnome's back, and is lit only at the pond.
- **The water's curls** at the shore: short hooked lines, each of its own length, gap and curve since reading 1, always sliding.
- **The foam** at the foot of the fall: open arcs. They are of seven sizes, each turned its own way, scattered, and lie under falling water.
- **Stepping stones in a line.** The place is a line of stones; they are of uneven size and stand out of line.
- **The sun.** A plain red round, kept by the lead's word, half behind a hill.
- **The two largest foam arcs** at the fall: of all the shapes the nearest to a letter, an open round. They stay because foam is that shape; they are two among seven sizes, each turned its own way, with water falling on them, and neither stands alone or upright on a line.
- **The snow peak's line.** A zigzag where the snow ends. It is uneven, closes a white shape, and lies on a mountain.
- **The mushroom's dots.** Three pale dots on a red cap, of unlike size and not in a line. A fly agaric has them.
- **The berry's stalk.** A short hooked line on a red round. It is thin, leans, and moves with the berry.
- **Two bare masts.** Two upright strokes side by side on a hull. They are of different kinds, so of unlike height, lean and colour, and they stand in a boat.
- **The mast with its side twig** was named by reading 2 as the nearest to a small letter; the reasons above stand.
- **The one glow ring** of the idle ladder: a round. It is soft, has no edge line, fades in and out, and is always on a thing.
- **The ghost hand.** A hand, not a sign: it moves, and it is the one pale thing with no ink of its own.
- **The lit lamp's two discs.** A pale disc inside a paler one, a faint target. They have no line round them, are two strengths of one warm yellow, always have a lamp at their middle, and are seen only at dusk.
- **The walnut's flat crease.** A low wave on the shell, nearest to a written wave sign. It is one of four creases of unlike length and bend, in half-strength line, and lies on a hull that rocks.
- **The dragonfly.** A thin body with wings at one end, faintly an arrow. Its wings beat, it flies a loop and it never rests.
- **The kingfisher's wing scallops.** Three lapping curves on his folded wing. They are the lapping feathers of a folded wing, on a bird that bobs and flicks his tail.
- **The three lamps to the right at the pond** hung near one level, a row when the boats were built alike. Since reading 3 their boats lie at three depths, 20 units and more apart, so the lamps hang at unlike heights (`pond.test.ts`).

### The lessons of the earlier readers, each with its test

1. One clock for sight and sound: `sync.test.ts`, "queues every cue of every act on the step its time is crossed", "has no delay inside any voice", and the five "sounds ... on the step it lands" tests.
2. A scene ended by a touch is silent from that frame, and put-away closes all sound: `endings.test.ts`, "queues no scene sound after the touch, and says so to the speaker on that frame", "shuts the scene's sounds on a cut and leaves the rest ringing", "closes every sound at put-away".
3. Every pose value is read by the view, and a thing is touched where it is drawn: `pose.test.ts` (all five tests), `touch.test.ts`, "each of the folk, in every frame they are in, at the middle of the body the view draws", "the folk where an act has moved them, and not where they were" (rewritten after reading 1: it now moves the frog, sees every stamp of him move, and finds him there and not where he was); `drawn.test.ts` for the boat and the gnome.
4. No flag outlives its touch, no timer is full on load, nothing starts on load: `touch.test.ts`, "leaves no flag behind: after any ending of a touch the hand is empty and nothing is offered a place"; `load.test.ts`, "has no timer full on load: nothing drips, rolls, swings or is half way anywhere"; `endings.test.ts`, "plays no scene on load, whichever beat the game was put away at".
5. Parked equals loaded, and the ladder is taken back at put-away: `load.test.ts`, "reaches the states it names: each test above starts from the thing it says" with the tests above it, "is taken back to the bottom, so a hand that was showing is not there when the child comes back".
6. A cancelled pointer never acts for the child: `touch.test.ts`, the six tests from "a making carried over the frog goes back where it lay, and the frog gets nothing" to "a press that is taken away is not a tap: the sun stays down and the frog stays quiet".
7. The grown-up's corner and the home control: `ladder.test.ts`, "answers nothing: no sound, nothing in the hand, nobody looks, and the picture is as it was", "leaves the idle ladder where it is, however long the finger rests there", "keeps every touched spot clear of the home control at every surface size".
8. Age is only a first-visit default: `save.test.ts`, "gates nothing: at every age the same twelve makings are there to be picked up", "is not asked again: a saved game is found as it was left, whatever the age now".
9. Lookalikes: the section "Reader" above.
10. No test writes a file or reads the environment: read by hand through every test and helper of the folder; none does.
11. The sheet read against the code: the next section.
12. The differences where the code is right: pairs 1 to 31 are pasted by the lead, the last four from the builder's last reading; the sheet above the art guide is not edited by the builder.
13. No path of a machine in these two files: read by hand.
14. A character's own act never resets the ladder, and a tap may be slow: `ladder.test.ts`, "a croak, a flinch or an opinion that starts by itself is not something on its way", "counts from the child's tap, and not from the end of the croak it started"; `touch.test.ts`, "a slow tap of 0.45 s on the frog is the same croak as a quick one".
15. Does not apply: the game uses no 3D library.
16. A bare look is filled out in the same style: the look was passed as full; the six new places were filled in the same print.

Also held by a test: every cell of both grids has its own act and sound (`grid.test.ts`), the brook is the child's (`journey.test.ts`), nothing lies on anything and nearer is in front (`placement.test.ts`), the draw count (`frameBudget.test.ts`), the hand (`hand.test.ts`).

### Reading 1, each finding with its test

Each fix was taken out once and its test seen to fail.

A child would notice:

1. The boat is touched where it is drawn, in every state: `drawn.test.ts`, "held on the sill: by its hull where the picture is", "in the middle of an answer: where the picture is, and not where the boat was", "a ring is behind the boat when it is behind the picture of the boat"; the glow follows it in `hand.test.ts`, "has the glow on one thing at a time".
2. The first thing pressed on gets the climb aboard and nothing else: `endings.test.ts`, "answers the first thing pressed on with the gnome climbing aboard and with nothing else; his opinion comes from the second thing on".
3. No build is refused afloat: `drawn.test.ts`, "a making let go on the boat afloat in the eddy goes on the boat, and the place opens for it on the way".
4. The gnome is touched over his whole drawn shape: `drawn.test.ts`, "at the tip of his hat and at his chest: on the stone, afloat, and in the middle of an answer", "leaves the stern of the hull to the hand that takes the boat".
5. Morning takes nothing away before the wash: `morning.test.ts`, all three tests.
6. A place does not answer twice: `load.test.ts`, the three tests under "a place does not answer twice".
7. One want on the first screen: `hand.test.ts`, "shows a build first: on a first visit a found thing goes on the hull before the boat is ever shown going to the water", "has the glow on one thing at a time: the thing the hand is about to take, or the water it is about to touch".
8. The fall: redrawn and looked at in a still; `reader.test.ts`, "the pool below the fall and the bank's face above it run out before the frame's downstream end".

Slight:

- The knock is seen and heard on one step, on the model's clock, in the thing's own landing sound: `drawn.test.ts`, "is seen and heard on one step".
- He points downstream, shifts away from a pebble, and looks at each part in turn: `gnome.test.ts`, four tests.
- A thing let go over the far bank or the sky flies back: `drawn.test.ts`, "flies back to where it lay, hull or making, and is never set in the brook", "a part pulled off the boat and let go over the far bank goes back on the boat".
- A boat lifted as the brook takes it and let go over the bank is on its stone: `drawn.test.ts`, "a boat lifted as the brook takes it".
- Two bare masts are not two sails: `drawn.test.ts`, "the sprite and the stones give the answer of two sails only to two sails".
- A carried boat is over the makings: `placement.test.ts`, "a boat in the hand is drawn over the makings".
- Touch sizes: `touch.test.ts`, "gives every making on a fresh bank a finger's room of its own, 48 px each way, on a tablet lying and standing"; a thing dropped on a crowded sand still finds a spot (`placement.test.ts`, "sets a thing dropped onto another down beside it").
- `piece.wet`, the `puff` mark and the gnome's unused touch circle are gone; the sprite's comments say waist.
- Paired, not built: the frog's size at the feather, "nearly as tall as the mast", and what the sheet did not say (pairs 11 to 20, all pasted since).

### Reading 2, each finding with its test

Each fix was taken out once and its test seen to fail, except the three redrawn shapes, which no test holds.

A child would notice:

1. The hand builds a sail and never a blanket: `hand.test.ts`, "builds a sail and never a blanket, at every first showing: a first visit at each age and every morning after". On a bare hull the hand shows a mast to a mast place; a leaf only to a mast that stands; never a thing to the deck.
2. What is in the hand is where the finger is: `seen.test.ts`, "stays under the finger, in the frame the child sees, while the view moves on", "let go where there is no bank in the frame, flies back in a seen arc to where it lay, and nobody is given it unseen".
3. A touch during the morning is answered where it is seen: `seen.test.ts`, "ends the scene and is answered in the frame that is then on show: the frog on the bank croaks where the finger is".

Lookalikes:

4. The walnut's furrows: redrawn, looked at in a still, no test.
5. The pond's lamps and the moored row: `pond.test.ts`, "answers a new lamp with one chord and in one span, whatever its length: nothing grows by one for each boat", "has no two boats of one size, at one height or one step apart, and each lamp is as large as its boat".
6. The weak ones the list did not have: listed under "Reader"; the bark's strokes and the rush tufts redrawn uneven, looked at in a still, no test.

Found by the builder in the still of the pond, not by the reader: a boat moored before lay behind the gnome and its lamp was drawn on his hat. The row now lies clear of the newest boat and of the gnome: `placement.test.ts`, "moors the boats sent before clear of the sun, of the water the boat comes in on, and of the gnome's pad".

Slight:

7. A thing dropped anywhere on the gnome as drawn is dropped on the gnome: `drawn.test.ts`, "a thing let go on the upper half of his hat is given to the gnome, not to the water behind it".
8. The seated gnome is touched where he is drawn: `drawn.test.ts`, "seated, he is found where the hull has turned and tipped him, at his hat tip and at his chest, and not where he would sit on a level boat".
9. Put away during an answer that would hold the boat: `load.test.ts`, "put away during an answer that would hold the boat, parked or loaded: the boat is found held at that place and waits for a ring". Pair 23.
10. Each place answers every trait: `drawn.test.ts`, "two masts that do not both carry a sail get an answer of their own from the sprite and the stones, and the two-sail answer only with two sails"; `grid.test.ts`, "answers every trait at the reeds, the sprite, the stones and the branch".
11. A broad sail on a tall mast: `drawn.test.ts`, "the branch holds a boat by its broad leaf only when the leaf is on the tall mast".
12. A tap or a cancelled lift as the brook takes the boat: `touch.test.ts`, "a tap, a press taken away or a cancelled lift on the boat as the brook takes it changes nothing and saves nothing". Pair 26.
13. A ring pushes whatever floats: `floats.test.ts`, "a hull and a twig afloat ride away from the ring, stay in the water, and still come ashore".
14. The sprite's breath against "changes nothing": the breath is meant to move a sailed boat (it is how a child sails from the bank without a finger in the water), so the code stays and the sheet's sentence is paired. Pair 21.
15. The frog's tongue takes a thing let go within his reach, not one carried past. Pair 22.
16. The moored boat does not hop in the morning: `morning.test.ts`, "does not let the moored boat hop: its print rides where the boat rode, as deep as it is loaded, with its lamp's glow on its lamp".
17. Deck loads keep 48 px each way: `touch.test.ts`, "gives every load on the deck a finger's room of its own, 48 px each way at 1024 by 768, with the other loads and two bare masts beside it". A mast was then taken by its upper part only; since reading 3 it is taken along its whole length and a load keeps a room of its own against it (`deck.test.ts`).
18. A touch off the print: `seen.test.ts`, "in the letterbox beside the stage or on the paper margin is answered by nothing: no sound, nothing in the hand, nothing changed". Pair 25.
19. Stale lines in this file: the status block, the template note on `guidance.ts`, pass 4's glow, the cold playtest's first line and the section below are rewritten.
20. `guidance.ts` is not a frozen file: said in the template notes.

### Reading 3, each finding with its test

Each fix was taken out once and its test seen to fail.

A child would notice:

1. A tap on the boat, a press taken away or a lift the shell takes away, while a place answers the boat, changes nothing: `answer.test.ts`, "changes nothing at the reeds, for a sailed boat with a berry: the answer goes on and is given, and the boat does not jump back" and the fifteen like it, one for each place and each of three boats (the pond for the boat with no sail, the only one it answers before the lamp scene); "lifted out of the fall's answer and set down above the lip, the boat goes over the fall again: it never drifts past the lip at the upper level". A finger that rests on the boat does not stop the answer; a finger that pulls lifts the boat out of it, and that is the child's doing.
2. A mast is taken top or bottom: `deck.test.ts`, "is taken anywhere along it, at its top and at its foot, and gives way only inside the room of a load that lies against it". Which part takes what is said under "For the owner to decide".
3. The gnome behind the reeds for two seconds: listed, not changed.

Slight:

4. "Every part can be pulled off again": built afloat in the eddy as on the stone, and paired to say so (pair 28). On the brook nothing comes off, which keeps found-as-left as it is: a boat on the brook is saved as it stands when it reaches a place, and a boat held there is held by what is on it. `deck.test.ts`, "afloat in the eddy as on the stone: a part wobbles under the finger, comes off when it is pulled, lies where it is put, and goes back on", "on the brook nothing comes off: the boat sails as it left the bank".
5. Three blankets and the deck loads: `deck.test.ts`, "has a finger's room of its own, 48 px each way lying at 1180 by 820 and at 1024 by 768, neighbours counted; standing at 820 by 1180 the things share the deck", "shares the deck with no dead gap: between two things that lie side by side every point takes a thing, the nearer middle first". Standing, the smallest room is 38 px, said under "For the owner to decide".
6. Over the fall two bare masts get both answers: `grid.test.ts`, "takes two bare masts over the fall stern first and tipping, the gnome holding his hat: both answers, not one".
7. A tap on the sky or the far bank: `seen.test.ts`, "is answered as what it landed on, with a sight where it landed: the sky gives a gust, the far bank a small far puff of petals, and only the near ground knocks". Pair 29.
8. A hull let go on the stone while the boat floats: `seen.test.ts`, "hops to the nearest free place in an arc that is seen, and does not blink there: a hull or a berry on the stone the boat has left, a cap on top of the pebble". Pairs 30 and 31.
9. A making in the middle of a water act is pushed by a ring: `floats.test.ts`, "a making in the middle of its own water act is pushed too, and the act goes on while it drifts; a pebble that has sunk is not".
10. Lookalikes: the four weak shapes are listed under "Reader"; the three lamps to the right hang at unlike heights (`pond.test.ts`, "has no two boats of one size, at one height or one step apart, and each lamp is as large as its boat").
11. Stale lines in this file: rewritten, the status block among them.

Found by the builder in the last reading and fixed: a blanket over the gnome's head is taken where it is drawn (`deck.test.ts`, "is touched where it is drawn: a blanket over the gnome's head is taken up there, and not at the seat it has left"). Checked in the last reading, found to hold, and now held by a test: the place the hand shows the boat lifted by takes the boat on every hull however full its deck (`deck.test.ts`, "is what the hand shows the boat lifted by, and a finger there has the boat and no part of it, on every hull however full its deck").

### The sheet read against the code

The builder's last reading: the sheet above the art guide, with pairs 1 to 27 pasted, read sentence by sentence against the code after the last fix of reading 3. No reading by a fresh reader follows it.

Found by this reading and fixed in the code, where the sheet was right:

- A thing is touched where it is drawn: a blanket the gnome has pulled over his head was drawn 62 units above the spot where the finger took it. It is taken where it is drawn (`deck.test.ts`).

Fixed in this pass from reading 3, where the sheet was right, and read again here: a touch on the boat while a place answers it changes nothing; a ring pushes a making in the middle of its own water act; over the fall two bare masts are answered as a boat with no sail as well as stern first.

Found where the code was right and the sheet was silent or said otherwise, written as pairs 28 to 31 and since pasted by the lead:

28. Every part can be pulled off again wherever the boat waits at the bank: on its stone and afloat in the eddy. On the brook the boat sails as it left. The sheet said only that every part can be pulled off again.
29. A tap on the far bank gives a rustle and a small puff of petals where it landed, and a tap on the sky a whiff and a short gust of pale lines. The sheet named only bare ground.
30. A making let go on the near bank where the spot is taken (another making lies there, or it is the flat stone, which is kept for the boat) comes to rest on the nearest free place, in a hop that is seen. The sheet said it lies where it was put.
31. The same for a hull let go on the stone while the boat floats in the eddy: it hops, in sight, to the moss in front of the stone.

Found where the sheet is right and the code is still weaker, and not fixed:

- "Sitting as far from it as the deck allows": on the walnut shell a pebble put on third lies beside the gnome's hip, half behind him, and the short deck lets him shift only 14 units further astern.
- "A boat moored at the pond ... beside the boats sent before" (the lamp scene): only the newest of the earlier boats lies by the lilies. The other three lie along the far shore to the right of the lily field, so that no lamp is drawn on the gnome or on the newest boat's sail. None covers the sun or the water the boat comes in on (`placement.test.ts`).

Everything else was read and found to hold. What no reading can settle, since nobody ran the game as a child: how it sounds, whether the fall reads as a fall before the boat reaches it, and whether the pond's lamps read as a tally.

### Registered, listed, and still to do

Pairs 1 to 31 are pasted. The look is in the claimed-styles registry of `docs/art-direction.md`, with the text that ends the art guide in `ART.md`, and the game is in the README's list of games.

- Not run by a builder in the wave: the shared probe on a production build (`npm run perf:jam -- bark-boats`).
- The `dist` folder that Run 2's one production build left at the root of the working copy was deleted in the pass for reading 1; no build was made in the passes for the three readings.
- The template notes above marked **For the template**.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle.** Two sheets of water lines slide; the frog breathes and blinks one eye at a time, the kingfisher bobs and flicks his tail, the sprite sways, the gnome rocks and taps a foot, the dragonfly loops. Each is its own rig (`pose.test.ts`).
- **Motion and sound on every touch.** A finger anywhere on the print is answered in the same call with a motion and a sound of its own (`sync.test.ts`, "is answered on the frame the finger lands"), as what it landed on: the near ground, the far bank and the sky each give their own sound with a sight where the finger was (`seen.test.ts`); a finger on the boat while a place answers it makes the hull knock and bob (`answer.test.ts`); each of the 30 cells of the bank grid and each of the 36 of the brook grid has its own act and sound (`grid.test.ts`).
- **Weight, squash and follow-through.** Springs with overshoot on the hull, the hat, the mast and every landing; a boat rides as low as it is loaded.
- **Kid-clear silhouettes and tappables.** Characters 220 to 270 units, the smallest making 34 across with an 80-unit touch, and every making on a fresh bank with 48 px or more to itself at 1024 by 768 and upright at 820 by 1180 (`touch.test.ts`); every load and blanket on a deck with 48 px each way lying at 1180 by 820 and at 1024 by 768, and 38 px at the least standing at 820 by 1180, where the things share the deck with no gap between them; a mast taken anywhere along it down to the rim of the hull (`deck.test.ts`); the boat and the gnome touched and dropped on where they are drawn, hat and tipped seat included (`drawn.test.ts`); what is in the hand drawn where the finger is (`seen.test.ts`); nothing touchable under the home control or the grown-up's corner at any surface size (`ladder.test.ts`).
- **Wordless for the band.** `node scripts/wordless-check.ts` passes; lookalikes are under "Reader".
- **Wordless idle guidance.** One glow at three seconds, on the thing the hand is about to take, and the ghost hand at five, showing a build first on a first visit and building a sail, never a blanket, whole at five surface sizes (`hand.test.ts`), taken back at put-away (`load.test.ts`).
- **Frame rate.** Not measured on a target. The draw count is 67 in the fullest frame the tests reach, counted at three sizes (66 at 1180 by 820; 67 at 1024 by 768 and at 768 by 1024, where the paper beside the print is one fill more), under 80 everywhere (`frameBudget.test.ts`); no shadow maps, no post pass, pixel ratio capped at 2, four tiers. In a software renderer on the production build a frame's work had a median of 0.3 ms at pixel ratio 1; that is not a frame rate and no iPad was measured.
- **Assets.** All drawn by code and all sound synthesized; `node scripts/egress-check.ts` passes.
- **Found as left.** Parked equals loaded for every state the game has, no scene replays, and a boat on the brook waits for the child's touch (`load.test.ts`, `endings.test.ts`).
- **No engagement mechanics.** Nothing counts boats, places or days; the pond's moored boats are only seen, at unlike sizes, heights and gaps, and answer with one chord whatever their number (`pond.test.ts`; the nearest thing to a counter, under "For the owner to decide"); no place is a failure and nothing hurries the boat (`journey.test.ts`).

### The learning claim

The game has no learning goal and is designed from no record.

### Defaults taken for the owner

- The gnome's size and the reading of "downwind" for his hat, as under "For the owner to decide".
- A first visit with no age is the visit for five and younger.
- The pond shows the last five boats; a sixth replaces the oldest without a picture of it leaving.

### What the next builder should know

- Put every rule of touch in one module with no DOM in it, and let the Mount only pass events on. Every lesson of the earlier readers could then be held by a plain test.
- Let go where the finger is, not where the lagging picture of the thing is: a fast carry otherwise lands a thing on the wrong neighbour.
- A lift that is cancelled must put a thing back in the state it was in, not only the place: a boat held at a place has to be held again.
- Count the frame instead of timing it. A recording canvas that tallies stamps, strokes and fills gives the same number on a busy machine.
- Show the ghost hand only where the whole hand fits; clamping it to the stage moves it off the thing it points at.
- Where an act moves a picture and not the thing, give the model one function that says where the thing is drawn, and let touch, the glow and the view all ask it. A test that names a state must reach that state through the calls the Mount makes.
- Measure a touch target with its neighbours: the run of points that pick this thing and no other, in px at the smallest surface, not its own reach.
- Look at two frames side by side while the view moves. A shade, a pat of moss or the grain of the block that ends at a frame's edge stands as a line in the picture.
- Save that an answer has been given when it starts, not when it ends, or a place answers twice after put-away. Save with it what the answer will leave (a boat that will be held is saved as held), or put-away moves a thing the child did not move.
- Where the view can move while a finger is down, keep the finger's place on the stage and work out its place in the world again every frame. What is in the hand then stays under the finger, and a touch is read in the frame that is on show.
- End a scene before reading the touch that ends it, not after.
- Give the idle hand an order of what to show that follows what the characters make of a build, and test every first showing: a hand that shows the one build a character laughs at teaches it.
- Count the frame at every surface size the game is tested at. The paper beside the print was one fill that the still's size never drew.
- Things that add up as the child plays (a row of boats, a run of chimes) read as a counter when they are equal and evenly spaced. Make each its own size and place, and let the sound be one whatever the number.
- A finger that lands on a thing in the middle of something must not end it. Let the press only touch, and let the pull lift; and keep what a lift cut short, so that a lift the shell takes away can put it back.
- Give a small thing a room that is its own whatever stands beside it, and measure the room with every neighbour on the fullest boat, at every surface size. Say the number where a size cannot give 48 px.
- A thing drawn off its place (a blanket over a head, a boat in an answer) needs one function that says where it is drawn, used by the view and by the finger. Check each new one against the view's stamp in a test.

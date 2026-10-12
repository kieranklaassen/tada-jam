<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: Marbled paper (the first row reserved for this game). The spike held on clarity; the second reserved row was not tried.
- Sheet: round 1 came back with 5 findings. Each replacement is pasted word for word above the look in `ART.md`, and nothing else there was changed. The rounds after it were rounds of pastes only: pairs 1 to 6, pairs 7 to 16, pairs 17 to 22 and, at the last close, pairs 23 to 29, each pasted by the lead.
- Three fresh readings of the folder were made by readers the lead started. Each is closed, the third by the last close (pass 7): every finding is built, written as a pair, or listed below under "What is weak", "Reader" or "For the owner to decide". No reading follows the last close: the game is taken as it stands.
- Open: no pair waits. Pairs 23 to 29, written at the last close where the code was right and the sheet silent or wrong, are pasted. They are listed under "The sheet read against the code".
- The toy checkpoint was passed by the lead only. The owner has not seen the game.
- No frame rate has been measured, and no one has listened to the sounds.
- The cold playtest proxy is as last run, before pass 5. It was not run again after passes 5, 6 and 7.
- Open: requests to the lead, below.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### The five findings of round 1, as pasted

1. Scene 3: the cat's dab makes one ring of ripples and carries no colour; nothing is saved by it; a touch ends it with the water as the child left it.
2. The band: the paper corner is at least 100 stage units across, and nothing a child touches lies under the home control at any surface size.
3. The designed order: a new paragraph, "Where things come to rest", held by an overlap test.
4. The saved state: the oldest print leaves when a fifth is taken, in that scene's save.
5. The designed order: on a first visit `shown` is empty, and a tool on the table that is not in `shown` is owed its showing at the child's first touch of it.

### Where the game stands

- What it is: a tray of still water, three pots, a cat with its chin on the rim, a bird on the sill and cloths on a line. A touch drops a bloom of the dipped colour; a finger that moves pulls it into a feather; beads of a mixed colour come up where two pot colours are dragged together. A comb, a straw and a bar of soap arrive one by one, each brought by the cat after a print. While there is colour on the water the corner of paper under the cat curls and breathes, and a tap on it takes a print, which the cat holds up and the child hangs on the line. Plain water takes no print. Four prints hang; the oldest is seen and heard to go when a fifth is taken.
- To see it: the jam's dev page at `?chrome=0&seed=1&tier=0#/play/wet-paint`. `seed` pins the chance of the cat and the bird, and `tier=0` pins the top tier.
- What to try first: touch the water twice in one place (rings), tap the yellow pot, then pull from clear water through the red. Tap the corner of paper at the left edge, and tap the print the cat holds up. Then take up the comb the cat has brought and draw it through rings. Blow the straw at the cat. Rest a finger on the water and watch the bloom grow on.
- The stills: fourteen, kept outside the repository, with the top tier pinned. At 1180 by 820: `1-rest-1180.png`, `2-water-ratio1-1180.png` (pixel ratio 1, the still the water's look is judged in), `3-tools-1180.png`, `4-print-scene-1180.png`, `5-held-glow-1180.png`, `6-line-1180.png`, and from pass 5 `8-corner-asks-1180.png`, `9-resting-finger-1180.png` and `10-soap-dragged-1180.png`, from pass 6 `11-two-claws-1180.png` and `12-straw-dimple-1180.png`, and from pass 7 `13-thumb-rests-second-finger-1180.png` and `14-print-carried-1180.png`. At 1024 by 768: `7-water-1024.png`. The others are at pixel ratio 2.
- **No one has listened to the sounds.** They are held in range by numbers in `voices.test.ts` (pitch, loudness, attack, length), and in time by the sync tests, and nothing more.
- No frame rate has been measured: the machine this was built on draws in software, and no production build was made here.
- The draw number is 54: the stamps, fills and strokes of one frame at the busiest moment the game can reach, the same at 1180 by 820 and at 1024 by 768. `view.test.ts` holds it under 80 on the real view. On the dev page the frame cost 34 to 40.

### The sheet read against the code

Read sentence by sentence at the end of the build and again when each reading was closed, the last time at the last close. Pairs 1 to 22 are pasted in the sheet. Where the code is right and the sheet silent or wrong, an exact pair is proposed; the sheet above the look was not edited for these.

23. The pack's rule for the age range: a whole hand that lands together is one finger, and a contact that only rests (on nothing, or for a second on anything) hands the work to the next contact that lands, on anything; a tool it took up goes back; a pulling finger is never interrupted. A change.
24. The pack's rule for the age range: what a drag carries (the sheet, the held print, a tool in the hand) hangs for three tenths of a second on the game's clock and is carried on by a finger that lands on it again; a pull through the water ends at the lift. An addition.
25. The saved state, `finished`: a drop on a paw that holds a print starts nothing while the game is open, and a load reads the coloured water as a cycle begun. A change.
26. Scene 4, the cause: a tap sends the held print to the lowest free peg; dragged and let go further than its own width from the paws, or above the cat's head, it goes to the nearest free peg; let go nearer, it comes back to the paws; a touch within a tap's slop is a tap. A change.
27. How the next cycle starts: a drop on a paw that holds a print is answered and starts nothing, and the print stays held. A change.
28. Where things come to rest: the blooms a holding paw flicks, and the cat's dab, land below the held print and never under it. An addition.
29. Scene 3, filled in: the dab is below a print the cat holds and never under it. An addition.

Where the sheet was right and the code short, built at the last close: a touch that ends scene 4 leaves the print hanging still, and nothing eases in on load, the paws on a held print with it.

### Requests to the lead

- The claimed-styles registry row for Marbled paper, linking `games/wet-paint/ART.md`, which the lead adds with the pull request. Its text ends `ART.md`.
- A listen to the sounds on a machine with speakers.
- A frame rate from the shared probe on a production build. The cost to watch is the repaint of the water's picture while a comb crosses a tray that is full of edges: every edge cell in the changed box is voted again each frame.

### Template notes

- `attention.ts`, `perf.ts`, `quality.ts`, `saveCadence.ts`: frozen, used as copied.
- `audio.ts`: used as copied. The game gives no note a `delay`, so that a later sound is asked for by a later step of the model; a test holds it. **For the template:** a line in `audio.ts` saying that `delay` puts a sound on the audio clock, where the model cannot take it back or keep it in step with what is seen, would have saved the question.
- `input.ts`: used as copied. The game needs the press at once and the lift at once, and takes them from `press`, `dragMove`, and whichever of `tap`, `pressEnd`, `dragEnd` and `dragCancel` ends the touch. `hands.ts` stands between the gestures and the toy, so the corner, the cancel and the ladder are tested without a browser.
- `guidance.ts`, `overlay.ts`, `rng.ts`, `stage.ts`, `scene.ts`: used as copied.
- `state.ts` and `state.test.ts`: used as copied. `save.ts` wraps `state.ts` the way its header describes, and that worked as written.
- `config.ts`: the backdrop, the tiers (`sheen` and `fine` beside the pixel ratio), the ladder and the first-visit rows are this game's.
- `game.tsx` (here `wet-paint.tsx`): the toy and the view replace the demo's rules and drawing. **For the template:** the Mount's `act` is the natural place to play the sounds a touch queued, and the loop the place to play those a step queued; a sentence saying so would help a game that keeps sound in its model.
- **For the template:** `import.meta.glob('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })` lets a test read the game's own source with no file access. The scans in `clock.test.ts` are written that way and could be lifted into the template.
- **For the template:** a view that takes its drawing surface and its sheet maker as arguments runs on a stand-in in a test (`recording.ts`), so the draw number is held on the real view and not on a copy of its arithmetic.
- **For the template:** put-away built as "save, then make the game again from that save" makes parked equal loaded by construction (`Toy.putAway`), and one test over every state then holds it.

### For the owner to decide

Nearest to praise, blame, a count, a prompt, a loss and content held back first.

- Praise: the cat's look at a mostly orange print. It rubs its cheek on it and purrs. It is the cat's taste for a colour, never turned to the child, and it is the nearest thing in the game to praise. At the hanging it looks up once and says nothing.
- Praise for a colour: the standing purr. Once about 27 hundredths of the water is orange the cat leans right in and purrs on, for as long as the orange lies there. It is the nearest thing to praise for a colour the child chose, and a child can make it purr on purpose. The other way is a lean with no purr.
- Blame: the cat holds a mostly brown print away by two claws with one sound of dislike, and at mud on the water it wrinkles its nose and puts out its tongue. It is the nearest thing to blame.
- A count: the line of prints. Four hang, of unlike size, tilt and drop.
- A prompt: the ghost hand and the glow. After three still seconds one thing glows, and after five a hand shows one move. The hand comes back after every pause, at 5, 18, 41 and 84 still seconds, and is quiet after four showings until the next touch. Once there is colour on the water its first turn is a tap on the corner of paper, and after a touch it goes on to the pull, the next pot and the newest tool before the paper comes round again.
- A prompt that never backs off: the corner of paper curls and breathes without end, for as long as there is colour on the water and no scene plays. The hand goes quiet; the corner does not. The other way is a corner that lies curled and still after a while.
- A loss: the oldest print is taken when a fifth is taken. It comes off its peg and goes down behind the cat. It is the nearest thing to a loss, and to a punishment for making more. The other way is a longer line or a pile the child can leaf through.
- Content held back: each tool needs a print taken after the newest tool on the table touched that water, so the comb, the straw and the soap take three prints, each made with the tool before. The sheet keeps it; the other way is every tool out from the first visit.
- Plain water takes no print, so a child cannot hang a blank sheet.
- Every touch on the water with the stick drops colour, so a finger cannot pull what is there without adding to it. The comb pulls without adding. A finger that rests adds more, for five seconds.
- The cat dips a paw when the child has been still through the hand's showings. It makes ripples and moves no paint, on attended time only, at most once in one stillness.
- The look, Marbled paper, and the toy: the owner has seen neither.
- Nothing is heard before the first press of a visit, and no one has listened to any sound.
- Age chooses only which tools lie on the table on a first visit; a saved place wins after that.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 (toy) | Stills at rest, in play, at the funniest moment and with the ghost hand, at both sizes | "The cat is stripy like the wallpaper and it is looking at my red. The paint has little stairs on it. I pulled the yellow through the red and nothing new came." | Edges and the mix: the room's combed papers made by shifting whole columns; the water drawn at twice the grid with each edge pixel voted; the mix looked for ahead of the finger. Nothing reverted. | Not measured. | Steps at 45 degrees, a faint vein, a ragged pull. |
| 2 | The water alone, at pixel ratio 1, at 1180 by 820: rings, a pull, a comb through rings | "My paint is made of little squares. When I pull it, it goes into a bumpy stick, not a point." | The water's look: the vote widened to the twenty-five cells round a pixel, three or four pixels to a cell on every tier; a darker vein on both sides of every edge; pulls, breaths and growth moved onto a flow that keeps its fractions; the pull given a core and a cusp. A lowest tier of two pixels to a cell was tried and reverted: it stepped at 45 degrees. Still again: `2-water-ratio1-1180.png`. | Not measured. | A fresh round bloom, and the ring the soap leaves, show faint flat sides. |
| 3 | The print, at both sizes: the sheet on the water, the print in the paws, the line | "The picture on the paper is all blocky. The cat is holding my picture but it is tiny and its paws are on it." | The print: its picture drawn at eight pixels to a cell; the held print 150 stage units wide in place of 108, held under the cat's chin, with the hung ones kept at their sizes. Nothing reverted. Still again: `4-print-scene-1180.png`, `5-held-glow-1180.png`, `6-line-1180.png`. | Not measured. | The paws still cover the lower corners of the held print. |
| 4 | The idle frame with every tool out, and the cold proxy at age 3 | "Everything is shining. Which one?" | One want: the glow is on the one thing the hand's move is made on, in a warm shadow colour under pale gold so it reads on the white rim. A softer vote for rounder blooms was tried here and reverted: it lost lines one cell wide. Still again: `5-held-glow-1180.png`, `7-water-1024.png`. | Not measured. | The glow round a tool, the paper and the held print is a plain box. |
| 5 | Reading 1, and three stills at 1180 by 820: the corner while there is colour on the water, a finger at rest, a dragged bar of soap | "I tapped the paper lots and my pictures went away. I held my finger and nothing more came. The cat is holding my picture and it will not purr." | What a child's stray acts get back: plain water takes no print; the corner curls and breathes while there is colour, and the hand shows it first; a resting finger grows its bloom on; the cat holding a print purrs and looks at the straw; a sliding tap hangs the held print; the paws are touched where they are drawn, on a target 80 by 56 stage units; the straw's puff stops with its dent; a tapped tool hops and is put down on itself or its cloth; a dragged soap opens holes; one sound of dislike at a print and none at the hanging; the print keeps lines one cell wide; the oldest print is heard as it goes; the stick's drop hangs from its tip; the glow stays on the thing last shown. Reverted: the resting finger as ten small drops, which made a square bloom; it is one steady swell on the flow. Stills: `8-corner-asks-1180.png`, `9-resting-finger-1180.png`, `10-soap-dragged-1180.png`. | Not measured. | Many drops in one place get flat sides. The glow and the breathing corner can ask for two things at once. |
| 6 | Reading 2, and two stills at 1180 by 820: a brown print held up, the straw on plain water | "The cat says yuck but it holds my picture the same. I blew on the water and nothing was there. I put my whole hand down and it did not work." | What the sheet promised and a small hand needs: the brown print is held away at its top edge by two claws; the straw's dimple is drawn for as long as it puffs; the cat's dab stays within 140 stage units; the paws that hold a print are touched over all of each paw; the curled corner is touched wherever it is drawn; a held print dragged any way is hung; a palm that lands first on the rim hands the work to the next contact on the water; the hand's turns go on after a touch; colour in the air lands before a print is taken; a breath is counted in seconds. Nothing reverted. Stills: `11-two-claws-1180.png`, `12-straw-dimple-1180.png`. | Not measured. | Many drops in one place get flat sides. A tap on the lower corners of a held print lands on a paw. |
| 7 | Reading 3 and the last close, and two stills at 1180 by 820: a second finger pulling while a thumb rests on the comb, a held print carried off the paws | "My thumb was on the edge and nothing worked. I tapped the cat's paw and my picture stayed, but I wanted it on the line. I pulled my picture a bit and it flew away." | What a resting hand and a lifted finger get back: a contact that only rests hands the work to the next one that lands, on anything, and a tool it took up goes back; what is carried hangs for three tenths of a second and is carried on; a held print let go near the paws comes back to them, and a paw that holds one starts nothing; flicked blooms and the dab land clear of a held print; the curled corner is touched only where it is drawn; the paws are on a held print from the first frame; a park draws its seed and begins the hand's turns as a load does; a tapped held print does not jump; the wind on the cat sounds for as long as it shows; a touch that ends the hanging leaves the print still. Nothing reverted. Stills: `13-thumb-rests-second-finger-1180.png`, `14-print-carried-1180.png`. | Not measured. | Many drops in one place get flat sides. A second finger that lands within a second of a hand resting on a thing is not answered. |

### The cold playtest proxy, age 3

Run on the dev page at 1024 by 768 with the age set to 3, by a script with no knowledge of the game's rules: every tap held for 0.45 seconds, one whole hand of five contacts, one finger resting for three seconds. No production build was made on this machine, so it was not run on one.

The first thirty seconds:

- 0 to 3: nothing is touched. The cat breathes, blinks and looks about, the bird hops, the towel swings, the sheen drifts. The red stick stands in its pot.
- 3: a slow tap in the middle of the water. A red bloom is under the finger and grows.
- 5: a whole hand. One bloom, under the first contact; the other four do nothing.
- 7: a slow tap lower down. A bloom.
- 8 to 11: a finger rests. One bloom, and then nothing more while it rests.
- 12: a slow tap on the cat's head. The cat answers; the water is as it was.
- 14: a slow tap on the yellow pot. The yellow stick stands up; the red one leans out.
- 15 to 17: a tap and a pull through the red. A yellow bloom, a feather, and orange beads along the seam.
- 18: a slow tap on the corner of paper. The cat hops, the sheet floats down, soaks, is peeled up and turned over, and the cat holds the print under its chin.
- 26: the comb is on its way across the table. A slow tap on the print ends that, the comb lies on the cloth, and the print hangs on the first peg.
- 30: one print on the line, plain water, the comb on the cloth.

Unclear moments found, and what was done:

- Everything glowed at once. Fixed in pass 4.
- The held print was too small to show what was made. Fixed in pass 3.
- A finger that rests got one drop and no more. Fixed in pass 5: the bloom grows on under it.
- The corner of paper was not marked as the way to a print until the hand's fourth turn. Fixed in pass 5: the corner asks, and the hand shows it first.

The proxy was not run again after pass 5, 6 or 7. What pass 5 changed is held by tests in `toy.test.ts`, `layout.test.ts` and `hint.test.ts` and seen in its three stills.

### What is weak

A child would notice:

- Many drops in one place make rings with flat tops, bottoms and sides: each drop is laid on the grid by itself, and the rounding adds up. A bloom grown by a resting finger stays round.
- Once the hand has shown a second move, the glow is on that thing while the corner of paper still breathes, so two things ask at once.
- A resting finger that trembles past a tap's slop is taken for a pull, and the bloom stops growing.
- The print the cat holds covers the top 56 stage units of the water under its chin, and a touch there lands on the print.
- The paws that hold a print each take a touch over 80 by 56 stage units, on the print's lower corners and on the water beside it. A tap there with the stick wets the paw, which flicks colour onto the water below the print, and does not hang the print; the print is hung by a tap between the paws, 66 stage units across.
- A held print cannot be brought nearer to look at and left there: let go within its own width of the paws it goes back to them, and further off it flies to the line.
- A hand that rests on a pot, a tool, the cat, a cloth or the water keeps the work for its first second: a second finger that lands within that second is not answered. Resting on the rim, the table or the wall, the next finger is answered at once.
- A tool taken up on purpose and held down for more than a second goes back to its place when a second finger lands.
- A dragged sheet or print waits three tenths of a second after the lift before it is laid, hung or comes back.
- The cat's paws cover the lower corners of the print it holds, so a small picture low on the sheet can be half hidden.
- Small mud shows nothing on the cat's face: its nose wrinkles when a hundredth of the tray is brown, and its tongue comes out at a tenth.
- The cat's tail knocks like the table when it is tapped.
- The cat's chirrup comes after 60 stage units of combing and its purr after 32 of stroking, so both come late in a short stroke.
- The oldest print goes by itself, with a click and a flutter; no paw is seen to take it.
- The top-right corner, which is the grown-up's, answers a child's touch with nothing seen and nothing heard.
- No one has listened to the sounds.

The rest:

- A fresh round bloom and the ring the soap leaves show faint flat sides, eight to ten cells long, and the outline has teeth of one picture pixel when enlarged six times. The outline has no step, but it is not a true curve where the shape is a plain disc.
- A long thin pulled line can break into a bead or two near its tip, and a print can lose the last cell or two of a slanted line one cell wide.
- The glow round a tool, the paper corner and the held print is a plain box and not the thing's own outline, and it is drawn over the cat's paws.
- The paw's target is an ellipse 80 by 56 stage units, set 12 above the paw so that it stays off the water, and it reaches over the cat's chin: a touch on the chin beside a paw is a touch on the paw.
- The cat's dab lands 18 stage units or more into the water and 140 from its paw at most, so it lands beside the nearest colour only when that colour is near.
- While the sheet is peeled, the cat's left paw lies on the sheet with its arm hidden behind it.
- When a seventh bloom starts while six still grow, the oldest is laid whole at once. One finger cannot reach that with a swell among them, and no test holds what a swell would do there.
- Opened again, parked or loaded, the cat, the bird, the cloud and the sheen start afresh from a seed drawn the same way (the one in the address, or a new one), the idle ladder and the hand's turns start again, and the corner of paper curls up afresh. What was on its way is found so, and `found.test.ts` holds each: a resting finger's bloom as large as it had grown, growing no more; water that was coasting at rest where the coasting would have left it; a pull under a finger stopped where it was; colour that was in the air on the water where it would have landed, with nothing heard; a print that was being dragged, or was hanging in its grace, back in the cat's paws, which are on it from the first frame; a sheet that was let go and not yet laid back under the cat, with the colour still on the water.
- What a park keeps and a load does not is none of it the child's: the tier the quality governor had reached, the baked sprites, the open sound context (silent until the next press) and the grown-up overlay if it was open. The Mount's own part of a put-away is held by a scan of its source in `clock.test.ts`, not by a run in a browser.
- A drop on a paw that holds a print leaves `finished` true while the game is open, and a load reads the coloured water as a cycle begun. Nothing on screen or in the order of the tools depends on which.
- The straw's dimple is drawn on coloured water too, over the dent in the colour.
- A save taken while the water coasts plays a copy of the water ahead to rest each time, up to 1200 steps. Its cost on a tablet is not measured.
- A contact that rests is known only when the next one lands: a lone thumb on a tool still takes it up and keeps it until then.
- No frame rate is measured. Three fresh readings were made and no further one follows.

### Reader

Things that stay in the frame and could be taken for a letter, a numeral or a sign, each with why it is weaker than the thing it is.

- **The chevrons on the wallpaper, the towel and the cat.** A combed pattern that runs across the whole sheet in bands of unlike width and colour, with no start and no end. No zigzag of two or three strokes stands alone.
- **The cloths on the line.** The towel is a wide sheet with a scalloped hem; the sock is a fat, filled foot with a cuff, a heel and a toe, hanging from a peg. Its hook shape is the nearest to a letter in the frame; it is weaker because it is a filled shape of marbled paper with a foot's width, and it swings.
- **The window's cross.** Two bars inside a window frame, with sky, a hill, a cloud and a bird behind them, and usually a print across them. A plus sign stands alone and is not framed.
- **The sponge's holes.** A few holes of unlike size, unevenly placed in a yellow block. Not the pips of a die.
- **The cloth's three daubs.** Three daubs of unlike size, colour and place at the edges of the cloth the tools lie on. Not three marks in a row.
- **The comb's five teeth.** Tapered, of unlike length, askew, and joined to the comb's back. Not a tally.
- **The straw's stripes and the cat's tail bands.** Running bands along a bent shape, of unlike width.
- **The soap's three bubbles.** Unlike in size and bunched at one corner of the bar.
- **The sheet edge on, in its turn.** Under the cat's chin, in the middle of the print's turn in scene 1: a thin upright cream bar for a few frames. It stays because a sheet that turns over is seen edge on. It is weaker than a numeral or a stroke because it is between a sheet that narrows and a sheet that widens, in the cat's paws, and gone at once.
- **The pots seen from above.** Each pot is three nested rings: a dark rim, a paler lip and a disc of colour. They stay because that is a pot of paint seen from above. They are weaker than a target or a letter because each is filled, has a glint, a shadow and a wooden stick across it.
- **The bird's legs.** Two short strokes under the bird on the sill. They stay because the bird stands. They are weaker than a tally because they are joined to its body, a bird's width apart, and move with every hop.
- **The pegs.** Small wooden pegs, each on the thing it holds, unevenly spaced along a sagging line.
- **The line of prints.** Up to four sheets of unlike size, tilt and drop. Not a row of equal marks.
- **Ripples.** Three arcs of unlike length, a few short strokes, or five wakes of unlike length; never a whole ring. The straw's dimple is two arcs of unlike length, turning, under the straw.
- **The soap's lens and its bubble.** On the water where the soap touched: a pale filled oval that opens and fades in under half a second, and on plain water a small pale disc that drifts up and is gone. Whole round shapes. They stay because they are the sheet's own cells for the soap. They are weaker than a numeral or a ring because they are filled and not outlined, slanted, growing, and gone at once.
- **The pile of paper under the cat.** At both sides of the cat, on the table's back edge: five level sheets stacked, seen edge on. Bars one over another. They stay because the cat sits on the paper the prints are taken from. They are weaker than a sign because each is a thick cream slab of its own length, the cat sits across them, and the corner of the top one sticks out and curls.
- **The jug's handle.** At the right of the jug, top right of the table: an open arc joined to the jug at both ends. It stays because it makes the shape a jug. It is weaker than a letter because it is a thick band on a filled body, with a stripe, a spout and a shadow.
- **The whiskers and the wind's wisps.** Three white strokes at each side of the cat's muzzle, of unlike length and slant, and three short wisps off its head while the straw blows at it. They stay because they are the cat's face and the sheet's own cell for the straw on the cat. They are weaker than a tally because they fan out from the muzzle, move with every look, and the wisps stream and are gone when the breath stops.
- **The nose's wrinkle.** Two small arcs at each side of the cat's nose while it smells mud or a brown print. They stay because they are the cat's one taste the sheet asks to be seen. They are weaker than brackets because they sit on the muzzle between the eyes and the mouth, come with the tongue, and go when the mud does.
- **The meowing mouth.** A dark oval under the cat's nose while it meows. It stays because the meow must be seen as well as heard. It is weaker than a numeral because it opens and shuts in a moment, on a face, with a tongue in it.
- **Drips.** A tear of pale blue under the lower edge of a print, falling. A bar over a drop. They stay because the sheet asks for two drips and one last drip. They are weaker than a mark because they fall, end in a ring of ripples, and are gone.
- **The two claws.** One dark hooked stroke under each paw, over the top edge of a brown print the cat holds away. They stay because the sheet asks for two claws. They are weaker than commas or quotes because each grows out of a paw, they are a paw's width apart on a sheet of paper, and they are gone in under two seconds.
- **A bloom the soap has opened.** A ring of paint, which is the sheet's own cell for soap on one bloom. It is weaker than a numeral because the child's own touch made it, it is thick and uneven, it lies among other colour, and the next touch changes it.
- **Rings on the water.** A bullseye of the child's own drops, in colour, never a drawn outline.
- **The glow round a pot.** A ring, but on the pot's own round rim and only while that pot is the thing offered.
- **The blue line on the tray and the jug's stripe.** Each follows the rim of the thing it is on.
- **A stick in a pot.** A slanted wooden stick with thickness and a coloured end, one end in the pot.
- **The standing stick with its drop.** At the dipped pot, to the right of the tray: the stick stands up and one drop of the pot's colour hangs from its tip, touching it. A bar over a dot. It stays because it is the only thing that says which pot is dipped, and the sheet asks for a stick that stands with a drop hanging. It is weaker than a letter or a mark because the stick is slanted and thick, its lower end is in the pot, and the drop is a tear of paint joined to the tip, not a dot set apart.
- **A pulled line with a bead.** In the water, wherever the child pulled: a thin line of colour whose tip can break off as a bead. A stroke and a dot. It stays because it is the child's own pull, which the game never draws by itself. It is weaker because it is paint among other paint, bent the way the finger went, and the next touch moves it.
- **The three pots in a column.** To the right of the tray, top to bottom: red, yellow, blue, each a bright disc in a dark pot. A traffic light. They stay in a column because the sheet gives them 120 stage units across and 140 apart, out of the bottom strip and off the water. They are weaker because the lowest is blue and not green, each has a wooden stick in it, the dipped one's stick stands up, and they sit on a stone-paper table beside a jug and a cloth.
- **The sheen's slanted bands.** On the water while no finger is down: up to three pale slanted bands that slide across, none on the lowest tier. Slashes. They stay because still water with nothing on it must be alive at rest. They are weaker because they are wide, of unlike width and speed, barely lighter than the water, always moving, and gone under a finger.
- **The cat's combed back.** On the cat's back after the comb has been drawn over it: eighteen even strokes with a parting. A tally. It stays because it is the sheet's own cell for the comb on the cat. It is weaker because the strokes fan out from the parting, bend with the back, and are cut by the cat's outline.
- **The cat's ruffle.** Along the top of the cat's back while it is stroked: six tufts of unlike height. A zigzag. It stays because it is the sheet's own cell for a stroke on the cat. It is weaker because the tufts are filled fur on the curve of the back, rise and fall with the stroke, and never stand apart from the cat.
- **The cat's mouth and toes.** Two small curves under a nose, with whiskers and a tongue; two short toe lines on each paw.
- **The ghost hand.** A hand with one finger out, and nothing else.

### The stills, read against the frame rule

- **Empty:** no bare wall or floor. The wall is combed paper, the table stone paper, both to the edges, at both sizes; at 1024 by 768 the wall and the table fill the taller frame. The one plain surface at rest is the water, which is the thing the child fills.
- **Funny:** a fat, slightly cross-eyed tabby cut from stripy paper, as wide as two fifths of the frame, with its chin on the tray, a tip of tongue out, and a dab of blue on its head it has not noticed. It peers over the print it holds.
- **Alive:** the cat's eyes follow the finger or wander, it blinks, breathes, flicks an ear, and its tail keeps a slow beat. The bird hops, pecks and turns on the sill. A cloud drifts in the window. Each cloth swings in its own time. The sheen drifts on the water while no finger is down.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

Each frame rate comes with the engine, the throttle, the pixel ratio and the build it was measured on, and with whether a physical iPad was measured. None has been measured: the machine this was built on draws in software.

- Alive at idle: the cat, the bird, the cloud, the cloths and the sheen move with no touch.
- Motion and sound on every touch: the water, each pot, each tool, the tools' cloth, the paper, a held and a hung print, the cat, the bird, each cloth, the rim, the table and the wall each answer when the finger lands. A contact that only rests never deadens them: the next contact that lands is answered as itself, and `hands.test.ts` holds it for a resting contact in nine places and a second finger on six kinds of thing. The top-right corner, which is the grown-up's, answers with nothing seen and nothing heard. `toy.test.ts` holds that each answers at once with a sound of its own, and that every cell of the grid, the cat's row with it, sounds unlike its neighbours.
- Weight, squash and follow-through: a bloom keeps spreading and the water coasts after the lift; the pots slosh, the cat squashes and springs back and is heard when it lands, the cloths and a hung print swing on.
- Kid-clear silhouettes and tappables: every thing a child touches is 48 px or more across and high at both sizes, the paws with them, and nothing lies under the home control or in the top-right corner; `layout.test.ts` holds each. The paws are touched on a target larger than they are drawn: set a little above them on the rim, and centred on them, over all of each drawn paw, while they hold a print. The curled corner of paper is touched only where it is drawn, and the towel's hem beside it is the towel's.
- Wordless clarity for age 3: nothing written, no numeral, no sign; the wordless check passes; the "Reader" list above names what stays.
- Wordless idle guidance: one thing glows, then a ghost hand shows one move that can be made now (`hint.ts`); the ladder goes quiet after four showings, the cat's own acts never reset it, and after a touch the hand goes on to the next thing not shown since the last print.
- Frame budget: one draw number, 54 stamps, fills and strokes at the busiest legal moment, at both sizes, held under 80 by `view.test.ts`. No shadow maps, no post pass, pixel ratio capped at 2, four tiers. The frame rate is not measured.
- Assets: all procedural. Sound is synthesized; no clip, no speech.
- One clock: every motion and sound is driven by the toy's clock; `clock.test.ts` and the sync tests in `scenes.test.ts` hold it.
- Found as left: put away at any instant and opened again, the game is the one a load of its save makes. `found.test.ts` holds it for 33 states, a resting finger mid-growth, a pull mid-coast, colour in the air, a dragged print, a print and a sheet hanging in their grace, the cat's look in scene 1 with a drip falling, scene 3 while a print is held and a second contact down among them. A park draws its seed and begins the hand's turns as a load does, and `tray.test.ts` holds that a save taken mid-motion equals the water played out to rest with zero cells differing.
- No engagement mechanics: no score, count, timer, streak or praise. The cat's tastes are about colour.

### The learning claim

This game has no learning goal and is designed from no records.

### Defaults taken for the owner

- Age chooses only which tools lie on the table on a first visit; a saved place wins after that; no age gives the youngest.
- The line keeps the last four prints.
- Plain water takes no print.
- A resting finger grows its bloom for five seconds, to nearly twice its width.
- A tap on the held print sends it to the lowest free peg; a drag of it further than its own width from the paws, or above the cat's head, to the free peg nearest where it is let go; let go nearer, it comes back to the paws.
- A contact that lands where nothing is, or has rested a second on anything, hands the work to the next contact that lands. A tool it took up goes back.
- What a drag carries hangs for three tenths of a second after the lift, and a finger that lands on it again carries on.
- A drop on a paw that holds a print is answered and starts nothing.
- Nothing is heard before the first press of a visit.

### What the next builder should know

- A pull that drags the water takes what is under the finger along for good, so the finger never arrives at another colour. Anything that must notice a meeting looks ahead of the finger.
- A grid of whole values cannot be pulled a hundred small pieces at a time without going ragged. Keep where each cell's colour comes from as fractions, bend that, and read the grid off it once.
- A save taken while the water moves is exact only if the copy that is played out to rest carries the flow as well as the cells.
- An outline voted from the cells round a pixel has no step at any slant from three pixels to a cell; at two it steps at 45 degrees.
- Stills are taken with `tier=0` in the address: on a slow machine the governor steps down within seconds and the still would show the lowest tier.
- A carry that survives a lifted finger is kept by the model on its own clock, not by the touch tracker: the tracker ends every drag at the lift, and the model holds the thing hanging and takes it up again at the next press.
- A sound that belongs to a landing is asked for by the model in the step it lands, never by a beat at a fixed time.

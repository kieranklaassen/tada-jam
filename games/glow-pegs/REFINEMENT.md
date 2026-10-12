<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates
- Sheet: check round 1 came back with four findings, each with its replacement; all four are pasted above "The look" in `ART.md`. After that the builder wrote exact pairs wherever the code was right and the sheet silent or wrong, and the lead pasted them: pairs 1 to 7, 9 to 17, 18 to 30 and 31 to 44 are pasted, and pair 8 was refused (the moth droops, as the sheet says, and the droop is built). The builder edits nothing above "The look". Round 5: pairs 45 to 55 pasted by the lead.
- Look in use: vector arcade glow, the first look reserved for the game in `docs/art-direction.md`. The spike held on clarity and on draw count, so the second reserved look (backlit peg dots) was not tried. The lead passed the toy checkpoint on stills. The owner has not seen the game. The look's row in the claimed-styles registry of `docs/art-direction.md` links to `ART.md`, which closes with the row's text.
- Readings: three readings by fresh readers, each ruled on by the lead, and every ruling closed in the code with a test that fails when the fix is taken out. The third was closed by the builder's own last reading of the sheet against the code, written up under "The sheet against the code". There is no fourth reader.
- Open: no frame rate has been measured, on any device; nobody has heard the sounds; the cold playtest proxy has not been run on a production build (it was run once on a dev page, before the first reading: no production build was made, by the lead's instruction).

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

**What the game is.** A peg board inside an arcade cabinet at night. The finger pushes pegs of five colours into the board, mirrored two or four ways if a mirror key is down. The lever on the right starts a beam that sweeps the board a column a beat: every peg it meets sounds the note of its row, and each colour does its own thing (red is a drum, blue a long note that rings on, yellow splits a half beam off the other way, green turns the beam back every other time it comes, white holds it a beat, and every other beam stands still for that beat). A beam that leaves the board is away for one beat and comes in again at the left, so no column sounds on two beats running. A beam turned back by green pegs eight times in a row without leaving the board is the one show the board can cause; a little after it the beam is let out. The tray's handle, dragged down, lifts the lever and clatters every peg back into its well: that is the ending, and the board is then dark and ready. A spider, a gecko and a moth live in the cabinet and answer the pegs and the beam.

**What the lead should try first.** Touch nothing for twelve seconds: the glow on the next holes, the ghost hand's drag, then the glow on the lever and the hand that pulls it. Drag a row of yellow along the bottom, tap the key with four panes and drag a diagonal in red. Press low on the lever's plate and pull down slowly: the knob comes with the finger from where it was, from the first unit; let go a quarter of the way down or more: the knob falls the rest of the way with one clunk, and each yellow peg sends a soft dim band the other way along its own row, behind the pegs it passes. Pull the knob a little way and let go: it springs back with a creak. Tap the lever while sliding sideways across its plate: a tap. Push a white peg into a yellow row and watch every beam stand still for the beat a half beam is held on it. Push a green peg in ahead of the beam and a second behind it; wait for eight turns. Press anywhere in the middle of that show. Push a blue peg and watch the spider's legs as it swings. With red in hand, tap the red peg the moth sits by. Tap the amber drop by the tray: it swings for a second, with a glint. Leave the tune playing and touch nothing for a minute and a half: the drop rattles and swings once by itself. Drag it down to its stop with the lever down. Put the game away in the middle of the clatter and open it again.

**Stills.** Fifteen, kept outside the repository; the builder's report says where. All from the dev server at tier 0, with a fresh slot and a seeded stream.
- `01-rest`: 1180 by 820, nothing touched. Taken after the first reading: the keys and the lamps in it are the ones before the second.
- `02-mirror`, `03-beam`, `04-clatter`, `06-idle`, `07-proxy`: taken before the first reading; the keys, the half beams, the marquee and the lever in them are old.
- `05-tall`: 820 by 1180, with the shell's turn-the-device card hidden: what no child sees. Old as well.
- `08-keys`, `09-lever`, `10-droop`: taken after the first reading. The keys in `08-keys` are the ones before the second reading.
- `11-keys-ratio1`: the three keys at 1024 by 768 and pixel ratio 1, the four-pane key down and lit: the same solid peg up and left on each, a cap with its glint; the hole in every echo open; the fold lines into the rim.
- `12-yellows`: taken after the second reading: the half beams in it are the upright slivers that the third reading read as a stroke through a peg. Old.
- `13-knob-low`: the lever taken low on its plate and pulled sixty units: the knob a third of the way down, having moved with the finger and not leapt to it. Taken before the lever read only the travel along its slot; what it shows still holds.
- `14-yellows-band`: a row of yellow pegs along the bottom of the board at pixel ratio 2 with the beam running: each half beam a dim band behind its peg, showing at the two sides of the cap, nothing above or below a peg and nothing across a face.
- `15-rattle`: the tray's handle a moment after a touch, at pixel ratio 2: the ball's trail to both sides of where it hangs, and its glint flared white.

**What is weak: a child would notice.**
- No one has heard the sounds. The three keys are a knock, a chime and a rush of air on paper only; the knob's creak, on the press and when it springs back, and the handle's rattle are unheard.
- The handle rattles once by itself, 87 seconds after the last touch. It now swings for a second with a glint, so it is seen; nothing shows that it is to be pulled down, and the idle hand never shows it.
- A tap moves the lever when the finger lifts, not when it lands: the beam comes a moment later than the touch. A pull of 30 to 45 units along the slot, more than a tap and less than a quarter of the way, springs back with a creak and no beam, while a shorter one is a tap and a longer one goes down: a child who pulls a little gets nothing from the middle of the three.
- The beam is away for one beat each time across, so the tune has a rest of one beat where it wraps round. A tune built to loop without a gap has one.
- Green turns the beam every other time. A child who built a short loop on purpose hears the short phrase and the whole tune take turns. A trap does not hold for good either.
- A half beam is a dim band along one row, and it still sounds every peg of the column it is on: the sound comes from more of the column than the band covers. Behind a peg only its two ends show, about 11 to 19 units at each side of the cap; in `14-yellows-band` it is faint beside the full beam.
- A white peg now stops every beam for its beat, not only the one that met it. When a half beam meets a white peg the tune rests a beat as well; a child who put the white peg in for one rest hears one for each beam that comes to it.
- Under the handle's ball the slot runs on for 64 units that are not the handle: a touch there leaves a spark and plucks a cable.
- When the spider swings towards the board its near legs are drawn in against its body; at the far end of the dreaming swing they are half their length. Nobody but the builder has judged whether that reads as legs tucked or as legs gone.
- The sitting moth is still the smallest thing in the frame. Its droop lasts half a second.
- The gecko's neck leans at most 15 units towards the red pegs. It is there and it is slight.
- The pile in a well rattles when the well is tapped. It never grows smaller.

**What is weak: the rest.**
- No frame rate. The draw count is 68 of 80 at its worst, the clatter of a full board; the headroom is twelve.
- Ten of the fifteen stills are older than the second reading, and `12-yellows` is older than the third; the proxy was not run again after the lever changed. All come from the dev server.
- The proxy is a script written by the builder, who knows the game.
- In the Mount, two things have no test of their own: the branch that keeps the grown-up's corner from acting, and the order of work at put-away. Their pure parts have (`layout.test.ts`, `parked.test.ts`, `outlets.test.ts`). What the toy does with a gesture and with a finger that moves is no longer in the Mount: `hands.ts` holds it and `hands.test.ts` drives it through the tracker. The Mount's own line that calls it has no test.
- On a surface with room above the stage, such as 1024 by 768, the loft is drawn there, and one of its traces or cords may run behind the home control. No test covers the loft. The reader named it and the lead did not rule on it.
- Held upright, at 820 by 1180, the stage is only fitted in: a hole is 44 pixels each way, a mirror key 47 and the moth 44. A child never sees that size: kid-land is landscape only, and the jam's shell covers a surface held upright with its turn-the-device card. At 1180 by 820, at 1024 by 768 and on a landscape surface down to 615 pixels high every target is 48 pixels or more each way (`layout.test.ts`); below 615 high a hole falls under 48, and this stage of 7 rows over a tray cannot hold it there.
- The yellow peg knocked out still flies apart as two halves, and dropped by the handle falls as two halves. Each "half" is drawn as a whole cap, one at 0.62 of a peg's size and one at 0.5, moving apart for a moment: two small pegs, not a peg in two pieces. No reader named them.
- The scan lines barely show in a still.

**Frame cost.** No frame rate is reported: this machine has no graphics processor. The draw count is what a frame draws on the live layer (sprites stamped, paths stroked, paths filled); the still layer costs a frame nothing. One number holds at 1180 by 820, 1024 by 768 and 820 by 1180 and at every tier: **68**, with one full-surface pass. The clatter is the busiest moment. The handle's rattle is now drawn line by line for a second (three draws where its stamp was one), and the number did not move: the clatter's busiest frames come after that second. `frameBudget.test.ts` reaches three moments with a stand-in context: a four-way scribble over a full yellow board with the beam and its half beams running, a pile rattling and the gecko's neck on its way round (63); the clatter of a full board of each colour, begun with the lever down (68); the trapped beam's show (38). A resting frame is held at 34 or less. When the gecko's neck comes to rest somewhere new the view makes the gecko's stamped drawing again, that one drawing and no other (`view.test.ts`); the draw count does not see that work.

### Reader

Shapes that could be taken for a numeral, a letter or a sign, and why each is weaker than the thing it is.

- **The marquee lamps.** A row along the top. No two share a size and no two hang at the same height (`layout.test.ts`), the gaps differ, each breathes at its own pace, and each has a cap and a wire: a string of bulbs, not a row of equal marks.
- **The loft lamps** (tall surfaces only). Pear-shaped bulbs on cords of unequal length, each with a small arch of filament inside.
- **The loudspeaker.** Four rings, nested off-centre and squeezed, inside a housing with unequal screws. At every sound one more ring swells out of the cone: a whole closed ring, never an arc with a gap, so nothing there can be taken for a letter. A cone, not a lone ring or a target.
- **The valve's filament.** It was a zigzag. It is now an uneven coil of wire inside a glass bulb on a base with pins.
- **The circuit traces.** Unequal lengths and bends, each ending in a blob of solder: a wall's texture. None is a lone level stroke and no two lie level side by side.
- **The mirror keys.** Each key shows one solid peg and no more, in the same place on all three, up and left of the middle, and drawn as a peg on the board is: a cap with its glint, dim amber at rest and the colour in hand on the key that is down. So the first key is a peg on a key, off its middle, and not a die's one. The echoes are hollow outlines, at most 0.55 of the peg's radius, drawn with one thin line and no glow: the hole in each is 8 pixels or more across at pixel ratio 1 on the smallest surface a child has (`layout.test.ts`, `view.test.ts`, `11-keys-ratio1`), so they do not fill in as dots. The second key has one upright fold line; the third has two, upright and level. Each fold line ends on the key's rim at both ends, so the two lines cut the third key into four panes, a window and not a plus sign in a box (the first reading's note said so while the lines still stopped 5 units short; they no longer do). On the key that is down the lit rim is drawn 3 units inside the key's edge and the lit folds run to the edge itself, so each fold overruns the lit rim by 3 units at both ends, and for a tenth of a second after the press the whole lit drawing sits 3 units low: still four panes inside a frame. The keys are still the nearest thing in the game to a count (none, one, three echoes), and they are listed for the owner.
- **The board's pits.** An even grid of dark dents. It is the board itself, the thing the child works on, and a pit is a shaded hollow, not a ring.
- **Halos and blooms.** Rings round a peg. They last a fraction of a second, are thick, differ by colour and always have a peg in the middle. Yellow's two rings are one inside the other, both round the peg, going in and coming out: never two rings side by side (`view.test.ts`).
- **Half beams.** Soft dim bands, sometimes several. Each lies along the row of the yellow peg that split it, level, longer than it is tall and no taller than a peg's cap; where a peg stands in its cell the cap is left out of the band, so the band shows at the two sides of the cap and nothing crosses a face. An upright stroke through a ring, which the third reader saw in the old sliver, is gone (`beam.test.ts`, `view.test.ts`, `14-yellows-band`). On an empty hole the band is a whole oval over the pit: every band is at least a third as tall as it is long, a blob of light and not a dash, so it is not a minus sign. Its height and length come from the column it was split off in, and it moves every beat.
- **The beam.** One soft upright bar a column wide, moving. While the lever is down the board's left edge, where the beam comes in, is lit as one amber upright line the height of the board: it lies on the bezel and reads as the frame.
- **The lever and the tray's handle.** A solid ball on a slot and a solid drop on a cord in a slot: each could be taken for a letter with a dot. Each is solid amber, has a glint, and moves under the finger; the ball moves with the finger from where it was taken, and the drop swings from side to side when it is touched.
- **The wells.** Five outlines in a row, each with its own pile of its own colour; unequal in what they hold.
- **Sparks.** Short dashes of unequal length flung outward, gone in a fraction of a second.
- **The web and the floor grid.** Crossing lines. The web's strands sag and its rings are uneven; the floor's lines run to a far point. Neither holds a lone upright cross.
- **The cradle under the home control** and **the bezel.** The marquee's upper rail stops either side of the home control and hangs a half ring under it; the lower rail runs straight. A half ring open at the top could be taken for the letter U: it is joined to the rail at both ends, the jam's home control sits in it, and a row of lamps hangs from the rail beside it. The bezel is a frame.
- **The gecko's belly bands.** Short curved strokes between the two lines of its body, unequal and bent with it. They could be taken for a ladder; they are on an animal with a head, toes and a tail.
- **The ghost hand.** A hand in outline; it points with its whole shape and has no arrow.

### Cold playtest

Run as a script at the band's youngest age, 4, on a dev page of the jam with its own shell (no production build was made). A script is not a child: it shows what the game offers in order, not what a child would choose.

- **0 to 10 s, hands off.** Seen: three pegs in a rising step, the moth beside the last, the two watchers looking at it, a red peg standing in its well, the amber ball of the lever. From about 3 s a glow on the next two holes; from 5 to 8 s the ghost hand drags across them; at about 10 s the glow is on the lever's knob.
- **10 to 30 s, without help.** Copied the drag: three red pegs, and the gecko basked. Poked the spider: it dropped on its thread. A slow tap on the yellow well, then a scribble. **Tapped the amber ball at about 15 s: the lever was found**, the beam ran and split at the yellow pegs. Watched. Pulled the amber drop at about 20 s: the clatter, and the board dark by 26 s. Left alone: the glow on three holes at 32 s.
- **Unclear before the fixes:** the glow was too faint to find; the ghost hand slid down the lever's slot while the knob stayed up; a drag that began on a well's pile and ran onto the board did nothing.
- **After:** the glow is stronger; the knob's ghost goes down under the hand; a drag from a well carries that colour onto the board and lays pegs.
- **Still unclear:** the lines about the lever and about the handle under "a child would notice" above. The proxy was run before the first reading and not again: its tap on the amber ball is now answered on the lift, and its pull of the amber drop began on the ball, which is still the handle's target.

### The sheet against the code

Read sentence by sentence by the builder and by three fresh readers, and once more by the builder at the last close. The builder edits nothing above "The look": every place where the code is right and the sheet silent or wrong is an exact pair for the lead, found once in the sheet as it reads.

- Pairs 1 to 7, 9 to 17, 18 to 30 and 31 to 44: pasted by the lead. Pair 8 (to strike the moth's droop): refused, and the droop is built.
- Pairs 45 to 55, written at the last close: pasted by the lead. They cover: a half beam is a soft dim band behind the peg, no taller than the cap (two sentences); the lever reads only the travel along its slot, a pull of a quarter or more goes to the other end and a shorter one springs back (three sentences); a white peg that holds one beam holds every beam for that beat; the two exceptions to "the watchers answer every new peg"; what each control's first touch shows, a key lighting only itself; the handle's rattle seen; where the handle's target ends; the conducting spider's feet on the beam's steps, waiting out a beat of quiet.

**Reading 1, finding by finding.** Each line names the test that fails when the fix is taken out.
- The keys read as a die and lit as a count: `layout.test.ts`, `view.test.ts` (lit whole on the frame of the press), `toy.test.ts` (one cue), `voices.test.ts` (three kinds of sound, no rising count).
- Half beams as tally strokes: `beam.test.ts`, `view.test.ts`.
- The loudspeaker's open arc: `view.test.ts` (one whole turn, shut).
- The lever flipping on the press and again on the drag: `show.test.ts`, `parked.test.ts`.
- A pulling stroke took every colour: `toy.test.ts`.
- Green left columns unplayed: `beam.test.ts` (over 400 seeded boards, every column that holds a peg sounds within two times across), `show.test.ts`.
- The moth's target: `layout.test.ts`.
- The neck, the droop, the pile: `toy.test.ts`, `moth.test.ts`, `view.test.ts`.
- The marquee behind the home control: `layout.test.ts`.
- The ending unfound: `toy.test.ts` (see reading 2).
- Two cues for one colour on one beat: `show.test.ts`, `clock.test.ts`.
- The spider's taps off the beat: `show.test.ts`, `clock.test.ts`.
- The tall layout: not built, by the lead's ruling.

**Reading 2, ruling by ruling.**
1. The keys: fold lines end on the rim; the solid peg in one place on all three, a cap with its glint; echoes one thin line, their holes open at pixel ratio 1. `layout.test.ts`, `view.test.ts`.
2. A half beam is a short sliver on its yellow peg's row, inside the row's cell. So it was then; the third reading's ruling 1 below made it a band behind the peg. `beam.test.ts`, `view.test.ts`.
3. The yellow bloom's rings are one inside the other. `view.test.ts`.
4. No column sounds on two beats running: a beam that leaves is off the board for a beat. As closed then this held for the full beam only; the third reading found a half beam and the full beam on one column on beats running, and its ruling 4 below closes that. `beam.test.ts` (green in the first column; any green over 600 seeded boards), `show.test.ts`, `view.test.ts` (no bar drawn on that beat).
5. The ending's hint comes while the tune plays too, once, and a put-away or an opening earns none. The toy keeps the stretch (`untouched`, never saved, null as a load finds it). `toy.test.ts`, `parked.test.ts`.
6. Every leg of the spider stays in its own place in every act: on the side where its body nears the board's frame or the stage's edge the legs are drawn in. `view.test.ts`.
7. The knob moves with the finger from where it was taken, from the first unit. `show.test.ts` held this for the toy alone; the third reading's ruling 5 below takes it through the tracker.
8. No two lamps share a size or a height. `layout.test.ts`.
9. A green peg pushed in is obeyed by half beams too, and a half beam shut in again is let out at its next turn. `show.test.ts`, `beam.test.ts`.
10. The lever lifts at the clatter's first beat. `show.test.ts`.
11. Only the gecko's stamp is made again when its neck settles. `view.test.ts`.
12. Two places the sheet did not name, now pairs 35 and 44 and each held by a test: `toy.test.ts`.
13. Stale lines in this file and the heading over the registry row in `ART.md`.
14. The draw number is 68.

**Reading 3, ruling by ruling.** Each fix was taken out again and its test seen to fail.
1. A half beam never strikes through a peg: it is a soft dim band along its row, drawn behind the peg, no taller than the cap, the cap left out of it. `beam.test.ts` (no band taller than the cap, none reaching the next cap, every band plump), `view.test.ts` (level, the cap cut out where a peg stands, one dim fill and no stroke). Pairs 45 and 46.
2. The lever reads only the travel along its slot. A tap toggles; a pull that has the knob a quarter of the slot or more from the end it was at goes to the other end on the lift; a shorter one springs back with the creak, and a knob the finger carried all the way back is silent. `show.test.ts`, `hands.test.ts`, `clock.test.ts`. Pairs 47 to 49.
3. The handle's rattle is seen: the handle and its ball swing 20 units to each side for a second, with a glint, tapped or by itself. `show.test.ts` (the swing and the glint over the second), `view.test.ts` (the ball drawn where the swing has it, the glint flared, the stamp only when the second is out), `clock.test.ts` (every rattle cue in the frame the swing begins). Pair 53.
4. No column sounds on two beats running, by any beam. Fixed in the beam, in four lines: while a white peg holds one beam, every beam and half beam stands still for that beat, so all of them stay in step. `beam.test.ts` (the reader's board; 600 seeded boards of every colour, each with yellow and white, 120 beats each). Pair 50.
5. The knob moves from the first unit through the tracker too. The tracker sends no move inside its slack, so the Mount now hands the toy the working finger's every move (`hands.ts`, `Toy.follow`), and only the lever's knob reads it. `hands.test.ts` drives the tracker at 1180 by 820 and 1024 by 768, a unit at a time. The sheet's sentence stands; no pair.
6. Two sentences that were kept only by the letter: the watchers answer every new peg, with two exceptions; a key lights only itself. Pairs 51 and 52. No code changed.
7. The handle's pull can be finished on the surface wherever it is grabbed: its target now ends 96 units above the stage's lower edge, and the slot below it is bare backdrop. `layout.test.ts` (every point of the target at both sizes: the finger at the stop is 16 pixels or more inside the surface), `show.test.ts`. Pair 54.
8. Stale lines in this file and the wording over the registry row in `ART.md`.

**The builder's last reading**, sentence by sentence, after the eight rulings were closed. What it found:
- *One sentence not kept, now a pair and a fix.* The trapped beam's scene says the spider's feet tap on each beat. With a white peg between the two green ones the beam is held every few beats, and on a held beat no tap was heard while a foot was still seen to come down. The conducting spider now waits out a beat of quiet with both feet down (`show.test.ts`, taken out and seen to fail), and pair 55 says the feet tap on each step the beam takes.
- *Kept by the fix to ruling 4, checked again:* "so that no column sounds on two beats running" holds for every beam on a board with white on it; the grid's "a bell, and a beat of quiet" is now quiet for the whole board; "every column that holds a peg sounds within two times across" holds with the shared rest, counted by the times the full beam leaves the board (`beam.test.ts`, 400 seeded boards).
- *Kept, and worth a second look by whoever reads next:* "a touch anywhere else leaves a spark and plucks the nearest cable" now covers the slot under the handle's ball; "A tap on it only rattles it" holds, and the rattle is seen; "the ghost hand ... the lever's knob pulled down" is a full pull, which goes down under the new rule; "a touch that is taken away moves nothing" holds for a knob pulled any distance (`show.test.ts`).
- *Not in the sheet and left so:* a handle let go part of the way down swings back with no sound (it is seen and not heard, the other way round from what ruling 3 forbids); a tap on the lever that wobbles moves the knob a few units under the finger before the lever goes.
- Nothing else was found unkept. The sentences about the saved state, the first visit by age, the characters' tastes, the clatter and found-as-left were read against `state.ts`, `save.ts`, `motion.ts`, `moth.ts`, `toy.ts` and their tests and stand as written.

### The lessons, each with its test

- One clock, nothing hidden in a voice: `clock.test.ts` (every cue belongs to a frame in which its motion is seen, over whole sessions, a trapped beam and a full clatter), `voices.test.ts` (no note has a delay).
- A scene ended by a touch is silent from that frame, and put-away closes all sound: `outlets.test.ts`, `show.test.ts`.
- Every pose value is drawn, and a thing is touched where it is drawn: `view.test.ts`.
- Nothing pending outlives its touch, nothing starts or sounds on load: `parked.test.ts` ("on load"), `toy.test.ts`.
- Parked equals loaded in thirteen states, the ending's hint among what is settled, and the idle ladder is taken back: `parked.test.ts`.
- A cancelled pointer never acts: `parked.test.ts` ("cancel"), `toy.test.ts`.
- The corner and the home control: `layout.test.ts`, at three surface sizes and on a short surface.
- Age is a first-visit default only: `parked.test.ts` ("age"), `save.test.ts`.
- A character's own act never touches the ladder, and a tap may last 0.45 s: `parked.test.ts` ("busy", "slow tap").
- One sound event a frame a colour for a scribble: `toy.test.ts`, `voices.test.ts`.
- The moth's size and its distance from every hole and peg: `layout.test.ts`, `view.test.ts`, `moth.test.ts`.
- Nothing passes through anything (2D, by model): `layout.test.ts`, `fallers.test.ts`, `moth.test.ts`.
- A thing that must follow the finger from the first unit is fed the finger's every move, not only the tracker's gestures: `hands.test.ts`.
- Beams that can meet stay in step, so a rule about beats running holds for all of them at once: `beam.test.ts`.
- No sound without its sight: `clock.test.ts`, `show.test.ts` (the handle's rattle, the knob's creak when it springs back, the conducting feet on a beat of quiet).
- No test writes a file or reads the environment.

### Template notes

One entry a file copied from the template.

- `glow-pegs.tsx` (from `game.tsx`): rewritten, keeping the template's order of work. Two canvases and a strip of scan lines; every sound the model queued is played after a touch and after a step, through two outlets so a scene can be shut alone. **For the template:** the copied Mount plays one fixed voice at a tap; "play what the model queued" is written anew by every builder.
- `frameBudget.test.ts`: **for the template:** the stand-in context has no gradients, so a game that makes one fails before it counts.
- `config.ts`: this look's own tier fields; `LADDER` is the one id `open`; `TAP_PRESSES` is 1.
- `state.ts`: as copied; `save.ts` wraps it. `state.test.ts`: **for the template:** the copied test reads `LADDER[1]` and fails for a game with one place.
- `audio.ts`: as copied. **For the template:** `Note` has a `delay`; a game on one clock must never use it and nothing says so.
- `scene.ts`: as copied, used for the clatter and the trapped beam.
- `input.ts`, `guidance.ts`, `rng.ts`, `stage.ts`, `overlay.ts`: as copied. **For the template:** the tracker sends no move while the finger is inside a tap's slack, and the copied Mount passes the toy gestures only; a thing that must move under the finger from the first unit needs the finger's place as well. Here that is `hands.ts`, a pure module the Mount calls and a test drives through the tracker.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- `manifest.ts`, `index.ts`: as the generator wrote them.

### For the owner

**Nothing praises and nothing counts.** There is no number, tally or meter; the wells never run out. The spider, the gecko and the moth answer a peg or the beam, never the child. What comes nearest:

- *Nearest to praise: the trapped beam's show.* What triggers it, plainly: the lever is down, and the full beam is turned back by green pegs eight times in a row without leaving the board. That takes a green peg on each side of the beam; the usual way is to push a second green peg in behind a beam that has one ahead of it. Then, for six seconds, the marquee lamps chase in step with the beam, the spider conducts with two feet that tap on the beam's steps, the gecko's eyes roll after the beam, the moth rides it along the board's lower edge and a hum rises. It follows a clever placing of pegs, and that is why it stands first here. It is caused by the board and by nothing about the child: it comes every time the board is so, once for each pull of the lever, saves nothing, counts nothing, and any touch ends it. Twenty beats after the beam was trapped it is let out.
- *Also near praise.* The spider drums and the gecko basks at a red peg. The moth settles beside the newest peg.
- *Nearest to a count.* The three mirror keys: no echo, one echo, three echoes. Each shows the same one solid peg in the same place, a cap with its glint; the echoes are hollow outlines whose holes stay open; the fold lines run into the rim and are the largest marks. A key lights at once, with one sound, and the three sounds are of three kinds.
- *Nearest to a prompt.* When nobody has touched the game for 87 seconds after a touch, as long as the idle ladder takes to finish its last demonstration, and pegs stand on the board, the tray's handle rattles once by itself, whether the lever is up or the tune is playing: it swings from side to side for a second with a glint, and is heard. No hand shows it. It does not rattle again until a touch and a whole new stretch have gone by, and a game that is opened, or put away and opened again, does not rattle until it has been touched.
- *Nearest to blame.* The gecko's fright and slide at a white peg. The spider covering its eyes at white. The moth's squeak when it is poked or a peg lands under it, and its droop when its peg is pulled. The clatter, which empties the picture: only the child's own drag to the stop does it, and a tap only rattles the handle.

**Only the owner can settle.**
- The look and the cast: vector arcade glow with a spider, a gecko and a moth. Not yet seen by the owner.
- Whether the trapped beam's show reads as a reward.
- Whether the mirror keys read as pictures or as counts.
- Whether the handle's one rattle is a fair hint or a nag.
- Whether green turning the beam every other time is the better rule, or a loop that holds for as long as the peg stands.
- Whether the one beat the beam is away each time across is a welcome breath or a hole in the tune.
- Whether a half beam as a soft dim band along one row, behind the pegs, still reads as a beam.
- Whether a white peg should rest the whole board for its beat, as it now does so that no column sounds twice running, or only the beam that met it.
- Whether a pull of the lever should go down from a quarter of the way, and whether the stretch between a tap and a quarter, where the knob springs back, is wanted at all.
- What the game sounds like: someone has to listen.
- The defaults listed under "For the pull request".

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak. No frame rate is measured in any row: this machine has no graphics processor.

**The first still, `01-rest`, by the full-frame rule.**
- What share is empty: the board is a third of the frame and is black on purpose, with a pit at each hole: it is the working piece, and the child fills it. Outside the board, cut into squares of 40 pixels, about one square in twenty-five holds no line, all of them small gaps between the cables on the right and under the marquee. No ground, wall or sky is bare.
- What is funny: the spider, as large as three pegs across, hangs by one thread with two huge eyes that follow the finger, one foot resting on a strand that runs to the board as if it were listening in. The gecko, as tall as the board, is pressed flat to the wall with its toes spread and its eyes turned sideways at the pegs.
- What is alive: the marquee lamps breathe, each at its own pace, the valve's filament flickers, the moth opens and shuts its wings beside the last peg, the spider plucks its strand or winds itself down and up, the gecko blinks one eye at a time and curls its tail.

| Pass | Looked at | Critique | Fix set | Still weak |
| --- | --- | --- | --- | --- |
| 1 (toy) | Stills of the toy: at rest, a touch, a four-way picture, a knock-out, the idle hand. | "The board has no lights on it when I open it." "The spider's legs are on top of the frame." "What is the scribble next to the light? Is it a bug?" "There is a black square round the white light." | "What is seen is what is meant": the first-visit pegs stand from the first frame; the spider clear of the bezel; the moth redrawn with round wings and a fat body; a round rub-out under a springing peg. Nothing reverted. | The moth small. The scan lines faint. |
| 2 | `01-rest`, the game at rest with the lever, the handle and the keys. | "The orange cup next to the box looks like a letter." "The lamps at the top are not on." "Where is the butterfly? It is tiny." "The buttons have dots like a dice." | "Every thing looks like the thing it is": the handle a solid amber drop on a cord in a slot; the lamps brighter and uneven; the moth larger sitting and larger still in the air, held by a test of its extent; the keys show pegs of unequal size, not pips; a lit peg a filled cap and a hole a dark pit; the valve's zigzag a wound coil. Still again: `01-rest` as kept. Nothing reverted. | The sitting moth is still the smallest thing. |
| 3 | `03-beam` and `04-clatter`: the beam meeting pegs, and the ending. | "The big white blobs hide my pegs." "The orange line at the side is cut off." "The spider's legs go out of the picture." | "The beam shows the pegs, it does not hide them": a peg met by the beam gets a halo round it and stays clear in the middle; the lit edge of the board runs whole past the spider; the spider leans toward the board when it rides its thread. Still again: both as kept. Nothing reverted. | Several half beams look like a row of lines. The bar over an empty board. |
| 4 | `06-idle` and the cold playtest proxy, `07-proxy`. | "The hand goes down but the ball stays up." "I can't see where the glow is." "I pulled a red one out of the box and it didn't come." | "What the hand shows is what happens": the knob's ghost goes down under the ghost hand; the glow stronger; a drag from a well carries that colour onto the board. Still again: `06-idle` as kept. Nothing reverted. | The handle is never shown. A green peg at the left edge. |
| 5 (reading 1) | The fresh reader's eleven findings with the lead's rulings; then `08-keys`, `09-lever`, `10-droop` and `01-rest` again. | "The buttons are a dice." "I pulled the stick like the hand did and it went clunk clunk clunk." "The light never goes to my pegs over there." "I touched the butterfly and it put a light in." "The thing at the top is behind the round button." | "One gesture, one answer, and no part of the board left out": the keys one solid peg with hollow echoes and fold lines, lit at once with one sound of its own kind; the lever moved on the lift, the knob under the finger; a pulling stroke takes its own colour only; green turns the beam every other time, and a trapped beam is let out after its show; the moth's target as wide as a hole's; half beams of eleven shapes; the loudspeaker's pulse a closed ring; the marquee's cradle under the home control and the moth's ride along the board's lower edge; the gecko's neck, the moth's droop and the rattling pile built; the lever lifted by the clatter; the handle's one rattle at the last rung; one beam cue a colour a beat; the spider's taps on the beam's steps. The tall layout was built and taken out again on the lead's ruling. | The handle's rattle comes late and once. The neck and the droop are slight. Six stills are from before this pass. Nothing heard. |
| 6 (reading 2) | The second fresh reader's findings with the lead's fourteen rulings; then `11-keys-ratio1`, `12-yellows`, `13-knob-low`. | "That one is a plus." "That button is a dice with one dot." "The yellow sticks are a chart." "The first one went ding ding." "The spider put its foot on my blue one." "I pulled the stick and it jumped." "I was listening and nothing told me about the drop thing." | "Each thing is only the thing it is, and only where it belongs": the keys' fold lines into the rim, the same peg as a cap on each, echoes one thin line; a half beam a short sliver on its yellow peg's row; the yellow bloom's rings one inside the other; the beam away for a beat when it leaves, so no column sounds twice running; the ending's hint kept by the toy, given while the tune plays too, and earned only by a touch; the spider's legs drawn in at the edge of its place, and three swings made smaller; the knob moving with the finger from where it was taken; no two lamps alike; half beams obeying a new green peg; the lever lifted at the clatter's first beat; the gecko's stamp alone made again. Nothing reverted. | The sliver on a yellow peg looks like a slit in it. The spider's drawn-in legs are unjudged. The loft's traces are not held clear of the home control. Ten stills are older than this pass. Nothing heard. |
| 7 (reading 3) | The third fresh reader's findings with the lead's eight rulings, and the builder's own last reading; then `14-yellows-band` and `15-rattle`. | "There is a line through my yellow one." "I pulled the stick and it only creaked." "The drop thing made a noise but it did not move." "I pulled the drop and my finger fell off the bottom." "The first one went ding and then ding again." | "What is heard is seen, and what is begun can be finished": a half beam a soft dim band behind the peg, no taller than the cap; the lever reading only the travel along its slot, down from a quarter of the way and sprung back from less; the knob under the finger from the first unit through the tracker; the handle and its ball swinging for a second with a glint at every rattle; the handle's target ending where its pull can still be finished; every beam standing still for a white peg's beat, so no column sounds twice running by any beam; the conducting spider waiting out a beat of quiet. Nothing reverted. | The band is faint beside the full beam. The stretch of the lever between a tap and a quarter gives nothing. A white peg now rests the tune once for each beam that meets it. Thirteen stills are older than this pass; of them `11-keys-ratio1` and `13-knob-low` still show what holds. Nothing heard. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle:** the lamps, the valve, the moth's wings, and a quiet act of its own from each watcher, never the same twice running (`motion.test.ts`).
- **Motion and sound on every touch:** every point of the stage answers inside the press with a sound and something seen, the grown-up's corner excepted (`toy.test.ts`, `view.test.ts`); sight and sound are on one clock (`clock.test.ts`).
- **Weight, squash and follow-through:** a peg is pressed small and springs past its size; each colour leaves with its own weight (`fallers.test.ts`); the lever's knob moves with the finger from where it was taken, falls the rest of the way with one clunk when let go a quarter of the way along or more, and springs back when let go sooner; the tray's handle swings for a second when it is rattled; the watchers squash and stretch in their acts, no two acts moving the same parts (`motion.test.ts`).
- **Kid-clear silhouettes and tappables:** what is taken hold of is amber and unlike any peg; each target is 48 pixels or more each way at 1180 by 820, at 1024 by 768 and on a landscape surface down to 615 high, the moth's among them, and apart from the others, from the home control and from the grown-up's corner (`layout.test.ts`). In stage units a hole and the moth are 64 across, a mirror key 68, the lever's knob 76, the tray's handle 80 and a well 120. Held upright, which no child sees, a hole is 44 pixels.
- **Wordless clarity for the band, 4 to 8:** no word, letter, numeral or sign; `node scripts/wordless-check.ts` passes; the lookalikes that stay are listed under "Reader".
- **Wordless idle guidance:** a glow on the next holes, then a ghost hand that drags along them; in turn, a glow on the lever and a hand that pulls it; and when nobody has touched the game for as long as the ladder's last rung takes, with the lever up or the tune playing, the tray's handle rattles once by itself, seen as well as heard (`guide.test.ts`, `guidance.test.ts`, `toy.test.ts`, `show.test.ts`). A scene or a running beam holds the ladder back; a character's own act does not (`parked.test.ts`).
- **Frame rate:** not measured on any device. Counted with a stand-in context: 68 draws at the busiest of three surface sizes and four tiers, one full-surface pass, a resting frame 34 or less (`frameBudget.test.ts`). Pixel ratio capped at 2, four tiers, no shadow, no blur, no post pass beyond the phosphor fade.
- **Procedural assets only:** every line is drawn in code and every sound is synthesized.
- **No engagement mechanics:** nothing counts, nothing is timed, nothing is kept from the child or held out to it; see "For the owner".
- **Found as left:** put away at any instant, the game opens as the same board with nothing replayed; a clatter put away in the middle opens as the dark board it ends in (`parked.test.ts`).

### What was measured, and on what

- Draw counts by `frameBudget.test.ts` in a stand-in context, not in a browser.
- Stills and the cold playtest proxy in a headless browser on the dev server of a machine with no graphics processor, at pixel ratio 1 (the three close stills at 2).
- Nothing on a tablet, nothing in WebKit, nothing on a production build.

### The learning claim

The game has no learning goal and claims no school skill.

### Defaults taken for the owner

- A first visit is never a bare board: three pegs in a rising step, or one of each colour from the age of 6. A child of no known age gets the youngest's.
- A push onto a peg of the same colour pulls it, so a second tap undoes the first.
- Red is in hand and no mirror is down on a first visit.
- The lever reads only the travel along its slot. A tap (less than 30 units of it) moves the lever to its other end when the finger lifts; a knob pulled a quarter of the slot or more from the end it was at goes to the other end on the lift; a shorter pull springs back with a creak. (The lead's rulings.)
- The trapped beam's show is given once for each pull of the lever.
- At the clatter's first beat the lever lifts by itself with its clunk, so no bar sweeps the emptying board. (The lead's ruling.)
- After a touch and 87 seconds with no touch, while pegs stand on the board, the tray's handle rattles once by itself, with the lever up or down; an opening or a put-away earns no rattle. (The lead's ruling.)
- A beam that leaves the board is away for one beat before it comes in again, so no column sounds on two beats running. (The lead's ruling.)
- A half beam is drawn as a soft dim band along the row of the yellow peg that split it, behind any peg it comes to and no taller than a cap; of several yellow pegs in a column, the one nearest the middle row gives the row. It still sounds every peg of its column. (The lead's ruling; the choice among several, and the band's sizes, are the builder's.)
- While a white peg holds one beam, every beam and half beam stands still for that beat, so that no column sounds on two beats running by any beam. (The lead's ruling asked for the rule to hold; this way of keeping it is the builder's.)
- The tray handle's target is its ball where it hangs and ends 96 units above the stage's lower edge, so the pull can always be finished on the surface; the slot below is bare backdrop. (The lead's ruling; of its two ways, the builder took this one.)
- The handle's rattle is seen for a second, tapped or by itself. (The lead's ruling.)
- Green turns the beam back every other time it comes, so no peg leaves part of the board unplayed for good, and a trapped beam is let out twenty beats after it was trapped. (The lead's ruling.)
- A green peg pushed in while a beam or a half beam is passing green pegs is obeyed from that moment, so the move that traps a beam works on either time across. (The builder's, accepted by the lead.)
- A stroke that starts on a peg of the colour in hand pulls that colour only. (The lead's ruling.)

### What the next builder should know

- A canvas look with a trail needs two layers: what stands still painted once underneath, what moves on a layer that is faded and never wiped. A sprite with a soft edge stamped every frame on the faded layer thickens, so rub out under it first.
- Give every sound its own cue on the model's clock and let a test hold each cue to something seen in that frame. It found a moth that landed, with its sound, on a perch it had already given up.
- Caps on what is in the air, and one fill a colour for what flashes, are what keep a scribble and a clatter inside the draw budget.
- A scene's sounds go through an outlet of their own, so a touch can shut the scene and still be heard itself.

<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: Paper dolls with tabs, the first look reserved for the game, kept by the owner at the toy checkpoint. The second reserved look was not tried.
- Sheet: round 1 returned six findings. Their nine replacements are pasted word for word above "The look" in `ART.md`, and nothing else above it was changed. The commit the round judged is the lead's to record: the builder runs no git. Round 2: the pairs the build proposed after its own reading pasted by the lead, each found exactly once above `## The look`. Round 3: pairs 8 to 11 (reading 1) pasted by the lead, each found exactly once above `## The look`.
- Reading 1 by a fresh reader: one thing a child would notice, twelve slight, one new lookalike. All are closed in pass 5, each with a named test; "Reading 1, and where each point is closed" below is the list. The lead takes the game after this pass without another reading, so the builder's own reading of the sheet against the code, sentence by sentence, is the last one; what it found is under "The builder's last reading".
- Sentences: pairs 1 to 11 are pasted (rounds 2 and 3 above). None waits.
- Open: no one has listened to the sounds. They are plain numbers written from the sheet's words (`voices.ts`, `sceneVoices.ts`, `outing.ts`); tests hold every pitch, peak and length in range, every cell's sound inside its cell, and every hush within a few milliseconds.
- Open: no frame rate is measured. The builder's machine is shared, so only the draw count is reported. The fullest frame `view.test.ts` can build is 74: all seven garments worn at once with every tab turning and every face pulled. The hall is 50 to 64 otherwise (64 with the glow and the paper hand), the garden by itself is 31 to 42 with a figure dressed on every part, and the fullest moment of the fullest outing is 65, while the sheet turns over a hall with the glow on. The bar is 80. For this canvas game the count is the sprite stamps plus the live fills and strokes of one frame.
- Open: `perf:jam`, `serve:lan`, `npm run build` and the built check of the education pack were not run: a builder in a wave runs none of them. The built-asset egress scan was run on one `vite build` of the jam alone, made after the last change of pass 5.
- Stills: the builder's stills, kept outside the repository. Sets `d-` to `g-` and `cold-` at 1180 by 820, and in pass 5 six outings shot every third of a second. To take one again, open `?chrome=0&seed=1#/play/dress-for-weather` at that size; `seed=1` pins where each character is in its idle round. The shell takes the child's age from its own saved preference, not from the address, so the still of a first visit at age 3 was taken by setting that preference before the page loaded.
- Requests to the lead: the registry row at the end of `ART.md`; the README row under "For the pull request". None in a frozen file. Two gaps are marked **for the template** below.

**What the lead should try first.** On a first visit, tap the orange hat: it flies onto the child, and the dog drops its lead and scratches the door, which opens a hand's width and shuts. Tap the door: the child skips out of it, the sheet turns over to the garden in the rain, the hat droops, the socks go dark from the toes, the child laughs, and it comes home with drops on the hat that hop when it hops. Tap the door again: it opens again. Touch the wall: the grandfather lifts his arm and raps the pane, and the cockerel spins once. Tap the cockerel for snow, then wind, then sun, and watch it face a new way each time. Put the mittens and the scarf on the child and send it out in the snow: the scarf's tip knocks the tall post and the snowball lands on the dog. Touch the child in the garden: it is poked, and the hall is back. Tap the baby, give it the umbrella, tap the umbrella open, turn the vane to wind and open the door. Lift a garment and let go over nothing: it hangs in the air for a moment, can be caught again, and otherwise sails home. Hang everything up and watch the one in the middle sit down. Then leave it alone for six seconds in each of those states.

**What is still weak.**

- The door ajar shows a pale strip and little of the weather.
- The figure walks to the doorway and is next seen in the garden when the sheet is right over; the garden has neither it nor the dog while the sheet is turning, either way.
- "Sits down" is a squash onto the stand, and the two who wait lean their heads a little; neither is a new drawing.
- The two who wait face out of the sheet and look at the window with their eyes. Noses to the glass would need a back view of each figure.
- The wind lifts only the baby clear over the hedge.
- The grandfather with wet feet rocks from the crease and hops; a foot lifted high like a heron's would need his legs cut as separate pieces.
- The chase after the hat is a run of about a hundred units to the left and back, and the tow of the open coat about as far; a longer run would take the figure under the home control of a phone.
- The raincoat's hood is seen only in its own cell, standing up round the face; at rest the coat has a collar and no hood.
- With the raincoat open in the rain the drops are seen at the hem; nothing is drawn running in at the front.
- The brow is mopped and the mittens are wrung by the garment's own motion; no arm is lifted for either.
- The baby's arms unfold to three times their length to reach its head.
- A mitten or umbrella in the hand that raps the glass stays at the side while the arm rises.
- On a surface the shape of a phone on its side, a hat on the grandfather in the middle is slid down over his whole face to stay clear of the home control.
- The scarf round the baby's neck covers its dummy.
- No sound has been heard by anyone.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The parts below belong to the block.

### Template notes

- `manifest.ts`: the icon family is `play`, since the game has no learning goal. Otherwise as copied.
- `config.ts`: `LADDER` is the one place `hall` and `FIRST_VISIT` is one row, so `OLDEST` is no longer read; `BACKDROP` is the mat's green, which shows past the stage on a surface of another shape. The tiers are as copied: a tier sets the pixel ratio only.
- `state.ts`: as copied. `save.ts` wraps it, as its header describes.
- `state.test.ts`: changed in one way. The game's own ladder has one place, so the rows that named its second step name the only one (`ONLY`).
- `dress-for-weather.tsx`: the Mount draws through `view.ts`, hands every gesture to `touching.ts` and plays what the hall queued through `sounding.ts`, once in the handler and once after the step. It tells the hall where the home control lies on this surface at every resize. On rest it takes the idle ladder back, closes every sound and calls `putAway`, which makes a parked hall equal to a loaded one.
- `touching.ts` (new, pure, tested): what a finger does between the template's gesture tracker and the hall. A touch that begins in the grown-up's corner answers nothing until it lifts and leaves the idle ladder alone; a garment whose finger lifts over nothing waits in the air for the tracker's grace and is given back to a finger that returns, or sails home.
- `sounding.ts` (new, tested): a gain for each group of voices on the way to the template's `GameAudio`, so that a hush closes one group, or all, in eight milliseconds.
- `audio.ts`, `input.ts`, `guidance.ts`, `overlay.ts`, `rng.ts`, `stage.ts`, `index.ts` and their tests: as copied. The seed sets only where each character starts in its idle round, since the game has no chance in it.
- `scene.ts`: as copied, and the game's four scenes run on it (`hall.ts`: the outing, the ending, the two showings; an outing that ends bare is followed by the ending as one scene). The toy's answers are shorter than a scene and several run at once, so they stay lists of timed beats in `answers.ts`.
- Other new modules, all pure: `outing.ts` (the 40 weather cells, the fixed tastes, the steps of an outing), `weathering.ts` (what each cell does to a garment, a stance and a pair of hands, as numbers), `walks.ts` (the changes of place, the walk out of the door and the dog's turn of the hall, in lanes), `sceneVoices.ts` (the sounds of the hall and its scenes). `gardenView.ts` draws the back of the sheet.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: as copied, never edited.
- **For the template:** `scene.ts` gives a beat a `play` function and nothing for sound, so a game that wants sight and sound on one clock writes its own cue (`cue` in `hall.ts` sets the pose and queues the notes in one call). A beat that carries its notes beside its cues would let every game keep that rule without inventing it.
- **For the template:** `audio.ts` can start a voice and cannot stop one, so a game whose touch must silence a scene from that frame builds its own gains in front of it (`sounding.ts`). A `hush` on `GameAudio` would do it for every game.
- **For the template:** the status block is asked to say where the stills are, and a file may not hold a path outside the repository. This block says how to take them again and leaves the path to the report; the guide could say that is what is wanted.

### For the owner to decide

- The hat comes down over the grandfather's glasses and the dog's head comes through whatever is on its back: both kept as the joke. On the baby the hat sits higher, so its eyes show.
- A first visit at age 3 or younger, or with no age, opens with the raincoat already on and its zip open; from 4 everything is on the rack. The age is read once and locks nothing.
- Whether the two who wait should be redrawn from behind, noses to the glass, or may stay facing out with their eyes on the window.
- Whether the garden may keep its cat in the apple tree and its bird box: both were added in pass 5 to fill the middle and the right of the frame once the figure moved right.

### Where the game and the sheet differ

Four sentences, each with a replacement proposed to the lead as pairs 8 to 11; the lead pasted them (round 3), so the sheet now says what the game does.

8. A touch while the garden shows does not become an ordinary touch on the hall: what is drawn under it in the garden answers, the hall comes back, and nothing else happens.
9. The showing of the vane starts when the first touch after an outing is over, and only if that touch started no scene and no change of places; a tap on the door opens the door.
10. A thing a child must touch is 100 units across or more, and 48 px high or more on every tablet surface; "about 100 across" did not say how high.
11. The figure walks out by the door before the sheet turns over.

### Reading 1, and where each point is closed

Each row names the test that fails without the fix.

| Point | What changed | Test |
| --- | --- | --- |
| 1, a child would notice | A touch while the garden shows is the garden's: the figure or the dog is poked, anywhere else the weather answers at the finger, the hall comes back and nothing of the hidden hall is touched. Pair 8. | `scenes.test.ts`: "takes a touch while the garden shows for the garden…", "takes a touch on the figure or the dog in the garden as a poke of that one…" |
| 2 | No press does two things. The showing of the vane starts when the touch is over, and not after a touch that started a scene or a change of places. Pair 9. | `scenes.test.ts`: "never eats the door's tap…", "starts when the first touch after an outing has ended is over…" |
| 3 | Drops and snow are drawn in the garment's own place: they move with the wearer and stay on a garment in the hand. | `view.test.ts`: "draws the drops and the snow an outing left in the garment's own place…" |
| 4 | Every cell is seen as well as heard: the snowball is lobbed to the dog, the splash reaches it, the scarf's tip meets the gate's post in the frame of the ting, the hood stands up while it rattles, hands fan, scratch, pat, pull and cover, toes curl. | `garden.test.ts`: "lobs the snowball from the mittens to the dog…", "sends the splash of a jump as far as the dog…", "knocks the gate's post with its tip in the frame the ting is heard…", "puts the raincoat's hood up…", "curls the toes of the socks…", and the five tests of "the hands" |
| 5 | The boots are tugged wherever they are worn, and loose or tugged they come off under a dragging finger. | `hall.test.ts`: "tugs the boots on in three taps and then stamps, wherever they are worn", "takes the boots off under a finger that drags them…"; `outing.test.ts` holds that boots tugged on anywhere count as done up |
| 6 | A garment whose finger lifts over nothing waits in the air where it is, is given back to a finger that returns within the grace, and otherwise sails home seen and heard. | `touching.test.ts`: the five tests of "a drag and a lifted finger" |
| 7 | Every shape a finger lands on is 48 px or more each way on every tablet surface and a hundred units across, and the shapes listed are the shapes tried. Pair 10. | `layout.test.ts`: "gives every shape a finger lands on 48 px or more…", "makes the shapes it lists the shapes a finger is tried against", "gives each button a box of its own…" |
| 8 | The cockerel has a heading for each weather, is turned to the saved one and is found there on a load. | `scenes.test.ts`: "has a heading of the cockerel for each weather…"; `layout.test.ts`: "gives the cockerel four headings that are four different sights of it" |
| 9 | Rapping the glass is a rap: the arm is lifted and the knuckles are on the pane in the frame each rap is heard. | `scenes.test.ts`: "raps the glass with its knuckles on the pane…"; `layout.test.ts`: "puts the knuckles of whoever raps on the clear glass above the rail…" |
| 10 | The idle ladder is taken back at put-away. | `touching.test.ts`: "takes the idle ladder back to the bottom, so the parked hall is the loaded hall with the hand still to come" |
| 11 | A touch that ends a scene or lifts a garment silences it from that frame, by a gain for each group closed in eight milliseconds; put-away closes all. The shake-off of what the dog lost waits until the hall is back to be seen. | `sounding.test.ts`: all five; `scenes.test.ts`: "ends at a touch in the hall, unheard from that frame…", "does not finish the sound it had begun when it is lifted mid-answer", "shakes dry on its peg what the dog lost to the wind only when the hall is back to be seen", "shakes the dog after rain and wrings wet socks on the mat, each seen and heard together" |
| 12 | In the garden the figure stands right of the middle and nothing of it, or of what it wears, lies under the home control at five surface sizes, a phone included; the cut-line keeps clear of the surface's own control. | `garden.test.ts`: the four tests of "the home control in the garden"; `hall.test.ts`: "has neither the cut-line nor the hat on the grandfather's head under it…" |
| 13 | This file is current and names no folder outside the repository. | Read by hand |
| Lookalike | The pompom is a tuft of three curls; with it the window, the clock's hands, the cockerel's perch, the toggles and the steam were redrawn ("Reader" below). | Read by hand, on the stills |
| Asked for | The grown-up's corner answers nothing and leaves the idle ladder alone. | `touching.test.ts`: the three tests of "the grown-up's corner" |
| Asked for | The figure is seen leaving by the door. Pair 11. | `scenes.test.ts`: "walks the figure out by the door before the sheet turns…"; `walks.test.ts`: the tests of "walks out of the door" |

### The builder's last reading

The sheet above "The look", sentence by sentence, against the code and the stills of pass 5.

- Found and fixed: the baby under the open umbrella in the wind was lifted in silence with a startled face, where the sheet has it squeal all the way over the hedge (`outing.test.ts`: "has the baby squeal all the way over the hedge…").
- Found and fixed: the child in the sun in wool blushed at the cheeks only, where the sheet has it red to the ears with puffed cheeks (`figureArt.test.ts`).
- Found and fixed: a figure lying in the umbrella's shade lay with its hat across the gate's post; the gate is on the near side of the lawn and is now drawn after the figure (`view.test.ts`: "stamps the gate after the figure in the garden…"; `garden.test.ts` keeps the lying figure short of the post).
- Found, and proposed as pairs 8 to 11, since pasted: the four sentences above.
- Found and listed as weak, not changed: the heron, the length of the chase and the tow, the rain running in at the front of an open coat, the brow mopped and the mittens wrung with no arm lifted.
- Read and found to match: the band's rules and what the age sets; the toy's eight answers; the first two columns of the grid (`answers.ts`); the 28 garment cells, the eight second answers and the four socks' cells (`outing.ts`, `weathering.ts`); the wrong uses; the saved fields and when each is written; the three tastes and the dog; the lengths of the four scenes (an outing 3.4 to 8.2 seconds from the tap to the sheet turned back, the ending 3.9, the showings about 4); how a cycle ends and begins; and the three clearances at five surface sizes.

### Built beyond the sheet, and considered and not built

- Built, because the sheet's own rule needs it ("nothing a finger can do is refused"): the two shut-umbrella cells, now in the sheet.
- Built, from the stills: the baby's head is drawn over whatever is on its body or feet, and is touched there (the sheet's "tent with a face in the collar"); the hat sits higher on the baby; the open umbrella is held upright.
- Built, for the lookalikes: a blank letter in the door's flap.
- Built in pass 5, on the coordinator's rulings: the walk out of the door; arms and hands as pieces of their own in the garden and for the rap; the tall post with the bird box, so that a scarf worn anywhere can knock the gate; a gain for each group of voices.
- Built in pass 5, to keep the garden full once the figure moved right: an apple tree with a cat in it, and the snail moved to the bird box's roof.
- Not built: legs as separate pieces for the grandfather's heron step. The rock from the crease stands for it.
- Not built: a hood on the raincoat at rest. The sheet names the hood only in the wind.
- Not built: the figure and the dog drawn in the garden while the sheet turns. The turning sheet is one clip, and a figure cut by its edge was worse than a figure that arrives with it.
- Not built: a back view of the three figures for the window. It is new art for three bodies.
- Not built: wet socks in the save. The sheet says they are wrung out on the mat and dry on load.
- Not built: a second layout for a phone-shaped surface. The stage is fitted whole, and the tests hold the targets at five surface sizes.
- Not built: any count, tally or record of outfits tried or weathers seen.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | Eight stills at 1180 by 820 (`a-`): at rest, a boot in the hand over the head, the boots landed, a poke, garments on the dog, the grandfather and the baby, all at rest, and idle with the glow and the ghost hand. Retaken after the fixes (`b-`, `c-`), with the raincoat on and the zip half way. | "Where is grandpa? He is the same colour as the wall." "The doggy has no face, the scarf is on it." "Those are pink pants." "I did not see the hand." | Everyone can be seen. The wall went from cream to a cool lilac-blue and the door darker, so the pale figures stand out. The dog's head comes through whatever is on its back, and each garment has its own way of lying there (the scarf stands up like a second tail). The mittens hang apart on their string. The ghost hand is larger. Nothing reverted. | Not measured: shared machine. Draw count 46 to 51 a frame (stamps plus live fills and strokes). | The ghost hand is pale over the white vest. The raincoat's open front on the rack can read as a tie. The hat hides the grandfather's eyes. The child's left hand and the baby's head are 48 units apart as targets. The rain is scenery until the weather is built. No one has heard a sound. |
| 2 | The game, ten sets of stills (`d-`): first visits at 4 and at 3, the showing of the door, a whole outing in the rain, the baby out in the wind, the grandfather in the snow, wrong uses in the sun, the ending and a change of places, the showing of the vane with the four windows, the dog's strut. Retaken after the fixes under the same names. | "The doggy is sitting on the boy." "That is another window, not a gate." "The hat is crying." "Grandpa has no face, the hat ate it." "Where did the baby go?" | Everyone can be found. The dog sits further left in the garden, clear of a figure lying in the shade. The gate is pickets. Drops left by rain are printed on the garment above its hem and no longer hang below it. The vane moved right in the window, so a hat on the grandfather in the middle is not slid down his face by the vane's own clearing. The baby's head is drawn over what is on its body or feet and is touched there. From the coordinator's rulings in the same pass: the ghost hand has a dark outline, the raincoat on the rack is drawn closed, and the child's left hand and the baby's head are at least 48 apart whoever is in the middle. Nothing reverted. | Not measured. Draw count 49 to 57 in the hall, 25 to 31 in the garden, 55 while the sheet turns. | The hat covers the baby's eyes. The open umbrella lies across the face of whoever holds it. The door ajar shows little weather. |
| 3 | The baby in the middle in hat, raincoat and open umbrella, the first visit at 3, the showing of the door, the dressed child idle with the hint at the door, wrong uses in the sun (`e-`). | "The baby cannot see, the hat is on its eyes." "The umbrella is in his face." | Faces stay clear. The hat sits higher on the baby, above its eyes and still on its head (`layout.test.ts`). An open umbrella is held upright in the hand, beside the face. A new test keeps worn paper off the rack board for every garment on every part, whoever is in the middle. Nothing reverted. | Not measured. Draw count 51 to 59. | The scarf covers the baby's dummy. The scarf on the dog stands in front of the lower door. |
| 4 | The cold playtest proxy below: 22 stills of one production build from a fresh state (`cold-`), then the fixes on the dev server (`f-`, `g-`). | "There is a grey box on his feet." "What is that line on the door?" "The round window has a plus in it." | Nothing looks like a mistake or a sign. Soaking socks are two dark toes that climb, not a box across both feet. The door's pane is an arch of plain glass, the flap has a letter in it, and the glint is a filled paper star. Nothing reverted. | Not measured. Draw count 49 to 63 in the hall (63 is idle, with the glow on all seven garments and the hand), 19 to 31 in the garden, 56 while the sheet turns. | As listed in the status block. |
| 5 | Reading 1 by a fresh reader, then six outings shot every third of a second at 1180 by 820 (the child in wool in the snow, the grandfather in the rain, the baby in the wind with hat, zipped coat and open umbrella, the grandfather in the sun, the baby bare in the wind, the child in hat and mittens in the sun), the showing of the vane, a touch in the garden, a wet hat carried and let go, and the first visit idle. | "I touched the shed and it started again." "The snowball never went anywhere." "Grandpa did not knock, he just leaned." "The drops stayed in the air when he nodded." "The star on the hat is a snowflake." "Grandpa is lying in the fence." | What is heard is seen, and a touch does one thing. The thirteen points of the reading and its lookalike, as listed above. The garden was laid out again so that nothing lies under the home control: the figure right of the middle, the dog at the left, a tall post with a bird box and the gate at the right edge on the near side, an apple tree with a cat in the middle. From the builder's last reading: the baby squeals over the hedge, the hot child is red to the ears, the gate is in front of whoever lies down. Reverted in the same pass: two bands of printed shade (on the post and on the tree) that spilled past their piece; both are now short strokes kept on the piece. | Not measured. Draw count 50 to 64 in the hall, 31 to 42 in the garden, up to 65 while the sheet turns; the fullest frame a test can build is 74. | As listed in the status block. |

**The still at rest, by the full-frame rule.** Empty: about a seventh of the frame is wall or floor with nothing on it, most of it the strip of patterned wall between the child and the rack; the rack board empties as garments are worn, which is its job. Funny: a very tall grandfather in striped long underwear with a fold across his middle, who nods off from the fold and jerks awake; a round baby with a dummy, rocking; a dog holding its own lead; a mouse watching from the skirting; a portrait of the dog in a crown; a letter stuck in the door; and from the first drop, a boot on a head. Alive: all four characters breathe, blink and glance at the door or the window, each at its own tempo; the baby rocks, the child hops, the dog's tail wags in bursts; the weather falls in the window, the weather cock swings and the pendulum swings. The garden is full the same way: shed, hedge, the grandfather's spare underwear on the line, a cat watching from the apple tree, a bird in its box on the tall post with a snail on the roof, the gate, the dog watching.

## Cold playtest proxy

One production build, one preview, a fresh state with no age set (the shell's default age opened on a full rack), 1180 by 820. Run in pass 4; pass 5 was looked at on the dev server and the proxy was not run again.

- **On load:** the hall, everyone alive, nothing playing and no sound queued.
- **Ten seconds hands off:** at six seconds all seven garments glow and the paper hand carries the raincoat from its peg to the child. At ten the hand is between two showings and the glow is still on.
- **Sixty seconds as a newcomer:** a tap on the child (a poke and a face), a tap on the hat (it flies on, the dog shows the door), a wait (the hand taps the lever), a tap on the door (the garden in the rain, three beats, home with drops on the hat), a touch on the wall (the vane is shown), a tap on the vane (snow in the window), a tap on the baby (it takes the middle), the scarf dragged onto the baby, the door again (the baby in the snow).
- **Unclear moments found:** a grey box across both feet while the socks soaked (fixed in pass 4); the hat over the baby's eyes and the umbrella across a face (seen in the same states before the build and fixed in pass 3); the figure was not seen leaving (fixed in pass 5: it walks out by the door); the door ajar shows little weather (kept, listed as weak).
- **Not unclear:** what to touch first, that the door is the next thing once something is on, that the cockerel changes the window, and that one who waits can be asked to the middle. Each was reached by tapping what glowed or what the hand showed.

This proxy is the builder looking at its own stills. It is not a child.

## Reader

Reading 1 was made by a fresh reader who ran nothing; its points and where each is closed are in the status block. What follows is the review of shapes a reader could take for a letter, a numeral or a sign: the reader's and the builder's own.

Redrawn: the door's round pane with crossed bars (now an arch of plain glass with one filled glint); the letter flap, a lone level bar (now with a blank letter in it); the glint on frozen or itchy wool, four crossed lines (now a filled four-pointed paper star); the soaking of the socks, a level bar across both feet (now two toes). In pass 5: the hat's pompom, six spokes (now a tuft of three curls); the window's bars, a plain cross (now a sash with one rail, a short curtain with a scalloped hem over part of the lower light, a pot plant and a deep sill on brackets); the clock's hands, a corner (now two filled leaves on a brass boss, at no right angle); the cockerel's perch, a bar across its pole (now a ball); the toggles' centre dash (gone); the wisps of steam, three curved lines (now round puffs).

Kept, weaker, each with what makes it a thing and not a sign:

- The sash has one level rail from side to side of the frame, half hidden by the curtain. It meets no upright.
- The clock's face is a ring with twelve ticks and two leaf hands, under a roof with a pendulum. No figure is on it.
- The paper star of the glint is a filled four-pointed shape that swells and shrinks on frozen or itchy wool and where the scarf knocks the post.
- The dummy is a ring in the baby's mouth; the grandfather's glasses are two rings on his nose; the rug is ovals under the feet; the hole of the bird box is a disc with a beak in it.
- The sun is a disc with a ring of rays that turns, in the sky.
- The rack's rails are level bars, each with a peg and a garment hanging from it. The tall post with the bird box on its top is a post: the box is wider than the post and has a roof, a hole and a snail.
- Even rows: the stripes on the socks and the long underwear, the ribbing of the hat, the zip's teeth, the three toggles, the pickets of the gate on their two rails, the boards of the shed, the scallops of the curtain, the mat's printed grid. Each is the pattern of the thing it is on, and the grid's lines run the whole mat.
- Pointed shapes: the pickets, the shed's roof, the lumps of the hedge, the cat's ears, the two toe-end flags in the wind, the cone of snow on the bobble. None points at anything a child could act on.
- Round shapes: the apples in the tree, the snowball, the puffs of steam, the ball on the shed's pole and under the cockerel. Each is a thing in its place.
- Short strokes: slanting rain, curled gusts, the printed shade on the post and the tree, the leaves on the wall, the dashed fold across the grandfather, the dotted cut-line. They fall, blow or are printed on the thing, and the cut-line is the garment's own outline.
- Drops on a wet garment and lumps of snow on a snowy one are filled shapes on the garment.
- The paper hand of the idle ladder is the one pictorial cue, and shows a move by making it.

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### README row

| Dress for the Weather | `games/dress-for-weather/` | 3–6 | A hall of paper dolls on a cutting mat: tab seven paper garments onto a child, a very tall grandfather, a baby or the dog, work the zip, the toggles and the boots, turn the weather cock and open the door to see what rain, snow, wind or sun does to exactly that outfit. No learning goal. |

### How the game meets the quality bar

- **Alive at idle.** Four characters with their own idle rounds; the weather in the window, the weather cock and the pendulum (`motion.test.ts`, `hall.test.ts`).
- **Motion and sound on every touch.** Every press is answered in the call that lands it: a garment, a fastening, a character, the vane, the door, bare paper, and in the garden the figure, the dog or the weather (`hall.test.ts`, `scenes.test.ts`). Sight and sound share one clock: a test steps an outing frame by frame and finds every sound in the frame its cell has reached it, and what a cell throws arrives when it is heard (`garden.test.ts`).
- **Weight, squash and follow-through.** Each character has its own springs; each of the 40 weather cells has its own motion and its own sound, and each figure plays it in its own manner (`outing.test.ts`).
- **Kid-clear silhouettes and tappables.** Seven garments in the only strong colours on a plain board; every shape a finger lands on is a hundred units across and 48 px or more each way on every tablet surface, and no two aims are nearer than 48 whoever is in the middle (`layout.test.ts`).
- **Wordless for the band.** Nothing is written; the weather is the weather itself; the wordless check passes; the lookalikes are listed above.
- **Wordless idle guidance.** The glow, then the paper hand showing one move, in every state of the hall (`hall.test.ts`); taken back at put-away (`touching.test.ts`).
- **Nothing under the shell's controls.** No garment, figure, aim, vane, handle or cut-line lies under the home control at five surface sizes, in the hall or in the garden; the grown-up's corner answers nothing (`layout.test.ts`, `walks.test.ts`, `garden.test.ts`, `hall.test.ts`, `touching.test.ts`).
- **Nothing passes through anything.** Model tests: figures walk in lanes and never share one with another figure or the dog, on a change of places and on the way out of the door; no walk crosses the vane, the handle or the rack; worn paper stays off the rack board; a figure lying down stays on the sheet, off the dog and short of the gate's post, which is drawn in front; the draw order and the touch order are one list read both ways.
- **Found as left.** 40 states, each put away and returned, equal the same state saved and loaded, with nothing replayed and no sound (`found.test.ts`); a pointer cancel never acts, and a touch that ends a scene is silent from its frame (`sounding.test.ts`).
- **No engagement mechanics.** No score, count, timer, streak or praise; an outing can be had as often as the door is opened and nothing is kept of it but the drops on a garment.
- **Frame rate.** Not measured: the builder's machine is shared. One canvas, no post pass, pixel ratio capped by the tier. The fullest frame a test can build draws 74 times, against a bar of 80; the fullest moment of the fullest outing in every weather for each figure draws 65 (`view.test.ts`).
- **Assets.** All procedural; no file is loaded.

### What was run

- `npx tsc --noEmit`: exit 0, no output.
- `npx vitest run games/dress-for-weather test/games.test.ts`: `Test Files  28 passed (28)`, `Tests  956 passed (956)`.
- `node scripts/wordless-check.ts`: `wordless check passed`.
- `node scripts/egress-check.ts`: `egress check passed`.
- `node scripts/egress-check.ts --built`, on one `vite build` of the jam without the lab, made after the last change of pass 5: `egress check passed`.
- Not run, because a builder in a wave runs none of them: `npm run check`, `npm test`, `npm run build`, `serve:lan`, `perf:jam`, and the education pack's built check.

### The learning claim

The game has no learning goal and makes no claim.

### Defaults taken for the owner

A first visit at age 3 or younger, or with no age, opens with the raincoat on and unzipped; from 4 the rack is full. The child is the first in the middle and the vane starts at rain. The other defaults are under "For the owner to decide".

### What the next builder should know

A pure hall that queues its notes and a Mount that plays the queue once in the handler and once after the step keeps the first sound of a touch inside the touch. A pen that draws nothing, handed to the sprite maker and to the view, counts a frame's draws in a test with no browser; one that also keeps the transform says where a thing was drawn. Saving a scene's whole outcome when it starts, and keeping a snapshot of what was on screen before it, lets the scene play from the snapshot while a put-away at any frame finds the outcome. A keep-clear list handed to the pose function (home control, vane, handle) moves worn paper off the targets at every surface size without a second layout. A hatch that is not clipped spills past a narrow piece: draw shade as strokes that stay on it. When a second place is drawn over the first, a touch belongs to the place that is seen.

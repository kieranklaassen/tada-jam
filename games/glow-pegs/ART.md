<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Glow Pegs is a peg board of light inside an old arcade cabinet at night. The child pushes pegs of five colours into a black board, where each clicks in and blooms, and then plays the picture like an instrument with a lever. It has no learning goal.

## The band and its age rule

The manifest band is 4 to 8, so a four-year-old governs the design.

- **The cue row for the youngest age** is the 3 to 4 row of the cue table in `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`. What works there: direct handling of objects, cause and effect from the world's answer, a breathing glow on what can be touched, a ghost hand that shows one move. Its "Avoid" column is a hard limit and is met like this:
  - No text, numeral or icon that must be decoded. The three mirror buttons are keys that each show what the next push gives. Every key shows one solid peg, and only one, in the same place on all three, up and left of the key's middle, and drawn as a peg on the board is: a cap with its light. Its echoes are hollow outlines, each at most 0.55 of the peg's radius and drawn with one thin line and no glow, so that the hole in each is seen at pixel ratio 1: none on the first key, one across a mirror line on the second, three across two crossed mirror lines on the third. A mirror line runs into the rim of its key at both ends and is the largest mark on it, so two crossed lines make four panes and no free cross. A pressed key lights whole and at once, with one sound, and the three keys' sounds differ in kind (a wooden knock, a glass chime, a rush of air), never in a rising count. The next push shows what the key gives at once.
  - No spoken instruction and no verdict. Nothing rates a picture or a tune.
  - One activity is live: light on the board. The wells, the buttons, the lever and the tray handle each change only that, and each answers the first touch on it with something that can be seen at once: a well in the tray, where its pile rattles and its peg stands up, and a key, the lever's knob and the handle on themselves alone. A key lights only itself, and what it gives shows on the board at the next push; what the lever and the handle give shows on the board once the knob or the handle has been moved.
  - No tool is present before it means something: every control does its whole job from the first visit, and none is locked or revealed later.
- **The pack's rule for the age range** is `ages-4-to-6.md` (pack: game-design): a place, props and characters who react, played with tap and drag, no reading, no double tap, and jokes in which someone overreacts and is never hurt. A tap on a lit peg with its own colour in hand pulls it out, so a second tap undoes the first; the ghost hand therefore shows a drag, never two taps, and `TAP_PRESSES` is 1. It shows two drags in turn: a line of pegs along the next empty holes, and the lever's knob pulled down, which it shows only while the lever is up and a peg stands on the board. It never shows the tray handle. When nobody has touched the game for as long as the idle ladder takes to reach the end of its last demonstration, and pegs stand on the board, the tray handle rattles once by itself, with no hand on it, whether the lever is up or the tune is playing. No rattle of the handle is only heard: tapped, or rattling by itself, the handle and its ball swing about 20 stage units to each side for about a second, with a glint on the ball. It does not rattle again until a touch and a whole new stretch have gone by. The stretch is earned by a touch and is not saved: a game that is opened, or put away and opened again, does not rattle until it has been touched.
- **The symbol rule.** The band starts below 6: no word, letter, numeral or sign is drawn on the kid side, and the game has no `symbols.ts`.
- **Touch.** A hole's target is its cell on the board, 64 stage units across, less the one place the moth sits. The moth perches on the nearest corner where cells meet, clear of every hole mark and peg. A touch that lands within 32 units of that corner is a tap on the moth and never a push into a hole, so the moth's target is as wide as a hole's cell (48 px or more each way wherever a hole's is), and where it overlaps a hole the moth wins, and a drag that began on a hole passes under the moth and keeps laying pegs. An overlap test holds that the moth covers no hole mark and no peg at each surface size. A well is 120 wide, a mirror button 68, the lever's knob 76 and the tray handle 80. The handle's target covers its ball where it hangs and ends 96 stage units above the stage's lower edge, so that wherever the handle is grabbed its pull of 76 units can be finished on the surface; the slot below the target is bare backdrop. Nothing that answers as a control lies under the jam's home control at the top centre or in the grown-up's corner at the top right. One finger works at a time.
- **What `ctx.childAge` sets.** Only what lies on the board at a first visit (under "The designed order"). It is a default and never a gate: every colour, button and lever is there at every age. No age takes the youngest default, and a saved board wins over any age.

## The toy

The finger pushes a peg into a hole. That is the action performed most, and the toy is that action with the tray's wells, the three mirror buttons, the moth and the two large watchers. The lever, the beam and the tray handle are not in the toy.

- **On touch-down**, in the same frame, a peg of the colour in hand stands in the hole under the finger. It clicks, sounds the note of its row in its colour's voice (higher rows higher), and blooms in its colour's own way (the grid below): rings of its colour run outward, with short sparks for red, yellow and white, all leaving a phosphor trail. While the finger rests the peg is pressed small; on the lift it springs past its size and settles.
- **A drag** leaves a line: every hole the finger crosses takes a peg, each with its own click and note, so a slow sweep up the board is a rising scale. A drag that starts on bare backdrop, off the board, lays pegs from where it comes onto the board.
- **With a mirror button down** each push is echoed across the middle of the board, two ways or four ways. The echoes arrive one after the other, each with its own click a little higher than the last, so one touch is a small ripple of light and sound.
- **A push onto a peg of another colour** knocks the old peg out, and each colour leaves in its own way (the grid below). **A touch on a peg with its own colour in hand** pulls it out, and it drops back into its well with a clack. A stroke that starts on such a peg pulls pegs of that colour only, mirrored as a push is: pegs of other colours it crosses stay where they are.
- **A tap on a well** takes that colour in hand: the pile rattles, the well's mouth lights, and one peg of that colour stands up out of the pile, inside the well's own target and below the board's bottom row. A finger that goes on from the pile onto the board carries the colour there: the stroke lays pegs from where it comes onto the board.
- **The moth** flies to the peg lit last and settles beside it, never on a hole. The spider on the left and the gecko on the right watch the finger and answer every new peg by its colour (under "The characters"), with two exceptions: a watcher that is being poked at that moment finishes its answer to the poke, and one that is already in the middle of the same answer carries on with it.
- **Why it is a pleasure with no goal.** Every touch makes a light and a note that stay. Random tapping makes a scatter of coloured lights and a pentatonic jingle that cannot sound wrong; a line is a scale; a mirrored drag is a pattern drawn by four hands. Nothing asks for a picture, and a watcher sees within three seconds that the child is making lights.

## The object-by-action grid, and what is new on day 15

Six objects by five actions. The first three columns are the hand's own; the fourth is the lever's show; the fifth is the tidy-up. Each cell names what is seen and then what is heard.

| | Pushed into an empty hole | Knocked out by a peg of another colour (the wrong use) | Pulled out with its own colour in hand | The beam meets it | The tray handle drops it |
| --- | --- | --- | --- | --- | --- |
| **Red peg** | Blooms red; the bezel gives one kick. A click and a short round thump at its row's pitch. | Shot straight out, strikes the bezel's lower edge and drops into its well. A drum bonk, then a low clack when it lands. | Pops out with a quick jump and drops fast in a short arc. Its thump turned downward, then a low clack. | Flashes and kicks the bezel. A drum, a low tom from a low row and a high tom from a high one. | Falls straight and heavy, first of its column. A thud. |
| **Blue peg** | Blooms blue and its rings run out slowly, twice as far. A click and a long soft note that rings on. | Floats out and down in one slow curve, the last to land. A long falling note, then a soft clack. | Its rings close in behind it and it sinks in a short slow arc. A soft hum that fades, then a soft clack. | Flashes and stays lit for four beats. A long note that rings on over the beats that follow. | Drifts down slowly and lands last. A sigh. |
| **Yellow peg** | Blooms yellow as two rings, one inside the other, that close into one. A click and two notes a hair apart. | Breaks into two halves that fly apart and land in its well one after the other. A double pop, then two small clacks. | Its two rings close into one and it drops in a short arc. Its two notes turned downward, then a clack. | Flashes twice and splits the beam: a dim half beam leaves it the other way. Two notes at once, a fifth apart. | Falls as two halves that land apart. Two ticks. |
| **Green peg** | Blooms green and its ring bounces in and out twice. A click and a note that slides up. | Hops three times along the tray's rim and then drops into its well. A boing at each hop, then a clack. | Springs out with one small hop and drops in a short arc. Its note sliding down, then a clack. | Flashes and, every other time across, bounces the beam back the way it came. A springy note that slides up. | Bounces once on the tray's rim on its way down. A boing, then a small clack when it lands. |
| **White peg** | Blooms white after hanging dark for a breath. A click, then a small bell. | Hangs in the air, shining, for half a second and then drops straight into its well. A ting, then a bright clack. | Goes dark for a breath and then drops in a short arc. Its bell turned downward, then a bright clack. | Flashes and holds the beam on its column for one more beat. A bell, and a beat of quiet. | Waits a beat after its column has gone and then falls. A ting. |
| **The moth** | Flies in a wobbling line to the new light and settles beside it. A small pat when it lands. | When the hole it sits beside is the one whose peg is knocked out, it is blown off its perch, tumbles and comes back. A squeak. At a knock anywhere else it flies to the new peg, as at any push. | Its light is gone: it droops, flies home to its bulb in the marquee and bumps it. A tink on the glass. | Leaves its perch and chases the beam's newest flash. A dry flutter at each catch. | Is caught in the fall, spins down like a leaf and climbs back to its bulb. A long flutter, and a tink on the glass when it is back. |

The wrong use of a peg is to push it where a peg already is. It always works: the new peg takes the hole, and the old one leaves in the funniest way its colour has. A tap on the moth, the spider, the gecko or the loudspeaker is answered by that thing as itself (under "The characters"), and a touch anywhere else leaves a spark and plucks the nearest cable.

**On day 15** the child builds tunes and beam machines on purpose that on day 1 only happened: a green peg that sends the beam back, so that a short phrase and the whole tune take turns, a second green pushed in behind the beam to trap it, a yellow that turns a tune into a round, a white that makes a rest, drawn once and made fourfold by a mirror. Five kinds of peg by where they stand by three mirrors, under rules that never change.

## The representation

The game has no learning goal, so no school idea is represented and no order of object, picture and symbol applies.

## The four mechanic questions

The game has no learning goal, so the four questions (swap, attention, fun, guess) have no school skill to be asked about.

## The error as a consequence

Nothing in the game can be done wrongly, and nothing judges a picture or a tune. What a child may count as a mistake shows in the world and stays there to be changed:

- **A peg in the wrong place** stays lit where it is. A touch with its own colour in hand pulls it out, and a push with another colour swaps it. Nothing else on the board moves.
- **A tune or a machine that does not do what was meant** plays exactly as built. The beam shows where and why: it turns at the green peg that stands in its way, it stops for a beat on the white one, a half beam leaves the yellow one. The board stays as it is while the lever is down and after it is lifted, so the child moves one peg and pulls the lever again.
- **A mirror left on** shows at once in the echoes of the next push, and the button that is down is lit.

No buzzer, no cross, no reset and no lost peg: a peg that leaves the board is back in its well.

## The designed order, and what is stored

The game has no learning goal and no order of challenges. It is one open place, and `LADDER` in `config.ts` holds the single id `open`. Nothing is judged, so the position never moves and `finished` is never true.

**What a first visit starts with, by `ctx.childAge`.** The board is never bare on a first visit, so the first pull of the lever plays something.

| Age | On the board | In hand | Mirror |
| --- | --- | --- | --- |
| No age | As for 5 and younger | Red | None |
| 5 and younger | Three pegs in a rising step: red, blue, red | Red | None |
| 6 and older | Five pegs in a rising step, one of each colour: red, blue, yellow, white, green | Red | None |

The younger board plays a plain three-note tune at the first pull of the lever. The older board already splits, holds and bounces the beam. The moth sits beside the last peg of the step. This is a default and never a gate: a saved board wins over any age, and every colour and control is there at every age.

**What play changes.** Only what the child does: the pegs on the board, the colour in hand, the mirror that is down and where the moth sits. Nothing is unlocked, counted or kept beside the board, and no harder round arrives.

**The rules of the beam**, which never change. The board has 11 columns and 7 rows. Pulling the lever down sends a bar of light, as tall as the board and one column wide, in at the left edge. It steps one column a beat to the right.

- In each column it meets, every peg sounds the note of its row in its colour's voice, and then the colours act in this order: white, yellow, green. Pegs of one colour that sound in the same frame, met by the beam or pushed in by one move of the finger, are one sound of at most three notes: the lowest, the highest and one between. A full beam and a half beam that meet pegs of one colour on the same beat are one sound as well, at the full beam's strength.
- **Red** is a drum and **blue** a long note that rings on for four beats. They act by sound alone.
- **White** holds the beam on its column for one more beat, however many white pegs stand there. While a white peg holds a beam or a half beam, every other beam and half beam on the board stands where it is for that beat too, so all of them keep in step and the beat is quiet.
- **Yellow** splits it: a half beam, a soft dim band that lies along the row of the yellow peg that split it (of several in one column, the one nearest the middle row), leaves the column the other way while the beam carries on. The band is no taller than a peg's cap and is drawn behind any peg it comes to, so it shows at the two sides of the cap and never above it, below it or across its face. A half beam plays, at half the strength, and obeys every peg it meets except yellow, which it only sounds. A column whose half beam is still on the board does not split again.
- **Green** bounces it back every other time: the beam turns round on that column and goes back the way it came, and a beam that was turned passes every green peg on its next time across. So on a board that stands still every column that holds a peg sounds within two times across, wherever the green pegs stand, and no peg leaves part of the board unplayed for good. A green peg pushed in while a beam or a half beam is passing green pegs is obeyed from that moment.
- A beam that leaves the board at either edge is off the board for one beat and then comes in again at the left edge, for as long as the lever is down, so that no column sounds on two beats running. A half beam that leaves is gone.
- One gesture on the lever is at most one move and one clunk. The lever reads only the finger's travel along its slot: a slide sideways counts for nothing. A tap, a touch that travels less than 30 stage units along the slot from where it landed, moves the lever to its other end when the finger lifts. A drag moves the knob with the finger from where it was taken, by as much as the finger moves along the slot and from the first unit, whatever part of the plate was pressed: the knob never leaps. On the lift after such a touch, a knob that is a quarter of the slot or more from the end it was at goes to the other end: it falls the rest of the way, with the one clunk. A knob that is nearer than that springs back with its creak, and the lever stays as it was; a knob the finger has carried all the way back has nothing left to do and makes no sound. Nothing is switched on the press itself, which is answered by the knob giving under the finger with a small creak, and a touch that is taken away moves nothing. The lever stays down until it is lifted. While it is down every hole, well and button answers as always, and a beam obeys the board as it stands on each beat.
- Lifting the lever puts every beam out at once. A put-away lifts the lever, and so does the start of the clatter.

**Every field of the saved state** (version 1, plain JSON, read field by field, each repaired by itself):

| Field | Holds | Repaired to |
| --- | --- | --- |
| `v` | The version, 1. A record at another version is not read. | A fresh first visit |
| `position` | The id `open`. | `open` |
| `finished` | Always false: open play has no judged cycle. | false |
| `board` | 77 whole numbers, one a hole, row by row from the top left: 0 for an empty hole, 1 to 5 for red, blue, yellow, green and white. | A list of another length gives the first-visit board; a cell that is not 0 to 5 gives 0 |
| `hand` | The colour in hand, 1 to 5. | 1 |
| `mirror` | 0 for none, 1 for two ways, 2 for four ways. | 0 |
| `moth` | The hole the moth sits beside, 0 to 76, or null when it is at its bulb. | null |

Not saved, because each is a view of the saved board: a peg in the air on its way to a well (its hole is already empty and the wells are bottomless), the lever and every beam, a bloom, what the spider and the gecko are doing, and where the moth flies while a beam runs or a knock blows it off. The field `moth` changes only when a peg is lit, when the moth's own peg is pulled out and when the clatter starts, and the moth is back beside its hole when the lever lifts. On load the board stands as saved, the moth sits where it sat, the lever is up, and nothing eases in or replays. The largest state is 77 cells and four small fields, far under the cap.

## The characters and their fixed tastes

Three live in the cabinet. Each has one want that can always be seen and tastes that never change, and their answers to the exact peg the child lit are the game's feedback. No feeling of theirs is about the child.

**The moth** (small, lilac) wants the newest light. It is always turned to the peg lit last, antennae forward, and settles in the gap beside it, never on a hole. Its tastes on arriving: at red it fans its wings slowly, at blue it folds up and dozes, at yellow it flies a loop first, at green it bumps the peg and bounces off, at white it goes giddy and circles it. Tapped, it tumbles, squeaks and comes back.

**The spider** (large, pink, on a web in the top left) wants to feel the board. It hangs on its thread turned to the board with one foot on a strand that runs to the bezel, and its two big eyes follow the finger. It feels every peg through that strand:
- Red: it loves a drum, and drums four feet on the web.
- Blue: it goes dreamy and swings on its thread with its eyes half shut.
- Yellow: it sees double. Its eyes drift apart and it shakes its head.
- Green: it bounces on its thread.
- White: too bright. It covers its eyes with two feet and peeks.
- Tapped, it drops on its thread like a yo-yo, twangs at the bottom and climbs back.

**The gecko** (large, mint, on the right wall, head up) wants warmth. It holds its belly to the board and stretches its neck toward the warm pegs.
- Red: it basks. Its eyes close, its belly glows and its tail curls up tight.
- Blue: cold light. It shivers and one foot slips.
- Yellow: delight. It licks its own eye.
- Green: its tail wags fast.
- White: fright. Its pupils shrink, it loses its grip, slides down the wall and climbs back. It is startled and never hurt.
- Tapped, it chirps three times with its mouth wide.

**The loudspeaker** in the bottom right is setting, not a character: every sound sends a ring out of its cone, and a tap on it thumps.

When nothing is touched the three are still alive: the moth opens and shuts its wings, the spider plucks a strand or winds itself up and down a little, the gecko blinks one eye at a time and curls its tail, the marquee bulbs breathe and a valve on the wall flickers. None of them beckons, and none refers to the child leaving, staying or coming back.

## The scenes

Two short scenes. Both belong to the game stage; the toy has neither.

**The clatter** is the tidy-up and the only ending the game has.
- Cause: the tray handle dragged down to its stop. A tap on it only rattles it.
- Saved when it starts: `board` as 77 zeros and `moth` as null. The scene changes no other field.
- Beats, about five seconds, filled in from the pegs that stood on the board: the handle clunks, and a lever that was down lifts by itself at that first beat, with its own clunk, so that no bar sweeps the emptying board; the pegs let go column by column from the left, each falling as its colour falls in the grid's last column and landing in its own well with its own knock; the spider rides its thread down to watch and is shaken by the landings; the gecko catches one peg on its nose and flicks it into its well; the moth spins down and climbs back to its bulb; the board is dark.
- Gives way to any touch: the pegs still on the board and in the air are in their wells at once, without their sounds, and the touch is then an ordinary touch.

**The trapped beam** is a secret that one move always produces: a green peg pushed in behind a beam that has another green ahead of it.
- Cause: a full beam turned back by green pegs eight times in a row without leaving the board. It plays once for each pull of the lever, every time the cause is met.
- Saved when it starts: nothing. It changes no field.
- Beats, about six seconds, filled in from where the beam is trapped: the marquee bulbs chase in step with the beam; the spider conducts with two feet; the gecko's eyes roll round after the beam; the moth rides it from end to end along the board's lower edge, where it never passes behind the jam's home control. A hum rises as it starts, and the spider's feet tap on each step the beam takes: on a beat on which a white peg holds a beam both feet wait, down, and nothing taps. The tune goes on underneath as built. Twenty beats after the beam was trapped, a little after the scene, it is let through the green pegs and leaves the board, and it comes in again as any beam does.
- Gives way to any touch: the watchers go back to watching, and the touch is then an ordinary touch.

**How a cycle ends and how the next one starts.** Play is open and has no ending of its own. A board stays as built for as long as the child likes, across visits, and nothing new starts by itself: no next round, no countdown. The calm way to tidy up is the tray handle. After the clatter the board is dark and waits, with the moth at its bulb, and the next picture begins with the child's next push. On load no scene replays.

## The records

The game has no learning goal: it is designed from no record of either jurisdiction and claims no school skill, so this part has no heading for a jurisdiction.

## The look

Written after the style spike and brought up to date when the game was built. The look is the first one reserved for the game in `docs/art-direction.md`: **vector arcade glow**. The spike held on clarity and on draw count, so the second reserved look was not tried. No frame rate has been measured on a target device (see `REFINEMENT.md`).

**What it is.** Thin bright lines on pure black, as on a vector arcade screen, and in them a few solid things of light. The place and the three who live in it are line drawings: wire walls, a web, a spider and a gecko in outline, each body filled black so the wall does not show through. The things the child works with are the solid ones: a lit peg is a round cap with a body, a glint off its middle and a soft bloom; the lever's knob and the tray handle's bob are solid amber; a lit lamp is a disc of warm light. Lines that cross add up and grow brighter, the way phosphor does. Whatever moves leaves a short trail. A faint pattern of scan lines lies over the whole picture.

**The place.** The inside of an old arcade cabinet at night, seen from the front and filled from edge to edge: a marquee of lamps along the top, no two of a size and no two at a height, whose upper rail stops either side of the jam's home control and hangs a half ring under it, clear of it at every size; a web in the top left with the spider on its thread; walls of circuit traces and cables; the gecko on the right wall beside a valve whose filament flickers and the lever in its slot; a floor grid running off to a far point behind the tray; the tray with its five brimming wells; the three mirror keys in a housing on the left, each with the same solid peg up and left of its middle (a cap with its glint, dim amber at rest and the colour in hand on the key that is down), hollow echoes drawn with one thin line, and fold lines that end on the rim, so the third key is four panes; the tray's handle in its own slot; and the loudspeaker on the right, which pushes one whole ring out of its cone at every sound. On a surface taller than the stage the cabinet goes on: a loft of hanging lamps and traces above, more floor below. The board itself is plain black with a dark pit at each hole: it is the working piece, and it is the brightest thing once it holds pegs.

**The palette** (`INK`, `PEG_INK` and `SHADES` in `pen.ts`). The background is black, `#000000`.

| Part | Colour | Why |
| --- | --- | --- |
| The setting: walls, traces, cables, web, floor | Violet-blue and dim teal, `#5350d6`, `#2b2f86`, `#8d72d8`, `#1c6f80` | Cool and low, so the setting never competes with what answers a touch |
| The bezel and the pits | `#8f8cff`, and near-black blues for a pit | The board's frame is the brightest line of the setting; an empty hole is a dark dent, not a ring |
| What is taken hold of: the wells, the keys, the lever's knob and slot, the handle's bob and slot | Amber, `#ffab40`; the knob and the bob solid | The one strong warm colour means "a control", and no peg has it. What is pulled is solid; what is tapped is an outline |
| The lamps: marquee, loft, the valve's filament | Pale warm, `#ffc98a` | Lamps, not controls: paler than the amber, and they only breathe |
| The pegs | Red `#ff4257`, blue `#4a8dff`, yellow `#ffe14a`, green `#4dff88`, white `#ffffff`, each in three shades | Five colours far apart in hue and in lightness; each also has its own bloom, voice, way of leaving and way of meeting the beam, so colour is never the only cue |
| The beam | White, soft-edged, one column wide; a half beam a soft dim yellow band along the row of the yellow peg that split it, drawn behind any peg in its cell and no taller than a cap, so it shows at the two sides of the cap and never crosses a face; its height and length from the column it was split off in | The only light that crosses the board |
| The spider | Pink, `#ff5fd2` | No peg and no control has it |
| The gecko | Mint, `#5ff2d6` | Bluer and paler than the green peg |
| The moth | Lilac edge `#dcc2ff` on dusky wings, a white body | Small, solid, always beside the newest light |
| Eyes, the ghost hand | White | |

**How things are drawn** (`pen.ts`). A still line is three strokes added with `lighter`: wide and very dim, narrower and dim, thin and bright. A moving line is two at most: one wide dim stroke under one thin bright one, and limbs have only the thin one. A peg is drawn once into a sprite of its own cell, so its bloom never reaches into the next. There is no blur filter, no shadow blur and no bloom pass.

**The layers** (`view.ts`). Two canvases lie one over the other, under a strip of scan lines made in CSS.
- The still layer holds the cabinet and every peg that stands still. It is painted once for a size, and after that only the cell of a hole that changed.
- The live layer holds what moves. It is never wiped while the game plays. Each frame it is faded by a share that follows the frame's length, and the movers are drawn over it. That fade is the phosphor trail, and it is the frame's one full-surface pass.
- What rests is stamped: a watcher that is doing nothing is one drawing made beforehand plus its pupils, and so are the lever's knob and, while it hangs still, the handle's bob; rattled or pulled, the bob is drawn line by line. The gecko's drawing, and no other, is made again when its neck has come to rest somewhere new, and a tapped well's whole pile is one stamp that shakes over the still one for a third of a second. What is stamped with a soft edge is rubbed out first, or it would pile up on the phosphor.
- Light that is added each frame (the beam, a flash, a lamp, the idle glow) is added a share at a time, so it settles at its strength instead of piling up.
- A frame's draw count is what it draws on the live layer: sprites stamped, paths stroked and paths filled. Flashes are one fill a colour, half beams one fill however many and however unlike, blooms at most two strokes a colour. `frameBudget.test.ts` counts with a stand-in context.

**Motion rules.**
- A peg appears pressed small under the finger and springs past its size on the lift. Each colour blooms in its own way (`blooms.ts`), leaves in its own way when knocked out, pulled or dropped (`fallers.ts`), and meets the beam in its own way: a halo round the peg whose shape over time is the colour's own (`view.ts`).
- Every character has its own tempo and its own funny part (`motion.ts`, `moth.ts`): the spider is springy and acts with its thread, feet and eyes, and draws its legs in on the side where its body nears the board's frame or the stage's edge, so no foot is ever over the board; the gecko is still for long stretches and then snaps, acts with its tail, tongue, grip and eyes, and leans its neck slowly towards the red pegs; the moth is small and quick, larger in the air than sitting, flies in wide wobbles that tighten as it nears the light, and droops for half a second where it sat when its peg is pulled. No two acts of a watcher move the same parts or last the same time, and a test holds that.
- Sight and sound are on one clock: each sound is asked for on the frame in which its motion is seen, and no voice hides a delay (`clock.test.ts`).
- What the hand takes hold of moves with it and is never only heard: the lever's knob is under the finger from the first unit and falls or springs back when let go; the tray handle's bob swings 20 units to each side for a second, with its glint flared, at every rattle.
- At idle the lamps breathe, each at its own pace, the valve flickers, the moth breathes its wings, and each watcher does a quiet thing of its own now and then, never the same thing twice running. Nothing beckons.

**The tiers** (`TIERS` in `config.ts`). A cheaper tier keeps the look and never changes the rules or the pace.

| Tier | Pixel ratio cap | Trail | Wide stroke under live lines | Scan lines |
| --- | --- | --- | --- | --- |
| 0 | 2 | 0.11 s | yes | drift and breathe |
| 1 | 1.5 | 0.11 s | yes | drift and breathe |
| 2 | 1.25 | 0.07 s | yes | stand still |
| 3 | 1 | none: the live layer is wiped each frame | no | stand still |

**What must not be borrowed from this look by another game:** thin bright outlines on black with a phosphor trail, with solid caps of light as the only bodies. The techniques (a still layer under a live one, strokes added with `lighter`, stamping what rests) are free to share.

**The registry row.** The look's row in the claimed-styles registry of `docs/art-direction.md`, beside the game's name and the link to this file, reads:

> Vector arcade glow (canvas 2D): the inside of an arcade cabinet at night drawn in thin bright lines on pure black with a phosphor trail and faint scan lines, a large pink spider and a mint gecko in outline, and the pegs, the lamps and the two amber pulls as the only solid things, round caps of light

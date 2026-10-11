<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Sheet: round 1 came back with 7 findings, each with its exact replacement. All seven are pasted word for word (finding 3 added a paragraph, finding 4 a sentence) and nothing else above `## The look` was changed. The findings were: the squirm at the jug reads as a tickle and never as distress; the ending is saved with the change that makes it certain; a cloth left on someone can always be fetched; the curtain and the door are kept clear of the home control too; the one who waits never hurries the child; the carried things stay plain; day 15 claims only what the grid gives. The builder writes no git, so the lead holds the commit the round judged. Round 2: the ten sentences the builder proposed after the second run, checked and pasted by the lead, and an eleventh by the lead (the towelled lamp flares with a pool of light, not a ring). Round 3: seven replacements after the first reading (no quantity above five, foam on the pillow, the paw held out, a cloth sent off by a wash thing, what stays under the blanket, the paw on the glass, the lamp at night), checked and pasted by the lead. Round 4: two replacements after the second reading (the duck seen from the side, the night-light lit when he sleeps), checked and pasted by the lead.
- Sheet, round 2: the lead pasted the builder's ten sentences and an eleventh of its own (the towelled lamp flares with a pool of light that swells and fades).
- Second reading: the thirteen fixes confirmed; ten new points under "the game does what its sheet says" (one a child would notice, nine slight), four new weaker lookalikes, and the idle hand kept away by the room's own idle yawn and snore. Eight points and the hand are closed in code, each held by a test in `game.test.ts` ("what the second reading found"), `figures.test.ts`, `voices.test.ts` or `frameBudget.test.ts`; two are sentence pairs (18 and 19, below).
- First reading: 13 points under "the game does what its sheet says" (four a child would notice, nine slight) and seven weaker lookalikes. All 13 are closed in code and tests, with seven more sentence pairs proposed (below).
- Open: no frame rate has been measured and nobody has listened to the sounds. Pairs 18 and 19 are pasted (round 4); the lead registers the row at the end of `ART.md` in the pull request that brings the game, and took the game after the second reading's ten points were closed, without a third reading. Of this round's changes the uneven stripes, the soap's foam on his head and the blanket's bump were seen in stills (`r2`, `r3`); the rest is held by tests and was not looked at.
- Look in use: soft pastel on night-blue paper, the first look reserved for this game. Kept by the lead after the toy.
- Try first: tap the soap. It flies to Teddy's muddiest place and scrubs it white. Tap it again for the next place, then tap the jug, the towel three times, the blanket and the lamp, and he is asleep. Then do it by dragging: rub the soap where you like, hold the jug over his head and lift it away to see him shake, and put the pyjamas on the cat.
- Stills: outside the repository, in the wave's scratch folder for this game, with the script `stills.mjs` that takes them and `saves.json`, the saved rooms it opens. Each is 1180 by 820 at pixel ratio 2 with `?chrome=0&seed=1&tier=0`. Folders: `p1` (rooms as found, the wash, taps, the hand), `p2` (every cell of the grid, every cloth on every wearer), `p3` (the same rooms and the wash again, the three scenes, the idle ladder, a tall and a wide surface), `cold` (the cold playtest on the production build), `cold2` (the same script after its fix set, on the dev page), `p4` (the sunk blanket's corner), `r1` (the first reading's fixes), `r2` and `r3` (the second reading's: the stripes on the peg and on him, foam on the head of a clean bear in his blanket, the blanket's bump over his foot).
- Nobody has listened to the sounds. They are tested for being distinct notes and for sounding only while their maker is drawn, not for being pleasant.

**What is still weak.**

- Teddy in bed is his sitting figure wrapped, turned and made smaller. It reads as a bear in bed; it is not a drawing of a bear lying down.
- When the soap is rubbed on his face, the soap in the hand hides the bubble on his nose.
- Under the jug his ears are laid flat to each side, and the top of his head has a harder edge there than anywhere else on him.
- Foam on a foot shows a little past the foot's outline.
- The fix set that came out of the cold playtest was seen again on the dev page, not on a second production build; the tests hold it.
- The sleeper's sigh is a rise and fall of the whole wrapped figure by about a tenth; it shows, and it is small.
- The towel on the ball of fluff rolls the ball over, and the towel in the hand covers most of its pedalling legs.
- A tall surface was not seen: the jam shell shows its turn-the-screen card there, which is the shell's.

**Sentences proposed for the sheet.** Pairs 1 to 17 are pasted. Pairs 18 and 19 came out of the second reading; the exact text of each is in `proposals.json` in the wave's scratch folder for this game, and in short:

18. *The duck.* "It faces the child and bobs" becomes: it is seen from the side, facing Teddy, and bobs. It is painted in profile, turned to him.
19. *Nothing frightening.* "The dark room is the same room with the lamp down: a night-light glows, the stars show" becomes: the lamp keeps an ember, and once Teddy sleeps a night-light glows and the stars show. The night-light is not lit when the lamp is turned down in the evening, because its coming on is the last beat of falling asleep: the room asks for the lamp last, so a light that was already on would leave that beat with nothing to show.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, used as copied.
- `input.ts`, `guidance.ts`, `overlay.ts`, `audio.ts`, `rng.ts`, `stage.ts`, `state.ts`, `scene.ts`, `manifest.ts`, `index.ts`: used as copied. `tick` in `audio.ts` is not called.
- `config.ts`: the backdrop, a tier that also carries how many loose bits may be out, a ladder of one place, `FIRST_MUD` (the game's own age default) and `DRAW_BUDGET`. `OLDEST` was removed with the second place.
- `state.test.ts`: says the ladder has one place.
- `goodnight-teddy.tsx`: the Mount keeps the template's order. Changed: the state is `Save` from `save.ts`, a wrapper round `state.ts` with the room's fields; a press in the grown-up's corner is not handed to the game; a drag's end lets the thing go, and a press end or a cancelled drag sends it back; the loop steps the game and keeps the idle ladder quiet while anything is busy.
- The game's own modules: `game.ts` (the room and its rules), `acts.ts` (the one timeline), `shown.ts` (when each sound's maker is drawn), `layers.ts` (the paint order), `fur.ts` and `bear.ts` (the coat and his shapes), `room.ts` (places and what a point touches), `hint.ts` (what the idle ladder shows), `idle.ts`, `voices.ts`, `save.ts`, and for drawing `view.ts`, `figures.ts`, `scenery.ts`, `pastel.ts`. `finger.ts` is the scripted finger the tests share; nothing in the game imports it.
- **For the template:** a game that integrates springs needs a fixed inner step; `game.ts` steps at a ninetieth of a second inside each frame, and a test holds it. The lead has taken this note.
- **For the template:** `state.ts` has no place for a game's own fields, so this game wraps it in `save.ts`.
- **For the template:** a counted frame budget for a canvas game needs a surface that counts. `frameBudget.test.ts` builds one from a proxy in forty lines; the template could carry it.
- **For the template:** the guide's ladder shows a hand that carries. A game for the youngest, who only tap, has to make each tap a whole job and has to test an evening done in taps alone; nothing in the template asks for that test, and this game found the gap only in the cold playtest.

### For the owner to decide

- The jug: a default taken. Teddy's squirm is the brr of a ticklish bear with a wobbly grin; he stays under the spout and the shake leaves him content.
- How much one tap does: a default taken. A tapped soap covers one muddy place, a tapped jug rinses all of him, a tapped towel dries a third of him, so an evening is eight or nine taps at the youngest starting age. Smaller taps would make the washing last longer.
- A bear who is still muddy may sleep: a default taken from the sheet. Mud is never in the way of sleep and shows on the pillow.
- The first evening's mud by age: two places at 3 and younger or with no age, four from 4. A default taken.
- The three secrets (the cat in pyjamas, the duck asleep, the striped light) are never hinted at. A default taken from the sheet.
- The night-light: a default taken. It comes on when he falls asleep and not when the lamp is turned down in the evening; the evening's dark keeps the lamp's ember. Pair 19 says so in the sheet.
- A tapped soap on a clean bear who wears a cloth goes to his head and leaves foam there, which then wants the jug and the towel. A default taken from the lead's ruling: no tap leaves nothing to see.
- The sounds: nobody has heard them.

### Reader

Weaker lookalikes the builder already knows of: shapes that could be taken for a numeral, a letter, a sign or a count, and that a child would not plainly read as one. A reader lists only new ones.

- The garlands along the top: paper lanterns on two strings, uneven in size and gap, which could still be taken for a row to count.
- The stacking rings on the toy shelf: a few rounds on a peg, low in contrast.
- The picture on the wall: a boat whose sail is a triangle.
- The tap behind the bath: a bent pipe, which could be taken for a hook or a letter.
- The wallpaper: rubbed blotches of uneven size in rows shoved out of line.
- The tiles behind the bath: laid like bricks, each row shoved along by its own amount, in uneven widths and three tones. The first reading found them an even checker, and they were changed.
- The rug under Teddy: a rose oval with a darker middle and three worn cream patches. The first reading found a cream band all the way round, an oval ring, and it was broken into the patches.
- The soles of Teddy's feet: one pad and one band of toes each.
- The pyjamas' stripes: level cream bands across the cloth, five folded on the peg, seven across his trunk and four down a sleeve, a little uneven in thickness and gap. The second reading found them at even gaps and sizes, and they were changed (`figures.test.ts`).
- The cat's tabby marks: bands of uneven length and gap.
- The stars, the round moon and the morning sun: dots and discs in the glass.
- The window's bar and the door's round handle.
- A ripple on the bath: two soft arcs of unequal length, never closed.
- Shut eyes drawn as curves, and the two eyes that shine in a fold of the blanket over the cat.
- The idle glow, the night-light and the lamp's flare: filled pools of light with no rim. The sheet calls the flare a ring of light; it is drawn as a pool that swells and fades.
- The ghost hand: a pale mitten shape with a dark rim.
- The foam's beads and the fluff's tufts on his coat: uneven in size and place.
- The ball on the floor carries one band round it; the blocks, the slippers and the balls of wool carry no mark.
- The cat's stiff legs in the pyjamas: four short straight bars under it.
- Teddy's brows at rest: two near-level dashes over his eyes.
- A flying bubble: a pale rim round a darker middle.
- The jug's shelf: a bar on two legs, left of the door.
- The cat's pedalling hind legs when it rolls as a ball of fluff: two short parallel bars, on the bed at the right.
- The cat's paw pulling the curtain: one straight bar from the foot of the bed up to the curtain under the window.
- The towel rail and the pyjamas' peg rail while their thing is away: bare level bars, at the top left and the top right.
- Teddy's paw on the door's glass: a disc with a paler disc inside it.
- The shade under the blanket's bump when his foot thumps: one soft crescent, open upward, for a third of a second.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The first stills of the toy: rest, soap, jug, shake, towel, fluffy, lamp down | "Where did his face go?" (foam hid it.) "He is cross with me." (the squirm read as anger.) "The water comes out of the wrong side." "It is too dark, I cannot see the duck." "The room is empty up there." | Reading Teddy: lighter foam with his nose drawn over it; a worried face for the squirm with an open mouth; the jug turns its spout toward him and pours only when tipped; a wet coat that is warmer and lighter; lamp down dims less and moonlight comes in; garlands and a toy shelf fill the top of the frame; the tap drawn as a bent pipe; a finer tooth. Nothing reverted. | Not measured on this machine | The ghost hand |
| 2 | The same stills again, with the hand, a reload and a tall surface | "What is that white thing?" (the ghost hand was a pale blob.) "The bubble on his nose will not go." | The hand: a shade under it, a tighter and brighter glow on the thing it points at, and a faint copy of the thing carried in it; the nose bubble fades. Nothing reverted. | Not measured on this machine | The ghost hand is still hard to see where it crosses Teddy's pale arm (`08-hand.png`). Teddy fully dried is one pale shape and his arms lose their edges against his body. The tall surface was not seen: the jam shell showed its turn-the-screen card in place of the game. |
| 3 | The game: 23 rooms as found, the wash, taps, the hand (`p1`) | "He is angry at the water." "Why is his mouth sad?" (the shiver.) "He has beads on him." (tufts in a row.) "Where is his nose?" "There are rings on the wall." "He winks at me but I am still washing." | Reading his face and coat: lifted brows and a wide wobbly grin with his tongue under the jug; a small chattering mouth for the shiver; tufts of uneven size at uneven gaps with half the places bare; his nose drawn live over every mark; soft pools in place of rings for the lamp's spots and the idle glow; more stars, uneven; the wink only when nothing is busy. Seen again in `p3`. Nothing reverted. | Not measured on this machine | His ears stayed up under the jug |
| 4 | Every cell of the grid and every cloth on every wearer (`p2`) | "The cat has a bib on." "What is the yellow triangle on the bath?" "The water is on his head and his ears do not mind." | Cloth and ears: the cat's pyjamas cover its body; the sunk blanket's corner is a sagging cloth with folds over the rim; under the jug his ears are laid flat to each side; a ripple is two soft arcs, never a closed ring. Seen again in `p3` and `p4`. Nothing reverted. | Not measured on this machine | The top of his head has a hard edge while his ears are flat |
| 5 | The three scenes, the idle ladder in seven rooms, a tall and a wide surface (`p3`), then the cold playtest on the production build (`cold`) | "He is in bed and the cat shuts the curtain." "He is outside. He is dirty again!" Then, tapping only: "I did the soap. Why is the jug shining, he is still dirty." "I did the soap again and nothing new." "I rubbed and rubbed and he is still wet." "Why is he cold in his blanket?" | A tap is a whole job: the soap is asked for while any mud is bare and a tapped soap goes to the muddiest bare place and covers it; a tapped jug crosses all of him and rinses every part; a tapped towel dries one of three parts of him and finishes what it has mostly dried; a new test plays an evening in taps alone at both starting ages. Seen again in `cold2`. Nothing reverted. | Not measured on this machine | Teddy lying in bed is his sitting figure turned; the soap in the hand hides the nose bubble |
| 6 | The first reading's 13 points, then the reader's work done again on what changed; stills of the cloth whisked off, the ball of fluff rolling and the sleeper's breath (`r1`) | "I tapped the towel and he is still wet." (under the blanket.) "The cat makes a noise and does not move." "He went to sleep and I did not see him yawn." "The room was bright and then it was dark." (on opening it again.) | Nothing only heard, no tap wasted: a wash thing whose work is under a cloth sends the cloth home first; a tapped blanket lands before the yawn; the ball of fluff rolls, arches, starts and wears the pyjamas; the halo opens where the lamp was left; the sleeper breathes in and out; a foot lifts and lands on the thump; the paw held out and the paw on the glass are chosen from the room; the wet patch lies where the water is; the lamp stays down at night; the corner is the grown-up's for the idle ladder and for eyes too; the dome and the duck on it are touched where they are drawn; the towel tints the ember of a lamp that is down; the hand carries a faint copy; tiles and rug broken up. Nothing reverted. | Not measured on this machine | The sigh is small; the towel hides the ball's legs |
| 7 | The second reading's ten points and the idle hand; stills of the stripes, the soap on a clean bear in his blanket and the blanket over his thumping foot (`r2`, `r3`) | "I put the soap on him and nothing came." (clean, in his blanket.) "His foot goes bump but I cannot see it." "He is cold but he is not wet." (foam under the blanket.) "I tapped the towel and it did nothing." (the blanket was still in the air.) "The hand keeps coming back." | Nothing for nothing, part two: a tapped soap with no mud to go to goes to his head when a cloth is over his belly; a wash thing sends back only the cloth its work is under, and waits for a tapped cloth to land first; the blanket rises over the thumping foot; the shiver, the drops and the wet wrap are for water and not for foam; the ear shadows are thrown every time, after what he is doing; the jug's water sounds brighter the faster it is swept; the pyjamas' stripes are uneven; the idle yawn and the duck's snore no longer keep the hand away. The first bump was the blanket's own colour lifted over itself and could not be seen; it got a soft shade under it and was seen again. Nothing reverted. | Not measured on this machine | The bump's shade is one soft crescent; the waiting wash thing, the queued ear shadows and the jug's brighter water were not looked at or heard |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

The sentence for the README's list of games: Goodnight, Teddy is a wordless bedtime room for ages 2 to 5 where a child rubs soap, water and a towel onto a muddy bear, tries the pyjamas and blanket on the duck, the cat and the lamp, and turns the lamp down to put him to sleep.

### How the game meets the quality bar

No frame rate is measured: the machine this was built on cannot measure one. The lead's probe measures it.

- Alive at idle: Teddy breathes and looks at what he wants, the duck bobs, the cat's tail curls and it blinks, the halo wavers, the curtain drifts, the tap drips, each at its own tempo (`idle.ts`, held by `idle.test.ts`). Clean and dry he yawns by himself; tucked in with the lamp down the duck snores.
- Motion and sound on every touch: every cell of the grid, the bare hand on each of the five, and a touch anywhere else has its own movement and its own notes (`game.test.ts`, `voices.test.ts`). A sound is heard only while its maker is drawn making it (`sync.test.ts`, over every cell and every scene).
- Weight, squash and follow-through: carried things lag and settle on springs, cloth trails, Teddy leans into the towel, wriggles under the jug and shakes after it, the duck squashes and springs back, the cat arches.
- Kid-clear silhouettes and tappables: one bright edge marks what can be touched. Nothing a child must touch lies under the home control, in the grown-up's corner or in the bottom strip (`room.test.ts`).
- Wordless clarity at 2: one thing is asked for at a time, in the order that works, and an evening can be done in taps alone, one whole job a tap (`game.test.ts`, "an evening in taps"). No word, letter, numeral or sign; nothing drawn reads as a count or a ring. The wordless check passes.
- Wordless idle guidance: a soft pool of light on the one thing the room asks for, then a hand that carries it to where it would work, or presses the lamp, the curtain or the door (`hint.ts`). The hand comes four times, later each time, and then no more; what the room does by itself (his idle yawn, the duck's snore) neither starts it again nor keeps it away (`game.test.ts`).
- Found as left: every scene is in the record when it starts, a tap's work is in the record when the finger lifts, and a room put away at any instant is found as it was, with nothing easing in and no scene replayed (`game.test.ts`, `save.test.ts`).
- Under a cloth: a wash thing whose work lies under what he wears sends the cloth back first, so an evening in taps also ends from a blanket on a muddy bear and from pyjamas on a wet bear, with no tap that changes nothing (`game.test.ts`). Only the cloth the work is under goes; a wash thing tapped while a tapped cloth is in the air waits for it to land; a tapped soap on a clean bear in a cloth leaves its foam on his head.
- Nothing passes through anything: the paint order is one list (`layers.ts`), held in every frame of a walk through the grid, the hand and the scenes, and for each cloth on each wearer with the towel and the jug in the hand (`layers.test.ts`).
- Frame budget: counted, not timed. One backdrop stamp, sprites painted once, at most 80 draws a frame (`DRAW_BUDGET`); the fullest frame of the whole walk is 75 and the room as found, untouched, is 35, or 38 with the idle hand over it (`frameBudget.test.ts`). Four tiers. No shadow maps and no post pass: it is a 2D canvas.
- Assets: all procedural. Sound is synthesized.

### What was measured, and on what

- The draw count, by `frameBudget.test.ts`, on the real view with a counting surface: 63,061 frames, fullest 75, the room as found and untouched 35 (38 with the idle hand over it), one full-surface stamp a frame.
- The cold playtest, once, on a production build made with `npx vite build` and served with `npx vite preview`, by a script that touches nothing for ten seconds and then taps only what the room points at. Before: by two seconds Teddy holds his muddy paw out and looks at the soap, and by four the soap glows and the hand carries it to him. Unclear: after one soap tap the room pointed at the jug while three muddy places were bare; a second soap tap went to the place already soaped; one jug tap left foam on his belly and an ear, so the jug went on glowing; seven towel taps dried only his head; and so the blanket made him shiver and the lamp left him awake in the dark. After the fix set (the same script on the dev page): four soap taps cover the four places, one jug tap rinses all of him, three towel taps dry him, the blanket and the lamp put him to sleep, and the curtain glows in the night. No new unclear moment was seen.
- No frame rate.

### The learning claim

This game has no learning goal and makes no learning claim. It cites no record.

### Defaults taken for the owner

- The jug is a tickle: a wobbly grin, never distress.
- One tap is a whole job; an evening is eight or nine taps at the youngest starting age.
- A first visit starts with mud in two places from the youngest age or with no age and in four from age 4 (`FIRST_MUD`); the oldest bucket is open-ended. Age sets nothing else.
- The lamp starts up and the curtain closed.
- A muddy bear may sleep.
- The secrets are never hinted at.
- The night-light comes on when he falls asleep, not when the lamp is turned down in the evening.
- A tapped soap on a clean bear who wears a cloth leaves foam on his head.
- A wash thing takes off only the cloth its work lies under, and waits for a tapped cloth to land before it does.

### What the next builder should know

- Step springs at a fixed small step inside the frame.
- In a soft look, draw the face live over the coat's marks, or foam hides it.
- A rubbed-on layer needs a coarse grid, not pixels: 14 by 16 cells save as four short strings and paint in four part canvases only when the coat changes.
- Put every answer that takes time on one timeline that the game, the view and the sounds all read, and walk it with one scripted finger shared by the sync, paint-order and frame-budget tests.
- For the youngest band, play the whole cycle in taps alone before anything else is polished. A drag that works says nothing about whether a tap does enough.
- The idle want must follow the order that works, not the order of the marks: ask for the soap while any mud is bare.

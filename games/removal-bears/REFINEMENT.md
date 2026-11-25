<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: Sugar cubes and biscuit (3D), the first reserved row.
- Sheet: round 1 (a fresh checker) 14 findings, pasted; round 2 (another) 6 blocking findings and 1 other, pasted word for word; then the first showing was rewritten after the owner's word that the first games' loops are not clear to a four-year-old, so round 4 (a third fresh checker) read it again: 3 blocking findings, pasted word for word with nothing else changed, so round 5 is passed from the diff. Sheet part of `ART.md`, sha256 starts `9fd3ddd4f46b778d`.
- Open: the look in the menu (section 4) is left in its reserved state for the lead.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `input.ts` changed: a second finger gives an `extra` gesture so it is answered where it lands, and a finger that rests a second, or landed on nothing that moves, hands over to the next one (the touch rules). **For the template.**
- `guidance.ts` changed: the glow comes after 1.5 s and the hand after 3 s, six times. The owner reported that the first games' loops were not clear to a four-year-old.
- `scene.ts` and `stage.ts` are not used and were removed.

### For the owner to decide

- The look and the toy, seen for the first time with the whole game.
- The first showing plays one whole round, wrong then right, with the first load; the two after it are the child's.

## Pass log

Frame rates: none. The builder's machine draws in software (SwiftShader), where the probe reported 1.2 frames a second at pixel ratio 2 and six times throttle, which says nothing about a tablet.

| Pass | Looked at | Critique | Fix set | Still weak |
| --- | --- | --- | --- | --- |
| 1 | First still at 1180 by 820 | Reads at once as biscuit and sugar. The sugar is grey, the tiles are bare, sky shows over the steps of the gable | Neutral tone mapping, whiter light, shelves of jars, a sloping loft roof | Sugar warm |
| 2 | The same, the heave and the showing | Bears that strain look angry; sugar now yellow | Worried brows; neutral lights; a darker loft | - |
| 3 | Six loads, an open house, a load from behind | The mouse stands up out of the piano's outline, feet cut by the cloth, sitting bears too far apart to lean | Mouse smaller and lower, feet raised, bears close up when a house is done | - |
| 4 | Each act, by stills and by the intersection audit | Paws sink into the load, a fallen load sits in a flat bear's ears, loads brush the back of the wall, a dropped load meets the cart | Room for a paw, flatter heads and measured flat heights, arms down when pressed, the cart makes way, a deeper loft | - |
| 5 | The loop, after the owner's word on the first games | What to do next is not shown | One whole round first; the hand follows what was just done | - |
| 6 | A code review by a fresh reader | Twelve findings: a heave tapped twice with a turn between never ended, a showing put away kept the old save, and others | All fixed, with a test that plays at random and compares what is stored with what is shown | - |
| 7 | A cold playtest by a reader who knew nothing of the game, by stills | Finished a house. The hand pointed at the wrong opening; nothing linked the load to its opening; a load that went in was gone too soon to be seen; the top of a tall load on the cart was dead; the next house opened with the same load; glow too strong; a tap on the wall hardly showed | The hand is right whenever it is followed (a test finishes 72 houses by it without a wrong heave), the load and its opening glow together, a load stays in its opening for a second, the cart's load is all one target, another load first, a fainter glow, a stronger dent | Some loads are hard to name as furniture when they are upside down |

## For the pull request

### How the game meets the quality bar

- **Alive at idle.** The bears breathe and blink at their own rates, the cub hops behind the opening, each passenger has its own idle.
- **Motion and sound on every touch.** Every target answers when the finger lands, the wall, the cloth, the jars and a second finger included; each has a synthesized voice. Nobody has listened to them yet.
- **Weight, squash and follow-through.** Crouch, toss, catch with a squash, flat bears that spring up past their height, cubes that bulge and ring.
- **Kid-clear.** Brown loads on a white house, dark openings, one load in hand. Targets of 48 px or more on every surface tested.
- **Wordless.** No word, letter, numeral or symbol; `npm run wordless:check`.
- **Guidance.** A first showing of one whole round, wrong then right; then a glow after 1.5 s and a hand after 3 s, six times, gone on any touch.
- **60 fps.** Not measured: the build machine draws in software (SwiftShader, Chrome, 6x throttle, pixel ratio 2, 1.2 frames a second, which says nothing about a tablet). No iPad and no WebKit. What is held by a test is at most 60 draws and 60,000 triangles (53 and 55,000 measured); pixel ratio capped at 2, no shadow map, no post pass, three quality tiers.
- **Assets.** All procedural.
- **Its own look.** Sugar cubes and biscuit.

### The learning claim

The Removal Bears is designed from California's infant-toddler foundation 2.2, in the part about how things fit, and from California's preschool and transitional kindergarten foundation 4.6. Both are foundations published by a department, not standards; both confirmed, read again on 2026-11-25. No Dutch record is named. No child has tried the game.

### Defaults taken for the owner

- The owner's word on the first games put clarity before the puzzle: the first showing gives one whole round, and the hand, after a wait, shows the right move. A child who does not wait works it out alone.
- A tap on an opening heaves (touch rule 4 says a tap moves nothing of weight): at age 2 everything essential is a tap, and a heave that does not fit costs nothing.

### What the next builder should know

- A hint that "shows a move and never the answer" is read by a newcomer as a hand that is wrong. If the hand can be followed, it has to be right.
- Two big characters, a load and a wall in one plane: put the bears' places in terms of the load's outline from the start, or the intersection audit finds every act.

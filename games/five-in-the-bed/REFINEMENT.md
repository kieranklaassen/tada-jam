<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. Built, refined in the passes below, and in review in its pull request.
- Sheet: check round 1 (a reader who did not write it) returned 16 findings, pasted word for word. Round 2, the same reader, returned three, pasted. Round 3, a reader new to it, returned nine on the changed lines, pasted, and one fault in the count of moves, fixed and tested over every deal. Nothing has been read since for the paste itself.
- Look in use: the first row set aside, tufted play rug. The second, backlit peg dots, was not tried.
- Open: the owner has not seen the toy or the game; nobody has listened to the sounds; no physical iPad and no WebKit was measured.

### Template notes

- `state.ts`: used as copied, wrapped by `save.ts`.
- `scene.ts`: removed, not used. Scenes are steps of the rules in `game.ts`, since what they show depends on the physics.
- `config.ts`: `TAP_PRESSES` is 1, since a second tap takes the sheep back.
- The Mount: the template's, with the gestures behind `Play` so that tests use the same path.
- `symbols.ts` went, as the band starts below 6. Frozen files and the rest: used as copied.

### For the owner to decide

- The look and the toy.
- Whether the opening showing (one sheep over the ridge and back) is wanted on the first visit.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | the first frame | Grass shows between the tufts of the bed; the ridge is flat; brown shelves are dull; the stars are crumbs | a dyed ground under the pile; a lit rib; teal shelves; larger stars | not measured | straws |
| 2 | misfit, drinking, acts | Straws lie across the faces of others and over eyes; the mask is gone when its sheep sleeps | straws behind all but their own and in from the side; the mask over the eyes | not measured | why to move anybody |
| 3 | the loop, as a child of 4: what do I do, what happened, what now | Straws went up each time anything moved, so nothing seemed to follow from a tap; the one without milk only looked; with no milk out nothing called | straws follow at once and a sheep gets its straw as it lands; the one without hops toward the spare straw, which leans to it, and its bottle bobs; the crate's bottles rattle and the dog looks at them; a touch on the crate deals at any time | not measured | |
| 4 | quilt, dog in the bed, worn bottles, a change of tier | Straws over the covered half are hidden; a change of tier repaints the rug and stops the game for two seconds | those straws hang over the quilt or go in at the hem; painted once for a size | 58 fps in software Chrome | |
| 5 | a cold playtest as a child of 4, a code review | Sheep piled in a hollow and hid each other's mouths; several hopped at once, so nobody knew which to tap; a coloured teat said nothing; the quilt needed its hem; two touches of different kinds could leave a scene running | each sheep has its own place, the same in both halves; one asks at a time; a bottle wears the sheep's own hat; a tap anywhere takes the quilt off; the bottle and the dangling straw answer; eighteen review findings | not measured | |
| 6 | misfit, hat, quilt, drinking, after | The dangling straw was hidden behind a hat; the quilt was cut off at the foot | it hangs in front and next to the ridge; a thin roll stays at the foot | see below | nobody has listened |
| 7 | a second cold playtest (nothing blocking) | Lumps nearly invisible; a quilt left on carried into a deal; straws crossed faces; five bottles came from a crate that showed three | the lump that asks is seen all along; a deal takes the quilt off; the highest sheep takes the nearest straw and it enters from its own side; five in the crate | in the section below | taps on the sky answer only a little |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- **Alive at idle:** each sheep breathes, blinks and looks about in its own way; the dog and the mouse too. All stop when unattended or hidden.
- **Motion and sound on every touch:** every thing in the frame answers when the finger lands, the rug included. All sound is synthesised.
- **Weight, squash, follow-through:** balls with mass, a ridge with a slope, squash springs, a tumbling leap that lands and bumps.
- **Kid-clear:** five cream balls on one plain butter field; targets of about 100 units, apart.
- **Wordless clarity:** nothing to read. One sheep at a time asks, and the spare straw leans to it. Looked at cold twice by a reader who had not seen it, not by a child.
- **Wordless guidance:** the hint glows on the one that asks and taps it; off at any touch.
- **60 fps:** 58 fps in software-rendered Chrome, a production build, tier auto, at most 69 stamps a frame, the game's own work 0.9 ms at the 95th percentile. WebKit and a physical iPad were not measured.
- **Procedural assets only:** painted once for a size of the surface.
- **Its own art direction:** a tufted play rug with hard toys on it.
- **Nothing through anything:** model tests; canvas 2D, so the 3D audit does not apply.

### The learning claim

As the sheet has it: designed from us-ca preschool-tk mathematics 2.2 (department-published-foundation, confirmed) and from nl fase-1 rw/bew/1/01/fase1 in part and rw/gb/2/09/fase1 (curriculum-institute-guidance, both confirmed). It claims nothing about what a child has learned.

### Defaults taken for the owner

- The look, the toy, the name, five sheep and no other number.
- An opening showing, once: one sheep over the ridge and back.
- After the milk nothing comes until a touch on the dog or the crate.
- The hat comes before the quilt in the order.

### What the next builder should know

- Balls that roll together hide each other's faces: give every character its own place when its face is what asks.
- When several ask at once nobody knows whom to touch. One asks.
- A change of tier must not repaint a big procedural ground.

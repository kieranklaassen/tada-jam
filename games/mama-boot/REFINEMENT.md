<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: Craft-box collage, the first of the two reserved looks. The second (Thick-line primaries) was not needed.
- The sheet: checked four rounds by someone who did not write it. Round 1 had eleven findings, round 2 five, round 3 five, round 4 none. Passed on the sha256 of `ART.md` up to and including the line `## The look`: `c9d0bc9086f513dfe9823180cb3e51e97c5502a685b6a33d05b85be27010d74a`.
- Plan review: the plan was not put through a separate document review. The independent check of the sheet, which holds the same decisions, took its place.
- Open: nobody has heard the sounds and nobody has held it on an iPad. See "For the owner to decide".

### Template notes

- `config.ts`: the designed order and `FIRST_VISIT` removed, since the yard is open play. `state.ts`, `scene.ts` and `input.ts` replaced by `save.ts`, `yard.ts` and `play.ts`. `stage.ts`: its point type comes from `layout.ts`. Everything else as copied; the four frozen files are untouched.
- **For the template**: the overlay is told of the working finger only, and a game that gives the corner to nobody never has a working finger there. The Mount here follows the corner finger by itself.

### For the owner to decide

- The look and the toy, by playing it.
- The sounds: every one is set by numbers on a machine with no speaker.
- A ring turns without a sound until it is nudged, as settled in the idea.

## Pass log

Frame cost is counted, not timed: there is no graphics hardware where this was built, so no frame rate here says anything about a tablet.

| Pass | Looked at | Critique | Fix set | Frame cost | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | The spike at 1180 by 820: first scene, an egg opening, a chick settled | "The chicks are small. The cow is a round thing. The string comes out of its tummy. The sheep is behind the pig." | Chicks a sixth larger; the cow has legs and stands higher in the door; the thread starts at the neck; sheep, pig and eggs moved so that each shows whole | 110 to 130 pieces | Boot's rider out of sight |
| 2 | Parade, one chick of each kind, ring, riders, the hen with each thing, stood in stills | "Where did the chick in the boot go? The egg is on his face. The boot is in front of the ball." | Seats moved; what the game sets down is put where it hides nothing; chicks keep their place once they stand by their mother, so that a chick does not scoot off from under a finger; chicks shut in flap out | 155 at the busiest | Hen's looks are whole-body |
| 3 | The hen's ten looks, wing, foil, ground, the guide hand, phone and wide surfaces | "She does not really turn her head. The ground does nothing. The wing goes down when it should go up." | The hen's head turns by itself, right over for the teapot; ground dents, foil creases under the finger; wing signs; the farmer opens one eye; buttons lost their thread, which read as a cross | 160 at the busiest, budget 175 in `frameBudget.test.ts` | See the cold playtest |
| 4 | The cold playtest proxy on the production build: seven fresh sessions by someone who had read nothing | Two high: with no egg left the hand led to the hen and no further; the first chick stood behind the farmer's hat. Then: a crowd hides faces, a chick after an egg looks cross, a carried pot leaves the frame, the hen under the pig is a pancake | The hand shows the hen and then a chick in one showing, and while her wing is up every chick stands in light; first places moved; what counts as hidden is wider; the chick after an egg hums with open eyes; carried things stay whole in the frame | 165 at the busiest | A child can still build a crowd |

Reader, first reading: rules 1 to 5 clean, 22 points under rule 6. All were built except one answered here: a finger that is carrying and moving keeps its work; lying still for four seconds it gives it up (`play.ts`, `DEAD_S`).

Reader, second reading: rules 1 to 5 clean, 11 points under rule 6, all built (near a seat is enough; a ring closed on a head comes down and turns; wet before the pair, never on dry ground; the ball is snored away and back; the egg turns in the water; the second thing on the hen sends the first hopping; followers clear of foil and scenery; an egg that rides knocks; out from under the wing onto what it rode; the fence's own posts rattle; the corner is patted).

Code review, by someone who did not build it: ten findings. Nine fixed: the yard is painted once and not again for a tier or while a size changes; nobody chases a rider on its own head; an untouched yard is not written on put-away; the springs hold at 10 frames a second; the egg that was moved comes out from where it is; the hen stops when her half ends; a thing taken or met in mid-roll rests on checked ground; every plain sound name is tested. One left: small per-frame objects (the map of mothers, the draw order), measured at about 0.005 ms a frame on a desktop, against the cost of caches that could go stale.

## For the pull request

### How the game meets the quality bar

- **Alive at idle**: eggs lean and knock, the teapot's lid lifts, the pig's tail goes, the farmer's belly goes up and down, the hen follows with her eyes, everyone blinks, the sun turns.
- **Motion and sound on every touch**: every body squashes on a spring in the frame the finger lands; ground, foil, fence, clouds, sun, tree, sheep and cow answer too. 90 acts, no two the same (tested).
- **Weight and follow-through**: springs on the body, loose pupils that lag and overshoot, hops that land in a squash.
- **Silhouettes and tappables**: warm and pale bodies on a mid-dark ground; targets about 100 units, 26 more forgiven; nothing to be reached for in the corner (a touch there is answered with a pat), under the home control or in the bottom strip.
- **Wordless clarity at two**: one egg asks at a time; any tap does something; no numeral, letter or sign.
- **Idle guidance**: glow at 3 s, hand at 5 s, four showings with doubling gaps, then quiet.
- **60 fps**: 165 pieces at the busiest (budget 175), one full-surface picture, no post pass, no shadow blur, no picture made after the first frame. No physical iPad measured.
- **Assets**: all drawn by code; nothing loaded.

### The learning claim

None. The game has no learning goal, names no record and makes no claim about how real chicks behave.

### Defaults taken for the owner

Three eggs at 3 and younger or with no age, five at 4 and older, first visit only.

### What the next builder should know

- "Nearest" makes pairs, never a ring of three: A nearest B, B nearest C and C nearest A cannot all hold. A ring of three needs the child to move something, or an egg that rides. The independent check found this on paper.
- A follower needs a place it keeps. Without one, lifting one chick made its sisters shuffle, and the one the child was aiming at walked away.

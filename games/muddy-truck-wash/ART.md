<!-- template: cartridge/ART.md v1 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, and its youngest age, 2, governs every choice below.

- **Cue table.** The table in wordless clarity has no row below 3, so its 3 to 4 row is the ceiling and the game cuts further. From its "Avoid" column the game takes: no text, numeral or icon to decode; no spoken instruction; no verdict; one live activity (one vehicle in the bay); and no tool that means nothing when it is touched. All three tools are in the scene from the first frame, and each one changes whatever it touches at once, so none is there before it means something.
- **The pack's rule for the range** (pack: game-design, ages-2-to-4.md). Every touch is answered and no order of touches is a dead end. The targets a wash needs (the vehicle, three tools, the vehicle that waits, the puddle) are each at least 100 logical pixels across, well apart, and none is in the bottom strip. Everything works with a tap: a tap on a tool takes it in hand, and a tap on the vehicle is one full dab of that tool. A rub is the same dab repeated along the finger's path; it survives a lifted finger, and whatever part of it was done stays done. No pinch, tilt, shake or double tap. One loved action, covering and uncovering, offered again and again. A wash fits in one to three minutes. There are three tools and never more than two vehicles on screen.
- **Symbols.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. No voice gives an instruction; the vehicles speak in engine noises and horns.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: a child of 3 or younger starts at `fresh-splashes`, and a child of 4 or older starts at `dried-patches`. `null` starts at `fresh-splashes`. A saved position wins over the age, every place in the order is reached by play at any age, and the age gates nothing.

## The toy

**Rubbing a tool over the vehicle.** The finger lands on the vehicle with a tool in hand, and the paint under it changes.

In the empty scene there is one vehicle, covered in soft wet mud, on wet concrete, with the sponge in hand. On touch-down, in the same frame:

- the body dips on its springs toward the finger, and the wheels on that side squash;
- the patch under the finger turns from mud to foam, and the edge of the foam swells out past the finger;
- a scrub squeak sounds, its pitch set by how fast the finger moves, never twice the same of four variants;
- bubbles lift off the patch, drift up, and pop one by one with small plips after the finger has gone;
- brown drips run down from the patch to the floor and spread into a puddle that creeps to the drain and is gone after a few seconds of play.

A rub lays a trail of the same change, and the body rocks after the finger like a toy pushed across a table. The hose and the cloth are held the same way and answer in their own material: water sheets, beads and runs off the sills; the cloth squeaks and leaves a glint. With no tool in hand the finger is a poke: the vehicle bounces on its springs and its mud squelches.

It is a pleasure with no goal because it is covering and uncovering, which a two-year-old does unprompted: bright paint appears from under brown, white foam hides it again, water takes the foam away. Each touch is a small reveal, bigger than the finger, and the vehicle can be covered and uncovered for as long as the child likes with nothing to finish. Random tapping always makes foam, splashes or shine, and never a refusal. A person watching sees within three seconds that the child is washing a truck.

## The object-by-action grid, and what is new on day 15

The objects are the six things that can be on a patch of the vehicle. The actions are the five things a child can do to it. Each tool does only its own job, and every cell looks and sounds different.

| On the patch | Bare finger | Sponge | Hose | Cloth | Sent off like this |
| --- | --- | --- | --- | --- | --- |
| **Dried mud** (pale, cracked) | A knock: a thud, a crack runs across, crumbs trickle | A dry rasp: crumbs and dust, suds dribble over the top and slide off; the mud stays | It darkens from the finger outward and turns to soft mud, a hiss that becomes a gurgle | A scratch and a puff of dust; the mud stays | Plates of mud crack off on the way out and lie in a row of clods |
| **Soft mud** (dark, wet) | A squelch and a dent that slowly fills | It lifts into brown foam that stays on the vehicle | It glistens, slumps and drips brown, and clings | It smears onto the clean paint beside it | Splats fly off the wheels; brown tyre tracks |
| **Foam** (brown from mud, white on clean paint) | A hole pops in it, plip by plip | More foam, taller, and bubbles drift off | It slides off in rafts that sail to the drain; clean wet paint | It is pushed along onto the paint beside it; the cloth wears a foam beard | Blobs of foam peel off behind and a line of bubbles follows |
| **Wet paint** | A squeaky wet slide, drops scatter | Thin white foam that slides and runs in streaks, a wet slurp | Water sheets off the sills, drops bounce | It dries and shines, a rising squeak | The vehicle shakes like a dog first; wet tyre lines |
| **Dull paint** (clean, dry) | The body bounces and the metal rings | Thick white foam that stands in peaks, a dry squeak going soft | Beads of water; wet paint | It shines, with one glint | A plain toot and off |
| **Shiny paint** | A dull fingerprint | Foam hides the shine | Fat round drops race off; wet paint | A higher squeak and a second glint; still shiny | Lamps flash, a glint runs nose to tail, a proud horn |

The wrong use of each tool works and is funny: the cloth on mud paints with it, the cloth on foam pushes a beard of it about, the sponge on a shiny vehicle buries it in foam, the hose on dried mud makes it worse to look at before it is better. Each vehicle adds its own row of reactions (see the characters), and the puddle makes the vehicle that waits muddier when the child taps it, up to two times.

On day 15 the child washes dried mud in the order that works (wet, soap, rinse, dry) with no wasted strokes, knows each vehicle's like and dislike and sets them off on purpose, and has found the combinations that always do the same thing, such as the sneeze that empties a tipper bed full of foam.

## The representation

The two ideas are the order of the steps of a wash, and how a material changes when something is done to it. Both appear as the materials themselves, on a toy vehicle, with nothing standing for anything else.

- **The order is in the materials, not in a rule.** Dried mud does not lift under the sponge until water has softened it. Soft mud lifts into foam under the sponge and stays on the vehicle as foam. Water carries foam away and leaves wet paint. The cloth dries wet paint and shines it. So the order wet, soap, rinse, dry is the only one in which every stroke takes the vehicle forward, and the child can see why on the patch under the finger. No tool is ever locked, greyed or refused.
- **Every change is one the real material makes.** Water softens dried mud. Soap and rubbing lift dirt into suds. Rinsing carries suds off. Wiping dries. A cloth on wet mud smears it. The model leaves things out (a patch has one state, and it changes in one dab) and shows no change that is not real (pack: game-design, representation-before-game.md).
- **Standing of the representation.** Washing a real thing in steps is school practice in early-years rooms. It has no trial behind it that this sheet can cite, and the research tables of the game-design pack have no row for it.
- **Where the order of object, picture and symbol stops.** At the object. The band starts below 6, so there is no symbol stage, and the game uses no picture of a step either: no icon of a tool, no card of the order.

## The four mechanic questions

- **Swap.** No: the content is the mud, the foam, the water and the three tools, and with another subject in their place there is no game left to play.
- **Attention.** At the moment of decision, which is taking a tool in hand, the child must look at what is on the vehicle now (dried mud, soft mud, foam, wet paint) and think about what that tool will do to it.
- **Fun.** Exploring how a material changes is the rub itself, the most enjoyable moment of play, and choosing the next step is the tap on a tool just before it, so play never stops for either.
- **Guess.** A child can get a clean vehicle by trying every tool on every patch, and at two that is meant: every touch does something and none is a dead end. What trying everything cannot do is wash without the consequences of a wrong order, which stay on the vehicle to be seen: smears, foam left on, mud gone dark and still there.

## The error as a consequence

A wrong attempt is a tool on a patch it cannot take forward. The patch shows what happened, where the finger was:

- The hose on dried mud: the mud is still there, now dark and dripping. Water alone did not take it off.
- The sponge on dried mud: crumbs and a dribble of suds, and the mud unchanged.
- The cloth on soft mud: a brown smear on paint that was clean.
- The cloth on foam: the foam has moved, not gone.
- The sponge on a rinsed vehicle: foam again, to be rinsed again.

The state stays. Nothing resets, nothing is taken back and no tool is refused, so the child changes one thing, another tool on the same patch, and sees the difference. A vehicle sent off half washed leaves as it is, dropping clods or trailing bubbles, and that exit is as good to watch as a shining one. Nothing buzzes, crosses, sighs or turns a sad face to the child. A vehicle's reactions are to what is on it and what touches it: the soap in its eyes, the cloth on its nose, its own paint gone shiny all over. None is turned to the child, and none rates the wash.

## The designed order, and what is stored

**The order.** A cycle is one vehicle: it rolls in muddy, is washed for as long and as far as the child likes, and is sent off. The order adds one thing at a time and then combines.

1. `fresh-splashes`: soft mud only, on about a third of the vehicle. The wash is soap, rinse, dry.
2. `dried-patches`: the same soft mud and two or three patches of dried mud. The one new thing is that dried mud has to be wetted before the sponge will lift it.
3. `caked-all-over`: dried mud over most of the vehicle with soft mud along the sills. Nothing new: the two kinds together, and more of them.

These ids are the `LADDER` in `config.ts`. They name places in the game's own order, never a grade, a groep or a level, and an id the game does not know falls back to the first-visit default.

**How a cycle went** is judged once, when the vehicle is sent off, from what is on it:

- well: no more than a tenth of its patches still hold mud or foam (wet, dull or shiny makes no difference);
- badly: more than half of the mud it rolled in with is still on it as mud;
- mixed: anything else.

The position moves one step up after a wash that went well, one down after one that went badly, and stays after a mixed one, between cycles only. A saved position wins over the age. Nothing shows the position or that it moved: the vehicles that roll in are simply muddier or less muddy.

**The harder option the child can see and pick.** A mud puddle lies beside the vehicle that waits. A tap on the puddle sends that vehicle through it, and it comes out with more soft mud, up to two times. A muddier vehicle is a bigger wash and looks it. The child may always pick it, and it does not move the position.

**What is stored**, as plain JSON through `ctx.storage`:

- `v`: the version of the shape.
- `position`: an id from the ladder.
- `finished`: the template's mark that the cycle on screen is over. In this game the touch that sends one vehicle off also brings the next one in, so it is false in every save.
- `bay`: the vehicle in the bay. `who` is its id in the roster; `cells` is the coarse grid of its surface, one character a patch, in rows (no body here, dried mud, soft mud, brown foam, white foam, wet, dull, shiny); `came` is how many patches held mud when it rolled in.
- `next`: the vehicle that waits, as `who`, `cells` and `dips`, so mud from the puddle and foam that landed on it are kept. `dips` is how many times it has been through the puddle, 0 to 2, so a third tap only splashes after a put-away too; nothing shows it.
- `seed`: the state of the seeded stream that picks the next vehicle and lays out its mud. It is not a count of anything.
- `shown`: the ids of the first showings that have played, so each plays once.

Not stored: the tool in hand (on load every tool hangs on the rack, where it came from); drips, bubbles, and the puddles and tracks on the floor, each of which lasts only seconds of attended play and leaves nothing to keep; and a scene in progress, whose outcome is saved when it starts. No clock is read and nothing changes while the game is put away. The largest legal state is under one kilobyte, and a test holds it under half the 64 KB cap.

## The characters and their fixed tastes

The vehicles are the characters: four die-cast toys with lamp eyes and a bumper mouth. The roster is four so that a child meets each one often. The tools, the mud, the foam and the water are the working objects and stay plain: no faces, no patterns, no motion beyond what the material does.

Each vehicle's want is always visible. At rest the tipper keeps glancing at the sponge, the fire engine at the hose and the tractor at the cloth, and the mixer keeps rocking its drum a little way round and back, wanting something on it. Its like and its dislike never change, each is set off the way the table says (this tool or this material, on this part or anywhere), and each works every time.

| Vehicle | Moves like | Likes | Cannot stand |
| --- | --- | --- | --- |
| **Tipper**, a yellow dump truck | Heavy and slow, with a bed that flaps like a lid | Foam anywhere on it: the bed bounces and its stack toots out bubbles | The cloth on its nose: a sneeze that throws the bed up and launches whatever foam is on it |
| **Fire engine**, red | Quick and eager, ladder first | The hose anywhere on it: the ladder shoots up, the siren whoops and it squirts a small arc back from its roof | The sponge on its eyes: it blinks, the wipers flap and it blows bubbles through its grille |
| **Tractor**, green | Lopsided and chugging, on two huge rear wheels | The cloth on its bonnet: it purrs in chugs and the flap on its exhaust lifts with each one | The hose on its exhaust pipe: a cough, a ring of steam, the flap clacking |
| **Mixer**, a blue cement mixer | Round and rolling | Anything on its drum: the drum turns and what is on it spirals. Dried mud jams the drum, so it only creaks until that mud is wet | The sponge on its wheels: it is ticklish, the wheels spin and foam flies off the tyres |

A dislike is as good to watch as a like, and a vehicle that is bewildered is never hurt. Every reaction starts on the touch that causes it and is to that touch: this tool, on this part, with this much foam on the bed. No vehicle reacts to the child: none thanks, praises, sulks, hurries, or notices the child stopping, leaving or coming back. The vehicle that waits idles and looks about; it never complains of waiting.

## The scenes

Each scene is a list of timed beats on the template's `scene.ts`, filled in from the state of play. Its outcome is saved when it starts, and any touch ends it with every beat at its end.

- **The drip** (a first showing, once). Cause: the first vehicle that ever rolls in with dried mud. Beats, about four seconds: it brakes with its nose under the hose on its hook; a drop swells at the nozzle and falls on a dried patch; the patch darkens to soft mud and a brown drip runs; the vehicle goes cross-eyed at it and shakes its nose; the mud is still there. Filled in from: which vehicle, and its dried patch nearest the nose. It shows, before the child tries, that water softens dried mud and does not remove it. The mark in `shown` is saved at the start.
- **The shine** (a consequence). Cause: the dab that leaves every patch of the vehicle shiny. Beats, about five seconds: a glint runs from that patch to the far end; the body rises on its springs; the lamps flash twice; its own horn; its own flourish (the bed tips, the ladder shoots up, the exhaust flap rattles, the drum turns once); it settles. Filled in from: which vehicle, and where the last dab landed. It plays every time the whole vehicle becomes shiny, and never on load.
- **The puddle** (the child's harder option). Cause: a tap on the puddle. Beats, about three seconds: the vehicle that waits revs, hops in, splashes twice and rolls back out muddier. Filled in from: which vehicle, and how muddy it already is. A third tap only splashes.
- **The send-off and the roll-in** (the ending, and the next beginning). Cause: a tap on the vehicle that waits. Beats, six to nine seconds: the one that waits honks; the one in the bay pulls back on its springs and goes, with the exit its surface gives it, as the last column of the grid says: clods for dried mud, splats and brown tracks for soft mud, blobs and bubbles for foam, a dog shake and wet lines for wet paint, a plain toot for dull paint, flashing lamps and a proud horn for shiny. The most common state leads and the others add their trails, which lie on the floor while the newcomer rolls in and then dry away over a few seconds of play. Then the newcomer rolls in, brakes, dips its nose, and its mud wobbles; another vehicle noses in at the door. Filled in from: who leaves and what is on it, who arrives and its mud.

**How a cycle ends and the next starts.** The child ends it. A vehicle in the bay, shining or half washed, stays as long as the child likes, and if the child does nothing, nothing new starts: no automatic next vehicle and no countdown. The next vehicle is visible and waiting at the door, and it comes in on the child's touch on it. That same touch sends the one in the bay off as it is. When a scene's outcome is saved the position has moved, the newcomer is in the bay and another waits. On load no scene replays: the vehicle in the bay stands as it was left, patch for patch, the tools hang on the rack, and the next vehicle waits.

## The records

Standing and check state are as `npm run education:find -- --id <pack id>` printed them on 2026-10-03. Each record is described by what the child does with this game's objects, never by its official wording.

### us-ca

Levels: `infant-toddler` for age 2 (sub-band: the indicator for 23 through 36 months of each foundation), and `preschool-tk` for ages 3 and 4 (sub-band: Early, 3 to 4½ years, at age 3; Early and Later, 4 to 5½ years, at age 4, where the two printed bands overlap). Age mapping: official, as the lookup prints. Gap: none printed. No lane label is printed for these ages.

- `edu.us-ca.infant-toddler.practical-life-feelings.objective.cognitive-development-strand-4-0-memory-4-1` (`us-ca 4.1`, Cognitive Development, Strand 4.0: Memory): department-published-foundation, confirmed. In the game: a wash is the same routine every time, and the child takes up the next tool before the game has shown anything.
  Limits taken: familiar routines only, so the routine never changes. Left open by Limits: the number of steps; three steps for soft mud and four for dried mud are the game's own choice.
- `edu.us-ca.infant-toddler.science.objective.cognitive-development-strand-1-0-exploration-1-1` (`us-ca 1.1`, Cognitive Development, Strand 1.0: Exploration): department-published-foundation, confirmed. In the game: the child picks a tool expecting something of it, and sees on the patch what it did.
  Limits taken: the predictions are simple, and nothing says a prediction has to be right, so no touch is treated as wrong. Left open by Limits: what the predictions are about; water, soap and mud are the game's own choice.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.health-strand-2-0-health-and-safety-habits-2-1` (`us-ca 2.1`, Health, Strand 2.0: Health and Safety Habits): department-published-foundation, confirmed. In the game: the steps of a wash come in an order, and a child at the earlier age needs only part of it to get somewhere. The foundation is about washing the child's own hands. The game washes a toy vehicle, so it takes the shape of a wash from this record and nothing about hands or health.
  Limits taken: knowing the steps, part of the order at the earlier age and most or all of it at the later. Left open by Limits: the statements list no steps and give no count; the order wet, soap, rinse, dry is the game's own choice. A note beneath the statements describes a routine in which wetting, soap, rinsing and drying come in that order, among other steps the game leaves out.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-3` (`us-ca 2.3`, Science, Strand 2.0: Physical Science): department-published-foundation, confirmed. In the game: the child changes mud, foam and paint with water, soap and a cloth, and sees and hears each change.
  Limits taken: exploring at both ages; texture and colour are among the examples the statement gives. The statement also has the child describe the changes, and at the later age explain them. The game hears nothing a child says, so describing and explaining are left to the child and whoever is beside them, and the game is designed from the exploring only. Left open by Limits: which materials; mud, foam and water are the game's own choice.

Looked at and not used: `us-ca 5.2` of Science Strand 5.0, on how tools help people. At the earlier age it is with adult support, which a game cannot supply, so the game does not rest on it.

### nl

Levels: `peuters` for ages 2 and 3, and for a child who has only just turned four (sub-band: up to the fourth birthday, when a child may start school); `fase-1` for age 4 (sub-band: groep 1). Age mapping: convention, as the lookup prints: the mapping from groep to age is convention, not law. At age 4 the lookup also returns the `einde-po` lane, labelled end-of-primary goals; the game uses no record from it. For the order of the steps of a wash the game names no Dutch record, and nothing stands in its place.

- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-verschijnselen-uit-natuurkunde-en-techniek-materialen-stoffen-en-voorwerpen-1` (`nl Materialen, stoffen en voorwerpen / 1`, peuters): curriculum-institute-guidance, confirmed. In the game: the child tries water, soap and a cloth on mud, foam and paint.
  Limits taken: experimenting, with no question to answer and no result to reach, so nothing in the game has to be finished. Left open by Limits: which materials; the game's own choice.
- `edu.nl.peuters.science.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-verschijnselen-uit-natuurkunde-en-techniek-natuurkundige-verschijnselen-2` (`nl Natuurkundige verschijnselen / 2`, peuters): curriculum-institute-guidance, confirmed. In the game: the jet from the hose pushes foam off the vehicle and along the floor.
  Limits taken: discovering and wondering only, with no explaining and no measuring; of water the record names only its force, so the game rests on it for the push of the jet and for nothing else water does.
- `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-de-samenleving-veilige-leefomgeving-1` (`nl (Veilige) leefomgeving / 1`, peuters): curriculum-institute-guidance, confirmed. In the game: the child looks after a thing by washing it.
  Limits taken: none stated beyond paying attention and taking care. Left open by Limits: the task and what the surroundings are; washing a toy vehicle is the game's own choice.
- `edu.nl.peuters.practical-life-feelings.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-peuters-de-samenleving-veilige-leefomgeving-2` (`nl (Veilige) leefomgeving / 2`, peuters): curriculum-institute-guidance, confirmed. In the game: the child handles three tools to get a thing clean.
  Limits taken: discovering only; handling tools is given as an example. Left open by Limits: which tools; sponge, hose and cloth are the game's own choice. The record states no order of steps.
- `edu.nl.fase-1.practical-life-feelings.objective.inhoudskaart-orientatie-op-jezelf-en-de-wereld-fase-1-de-samenleving-veilige-leefomgeving-2` (`nl (Veilige) leefomgeving / 2`, fase 1): curriculum-institute-guidance, confirmed. In the game: the same handling of tools with care, for a child of 4.
  Limits taken: discovering only; it says what a school offers in fase 1 and names no year. Left open by Limits: which tools; the game's own choice. The record states no order of steps.

### Where the two differ

- **The order of the steps.** The California records include a foundation about the next step of a known routine and one about the order of washing hands. No Dutch record named here states an order of steps. On the order the game follows California, and what it is designed from in the Netherlands does not include the order.
- **Describing.** California's `us-ca 2.3` has the child describe a change; the Dutch record on materials asks only for experimenting. The game follows neither further than exploring, since it cannot hear a child.
- **Water.** The Dutch record on physical phenomena names the force of water. No California record named here names water at all. For the push of the jet the game follows the Dutch record, and it rests nothing about water on California.
- **Standing and age.** The California records are foundations published by a state department, for 23 to 36 months and for 3 to 5½ years. The Dutch records are guidance from the curriculum institute, for children before school and for the first school years, and say what is offered, not what a child can do. The claim words each set by its own standing, and the game takes each set's ages from its own lookup; neither is used for the other.

### The claim

Muddy Truck Wash is designed from four California learning foundations published by a state department (`us-ca 4.1` on memory and `us-ca 1.1` on exploration for infants and toddlers, and `us-ca 2.1` on health habits, taken only as the shape of a wash, and `us-ca 2.3` on physical science for preschool and transitional kindergarten), and from five pieces of guidance from the Dutch curriculum institute SLO (the peuter content cards on materials, on the force of water, and on looking after one's surroundings and handling tools, and the fase 1 card on handling tools with care). All nine records are confirmed. From the California foundations the game takes the order of a wash and exploring how a material changes; from the Dutch guidance it takes experimenting with materials, the push of water, and looking after a thing and handling tools with care, and no order of steps. It says nothing about what any child has reached.

## The look

**Enamel toy cars**, the first look reserved for the game in the ledger of `docs/art-direction.md`. Spiked on the game's real scene before any play; the frame rate at DPR 2 is the lead's to take on a graphics card.

**What a screenshot shows.** Die-cast toy vehicles in hard gloss enamel, chipped to bare zinc on their edges, with black rubber tyres and lamp eyes, standing on dark wet concrete in a tiled wash bay. No wood, no grain, no pale playroom: the floor is nearly black and gives back a faded copy of whatever stands on it.

**Palette.** The vehicles carry the colour and the room stays dark and cool, so figure and ground never meet.

| Thing | Colour |
| --- | --- |
| Tipper | enamel yellow `#f5b301`, bed orange `#f06a0c` |
| Fire engine | enamel red `#d61f2c`, trim cream `#f7ecd2` |
| Tractor | enamel green `#23a04a` |
| Mixer | enamel blue `#1668d8` |
| Chassis, grilles | charcoal `#2b2d33` |
| Bare metal: bumpers, chips, brackets | zinc `#c4c8cc` |
| Tyres | rubber black `#16171a` |
| Lamp eyes | warm white `#fff6dc`, pupils near black |
| Floor | wet slate, about `#1e232a`, darker on the pad; pad outline worn yellow |
| Wall | glazed teal tiles, about `#294d54`, dark joints |
| Yard | packed dirt `#785938`, hedge green beyond |
| Dried mud | pale tan, cracked |
| Soft mud | dark wet brown |
| Foam | white with blue shade; browned where it lifted mud |
| Sponge, hose, cloth | plain yellow, green with a red nozzle, cream with two red stripes |

**Materials.** One shader, `view/enamel.ts`, draws every solid thing, with a material class per vertex: enamel, rubber, bare metal, lamp glass, soft (sponge, cloth, suds).

- Enamel is lit from a small procedural matcap: soft light from the upper left, one small sharp glint, a softbox, and a horizon of pale sky over dark floor. Upward faces also give back a long light low on the far wall, which slides across them when the body rocks.
- Chips are bare zinc where noise crosses a threshold on the chamfers only. A flat panel never chips.
- What the wash leaves is read from the vehicle's coarse grid, written into two 12 by 7 textures and blended with noise so patches have blobby edges: dried mud pale and cracked, soft mud dark and glistening, foam in bubble cells, water as darker paint with beads and thin runs, dull paint under a film of dust, polished paint deeper with two crisp streaks of light across each panel.
- So the mirror gloss the look is named for is what the child makes: a vehicle rolls in dusty and muddy, and the hard shine appears under the cloth.
- The floor and the wall are one flat shader each (`view/stage.ts`): speckled slate with a darker wet pad and two streaks of light lying in it, and big glazed tiles. The floor also shows what has landed on it (water, mud, foam) from one small texture.

**Lighting.** None is computed. There are no lights, no shadow maps and no post pass: light is in the matcap, in the wall light the upward faces give back, and in the copy under the floor.

**Shapes.** Everything is built from four die-cast shapes (`shapes.ts`): chamfered boxes, turned cylinders and cones, domes, and rings. Edges are hard with a small chamfer, panels are flat, and nothing is soft except the sponge, the cloth and the suds. One merged body per vehicle, its one moving part, instanced wheels, two pupils and two lids.

**Working objects stay plain.** The sponge, the hose and the cloth have no face, no pattern beyond the cloth's two stripes, and no motion of their own: they hang, follow the finger, and do their work. The mud, foam and water show one thing each. The look and the comedy are on the vehicles, the bay and the floor.

**Motion rules.**

- A vehicle is heavy metal on springs: it dips under the finger, leans away from a push, and rings back. Its tyres flatten under whichever end is pressed.
- Each vehicle has its own weight, tempo and funniest part (`moves` in its file): no two share spring numbers, breath, blink or the way the part is thrown.
- Eyes follow the finger while it works, wander by themselves at rest, and blink on their own clock.
- Nothing eases in without weight: things that fly are thrown, fall under gravity, and land where they stop.
- No camera shake and no impact pause (a default awaiting the owner). The size of an answer comes from the chain it sets off.
- The idle glow is a warm light on the edges of the tools on the rack, which swell a little with it. The vehicles take no glow: on a body that size it reads as haze, and they are alive already. The ghost hand is a pale mitten that reaches in from the open floor.

**How each tier keeps the look** (`TIERS` in `config.ts`; tier 0 is full).

| Tier | Pixel ratio | Copy under the floor | Flying things drawn |
| --- | --- | --- | --- |
| 0 | 2 | yes | 260 |
| 1 | 1.5 | yes | 200 |
| 2 | 1.25 | no | 130 |
| 3 | 1 | no | 80 |

A tier changes drawing only. Without the copy the pad is still dark, wet and streaked, and the vehicles are unchanged, so the lowest tier still looks like the game.

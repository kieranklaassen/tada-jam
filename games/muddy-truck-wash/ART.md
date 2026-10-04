<!-- template: cartridge/ART.md v1 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, and its youngest age, 2, governs every choice below.

- **Cue table.** The table in wordless clarity has no row below 3, so its 3 to 4 row is the ceiling and the game cuts further. From its "Avoid" column the game takes: no text, numeral or icon to decode; no spoken instruction; no verdict; one live activity (one vehicle in the bay); and no tool that means nothing when it is touched. All three tools are in the scene from the first frame, and each one changes whatever it touches at once, so none is there before it means something.
- **The pack's rule for the range** (pack: game-design, ages-2-to-4.md). Every touch is answered and no order of touches is a dead end. The targets a wash needs (the vehicle, three tools, the vehicle that waits, the puddle) are each at least 100 logical pixels across, well apart, and none is in the bottom strip. Everything works with a tap: a tap on a tool takes it in hand, and a tap on the vehicle is one full dab of that tool. A rub is the same dab repeated along the finger's path; it survives a lifted finger, and whatever part of it was done stays done. No pinch, tilt, shake or double tap. One loved action, covering and uncovering, offered again and again. A wash fits in one to three minutes. The sizes in pixels here are for a tablet held wide, 1024 by 768 logical pixels and up, the surface the jam is made for; on a narrower surface the camera keeps the whole bay in view and everything in it is smaller. There are three tools, and never more than two vehicles that a tool or a wash can reach: the one in the bay and the one that waits at the door. The other two of the roster are seen far back in the yard, small, waiting their turn side by side on a hill. Whatever else looks touchable answers a touch and changes nothing of a wash: either of the two on the hill toots and hops where it stands, the roller brush behind the bay spins, the pinwheel in the yard whirls, the lamp swings, and the things on the shelf jump.
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
| **Dried mud** (pale, cracked) | A knock: a thud, a crack runs across, crumbs trickle | A dry rasp: crumbs and dust, suds dribble over the top and slide off; the mud stays | It darkens from the finger outward and turns to soft mud, a hiss that becomes a gurgle | A scratch and a puff of dust; the mud stays | Plates of mud crack off on the way out, each with a dry clack, and lie in a row of clods |
| **Soft mud** (dark, wet) | A squelch and a dent that slowly fills | It lifts into brown foam that stays on the vehicle, with a wet scrub squeak | It glistens, slumps and drips brown, and clings, with a muffled splutter | It smears along the rub with a wet slither: of the next three patches under the finger, each one that is clean gets a thin smear, and then the cloth is clean | Splats fly off the wheels and land with wet slaps; brown tyre tracks |
| **Foam** (brown from mud, white on clean paint) | Bubbles pop off it, plip by plip; the foam stays | More foam, taller, with a soft fizz, and bubbles drift off | It slides off in rafts that sail to the drain with a long slosh; clean wet paint | It is pushed along the rub with a soft crackle of bubbles: the foam moves with the cloth onto clean paint and the paint behind it is left wet, so there is never more foam than before; the cloth wears a foam beard | Blobs of foam peel off behind with soft plops and a line of bubbles follows |
| **Wet paint** | A squeaky wet slide, drops scatter | Thin white foam that slides and runs in streaks, a wet slurp | Water sheets off the sills with a steady drumming, drops bounce | It dries and shines, a rising squeak | The vehicle shakes like a dog first, with a rattle; wet tyre lines |
| **Dull paint** (clean, dry) | The body bounces and the metal rings | Thick white foam that stands in peaks, a dry squeak going soft | Beads of water form with a light patter; wet paint | It shines, with one glint and a short low squeak | A plain toot and off |
| **Shiny paint** | A dull fingerprint and a soft pat | Foam hides the shine, with a smooth slippery hush | Fat round drops race off with a quick tinkle; wet paint | A higher squeak and a second glint; still shiny | Lamps flash, a glint runs nose to tail, a proud horn |

The wrong use of each tool works and is funny: the cloth on mud paints with it, the cloth on foam pushes a beard of it about, the sponge on a shiny vehicle buries it in foam, the hose on dried mud makes it worse to look at before it is better. Each vehicle adds its own row of reactions (see the characters), and the puddle makes the vehicle that waits muddier when the child taps it, up to two times.

**What the cloth does with mud it has itself laid down: it never carries it on.** A smear is thin mud of its own kind, and a patch holds it as its own thing. It is not a seventh row of the grid: it looks and sounds as soft mud does, to the sponge and the hose it is soft mud (soap lifts it into foam and water leaves it clinging), and when a wash is judged a smeared patch is a patch that holds mud. Under the cloth a smear slides a little, with the wet slither soft mud gives the cloth, and stays where it is, so the touch is answered and nothing spreads. The cloth picks mud up only from soft mud, never from a smear, whether this rub laid it or an earlier one did, and a muddy cloth is clean again three patches on whatever those patches hold. So each time the cloth crosses a patch of soft mud it lays at most three smears, on the next three patches under the finger, and no smear ever feeds another, however long or often the cloth is rubbed. The mud on the cloth is not kept: a cloth that goes back to the rack is clean, and so it is on load. A put-away changes nothing else, since every smear is in the saved grid. A wrong attempt stays small, where it happened, and is mended by one stroke of the sponge and one of the hose.

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
- The cloth on soft mud: a short brown smear along the rub, on paint that was clean, and never more than that.
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

The position moves one step up after a wash that went well, one down after one that went badly, and stays after a mixed one, between cycles only. The new position lays out the mud of the vehicle that then comes to the door; the one rolling in was already standing there with its mud, so a move shows one wash later. A saved position wins over the age. Nothing shows the position or that it moved: the vehicles that roll in are simply muddier or less muddy.

**The harder option the child can see and pick.** A mud puddle lies beside the vehicle that waits. A tap on the puddle sends that vehicle through it, and it comes out with more soft mud, up to two times. A muddier vehicle is a bigger wash and looks it. The child may always pick it, and it does not move the position.

**What is stored**, as plain JSON through `ctx.storage`:

- `v`: the version of the shape.
- `position`: an id from the ladder.
- `finished`: the template's mark that the cycle on screen is over. In this game the touch that sends one vehicle off also brings the next one in, so it is false in every save.
- `bay`: the vehicle in the bay. `who` is its id in the roster; `cells` is the coarse grid of its surface, one character a patch, in rows (no body here, dried mud, soft mud, a smear the cloth left, brown foam, white foam, wet, dull, shiny); `came` is how many patches held mud when it rolled in.
- `next`: the vehicle that waits, as `who`, `cells` and `dips`, so mud from the puddle and foam that landed on it are kept. `dips` is how many times it has been through the puddle, 0 to 2, so once it has been through twice a tap on the puddle only splashes, after a put-away too; nothing shows it.
- `seed`: the state of the seeded stream that lays out the mud of each vehicle as it comes to the door. It is not a count of anything, and it does not pick who comes: the roster comes in its own order, round and round, so every vehicle is back within four washes.
- `shown`: the ids of the first showings that have played, so each plays once.

Not stored: the tool in hand (on load every tool hangs on the rack, where it came from); drips, bubbles, and the puddles and tracks on the floor, each of which lasts only seconds of attended play and leaves nothing to keep; a scene in progress, whose outcome is saved when it starts; who stands in the queue and what they wear there (the queue is the two of the roster that are neither in the bay nor at the door, and each wears the same fresh splashes every time, for show: a vehicle's own mud is laid out when it comes to the door); and the roller brush, the pinwheel, the lamp and the things on the shelf, which only turn, swing or jump. No clock is read and nothing changes while the game is put away. The largest legal state is under one kilobyte, and a test holds it under half the 64 KB cap.

## The characters and their fixed tastes

The vehicles are the characters: four die-cast toys with lamp eyes and a bumper mouth. The roster is four so that a child meets each one often. The tools, the mud, the foam and the water are the working objects and stay plain: no faces, no pattern but the two stripes that make the cloth a cloth, no motion beyond what the material does.

Each vehicle's want is always visible while it stands in the bay or at the door. At rest there the tipper keeps glancing at the sponge, the fire engine at the hose and the tractor at the cloth; the mixer, wherever it stands, keeps rocking its drum a little way round and back, wanting something on it, and where dried mud has jammed the drum it keeps trying: the drum strains a hair each way against the mud and cannot turn. Its like and its dislike never change, each is set off the way the table says (this tool or this material, on this part or anywhere), and each works every time.

| Vehicle | Moves like | Likes | Cannot stand |
| --- | --- | --- | --- |
| **Tipper**, a yellow dump truck | Heavy and slow, with a bed that flaps like a lid | Foam anywhere on it: the bed bounces and its stack toots out bubbles | The cloth on its nose: a sneeze that throws the bed up and launches whatever foam is on it |
| **Fire engine**, red | Quick and eager, ladder first | The hose anywhere on it: the ladder shoots up, the siren whoops and it squirts a small arc back from its roof | The sponge on its eyes: it squeezes its eyes shut and blows bubbles through its grille |
| **Tractor**, green | Lopsided and chugging, on two huge rear wheels | The cloth on its bonnet: it purrs in chugs and the flap on its exhaust lifts with each one | The hose on its exhaust pipe: a cough, a ring of steam, the flap clacking |
| **Mixer**, a blue cement mixer | Round and rolling | Anything on its drum: the drum turns and what is on it spirals. Dried mud jams the drum, so it only creaks until that mud is wet | The sponge on its wheels: it is ticklish, the wheels spin and foam flies off the tyres |

A dislike is as good to watch as a like, and a vehicle that is bewildered is never hurt. Every reaction starts on the touch that causes it and is to that touch: this tool, on this part, with this much foam on the bed. No vehicle reacts to the child: none thanks, praises, sulks, hurries, or notices the child stopping, leaving or coming back. The vehicle that waits idles and looks about; it never complains of waiting. Nor do the two in the queue on the hill: they stand turned toward the bay and keep glancing at it, and at a sneeze, a cough, a siren or the start of a shine there they look and blink, and make no face at it.

## The scenes

Each scene is a list of timed beats on the template's `scene.ts`, filled in from the state of play. Its outcome is saved when it starts, and any touch ends it with every beat at its end. One kind of touch does not: a small child tapping twice. A second tap on the vehicle at the door within about a second of the tap that sent the other off gets a toot while the send-off plays on, and a second tap on the puddle within about a second of the first gets a plip while the trip through it plays on.

- **The drip** (a first showing, once). Cause: the first vehicle that ever rolls in with dried mud; on a first visit that starts at `dried-patches` that is the vehicle already in the bay, and the showing plays in the first seconds of that visit. Beats, about four seconds: the vehicle shuffles until a dried patch on its nose is under the tap that hangs over the bay on the rack's long arm; a drop swells at the tap and falls on the patch; the patch darkens to soft mud and a brown drip runs; the vehicle goes cross-eyed at it and shakes its nose; the mud is still there. Filled in from: which vehicle, and the dried patch on its nose. The arriving mud at `dried-patches` always puts that patch there, open to the sky, and until the showing has played neither mud from the puddle nor thrown foam lands on it. The tap lets a drop go in this scene only; the drop is not from the hose, so that the nose is not hidden behind the rack as it lands. The tap is not a tool: touched at any other time it swings on its arm with a clink and gives no water. It shows, before the child tries, that water softens dried mud and does not remove it. The mark in `shown` and the patch turned to soft mud in `bay.cells` are saved at the start.
- **The shine** (a consequence). Cause: the dab that leaves every patch of the vehicle shiny. Beats, about five seconds: a glint runs from that patch to the far end; the body rises on its springs; the lamps flash twice; its own horn; its own flourish (the bed tips, the ladder shoots up, the exhaust flap rattles, the drum turns once); it settles. Filled in from: which vehicle, and where the last dab landed. It plays every time the whole vehicle becomes shiny, and never on load.
- **The puddle** (the child's harder option). Cause: a tap on the puddle. Beats, about three seconds: the vehicle that waits revs, hops in, splashes twice and rolls back out muddier. Filled in from: which vehicle, and how muddy it already is. Once the vehicle has been through twice, a tap on the puddle only splashes and changes no field. Saved at the start of the first and the second: the added mud in `next.cells`, and `next.dips` one higher.
- **The send-off and the roll-in** (the ending, and the next beginning). Cause: a tap on the vehicle that waits. Beats, six to nine seconds: the one that waits honks; the one in the bay pulls back on its springs and goes, with the exit its surface gives it, as the last column of the grid says: clods for dried mud, splats and brown tracks for soft mud, blobs and bubbles for foam, a dog shake and wet lines for wet paint, a plain toot for dull paint, flashing lamps and a proud horn for shiny. The most common state leads and the others add their trails, which lie on the floor while the newcomer rolls in and then dry away over a few seconds of play. Then the newcomer rolls in, brakes, dips its nose, and its mud wobbles; another vehicle noses in at the door. That other is the head of the queue: it hops off along the hill, out of sight past its far end, and comes round to the door in the mud laid out for it. The one beside it hops along the hill into its place, and the one that left hops up onto the hill from behind the bay, splashed again, into the place left free. Filled in from: who leaves and what is on it, who arrives and its mud.

**How a cycle ends and the next starts.** The child ends it. A vehicle in the bay, shining or half washed, stays as long as the child likes, and if the child does nothing, nothing new starts: no automatic next vehicle and no countdown. The next vehicle is visible and waiting at the door, and it comes in on the child's touch on it. That same touch sends the one in the bay off as it is. The send-off and the roll-in saves at its start: `position` as the judged wash moved it; `bay` as the newcomer, with its `cells` and `came`; `next` as the vehicle that then comes to the door, with its `cells` and with `dips` at 0; and `seed` as laying out that vehicle's mud left it. On load no scene replays: the vehicle in the bay stands as it was left, patch for patch, the tools hang on the rack, and the next vehicle waits. A first showing that has not played is not a replay, and it is still owed: if the game was put away before it started, nothing plays when the game is opened again, the vehicle stands in the bay with its dried mud as it was left, and the showing starts at the child's first touch.

## The records

Standing and check state are as `npm run education:find -- --id <pack id>` printed them on 2026-10-03. Each record is described by what the child does with this game's objects, never by its official wording.

### us-ca

Levels: `infant-toddler` for age 2 (sub-band: the indicator for 23 through 36 months of each foundation), and `preschool-tk` for ages 3 and 4 (sub-band: Early, 3 to 4½ years, at age 3; Early and Later, 4 to 5½ years, at age 4, where the two printed bands overlap). Age mapping: official, as the lookup prints. Gap: none printed. No lane label is printed for these ages.

- `edu.us-ca.infant-toddler.practical-life-feelings.objective.cognitive-development-strand-4-0-memory-4-1` (`us-ca 4.1`, Cognitive Development, Strand 4.0: Memory): department-published-foundation, confirmed. In the game: a wash is the same routine every time, and the child takes up the next tool before the game has shown anything.
  Limits taken: familiar routines only, so the routine never changes. Left open by Limits: the number of steps; three steps for soft mud and four for dried mud are the game's own choice. Taken in part: the foundation also has the child remember what a place and the people in it are like, and now and then tell or play out something that happened a little while ago. The game takes neither, so it is designed from knowing the next step of a familiar routine only.
- `edu.us-ca.infant-toddler.science.objective.cognitive-development-strand-1-0-exploration-1-1` (`us-ca 1.1`, Cognitive Development, Strand 1.0: Exploration): department-published-foundation, confirmed. In the game: the child picks a tool expecting something of it, and sees on the patch what it did.
  Limits taken: the predictions are simple, and nothing says a prediction has to be right, so no touch is treated as wrong. Left open by Limits: what the predictions are about; water, soap and mud are the game's own choice.
- `edu.us-ca.preschool-tk.practical-life-feelings.objective.health-strand-2-0-health-and-safety-habits-2-1` (`us-ca 2.1`, Health, Strand 2.0: Health and Safety Habits): department-published-foundation, confirmed. In the game: the steps of a wash come in an order, and a child at the earlier age needs only part of it to get somewhere. The foundation is about washing the child's own hands. The game washes a toy vehicle, so it takes the shape of a wash from this record and nothing about hands or health.
  Limits taken: knowing the steps, part of the order at the earlier age and most or all of it at the later. Left open by Limits: the statements list no steps and give no count; the order wet, soap, rinse, dry is the game's own choice. A note beneath the statements describes a routine in which wetting, soap, rinsing and drying come in that order, among other steps the game leaves out.
- `edu.us-ca.preschool-tk.science.objective.science-strand-2-0-physical-science-2-3` (`us-ca 2.3`, Science, Strand 2.0: Physical Science): department-published-foundation, confirmed. In the game: the child changes mud, foam and paint with water, soap and a cloth, and sees and hears each change.
  Limits taken: exploring at both ages; texture and colour are among the examples the statement gives. The statement also has the child describe the changes, and at the later age explain them. The game hears nothing a child says, so describing and explaining are left to the child and whoever is beside them, and the game is designed from the exploring only. Not in Limits: which materials; mud, foam and water are the game's own choice.

Looked at and not used: `us-ca 5.2` of Science Strand 5.0, on how tools help people. At the earlier age it is with adult support, which a game cannot supply, so the game does not rest on it. For the push of water, and for looking after a thing and handling tools with care, the game names no California record, and nothing stands in their place.

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

Muddy Truck Wash is designed from four California learning foundations published by a state department (for infants and toddlers, `us-ca 4.1` on memory, taken in part, as knowing the next step of a familiar routine, and `us-ca 1.1` on exploration; for preschool and transitional kindergarten, `us-ca 2.1` on health habits, taken only as the shape of a wash, and `us-ca 2.3` on physical science, taken in part, as the exploring), and from five pieces of guidance from the Dutch curriculum institute SLO (the peuter content cards on materials, on the force of water, and on looking after one's surroundings and handling tools, and the fase 1 card on handling tools with care). All nine records are confirmed. From the California foundations the game takes the order of a wash and exploring how a material changes; from the Dutch guidance it takes experimenting with materials, the push of water, and looking after a thing and handling tools with care, and no order of steps. It says nothing about what any child has reached.

## The look

**Enamel toy cars**, the first look reserved for the game in the ledger of `docs/art-direction.md`. Spiked on the game's real scene before any play. The owner said no to the look as it first stood (too bare), and a look pass filled the frame and gave the vehicles faces in the same style; this guide says what is in the frame now. The frame rate at DPR 2 is the lead's to take on a graphics card.

**What a screenshot shows.** Die-cast toy vehicles in hard gloss enamel, chipped to bare zinc on their edges, with black rubber tyres, lamp eyes and a mouth in the bumper, in a wash bay that is a place. No wood, no grain, no pale playroom.

- **The bay.** Dark wet concrete laid in slabs, with a painted pad, a striped kerb along its front, a drain, and thin standing water that gives back the window's light. The floor is nearly black on the pad and gives back a faded copy of whatever stands on it. The back wall is glazed teal tiles under a row of small cream and yellow tiles, with sea-green plaster above; on it a red water pipe, a zinc shelf of soap (three bottles, a jar of bubble mix, two bars), and a window with sky and a cloud going by. A green enamel lamp hangs on a rod over the rack's end. A blue and white roller brush stands at the wall behind the tail of the vehicle and turns slowly. The rack with the three tools stands toward the child on the left; the hose is wound on a reel with a dark back plate, so its coil is a filled wheel and never an empty ring.
- **The yard.** Through the door on the right: packed dirt with two ruts and the mud puddle (toward the child from the vehicle that waits, with clear dirt between them), three old tyres by the door post, a pinwheel of five vanes turning in the wind, a flat-topped hill with toy trees, and behind it hills, a hedge and a sky with slow clouds.
- **The queue.** The two vehicles of the roster that are neither in the bay nor at the door stand side by side on the hill, turned toward the bay, in fresh splashes of mud, breathing, blinking and glancing at the wash.

**What is funny in it.** The vehicles. Each has a mouth that smiles, opens, turns down at the corners and puts its tongue out, lids that work as brows, eyes that cross and squeeze shut, and a body that jumps, shudders and nods (`faces.ts`). The right use of a tool gets a small pleased face. The wrong use gets the joke: the cloth on dried mud gets dust up its nose and it sneezes a puff of it off its front; the cloth in soft mud and it puts its tongue out, cross-eyed, while the cloth comes away with a blot of mud on it; the hose on mud and it sputters mud off its lip; cold water on dry paint and it jumps and shivers; the sponge on dried mud and it squirms at the scratching. The cloth on foam wears a beard of foam; foam or a fingerprint on a shine and it goes cross-eyed trying to see it; sent off muddy, it goes with its tongue out, and its horn has mud in it: its own toot, two blubs coming up through it and a pip on its high note, with nothing in it that falls or buzzes. Left to itself, the muddy one at the door now and then goes cross-eyed at the mud on its own nose and puts its tongue out as far as it will go to reach it: the first time a few seconds after the bay goes quiet, then every ten seconds or so, without a sound, and never over a scene or while a finger is working. It is about its mud, not about waiting. A face is always about what is on the vehicle or what touches it, never about the child, and none is sad.

**Palette.** The vehicles carry the strongest colour. The bay stays dark and cool behind them and the yard is daylight, lower in contrast than anything that can be touched.

| Thing | Colour |
| --- | --- |
| Tipper | enamel yellow `#f5b301`, bed orange `#f06a0c` |
| Fire engine | enamel red `#d61f2c`, trim cream `#f7ecd2` |
| Tractor | enamel green `#23a04a` |
| Mixer | enamel blue `#1668d8` |
| Chassis, grilles | charcoal `#2b2d33` |
| Bare metal: bumpers, chips, brackets, the shelf | zinc `#c4c8cc` |
| Tyres | rubber black `#16171a` |
| Lamp eyes | warm white `#fff6dc`, pupils near black |
| Mouth | a cream plate with a zinc rim; dark inside, white teeth, a pink tongue |
| Floor | wet slate, about `#1e232a`, darker on the pad; pad outline and kerb stripes worn yellow |
| Wall | glazed teal tiles, about `#294d54`, dark joints; a row of cream and yellow tiles; sea-green plaster above |
| Shelf things | pink `#d9578c`, aqua `#2aa7a2`, violet `#7460c4`, pale glass, soap cream |
| Roller brush | blue `#2f7fe0` with pale bands |
| Yard | packed dirt `#785938`; the hill the same dirt with a grass top `#3f8a47`; toy trees `#2f7d43`; hills and hedge in three greens; sky pale to blue |
| Dried mud | pale tan, cracked, in low clods |
| Soft mud | dark wet brown, in sagging blobs |
| Foam | white with blue shade, in puffs; browned where it lifted mud |
| Sponge, hose, cloth | plain yellow, green with a red nozzle, cream with two red stripes |

**Materials.** One shader, `view/enamel.ts`, draws every solid thing, with a material class per vertex: enamel, rubber, bare metal, lamp glass, soft (sponge, cloth, suds, the roller's flaps, the hill and the trees).

- Enamel is lit from a small procedural matcap: soft light from the upper left, one small sharp glint, a softbox, and a horizon of pale sky over dark floor. Upward faces also give back a long light low on the far wall, which slides across them when the body rocks.
- Chips are bare zinc where noise crosses a threshold on the chamfers only. A flat panel never chips.
- What the wash leaves is read from the vehicle's coarse grid, written into two 12 by 7 textures and blended with noise so patches have blobby edges: dried mud pale and cracked, soft mud dark and glistening, foam in bubble cells, water as darker paint with beads and thin runs, dull paint under a film of dust, polished paint deeper with two crisp streaks of light across each panel. Foam with wet paint under it sends a few thin streaks of suds down that paint.
- Mud and foam have body (`view/lumps.ts`): on every patch that holds either, lumps stand out from the paint, one instanced set a vehicle. Dried mud is a flat pale clod, soft mud a dark blob that sags, foam two white puffs. Foam is thin where wet paint lies under or beside it and thick on dry paint, and it stands taller for a moment where the sponge has just piled it up.
- So the mirror gloss the look is named for is what the child makes: a vehicle rolls in dusty and muddy, and the hard shine appears under the cloth.
- The floor, the wall and the sky are one flat shader each (`view/stage.ts`). The floor: speckled slate in slabs, the darker wet pad with two streaks of light in it, the kerb, standing water with a slow shimmer, the yard's dirt, ruts and puddle, and what has landed on it (water, mud, foam) from one small texture. The wall: tiles, the row of small tiles, plaster warm under the lamp, and the window's sky. The sky: a horizon, two rows of hills, a hedge and clouds.
- The mouth is one small shader on a plate (`view/mouth.ts`), drawn from four numbers: how far the corners are up, how far it is open, how far the tongue is out, and a skew.

**Lighting.** None is computed. There are no lights, no shadow maps and no post pass: light is in the matcap, in the wall light the upward faces give back, in the warm patch painted on the plaster under the lamp, and in the copy under the floor.

**Shapes.** Everything solid is built from four die-cast shapes (`shapes.ts`): chamfered boxes, turned cylinders and cones, domes, and rings. Edges are hard with a small chamfer, panels are flat, and nothing is soft except the sponge, the cloth, the suds, the brush, the hill and its trees. One merged body per vehicle, its one moving part, instanced wheels, two pupils, two lids, a mouth plate and its lumps. Everything of the place that stands still is one mesh (`place.ts`), built once; the roller, the pinwheel, the lamp and the shelf's things are a mesh each because they move.

**Working objects stay plain.** The sponge, the hose and the cloth have no face, no pattern beyond the cloth's two stripes, and no motion of their own: they hang, follow the finger, and do their work. What the cloth has picked up shows on it (a beard of foam, a blot of mud) and that is all. The mud, foam and water show one thing each. The place is lower in contrast than the tools and the vehicles, none of it is a tool, and none of it has a face. No word, letter, numeral or sign is drawn anywhere.

**What answers a touch.** Everything a wash needs, as before. Beyond that: a vehicle in the queue toots and hops where it stands; the roller brush spins up with a whirr and throws a little spray; the pinwheel whirls; the shelf's things jump with a clink and the jar lets three bubbles go; the lamp swings on its rod and rings; the tap swings. Five things that stand still answer where the finger is, each with its own sound: the suds bucket slops and lets suds and bubbles up; a pool of standing water plops and throws up a crown of drops; the drain glugs and bubbles come up through its grate; the window squeaks and gleams where the finger was; the pipe rings hollow and the drops under it are shaken off. Under the hose a pool or the drain answers so and the jet lands as it does anywhere on the floor. A tool in hand that waits above the vehicle is a tool there too: a touch on it hangs it up, as a touch on its place on the rack does. A tap on the bare wall, or on the air over the yard, gets a knock and a small puff where the finger was. A second finger or a palm that comes down while one finger works gets a soft knock. A finger that comes down straight after a rub is a touch of its own, on the vehicle or off it. The rub that sets the shine off goes on being answered while the shine plays. A touch that ends a scene lands every vehicle where it was going at once, and what the rest of the scene would have sounded and thrown is left out, so nothing is heard that is not seen. None of these changes anything of a wash, and none is saved. A vehicle's like or dislike of a tool on a part of it is felt when the finger is on that part or when the patch the touch was given to is of it, so a sponge a little way under a tyre, which foams that tyre, tickles too. A touch is on whatever is drawn under the finger: of the solid things the finger's ray meets, the one nearest the eye answers (`view/pick.ts`), each vehicle on the very triangles it is drawn from (`solid.ts`) with the gaps in a patch (between the rungs of a ladder, the posts of a cab) counted as that patch, so the vehicle that waits never answers as the one in the bay, nor the pinwheel as a vehicle; where nothing solid is under the finger the tools, the puddle and the edge of the vehicle in the bay answer a little way off their own shape. As the child sees them, the nose of the vehicle that waits stands clear of the tail of the one in the bay, and the puddle clear of both. The tractor's steering wheel is a solid dished disc and the hose's coil is backed by its reel, so neither is an open ring.

**Motion rules.**

- A vehicle is heavy metal on springs: it dips under the finger, leans away from a push, and rings back. Its tyres flatten under whichever end is pressed.
- Each vehicle has its own weight, tempo and funniest part (`moves` in its file): no two share spring numbers, breath, blink or the way the part is thrown. A face is the same few numbers for every vehicle, and each wears it on its own body: the tipper's jump is slow and heavy, the fire engine's quick.
- Eyes follow the finger while it works, wander by themselves at rest, and blink on their own clock. A face is held for about a second and let go, and a rub does not flicker through faces: a new one is made at most about twice a second.
- The mixer rocks its drum a little way round and back while it is left alone. Where dried mud has jammed the drum it keeps trying: the drum leans a hair one way against the mud, trembles there, lets go, and leans the other way, again and again, and does not turn. When the drum turns, what is on it spirals off it; in the shine it turns once, exactly.
- A face that looks up (a roof, a bonnet's top) shows what the top row of the side under it carries, so mud on a nose is seen from above too. Foam that is thrown lands and stays on clean paint only.
- Mud wobbles when it is shaken: when a vehicle brakes (in the bay, at the door, coming out of the puddle), under the hose, under a finger. Under the cloth, soft mud and a smear slide a little way along and come back. A drop swells at the tap before it falls.
- Nothing eases in without weight: things that fly are thrown, fall under gravity, and land where they stop. A crumb lands with a clack, soft mud with a slap, water and foam with a plip, and each clod has its clack and each bubble its pop: a few a frame, so a heap of foam going is a fizz and nothing pops after its bubble has gone. Water, foam and soft mud that land in a shower are heard a moment apart, and the ones between are seen and not heard. A tyre's wet line or brown track is laid thick enough to lie for some seconds. Plates of dried mud that crack off lie where they fall for some seconds, and the floor keeps them as pale clods that stay put while what is wet creeps to the drain. A glint is a soft round gleam with one slanted flash through it, never a star with crossed arms. The jet of the hose pushes foam off the vehicle the way it points. On the floor in front of the vehicle the nozzle goes where the finger is, its jet is seen to land there, and it pushes the foam that lies on the floor away along it, for as long as the finger stays and wherever it rubs. Dried mud that water softens darkens under the finger first and on the patches round it a moment later.
- The queue moves in hops, as a toy is walked along a shelf, each vehicle facing the way it faces. At a send-off the head hops off past the far end of the hill, the one beside it hops along into its place, and the one that left hops up from behind the bay, muddy again; each landing in sight on the hill is a thump and a puff of dust. The head takes one hop along the hill, landing in sight with its thump and its dust, and then one long leap off the hill's far end and over the yard, in the air until it is out of sight on a screen of any shape, before it is taken round to the door.
- A body meets its bump stops before a bumper can reach the floor, and comes back off them.
- The place moves on attended time only: the roller turns, the pinwheel turns in a wind that rises and falls, the clouds drift, the standing water shimmers.
- No camera shake and no impact pause (a default awaiting the owner). The size of an answer comes from the chain it sets off.
- The idle glow is a warm light on the edges of the tools on the rack, and only a light: a tool on the rack does not move. The vehicles take no glow: on a body that size it reads as haze, and they are alive already. The ghost hand is a pale mitten that reaches in from the open floor. With no tool in hand, or one that has no work, it shows a touch on the vehicle itself. When the child has a tool in hand the mitten holds a pale copy of that same tool as it shows its touch or its rub, so that what is shown is what the child can do with what it holds. It never goes to a tool: the tools glow, all alike, and a child who copies the hand is left holding nothing the game chose, so which tool a wash takes next is never shown.

**How each tier keeps the look** (`TIERS` in `config.ts`; tier 0 is full).

| Tier | Pixel ratio | Copy under the floor | Lumps on the two in the queue |
| --- | --- | --- | --- |
| 0 | 2 | yes | yes |
| 1 | 1.5 | yes | yes |
| 2 | 1.25 | no | no |
| 3 | 1 | no | no |

A tier changes drawing only, and takes away nothing the child causes. Every flying thing is drawn on every tier, since what is heard to land or pop has to be seen; so are the lumps of mud and foam on the two vehicles a wash can reach, which is where foam stands taller, mud slumps and wobbles. Without the copy the pad is still dark, wet and streaked; without their lumps the two far back in the queue still have their mud painted on them. The place, the queue and every face are drawn on every tier, so the lowest tier still looks like the game.

<!-- template: cartridge/ART.md v1 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 4, and its youngest age, 2, governs every choice below.

- **Cue table.** The table in wordless clarity has no row below 3, so its 3 to 4 row is the ceiling and the game cuts further. From its "Avoid" column the game takes: no text, numeral or icon to decode; no spoken instruction; no verdict; one live activity (one vehicle in the bay); and no tool that means nothing when it is touched. All three tools are in the scene from the first frame, and each one changes whatever it touches at once, so none is there before it means something.
- **The pack's rule for the range** (pack: game-design, ages-2-to-4.md). Every touch is answered and no order of touches is a dead end. The targets a wash needs (the vehicle, three tools, the vehicle that waits, the puddle) are each at least 100 logical pixels across, well apart, and none is in the bottom strip. Everything works with a tap: a tap on a tool takes it in hand, and a tap on the vehicle is one full dab of that tool. A rub is the same dab repeated along the finger's path; it survives a lifted finger, and whatever part of it was done stays done. No pinch, tilt, shake or double tap. One loved action, covering and uncovering, offered again and again. A wash fits in one to three minutes. There are three tools and never more than two vehicles on screen.
- **Symbols.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. No voice gives an instruction; the vehicles speak in engine noises and horns.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: a child of 2 or 3 starts at `fresh-splashes`, and a child of 4 or older starts at `dried-patches`. `null` starts at `fresh-splashes`. A saved position wins over the age, every place in the order is reached by play at any age, and the age gates nothing.

## The toy

**Rubbing a tool over the vehicle.** The finger lands on the vehicle with a tool in hand, and the paint under it changes.

In the empty scene there is one vehicle, caked in mud, on wet concrete, with the sponge in hand. On touch-down, in the same frame:

- the body dips on its springs toward the finger, and the wheels on that side squash;
- the patch under the finger turns from mud to foam, and the edge of the foam swells out past the finger;
- a scrub squeak sounds, its pitch set by how fast the finger moves, never twice the same of four variants;
- bubbles lift off the patch, drift up, and pop one by one with small plips after the finger has gone;
- brown drips run down from the patch to the floor and spread into a puddle that stays.

A rub lays a trail of the same change, and the body rocks after the finger like a toy pushed across a table. The hose and the cloth are held the same way and answer in their own material: water sheets, beads and runs off the sills; the cloth squeaks and leaves a glint. With no tool in hand the finger is a poke: the vehicle bounces on its springs and its mud squelches.

It is a pleasure with no goal because it is covering and uncovering, which a two-year-old does unprompted: bright paint appears from under brown, white foam hides it again, water takes the foam away. Each touch is a small reveal, bigger than the finger, and the vehicle can be covered and uncovered for as long as the child likes with nothing to finish. Random tapping always makes foam, splashes or shine, and never a refusal. A person watching sees within three seconds that the child is washing a truck.

## The object-by-action grid, and what is new on day 15

The objects are the six things that can be on a patch of the vehicle. The actions are the five things a child can do to it. Each tool does only its own job, and every cell looks and sounds different.

| On the patch | Bare finger | Sponge | Hose | Cloth | Sent off like this |
| --- | --- | --- | --- | --- | --- |
| **Dried mud** (pale, cracked) | A knock: a thud, a crack runs across, crumbs trickle | A dry rasp: crumbs and dust, suds dribble over the top and slide off; the mud stays | It darkens from the finger outward and turns to soft mud, a hiss that becomes a gurgle | A scratch and a puff of dust; the mud stays | Plates of mud crack off on the way out and lie in a row of clods |
| **Soft mud** (dark, wet) | A squelch and a dent that slowly fills | It lifts into brown foam that stays on the vehicle | It glistens, slumps and drips brown, and clings | It smears onto the clean paint beside it | Splats fly off the wheels; brown tyre tracks |
| **Foam** (brown from mud, white on clean paint) | A hole pops in it, plip by plip | More foam, taller, and bubbles drift off | It slides off in rafts that sail to the drain; clean wet paint | It is pushed along onto the paint beside it; the cloth wears a foam beard | Blobs of foam peel off behind and a line of bubbles follows |
| **Wet paint** | A squeaky wet slide, drops scatter | White foam | Water sheets off the sills, drops bounce | It dries and shines, a rising squeak | The vehicle shakes like a dog first; wet tyre lines |
| **Dull paint** (clean, dry) | The body bounces and the metal rings | White foam | Beads of water; wet paint | It shines, with one glint | A plain toot and off |
| **Shiny paint** | A dull fingerprint | Foam hides the shine | Fat round drops race off; wet paint | A higher squeak and a second glint; still shiny | Lamps flash, a glint runs nose to tail, a proud horn |

The wrong use of each tool works and is funny: the cloth on mud paints with it, the cloth on foam pushes a beard of it about, the sponge on a shiny vehicle buries it in foam, the hose on dried mud makes it worse to look at before it is better. Each vehicle adds its own row of reactions (see the characters), and the puddle adds mud back whenever the child likes.

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
- **Fun.** The skill is used in the rub itself, the most enjoyable moment of play, and play never stops for it.
- **Guess.** A child can get a clean vehicle by trying every tool on every patch, and at two that is meant: every touch does something and none is a dead end. What trying everything cannot do is wash without the consequences of a wrong order, which stay on the vehicle to be seen: smears, foam left on, mud gone dark and still there.

## The error as a consequence

A wrong attempt is a tool on a patch it cannot take forward. The patch shows what happened, where the finger was:

- The hose on dried mud: the mud is still there, now dark and dripping. Water alone did not take it off.
- The sponge on dried mud: crumbs and a dribble of suds, and the mud unchanged.
- The cloth on soft mud: a brown smear on paint that was clean.
- The cloth on foam: the foam has moved, not gone.
- The sponge on a rinsed vehicle: foam again, to be rinsed again.

The state stays. Nothing resets, nothing is taken back and no tool is refused, so the child changes one thing, another tool on the same patch, and sees the difference. A vehicle sent off half washed leaves as it is, dropping clods or trailing bubbles, and that exit is as good to watch as a shining one. Nothing buzzes, crosses, sighs or turns a sad face to the child. A vehicle's reactions are about the soap in its eyes or the cloth on its nose, never about how the wash is going.

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
- `next`: the vehicle that waits, as `who` and `cells`, so mud from the puddle and foam that landed on it are kept.
- `seed`: the state of the seeded stream that picks the next vehicle and lays out its mud. It is not a count of anything.
- `shown`: the ids of the first showings that have played, so each plays once.

Not stored, because each is a view: the tool in hand (on load every tool hangs on the rack, where it came from), drips, bubbles, puddles and tracks on the floor, and a scene in progress, whose outcome is saved when it starts. No clock is read and nothing changes while the game is put away. The largest legal state is under one kilobyte, and a test holds it under half the 64 KB cap.

## The characters and their fixed tastes

The vehicles are the characters: four die-cast toys with lamp eyes and a bumper mouth. The roster is four so that a child meets each one often. The tools, the mud, the foam and the water are the working objects and stay plain: no faces, no patterns, no motion beyond what the material does.

Each vehicle's want is always visible: at rest it keeps glancing at the tool it likes. Its like and its dislike never change, each belongs to one tool on one part of its body, and each works every time.

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
- **The send-off and the roll-in** (the ending, and the next beginning). Cause: a tap on the vehicle that waits. Beats, six to nine seconds: the one that waits honks; the one in the bay pulls back on its springs and goes, with the exit its surface gives it, as the last column of the grid says: clods for dried mud, splats and brown tracks for soft mud, blobs and bubbles for foam, a dog shake and wet lines for wet paint, a plain toot for dull paint, flashing lamps and a proud horn for shiny. The most common state leads and the others add their trails, which stay on the floor. Then the newcomer rolls in, brakes, dips its nose, and its mud wobbles; another vehicle noses in at the door. Filled in from: who leaves and what is on it, who arrives and its mud.

**How a cycle ends and the next starts.** The child ends it. A vehicle in the bay, shining or half washed, stays as long as the child likes, and if the child does nothing, nothing new starts: no automatic next vehicle and no countdown. The next vehicle is visible and waiting at the door, and it comes in on the child's touch on it. That same touch sends the one in the bay off as it is. When a scene's outcome is saved the position has moved, the newcomer is in the bay and another waits. On load no scene replays: the vehicle in the bay stands as it was left, patch for patch, the tools hang on the rack, and the next vehicle waits.

## The records

One heading per jurisdiction, never one list or table that pairs them; a game with no learning goal has no records part.

### us-ca

The records the game is designed from, by pack id or official code, each with its standing and check state as the lookup prints them; the level with the basis the lookup prints; any lane label and any gap as printed; and the limits taken from each record's Limits. The pack's own Summary or the game's own words only, never the official wording.

### nl

The same four things for the Dutch records, with the regime of a core goal.

### Where the two differ

Each difference written as a difference, and which jurisdiction the game follows at that point.

### The claim

One sentence in the words of each record's standing saying what the game is designed from, with the state and reason for any record that is not confirmed, and no word about what a child has reached.

## The look

Written after the style spike, not part of the sheet: the claimed look, the palette, materials, lighting and motion rules, and how each tier in `config.ts` keeps the look.

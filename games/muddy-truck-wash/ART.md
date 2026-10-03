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

The order of challenges with one new thing at a time, the positions with their stable ids as they stand in `config.ts`, what a cycle that goes well or badly is, and every field of the saved state.

## The characters and their fixed tastes

Each character's one visible want and the likes and dislikes that never change, or what gives the feedback in a game with no character.

## The scenes

Each short scene with what causes it, its beats, what from the state of play fills it in and how it gives way to a touch, then how a cycle ends and how the next one starts.

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

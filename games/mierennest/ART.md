<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 9 to 12. Its youngest age, 9, governs the design. Mierennest is a play-first game: it claims no school skill, and this sheet has no records part.

- **Cue table.** The row for a youngest age of 7 and up in the wordless-clarity convention. Its "Avoid" column binds the game: no written word or letter; no symbol standing alone that play depends on reading; no timer, points or verdict chrome; no long hint chain.
- **Age rule.** (pack: game-design, ages-9-to-12.md) The ground is a real system that behaves the same way every time: sand pours and slumps, mud sticks and holds, a stone falls unless something bears it. Every invader kind has fixed habits. More than one defence works against every raid, and a better one is visibly better in the world: it holds more, with fewer lumps. Failure is large, funny and free: a raid runs on a copy of the nest, and the workers put back whatever it knocked down. Help is something the child fetches. Nothing is babyish, nothing competes, and no best is stored.
- **Symbol rule.** The band starts at 6 or above, so numerals would be allowed laid on a quantity. This game draws none: nothing in the play needs one. It has no `symbols.ts`, and no letter or written word appears anywhere on the kid side. The name lives in the manifest and is never drawn.
- **`ctx.childAge`.** It sets one default and nothing else: how long the game waits on a still finger before the idle ladder shows its first cue.

  | `ctx.childAge` | The first cue comes after |
  | --- | --- |
  | 9 and younger | 6 seconds of attended stillness |
  | 10 and older | 10 seconds of attended stillness |
  | `null` | 6 seconds, as for 9 and younger |

  It never sets a starting place. Every visit of every age starts at the first place in the designed order, because the kingdom is built step by step, and a saved position always wins. No content is gated by age.
- **`ctx.language`.** Nothing in the game depends on it: there is no spoken or written content, and the creatures' voices are invented and synthesized.

## The toy

**Digging: a drag through the earth opens a tunnel behind the finger, and the small ant runs along it.**

The finger lands anywhere in the ground and the ant comes to it by the shortest open way, digging the last stretch. While the finger moves, the earth under it is bitten away in a round mouthful two cells across, so the tunnel is as wide as the finger and a creature fits in it.

- **On touch-down, in the same frame:** the mouthful under the finger is gone, crumbs spray from the bite, the ground gives one dull crunch, and the ant's head turns to the finger.
- **While dragging:** each new mouthful crunches at a pitch that follows the speed of the finger, crumbs trail behind, a worker at the mouth of the nest catches the spoil and trots it up to the hill, and the hill on the surface grows by a crumb. Roots that hang into a new tunnel swing. A camper above a fresh tunnel feels it through its feet and looks down.
- **What the dig meets answers as itself.** Earth is dug. Sand is not bitten: it trickles, and when the earth under it has gone it pours into the tunnel with a long hiss and slumps into a pile. Mud squelches and holds. A stone clinks, sparks once and stays; with nothing left to bear it, it drops with a thud that shakes the campers. The bedrock at the bottom and the turf at the top ring dull and do not give.
- **On release:** the ant sits back, wipes its jaws and looks at what it made; loose things finish falling.
- **A tap** is one mouthful, with the same answer.

It is a pleasure with no goal because it is drawing with a tunnel in something that pushes back: every stroke leaves a shape that stays, sounds like the speed of the hand, and may set the ground itself moving, since a stroke under sand starts a pour and a stroke under a stone starts a fall (pack: game-design, toy-first.md; pack: game-design, touch-answers-bigger-than-the-touch.md). Random dragging always digs something and never does harm: nothing dug is needed, and every lump that falls can be picked up again. Someone watching sees within three seconds that the child is digging an ant nest.

## The object-by-action grid, and what is new on day 15

A grid of objects by actions in which every cell gives a result that looks and sounds different, and one line on what the child can do, find or make on day 15 that they could not on day 1.

## The representation

How the school idea appears in the objects, chosen before the game, and where the order of object, picture and symbol stops for this band.

## The four mechanic questions

One sentence each for swap, attention, fun and guess.

## The error as a consequence

What a wrong attempt does in the world, where it shows, and that the state stays so the child changes one thing and tries again.

## The designed order, and what is stored

The order of challenges with one new thing at a time, the positions with their stable ids as they stand in `config.ts`, what a cycle that goes well or badly is, and every field of the saved state.

Where the next customer already waits on screen while the child works, say which customer a new position lays out: the position moves when a cycle is judged, and the one who waits was laid out before that, so the change shows on the customer after next.

## The characters and their fixed tastes

Each character's one visible want and the likes and dislikes that never change, or what gives the feedback in a game with no character.

## The scenes

Each short scene with what causes it, its beats, what it saves when it starts, what from the state of play fills it in and how it gives way to a touch, then how a cycle ends and how the next one starts.

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

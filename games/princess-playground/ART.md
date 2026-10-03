<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 2 to 5. Its youngest age, 2, governs every choice below.

- **Age rule.** The cue table of wordless clarity has no row below 3, so its 3 to 4 row is the ceiling and the game cuts further (pack: game-design, ages-2-to-4.md). From that row's "Avoid" column, as hard limits: nothing to decode, no spoken instruction, no verdict, one live activity, and no tool on screen before it means something.
- **What follows for the hand.** Everything essential is one tap. A drag is an extra that survives a lifted finger and counts when partly done. No hold, pinch, tilt, shake or double tap. Each friend is a target of about 100 logical pixels or more, well apart, and none stands in the bottom strip where wrists rest. A second tap on the same thing never does harm: it undoes the first.
- **How much.** Four friends, one seesaw, one tray of sand. A whole ride fits in one to three minutes.
- **Symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, optional or not, and the game has no `symbols.ts`. Friends speak in invented, synthesized chirps; no voice instructs.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: age 4 or older starts at `middle-asks`; age 3 or younger, or no age (`null`), starts at `little-asks`. Both ends are open: a younger or older child than the band gets the nearest row. A saved position always wins, age gates nothing, and every friend and every arrangement is reachable by any child from the first minute.

## The toy

**The action.** The finger puts a friend on the seesaw. A tap on a friend standing in the sand makes it hop onto the end of the seesaw on its own side of the tray. A tap on a friend sitting on the seesaw makes it hop off into the sand on that side. A drag carries a friend, dangling, to anywhere: let go over an end and it lands there, on top of whoever already sits there; let go over the sand and it stands where it fell.

**What it does in an empty scene.** One plank on a stone in a tray of sand, and four painted pebbles of plainly different sizes. The answer starts when the finger lands: the touched friend squashes, chirps in its own voice and looks at the finger. Then the chain: it hops in an arc, lands on the plank with a thump whose pitch falls with its size, the plank swings to the heavier side, the end that goes down bites into the sand and throws a ring of grains, and whoever sits on the end that goes up is tossed into the air, higher the lighter they are against what landed, and comes down on the plank again with a squash and a squeak. The plank rocks and settles. A friend who lands on the high end without tipping it just dangles up there, legs kicking, and the plank creaks.

**The sand answers too.** A tap on bare sand leaves a dimple and a soft hiss; a finger drawn through it leaves a groove that the low light picks out. A tap on the plank makes it rock once with whoever is on it.

**Why repeating it is a pleasure with no goal.** It is dropping and flinging, which toddlers repeat unprompted: a small cause, a large and slightly different effect each time, and nothing that can go wrong. Any friend, tapped at any moment, does something, and the same tap takes it back. Who flies, how high, which end slams down and who ends up sitting on whom all change with who was already there, so the child is running small experiments without being asked anything.

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

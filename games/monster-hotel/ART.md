<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

- **Band.** The manifest says 9 to 12. The design is held to a nine-year-old.
- **The cue-table row.** The row for 7 and up governs. Its "Avoid" column is taken as a hard limit: no written word or letter, no symbol that stands alone so that play depends on reading it, no timer, points or verdict chrome, and no long chain of hints. Several things may be open at once as long as each reads at a glance.
- **The pack's rule for the age** (pack: game-design, ages-9-to-12.md). The hotel is a real system that behaves the same way every time: noise goes through walls, warmth rises, cold sinks, a smell drifts along a corridor. Any arrangement that leaves every guest content stands, and there are always several. A wrong arrangement is large, funny and free. The humour is dry and is not explained. Nothing is stored as a best, and nothing is compared.
- **Symbols.** The band starts at 9, so numerals and mathematics signs are allowed, each laid on or beside the quantity it stands for and drawn only in `symbols.ts`. This game lays numerals in one place: beside the flames on the dial of the stove and beside the icicles on the dial of the ice box, where the numeral names the step the child has just set. The flames and the icicles say the same thing without it, so play never depends on reading a numeral. No letter and no word is drawn anywhere. None is drawn in this run: the module comes with the next one.
- **Guided discovery** (pack: game-design, guided-discovery.md). The band lies across the rule's line at ten. The game takes the older form for every child: the child tries first, and the first time a new thing has been in play, the porter shows one neat way with it after the child's own arrangement has settled the hotel.
- **What `ctx.childAge` sets.** Only where a first visit starts in the designed order: the first place, `two-guests`, for a child of 9 or 10, and the second, `heat-and-snow`, for a child of 11 or older. No age (`null`), or an age below 9, starts at the first place. A saved place always wins over the age. Every guest, room and thing can be reached by play at every age, and nothing is hidden or locked by age.

## The toy

**Touch a guest, and the whole page is drawn again from where that guest stands.**

- **What the finger does.** It lands on a monster. In the same frame the monster squashes and gives its own grunt, and the redrawing starts at its feet and sweeps outward across the hotel in about a third of a second. The finger does not have to lift for any of this.
- **What the page becomes.** The same hotel, as that guest takes it. Its own room is drawn large and everyone else's small. Whatever reaches its room is inked by how this guest takes it: a thing it loves in the one spot colour with curls and flourishes, a thing it minds in heavy black scribble that shows the wall or floor it came through, and everything it does not care about in faint pencil. Each guest has its own hand: the bat hangs from its ceiling, so its page is upside down; the yeti's lines drip wherever it is warm; the blob with many eyes sees the page several times over, slightly apart.
- **What the ear gets.** While the page is one guest's, the hotel is heard as that guest hears it. The tuba next door is a round tune from the troll's own place and a flat blare from the place of the blob trying to sleep. Each guest's grunt is its own, with several variants that follow where and how fast the finger landed.
- **Back and across.** Touching another guest sweeps the page straight to that one's view. Touching the same guest again, or the paper margin, sweeps it back to the plain page.
- **Carrying is looking.** A finger that lands on a guest and moves picks the guest up, and for as long as it is carried the page stays that guest's, so the child sees what would reach it in each room it is held over. Setting it down returns the plain page. A carried guest dangles, stiff and unbothered, with its luggage swinging behind.
- **Why it is a pleasure with no goal.** In a scene with one hotel, two guests and nothing to settle, flipping the page between two creatures who take the same building in opposite ways is funny on every touch: the building turns over, swells, drips and changes its tune. Nothing can go wrong, random touches always redraw something, and a person watching can tell in three seconds that the child is looking through the monsters' eyes. Everything else in the scene answers a touch too: a wall knocks and every guest looks toward the knock, a room's lamp swings, the lift bell rings.
- **In the first build of the toy** there is the hotel, two guests and the day-and-night wheel on the roof, and no arrangement is asked for.

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

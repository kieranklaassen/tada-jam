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

Six things the child handles, five things done with each. Every cell is a different sight and sound, and none is refused. "Wrong" uses are marked ✗: each works, changes the hotel truly, and is at least as funny as the right one.

| | set down in a room | given to a guest | fixed to a wall or a floor | tapped | left through a day and a night |
| --- | --- | --- | --- | --- | --- |
| **a guest** | moves in: the bag thuds, the bed is tested, and from now on what it gives off starts from here | in a room with a spare bed the two share it; otherwise they swap rooms, passing in the corridor without a glance | ✗ sticks half through the plaster while both neighbours stare, then steps out into the nearer room | the page is drawn again from where it stands (the toy) | awake it does its one thing, asleep it sleeps in its own way; what it gives off reaches the others only at its own hours |
| **the quilt** | ✗ lies on the bed and stops nothing; whoever sleeps there tucks in | ✗ wraps the guest from head to foot: a wrapped guest makes no noise, which a sleeper next door likes and a musician minds | hangs padded: no noise, warmth or cold crosses that wall or floor | puffs feathers, and the nearest guest sneezes | stays, with the marks of what it stops piling up against it |
| **the pipe** | ✗ stands in the corner like a hat stand and carries nothing; a guest peers down it | ✗ becomes a trumpet: whatever that guest gives off carries one room further | joins the two rooms: smell, warmth and cold pass through it both ways | toots a puff of whatever is passing through | carries what is being made at that hour and nothing at the other |
| **the stove** | warms the room by its dial; the warmth rises to the room above, one step weaker with each floor | goes into that guest's room, and the guest takes to it in its own way: one hugs it, one sits on it and sags | ✗ scorches a patch of wallpaper and slides into the nearer room | the dial turns a step: one flame, two, three, then one again | burns the same by day and by night |
| **the ice box** | chills the room by its dial; the cold sinks to the room below, one step weaker with each floor | goes into that guest's room: one uses it as an armchair, one goes stiff as a plank | ✗ frosts a patch of wall and slides into the nearer room | the dial turns a step: one icicle, two, three, then one again | chills the same by day and by night |
| **the alarm clock** | ✗ stands by the bed and rings at dawn and at dusk; a sleeper opens one eye, glares and sleeps on | a guest who will change its hours keeps it and swaps its day for its night; one who will not deals with it in its own way and keeps its hours | ✗ hangs as a wall clock and changes nothing | rings, and every sleeper in the house opens one eye | whoever holds it wakes and sleeps the other way round |

Beside the six: the day-and-night wheel on the roof, which the child turns by hand and which turns nothing by itself, and the coach at the kerb.

**How each thing travels** is the hotel's whole rule language, and it never changes:

- Noise goes through every wall, floor and ceiling of the room it is made in, and loses a step each time.
- Warmth rises through ceilings and cold sinks through floors, each losing a step a floor. Warmth and cold in one room add up.
- A smell drifts sideways along its own floor and loses a step a room. It does not cross a floor.
- A quilt on a wall or floor stops noise, warmth and cold there. A pipe lets smell, warmth and cold through there.

**On day 15** the child knows the eight guests' tastes by heart and places from knowledge; has found pairings that turn a nuisance into a treat (the fly beside the cook, the cook humming to the tuba through the wall); pipes a smell or a warmth across the house to the one guest who wants it; lets a day sleeper and a night sleeper share one bed in shifts; has met the guest who is content only when somebody hears her; and builds, on purpose, the hotel in which everyone is as cross as can be. Some pairings always set off a small scene of their own (the yeti and the stove at three flames; the tuba and the singer through one wall). They are never hinted at, counted or listed.

## The representation

- **The idea.** People take the same thing differently because of who they are; a quarrel comes from wants that collide; and it is settled when the worry behind each side's demand is met, which is not always what either side first asked for.
- **How it appears in the objects.** Two views of one scene, extended to as many views as there are guests. The hotel is one building and one set of facts: this noise goes through this wall. Each guest's page draws those same facts in its own way. The tuba's noise is one set of marks crossing one wall; from the troll's place the marks are a flourish, from the sleeper's place a scribble, from the yeti's place faint pencil. The difference between two guests is therefore something the child sees by changing places, with nothing said.
- **Demand and worry are two different things in the world.** A guest's demand is a room: in the lobby it stands with its bag and stares at the door it wants, and two guests often stare at the same door. Its worry is what must or must not reach it: cold, quiet while it sleeps, an open nose. The demand is visible on the plain page; the worry is visible only from the guest's own place. An arrangement settles the hotel when every worry is met, whichever doors were asked for.
- **Why this shape.** A want is drawn as something that physically travels and arrives, so "it bothers me" always has a place and a path, and the child can change one thing on that path. Feelings are read from what a creature does (it turns to the wall the trouble comes through, with a pillow on its head), never from a row of faces to choose from.
- **Evidence.** The table in `research/learning-games-that-work.md` of the game-design pack gives, for another's perspective, "two viewpoints on one scene" with the mechanic of swapping seats and giving each what that one would want, and names ages 4 to 6 for it. The studies behind it trained children of about five. Using it at 9 to 12, with many viewpoints and with wants that collide, is this game's own extension and has no trial behind it. The pack also says the evidence in this strand is thin and that such a game is rehearsal, with the real learning off screen. The sheet claims no more.
- **Object, picture, symbol.** The order stops at the picture. A feeling or a point of view has no school symbol, and none is invented: no face icons, no hearts, no meters. The only symbols in the game are the numerals on the two dials, laid beside the flames and icicles they count, and they belong to the stove and the ice box, not to anyone's feelings.

## The four mechanic questions

- **Swap.** No. What the child does is look from one guest's place and then another's and arrange the house so that what each minds does not reach it. Put sums or spelling in place of the guests' wants and no game is left.
- **Attention.** At the moment of setting a guest or a thing down, the child must look at what reaches which room and think about how the guest in that room takes it, which is different from how the guest next door takes it and from how the child would.
- **Fun.** The skill is used in the two most enjoyable moments: the redraw when the finger lands on a guest, and the hotel's reaction, room by room, to a new arrangement. Play never stops for a question.
- **Guess.** In the first two places of the order, often yes, and that is meant: few guests, and most arrangements settle. From the third place on a hotel has hundreds to thousands of arrangements and few settle. Trying them blind is far slower than looking, and each wrong one shows where and why. Trying is never refused or punished, so it stays a legitimate way to play.

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

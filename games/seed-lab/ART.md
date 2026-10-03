<!-- template: cartridge/ART.md v2 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

Seed Lab in one paragraph: a naturalist's journal page on which plants grow. The child carries pollen dust from one flower to another with a fingertip, a pod swells and bursts, and six young race up beside their parents, each taking after both and no two broods alike. Visitors with fixed tastes wait at the edge of the page for a plant they would like, and the child steers towards it over a few generations, or just breeds what pleases them. The verb is the idea itself: choose what the young come from, and see what was passed on.

- **Band.** The manifest band is 9 to 12. Nine governs the design.
- **Cue-table row.** The row for 7 and up in the wordless-clarity table. Its Avoid column binds the game: no written word or letter, no symbol standing alone that play depends on reading, no timer, points or verdict chrome, no long hint chain. Several things may be live at once as long as each reads at a glance, and light pictures may carry a real choice (the visitor's wish is a small pencil sketch of a plant).
- **Pack rule for the range** (pack: game-design, ages-9-to-12.md). The model of inheritance is one small, consistent rule that never bends. Any plant that meets a wish stands, by whatever route it was bred. A cross that goes wrong is large, funny and free. Help is fetched by the child (the loupe). Nothing is babyish: the plants have no faces, the tools look like tools, the humour is dry. No competition and no stored best.
- **Symbol rule.** The band starts at 9, so numerals may be drawn, in `symbols.ts` only, each beside the quantity it stands for. The game uses numerals in two places and no other mathematics sign: beside a wish that asks for more than one plant, and beside each group of like young when a brood is sorted ("The representation" says where each lies). No numeral stands alone, play never depends on reading one, and no letter or written word appears anywhere. This run draws none.
- **`ctx.childAge`.** It sets one default, the place in the designed order where a first visit starts: a child of 11 or older starts at the second step, every other age and no age at the first. A saved position wins over it. It gates nothing: every packet, tool and visitor is reached by play from either start, and the top and bottom are open-ended (older than 12 starts as 11, younger than 9 as 9).
- **`null`.** Starts at the first step.

## The toy

**The dab.** The finger lands on a flower and lifts its pollen; the finger carries the dust to another flower and lets go. That is the whole action, and it is the one the finger performs most.

In an empty scene (a bare page with two plants in bloom and a row of six empty pots):

- **When the finger lands**, in that frame: the flower dips under the finger, the stem bends like a spring, a puff of gold dust lifts off the anthers and a soft pluck sounds, pitched by how tall the plant is. A trail of dust then follows the finger, shedding specks that fall and fade.
- **When the dust reaches another flower**: that flower nods, a pod swells behind it with a rising creak, holds for a breath, and bursts with a pop. Six seeds arc out, each on its own path with its own tick, land in the pots one after another, and each plant draws itself upward in under two seconds: the pen line races up the stem, leaves unroll, the bud opens and the wash blooms into it. Each young plucks its own note as it opens, so a brood plays a short phrase that is different every time.
- **The chain is bigger than the touch**: one dab gives a puff, a swell, a pop, six flights and six plants, and it never blocks the next touch. A second dab while the first brood is still growing works.
- **The simplest use always works.** Any flower dabbed onto any flower gives a brood, the flower's own dust on itself included. Dust let go over bare paper drifts down and is blown off by the beetle's sneeze. There is no wrong flower and no refusal.
- **A watcher can tell in three seconds**: the child is carrying dust between flowers and getting young plants.

Why it is a pleasure with no goal: every dab is a small unpacking. The brood resembles the two plants the child chose and is never quite what was expected, the growing is fast and physical, and the page fills with plants of the child's own making. Nothing is counted and nothing is asked. The toy is judged alone, on that page, before a visitor or a wish exists.

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

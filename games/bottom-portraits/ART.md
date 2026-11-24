<!-- template: cartridge/ART.md v3 -->
# Design sheet

## The band and its age rule

Band 3 to 7; its youngest age governs. The cue-table row for 3 to 4 applies with its "Avoid" column as hard limits: no text, numeral or icon to decode, no spoken instruction, no verdict, one next act offered. Pack: ages-2-to-4.md (taps and forgiving carries, large separate targets, nothing essential along the bottom edge, objects used wrongly and bottoms) and ages-4-to-6.md (a character with a fixed way of seeing, who can be tricked behind his back). The band starts below 6, so there is no symbol of any kind.

`ctx.childAge` sets only who stands on the table on a first visit. 4 and younger: the elephant alone. 5 and older: the elephant near the child and the pig near the painter. `null`: the elephant alone. A saved table always wins.

## The toy

Tap a tin sitter and its stand winds round a quarter turn: the key spins, the ratchet clicks in that sitter's own pitch, the body lags behind its stand, overshoots and rocks to rest, and something loose on it (ears, comb, jaw, neck, tail, jowls) goes on wagging. The squash and the first click come as the finger lands. Across the table the painter's face changes to fit what has just come round to him. Turning is a pleasure by itself: every quarter shows another side, four taps go all the way round, and no tap can be wrong.

## The object-by-action grid, and what is new on day 15

"Shows" is what meets the painter. Each cell has its own motion and its own sound. The first four columns are seen when a picture is turned round, the fifth when a thing on the steps is tapped, the sixth when the board with its hole stands in front of it; one wholly covered reacts as hidden, one in the hole reacts as in the hole whichever side shows, and one cut off reacts as cut off, before any of the first three columns.

| | Shows its front | Shows its back | Shows its side | Hidden or cut off | Tapped on the steps | In the board's hole |
| --- | --- | --- | --- | --- | --- | --- |
| Elephant | Chest out, a long trumpet | Ears flop over its eyes, a deflating honk | Sways its trunk like a pendulum, low hum | Trunk straight up like a periscope, a rising toot | Hops over with a timpani thud | Wiggles its ears, muted trumpet |
| Hen | Pecks at its own likeness, quick tocks | Faints flat on its back, legs up, falling squawk | Preens, a run of small clucks | Stretches tall and jumps, sharp clucks | Flutters over, flapping tin | Freezes, one eye turning, a single cluck |
| Hippo | A huge yawn, a deep creak | Shimmies in delight, bubbling tuba | Leans and nods, two low notes | Sinks on its haunches, a slow blow | Bounces over, a boomy tub | Puffs its cheeks, a popped cork |
| Pig | A deep bow, a grunt | Giggling hops, quick snorts | Trots on the spot, a clatter | Stamps in a circle, cross squeals | Bounds over, squeal up and down | Winks, a short snort |
| Giraffe | Flutters its lids and sways, a glass chime | Looks round at its own tail, a slow creak | Walks its neck forward and back, wood knocks | Bends its neck right down to look into the frame, a long slide | Stilts over, four knocks | Pokes its neck through and nods up and down, a whistle |
| Crocodile | Snaps twice with delight, two claps | Shuts its lids and turns its head away, a low zip | Beats its tail, a drum roll | Peers round with one lid, a tick | Slithers over, a ratchet | Grins wider click by click |
| Board | Its painted lady swings her hips, a tin twang | Its struts rattle, and the painted lady has drawers too | It shivers edge-on, a thin ring | Falls forward against its stop and back, a clap | Clatters over end for end | Whoever is in the hole, its painted feet do a tap dance, tin ticks |

The wrong use works best everywhere: a bottom is the funniest thing to paint, and the painter's dignity is the victim, never hurt.

Day 15: the child plans one picture out of several bodies from the wrong side of the table: a pig with a giraffe's neck, a hen in a hippo's lap, a ballerina with an elephant's behind for a face, and finds the last six of them on the wall. One constant secret: when every sitter on the table, two or more and no board, is painted from behind, he is so affronted by them that he swivels round on his own stool and shows the sitters his: patched drawers with one button flap. His glare over the shoulder is at the sitters and never out at the child.

## The representation

There is no school idea, so nothing is claimed here. The thing at work is that one arrangement looks different from two sides, and the game shows both truthfully: the child's view is the screen and the painter's is the picture, drawn from his side of the table at the height of his eye, stood back the length of a room so that near and far keep their places, in the same scene. His frame closes in on whoever stands there and stops at a fixed top over the two places near him, which is what cuts a giraffe off there and nowhere else. The prediction a child can make is "what will he see?", answered by the picture. It is made before he turns it round, since the canvas has its plain back to the child. No trial is behind this; the write-up's own check calls the learning argued and not cited. Object and picture only; no symbol.

## The four mechanic questions

- **Swap.** No: the game is the difference between two views and cannot carry other content.
- **Attention.** Which side of the sitter faces the man across the table, and who stands between.
- **Fun.** The laugh is the moment the picture turns round, which is the moment the prediction is answered.
- **Guess.** Yes, and it is meant: every arrangement makes a picture, a random one is often funny, and nothing is to be succeeded at. Planning makes a chosen picture instead of a chance one.

## The error as a consequence

There is no wrong arrangement. A picture that is not what the child meant shows why: the neck runs out of the frame, the hippo covers the hen, the face is on the side the child can see and not on his. The table stays exactly as it was, so one thing is changed and he paints again.

## The designed order, and what is stored

Open pretend play with one place in its order, `table`. What grows is what the child puts on the table: one sitter, two side by side, one before another, the board. The key that turns the whole table lies folded into the rim, part of its printing and answering a touch as the rim does, while only one thing stands on the table. The table's rim, pushed along, takes it round too, either way. It swings up while two or more stand there, which the state of the table alone decides; the ladder never shows it before a picture has been painted.

Stored, version 1: `position` and `finished` from the template (`finished` is the picture standing shown on the easel); `spots`, four entries, each a sitter or empty; `turns`, seven quarter counts; `homes`, which step each waiting thing stands on; `wall`, six nails, each empty or a picture as its arrangement (four spots and their turns); `last`, the nail of the newest picture, which while `finished` is true is the one on the easel and not yet on its nail; a nail is drawn only when a picture hangs on it; `painted`, whether any picture has ever been painted. A picture is not stored as pixels: the same arrangement always paints the same picture. Nails are filled in a fixed order round the wall, so the seventh picture takes the oldest one's nail: the oldest is seen and heard to swing down behind the wainscot as that painting starts.

Seven things, four places and six steps. A tap on a thing on the steps sends it to an empty place, the two near the child first. The board, which is for standing behind, goes to a far place first. When all four are taken it changes places with the one on the near place of its own side, which is seen and heard to hop to the step the newcomer left while the newcomer swings round it on the child's side; a tap on that one changes them back. A carried thing let go on a taken place changes places in the same way, and let go anywhere else it goes to the nearest empty place or step, or back where it came from, in sight. Somebody is therefore always on the table: the last one is sent back to it if the child carries it off, seen and heard.

## The characters and their fixed tastes

- **The painter**, Maestro: one want, to paint; a bare canvas, brush up, leaning towards whoever stands before him. Pompous and exact, he paints what he sees and is shocked by it afterwards. A bottom coming round: the monocle drops on its cord. A face: moustache ends rise. A side: he measures with his thumb. Teeth: he ducks to the eyes behind the canvas. Nothing to see: he cranes left and right.
- **Elephant**: proud. Wants its face. **Hen**: nervous. Wants its side. **Hippo**: adores its own bottom, bored by its face. **Pig**: wants a bottom in the picture, its own most: it keeps peeping at the others' backs, or over its shoulder at its own when it stands alone, and laughs at any that is painted. **Giraffe**: wants its head inside the frame; the near place to him cuts it off, the far place does not. **Crocodile**: wants its teeth painted: its jaw hangs a little open towards the side they can be seen from and its eyes go to the painter; only its side shows how long it is. **Board**: no taste; the one in its hole poses.

Reactions are about the picture, never to or about the child. Wants are always visible: each sitter's eyes follow the side it would like to show (the hippo looks back over its shoulder, the elephant's eyes look to the painter).

## The scenes

1. **The painting** (about 6 s). Cause: a tap on the painter, his easel or the bare canvas. Beats: thumb out and one eye shut (0.6 s); three bursts of dabbing behind the canvas, with paint flecks in the sitters' own colours above its edge (1.8 s); he leans back (0.4 s); the easel spins and the gold frame comes forward and up, facing the child (0.7 s); his monocle or moustache answers (0.4 s); each on the table turns head and eyes to it and reacts, nearest first, 0.35 s apart (2 s). Saved when it starts: `wall` (the picture in its nail's place, the oldest gone from it if all six were taken), `last`, `finished` true and `painted` true. Any touch before the picture has been seen lands every beat, so that the picture stands shown to the child, and is answered with a squash and sound of what it touched; that one touch does nothing else, so it never turns a sitter, hangs the picture or asks for another. Once the picture stands shown, a touch ends what is left and is an ordinary touch. Asked again while it stands shown, he paints no second one of the same: he shows it off, and whoever is in it looks again.
2. **The hanging** (0.8 s). Cause: the next touch that changes the table. The shown picture flies to its nail; the easel turns back bare. Saved when it starts: `finished` false. A poke that changes nothing leaves the picture standing.
3. **The affront** (the secret, 4 s): follows the reactions of a picture in which every sitter on the table, two or more and no board, shows its back. He swivels, the flap drops open, he blows a small tuba note, and swivels back. It stores nothing.

A cycle ends with the picture standing on its easel for as long as the child likes. Nothing begins by itself. On load a shown picture stands shown, no scene plays.

Small answers that change nothing: a wall picture swings on its nail and calls in the voices of those in it; the floor, steps, window and paint pots each answer as themselves, with a few dots of paint jumping where the finger landed; a shown picture wobbles on its stand and one of those in it looks and reacts again.

## The records

None. The game has no learning goal and claims no school skill.

---

# Art guide

## The look

**Lithographed tin toys**, the first choice of the look menu. The spike held on clarity, so the fallback (quilted patchwork) was not tried.

Everything that acts is thin tin, pressed in rounded shells, closed along a seam that shows, and printed. The print does the drawing: dots, stripes, lace, buttons and rouge lie flat on the metal, a little off register, with a dark line and a fine halftone where a colour deepens. Light is a bright room's: a window in four panes is mirrored in every shell, always in the same place. No brass, no lamp, no dark.

- **The joke is printed.** Every sitter is in full dress in front (frock coat, lace bib, pearls, waistcoat, white tie) and in patched, striped or spotted drawers behind. From the child's side it is a portrait; from his it is a bottom. The painter himself is no better dressed behind than they are.
- **Palette.** Cream, teal, red, gold and orange for the toys and the studio; the wall a pale printed green, so every head stands clear of it. Each stand has its own tint. Gold is kept for what can be wound (the keys) and for frames.
- **The pictures** are the one thing that is not tin: the same scene, from his side, melted into dabs, with a brown studio backdrop, a canvas weave and yellow varnish. They are drawn by the same camera the rules read, so what reacts as hidden is hidden.
- **Shapes a child tells apart at a thumb's size:** trunk and captain's cap, comb and lace, pearls and jowls, round hat and waistcoat, neck, jaw and tail, a board with a hole.
- **Movement is clockwork, then weight.** A stand goes round in one wound stroke and stops dead; the body it carries lags, overshoots and rocks by its own temper, and what is loose on it goes on wagging. No two share a movement or a sound (`motion.ts`, `voices.ts`; `motion.test.ts` holds it).
- **What the hand shows** is a pale tin hand with a teal cuff; what is wanted has a soft yellow ring, on the ground round a stand or behind the painter's easel.

## How it is drawn

`view/tin.ts` presses shells, welds each sitter's pieces into a body, a head and one to three loose pieces that share one printed sheet and one lacquer. Stands and keys are two instanced draws for everybody. `view/portrait.ts` draws the table and whoever is on it into one tile of a six-tile sheet, once for each picture, through a four-quadrant melt. Nothing is made at module load. A tier changes the pixel ratio and, at the last, the soft shade on the ground; no answer to a touch is left out by any tier.

## The loop, made plain

Play by a child at the low end of the band showed that the first move could be copied but not what to do next. Where this section and the rest of this sheet differ, this section holds.

- **The opening round.** With nothing saved, the ghost hand plays one whole round for real (`round.ts`, `opening.ts`): it asks for a picture, turns the sitter until it faces the painter, and asks again. Any touch stops it, it plays once, and nothing it did is saved until a touch. It is the one thing that starts by itself.
- **The loop.** The bare easel asks for a picture; a picture that stands shown asks for the table to change. Calling one over and the key come in where the table changes.
- **The ladder** begins sooner: one glow after 1.5 s, on the next step only, and the hand after 3.5 s.

A picture of what somebody wants is a thing to fetch and never a verdict: nothing is counted, and everything else in the room still answers.

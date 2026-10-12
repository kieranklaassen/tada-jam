<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

Advent Market has no learning goal. It comes from the demo `lab/arcade/protos/advent-market/`, which lends its idea (a winter fair where the hand does the crafts) and its feel (warm wax that fattens a candle), and no code.

## The band and its age rule

- **Band.** The manifest band is 4 to 8.
- **What governs age 4.** The row for ages 3 to 4 of the cue table in `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md`, with its "Avoid" column as a hard limit: no text, numeral or pictorial icon to decode, no spoken instruction, no verdict, one live activity at a time, no tool on stage before it means something. One stall is in view and live at a time; the other three and the door are reached by walking along the hall.
- **The pack's rule for the range** (pack: game-design, ages-4-to-6.md): a place, props and characters who react, played with taps and drags; the child supplies the plot; the one a joke is played on overreacts and is never hurt.
- **Symbols.** The band starts below 6, so the kid side shows no word, letter, numeral or sign, and the game has no `symbols.ts`.
- **Gestures.** A tap and a drag. A drag survives a lifted finger. One finger works at a time, and a contact that only rests never deadens the game: one that landed where nothing is, or that has been down a second without moving, hands the work to the next contact that lands. A finger that holds the dipping stick, a thing or the basket is never interrupted, however still it is, and neither is a finger that is rubbing, piping or folding. Nothing needs a double tap, a pinch or a hold.
- **What `ctx.childAge` sets.** Only how much is laid out on a first visit, never what can be reached:
  - 5 and younger: at each stall one colour stands open and the two others lie under a cloth.
  - 6 and older: every cloth is already off.
  - No age (`null`): as for 5 and younger.
  - A tap on a cloth lifts it at any age, and a lifted cloth stays off. A saved fair always wins over the age.

## The toy

The finger takes the dipping stick, lowers the wick into the pot of warm wax and lifts it out again.

- **When the finger lands** on the stick, the wick or the candle, the stick hops to the finger with a wooden knock, the candle swings under it like a pendulum, the flames in the hall lean, and every fair-goer's eyes turn to it.
- **Going in,** the wax dimples and then bulges round the candle, the level in the pot rises a little, and a thick gloop sounds, lower the fatter the candle is.
- **Coming out,** every part of the wick that was under the wax is one coat fatter. The new coat is glossy and pale and turns matte as it cools. Wax runs down to the tip and falls in drops, each with its own plip and its own ring on the wax.
- **What the hand decides shows in the candle.** A deep dip coats the whole wick; a shallow one coats only the end, which grows into a club. A dip made while the last coat is still warm adds a thin coat. A candle left under the wax melts thin again while the pot bubbles, down to the bare wick, so there is always a way back to the start. At its fattest a candle takes no more: the extra coat slides off in three fat blobs.
- **Let go,** the stick swings back up to its two hooks over the pot and the candle sways to rest. The hooks, and everything else the child must touch, stand clear of the jam's round 48 px home control at the top centre, 10 px from the top.
- **Carried to the basket** and let go there, the candle goes into the basket and stands there on its fat end, leaning, with a soft knock of wax on wicker, and a bare wick hangs on the stick. The basket holds six things; a seventh sets the basket rocking with a creak and goes back to the stick. A full basket is never a dead end: a thing in it is taken out again by carrying it, a thing of the stall's own craft by a tap as well, and any thing can be given to a fair-goer.
- **The five watch,** each in its own way. Her fist closes at every coat; she grins as the candle fattens and hums when it is fat; the bundle hops; the goat licks its lips at each drop; the baker leans to peer into the pot; the tuba player's brows give him away. At a bare wick she waits, curious, with her brows up, and nobody's mouth is turned down before the child has touched anything. A candle that has melted thin under the wax makes her fist sink, once, with a falling whistle; a candle that is growing gets neither.
- **Everything else answers a touch as itself:** the pot rings like a dull bell and its wax ripples, each fair-goer flinches in its own way with its own sound, the basket creaks and its candles knock together, a painted thing answers where it is touched (the embers flare, a candle on the rail knocks, wood knocks and dust lifts), a touch on bare wall makes the nearest flames flutter with a breath of air, and either way the fair-goer nearest the place leans to look at it.
- **Why it is a pleasure with no goal.** The answer is thick, slow and warm, and it adds up: the same small movement, done again, leaves something visibly fatter in the hand, and no two candles come out alike. Random dipping always makes a candle. The simplest use, straight down and up, always works.
- **One clock.** Every motion and every sound is started by the game's own clock, which runs only while the game is attended. Nothing waits on a timer of the browser or on the sound clock.

## The object-by-action grid, and what is new on day 15

Four things the child makes, each in three sizes and three colours (gold, red, green), by nine places they can go: the four stalls and the five fair-goers. Every cell is a different sight and a different sound. A thing can go anywhere, and nothing is refused for what it is. Only want of room sends a thing back where it came from, and it flies back in sight and is heard: a full basket with no place for what would come off, and, once the basket stands out in the snow, a hand that already holds something, which the fair-goer shows by lifting what it has.

- **Size.** A candle is thin, middling or fat by its coats. A star is small, middling or large by the sheet of kite paper taken. A wreath is sparse, full or bushy by the twigs bound on. A biscuit is small, middling or large by the tin.
- **Colour.** A candle takes the colour of the pot it was last dipped in, part by part. A star has the colour of its paper, a wreath of its ribbon, a biscuit of its icing. The colours, and at three stalls the sizes, stand at the front of the stall. A tap on a colour changes the piece in work at once, and at the candle stall it pours that wax into the pot. A tap on a size never throws away work that is on the bench: a bundle of twigs is bound on beside the twigs that are there, a tin cuts the biscuit and keeps the icing that lies beyond a smaller tin's edge under it, a larger sheet takes every fold that is made, and a smaller sheet with fewer points than are folded is not taken (it hops, the paper answers, and the star stays as it is).

### At the four stalls

| Thing | Candle stall (wax) | Star stall (window) | Wreath stall (ring) | Biscuit stall (dough) |
| --- | --- | --- | --- | --- |
| Candle | Its own craft: one more coat, glossy then matte. A thick gloop, lower the fatter it is, then plips. | Stood behind the star in the window: the star lights as a lantern and its colour falls over the faces. A glassy chime, pitched by the paper's colour. | Pushed into the ring: twigs spring apart and needles scatter. A dry rustle, then a wooden knock. | Stuck in a biscuit: a cake, with a crack across the biscuit and a flame that lights itself. A crisp snap, then a small fwip. |
| Star | Dipped: stiff and shiny, a bead of wax on every point. A papery crackle, then a run of high plips. | Its own craft: one more point folded and pressed. A crease, a short dry fft. | Tied to the top of the ring: the ribbon pulls tight and the star spins once. A zip and a flutter. | Laid on the dough as a stencil: icing leaves its print. Two soft pats and a squeak of icing. |
| Wreath | Dipped: a wax bead on every twig end, like frost. A hiss and a patter of tiny ticks. | Hung in the window round the star as a frame. A creak of the hook and a tap on glass. | Its own craft: one more twig bound on. A rustle and a wound vrrp of ribbon. | Pressed into the dough: a ring print with needle marks, cut out as a ring biscuit. A squelch and a row of ticks. |
| Biscuit | Dipped: glazed in wax, shiny and useless. A deep glub and one fat plop. | Wrapped in kite paper as a parcel. A crinkle, a crinkle and a tucked tp. | Tied on the ring as an ornament. A ribbon zip and a clack of biscuit on straw. | Its own craft: one more line of icing piped, or one more cut. An icing squeak; the tin goes chk. |

### With the five fair-goers

Each reaction below is the plain one. The fair-goer's fixed taste (under "The characters and their fixed tastes") turns it one way or the other.

| Thing | Candle-maker | Baker | Goat | Tuba player | Bundle |
| --- | --- | --- | --- | --- | --- |
| Candle | Grips it in her fist. Fat: lifts it like a torch and her hat flame doubles, with a low proud hum. Thin: it droops over her fist like a noodle, with a falling whistle. | Holds it like a birthday candle, fills his cheeks and blows it out; his moustache streams forward. A long whoosh and a pf. | Chews it: a wax bubble swells from its mouth and pops. A squeaky chew, then a pop. | Drops it into the bell: the next note comes out muffled and the candle rattles round. A stopped honk and a buzz. | Holds it in both mittens like a staff. Thin: twirls it. A swish, swish. |
| Star | Tries to grip it: the paper crumples in her fist and springs back creased. A crumple and a ping. | Sticks it on his hat as a badge and salutes in a puff of flour. A pat and a soft pff. | Eats it point by point; one corner hangs from its mouth. A rip, then munch, munch. | Hangs it on the rim of the bell: when he plays it spins like a windmill. A honk and a whirr. | It sticks to the brow of the scarf and both eyes cross to look at it. A tiny ting. |
| Wreath | Wears it round her fist as a bracelet and flexes; the twigs burst outward. A creak and a shower of ticks. | Wears it as a crown and waddles a two-step. Two soft footfalls and a bounce. | Turns it in its teeth like a corn cob; needles fly, the ribbon hangs out. A ratchet crunch. | Lays it over the bell: his tune goes soft and round and his brows lift. Low muted notes, a needle falling on each. | It drops over the hood as a crown that slides down over the eyes. A soft fump. |
| Biscuit | Bites it in half with one chomp; crumbs down her apron. One loud crunch. | Taps it on his teeth, one eye huge. Tok, tok and a hum. | Swallows it whole; its shape travels down the neck. A gulp and a hiccup. | Drops it into the bell: the honk fires it out in a cloud of crumbs that lands on the goat. A honk and a patter. | Nibbles it under the scarf, which bulges. A row of tiny crunches. |

- **One thing stuck in another** (a candle in a biscuit, a star on a wreath, and so on) is one thing with one other thing on it. Given away, the fair-goer answers the pair in its own way: the baker blows out the cake, the goat eats the star off the wreath first. A third thing put on takes the place of the second, which drops back into the basket.
- **The wrong use works.** Wax on a biscuit, a star for the goat, a thin candle for the candle-maker: each gives its own result, at least as funny as the right one, and nothing is taken away for it.

**Day 15.** On day 15 the child makes a thing for one face: knowing that the candle-maker's fist wants fat, the bundle's mittens want small, the baker red, the goat green and the tuba player gold, the child chooses the size and the colour at the stall to cause the reaction they want to see again, or the one they have not caused yet. That is four crafts with their own choices of size and colour, alone or one on another, by five tastes.

(pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md)

## The representation

Advent Market has no learning goal, so no school idea is represented in its objects.

## The four mechanic questions

Advent Market has no learning goal, so the four questions about a school skill do not apply to it.

## The error as a consequence

There is no wrong answer, only results the child did not mean, and each shows where and why in the thing itself:

- A candle left under the wax is warned first: the wax bubbles at the candle, slowly and a bubble or two at a time, seen and heard, and nothing is lost yet, so a slow dip leaves no less than it found. Left longer it melts, more slowly than a coat is made: the part that is under gets thinner while the pot bubbles hard, with quick bubbles right across it, and the level rises, since the wax that melts off the candle goes into the pot. Lifted out, it is as thin as it now looks, and the next quick dip coats it again.
- A dip made too soon after the last adds a thin coat; the wet shine that has not yet gone matte is the sign.
- A thing that does not suit a fair-goer gets that fair-goer's own disgust, droop or sneeze, which is about the thing and never about the child. A thing that is not eaten stays with the fair-goer, with the mark its reaction left, and can be taken back.
- Nothing buzzes, nothing is reset, and no piece is lost for a mistake. The goat eats what it is given because that is what was done with it.

(pack: game-design, errors-show-as-consequences.md)

## The designed order, and what is stored

Advent Market has no learning goal and no order of challenges: it is open pretend play in one place, and every stall and every fair-goer can be reached from the first visit.

- **Positions.** One, with the stable id `fair`. It never moves: a fair that ends is finished as a mixed cycle, which leaves the position where it is. The id names the place and no grade, groep or level.
- **What a first visit starts with, by age.** At 5 and younger, and with no age, the child stands at the candle stall with the gold pot open, and at each stall the two other colours lie under a cloth. At 6 and older every cloth is already off. Nothing else differs.
- **What play changes.** A cloth the child lifts stays off. The fair keeps every thing as it was made and wherever it was put. Nothing shows that anything was laid out by age.
- **A harder option the child picks.** A larger sheet has more points to fold, a bushier wreath more twigs to bind, a fatter candle more dips. Each looks like more work on the bench, and the child takes it or not.

Every field of the saved state, version 1:

| Field | Holds |
| --- | --- |
| `v` | The version, 1. A higher one is unreadable and gives a fresh fair. |
| `position` | Always `fair`. |
| `finished` | The basket has been carried out of the door. The fair stands as left, the hook by the door is empty and the basket stands in the snow beside it. |
| `at` | Where in the hall the child stands: `candle`, `star`, `wreath`, `biscuit` or `door`. |
| `uncovered` | For each stall, whether its cloth is off. |
| `candle` | The candle on the dipping stick: for each of twelve parts of the wick, top to tip, its thickness as a whole number from nothing to the fattest, and the colour of its outer coat. |
| `star` | The star on the folding board: its sheet size, its colour, and how many points are folded. |
| `wreath` | The wreath on its stand: which of its twelve places hold a twig, and the ribbon's colour. |
| `biscuit` | The biscuit on the board: whether it is cut and with which tin, the icing colour, and the icing as a coarse grid of cells. |
| `pot` | The colour of the wax in the big pot, which nothing else would keep while the wick is bare. |
| `basket` | Up to six things, in the order they were laid in. The basket goes with the child: it stands on the counter at each stall and hangs on its hook at the door. |
| `held` | For each of the five fair-goers, the thing it holds or nothing, with the mark its reaction left on the thing: none, blown out, chewed, crumpled or bitten. A biscuit the goat swallows or the tuba fires out is gone: that fair-goer is saved holding nothing when the meeting starts. Crumbs, flour and needles that fly are short-lived and gone on load. |
| `chance` | Where the stream of chance stands, so the ordinary detail (which of three sneezes) carries on and is not replayed. |

- **A thing** is its craft, its size, its colour, the craft's own few numbers (a candle's twelve thicknesses and colours, a star's points, a wreath's twigs, a biscuit's tin and icing grid), what another stall left on it (nothing, a wax coat with its colour, a paper wrap with its colour, or a ring cut), a mark, and at most one other thing on it, which carries none itself. The piece in work on each bench is a thing and is saved with all of these.
- **Nothing is saved in the air.** A candle in the hand is saved on the stick, where it came from; a thing being carried is saved in the basket slot or the hand it left. A put-away under a dragging finger is no drop. A let-go just before a put-away is not undone: a thing the child has let go, still hanging in the moment a lifted finger is given, lands where it hung, and is found given, laid in the basket, used on the bench or, for the basket let go past the sill, out in the snow; let go over nothing, it is back where it came from.
- **Views, not saved.** The swing of the candle, its wet shine and warmth, falling drops, rings on the wax, the drops that land on the cloth (they cool, fade and are gone on load), and every fair-goer's pose are views of the saved state. On load the candle hangs still and matte, and nothing replays.
- **Size.** A fair with every piece in work, a full basket and five full hands, each thing with another on it, serializes far under half of the 64 KB cap, and a test says so.
- **Time.** The wax cools and the drops fall on attended game time only. Nothing reads a wall clock.

(pack: game-design, the-world-keeps-and-waits.md; "Found as left" in the guide)

## The characters and their fixed tastes

Five fair-goers crowd round whatever stall the child is at, large, and shuffle along when the child walks on. Where they come to rest none of them covers the stick, the pot, the basket, a cloth or a walking lantern, a tap on a fair-goer is never taken for one of those, and an overlap test holds it at each surface size the game's tests lay out. Each wants one thing, which always shows, and has one taste that never changes and shows on its own body.

| Fair-goer | What shows the want | Likes | Dislikes | How the taste shows on the body |
| --- | --- | --- | --- | --- |
| The candle-maker | One huge fist held out, open and empty | Fat and large things | Thin and small things, which droop over the fist or are lost in it | She is the widest thing in the hall, and the candle on her hat is fat. |
| The baker | A floury hand cupped out in front of him | Red | Green, which he holds at arm's length with his moustache turned down | Red nose, red cheeks, red neckerchief. He also blows out any flame handed to him, every time. |
| The goat | Its chin on the edge of the bench and its mouth half open | Green, which it chews slowly with its eyes shut | Gold, which makes it sneeze | A green stain on its beard and a fir twig it is already chewing. It eats paper, twigs and dough whatever their colour. |
| The tuba player | The empty bell of his tuba, turned to the child, which he taps | Gold | Red, which sours his tune | Gold buttons, a gold tuba, heavy black brows drawn down to his nose. A round thing over the bell softens his tune whatever its colour. |
| The bundle | Two tiny mittens held up out of a very large coat | Small things | Large things, which tip the bundle over backwards; it rocks like a tumbler toy and comes up again | It is the smallest in the hall, with only its eyes showing. |

- A like and a dislike are equally worth causing. A reaction starts as the thing arrives, is about that exact thing, and is never about the child: no thanks, no praise, no disappointment turned to the child.
- Nobody is hurt. The bundle that tips over rocks back up, the goat that sneezes shakes its ears and goes on chewing.
- A fair-goer who waits never hurries the child and never remarks on being ignored. With nothing in hand it goes on with its own habit: she flexes her fist, he dusts flour, the goat chews, the tuba player fingers his valves without a sound, the bundle rocks on its heels.
- Each moves like itself and no two share a movement.

(pack: game-design, characters-with-opinions.md)

## The scenes

Dipping, folding, binding, cutting and icing are handwork and not scenes: each answers the finger as it moves and is saved as it changes. A thing used at another stall is handwork too: a thing carried out of the basket and let go on the bench is used at the stall the child stands at. A tap on a thing in the basket never spends it: the thing only hops, but for a thing of that stall's own craft, which the tap puts back on its bench, where a piece that was in work and has something made of it takes its place in the basket, so that the next tap puts both back as they were; where nothing was made yet, carrying the thing back lays it in the basket again and leaves the bench bare, with that thing's colour and size standing out. With no room in the basket for what would come off, the basket rocks and nothing changes. The scenes are these.

**A meeting.**
- Cause: a thing let go on a fair-goer. The candle on its stick is given to the one whose held-out hand the finger is on; else to the one it hangs over, or, with the finger beyond the reach of the stick, to the one under the finger. A hand takes a thing only when the thing is let go on it: while the finger is down the candle goes on dipping across the whole pot, over her hand and his, and a rub round the ring or a stroke of icing that crosses a hand gives nothing away while the finger is down. Where the candle hangs is where it would hang at rest under the stick: its swing gives it to nobody. Where the finger ends decides what a pull was, at the biscuit, the ring and the star alike: a made piece dragged from anywhere on it comes after the finger with slack, and let go on a held-out hand or on a fair-goer's body, off the piece as it is drawn, it is given as it is, with the line piped or the twig bound on the way still on it; a stroke or a rub that ends on the piece stays the stroke or the rub it is, and the piece springs back onto its bench. Pulled right off its bench, the piece is carried as the finger left it. A tap never gives anything away: a giving needs a pull let go on a hand or a body, a tap on the candle leaves it on its stick, and a tap on a held-out hand is answered by that hand, which is its owner's also where it lies in front of the bench; only the piece in work, where it is drawn over a hand, answers before the hand does. A thing let go on a held-out hand is given before the bench under that hand takes it. A thing a fair-goer holds is taken back by touching the thing where it is held and carrying it off.
- Beats: the reach and the take; the reaction for that thing and that taste, as the grid has it; the settle into a pose that holds the thing. Two to five seconds.
- Saved when it starts: `held` for that fair-goer, with the mark the reaction will leave; `basket`, where the thing left its slot and where a thing the fair-goer held before is laid back in that slot; the field of the piece in work (`candle`, `star`, `wreath` or `biscuit`) when the thing came straight from its bench, which is then fresh; and `chance`.
- Filled in from: the thing's craft, size, colour and what is on it, and the fair-goer's taste.
- A touch ends it in its settled pose, and is then an ordinary touch.

**The walk.**
- Cause: a tap on one of the two walking lanterns (the lantern lights under the finger, and the walk starts when the finger lifts from it), which stand on the floor at the left and the right end of every place; the five places are a round.
- Beats: that lantern lights for the length of the walk; the hall slides by; the five shuffle along, each in its own gait, and settle. Under two seconds.
- Saved when it starts: `at`.
- Filled in from: the place left and the place reached, and what each of the five holds as it shuffles along.
- A touch ends it with everyone in place.

**A cloth lifted.** Not a scene: the cloth flies up and off on the tap, and `uncovered` is saved at once.

**The ending.**
- Cause: at the door, the basket dragged over the sill and let go in the snow.
- Beats: the door swings wide and snow gusts in; the flames lean; each fair-goer does one last thing with what it holds, one after the other (the tuba's tune as the thing in its bell has made it, the baker's breath, the goat's chew, the fist raised and the mittens waved to the things going out into the snow, each leaning to the door); the basket stands out in the snow with the child's things glowing in it; the door stays ajar. Eight to ten seconds, and the finished fair then stays as long as the child likes.
- Saved when it starts: `finished` (true) and `at` (`door`). The basket and every hand keep what they hold, so the fair stands as left.
- Filled in from: what each fair-goer holds, and what lies in the basket.
- A touch ends it in its last pose. Put away in the middle and opened again, the fair is found finished and nothing plays.

**How a fair ends, and how the next one starts.** A fair ends only when the child carries the basket out. If the child does nothing, nothing happens: no next round, no countdown. The finished fair shows the empty hook by the door with the basket in the snow beside it. A tap on the basket, once the ending's own time is up and the basket's halo stands (it swells a few times as it comes up and is then still), takes it back to its hook and begins the next fair (before that, and under the finger that set it down, the basket only rocks; a touch that ends the ending leaves the halo to come up at its own time): the basket and every hand are emptied, every piece in work is fresh, the cloths stay as they were, the child stands at the candle stall, and all of it is saved at once. On load no scene replays.

**No first showing.** This is free play with no target idea, so no character demonstrates anything. An idle child gets the ladder: a glow on the piece in work, and on the walking lantern once something lies in the basket (at the door the glow is on the basket once something lies in it, and on the walking lantern before that); then a ghost hand that makes one move (first the work of the stall, at the candle stall down into the wax and up; the time after, the made thing into the basket or a tap on that lantern; at the door, the basket over the sill once something lies in it, and before that a tap on the walking lantern), and then quiet. At the door of a finished fair the ladder lights nothing and the hand shows nothing: the halo of the basket in the snow is the only sign there, and the hand never shows the tap that empties the fair.

(pack: game-design, endings-and-short-scenes.md; "How a cycle restarts" in the guide)

## The records

Advent Market has no learning goal: it names no record of either jurisdiction and claims no school skill.

## The look

Written after the style spike, not part of the sheet. The look is the first row reserved for the game in the menu of `docs/art-direction.md`, **candlelit gouache**, and the second row was not tried: the spike held on clarity, judged from its still, and its draw count was under the bar. No frame rate was measured in the spike or since, so the frame-rate half of the spike is still owed.

### What it is

A night interior in matte opaque paint: flat daubs laid with a broad brush, soft at the edge, with no ink line and no bands of tone. Everything is lit in warm pools from small flames and from the pot of wax, and falls off into brown dark at the corners. The paint is `paint.ts`. The hall and all that stands in it are painted when the surface takes its shape; of all the paint, only a made thing is painted inside a frame, and that without blur.

- **A form** is one flat daub, two broad lighter strokes on the side the flames are on and two darker ones on the far side, each laid a little off the last. Then the whole sprite is warmed near the pot and darkened away from it, so every figure is lit from where it stands.
- **No outline anywhere.** Shapes meet as paint meets paint. Small things (buttons, rivets, flour, snow) are single dabs.
- **Dry brush** over the large flat areas (the wall, the counter, the cloth), so none of them is a flat fill.
- **Where it lives.** `paint.ts` is the brush. `scenery.ts` paints the hall, `bays.ts` the middle of each of the five places, `fronts.ts` the colours, sizes and cloth at the front, `folkArt.ts` the five fair-goers and their own parts, `thingArt.ts` every made thing, and `candleArt.ts` the candle on its stick. `sprites.ts` keeps what they paint, and `view.ts` stamps it.

### Palette

| What | Colour |
| --- | --- |
| The brown dark and the wall | `#1c120c`, `#3a2416` |
| Flame light, pooled | `#ffb347`, `#ff9a3c` |
| The three waxes, lit and pale | gold `#f0b03c` / `#ffe6a0`, red `#cf4a36` / `#f4a58e`, green `#5f9a4c` / `#b9dc9a` |
| Copper of the pot | `#b0562c`, rim `#c9763c` |
| Counter wood, cloth, fir | `#6b4426`, `#27402f`, `#1f3a2a` |
| Night through the window, snow | `#1d2f55`, `#cbd6e8` |
| The candle-maker | plum dress `#6a3550`, cream apron `#d6c298` |
| The tuba player | green coat `#2a4a34`, gold `#dfa63a`, navy cap `#22334a` |
| The baker | cream whites `#e6dabe`, red `#c23a2a` |
| The bundle | teal coat `#2f7480`, violet `#7a5596`, cream `#e9dfc6` |
| The goat | hide `#d4c8b0`, horn `#8d7858`, a green stain `#6d9a52` |

### What is in the frame

A place filled from edge to edge. The hall is the same all the way along, and the middle of the frame is the place the child stands at.

- **The hall, behind:** the plank wall under a canopy beam, a fir garland with paper stars slung along it, two tin lanterns on cords that swing when touched, and an arched window with the moon, a fir, a house with a chimney under a lump of snow, and snow falling.
- **The five, large, at every place:** the tuba player the height of the frame at the left with his bell wholly in it, the candle-maker beside him with a candle burning on her hat and her open hand held out, the baker on the right under a cloud of a hat, the bundle sitting on the counter with only its eyes showing, and the goat with its chin on the counter, bar pupils, chewing a fir twig. What a fair-goer holds is painted in its hand, on its hat, in its mouth or in the bell.
- **The candle stall:** the copper pot of wax sunk into the counter with its fire door and embers under it, the wick on its stick on two hooks above it against the plainest stretch of wall, and two rails of candles someone dipped earlier, three on one and five on the other, at uneven gaps and no two of a length.
- **The star stall:** a folding board on an easel in front of a lit pane, a pot of paste with its brush, a folding bone, and offcuts of every paper.
- **The wreath stall:** a straw ring on its peg, a heap of cut fir, a coil of straw, and a small roll of every ribbon.
- **The biscuit stall:** a dark planked board with the dough on it, a rolling pin and a bowl of flour.
- **The door:** the night outside, a fir, a far house with a chimney, a lit window and snow lying round on its roof, snow up to the sill, a trodden path with the light of the hall lying out over it, a mat, and the hook the basket hangs on.
- **In front, at a stall:** three colours (pots of wax, rolls of paper, spools of ribbon, icing bags) and, at the star, wreath and biscuit stalls, three sizes (plain piles of sheets, bundles of twigs, tins), on a green cloth with a swag of fir and apples; a striped cloth over the second and third colour until it is lifted; and a walking lantern on the floor at each end. The candle stall has no sizes: one ball of wick lies in a tray there, and nothing at that front comes in threes but the waxes.
- **The working pieces, plain:** the piece on the bench, the basket and what lies in it, and the fronts are drawn after the live light, so nothing washes over them.

At rest about a tenth of the frame is bare: the stretch of wall behind the working piece, kept plain for it. What is funny before a touch: a stern man in a plumed cap wound in a tuba, a goat that stares with bar pupils while it chews, a candle burning on a hat, a baker who is mostly nose and moustache, a child who is mostly coat. What is alive: the flames and their pools of light flicker, snow falls, the goat chews, the bundle rocks, the baker shifts from foot to foot, every eye follows what moves and blinks, and each of the five has three habits it plays by turns.

### The made things

Each thing is painted once for what it is (its craft, size, colour, what another stall left on it, its mark, and the thing on it) and kept; a thing that changes is painted again in the frame it changes, and nothing else is painted in a frame. That painting uses no blur: a thing's daubs get their soft edge from one faint stroke round each, so a thing looks the same whenever it was painted. When what lies in the basket changes, the basket's picture is put together again in that frame from pictures there are: up to eight stamps into one picture, and no paint.

- **A candle** is flat wax with one pale strip and one dark one, part by part in the colour of its coats; blown out, its wick smokes; chewed, a bite is out of it.
- **A star** is kite paper with a crease for every folded point, and lights from behind with a candle on it. Tied to a wreath it sits at the top of the ring.
- **A wreath** is a straw ring with a twig at each of its places and a ribbon. A candle pushed into it parts the twigs beside it.
- **A biscuit** is cut with a scalloped tin and iced on a coarse grid in the child's own lines. A candle stuck in it cracks it across; a star laid on it leaves a bare ring round one iced dot.
- What another stall leaves shows on the thing: a wax coat with a bead on every folded point or twig end, a paper wrap, a ring cut.

### Light

- The hall is painted once in its dark state with the light of every flame painted into it.
- Up to four flames throw a live pool that flickers: the pot's glow, the candle on her hat, and the two hanging lanterns. One small sprite of light is stamped, added, at the size each needs. The pools go on before the working pieces.
- A candle stood behind the star, and still burning, throws the colour of its paper over the hall: one added stamp at the star, a little over half the surface wide, and one small added stamp on each of the five faces, six in all, only at the star stall. The goat is drawn after the live light, so its stamp is laid on after the goat.
- A walking lantern lights under the finger that is on it and stays lit for the length of the walk it starts, and its light slides by with it. The finished basket glows in the snow once the ending is over: its halo swells three times as it comes up, each time less, and then stands still. A fair found finished finds it still.
- No blur runs in a frame, and `frameBudget.test.ts` counts that none does. The soft edge of a daub in the hall, the bays, the fronts and the fair-goers is a blur made when those sprites are painted, which is when the surface takes its shape: on load, on a resize, or on a display of another pixel ratio. A made thing is the one picture painted inside a frame, and it is painted without blur.

### Motion

- **The candle** is a pendulum under the stick: it swings when the stick is taken or moved, more slowly the fatter it is, and wax stills it. The stick is firm in the hand and comes back to its hooks on a soft spring.
- **The wax** dimples in rings where anything enters or lands and rises round what is in it. At a candle left under it, it bubbles as a warning: two slow bubbles close to the candle. While that candle melts it bubbles hard, five quick bubbles right across the pot, and rises further with the wax that melts into it, 13 stage units over the rim at most. Risen wax is drawn taller with its near edge on the rim, so it swells in the pot and never stands clear of it; with the candle out it sinks back.
- **Each bench** gives under the finger and springs back; a made piece that is pulled comes after the finger with slack from the start of the pull, and springs back if it is let go on itself or on nothing before it comes off; a thing let go flies in an arc to where it belongs; a star tied to the ring turns once on its way; a tapped colour or size hops.
- **A lifted finger.** What the finger carried hangs where it was for a fifth of a second of the game's clock, and a finger landing near it carries on.
- **The five** each have a weight and a tempo of their own (`folk.ts`, `natures.ts`): she is heavy and slow, with a fist that closes; he is stiff and goes straight up like a plank; the baker wobbles like a jelly; the bundle hops and sinks into its scarf; the goat is twitchy, with ears that fly, a jaw on a hinge, and a tongue that goes over its lip at each drop that falls from the candle. Each walks in its own gait and holds a thing in its own way. No two share a movement, and `folk.test.ts` holds them apart.
- **A painted prop** answers where it is touched: sparks rise from the embers, dust lifts from the counter, the floor and the rails, and the fair-goer nearest the place leans to it with wide eyes.
- **The walk** slides one place out and the next in, and the hall wraps, since it is the same all the way along.
- **One clock.** Every motion and every sound is started by the seconds the fair is stepped with (`clock.test.ts`).

### The ghost hand

An open hand in the look's own paint: a cream palm and four fingers and a thumb as daubs, with no outline. It comes down on the thing, presses, and carries or taps.

### Tiers

Each tier changes drawing only (`config.ts`). Tier 0: pixel ratio 2, all four live pools, snow. Tier 1: ratio 1.5, three pools. Tier 2: ratio 1.25, the pot's pool only. Tier 3: ratio 1, the pot's pool, and the window keeps its painted night without falling snow, but for the swirl of a tapped window, which is drawn at every tier, since the answer to a touch is never something a tier leaves out. The lowest tier still has every figure, every flame and the painted light, and looks like the game. A tier change paints nothing: every picture is painted once for the top tier's pixel ratio, and a lower tier stamps the same pictures onto a coarser surface.

### Draw count

A frame is sprite stamps plus live strokes and fills, and that sum is the count `frameBudget.test.ts` holds and the Mount reports as draw calls. At the busiest legal moment of each place (a full basket, a thing in every hand, the cloth still on, the work of the place under way, the ending watched to its halo at the door) it is 65 at the candle stall, 62 at the star stall, 58 at the wreath stall, 57 at the biscuit stall and 64 at the door, the same at 1180 by 820 and at 1024 by 768, with one full-surface stamp. The star stall's figure takes in the six stamps of the paper's light. The goat's tongue is one fill, and the bubbles of the pot are one stroke whether they warn or melt. A thing painted in a frame is not in the count: it is one picture, painted once, in the frame of the touch that made it.

### Registry row, a request to the lead

For the claimed-styles registry of `docs/art-direction.md`:

| Advent Market | Candlelit gouache (canvas 2D): a night hall in matte opaque paint with soft edges and no ink line, lit in warm pools from lanterns, a candle on a hat and a copper pot of wax, falling off into brown dark; five large fair-goers round each of four craft stalls and a door onto snow, with the working pieces as plain flat paint drawn over the light | `games/advent-market/ART.md` |

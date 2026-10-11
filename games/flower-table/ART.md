<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

## The band and its age rule

The manifest band is 4 to 7, and its youngest age, four, governs the design.

- **The cue-table row.** The row for a youngest age of 3 to 4 in the wordless-clarity convention. Its "Avoid" column binds the game: no text, numeral or pictorial icon that has to be decoded, no spoken instruction, no verdict, never several activities live at once, and no tool on stage before it means something. One next act is offered at a time, and one finger works at a time. The scissors are in the scene only where the finger is.
- **The pack's rule for the range** (pack: game-design, ages-4-to-6.md). Pretend play with characters who react; tap and drag; no reading and no double tap; funny through tricks, wrong uses and a visitor who overreacts and is never hurt. The game supplies the garden, the plants and the visitors, and the child supplies the bouquet.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or symbol, and the game has no `symbols.ts`. The rule follows the manifest band: a seven-year-old sees none either.
- **What `ctx.childAge` sets.** Only which visitor a first visit opens with ("The designed order, and what is stored"): a child of 4 or younger opens with the goat and its boot, a child of 5 with the bee-keeper and her jar, a child of 6 or older with the bride and her tall vase. A saved game wins over the age. Age locks and hides nothing: the visitors come round in a ring, so every visitor and every vase is reached by play from any start.
- **What no age gives.** `null` opens a first visit with the goat and its boot, as for the youngest child.

## The toy

**The action.** The finger crosses a stem and the stem is cut there: at the finger's height, between a little above the earth and just under the flower. That is the touch the finger performs most, and one touch cuts one stem.

**In an empty scene.** A bed of plants stands in a walled garden, and nothing asks for anything.

- When the finger lands on a stem, on a cut stalk or on nothing, in that frame, a pair of scissors is at the finger with its blades sprung open, with a bright double tick of steel. A finger that lands on a piece or on the vase takes hold of it with no blades. A finger that lands on a stem that has not been cut cuts it at once, at the height of the finger; a finger on the flower cuts just under the flower, and a finger at the earth cuts a little above it.
- A finger that lands beside a stem and crosses it cuts it where it crosses. The blades shut with a snip that is the plant's own ("The object-by-action grid"), pitched higher the lower the cut. The stalk left in the earth shudders and settles, a drop of sap stands on the cut, the plants on either side tremble once, and a bee on the flower lifts off, zigzags with a buzz and settles on its flower again, in the hand.
- The cut piece drops into the hand: it stands up from the finger, flower uppermost, and leans back against the way the finger moves, with the head arriving late and swinging through.
- Let go anywhere on the ground, it falls and lands in its plant's own way, with its own sound, and lies on the path where it fell.
- A piece lying on the path is picked up by a finger that lands on it. A piece let go over the vase stands in it and leans against the others; a piece let go at least half of the way to the vase flies the rest and stands in it too.
- A finger that lands on a cut stalk makes it grow back: the stalk shoots up with a rising whistle and its flower opens with a pop. A finger that lands beside a cut stalk and crosses it cuts it again where it crosses, and what comes away is a bare stalk.
- A finger that lands on nothing snips the air, with the tick of the blades opening and a snick as they shut on the lift.

**Why repeating it is a pleasure with no goal.** Every touch is answered at touch-down and the answer is bigger than the touch: blades, a snip, a shudder, a drop of sap, a falling flower and its landing from one finger (pack: game-design, touch-answers-bigger-than-the-touch.md). Each plant cuts and falls differently, so six plants are six small toys. Random tapping fells flowers one by one and brings them back, and nothing a finger can do is punished. The simplest use, one finger put down on a stem, always works, so no child is stuck on a drag (pack: game-design, toy-first.md). The same touch also makes things: where the finger crosses decides how long the piece is, and a stem cut twice gives a flower and a bare stalk.

## The object-by-action grid, and what is new on day 15

Six plants by five things a child can do with a piece of one. Every cell looks and sounds different. The last two columns are also played in each visitor's own manner ("The characters and their fixed tastes"), so a cell is not the same across visitors.

| Plant | Cut in the bed | Let fall on the path | Stood in the vase | Sniffed by the visitor | Let go on the visitor |
| --- | --- | --- | --- | --- | --- |
| Sunflower | A thick fibrous crunch; the heavy head lurches and the stalk left behind whips upright | Lands flat on its face with a flump and three seeds tick away over the stones | Its head creaks round to face the window, wherever in the vase it was put | Turns its face to the visitor's face, nose to nose, with a low boop; the visitor goes cross-eyed and comes away with a yellow nose | Flops onto the visitor's head as a hat with a whump and turns to the window, winding the head under it round with a grunt; then slides off |
| Poppy | A soft furred tear with one high drip; a white bead stands on the cut | Every petal comes off at once with a paf, and the bare pod rattles as it rolls | Nods, and lets one petal go with a pat each time another piece arrives | One petal sticks to the visitor's nose; the visitor blows it up with a pfff and watches it come down | Its petals settle on the visitor's eyelids, which blink plip, plip under them |
| Onion flower | A wet squeak, like a finger on glass; the round head bobs | Bounces twice like a ball, bonk, bonk, and rolls a little way | Slides in with a long squeak and a green haze lifts off it once | The visitor's eyes brim with a rising whine and two jets of tears squirt out sideways, psst, psst | The visitor takes it for a lollipop and bites: crunch, a purple face, and a long green breath out with a wheeze |
| Thistle | A dry crackle of three quick ticks; the stalk left behind stays stiff and does not shudder | Comes down point first, tok; let go over the bed between two stems with room beside it, it sticks upright in the earth like a dart, one thistle to a place; anywhere else it tips over and lies flat on the path | Stands stiff and straight, whatever leans on it, with a tink on the rim | Pricks the nose with a ping; the nose springs back with the thistle head stuck on it, and the visitor looks at it down both sides | Sticks to the visitor's behind like a burr; the visitor gives a yip and turns round twice looking for it |
| Ivy | A wiry twang; the cut end springs back and quivers | Springs along its own length like a coil as it lands, boing-oing, and lies in a curve | Slides in with a rustle, and a tendril creeps over the rim and down the outside with small creaks | A tendril winds round the visitor's nose, or ear, or horn, tugs and lets go with a thwip | Winds itself round the visitor like a scarf with a zip, and unwinds again |
| Dandelion | A hollow pop, as from a cut straw; the stalk left behind is a little open tube | Lands as light as nothing with a whisper, and a few seeds lift and drift | Bobs on the rim with a pip, and its fluff trembles each time another piece arrives | The sniff draws its fluff up the visitor's nose; one huge sneeze, a-choo, blows it bald | Lands on the tip of the visitor's nose; the visitor blows it away with a pfoo and its seeds sail off over the wall |

**The wrong use of each thing works and is funny.**

- A piece let go on the visitor is the last column. When that cell has played, the piece drops to the path at the visitor's feet and lies there, as it then is: a poppy without petals, a bald dandelion, an onion flower with its head bitten off. The visitor is bewildered and never hurt.
- A stem cut twice gives a bare stalk. A bare stalk stands in the vase like any piece, and a vase of bare stalks is handed over like any bouquet ("The characters and their fixed tastes").
- A piece cut too short for the vase sinks into it with a hollow tonk until only its top shows over the rim: a flower sits on the rim, and a bare stalk shows a finger's width. It is never out of sight, so it can always be drawn out again.
- A piece cut too long for the jar or the tall vase tips its head over the rim. Enough tipped heads on one side and the whole vase goes over ("The error as a consequence").
- An eighth piece does not fit: it bounces off the bunch with a boing and lies on the path.
- A flower the visitor cannot stand, put in its vase, gets that visitor's own reaction, every time.
- A finger that lands on the visitor, the cat or the robin gets that one's own answer and changes nothing else: the visitor's own bleat, hum, hiccup or sniff, a mrrp and one opened eye, a tsip and a hop. No blades show at a creature.

**On day 15** the child arranges for an effect: cuts a stem twice on purpose for a vase of nothing but stalks, knows which three plants carry bees and sends the bee-keeper off with a hatful, cuts everything to one length for the aunt's nod or stands a thistle beside a dandelion to make her laugh, keeps the dandelion for the bride's sneeze, and loads one side of the tall vase to watch it go over. None of that needs new content: it is six plants by five actions by four visitors by three vases, and the length the child cuts (pack: game-design, depth-from-combinations.md; pack: game-design, liveliness-from-causing-and-comedy.md).

## The representation

The game has no learning goal, so no school idea is represented and there is no order of object, picture and symbol.

## The four mechanic questions

The game has no learning goal and claims no school skill, so the four questions of swap, attention, fun and guess have no skill to be asked about.

## The error as a consequence

There is no right bouquet, so nothing a child makes is an error. What a child may not have meant shows in the plants and the vase, and in the visitor's face.

- **Too long.** A piece stands out of the vase by its length less the depth of the vase. In the jar and the tall vase, a piece that stands out by more than the vase is tall tips its head over the rim, on the side it leans to. The child sees which piece, and by how much.
- **The vase goes over.** Each tipped head pulls the vase its way. The boot never goes over. The jar goes over when four more heads are tipped to one side than to the other, and the tall vase when two more are. One head short of that the vase rocks and creaks at each new piece, so the child can see it coming and may insist. Then it goes over with its own clonk, the water runs out and soaks into the earth, and the pieces lie spilled on the path, each as it was. The visitor steps back, looks at the puddle and stands the vase up again, empty.
- **Too short.** A piece shorter than the vase is deep sinks into it with a tonk until only its top shows over the rim. The child sees how little is left of it.
- **The state stays.** Nothing is lost and nothing resets. A spilled piece is picked up from the path; a piece is cut shorter by crossing it where it lies, and the end that comes off is in the hand, and lies beside it if the finger lets go there; a piece in the vase is pulled out by a finger that lands on it above the rim (where its head hangs out over a stem of the bed, the finger is on the stem and cuts it), and is cut shorter by a finger that crosses it there, the top coming away in the hand. The child changes one thing and tries again.
- **A flower the visitor cannot stand** is not refused. The visitor takes the bouquet and reacts to it ("The characters and their fixed tastes"), and that reaction is as much worth causing as a happy one.
- **Never about the child.** A visitor's feelings are about the bouquet. There is no buzzer, cross, sad face turned to the child, praise or cheer, and no sound that means wrong.

(pack: game-design, errors-show-as-consequences.md)

## The designed order, and what is stored

**The order.** The game has no ladder of difficulty: nothing gets harder, nothing is judged and no cycle goes well or badly. Its order is a ring of twelve turns, always in the same sequence, so that a child meets one new visitor or one new vase at a time and then meets them in every combination. The visitors come in the order goat, bee-keeper, bride, aunt, and the vases in the order boot, jar, tall vase. The ids are as they stand in `LADDER` in `config.ts`; each names a turn of the ring.

| Id | Visitor | Vase | What is new on a first way round |
| --- | --- | --- | --- |
| `goat-boot` | goat | boot | the cut, the carry and the handing over; the boot holds any length and never goes over |
| `beekeeper-jar` | bee-keeper | jar | a taste to meet; a shallow vase, in which a long piece tips its head |
| `bride-vase` | bride | tall vase | a narrow vase that can go over |
| `aunt-boot` | aunt | boot | the last visitor, with a vase already known |
| `goat-jar` | goat | jar | known things in a new pair, from here on |
| `beekeeper-vase` | bee-keeper | tall vase | |
| `bride-boot` | bride | boot | |
| `aunt-jar` | aunt | jar | |
| `goat-vase` | goat | tall vase | |
| `beekeeper-boot` | bee-keeper | boot | |
| `bride-jar` | bride | jar | |
| `aunt-vase` | aunt | tall vase | |

After `aunt-vase` comes `goat-boot` again.

**Where a first visit starts.** `goat-boot` for a child of 4 or younger and for no age, `beekeeper-jar` at 5, `bride-vase` at 6 or older. A saved game wins over the age.

**How the position moves.** One turn on, each time the child calls in the visitor who waits at the gate, and at no other moment. It does not depend on what was arranged, on how long it took, or on a clock. Nothing on screen shows it.

**The harder thing is the child's to pick.** Nothing arrives harder unasked. A long piece in a shallow vase, and many pieces leaned to one side of a narrow one, look harder in the world, since they visibly rock, and the child tries them or not.

**Which visitor a new position lays out.** The one who waits at the gate is always the visitor and the vase of the next turn of the ring. Nothing about a visitor depends on anything that moves, so nobody is laid out before a change that would alter them.

**Nothing the game sets down covers a target.** A piece the game brings to rest (dropped at the visitor's feet, bounced off a full vase, spilled by a vase that goes over, or saved from the hand) comes to lie on the path clear of every stem of the bed, of the vase and of both visitors; where that place is taken it lies at the nearest free place of the path. A touch on it picks it up and is never taken for a cut, for the vase or for a touch on a visitor, and a touch on a stem, the vase or a visitor is never taken for a piece. The visitor at the gate stands clear of the bed, the path and the table, and the visitors and bouquets out in the street stand beside it, never behind or in front of it. The cat and the robin sit clear of every stem. Nothing a child must touch (a stem at its full height, the vase, either visitor, a piece on the path) reaches under the jam's round home control, 48 px across at the top centre and 10 px from the top. An overlap test holds all of this at 1180 by 820 and at 820 by 1180.

**What is stored.** Small plain JSON under one version number, read field by field.

- `v`: the version.
- `position`: the id of the turn whose visitor is at the table, or was last at the table.
- `finished`: the visitor of this turn has left with the bouquet. The table is empty, the next visitor waits at the gate, and nothing replays on load.
- `bed`: for each of the twelve stems, the height at which it now stands, which is its full height when it is not cut.
- `vase`: the pieces standing in the vase, at most seven, in the order they were put in. A piece is the stem of the bed it was cut from (which gives its plant and its size), which stretch of the stem it is (where its cut end was, and its length), whether it still has its flower, whether the flower is spent (a poppy without petals, a bald dandelion), and where across the mouth it was let go, in tenths. How each piece leans, whether its head tips and whether the vase rocks are worked out from these and are not stored.
- `path`: the pieces lying on the path, at most sixteen, oldest first, each a piece as above with where it lies and how it is turned. A thistle that stuck upright is stored as turned upright.
- `street`: the bouquets out in the street, at most one for each visitor, each a list of pieces as they were when it was carried off.
- `shown`: the first showings already seen: `hand-over` ("The scenes").

**How the rest is kept.**

- A piece in the hand is saved where it came from: a piece just cut, on the path at the foot of its plant; a piece picked up, where it lay; a piece pulled from the vase, in the vase. A put-away under a finger that is still carrying is no drop, and the piece goes back there.
- A stalk growing back is saved as grown when it is touched.
- When the path would hold a seventeenth piece, the robin comes down from the garden fork, takes the oldest piece that lies there and flies off with it over the wall, with a tsip and a flutter. The piece is out of the save when the robin sets off. A piece in the hand that is saved on the path counts as lying there from the moment it is cut, so the robin comes at that cut and `path` never holds more than sixteen. For pieces spilled by a vase that goes over, one robin comes for each piece over sixteen.
- What a piece did when it was let go on the visitor is short-lived and gone on load: the save holds the piece lying at the visitor's feet as it then is.
- Fallen petals, drifting seeds, sap, the puddle, a visitor's yellow nose, tears or purple face, the bees that moved into the bee-keeper's hat and the aunt's loosened bun are short-lived, are not saved, and are gone on load; the bees and the bun end when that visitor leaves with the bouquet.
- A bee is not stored: a sunflower, a thistle and an onion flower each carry one for as long as they have their flower, in the bed, in the hand, on the path and in the vase.
- No wall clock is read. The one wait in the game, the few seconds without a touch before the reach, runs on attended game time only; nothing else is timed, and nothing in the world changes because time passed.
- The largest legal state (seven pieces in the vase, sixteen on the path, four bouquets of seven in the street) is far below half of the 64 KB cap, and a test says so.

(pack: game-design, the-world-keeps-and-waits.md; pack: game-design, the-line-between-depth-and-manipulation.md)

## The characters and their fixed tastes

Four visitors. Each has the same one visible want, in its own manner: it holds its empty vase out, turned to the child, and looks from the vase to the flowers and back. The one who waits at the gate holds its empty vase up in plain view in the same way. Once a piece stands in the vase, the visitor at the table holds its hands or its muzzle out to the vase between its looks. A want is about the vase, never about the child.

| Visitor | Body and tempo | Funniest part | Loves | Cannot stand, and what that does | Where the bouquet goes |
| --- | --- | --- | --- | --- | --- |
| Goat | stocky, restless, never quite still | a lower jaw that chews sideways, round and round, under eyes with level pupils | thistles: it crunches each like a crisp and its eyes roll up | onion flowers: it eats them all the same, its own eyes run, its breath comes out green and its bleat cracks | It eats the bouquet piece by piece, last in first, all but the first piece that was put in, and trots off with that one behind its horn |
| Bee-keeper | round, slow, padded in gloves and a veiled hat | the veil, behind which only two eyes show, and the hat the bees live in | anything with a bee on it: each bee moves into her hat with its own hummed note, and with three or more she hums the chord with them | a bouquet with no bee on it at all: she turns it round, holds it to her ear and shakes it, and the bees in her hat sag | She sets it on top of the hive across the street, and her bees circle it |
| Bride | tall, floating, in a veil and a long train | the veil, which flies straight up at every sneeze | poppies: she turns once on the spot and the petals shower down over her | dandelions: the sniff ends in the sneeze of the grid, which blows every dandelion in the bouquet bald and her veil over her head | She tips it onto her head and wears it as a crown |
| Aunt | thin, stiff, upright, moves in straight lines | one eyebrow, which can leave her face, and a tight bun | a neat bunch, every piece standing out of the vase to the same height: one stiff nod, and her bun tightens with a squeak | a tipped head or a piece that leans out wide: the eyebrow goes up off her face, she straightens the piece with one fingertip, and it sinks back | She stands it on the table at her window across the street, and squares it to the edge |

**The tastes never change**, so a child can learn them and test them on purpose.

- Every visitor sniffs what it is handed, and each plant in the bouquet answers the sniff with its cell of the grid, in that visitor's manner: the goat's sneeze is a whole-body bleat that lifts all four hooves, the aunt's is one dry tut of a sneeze that she pretends did not happen.
- **A vase of nothing but stalks** is taken as a bouquet by everyone. The goat eats it with more relish than any flower, in a steady crunch like celery. The bee-keeper looks along each stalk through a glass for a bee and finds none. The bride carries it off as proudly as roses. The aunt measures the stalks against each other, and nods if they are of a length, since neatness is her taste and flowers are not.
- **The one mix that makes the aunt laugh** is a thistle and a dandelion in one vase, both still with their flower. It follows from what the two plants do: the thistle pricks her nose, her gasp draws the dandelion's fluff into it, and she sneezes her bun loose and laughs, a high hiccuping laugh heard at no other time. It works every time and is never hinted at.
- **The ivy unveils the bee-keeper.** When she sniffs a bouquet with ivy in it, the tendril takes hold of her veil and lifts it, and for a moment a very small face is seen. This too works every time and is never hinted at.

**The reactions are the feedback.** A visitor reacts to the exact bouquet in front of it: these plants, these lengths, this lean. A reaction starts as the nose reaches the flowers and reads from across a room. No visitor thanks, praises or blames the child, complains of waiting, hurries, or remarks on the child stopping, leaving or coming back. The visitor a trick is played on is bewildered and never hurt.

**Not customers, and alive all the same.** A cat sleeps on the window sill and opens one eye at each snip. A robin sits on the handle of the garden fork at the window end of the bed. A bee sits still on each sunflower, thistle and onion flower with its wings folded, and flies only when its flower is cut, dropped or handed over. The plants are the working pieces and stay plain: no face, no pattern and no motion of their own, so a stem moves only when it is cut, grown, carried, dropped or nudged. None of them wants anything.

(pack: game-design, characters-with-opinions.md)

## The scenes

Each scene is a list of timed beats filled in from the state of play, built on `scene.ts`. Its outcome is saved when it starts. Any touch ends it at once with everything where the scene was taking it, and that touch is then an ordinary touch.

**Coming in** (about 4 seconds). *Cause:* the child touches the visitor who waits at the gate, while the visitor of this turn has left. A first visit opens with its visitor already at the table and the empty vase set down, so the table is never bare and the first visitor is not seen walking in; that first garden is saved as the game opens, before any touch. *Beats:* the visitor comes to the table in its own walk; it sets the empty vase down with that vase's own knock; every cut stalk in the bed grows back, one after the other from the window end, each with its whistle and pop; the next visitor of the ring steps into the gateway with its vase held up. *Filled in from:* which visitor, which vase, which stalks were cut. *Saved at the start:* `position` one turn on, `finished` cleared, `vase` empty, every stem of `bed` at its full height, and that visitor's old bouquet gone from `street`. `path` is not changed: what lies on the path stays.

**The reach** (about 2 seconds, once ever). *Cause:* at least one piece stands in the vase, `hand-over` is not in `shown`, and the child has not touched anything for a few seconds of attended time. *Beats:* the visitor lifts the vase a hand's width, sniffs at it once, and sets it back. It shows that the vase can go to the visitor, and says nothing about whether this bouquet is done. *Saved at the start:* `hand-over` in `shown`. Put away before it starts, nothing plays on load and the showing is still owed: it starts at this same cause, with the seconds counted afresh from the load.

**The vase goes over** (about 3 seconds). *Cause:* the load of a vase changes (a piece is let go into it, drawn out of it, or cut short in it) and what is left tips it past what it stands ("The error as a consequence"). *Beats:* the vase leans and falls with its own clonk; the pieces slide out and come to lie on the path; the water runs and soaks away; the visitor steps back, looks, and stands the vase up. *Filled in from:* the vase, the pieces and the side it fell to. *Saved at the start:* `vase` empty, and in `path` every spilled piece where it will lie, less the oldest pieces over sixteen, which the robins take.

**The handing over** (6 to 10 seconds, the ending). *Cause:* the child touches the visitor at the table, or carries the vase to it, while at least one piece stands in the vase. A vase let go short of the visitor, or in the hand at a put-away, slides back to its place on the table with every piece as it stood, so its place is not stored. With an empty vase the same touch is only a poke. *Beats:* the visitor takes the vase up and sniffs; for the first three kinds of plant that still have a flower in the bouquet, in the order the child put them in (a bouquet of bare stalks is not sniffed kind by kind), that plant's sniffed cell of the grid in this visitor's manner, the same every time for the same bouquet; then the visitor's own answer to the whole bouquet (what it loves, what it cannot stand, the stalks, the laugh, the unveiling), which never depends on which three were sniffed; then it carries the bouquet out through the gate in its own walk to where its bouquets go, and stays there in the street with it. *Filled in from:* the pieces in the order and the lean the child gave them, their lengths, the visitor. *Saved at the start:* `finished`; `vase` empty; this visitor's bouquet in `street`, with its pieces as the scene will leave them (a dandelion already bald where a sneeze will blow it, and for the goat only the one piece it keeps); and `hand-over` in `shown` where it is not there yet.

**Secrets** play the same way every time, inside the handing over, and are never hinted at: the aunt's laugh, the bee-keeper unveiled, each visitor's answer to a vase of stalks.

**How a cycle ends and the next one starts.** The handing over ends on a finished scene that stays as long as the child likes: the visitor stands out in the street with the bouquet, on its table, its head, its hive or its horn, and the bouquets of the visitors before it are still out there with them. The bed is as the child left it, and so is the path. If the child does nothing, nothing new starts, and there is no countdown. The next visitor stands in the gateway in plain view with its empty vase held up, and neither hurries the child nor complains. The next cycle starts when the child touches that visitor. While the visitor of this turn is still at the table, a touch on the one at the gate is answered with a small lift of its vase in its own manner and changes nothing else. On load nothing replays: the garden is as it was left, in the middle of a bouquet or after the handing over, with the next visitor at the gate.

(pack: game-design, endings-and-short-scenes.md; pack: game-design, guided-discovery.md)

## The records

The game has no learning goal: it has no records part, names no record of either jurisdiction and claims no school skill.

## The look

Written after the style spike and brought up to the game as built. The look in use is the first one reserved for the game in the ledger of `docs/art-direction.md`: **oil-paint still life**. The spike held on clarity and on the draw budget, so the second reserved look was not tried.

**What it is.** A walled garden painted as a Dutch flower piece hung in a gilt frame: thick loaded strokes with a ridge that catches the light from one window at the upper left, a dark glazed ground of umber, a net of fine cracks in the varnish, and the frame's gilt edge round the whole surface. Over the top of the wall a sunlit street shows, where the visitors live. There is no tone band, no ink line and no paper.

**How it is made** (`paint.ts`). Everything is laid down with three marks: a stroke, a dab and a filled passage worked over with the brush. Each mark has a dark edge where its ridge throws a shadow, bristle streaks along the pull of the brush, and a wet glint on the side that faces the window. A glaze is the same mark with its gloss turned down, so it lies flat. Marks are made once, into sprites and into the scenery, and never per frame.

**Palette.**

| Part | Colours | Rule |
| --- | --- | --- |
| Ground: wall, earth, path | umbers from `#241509` to `#40290f`, brick `#44281a`, stone `#6f5c44` | low contrast, gloss near nothing, never brighter than a plant |
| Still things: pear tree, garden fork, gateway, stone table | the ground's colours, one step lighter | glazed, so they sit back in the wall |
| The street over the wall and through the gate | sunlit ochre `#d2ac74`, tiled roofs, sky `#b9cfd6` | light, but thin and flat: nothing in it is glossy, and nothing in it answers a finger |
| The six plants | sunflower `#ffd23a`, poppy `#e23a1e`, onion flower `#a57cdd`, thistle `#c247a0` on silver green, ivy `#2f6b3a` edged with cream, dandelion white | the lightest and most saturated things in the frame, full gloss, since dark grounds hide a silhouette |
| The goat | cream `#ecdfc6` with a brown saddle patch, amber eyes, red collar and bell | large and pale, full gloss |
| The bee-keeper | a quilted cream suit, a straw hat shaped like a hive, a grey veil | round and pale; her face is only seen through the veil |
| The bride | white dress and train, a long veil, a pink sash | the tallest and thinnest of the four |
| The aunt | dark purple, a grey bun, one eyebrow | the one dark figure, so her face is the lightest thing about her |
| The three vases | boot: brown leather; jar: thick green glass; tall vase: white china with blue | each reads by its outline alone |
| The cat, the robin | ginger `#c7742b`, a red breast | small warm notes away from the bed |
| The gilt edge | `#b78a2c` with beads of `#e9c75a` | only at the frame |

**What can be touched** is told from what cannot by light and by paint: the plants, the vase and the visitors in the garden are thick, glossy and bright, and the garden behind them is thin, dark and flat. The plants are the working pieces, so they are the plainest things in the frame. They carry no face and have no motion of their own: a stem moves only when it is cut, grown, carried, dropped or nudged.

**Where things stand** (`layout.ts`, one set of numbers for the painter and for the finger). The bed fills the left half, twelve stems from the window end. The stone table stands to the right of it with the vase on its near end and the visitor behind it. The gateway is at the right edge, and the one who comes next waits in it at half size, on a pale doorstep of its own, with its empty vase held up on its head; it stands beside the visitor at the table, never behind it. Over the wall, from left to right: the aunt at her window with a table beside it, the hive, the bee-keeper, the goat, the bride. A bouquet that is carried off is seen there: behind the goat's horn, on the hive, on the bride's head, on the aunt's table. The path runs along the bottom, and what lies on it lies flat inside that band (`place.ts`). The top centre and the top right corner hold nothing that answers.

**Depth.** Painted in this order: the street, clipped to above the wall; the one in the gateway; the visitor at the table; the table, the vase with what stands in it, the visitor's arms; the bed; what lies on the path. The two visitors do not overlap while both stand still. One that leaves goes out through the gate behind the one who waits there: it, its vase and its arms are painted before the one in the gateway for the length of the walk out.

**The empty vase.** While nothing stands in it the visitor holds its vase out towards the bed with both hands on its own side of it, so the vase is in plain view: the goat tips the boot and bobs it, the bee-keeper tips the jar a little and slowly, the bride lifts hers and lets it float, the aunt pushes hers out level and still. It is set down the moment a piece is in the child's hand.

**Lighting.** One window at the upper left. Every ridge is lit on the side that faces it and shadowed on the other, in the sprites and in the scenery alike. A shaft of daylight lies across the wall from the window towards the bed, and dust drifts in it. Nothing casts a moving shadow.

**Motion.** Each thing moves as itself and no two share a move (`acting.ts` gives every act of every visitor its own pose, and `acting.test.ts` holds that no two are alike).

- The goat chews sideways without end with the beard a beat behind the jaw, breathes hard, shifts its weight, flicks one ear, follows the finger with level pupils, puts its ears up at a snip, and takes things with its mouth.
- The bee-keeper is slow: she rocks from boot to boot, bends at the middle, and her hat jumps before she does. Two bees live in her hat and fly round it wherever she stands in the garden; the bees of a bouquet she loves move in with them, and all of them hang low when a bouquet brought none.
- The bride floats: she rises and sinks where the others step, and her veil arrives after her.
- The aunt is stiff: nothing moves but her eyes, which snap from one thing to the next, and one eyebrow, which can leave her face. Her bun comes loose when she laughs.
- The cat breathes in its sleep, its tail hangs off the sill and sways, lashes when it is touched, and one eye opens at each snip.
- The robin hops and turns on the fork handle, and flies down, off and home when the path is full.
- A bee rides its flower with folded wings and only blurs them while it flies.
- A cut stalk whips and settles (a thistle stays stiff, an ivy whips hardest) and its neighbours tremble once. A stalk shoots back up past its height and settles, shut, and its flower opens with the pop: from nothing, past its size, and back (`opening` in `view.ts`).
- Each plant lands its own way, stands in the vase its own way, and does its own thing to a nose and to a visitor it is let go on ("The object-by-action grid").
- The piece in the hand leans back against the way the finger moves, and its head arrives late and swings through.
- A vase one head short of going over rocks and creaks; the jar rolls when it goes, the tall vase comes down in one piece.

**Cut ends and tipped heads.** Every cut shows the pale round face of the stalk with a darker rim, on the stalk in the bed and on both ends of a piece. A dandelion's is a little open tube, with a dark middle. The bead that stands on a fresh cut is the plant's own: white milk on a poppy and a dandelion, clear water that runs down an onion flower's stalk, thick green sap on a sunflower and an ivy, next to nothing on a thistle. A head that tips out of a vase bends over in a curve, not at a corner. No head tips in the boot, which holds any length upright.

**In the hand** each plant hangs its own way (`IN_HAND` in `garden.ts`): the sunflower lurches and swings slowly, the onion flower's head bobs, the thistle is stiff, the ivy quivers, the dandelion trails, the poppy nods.

**Loose things** are flat dabs of one colour each: seeds, petals, fluff, drops, and a pale green haze for the smell of an onion flower, off the flower in the vase and out of the mouth that bit it.

**The window** is paned: its glazing bars are thin and in the tone of the stone round them, so that they read as glazing in a lit window and as no dark sign on the palest patch of the picture.

**Spilled water** spreads round on the table where the vase fell, drips off it as loose drops, and spreads in a second pool on the ground to that side, which soaks away. No streak joins the two pools.

**A thistle that stuck** stands with its foot in the earth of the bed, in front of the row of stems, and is painted with what lies on the path.

**Small props.** The bee-keeper's glass is a solid pale lens in a brass rim on a wooden handle she grips. The table at the aunt's window has a leg at each end and a white cloth over its front.

**The frame.** The wall, the street, the bed, the path and the gilt edge are painted out to the edges of the surface, whatever its shape. In the still of the garden as a first visit finds it, the wall between the pear tree and the visitor is the one bare passage, a little under a tenth of the frame, read off the still by eye and not counted; the strip of path where pieces fall is about a fifteenth more. What is funny before a touch: a goat with level pupils and half-shut lids chewing sideways, its hooves up on the table beside its own old boot; a bee-keeper in the gateway with a jar on her hat; an aunt staring out of her window. What is alive: the visitor, the cat, the robin, the bees and the dust in the light.

**How each tier keeps the look** (`config.ts`).

| Tier | Pixel ratio | Motes of dust | Loose bits at once | What is kept |
| --- | --- | --- | --- | --- |
| 0 | 2 | 16 | 48 | everything |
| 1 | 1.5 | 10 | 32 | every stroke; the scenery and the sprites are painted again at the new ratio |
| 2 | 1.25 | 6 | 20 | the same |
| 3 | 1 | 0 | 12 | the same, with no dust |

No tier changes a rule, a creature or a plant. A tier change paints the scenery and the sprites again, once.

**Draw budget.** Counted by `frameBudget.test.ts`, which draws the real garden through the real view onto a canvas that counts: a stamp is one `drawImage`, a path is one fill or stroke. The scenery is one stamp of the whole surface, and it is the only one. What lies still on the path is painted once into one layer and painted again only when a piece there changes, so a full path is one stamp; a piece that is falling is drawn by itself until it lies. Loose bits are one filled path for each kind, however many fly. The garden at rest is 30 stamps and 16 paths. With the idle glow it is 45 and 16. The handing over of a full jar comes to at most 55 and 25. The most a frame can come to, with seven tipped heads in the jar, sixteen pieces on the path, a piece in the hand, every kind of loose bit in the air and the glow, is 75 and 26. The test's budget is 80 stamps and 32 paths. A visitor out in the street is one stamp and its bouquet one more, painted again only when a bouquet changes. No frame rate has been measured.

**The registry row, a request to the lead.** For the claimed-styles registry of `docs/art-direction.md`:

Oil-paint still life, Flower Table, `games/flower-table/ART.md`

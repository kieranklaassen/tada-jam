<!-- template: cartridge/ART.md v3 -->
# Design sheet

Written before any game code, and checked by someone who did not write it before the game is built on the toy. The headings stay in this order. The look follows the sheet at the end of this file.

What each heading asks for is in the section "The design sheet" of `docs/solutions/conventions/building-a-jam-game.md`.

The one idea: the child feels wool thin out under the finger and sees the shape they laid start to breathe. A sheet of dark felt in a frame fills the middle of the room. The verb is to lay wool, and the felt answers by turning what was laid into a piece of country or weather that moves as itself.

## The band and its age rule

The manifest band is 4 to 8, and the age 4 governs the design.

- **The cue-table row for 3 to 4.** The child handles the things directly and learns from what the world does back. Cues used: a breathing glow on what can be touched now, a ghost hand that shows one move, characters who gaze and reach, and a material that corrects itself (wool laid low is not a cloud, and it shows). Avoided, as that row's "Avoid" column says: any text, numeral or picture sign that must be decoded, spoken instructions, verdicts, several activities live at once, and tools present before they mean anything. One next act is offered at a time. The hand's usual move is laying wool, or carrying a figure onto a thing that lives while none stands in the picture, and the glow and that hand come at most four times in an idle stretch. The hand shows a bowl before it ever shows a figure: it lays wool from the chosen bowl, and with the comb chosen it taps the bowl last chosen, which is the way back to wool. Two moves the hand shows once in a visit and never again: it points at the comb, at the first showing after wool lies on the felt and with the glow on the comb before it, when the comb has not been used and is not in the hand; and it takes the loop to a peg only as the fourth and last showing of an idle stretch, which begins 84 idle seconds in, and only while a thing lives on the felt and a figure stands in the picture, because hanging the picture ends it and cannot be undone. A touch never brings either back. The comb also shows itself without the hand: once in a visit, a moment after the first thing wakes on the felt, it wriggles where it lies on the table with a tick of its teeth, unless it is in the hand.
- **The pack's rule for the age range.** The band starts at 4, so the rule for ages 4 to 6 holds: a place, props and characters who react, with the child supplying the plot; tap and drag are the only gestures, a laid line survives a lifted finger because every touch on the felt lays wool again, and there is no reading, no double tap and no hold. A figure or the comb in the hand hangs where a lifted finger left it for 0.3 seconds, and a finger back on it in that time carries on; after that, or when the game is put away, it is set down there. A palm or a finger that rests where nothing is to hold, or that has lain still for a second holding nothing in the air, gives way to the next finger that lands; so does one that landed on a bowl or on the comb a second ago and has not reached the felt, and so does one that has lain on the felt a second without moving, whose wool stays: a palm on a bowl or on the felt never deadens the game. A finger that lands while another works is not dropped: it waits, and when the working contact gives way or lifts it takes over the work where it is. A finger that lays wool or combs by moving, or carries a figure or the loop, is never interrupted. Mischief works: wool laid on a figure sticks to it. Every bowl answers on a circle of 120 stage units, the bowls stand 136 apart, and a figure in the picture answers on at least 80 by 80. No bowl, figure, comb, peg, hung picture, fresh felt, yarn loop or part of the sheet inside its frame lies under the jam's round home control (48 px across, at the top centre, 10 px from the top) or in the grown-up's corner (72 by 72 px at the top right), at any surface size the stage is fitted to, and a test holds this at 1180 by 820 and at 1024 by 768.
- **The symbol rule.** The band starts below 6, so the kid side shows no word, letter, numeral or sign, and the game has no `symbols.ts`.
- **What `ctx.childAge` sets.** Only how much wool the first tuft of a first visit holds. Age 4 and younger: a handful, broad and quick to fill. Ages 5 and 6: a tuft. Age 7 and older: a wisp, fine enough for detail. It is a default and never a gate: a tap on the bowl that is already chosen draws up the next size, for every child, and the saved size wins over the age.
- **What no age gives.** `null` gives the same as age 4 and younger.

## The toy

The action the finger performs most is a touch on the felt.

- **A touch that lands** lays a puff of wool from the tuft that stands drawn up on the chosen bowl. The puff is on the felt in the same frame the finger lands, as a soft veil with strands in it. It sounds as a short breathy puff with the bowl's own low note under it.
- **A finger that moves** leaves wool along its path: thick where it goes slowly or waits, thin and broken where it goes fast, with the strands lying the way the finger went. The tuft is spent as it is laid, so a long line thins out to single strands toward its end, and loose fibres float up from under the finger. It sounds as a dry, soft brushing that gets brighter with the finger's speed and fainter as the tuft thins.
- **When the finger lifts**, what was laid clings: it gives one small squash, and then it starts to move as what its colour and its height make it (the grid below). A touch that adds wool to a shape of the same colour makes that shape bigger; wool of another colour lies over it as a veil, and the lower colour shows through.
- **A tap on a bowl** draws a tuft up out of it: the heap dips and springs, the tuft stands on the heap, and the other bowls' tufts sink back. It sounds as a soft pluck at that bowl's note. On the bowl already chosen the heap dips and the pluck sounds when the finger lands, and the next size is drawn up when the tap ends, with a second pluck; a finger that goes on from there to the felt keeps its size. A finger that lands on a bowl and goes on to the felt lays wool from where it crosses the frame, in one stroke. On the way the tuft is off its bowl and under the finger, and when the finger lifts a new one grows on the bowl.

The room around it is without a task: four large felt figures stand beside the frame and watch the finger, and a fat moth sits on the corner of the frame.

Repeating it is a pleasure with no goal because the wool is never the same twice: the same stroke is thick or thin by how it was made, each veil changes the colour under it, and what was laid goes on moving while the child only watches. A touch anywhere on the felt always lays wool, so the simplest use always works and nothing can be done wrongly. That holds with the comb chosen too, wherever no wool lies: the touch lays wool from the bowl last chosen (the green one, where the game was opened with the comb chosen) and the comb is back in its place, and only a touch that lands on wool combs it.

## The object-by-action grid, and what is new on day 15

Six things by five actions. The things are the five wools and the comb that lies beside the bowls. The first three actions are laying on the felt at one of three heights, which are the thirds of the sheet and are read from where the middle of the laid shape lies. The fourth is laying over wool that is already there. The fifth is the wrong use, on a felt figure, and it works every time.

| | Laid low | Laid in the middle | Laid high | Laid over other wool | Laid on a figure |
| --- | --- | --- | --- | --- | --- |
| **Green** | A hill. It swells and sinks like a sleeper's back, and grass tips flick along its top. A slow hum that rises and settles. | A bush. It shivers from its middle outward and is still again. A dry, leafy rustle. | A treetop. It leans to one side with its strands streaming, and sways back. A long whisper that falls. | Overgrown: the thing underneath sprouts a fringe of grass tips and moves at half its pace. A creeping run of small pops that climbs. | A green coat. The wearer takes it for grass and tries to eat it off its own back, turning round and round. Chomping, and then the wearer's plain voice. |
| **White** | Mist. It creeps sideways along the ground, thinning and gathering. A breathy hush that slides from one side to the other. | Smoke. It curls upward in a slow bend and thins at the top. A soft sigh upward with a few small crackles. | A cloud. It drifts as far as its wisps reach and back, and rains on whatever lies under it. A hollow swell, then the patter of drops, which is heard only when drops are drawn. One tap of a handful or of a tuft is thick enough to rain; a cloud with no wool more than one level thick does not rain, and wakes with the swell alone. | Hazed: the thing underneath goes pale and slow, as under frost. A faint glassy tinkle, and the thing's own sound comes muffled and lower. | A cloud on the head. The wearer cannot see, walks into something three times and then stands where it was set, and a small rain of its own falls on it. A patter, and a soft bump each time it walks into something. |
| **Blue** | A pond. It lies flat and rings widen from its middle. A deep plop with a ring that falls away. | A stream. Its strands run from one end to the other and glint. A babble of quick small notes that tumble along. | Wind. Streaks race sideways and fray, and a cloud beside it is pushed along. A whistle that rises. | Wet: the thing underneath darkens, glistens and drips. Spaced drips, each lower than the last. | Soaked. The wearer shivers, and three times it shakes itself like a dog and drops fly off. A flapping shudder with each shake, and plinks after the first. |
| **Yellow** | Corn. Waves cross it from side to side. A dry swish that comes and goes. | A fire. Tongues leap and shrink and sparks rise. A crackle over a low flutter. | A sun. Its rays breathe out and in, and it dries the rain near it. A warm swell of two notes a fifth apart. | Lit: the thing underneath brightens and moves quicker. A shimmer of quick high notes over the thing's own sound. | Aglow like a lantern. The wearer struts, and the moth leaves the frame to circle it for about three seconds and then goes back to where it sat; a moth that is in the air when the coat goes on goes to circle the wearer when it lands, if the coat is still on. A rising hum and the moth's flutter. |
| **Russet** | Earth. It lies heavy and its clods slump one by one; under rain it is mud that glistens and bubbles. A low thud and a crumble. | A trunk. It stands and sways stiffly from the root. A slow wooden creak. | Leaves. They loosen, tumble down in loops and gather again. Papery flicks that fall. | Weathered: the thing underneath droops and goes heavy. A long groan downward with a crumble. | Muddy. The pig rolls in it with its legs in the air; any other wearer holds its arms or wings away and wipes. A squelch and the pig's plain grunt, or a squelch and a huff. |
| **The comb** | Combs wool thinner in furrows; the fluff rolls away along the ground. On bare felt, where it comes when it is drawn on from wool or carried there from the table, it raises dust that rolls. A low rasp and a soft rolling patter. | Combs wool thinner; the fluff hangs and drifts sideways. On bare felt the nap stands up in a pale stripe and lies down again. A rasp with a ripping zip. | Combs wool thinner; the fluff floats up and off the top. On bare felt stray fibres stand on end. A light, high rasp with rising tinkles. | Lifts the top veil only: the thing underneath shakes itself free and moves as itself again. A peeling rip, then that thing's own sound. | Combs a coat off in one tuft, which floats down. With no coat it tickles, and each figure laughs in its own way. A soft tearing puff as the coat comes away; with no coat, a giggle in that figure's voice. |

On day 15 the child paints weather and country for the figures on purpose: a ridge for the shepherd with the cloud parked over the next hill so that he stays dry, earth with rain on it for the pig, a stream that runs into a pond for the goose, and veils over them (a lit hill, a hazed stream, an overgrown trunk). That is five colours by three heights by five veils, found by laying and not from a list. Each of the fifteen things also carries a few stitched lines of its own dye, so that it can be told from the others in a still picture: grass tips on a hill, leaves and a few single grass tips in a bush, a scalloped crown and a stem on a treetop, long wisps in mist, curls over smoke, big puffs on a cloud, half-rings on a pond, ripples on a stream, streaks that end in a curl in wind, ears on corn, tongues and sparks on a fire, rays round a sun, clods and cracks on earth, bark and roots on a trunk, and tumbling leaves.

## The representation

This game has no learning goal, so no school idea is represented in its objects.

## The four mechanic questions

This game has no learning goal, so the four questions about a school skill built into the mechanic do not apply.

## The error as a consequence

Nothing here can be done wrongly, so what follows is what a child may not have meant.

- **Wool too slight to live.** A shape of fewer than ten cells of the sheet's grid is a scrap: it trembles and does nothing else, exactly where it lies, and it is saved in `felt` like any other shape. More wool on it wakes it.
- **A cloud laid low.** It is mist, and no rain comes from it. It shows on the ground where it lies: a figure standing in it is hidden to the ears: of the sheep and the pig only the ears show, of the shepherd only his hat, and of the goose its head down to under the eye, with its bill, on the line where the mist ends, and it still answers a touch where it stands. White laid high is the cloud.
- **A figure where it has nothing.** The sheep on blue stands to its knees in water, does not graze, and looks at the nearest green. The goose on a hill walks in a circle and stretches its neck toward the nearest blue. Each shows what it lacks by where it looks.
- **Rain where it was not wanted.** The shepherd under a cloud sits down wet and bewildered, under that cloud and nowhere else. A sun laid beside the cloud dries him, a cloud combed until none of its wool lies more than one level thick stops raining in that moment, with the comb still on it, and he can be moved.
- **A veil that changed a thing.** A stream hazed with white runs slow. The veil shows as the paler colour on it, and the comb lifts it.

In each case the state stays. Nothing is undone, nothing is taken back, and nothing gives a verdict. The child changes one thing and goes on: more wool, another height, a figure moved, a veil combed off.

## The designed order, and what is stored

The game has no learning goal and no order of challenges. It is open pretend play on one sheet at a time, and the depth is in the grid above, which is all there from the first visit: five bowls, the comb and four figures.

**The places, in order.** There is one, and its id, as it stands in `config.ts`, names the play and never a grade or a level:

1. `open-felt`: everything is on the table.

**What a first visit starts with, by age.** A bare sheet in the frame, the four figures in the dish, the green bowl chosen, and a first tuft whose size follows the age: 4 and younger, or no age, a handful; 5 and 6, a tuft; 7 and older, a wisp.

**What play changes.** The sheet, where the figures stand and what they wear, the chosen bowl or comb, the size of the tuft, and the pictures on the wall. One cycle runs from a bare sheet to a picture hung on a peg. No cycle goes well or badly: every one is mixed, and the place never moves.

**A harder option is the child's to pick.** A wisp lays a finer line than a handful and is harder to fill a hill with. One tap of a wisp lays fewer than ten cells, so it is a scrap until more wool wakes it. It shows on the bowl as a thin tuft, and the child picks it with a tap on the chosen bowl.

**Who waits.** There is no customer. After a picture is hung, the next felt already stands on the easel in its frame with its wooden back to the room, and waits there. A touch turns it round.

**Where things come to rest.** Nothing the game sets down covers a target. A figure that goes home goes to its own place in the dish, clear of the bowls, the comb, the pegs and the frame's loop. A hung picture covers its own peg and nothing else. Fluff and loose fibres answer no touch and cover nothing for longer than a moment. A figure standing in the picture is itself the target where it stands: a touch on it lifts or pokes the figure and never lays wool behind it, and wool laid across it becomes its coat. A test holds the resting places apart at each surface size the stage is fitted to.

**Every field of the saved state.**

| Field | What it holds |
| --- | --- |
| `v` | The version of the record, 1. |
| `position` | The place in the order above, as its id. |
| `finished` | True from the moment a picture is hung until the child turns the next felt round. While it is true the room is in evening light and the sheet on the easel shows its back. No tuft stands on a bowl then: a bowl or the comb that is tapped dips and sounds, and nothing is chosen or drawn up until the felt is turned. |
| `felt` | The shapes on the sheet, oldest first, so that a later one lies over an earlier one. At most 20: wool that would start a twenty-first is laid all the same and joins the nearest shape of its dye as one shape that moves together, or, where the sheet has none of that dye, the two nearest shapes of one dye are joined as one to make room, so no touch is refused and no wool is lost. Each holds `dye` (0 to 4), its box on the sheet's grid of 72 by 48 cells (`x`, `y`, `w`, `h`) and `cells`: the box row by row, one character for a cell with wool (its thickness, 1 to 7, and which of 8 ways its strands lie) and one character for a run of up to 8 empty cells. Two shapes of one dye never touch, since wool that touches its own colour joins it, so the sheet holds at most one character for each cell and dye. A shape the comb has parted in two stays one shape, and its parts move together. |
| `hand` | What the finger works with: 0 to 4 for a bowl, 5 for the comb. |
| `size` | The tuft drawn up: 0 a handful, 1 a tuft, 2 a wisp. |
| `folk` | The four figures in a fixed order (sheep, goose, shepherd, pig). Each holds `at`, which is `null` in the dish or the cell of the sheet where the child set it, and `coat`, which is `null` or the dye laid on it. |
| `wall` | The last three hung pictures, oldest first. Each holds `peg` (0 to 2) and `veils`: the picture at half the sheet's grid, 36 by 24 cells, one character a cell for the topmost dye and its thickness. |

The largest state is under 30 KB, and a test builds the largest legal state and holds it under 30 KB. A shape is saved as it lies, and its exact strands are laid again from the cells on load, each cell's wool in the direction its last stroke had. The stitched lines a thing carries are placed from its dye and from where its box begins, so a load finds them where they were. Nothing else stays. The wool in the hand, loose fibres and combed-off fluff, rain, steam, wetness, a figure's walk and its pose, and the corner the moth sits on are views of what is saved or short-lived: on load a cloud is already raining on what lies under it, a figure stands where the child set it, the moth sits on the frame's top left corner, or under the lower edge of the newest hung picture, where it covers none of the picture, while `finished` is true, and nothing eases in. When a fourth picture is hung, the oldest leaves the wall in that scene's save: the goose takes it down and tucks it behind the stack on the easel, where it is a bare felt again.

## The characters and their fixed tastes

Four felt figures live in the dish and, once the child sets one on the sheet, in the picture. In the dish each is large and shows its one want by where it looks whenever the finger is still. When a thing wakes on the sheet, every figure in the dish turns its eyes and its head to that thing for a moment and stays where it stands, and the first figure in the order sheep, goose, shepherd, pig that is drawn to such a thing (the sheep to a hill or a bush; the goose to a pond, a stream, wind or a cloud; the shepherd to a hill, a fire or a trunk; the pig to earth or corn) is heard once in its plain voice as it looks. None hops, none sounds glad at the child, and none goes to the thing by itself: the child carries it there, and there it does what the place makes it do. Set on the sheet, a figure stands at about half that size where it was let go, and then does what the place under it and the weather over it make it do. Its walk is a view: it is saved where the child set it. What a figure does at a moment (a sneeze, a shake, a bump, a hat blown off, a loop flown, a roll downhill) is heard in the moment it is seen, every time, and comes a set number of times after the figure begins it, at most three; after that the figure goes on quietly in that place, which is how a load finds it. The tastes never change, so a child can learn them and test them on purpose.

- **The sheep wants to graze.** In the dish it chews at nothing and looks at the green bowl. On a hill or a bush it puts its head down and nibbles, and the grass tips there shorten and grow back. It grazes only green: anywhere else it stands and looks at the nearest green. Wet (under rain, or in a pond or stream) its fleece sags and it shakes itself twice; in mist it shivers and goes looking to and fro with only its ears showing; in corn it sneezes three times; by a fire it pants; and under a sun it shuts its eyes, turns its back to the sun and pants. Each of these is heard as that doing (a rattle, a tremble and soft steps, a sneeze, breath) and never as a bleat at what was laid.
- **The goose needs water.** In the dish it stretches its neck toward the blue bowl. On a pond it swims in rings, on a stream it rides to the end, climbs out and waddles back, and in wind it flies one loop and lands where it was set. Rain delights it: it dances with its wings out. With no blue under it, it walks in a circle and stretches its neck toward the nearest blue. It hisses at a fire and at dry earth.
- **The shepherd wants to stand high and look out.** In the dish he shades his eyes and looks at the top of the sheet. On a hill he climbs to its top line and walks along it to and fro. Under a cloud he sits down where he is, bewildered and wet, with his hat brim sagging and a drop on his nose. By a fire he warms his hands and steams dry, in wind, which counts anywhere beside him from his feet to his hat, his hat blows off and he runs after it and comes back, twice, and after that he holds it on, and against a trunk he leans and dozes. He is never hurt and never cross.
- **The pig wants mud.** In the dish it snuffles toward the russet bowl. On earth under rain, or on earth that touches a pond or a stream, it wallows on its back with its legs in the air. On dry earth it roots with its snout and sighs. It gobbles corn with fat cheeks, rolls down a hill and trots back up, twice, and then stands on the hill, and under a sun it goes red and fans itself with both ears.

Their feelings are about the picture, the weather and what they wear, and never about the child: none thanks, praises, asks or sulks at the child, and none does anything when the child stops or returns. None gives a verdict on the child's wool either: a figure shows what a place is to it by what it does there, the sound it makes there is the sound of that doing, and no figure has a cross voice or a pleased one. On a place it is drawn to, a figure is heard to do what it does there (the sheep tears and munches, the goose splashes, the shepherd breathes out on his ridge and snores against a trunk, the pig squelches and gulps), and the shepherd who sits down in the rain is heard to sniff and drip.

**The moth** has no want in the picture and no opinion of it. It sits on a corner of the frame, cleans its feelers, and eats only loose fluff that has floated off, never the picture. Tapped, it tumbles up, flutters a loop and lands on another corner. It is there so that something is alive that has nothing to do with the sheet.

## The scenes

**1. Rain.**

- Cause: the child's touch has brought a cloud to lie over a living shape or a figure: a cloud laid, or a shape laid under one. A figure set down under rain that already falls starts no scene: the rain goes on falling, what is wet stays wet, and each of the four begins what rain makes it do when a drop reaches it.
- Beats, 5 seconds: the cloud gathers and darkens on its underside; the first drops fall; what lies under answers as itself (a hill puts out grass tips, earth turns to mud, a fire hisses down to embers, the shepherd holds out a hand, looks up, and sits down as his brim sags); the rain settles to a steady patter.
- Filled in from the state of play: which cloud, and what lies under it down to the first shape or the bottom of the sheet.
- Saved when the scene starts: nothing. The touch that caused it saved `felt` or `folk`, and the rain is a view of those.
- A touch ends it at once, with the rain falling steadily.

**2. The sun dries.**

- Cause: the child's touch has brought a sun and rain within 16 cells of each other.
- Beats, 5 seconds: the rays reach out; drops that fall into their reach turn and rise as steam; the cloud looks thinner on the sun's side, as a view (its wool in `felt` is unchanged, and it goes on raining outside the sun's reach); what was wet dries as itself (mud cracks and the pig stands up and looks about, the shepherd's brim springs up and he steams), and a figure that was in that rain goes on as it was there until the drops over it have stopped, and stands up and is heard only then, not at the touch.
- Filled in from the state of play: which sun, which rain, and what was wet inside the reach.
- Saved when the scene starts: nothing, for the same reason as the rain.
- A touch ends it at once, with everything in the sun's reach dry.

**3. The bow.** This is a secret, and it works every time.

- Cause: the sun dries rain, as in scene 2, with bare felt between the sun and the cloud. It follows scene 2 on the same touch; where a sun already dries the rain and a later touch bares the felt between them, the bow's beats play alone.
- Beats, 5 seconds: one strand of each of the five dyes rises from the wet side, the five arch across the bare felt to the sun's side, the bow hangs and breathes, and the moth flies through it.
- Filled in from the state of play: where the bow stands.
- Saved when the scene starts: nothing. The bow is a view of the sun, the cloud and the bare felt between them, and on load it is already standing.
- A touch ends it at once, with the bow standing.

**4. Evening.** This is the ending.

- Cause: the child drags the yarn loop at the frame's top right corner to a peg and lets it go there: the free peg nearest the let-go takes the picture when the finger is within 30 stage units of that peg or has gone on past it. A tap on the loop, or a drag let go short of a peg, lets the loop swing back to its corner with a sound, and nothing ends. A picture is hung only when wool lies on the felt: with a bare sheet the loop swings and sounds, springs back to its corner, and the frame stays. When all three pegs hold a picture, the peg of the oldest picture counts as the free one, and a drag let go on that picture hangs the new one there, but for the corner of the picture that lies nearer the loop than the peg's reach.
- Beats, 8 seconds: when the wall was full, the goose first takes the oldest picture down and tucks it behind the stack on the easel; the frame swings up, hangs and settles on its peg; the light in the room lowers and warms; in the picture each shape takes its evening way (a sun sinks to the lower edge of its own shape and reddens, a cloud blushes, a fire glows, a stream glints); the figures go home to the dish one by one, each jumping the frame's edge in its own manner; the moth flies to the hung picture and settles under its lower edge.
- Filled in from the state of play: the picture as made, the peg, and which figures were in it.
- Saved when the scene starts: `wall` gains the picture with its `peg` and loses its oldest when it then holds more than three; `felt` becomes empty; every `at` in `folk` becomes `null`; `finished` becomes true.
- A touch ends it at once, with the picture hanging in evening light and the figures in the dish. That touch does nothing else, wherever it lands: it chooses no bowl and no comb, pokes no figure, sends no moth off and turns no felt. It is answered by the frame landing on its peg, or by a pat and lint where it fell if the frame had already landed, and only a later touch on the felt turns the fresh felt round.

**5. A fresh felt.**

- Cause: the child touches the felt that stands on the easel with its back to the room.
- Beats, 4 seconds: the frame turns round with a soft thump of felt; daylight comes back into the room; the tuft on the chosen bowl springs up, or with the comb chosen the comb hops where it lies; the figures turn to look.
- Filled in from the state of play: nothing but the chosen bowl.
- Saved when the scene starts: `finished` becomes false.
- A touch ends it at once, with the bare sheet ready, and is then an ordinary touch.

**How a cycle ends and how the next one starts.** The cycle ends when the child hangs the frame, which may be at any moment or never. The ending stays as long as the child likes: the picture hangs, the room is in evening light, and the next felt shows its back. Nothing starts by itself and nothing counts down. The next cycle starts when the child touches that felt. On load no scene replays: the pictures hang where they were hung, and the sheet and the figures are as they were left.

## The records

This game has no learning goal, so it is designed from no record of either jurisdiction and claims no school skill.

## The look

Written after the style spike and kept current with the built game; not part of the sheet.

**The look in use: Wisped fleece picture**, the first of the two rows reserved for this game in `docs/art-direction.md`. The spike held on clarity at 1180 by 820 and at 1024 by 768, and the lead passed the toy in it, so the second row (String and pins) was not tried. The owner has not seen it. No frame rate has been measured: every still came from a machine without a graphics card, and the number comes from the shared probe on a production build. The row in the claimed-styles registry is a request to the lead, and its text ends this file.

**What it is.** A flat picture made of loose wool. The sheet is dark felt in a pale wooden frame, and what the child lays on it is carded fleece in thin veils: edgeless, see-through where it is thin, dense where the finger went slowly, with single fibres straying past every edge. Colours mix where veils of two dyes cross. Laid wool has no outline and is never replaced by a drawn thing: a hill is green wool that breathes.

**Two materials, and what each means.** Loose fleece is what the child makes and what is alive. Firm felt, with a soft dark edge and short flecks of fibre, is everything that can be picked up or stands in the room: the four figures, the moth, the bowls, the comb, the frame, the pegs. A child can tell the two apart at a glance, and that difference is the cue for what can be laid and what can be poked.

**A third thing, used sparingly: stitched yarn.** Kinds of one dye have to be told apart in a still, so each living thing carries a few thin lines in the lighter strand of its own dye, as if stitched over the wool: grass tips, a scalloped crown, ripples, rays. Rain, steam, the nap a comb raises and the marks of a veil are the same yarn. The rules for it: a line is never closed round the wool, it never fills, it rides the shape as the shape moves, and all the lines of one dye are one stroke. A bow is five strands, one of each dye, painted once and stamped.

**Palette.**

| Part | Colour (red, green, blue) |
| --- | --- |
| The felt backing | 38, 34, 48 |
| The wall, combed in slanting veils | 77, 63, 85 |
| The table | 196, 172, 134 |
| Beech: frame, peg rail, crook | 226, 198, 152 |
| The comb, a darker wood than the table it lies on | beech darkened by three tenths |
| Bowls | 108, 84, 96 |
| Mat under the sheep and the pig | 132, 150, 132 |
| Moss green wool | 122, 176, 82 |
| Undyed white wool | 244, 238, 224 |
| Woad blue wool | 86, 148, 214 |
| Weld yellow wool | 244, 196, 62 |
| Madder russet wool | 204, 104, 62 |
| Sheep: cream fleece, slate face and legs | 240, 230, 208 and 74, 68, 88 |
| Goose: white, orange bill and feet | 246, 243, 235 and 238, 146, 52 |
| Shepherd: coat, hat, scarf and mittens | 208, 180, 130; 112, 80, 60; 198, 72, 62 |
| Pig | 240, 168, 172 |
| Moth | 200, 180, 152 |
| The evening's tint, at half strength | 62, 26, 40 |

The five dyes are the brightest colours in the frame and belong to the wool alone. The room is kept in dusk purples and warm wood so that the wool reads against both, and the darkest thing is the sheet, so the picture is where the eye goes.

**Light.** Flat daylight from the upper left, painted once: a pale fall across each felt piece, a soft shade under the frame, the bowls and the figures. There are no cast shadows that move, no glow and no post pass. Evening is one tint over the room, a plum that leans to red, and the hung picture is left out of it so that it is the bright thing on the wall. The room with everything that rests in it is kept as one canvas and put together again only when something in it changes.

**How the wool is made.** A few fibre-streak sprites a dye, each a faint haze with a dozen strands of the dye's lighter and darker shades. One level of wool on one cell is one stamp of a sprite, turned the way the finger was going, into the canvas of the shape it belongs to. Under a finger that rests the strands lie every way, so a tap is a soft round tuft. The stamp is chosen by the cell, the level and the way, so a sheet read from a save is laid strand for strand as it was left. The ghost hand's line is the same fleece, stamped into a small canvas of its own that fades with the hand.

**The frame is full.** The wall and the table are painted past the stage's edges, so a surface of another shape shows more room and no bar. The felt is over a third of the stage, the four figures stand large beside it with every face showing, and a garland of tufts hangs along the top. While the figures are in the picture the wall beside the frame holds only the peg rail, until pictures hang there.

**Motion rules.**

- Laid wool moves as a whole shape, and enough to be seen at arm's length: its largest travel is between 12 and 70 px at 1180 by 820, by kind. Each kind has its own channels, tempo and weight (`life.ts`), and no two kinds share a motion. A veil changes the pace of the thing under it.
- The one squash belongs to the moment wool clings: down and wide, then back. The wool in the hand is calm while the finger lays it.
- A figure is cut felt, so it moves in pieces about its joins: a head tilts, a jaw slides, a hat hops. Felt does not stretch much. Each figure has its own idle, its own answer to a poke, its own way of doing each thing its tastes make it do, and its own way over the frame's edge (`cast.ts`, `acts.ts`).
- A walk is a view and always comes back to the cell the child chose.
- What a figure does at a moment (a sneeze, a shake, a bump) is drawn from the act's own start and heard in the tick it shows; it comes a set number of times, and then the figure is at rest in that place (`BEATS` in `acts.ts`).
- In mist a figure is drawn as its ears alone (the shepherd's hat; the goose's head down to under the eye, with its bill), sunk so that they sit on the line where the mist ends.
- The sheep's curls open downward or upward at a slant and never to a side, whichever way it faces and however far it leans.
- The moth sits under a hung picture low enough that not even its feelers lie over it.
- Loose fibres rise and fade under a working finger, and are the first thing a cheaper tier leaves out. What is a touch's answer or the motion of a sound is drawn at every tier: the lint a touch on the bare room raises, the fluff the comb takes off, and a coat combed off in one tuft.
- A tuft the finger takes from its bowl is drawn under the finger all the way to the felt, and not on the bowl; the comb in the hand is drawn at the finger.
- The comb wriggles once on the table, half a second long, a moment after the first thing wakes.
- A cloud a sun dries is drawn in two parts, the part on the sun's side thinner, as far across as the sun's reach.
- Mist's three wisps are of three lengths, and the strokes of frost on a hazed thing lie each in a plot of its own and never cross.
- A treetop's two side strands are of two lengths and part as they go: never two even bars. A bush carries a few single grass tips along its top beside its leaves, shorter than a hill's.
- What a thing carries is placed from its dye and from where its box begins, which a save holds, so a picture put away is found with the same marks.
- With the comb chosen, the comb hops where it lies as a fresh felt comes round, where a tuft would spring up.
- Everything is read from the toy's one clock, sight and sound alike.

**How each tier keeps the look.** The tiers in `config.ts` change how fine the laid strands are kept (1.5, 1.25, 1 and 0.75 pixels of a shape's canvas to a stage unit), the pixel ratio (2, 1.5, 1.25, 1), how many loose fibres float at once (8, 6, 4, none; lint, the comb's fluff and a coat's tuft are counted first and are drawn at every tier) and how many running shapes are drawn a second time to seem to run (4, 3, 2, none). A lit shape's second draw is the same at every tier, at most four in a frame. No tier changes a colour, a shape, a figure or what the wool does; the cheapest is the same picture, softer, with still water. A tier change lays the shapes again from their cells and repaints nothing else.

**The draw count** is what one frame puts on the surface: a stamp of a sprite or of a canvas painted earlier, a stroke or a fill, each counted as one. `frameBudget.test.ts` counts it with a stand-in for the surface, on the real view, at the busiest legal moment: twenty shapes, rain, a sun that dries it, a bow, four figures in the picture and a finger down. It holds the count under 80 at every tier; the most it reaches is 75, at the first tier, and 74, 73 and 71 at the cheaper ones. Stamps into a canvas painted once are baked, and are counted apart.

**What must not creep in.** An outline round laid wool; a filled or closed drawn shape on the sheet; a ring, a cross or any mark that reads as a letter, a numeral or a sign; a solid felted object on the sheet other than a figure; a glow; anything written. Next to Felt Meadow, which is felted objects in a meadow, this is a flat picture in a frame, in a room.

**The registry row, as a request to the lead.**

| Wool Picture | Wisped fleece picture, 2D: loose carded fleece laid in thin edgeless veils on a dark felt sheet in a beech frame, colours mixing where veils cross, single fibres straying, and a few stitched yarn lines in each dye for what a thing carries; firm cut-felt figures, bowls and comb in a dusk-purple room with a warm table | [`games/wool-picture/ART.md`](../games/wool-picture/ART.md) |

# Brief: Mierennest (`mierennest`)

Read `docs/build/CLOUD.md` first. This brief is the whole contract for your game; the guide it points to holds the rules. The plan behind it is `docs/plans/2026-10-10-1553-feat-mierennest-ant-nest-game-plan.md`; read its Product Contract (R1 to R16 and the acceptance examples) and its Key Technical Decisions before you write the sheet.

## The game

- Key: `mierennest`. Name: Mierennest (Dutch for ant nest; the name lives in the manifest and is never drawn). Age band: 9 to 12. Emoji: 🐜.
- Generator: `npm run new:game -- mierennest "Mierennest" 9-12 🐜`
- Branch: `lane/mierennest`. Base branch: `feat/learning-games-build`. Base commit: the one your starting message names.
- **A play-first game.** It claims no school skill and its sheet has no records part. Do not look up, name or cite any learning standard, in the sheet or anywhere else.
- Renderer: canvas 2D, a side-on grid of ground cells ("Canvas or three.js" in the guide decides what follows from it).
- There is no demo. The game comes from a child's own design, which the owner passed on. The letter is private and is in no file, and the child is named nowhere: write "the child who designed it" if you have to refer to them. What the letter asks for is under "The idea" below, in the lead's words.

## The idea

A child designed this game and asked whether it could be made. Keep it recognisable as that child's game.

The screen is an ant farm seen from the side: a strip of grass and sky on top, the ground below. The child is a small ant, led by the finger. A drag through the ground digs a tunnel behind the finger; a lump that comes loose can be carried and set down. Three materials come out of the ground and behave differently: **sand** pours and slumps into a pile, **mud** sticks and holds its shape, **stone** is heavy, falls unless something bears it, and blocks. From them the child builds walls, pits, plugs and bearing arches, and a combination is stronger than one material alone. As the child builds, the kingdom grows: more chambers, more workers, larger structures, in the end castles, systems of tunnels and sturdy walls.

Other ants, beetles and flies want the castle. Each kind has fixed habits a child can learn and test: what it can pass, what stops it, what it does when it gets in. They camp on the surface in plain view and wait. When invaders get in, the child defends with a catapult and a cannon. The last and hardest raid is an army of dung beetles rolling their balls, led by a dung fly. When that army has been turned back, the kingdom is safe: an ending scene plays once, and the kingdom stays open to play.

### What changed from the child's design, and is decided

These are the lead's decisions from the jam's rules, the guide and the game-design pack. Do not reopen them in the sheet; design inside them.

1. **The level is the kingdom's growth.** The child's design has levels that make the kingdom bigger and stronger. Here the growth is seen in the nest itself (chambers, workers, what can be built, the hill that rises on the surface) and never as a number, a bar, a level name or a badge.
2. **A raid is a test the child starts.** Invaders wait in sight until the child calls them. Nothing attacks by a clock, and nothing happens while the game is unattended or put away. With no shot fired, the same raid against the same nest plays the same way every time, so that changing one thing and calling it again shows what that one thing did.
3. **A raid is a view of the kingdom as built, and failure is free.** The guide's "Found as left" says a running test is a view of the saved design and is not saved. A raid runs on a copy of the ground: what it knocks down is seen where it fell while the raid lasts, and when the raid is over the workers put it back as the child built it, in their own grumbling way. The child never rebuilds by hand what an invader broke. The place that gave way stays readable until the next raid (a short-lived mark, gone on load), so the child can change one thing there and call the raid again (pack: game-design, ages-9-to-12.md; pack: game-design, errors-show-as-consequences.md). Put away mid-raid, the game is found with the invaders at their camp and the kingdom as built.
4. **Defeated means turned back.** A hit sends an invader tumbling, stuck or blown back, bewildered and never hurt, and it trudges home. Nothing is removed for good, the child's ant does not fight with its body, there is no lost state and the kingdom cannot be taken.
5. **Every raid ends by itself.** An invader that reaches a chamber and is not sent out does its own act there once (each kind has one, and it is funny) and trudges home. A machine sends it out sooner. A machine is never the only way a raid ends, so a raid can be called before any machine exists.
6. **The machines are part of the defence.** The catapult and the cannon are built in a place and loaded with a lump (sand, mud or stone, each a different shot), and that is saved with the nest. During a raid the finger fires them. Where a machine stands and what it holds decide what it can reach.
7. **The game is finished, and not over.** Turning back the dung beetle army is the end the child asked for. The ending is a scene that plays once (ruling 12 and its near case); afterwards the kingdom is found as it was left and raids can still be called.

No numeral is drawn, though your band allows them: nothing in this play needs one. Do not add `symbols.ts`.

The owner's bar for every game: lively and funny, never slow or quiet; animated, cute and warm; deep enough to come back to for weeks through combinations and characters; with no score, coin, streak, reward, praise or timer that pushes. For this game he said to go wild. He rejects bare frames: the first frame is a place filled from edge to edge with large characters who are already funny (pack: game-design, a-full-frame-with-large-funny-characters.md). The invaders' camp on the surface is where most of the comedy can live before any raid: they fidget, squabble, polish a dung ball, fall asleep. The three materials stay the plainest things in the picture (pack: game-design, working-objects-stay-plain.md).

### What the sheet has to settle before any rule is written

- **The stage.** One fixed stage with the whole farm in view: no scroll and no zoom, so a drag is always a dig, a raid is read at a glance and the save holds no camera. Set the cell size at the spike from two bounds, stated together in the sheet: the finger's drag digs a tunnel a creature fits, and a creature in a tunnel is still about a tenth of the frame wide or more (insects are long and low; the owner turned down frames whose characters were smaller than that). Then state the largest kingdom that ground holds; the size test uses it.
- **What a chamber is.** Something the ground module recognises in what the child dug, by a measure the sheet states. Never a thing placed from a menu. The growth of the kingdom, the workers and the moment an invader counts as inside all follow from it.
- **What counts as a raid that went well.** The position in the designed order moves forward after one, and never back. A raid in which an invader finished its act in a chamber did not go well.
- **The first visit.** Every visit of every age starts at the first place in the order, because the kingdom is built step by step. Say what, if anything, `ctx.childAge` sets, with `null` and both ends open, and never a later starting place.
- **The sheet's headings for a play-first game.** Keep every heading of the design sheet but the records. Under the representation and the four mechanic questions, answer for the game's own idea (a defence built from three materials that behave truly, and tested by a raid), and say in one sentence that no school skill is claimed. The ground's rules are true as far as they claim anything: sand does slump, wet mud does hold, a stone does need bearing. Where the game simplifies (cells, no water), the sheet says so.

## The looks reserved for it, in order

1. Ant farm behind glass
2. Squared-paper pencil

Each is a row of the ledger in section 4 of `docs/art-direction.md`; build from the row's own description. Both are canvas 2D.

## Stills, and one more branch you may push

The lead's machine runs no browser for this game, so the lead does not take your stills as the cloud page says. You send them. This adds one exception to the cloud page's rule on branches and to its rule that you commit no still.

At the look spike, the toy, the game, the great raid and the closing run:

1. Make three stills at 1180 by 820 on a paused clock with a fixed seed, as [record a deterministic walkthrough on software GL](../../solutions/workflow-issues/record-a-deterministic-walkthrough-on-software-gl-with-a-paused-clock.md) says, and keep them outside your checkout.
2. `git worktree add --detach ../stills <BASE_SHA>`, copy the three files to `docs/build/stills/mierennest/` in that worktree under plain names (`1-first-frame.png` and the like), commit only them (with the usual last line), and push with `git push origin HEAD:refs/heads/stills/mierennest-<first eight of your lane's tip>`. Then `git worktree remove ../stills`.
3. Name the stills branch and the seed in your status block.

That branch holds the three pictures and nothing else, is never merged, and is deleted by the lead once looked at. Never commit a still to `lane/mierennest`. If the browser cannot be installed, say so in the status block and carry on.

## Frame cost

Nobody measures this game's frame rate on a graphics card before it merges, so the cloud page's "frame rate from the lead in your next message" does not apply. The numbers that count are yours: your work per frame under six times CPU throttle (under 8 ms), and what you draw per frame, counted by a test on the fullest frame of the toy, of a raid with every kind on screen, and of the great raid. State in the sheet what the game counts as a draw on a canvas and the budget it holds itself to. Paint the ground into one cached sheet and repaint only the cells that changed; never repaint the whole grid in a frame.

## This run

This run covers the design, the look spike and the rules. The template is at its third version and proven by canvas and three.js games; build on it as it stands.

1. The steps under "Getting the code" in the cloud page.
2. The design sheet, pushed with `Open: sheet ready for check, round 1`. Beside what is listed above it states, for this game: the toy (digging, answered in the frame the finger lands, a pleasure with no goal); the object-by-action grid (three materials by dig, carry, set down, lean on, hit, roll against); each invader kind's habits as a table, with its own act in a chamber; the two machines and what each load does to each kind; errors as consequences; the designed order as a ladder of places in the game's own words, one new thing at a time and then combinations, from a first chamber to the great raid and the open kingdom after it; how the kingdom's growth follows what is built; every field of the saved state, and what is never saved (a raid, what it knocked down, where invaders stand, the mark where a wall gave way, a lump in the mouth, which goes back where it came from); the first showings and the ending under ruling 12; and the guidance ladder with no word and no numeral.
3. The look spike for your first reserved look: the game's real scene in the style, at the quality bar, shown by the Mount at load with a fixed seed and with nothing playable behind it. The frame is full: the farm's frame and glass, the surface with the invaders' camp and its large, funny campers, the ground in its strata, the small ant already at work. Push its three stills as above.
4. The rules as pure modules with tests beside them (no renderer, no DOM), in new files of your own, leaving the copied template files as they are wherever you can: the ground (cells, and how each material moves and comes to rest, deterministic from a seed), digging, carrying and setting down, each invader kind's table of habits, the designed order with its position ids in `config.ts`, the saved state with its defensive `deserialize`, and the size test (the largest ground the game can make, saved, is under half the 64 KB cap). Write the ground's rules test-first: each material's behaviour as a small table of cases before it is code. The plan's unit U2 lists cases to start from.
5. Stop there: write the status block, push, and report. Your next message brings the checker's report on your sheet.

## Later runs, so that you can design for them

- Run 2: the toy in the look (the guide's step 4 and `docs/build/runs/toy.md`), with the voices as numbers.
- Run 3: building, growth, raids on call, three invader kinds, the catapult and the cannon, the designed order and the save (`docs/build/runs/game.md`).
- Run 4: the great raid and the ending, to the gates.
- Run 5: the closing run (`docs/build/runs/closing.md`), which builds nothing new, with your own reader bounded at four readings (`docs/build/runs/reader.md`).

## Defaults that bind you

The owner has not yet answered the questions listed under "Symbols, and the defaults awaiting the owner" in the guide. Work under each default as written there. If your design needs one of them answered differently, do not assume it: say so under what the owner has to decide.

# Answers for Mierennest: the check of the sheet, round 1

Checked: the sheet part of `games/mierennest/ART.md` (everything above `## The look`) whose sha256 is `ee5b06197ebd6a1a2bf8d7683a22a49d69cfa32f0021770e2bb0318607c50783`. Checker: cloud-1. Outcome: **OPEN round 1: 17 findings**. Line numbers are lines of `ART.md` as it stood with that hash.

Paste each replacement as it stands, bring anything you built on the old text into line, write the round and its outcome into the status block with the new sheet commit and hash, and set `Open: sheet ready for check, round 2`. Where a finding changes the mechanic, the error, the designed order or the saved state, the rules written on the old text are reopened. If you believe a finding is wrong, do not ignore it: paste nothing for it and say why in the status block, in one or two sentences, for the next checker.

A note on commits, for every lane: a commit message ends with the one line `Co-Authored-By: Claude Code <noreply@anthropic.com>` and holds no web address. If a tool adds a second trailer with a link to your session, take it out of the message before you commit; do not rewrite a commit already pushed.

## The checker's report

Mierennest (`mierennest`): check of the design sheet, round 1, on commit bb54b24c1513a5e9f00c1ed0034d10cd4003d26b (`games/mierennest/ART.md`, everything above `## The look`).

Verified:

- Play-first: the sheet holds no record, official code, standard, grade, groep or level name, no web address and no person's name; "level" stands only for a flat shot (lines 173, 258) and in the sentence about ids (line 179). That no school skill is claimed is said at lines 10, 58 and 129. The nine headings other than the records are there, in order, each answered for this game. No lookup was run: there is nothing to look up.
- The stage adds up (30 + 172 + 588 + 30 = 820; 60 + 1120 = 1180; 840 cells, 760 between turf and bedrock; a mouthful of 56 units; creatures of 112 to 124 units on 1180, the child's ant at 9.5 hundredths read as "about a tenth"). A chamber, a raid that went well, the first visit and what the age hint sets are each settled, and the age table is open at both ends with `null` on its own line (ruling 4).
- Ruling 8: all eighteen cells of the grid have a sound and no row or column shares one. Rulings 12 and 13 hold (the ending's fields are saved when the great raid is judged; every showing's mark is written when it starts; each waiting kind shows its want). The position never shows, moves one step and names no level. None of the seven decisions of the brief is reopened; where a rule of the sheet breaks one in effect, it is a finding below.

## Findings

Line numbers are those of `ART.md` at the commit. Each replacement is the whole line or sentence, ready to paste.

**1. The representation, "The stage", line 66.** The mouth is two cells of turf that nothing can dig and a dung ball needs three, so no ball can ever come in, `dung-scout` and `great-raid` go well by themselves, and line 267 has a ball roll out of the mouth. Replace line 66 with:

> - Row 0 is turf and row 20 is bedrock: neither can be dug. The **mouth** of the nest is three cells of the turf at its middle (columns 19 to 21), always open, wide enough for a dung ball, with the hill round it. Nothing can be set down in the mouth. A new nest has a short shaft under the mouth, as wide as the mouth and three cells deep, with the ant at its foot.

**2. The representation, "What a wall holds", line 108, and the invaders' table, line 245.** By the table three cells of loose sand with room beyond hold one beetle (a push of 3 is not greater than a hold of 3), so "sand alone never stops a beetle, wherever it is put" is untrue, and the ground's rules are to be written from these lines (pack: game-design, ages-9-to-12.md; pack: game-design, depth-from-combinations.md). Replace line 108 with:

> - **A run with earth or rock behind it** cannot be shoved. Loose sand at its front is ploughed through all the same: the pusher changes places with it. So a sand wall one or two cells thick never stops a beetle, and neither does sand with earth or rock behind it, however thick; three cells of loose sand in a row with room beyond hold one beetle and no more.

and, in line 245, the beetle's cell under **Passes** with:

> Mud underfoot, loose sand that is thin or has earth or rock behind it (ploughs through), any wall weaker than its push.

**3. The object-by-action grid, last column, lines 44 to 48.** "Something rolls against it" stops the roller in sand and holds it in mud, while a dung ball pushes 6 and passes both (lines 105 and 245), so the same thing meets the same material in two ways. Add, on a line of its own after the table:

> In the last column the roller is a stone that was pushed or knocked and rolls along a floor. A dung ball is no such roller: it has its beetle's push of 6 behind it, and what it does to each material is under "What a wall holds" and in the invaders' table.

**4. The designed order, "A raid, and how it is judged", after line 154.** The sheet does not say what a touch on the ground does while a raid runs, and a raid is a view of the kingdom as built (brief, decisions 2, 3 and 6; "Found as left"). Add this bullet after line 154:

> - **While a raid runs the nest is not built on.** The finger fires the machines and nothing else changes: a press on the ground brings the child's ant running to that place to look, a press on a lump makes it answer as in the first column of the grid, and nothing is dug, carried, set down, moved or turned until the invaders are home. So a raid is a test of the nest as it stood when the bell was rung.

**5. "Every field of the saved state", line 209.** A carried lump goes back to its cell, but the sheet does not say what the lumps above that cell do meanwhile (sand that has poured into it cannot be un-poured), and a machine under the finger is not named at all ("Found as left": a piece in the hand; ruling 5). Replace line 209 with:

> **Never saved, and gone on load:** a raid and the copy of the ground it runs on; what it knocked down; where invaders stand (they are at their camp); the marks where a wall gave; a shot in the air; and a lump in the ant's jaws or a machine under the finger, each of which goes back to where it was picked up, whether the game is put away under a dragging finger or the drag is taken away. While a lump is carried, the cell it came from still bears what stood on it and nothing moves into it; the ground comes to rest only once the lump is set down in another cell. A machine fired in a raid has its load again when the raid is over. A machine fired outside a raid has really thrown its lump: the lump lies where it landed, as a cell of the ground, and the machine is saved empty.

**6. "The two machines", line 255.** A tap turns a machine and a tap fires it (line 270: outside a raid too), so a loaded machine cannot be turned and one tap means two things. Replace line 255 with:

> Each machine arrives once, at its place in the order, lowered down the mouth by the workers. From then on it is part of the nest: the child drags it to a floor two cells wide with two cells clear over it, where it faces the way it was last dragged, and loads it by setting a lump on it; let go anywhere else, it goes back to where it stood. Outside a raid a tap on an empty machine turns it round where it stands; a tap on a loaded one fires it, in a raid or out of one. Where it stands, which way it faces and what it holds are saved, and they decide what it can reach. In a raid it is loaded again from its own lump a few beats after it fires, so one machine can fire many times in one raid.

**7. The toy, after line 36.** The grid has "carried" and "set down", and the sheet nowhere says which gesture picks a lump up, where it is set down, or what tells a carry from a dig. Add this bullet after line 36:

> - **A drag that starts on a lump carries it.** When the ant can reach the lump by an open way it takes that one lump in its jaws, follows the finger along the open way and sets the lump down in the open cell where the finger lets go; let go where a lump cannot lie, it goes back to the cell it came from. A drag that starts anywhere else digs, and a lump it meets is answered as in the first column of the grid and is not picked up.

**8. The toy, line 30.** "Digging the last stretch" has the ant remove earth, for good, along a way the finger never touched, against "a tap is one mouthful" (line 36) and "never does harm" (line 38). Replace line 30 with:

> The finger lands anywhere in the ground and the mouthful under it is bitten at once. The ant comes to the finger by the shortest open way; where no open way reaches it, the ant stops at the nearest open cell, faces the finger and waits, and no cell is ever dug that the finger did not touch. While the finger moves, the earth under it is bitten away in a round mouthful two cells across, so the tunnel is as wide as the finger and a creature fits in it.

**9. "How the kingdom grows", line 191 (ruling 15).** The hill grows with everything dug and has no bound, and it stands round the mouth beside the bell and the log, which the child aims at. Replace line 191 with:

> - **The hill** over the mouth is the spoil of everything dug: it rises with how hollow the nest is, fast at first and then ever more slowly, up to a height it never passes. At that height it still stands clear of the bell, of the party at the log and of the mouth, and the overlap test of ruling 15 holds this with every cell of the ground dug out.

**10. The characters, "The kingdom", line 235 (ruling 15).** The workers' things, the seeds and the glow-worms of the ending are set down by the game inside rooms, on cells the child digs, fills and stands machines in, and only the workers, the queen and the machines are covered. Replace line 235 with:

> - **Nothing of the kingdom takes a touch meant for the ground.** A press on a cell is always that cell's: a worker or the queen standing there steps aside and the dig or the lump is answered. The workers' things, the seeds and the glow-worms that stay lit after the ending are painted on the back wall of a room, behind its cells: they take no touch and never keep a lump or a machine out of a cell. A machine stands only on open floor, never on a lump or over the mouth, and is picked up only by a press that starts on it; an overlap test holds this at each surface size (guide, ruling 15). A press on a camper, the bell's stalk, a toadstool or the hill is answered by that thing as itself and changes nothing in the nest; only the bell calls a raid.

**11. The error as a consequence, line 140.** A stone that an ant bears is not in the rules: a stone is held by a held cell or as a lintel (line 88), never by a creature. Replace line 140 with:

> - **It follows from the world's own rules.** The wall of sand goes at its foot under the first beetle; the stone that stood on a sand wall comes down when a beetle shoves the wall from under it; the mud patch one cell long holds one raider ant and the next walks over its back; the pit with earth walls holds the beetle and the ants climb out.

**12. The representation, "The stage", line 67, and "Size", line 213.** The largest kingdom is miscounted (rooms of 4 by 3 with one cell between them fit eight across, 39 of 40 columns, and five down, 19 of 19 rows), and "every mark" can be read as the marks where a wall gave, which are never saved. Replace line 67 with:

> - **The largest kingdom this ground holds.** The 760 cells between turf and bedrock can each be any kind. The most rooms that fit, each with one cell of earth or of lumps between it and the next, is 40: eight across and five down. The size test saves a ground in which no two neighbouring cells are alike, with both machines loaded and every id in `shown`.

and line 213 with:

> **Size.** The largest ground, with both machines and every id in `shown`, is under 2 KB as a string; the test holds it under half of the 64 KB cap.

**13. "The guidance ladder", line 221.** The ladder backs off and never stops, and the cue row for 7 and up rules out a long hint chain (wordless clarity, checklist item 8). Replace line 221 with:

> 3. It then waits twice as long before showing either again, twice as long again after that, and after the third showing in one stretch of stillness it shows nothing more until the next touch.

**14. "The order", line 183.** The round of six in `open-kingdom` is set by the game, so it is not a harder option the child picks, and "building less" does not say how it looks harder (pack: game-design, ordered-challenges-high-success.md). Replace line 183 with:

> - **A harder option the child picks.** The child makes any raid harder by building with fewer lumps or by leaving a machine unloaded, and it looks harder in the world: a thinner wall, an empty cup. In `open-kingdom` the round of six parties runs from the lightest to the heaviest and then round again, and each sits at the log looking as heavy as it is; the round moves on by the rule above and is not the child's pick.

**15. The scenes, "The put-back", line 282.** A dung ball digs earth away during a raid and the child cannot put earth back, yet the beats name fallen lumps only (brief, decision 3). In the beats of line 282, replace "The workers carry each fallen lump back to where the child had built it, nearest first, and one stands by the place that gave." with:

> The workers carry each fallen lump back to where the child had built it, nearest first, tamp back the earth a dung ball dug away, and one stands by the place that gave.

**16. "Where the game is true and where it simplifies", line 123.** "The order of strength is the true one" claims as true that a lump of mud holds more than a stone, which the model cannot stand behind (pack: game-design, ages-9-to-12.md: true wherever it claims to be). In line 123, replace "and the holds in the table are the game's own numbers, chosen so that the order of strength is the true one." with:

> and the holds in the table are the game's own numbers, which claim only this much: loose sand gives first, a round stone on a flat floor rolls, sticky mud grips, and two materials together hold more than either alone.

**17. The band, "Age rule", line 13.** "Help is something the child fetches" names no help that can be fetched (pack: game-design, ages-9-to-12.md). In line 13, replace "Help is something the child fetches." with:

> Help is something the child fetches: at the camp each kind acts out its own habit for anyone who looks, a press on a camper makes it do so at once, and the idle ladder never shows a solution.

OPEN round 1: 17 findings

## From the lead, on what your status block left open

- **"Digging the last stretch."** Finding 8 settles it: no cell is ever dug that the finger did not touch.
- **A wall right across a tunnel seals what lies behind it.** You wrote that a room no air reaches is not a chamber, so every defence leaves a way one cell high, and raider ants fit it. That is meant, and the sheet has to say it in one place. Add one sentence of your own for it where the sheet says what a chamber is, and name that sentence in the status block as the one line of this round that is not a paste: the next checker reads it.
- **Frame cost.** Your figures (about 1.5 ms of the game's own work a frame at six times throttle, 12 to 18 draws) are the ones the pull request will carry. Keep the still parts on layers of their own as the game grows, and measure again on the fullest frame of each later run.

## Your next run

Paste the seventeen replacements and the one sentence above, bring the rules into line (findings 1, 2, 5, 6, 8, 11 and 12 reach `ground.ts`, `build.ts`, `walls.ts`, `chambers.ts`, `save.ts` and their tests), and set `Open: sheet ready for check, round 2`. Then go straight on to the toy, as your brief's run 2 and `docs/build/runs/toy.md` say, at your own risk while round 2 is checked. Push three stills of the toy on a stills branch as the brief says, and stop there.

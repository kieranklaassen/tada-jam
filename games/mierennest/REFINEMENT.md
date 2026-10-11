<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: sheet (run 1). Base commit ef85be4d. Answers handled: none (no file for this game on the base branch).
- Sheet: whole, play-first, no records part. Hash of the sheet part: `ee5b06197ebd6a1a2bf8d7683a22a49d69cfa32f0021770e2bb0318607c50783`. The commit that holds it is named in the line below once it is pushed.
- Look in use: none yet. First reserved look: Ant farm behind glass.
- Open: sheet ready for check, round 1

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `symbols.ts` and `symbols.test.ts`: removed. The generator copies them into every game whose band starts at 6 or above, and this game draws no numeral (its brief says so). Nothing imported them.

One entry a file copied from the template, written for the lead and for the games that come after: used as copied, or what was changed and why, and what is wrong or missing that any game would need. Mark a fault or a gap **for the template**. A frozen file is never changed here: a fault in one is a request to the lead.

### For the owner to decide

Nothing yet. One line for each thing only the owner can settle: the look and the toy at the toy checkpoint, a default the game would like changed, and anything the guide does not rule on.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far (run 1: the sheet, the look spike, the pure rules; nothing is played yet).

- **Alive at idle.** Not yet: the spike is a still scene. The sheet gives every camper an idle of its own, and the camp gags are the habits shown.
- **Motion and sound on every touch.** Not yet. The sheet's grid gives each of its eighteen cells a look and a sound of its own.
- **Weight, squash and follow-through.** Not yet. In the rules, weight is real: a stone falls unless borne, sand slumps to a slope, mud holds.
- **Kid-clear silhouettes and tappables.** The three materials are flat and far apart in hue and lightness (pale sand, dark mud, grey stone) on brown earth; the bell's reach is 34 stage units, over the 48-pixel floor across.
- **Wordless clarity for 9 to 12.** No word, letter or numeral is drawn; the game has no `symbols.ts`. The wordless check passes.
- **Wordless idle guidance.** Designed in the sheet (what can be touched, then one drag through plain earth, never a solution); not built yet.
- **Frame rate.** No frame rate has been measured, on any machine, and no physical iPad. The spike's frame is 5 draws and one for each creature: 17 in the first frame, 23 in the grown kingdom and 20 in the raid, against a budget of 80. The ground is one cached sheet, painted whole only at load and on a resize; `repaint` holds a frame to 24 cells. The frame-budget test and the work per frame under six times CPU throttle come with the toy.
- **Procedural assets only.** Everything is canvas paths; no image, font or sound file, and no network request.

### The learning claim

None. Mierennest is a play-first game: it claims no school skill, its sheet has no records part, and nothing in the folder names a standard.

### Defaults taken for the owner

- No numeral is drawn, though the band allows them.
- No camera shake and no impact pause: the answer to a touch is carried by chains, sound and squash.
- No on-device speech: creature voices will be invented and synthesized.
- The sheet's own choices he may want to overturn: a raid is called with a dewdrop bell; a raid went well when no invader finished its act in a chamber; a room is a clear block four cells wide and three high, and counts while air reaches it; the ground has a sixth kind of cell, packed earth, which is dug and never carried.

### What the next builder should know

- The stage is 40 by 21 cells of 28 units. That cell size is the only one at which the finger's mouthful (two cells) and a creature a tenth of the frame wide (two cells high, about 120 long) both hold.
- Write a picture test for a ground rule by hand from the rule, then run it: two of this run's first pictures were wrong (the edge of a picture is rock, so mud in the top row is held; sand on a single post slides off), and the rule was right.
- The generator copies `symbols.ts` into every game whose band starts at 6 or above. A game that draws no numeral removes it and its test.
- A subagent painting creatures needs the palette frozen before it starts: a key renamed under it breaks its typecheck.

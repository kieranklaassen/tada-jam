<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: Cloth busy-book, the first reserved choice; spiked and kept at pass 1.
- Sheet: round 1 (reader A) 14 findings, round 2 (reader B) 7 findings, each pasted word for word; passed as a paste-only round, sheet part sha256 starts a3502a9026847e3f.
- Open: the toy has been tried by no child and by no two children.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `input.ts`, `scene.ts`, `state.ts` and their tests are removed: several fingers work at once (`hands.ts`), answers run inside the play, and there is no order of challenges. **For the template:** `ForgivingTouch` follows one finger, so a game for two children has to bring its own.
- `config.ts`: the ladder section is cut and the tiers carry `stitches` and `sheen`. `stage.ts` exports its own `Point`. The frozen files are as copied.

### For the owner to decide

- Try it with two children early. Nobody has.
- One tap on the open stable walks both halves in and ends the show (the sheet's tap for the youngest). The cold playtest thought that is the toy doing the work; a drag does the same.
- A half that is dragged low stays sitting until it is lifted.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | Rest and a long pull, 1180 by 820 | The look works. The cloth hangs like an udder, the halves look like two boxes, the faces have no pupils, the tree hides behind the animal | Cloth thickness and normals, seams, pupils, tree moved, weave lighter | not measured | the animal covers the farmer |
| 2 | The eight routines, four animals, greeting, ending | The horse's head sticks out of the shut stable; sitting does not read; the cloth pokes out at the sides in a tower | The head is drawn in behind the wall, sitting drops the body and puts the feet out, thickness follows the chord | not measured | gap at rest |
| 3 | Draws counted | 87 in one frame | What stands still is in the page and stamped only while it rattles; poppers and small eyes in one pass | at most 80 a frame, counted | |
| 4 | Rest, greeting | Left alone the bear presses up and the cloth vanishes | An end left alone keeps company at a whole animal's length | | |
| 5 | Code review: fifteen findings | Resting palms used up the three fingers; a resting finger held a target for ever; what moved by itself was not saved; a call could last for ever; a slide could end the show at a load; one finger tied the bow; springs ran wild at ten frames a second; several sheet promises had no code | All fifteen fixed, with tests that play them | | |
| 6 | Cold playtest proxy, screenshots only, no source read | Clear without words; costume line not shown; ear cut flat in the stable; a lifted head leaves the page; the horse hides the farmer; arm over the hem; sky, flowers and carrot weak to a poke | The hand shows two fingers, then the line; costumes in pairs; lift capped; the yard ends short of the farmer; the small things wobble; tied ends are shown uncrossing | 58.9 fps, see below | sitting legs are stiff; pig's roll leaves the page's lower edge |

## For the pull request

### How the game meets the quality bar

- Alive at idle: breathing, blinking, pacing, chewing, wind on the line, the goose's poses, the bear's doze; a half left alone follows its own nose.
- Motion and sound on every touch: every place has an answer and a voice of its own, at the finger's landing.
- Weight, squash, follow-through: springs on every half, a verlet cloth that thins, sags, creaks and twangs.
- Silhouettes and tappables: four animals in four colours and prints; targets about 100 units, a tap for every essential act.
- Wordless: no word, numeral or symbol; passes `wordless:check`.
- Idle guidance: the ladder, with two hands at once for the two-finger moves.
- 60 fps: 58.9 fps over 42 s of the shared probe, production build, headless Chromium with software rendering (no GPU), no throttle, tiers on automatic, ending at tier 2 (pixel ratio 1.25); Wash Day on the same machine the same hour gave 57. At tier 0 with a sixfold throttle the same software renderer gives 4.4, which says nothing about a tablet. At most 80 draws a frame, counted over every head and bottom; no blur, shadow or filter; one full composite. **WebKit and a physical iPad were not measured.**
- Assets: all drawn in code.

### The learning claim

None. The game has no learning goal.

### Defaults taken for the owner

The look is the first reserved one. Merging stays with the owner.

### What the next builder should know

- Count only fingers that hold something and are moving against a cap on working fingers: a cap that counts resting palms deadens the whole page while every single-finger test passes.
- A game whose creatures move by themselves has to mark a change when they come to rest and at put-away; saving on touches alone saves a yard nobody left.
- Never ask a resting holder to give up by event distance: a slow drag on a fast screen moves less than any per-event threshold. Measure from an anchor.

## Pass: the loop, made plain

Seen: a young child did not find the loop. Cause: everything that answered glowed alike, the hand showed a gesture without what it was for, and nobody visibly wanted the next thing. Change: the section of the same name in `ART.md`. Checked by `round.test.ts` and by recording the untouched first visit and reading it frame by frame. Not yet checked: the same child again, and a real iPad.

<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Sheet: checked twice by a reader who did not write it. Round 1 came back with findings that were pasted, and one sentence was the builder's own (a first visit starts by lamp light). Round 2 came back with four findings, each with its exact replacement: a tap that takes a garment off, whom a garment goes on while someone walks, the four garments behind the door by name, and which reaction is played for several garments. All four are pasted word for word. No rule was written against an earlier text that a finding changed without being changed too.
- Look in use: lacquer miniature, kept.
- Not done: no child and no person has played it, nobody has listened to it, and no physical iPad has been measured.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- Frozen files: used as copied.
- `audio.ts`: a note may carry a `pan`. `tick` is not called.
- `config.ts`: backdrop, budget, a tier that can leave out the scales. The ladder is kept and never read.
- `dressed-in-the-dark.tsx`: the template's wiring, with the state wrapped in `save.ts`.

One entry a file copied from the template, written for the lead and for the games that come after: used as copied, or what was changed and why, and what is wrong or missing that any game would need. Mark a fault or a gap **for the template**. A frozen file is never changed here: a fault in one is a request to the lead.

### For the owner to decide

- Whether the dark is the right dark. The window stays lit and the beds keep a blue and a gold line, and the playtester still asked why the beds looked like arches of stone before they got their garlands.
- Undressed sleepers show their own foot, so a child can tell who is who until they are dressed. Without that the memory starts from the first moment, which a cold reader found too hard.
- Every sound is synthesized and nobody has heard one.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | first stills, both lights, 1180 by 820 | The clothes float. The chicken fell into the hippo's bed. | hooks to the line, the hen tips over in its own bed, quilts in the bed's colour | not measured | gold too dim in the dark |
| 2 | a whole night with everything on | arms and skirts over the neighbour | arms, tails and skirts kept over their own bed; everything painted once and stamped (from about 1,300 calls a frame to at most 80) | counted | feet look like mittens |
| 3 | every sound rendered offline, 129 of them | peaks from 0.003 to 0.16: far too quiet | tones and noise raised; peaks now 0.01 to 0.27, none longer than 2.3 s | not measured | nobody has listened |
| 4 | cold playtest proxy on the production build, about 100 stills, no knowledge of the game | Where did hippo go? Whose feet? It is daytime when the lamp is off. The croc points and laughs at them. Nothing says where a lifted hat goes. | own feet, a darker sky and a pale moon, garlands and blue on the arches, laughing with hands on the belly and not pointing, cross ones look at the garment and not at the child, every quilt offers its hem while a garment is off its peg, longer dreams, the hand stays on the screen | not measured | garments are small beside their wearers; boots on the last bed share its colour |
| 5 | independent code review | 15 findings, most of them reproduced by running the game's own show | all fixed but the boots' colour; the found-as-left and dark-frame ones got new tests | see below | see the status block |

## For the pull request

### How the game meets the quality bar

- **Alive at idle.** Five breaths, five natures, a moon that follows the finger, a cord that sways.
- **Motion and sound on every touch**, when the finger lands; a test presses everything in both lights.
- **Weight.** Garments hang on springs, quilts bulge, each sleeper's whole body goes into its act; no two share one (`motion.test.ts`).
- **Clear silhouettes and targets.** Beds 204 by 380, pegs 91 apart, the cord's target 120 wide.
- **Wordless.** No word, letter, numeral or sign. One want at a time: the cord, then the one who shivers, then the cord. The ladder shows only moves that can be made (`show.test.ts`).
- **60 frames.** At most 80 stamps, fills and strokes a frame and at most 16 sprites painted in one (`frameBudget.test.ts`). Measured with the shared probe on the production build in desktop Chromium with software rendering, which says little about an iPad: 59.5 fps unthrottled at tier 1 (DPR 1.5), worst second 54, frame CPU p95 1.1 ms, 72 calls at most. At 6x CPU throttle 16.7 fps at tier 3 (DPR 1), where frame CPU p95 was 10.2 ms: the 6x run does not reach 60, and the game code alone does not account for it. WebKit was not available. **No iPad was measured.**
- **Assets.** All procedural; system sound only through Web Audio.

### The learning claim

None.

### Defaults taken for the owner

- Five and over start with the wardrobe open.
- The lamp going out is also what puts everyone back to sleep; disliked garments fly home, the loved one stays on.

### What the next builder should know

- A figure made of many small strokes can meet an 80-call frame when each part is a sprite keyed by a rounded expression.
- The shell's home control covers the top centre: nothing that asks to be touched goes there.
- A band of noise renders about ten times quieter than its peak says. Render the sounds offline before believing a list of peaks.

## Pass: the loop, made plain

Seen: a young child did not find the loop. Cause: everything that answered glowed alike, the hand showed a gesture without what it was for, and nobody visibly wanted the next thing. Change: the section of the same name in `ART.md`. Checked by `round.test.ts` and by recording the untouched first visit and reading it frame by frame. Not yet checked: the same child again, and a real iPad.

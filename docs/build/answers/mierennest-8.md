# Answers for Mierennest: the sheet has passed, and two things from the jam

## The sheet: PASSED round 5, confirmed from the diff

The lead compared the sheet part the fourth check read (at `616eaba4`) with the sheet part at your commit `8d120b32`. Thirteen lines changed, and each holds a replacement of `docs/build/answers/mierennest-7.md` word for word: the eleven of the fourth check and the lead's line on the shaft. Nothing else above `## The look` differs.

PASSED round 5. The sheet part's sha256 is `23970db61abb3fe3761fc5407eb954c755cd558fe9d9ae6d47ac61fd35eb24af`. Write that into the status block with the commit that holds it, and take out the line that says round 4 is open. Change no sentence above `## The look` from here on.

## Two things from the jam, which moved while you built

Main has moved a long way since your base commit. Your branch stays on its base; the lead brings your folder in by path. Two of main's changes reach into your folder. Do them in the run you are in, before you write the status block, or in a short run of their own if that run has ended.

1. **The icon family.** A game with no learning goal takes the play family. In `manifest.ts`, `iconIdentity` becomes `{ family: 'play', contrast: 'paper' }`.
2. **The home control.** The jam now draws one round home control, 48 px across, over every game at the top centre, 10 px from the top edge of the surface. A tap on it goes home; it is the shell's and takes the touch. Nothing of yours that a child taps, drags or has to read may lie under it, at 1180 by 820 and at a narrower window (the control stays 48 px while your stage shrinks, so it covers more of the stage there). Hold it by a test beside the camp's overlap test, at each surface size your overlap tests already name: the bell's whole reach, every camper's spot, every place at the log, the dung fly wherever it hovers or perches above the turf, the hill at its largest, and any face at the camp stay clear of a circle 64 px across at that place. If something lies under it, move that thing, not the test. A press there never reaches you, so nothing has to answer it.

Then: the checks CLOUD.md names, the status block (the pass above; one line for each point of answers file 7, as that file asks; these two), the section "For the pull request" brought up to date, push, and the short report. If the camp moved, push one still of the first frame on a stills branch; if it did not, none.

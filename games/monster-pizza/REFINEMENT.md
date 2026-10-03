<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet. The design sheet in `ART.md` is whole, at commit `3e52925d154ecbd39e48db8d053b41ada0a81432` (sheet hash `a8217b7500a8fe7f1c99c7fc146d2f4233e6af9d9c7014bc36f4be0d3dbbad02`). It has not been checked.
- Look in use: none yet. Next is the spike of the first reserved look, felt-tip marker drawing, in canvas 2D.
- Open: sheet ready for check, round 1
- Work built on an unchecked sheet: none yet. Whatever is built before the check comes back names this sheet commit here.
- Run on 2026-10-03, on a cloud machine with no graphics card and no sound: `npx tsc --noEmit`, `npx vitest run games/monster-pizza test/games.test.ts` (11 files, 162 tests), `npm run -s wordless:check`, `node scripts/egress-check.ts`, `npm run build`, `npm run egress:built`, `npm run education:built`. All passed.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a file copied from the template, written for the lead and for the games that come after. This is the pilot for canvas 2D, so every copied helper gets an entry as soon as the running game has used it.

- The generator and the untouched copy: `npm run new:game` worked as the guide says, and the untouched copy passed every check above.
- `ART.md` (the outline): used as copied. One thing any game would need, **for the template**: the outline for "The scenes" does not ask what each scene saves when it starts, though "Found as left" in the guide requires it, so this sheet added a "Saved at the start" entry to each scene.
- `config.ts`, `state.ts`, `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`, the Mount: not used yet.

### For the owner to decide

One line for each thing only the owner can settle.

- The look and the toy, at the toy checkpoint.
- The game counts with a rising note on each piece and no spoken number word, under the default that no game depends on speech until it has been tried on the owner's iPad. The representation the pack names for one-to-one counting has a number word on each object, so this is the first thing to revisit when speech is decided.
- Two customers wait at the door and the child picks one. For a four-year-old that is two things to touch where the cue table offers one next act; the sheet takes it as one act (call a customer in) with a bigger and a smaller version. If that reads as too much, one customer waits and the bigger order goes.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

Nothing yet. One entry for each line of the quality bar, saying how the game meets it so far. Each frame rate comes with the engine, the throttle, the pixel ratio and the build it was measured on, and with whether a physical iPad was measured.

### The learning claim

Nothing yet. The claim as the sheet has it, with each record's standing and its check state read again on the day of the pull request, in the pack's Summary or the game's own words only. A game with no learning goal says so.

### Defaults taken for the owner

Nothing yet. Each default the game took in the owner's place, from the guide or from its own sheet.

### What the next builder should know

Nothing yet. What this build taught that the guide and the template do not say.

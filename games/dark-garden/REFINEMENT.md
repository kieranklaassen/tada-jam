<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. The whole sheet is built.
- Look in use: Stained glass and lead. The art guide is under "The look" in `ART.md`.
- Sheet check: one round by a fresh reader, not passed, 12 findings. All 12 were resolved in the sheet, some in the builder's own words; no second round was run.
- Open: nobody has heard a sound of the game. The notes are tested as numbers.
- Open: measured on a machine without a graphics card; no iPad. No child has played it, and the owner has not seen it.
- Weak: on a small phone held sideways those who wait are about 34 px wide. A game is played sideways: upright the shell asks to turn the device.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

Used as copied except `config.ts`, the Mount, `guidance.ts` (glow at 1.5 s and hand at 3 s), and `scene.ts` and `state.ts`, which this game does not use and were removed: its scenes are in `play.ts` and its saved state in `save.ts`.

### For the owner to decide

The look and the toy, at the first play.

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

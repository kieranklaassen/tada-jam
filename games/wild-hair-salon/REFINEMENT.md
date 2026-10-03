<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, with the look spike built. The design sheet in `ART.md` is whole, as it stands at commit `c4f9ba9` (sheet hash `45ab1170dc484757fca139faf6805db59bc789df0476ac6512b24a71a8632721`).
- Look in use: the first reserved choice, wet watercolour. Spike: the Mount paints the salon at load from a fixed seed (`spike.ts`), with nothing playable behind it. Stills were looked at on this machine (software drawing, Chromium) at 1180 by 820, pixel ratios 1 and 2; none is committed. The still on a real graphics card and the frame rate are the lead's to take.
- Open: sheet ready for check, round 1
- Open: a request to the lead for the registry row of the look (the wording is at the end of `ART.md`).

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a file copied from the template.

- `wild-hair-salon.tsx` (the Mount): changed in two places for the spike. One import, and `draw` now copies the painted salon to the canvas and sets `drawn.drawCalls`. Everything else is as generated. The toy will replace `draw` again.
- `config.ts`, `state.ts`, `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`: as generated so far.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts` (frozen): untouched.
- **For the template:** the Mount has no place that says where a canvas game gets its 2D context or how it should treat the pixel ratio in `draw`. The spike reads `canvas.width` and `canvas.height` (device pixels) and fits the scene itself. A line in the Mount's comment on `draw` would save the next canvas game the question.

### For the owner to decide

Nothing yet. One line for each thing only the owner can settle: the look and the toy at the toy checkpoint, a default the game would like changed, and anything the guide does not rule on.

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

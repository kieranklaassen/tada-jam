<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, with the look spike and the rules of run 1 on top of it (brief). No toy and no game yet.
- Sheet: written in full, not yet checked. Sheet commit `0a96fd5`; sheet part sha256 `362aa27135abddcbcd1d3db96bc87c82906a4b48b5816fd657496fbbe99ce9d4`. The sheet part has not changed since.
- Rules: written against the sheet at `0a96fd5`, before its check, at this builder's own risk (guide, step 3). A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: first reserved choice, Blueprint and balsa. Spike: the Mount shows it at load from a fixed seed, with nothing playable behind it (`spike.ts`). Stills taken here on the software renderer only; the frame rate is the lead's to take.
- Renderer: canvas 2D with the game's own solver (`frame.ts`), as the brief suggests. matter.js is not used.
- Open: sheet ready for check, round 1

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

No entry yet. One entry a file copied from the template, written for the lead and for the games that come after: used as copied, or what was changed and why, and what is wrong or missing that any game would need. Mark a fault or a gap **for the template**. A frozen file is never changed here: a fault in one is a request to the lead.

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

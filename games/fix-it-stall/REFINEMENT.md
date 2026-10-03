<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet. First run, from base commit 2a133cc on `feat/learning-games-build`. The sheet is whole and has not been checked.
- Sheet text to check: the sheet part of `ART.md` (everything above `## The look`) as first pushed whole in the commit "Fix-it Stall sheet: the records, ready for check". Its hash is in the line "Sheet hash" below.
- Look in use: Electronics bench, the first reserved look. The spike is in: the Mount shows it at load, one fixed moment, nothing playable (`spike.ts`). Stills taken here in headless Chromium on a software renderer at 1180 by 820, pixel ratio 1 and 2, kept outside the repository. No frame rate measured here: the lead takes it on a real graphics card.
- Renderer: canvas 2D, as the brief suggests.
- Sheet hash (`awk '/^## The look/{exit} {print}' games/fix-it-stall/ART.md | sha256sum`): `0585a62e0a40d226105a4869612f164d0fc828f64f6f005618a3d09435be8423`
- Open: sheet ready for check, round 1

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `fix-it-stall.tsx` (the Mount): changed in one place. `draw` calls the spike with the canvas's 2D context, the size, the pixel ratio and the attended clock's seconds, and writes the count of sprites and figures into `drawn.drawCalls`. Everything else is as copied.
- `config.ts`: as copied so far. `LADDER` and `FIRST_VISIT` change with the designed order, which is what the file is for.
- All other copied files: as copied, untouched.
- **For the template:** a shadow's blur and offset on a 2D canvas ignore the transform, so a painter that scales its scene has to scale them by hand (`lifted` in `paint.ts`). A canvas game's first helper will hit this.

### For the owner to decide

- **The plus and minus signs on a cell.** A real cell has them printed on its ends, and both are in the jam's list of signs. They would mark a pole, not a quantity, so the sheet does not use them: the two ends of a cell are told apart by shape and colour. May they be drawn on the cell as on a real one?
- **The numeral on an order ticket.** The sheet lays a numeral from 1 to 3 beside the drawn group of parts a customer asks for, from the position `ticket` on. The drawing carries the order without it. It is a quantity asked for, which the default on readings allows; if the owner would rather have no numeral in this game, the ticket works without.
- **A lamp that blows.** Three cells on one lamp blow it: the lamp becomes a gap and the tray gives another. It is true, large and free, and the state otherwise stays. If a part that breaks reads as a lost piece, the lamp can dazzle without blowing.
- The look and the toy, at the toy checkpoint.

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

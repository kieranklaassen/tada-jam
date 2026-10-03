<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: toy. The toy is built in the look and pushed; it waits for the owner's checkpoint. The rules of the game are being written on it meanwhile, at this builder's own risk, against the sheet at commit `3e52925d154ecbd39e48db8d053b41ada0a81432`.
- Sheet: whole and unchanged since commit `3e52925d154ecbd39e48db8d053b41ada0a81432` (sheet hash `a8217b7500a8fe7f1c99c7fc146d2f4233e6af9d9c7014bc36f4be0d3dbbad02`). Not checked yet.
- Open: sheet ready for check, round 1
- Look in use: the first reserved row, felt-tip marker drawing, in canvas 2D. It read clearly in this builder's own stills at 1180 by 820, so the second row was not spiked. No frame rate was taken: this machine has no graphics card, and the lead takes it.
- For the lead's still: the Mount shows the toy at load. `?spike=1` shows the still scene of the look spike (a customer with a card, two at the door, two tubs, a pizza with two pieces), laid out from a fixed seed. `?seed=<n>` pins the toy's random stream.
- Open requests to the lead: the registry row for the look (its text is at the end of `ART.md`).
- Run on 2026-10-03, on a cloud machine with no graphics card and no sound: `npx tsc --noEmit`, `npx vitest run games/monster-pizza test/games.test.ts`, `npm run -s wordless:check`, `node scripts/egress-check.ts`. All passed. `npm run build`, `npm run egress:built` and `npm run education:built` passed at the sheet's boundary and are run again at each later one.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

One entry a file copied from the template, written for the lead and for the games that come after. This is the pilot for canvas 2D. "Used as copied" means the running game uses the file and not one byte of it was changed.

- **The generator and the untouched copy.** `npm run new:game` worked as the guide says, and the untouched copy passed every check.
- **`ART.md` (the outline).** Used as copied. **For the template:** the outline for "The scenes" does not ask what each scene saves when it starts, though "Found as left" in the guide requires it; this sheet added a "Saved at the start" entry to each scene.
- **`input.ts`.** Used as copied. The Mount passes `press`, `tap`, `dragMove`, `dragLift`, `dragEnd` and `pressEnd` straight to the game. `dragStart` needed no handler: the piece is already in the hand from `press`, and the first `dragMove` carries it. The rule that every press has one ending held: a piece that pops into the hand on `press` goes down on whichever of the three arrives. `progressToward` and `countsAsDone` are not used yet; they are for the slide of the pizza to the oven, in the game.
- **`audio.ts`.** Used as copied. Its `tick` is no longer used. The two building blocks were enough for every voice so far. **For the template:** a game that keeps its voices as numbers needs one small bridge from numbers to `tone` and `noise` (here `sounds.ts`, 15 lines, with the type in `voices.ts`); every game on a machine that cannot hear will write the same one.
- **`guidance.ts`.** Used as copied: `IdleLadder` for the glow and the demonstrations, `handPose` for the ghost hand's press. **For the template:** the Mount calls `ladder.update` in the loop and throws the result away, so a game has to call it a second time in `draw` to get the guidance to its renderer. Keeping the returned object in a variable of the Mount would save that.
- **`state.ts`.** Used as copied, and wrapped by `save.ts` as its header describes: `save.ts` calls its `deserialize` and `serialize` and reads the same raw record again for the game's own fields. That worked without touching the file. The position rules (`beginCycle`, `finishCycle`) are not used yet; they come with the game's cycle.
- **`config.ts`.** Used as copied so far. `LADDER` and `FIRST_VISIT` still hold the template's placeholders; the sheet's eight places go in with the rules.
- **`scene.ts`.** Not used yet. It comes with the stepping up, the baking, the tasting and the eating.
- **`overlay.ts`.** Used as copied. Its corner (72 by 72 at the top right) is kept bare of anything that answers a touch: the doorway stands clear of it.
- **The Mount (`monster-pizza.tsx`).** Changed, in these places and for these reasons:
  - It makes the view and, once the slot is read, the game. `draw` has three cases: the game, the still scene of the spike, and bare paper before the slot is read. **For the template:** `resize` calls `draw` before the load has finished, so every game needs something to draw with no state; a comment says so, but a blank Mount gives no hint of how.
  - `resize` tells the view the new size and ratio before it draws, so the sprites are made again at that density.
  - `act` turns each gesture's point into stage units and hands it to the game, then plays the voices the game queued and hands its change to storage. The same two calls follow the game's step in the loop. Sounding in the handler keeps the pop inside the touch, where `audio.ts` can hold it for the unlock.
  - The save's write function takes the pieces at rest from the game just before it serializes, so nothing is saved in the air.
  - `seedOf` reads `?seed=` for stills and otherwise draws a new seed for the visit. **For the template:** the cloud page asks for "a fixed seed" for the lead's still and the template has no place for one.
- **Nothing in the template fits a stage into a surface.** A canvas game drawn in fixed units needs a fit (scale and offset from the surface's size) and its inverse for touches. Here that is `fit` and `toStage` in `layout.ts`, 20 lines. **For the template**, if the other canvas games lay out the same way.
- **A finding the other canvas games should have before they build their toys.** The first version drew the counter and the worktop as one sprite over most of the surface, so that the customers' feet were hidden behind it. Two full-surface stamps a frame cost about 9 ms a frame in software drawing at pixel ratio 2; with the worktop left as bare paper, the customers clipped at the counter and the counter's edge as a thin band, a frame cost about 0.3 ms on the same machine. The look ledger's note on 2D rows says at most one full-surface composite a frame, and it means it.
- **Random placement does not fill a pizza.** Dropping pieces at random free spots jams before twelve fit (10 or 11 in two of eight seeded runs). A set that must always hold its full count needs spots that always fit, or pieces that shuffle up; this game does the second (`makeRoom` in `table.ts`). A canvas game with scattered countable pieces will meet the same thing.

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

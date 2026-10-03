<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, waiting for its check. First run, cut from base commit 2a133cc on branch `lane/monster-hotel`. By the brief this run also holds the look spike and the rules, written ahead of the check at the builder's own risk. The toy is not started.
- Sheet: the sheet part of `ART.md` as it stands is at commit 9f33e90 and hashes to `dce520f698c1ec3684688a295eb337da9902dfc2d60871b66bb45a595cf2f22c` (`awk '/^## The look/{exit} {print}' games/monster-hotel/ART.md | sha256sum`). It was first whole at ca64cea (hash `efca34a5…4cd2a1`). Six sentences were corrected in 9f33e90 while the rules were being tested, and nothing else changed: the answer to "Guess" (now the measured shares, held by a test); the bat's "must have" (a room that is not warm); the cause of the settled day (a dial turn can settle the house too); the cause and one beat of the porter's neat way; "at least two different ways of giving out the rooms"; and the bench guest's spare bed. A checker who read ca64cea has read everything but those six.
- Rules: written against the sheet at 9f33e90, in modules of their own: `hotel.ts`, `guests.ts`, `arrangement.ts`, `airs.ts`, `mood.ts`, `moves.ts`, `hours.ts`, `demand.ts`, `casts.ts`, `stay.ts`, `cycle.ts`, and `solver.ts` (used by tests only). A finding under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: the first reserved look, pen-and-ink crosshatch, on canvas 2D. The spike is being drawn in this run and is not pushed yet.
- Open: sheet ready for check, round 1
- Open, requests to the lead:
  1. The still of the look spike at 1180 by 820 and its frame rate at DPR 2, on a real graphics card. The Mount shows the spike scene at load with a fixed seed: `/?chrome=0#/play/monster-hotel`.
  2. A row in the claimed-styles registry of `docs/art-direction.md` when the look is accepted. Proposed text: "Monster Hotel | Pen-and-ink crosshatch (canvas 2D): black pen on cream paper, tone by hatching only, stiff deadpan monsters in a cut-away hotel, one vermilion spot colour on what can be touched | `games/monster-hotel/ART.md`".
  3. The commit that holds what the canvas pilot changed in the template, before the toy.
  4. The commit that holds `symbols.ts` to start from. The two dials are the only numerals; `numerals()` in `moves.ts` lists them, and none is drawn yet.
  5. What CI's `check` job says of this branch.
- Not done in this run, by the brief: the toy; sound (no voice module yet: every voice will be plain numbers in one pure module with a range test, as the cloud page asks); `symbols.ts`; motion personalities; the view of the page from a guest's place; the overlap tests of a canvas game; the frame-budget test; any measurement.
- Findings not fixed: none known in the rules. In the spike: see "Still weak" in the pass log.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `config.ts`: changed, as meant. `LADDER` holds the ten places; `FIRST_VISIT` is written out by hand (9 and 11), because the generated second row starts at the band's oldest age and this game wants it a year earlier; the game's own numbers are added at the end. Nothing wrong with the file.
- `state.ts`: used as copied. `stay.ts` wraps it the way its header describes (`deserialize` for the three fields, then a second read of the same raw record). That worked without touching it. One thing any game with a cast on screen needs and has to work out alone: when the saved cast is no longer known, the wrapper must also clear `finished`, or the game opens on a judged cycle with a fresh house. **For the template**: a sentence in the header of `state.ts` saying that a wrapper which cannot restore its own fields starts a fresh cycle (`finished: false`) and keeps the position.
- `state.test.ts`: used as copied; it reads `LADDER[1]`, so a ladder needs two steps, which is fine.
- `monster-hotel.tsx` (the Mount): the spike's renderer is being wired in; the note follows with it.
- `scene.ts`, `guidance.ts`, `input.ts`, `audio.ts`, `overlay.ts`: as copied, not yet put to use by this game.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- **For the template**, a gap any learning game with authored content will meet: there is no place in the copy that says where pure content tables and their solver-backed tests go, or that a test-only module (here `solver.ts`) is fine in the game folder as long as nothing the Mount imports reaches it.
- **For the lead**, the machine: Node 24 came from `nvm` under `/opt/nvm` as the cloud page says. A Chromium for stills was already on the machine under `/opt/pw-browsers`, older than the repository's Playwright, so stills launch it by `executablePath`; nothing was installed.

### For the owner to decide

- The look, at the toy checkpoint: pen-and-ink crosshatch with one vermilion spot colour.
- One colour, two jobs. On the plain page the spot colour marks what can be touched. From a guest's place the sheet also draws what that guest loves in it, as line flourishes. Whether that reads, or whether the loved air should be told by its form alone, is a call for the toy checkpoint.
- The way back in. A child who is stuck carries a guest out to the coach, the whole lot leaves unbothered, and the next coach-load is of the place below. Nothing says so on screen. Whether sending guests away is the right "way back in" for this age is the owner's call.
- A note for the grown-up. Two of the Dutch records ask for talk about where a conflict comes from, and the game has no talk in it. A short note for the grown-up, off the kid side, saying what to talk about would close that gap. Whether a grown-up corner may hold such a note is one of the open questions of the game-design pack, so none is built.
- No default awaiting the owner needs to be answered differently for this game. Numerals lie only on the two dials the child sets; a room's warmth is never shown as a number.

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

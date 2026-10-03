<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, waiting for its second check. First run, cut from base commit 2a133cc on branch `lane/monster-hotel`. By the brief this run also holds the look spike and the rules, written ahead of the check at the builder's own risk. The toy is not started.
- Sheet, round 1 (checker: B): open, 15 findings, read at commit ca64cea (hash `efca34a5…4cd2a1`). The findings came in `docs/build/answers/monster-hotel-1.md` on the base branch. All fifteen replacements are pasted as given at commit 82780b2. None was held back.
- Sheet as it stands: commit 82780b2, sheet part hash `6eff8f46c2da57992dd082ef2ba05cfb814915b1ad665cfa419cf639e019d098` (`awk '/^## The look/{exit} {print}' games/monster-hotel/ART.md | sha256sum`).
- For the round 2 checker: besides the fifteen pasted replacements, the sheet differs from the text round 1 read in six sentences that the builder corrected at 9f33e90, before the findings arrived, while testing the rules: the answer to "Guess" (measured shares, held by a test); the bat's "must have" (a room that is not warm); the cause of the settled day (a dial turn can settle the house too); in the porter's neat way, one sentence after the pasted Cause sentence and the beat "where the cast allows it"; "at least two different ways of giving out the rooms"; and the bench guest's spare bed. `git diff ca64cea 82780b2 -- games/monster-hotel/ART.md` shows all of it.
- Rules: in line with the sheet at 82780b2 (commit ec1f2cf), in modules of their own: `hotel.ts`, `guests.ts`, `arrangement.ts`, `airs.ts`, `mood.ts`, `moves.ts`, `hours.ts`, `demand.ts`, `casts.ts`, `stay.ts`, `cycle.ts`, `hint.ts`, `page.ts`, and `solver.ts` (used by tests only). Three things changed with the findings: the idle hand lifts a waiting guest and puts it back and never carries it to a room (finding 2); sending the guests away takes the bench guest too (finding 7); the neat way is tied to the first settled day at a place (finding 3). A finding of round 2 under the representation, the mechanic questions, the error, the designed order or the records reopens them.
- Look in use: the first reserved look, pen-and-ink crosshatch, on canvas 2D. The spike is being drawn in this run and is not pushed yet.
- Open: sheet ready for check, round 2
- Answers handled: `monster-hotel-1.md`. Before any run ends, `git fetch origin` and look under `docs/build/answers/` on the base branch for a higher number.
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

So far there is a design sheet, the rules and a look spike; nothing is playable. Each line says what exists and what is still to come.

- **Alive at idle.** In the spike: the troll pumps the tuba and its noise travels through the walls, sleepers breathe each at its own tempo, snow drifts, warmth rises, the wheel sways. All of it runs on the attended clock and stops when the game is unattended or hidden. Still to come: a motion personality for each guest.
- **Motion and sound on every touch.** Not yet: the spike takes no touch but the template's tick. The toy is the next stage.
- **Weight, squash and follow-through.** Not yet.
- **Kid-clear.** Six rooms of about 200 logical pixels at 1180 by 820, one guest a room, each its own silhouette, rooms left light and the roof, cellar and night sky dense. What can be touched carries the one spot colour and nothing else does.
- **Wordless clarity for the declared age.** No word, letter or numeral is drawn. The band starts at 9, so numerals are allowed; the game will lay them in one place only, beside the flames and icicles of the two dials, in `symbols.ts`, which is not written yet. `npm run wordless:check` passes.
- **Wordless guidance.** The template's idle ladder is in the Mount and not yet given anything to show.
- **60 fps on a mid-range iPad.** Not measured. This machine draws in software, so no frame rate is reported from it; the lead measures the spike on a real graphics card. Built for it: canvas 2D, the house painted once per resize into one cached layer, each figure a cached sprite, the pixel ratio capped at 2, and the sprites of a frame counted into the grown-up handle. No physical iPad has been measured.
- **Procedural or committed assets only.** Everything is drawn at run time from a seeded generator. No file, font or address is loaded. `node scripts/egress-check.ts`, `npm run egress:built` and `npm run education:built` pass.
- **Its own art direction.** Pen-and-ink crosshatch: black pen on cream paper, tone by hatching only, one vermilion spot colour. The art guide is in `ART.md` under "The look".

### The learning claim

As the sheet has it, with every check state read from the lookup on 2026-10-03 (to be read again on the day of the pull request):

Monster Hotel is designed from two content standards adopted by the California State Board of Education (`us-ca 4.4.2.S` for grade 4 and `us-ca 6.4.4.M` for grade 6), neither of which the game carries out: the first asks for practice with other people and the second asks the child to show the use of the steps for resolving a conflict, and the game has only invented guests and keeps no record of what a child shows; from three of California's Transformative Social and Emotional Learning competencies, which are voluntary guidance tied to no grade (`us-ca 3.B.2` and `us-ca 5.F.2`, Late Elementary, and `us-ca 4.E.3`, Middle School); from five fase goals of the Dutch curriculum institute, which are guidance on what a school can offer and not law (`nl ojw/ja/1/07/fase2`, `nl ojw/ja/1/06/fase2`, `nl ojw/ja/3/08/fase2`, `nl ojw/ja/1/06/fase3` and `nl ojw/ja/3/08/fase3`); and from two items of the Dutch draft core goals for 2027, a draft not in force (`nl 20 A d` and `nl 20 B e`). All twelve records were `confirmed`. The game says nothing about what a child has reached, practised or can do, and keeps no record of it.

### Defaults taken for the owner

- Every default under "Symbols, and the defaults awaiting the owner" in the guide is kept as written. In particular: no symbol stands alone (the dials' flames and icicles say what the numerals say); no reading on the object (a room's warmth is marks, never a number); no written word; no speech; no camera shake or impact pause.
- From the sheet: the older form of guided discovery for the whole band (the child tries first, the porter shows a neat way after); a first visit starts at the first place for a child of 10 or younger and for no age, and at the second from 11; a cycle goes well within three set-downs a guest, and only set-downs that change the house are counted; the coach waits with its blinds drawn, so a moved place shows on the very next coach-load; the guest on the bench may be one the child has not met yet.

### What the next builder should know

- **Write the rules before the content, and let a solver pick the content.** The thirty casts were chosen by running every candidate through a small exhaustive solver and reading three numbers: how many ways of giving out the rooms there are, how many settle the house bare, and how many settle it with the things placed. Hand-picked casts would have had houses that no arrangement settles and "neat ways" with an idle thing in them. The solver stays in the game folder for the tests and is never imported by anything the Mount reaches.
- **A sheet sentence about how hard something is must be a number a test holds.** The first draft of "Guess" said most arrangements settle at the first places. Measured, it was between one in eight and all. The sentence was corrected and a test now fails if a cast drifts.
- **A hand-drawn spike scene should be a state the rules produce.** `page.test.ts` builds the spike's house from the rules and compares the result with the scene the renderer was given. The first comparison showed the rules had a cross guest turning to the less obvious of its two troubles; the rule was changed (what others make comes first, loudest first), not the picture.
- **Keep a spare bed.** A "harder option the child can choose" that cannot be housed is a trap. Every cast keeps beds for one more than its guests, and a test holds that the house can be settled with the extra guest in.
- **A subagent can draw the spike while the rules are written,** if it is given a view-model type to draw from and the two never write the same file. Commit by path while it works.

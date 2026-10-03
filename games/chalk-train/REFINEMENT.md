<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, with the look spike and the rules written while the check runs. The toy is not started: the brief holds it until the canvas pilot has proven the template.
- Sheet check, round 1 (checker: B): open, 12 findings, on the text with sha256 `f77a0de0…2434c` at commit `397b9a1`. All 12 replacements are pasted as written; none is disputed.
- Sheet check, round 2 (checker: D): open, 4 findings and 2 more from the lead, on the text with sha256 `4bb4d379…3025` at commit `66bcfad`. All 6 replacements are pasted as written; none is disputed. One was pasted at a different place than named: the lead's second replacement names the line under the fase 1 statement, but the line it replaces ("no shape of stroke is named") stands under the peuter statement nl / 7, and it was pasted there. The third "Left open by Limits" line, under nl / 3, was not named and is unchanged; that record's Limits itself says it does not say with whom.
- Sheet now: whole at commit `9c363e8`, sheet part sha256 `6b88fa5920eea88a1d9e66e103581336706b5425e2efde7d46d983dc1d5f1fb4`. Not yet checked in this form.
- Rules: brought into line with the sheet at commit `9c363e8`, at the builder's own risk until a round passes. Round 2 changed: the stored field `ahead` now says whether a second rider is drawn in (in place of a sixth value of where a rider is), and a waiting rider stays at its stop when both wagons are taken.
- Look in use: Chalk on asphalt, the first reserved look. Spike: in the Mount, painted once from a fixed seed (`spike.ts`), nothing playable behind it. Stills taken at 1180 by 820, pixel ratios 1 and 2, kept outside the repository. No frame rate: this machine draws in software, and the lead measures.
- Open: sheet ready for check, round 3

**Where the rules are finer than the sheet's words,** for the checker and the lead to rule on. None changes what the sheet claims; each would be one sentence in the sheet if wanted.

1. Where a rider is, is stored in five values where the sheet names three (at the stop, aboard, home): also home from the cycle before, and waiting for the cycle to come. `world.ts` says so at the type.
2. "Right beside the train" is within 480 tar units of it. Such a rider walks over and boards on the first mark of its cycle; a rider farther off is fetched.
3. A mark that starts within 70 tar units of the train is joined to it, and the hop counts as chalk.
4. When the tar is too full for a position to lie as designed, the nearest thing is laid out. A test plays 300 cycles at each position and finds the designed layout in more than 85 in 100 at the puddle position and more than 9 in 10 elsewhere.
5. A rider fetched early joins the cycle in play, and another is laid out to wait at once, so someone always waits ahead. Where that leaves four riders on the tar, the oldest home is rubbed away then, not at the next beginning. Where four riders are on the tar and none is at home, the one waiting ahead stays at its stop even with a wagon free, since nobody could be laid out to wait in its place.
6. A home with its rider in it is answered by the rider (the grid's rider row); a home whose rider is elsewhere gives the home's own answer.

**Requests to the lead.**

- A row for this look in the claimed-styles registry of `docs/art-direction.md`, at the merge: "Chalk Train | Chalk on asphalt (canvas 2D): dusty pastel chalk lines and scribbled fills on grey tar with cracks, a dandelion and a puddle, in flat daylight, with no shadow | `games/chalk-train/ART.md`".
- The frame rate of the spike and a still on a real graphics card.
- Nothing else is blocked. No frozen file needs changing.

**Not built yet** (the toy stage and after): the view of play and the mapping from screen to tar, the voices as plain numbers in one pure module with their range test, the scenes on `scene.ts`, what the idle ladder shows, the motion module with a personality per character, the overlap tests and the frame-budget test for a canvas game, and the Mount reading and writing the world through `save.ts`.

**Machine notes for the next run.** Node 24 through `nvm` under `/opt/nvm`, with its `bin` first on `PATH` in every command. Chromium was already on the machine under `/opt/pw-browsers` and was used through Playwright's `executablePath`, so nothing was installed. `compound find` was not available; the frontmatter and the packs were read instead.

### Template notes

- `config.ts`: changed, as it is the module a game tunes. `LADDER` holds the six positions, `FIRST_VISIT` has three rows (ages 2, 3 and 4), and `BACKDROP` is the tar's grey so nothing flashes at load.
- `chalk-train.tsx` (the Mount): three lines added for the spike (an import, one instance, the body of `draw`). Everything else as copied.
- `state.ts`: as copied, wrapped by `save.ts` the way its header describes. **For the template:** a wrapper cannot tell from `deserialize`'s result whether the record was readable or a fresh state was returned, so it has to repeat the test on the record and its version to know whether to build its own fresh fields. A small exported `isRecord(raw)` would keep that test in one place.
- `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts`: as copied, not yet used by this game.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- `ART.md`: **for the template:** the outline has no place for a first showing of a new idea (pack: game-design, guided-discovery.md); this sheet put it under the designed order, beside the stored mark that makes it play once.

### For the owner to decide

- The look, at the toy checkpoint: Chalk on asphalt.
- The picture has its own up. The tar is seen from above, and the chalk drawing on it is side-on, so a line can climb, fall and loop. This is what makes hills and loops mean something, and it is a taste call.
- The child does not choose a chalk colour: five pastels come in a fixed order. A palette would be a tool on screen before it means anything to a two-year-old.
- There is no eraser. The tar holds 14 marks, the oldest grow paler as newer ones are made, and the oldest is rubbed out by the fifteenth.
- For a two-year-old the game makes no California claim: the pack holds no California record on making marks at that age.
- No default from the guide's list needed changing.

## Pass log

One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak. The spike's passes were on a still, in software, so they carry no frame rate.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| Spike 1 | First still, 1180 by 820, ratio 1 | The train is tiny and I cannot find its face. The grey has round stains. | Figures enlarged (train 1.4, rider 1.5, home 1.3); tar patches fade at the rim; the rail lifted under the wheels | not measured | The train sits on top of the loop |
| Spike 2 | Second still | The train is in the way of the loop. Everything has a grey glow round it. | Recomposed with the train heading into the loop; the dust smear round a line made fainter; engine eyes larger; the dandelion moved clear of the smoke | not measured | The frog hides its wagon |
| Spike 3 | Third still, ratios 1 and 2 | The frog is sitting on nothing. | Wagon in another chalk, rider smaller and higher in it; the puddle's rim softened | not measured | The puddle is flatter and cleaner than the tar round it; the chalk grain is even, with no streaks along a stroke |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far there is a still scene and the rules. Lines the toy has to meet are marked "not yet".

- **Alive at idle:** not yet. Planned: the engine breathes smoke puffs and its eyes follow the finger; riders look toward their homes.
- **Motion and sound on every touch:** not yet in the view. In the rules every mark has an answer: the grid holds a sight and a sound for each of its 30 cells, and a test holds that no two share either and that no mark on bare tar is a dead end.
- **Weight, squash and follow-through:** not yet.
- **Kid-clear:** few, large, separate figures in pastel chalk on mid-grey tar; the train is about 210 tar units long and a rider about 100 tall. Places for stops and homes are at least 200 units apart and none is in the bottom strip, held by a test.
- **Wordless clarity for the declared age:** no word, letter, numeral or symbol is drawn; the wordless check passes. Everything essential works with a tap, and a line counts when partly done, both held by tests on the rules.
- **Wordless guidance:** not yet. The template's ladder is in the Mount; what it shows is the toy's work.
- **60 fps on a mid-range iPad:** not measured. The spike is one image copied to the surface each frame. Canvas 2D, no post pass, no shadow. No physical iPad has been measured.
- **Procedural or committed assets only:** everything is drawn at run time from a seed; the egress scan and the built-asset scan pass.
- **Its own art direction:** chalk on asphalt, written up in `ART.md` under "The look".
- **Found as left:** the world is always at rest in the model, so nothing is ever saved in the air; a test plays 200 marks and reads every state back exactly; a largest legal state is held under half of the storage cap.

### The learning claim

As the sheet has it after round 1, to be read again on the day of the pull request: Chalk Train is designed from one California learning foundation for preschool and transitional kindergarten (a foundation, not a standard; its statement for the earlier age only; confirmed when read on 2026-10-03), from which it takes only that scribble comes before any letter, for ages 3 and 4; from two statements of the Dutch curriculum institute's content card for peuters (confirmed), for ages 2 and 3 and a child who has only just turned four; and from one statement of its content card for fase 1 (confirmed), for age 4. The Dutch statements are guidance, not law. For a two-year-old it is designed from the two peuter statements alone. The pack ids are in `ART.md` under "The records". It says nothing about what any child can do.

### Defaults taken for the owner

- Every default in the guide's list, as written. The ones that shape this game: no symbol and no letter of any kind; no camera shake and no impact pause; creature voices invented and synthesized.
- From the sheet: the chalk colour is not chosen by the child; there is no eraser and the oldest chalk goes first; the chalk picture is side-on on a tar seen from above.

### What the next builder should know

- A mark's points land on whole tar units, so a new line can pass exactly through a point of an older one. A crossing test with strict inequalities misses that case; count a point that lies on the other path as belonging to one side.
- A corner drawn at 80 degrees reads as under 70 once the mark is evened to a step, because the sharpest point falls between two points. Test shapes need corners well past the threshold, as a real zigzag has.
- A rule that counts something inside a `map` must count in a local variable: reading the array being mapped gives the count from before the pass, and two riders boarded a full train. A seeded test of hundreds of random marks found it; the hand-written cases did not.
- A helper that plays a cycle for a test (go to whoever is first in play) can trap itself where a child would not: it found a rider crowded out of the train by one fetched early, which became a rule (a wagon is kept for the layout in play).
- Places where things can stand run out fast. Eight places could not hold three riders with their stops and homes; twelve can, and a layout still needs a fallback.

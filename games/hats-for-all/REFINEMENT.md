<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: game, being built on the toy (the game run of `docs/build/runs/game.md`). This block is rewritten at the end of the run.
- Sheet, round 1: checker B, open, 14 findings, all pasted at commit `06c946d`.
- Sheet, round 2: checker D, on the text with sheet part sha256 `0db3c2a0d4d45341c6386f07f99d80b60d4fc49c26696366a34dfb5c6644638d`. Outcome: open, 4 findings. All 4 replacements are pasted as the checker wrote them, none disputed, at commit `d9a0c46` (sheet part sha256 `26cdd160de55cad7ff69e3dc309676351c6b290327f1de763efc3b89cdbf2e78`). Brought into line: the three sounds the grid's cells now name (the squeal, the whirr and the falling whistle) are voices of the game and are heard in those cells, by test.
- Open: sheet ready for check, round 3

**For the next checker, from the builder**

- The row for `crew` in the table of saved fields does not name the spot, and the save holds one: a creature keeps its round spot when another walks out, so the row order alone cannot rebuild where each stands. If the row should say so, the sentence would be: "The creatures on the mat in row order, at most five: each one's kind, the round spot it stands on, and the hats on its head from the bottom up, each hat named by its hole in `tile`." Nothing was pasted for this: it is not a finding of round 1.

**Requests to the lead**

- The check of the sheet, round 1.
- The frame rate of the spike and the toy at a pixel ratio of 2 on a real graphics card. On the build machine the scene is 14 draw calls and about 31,000 triangles at every tier.
- A row in the claimed-styles registry of `docs/art-direction.md` (the file, the change, the reason: section 3, one new row, because the look must be registered in the same pull request). Proposed row: Hats for All; "Foam play mats 3D: thick matte foam slabs with a fine stipple and a small soft bevel, a jigsaw-toothed teal floor, a cream tile the hats press out of and leave their holes in, hats in the three flat primaries, cut-out creatures in secondaries, plain daylight"; art guide `games/hats-for-all/ART.md`.

**Findings not yet fixed**

- The toy saves nothing of its own: it is the same scene at every load. `save.ts` is written and tested and is not wired into the Mount yet.
- Of the idle ladder only the glow is drawn (the hats that can be taken stir). The ghost hand comes with the game.
- No drag yet. A finger that slides before it lifts counts as a tap on what it landed on.
- The fifteen acts of the tastes are named in `tastes.ts` and not animated: the toy plays a bounce and a babble in the tune of the taste.
- No mesh is named or tagged for the intersection audit, and `scripts/intersections/games/hats-for-all.ts` is not written. The toy's model test holds only that nothing goes below the floor.
- Nobody has heard a sound of this game. Every voice is numbers in `voices.ts`, held to stated ranges by its test.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `hats-for-all.tsx` (the Mount): changed where its comments say to. The renderer, the toy and its sounds went in at `applyTier`, `draw`, `resize`, `act` and the loop; the import of `tick` went out. **For the template**: `draw` needs the idle ladder's glow, and the only way to it is to call `ladder.update` a second time; keeping the loop's result in a variable that `draw` reads would save every game that call.
- `config.ts`: tuned as meant. `Tier` gained `stipple`; `LADDER` holds the eight ids; `FIRST_VISIT` has three rows written out, one for each age of the band, in place of the generated two.
- `state.ts`: as copied. `save.ts` wraps it as the file asks, reading the same record a second time. **For the template**: the wrapper has to repeat the test for "a record of this version" to know whether to give a first visit or to repair; an exported helper for that test would keep the two reads from drifting apart.
- `audio.ts`: as copied. `sound.ts` turns a voice written as numbers into its `tone` and `noise`. A delay is passed inside the voice, which works.
- `input.ts`, `guidance.ts`, `overlay.ts`: as copied. Of `guidance.ts` only the glow is used so far.
- `scene.ts`: as copied and not used yet: the toy has no scene.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen and untouched.
- The generator ran once and its untouched copy passed the typecheck and the tests.
- The machine: Node 24 came from `nvm` under `/opt/nvm`, with its `bin` put first on `PATH` in every command. A Chromium was already on the machine and Playwright drove it by its path, so nothing was downloaded. In software, with the canvas antialiased, a frame at a pixel ratio of 2 takes about half a second, and a screenshot there needs a timeout well above the default. **For the template or the cloud page**: `ExtrudeGeometry` with a negative `bevelOffset` breaks on an outline with sharp teeth (the inner edge crosses itself and faces go missing), so a jigsaw edge is bevelled outside its outline.

### For the owner to decide

- The look, foam play mats, and the toy, at the toy checkpoint.
- Speech. The game speaks no number word, by the guide's default that no game depends on speech until he has tried it on his iPad. With a number word heard on each hat as it is given, the game could also be designed from the records on number words, and a two-year-old in California would then have a record under the game; as it stands that child has none. Whether this game should wait for the speech trial is his call.
- Whether the cycle's change may come by itself. In the sheet one more creature walks in, or one walks out, once the crew is as paired as it can be and has been left alone for two seconds, as the consequence of the child's last move. If he wants it to wait for the child's touch, the scenes change.
- Whether this band needs a harder option laid beside an easier one for the child to pick. The sheet offers none, because one next act is offered at a time at this age, and says what the child can choose in its place.
- Whether three kinds of hat are plain enough for working pieces. Each is one flat colour and one simple outline; the kinds exist so that the creatures can have tastes.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| Spike 1 | The first still of the scene, software, 1180 by 820, pixel ratio 1 | Half the floor was missing and a stray triangle crossed it; the hats and the creatures already read. | The jigsaw tiles' bevel is cut outside the outline; the mat widened to fill the view. | Not measured (software) | The top third is empty wall; the shadows are faint. |
| Spike 2 | Stills after four taps and a poke in the floor, pixel ratios 1 and 2; the lowest tier | A hat on a head, in its hole and loose on the floor cannot be confused. At ratio 2 the stipple and the bevels show. The lowest tier still looks like the game. Bare creatures did nothing to show they want a hat. | The camera moved in and down a little; a bare creature pats its head now and then; darker shadows; one step of bevel on the floor. | Not measured (software): 14 draw calls, about 31,000 triangles | The wall above the row is kept empty on purpose, as room for a tower of hats; the lime creature is the weakest against the teal floor; nothing here says how it moves on a real tablet. |
| Round spots | A still after four taps, software, pixel ratio 1 | The sheet has the creatures stand on round spots and a loose hat rest beside one; the scene drew none. | Five lighter discs inlaid flush in the mat; the loose hat circles beside its spot. | Not measured (software): 14 draw calls, about 31,000 triangles | The two empty spots at the ends of the row may read as places to put something. |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far, at the toy stage. No frame rate has been measured on any machine, and no physical iPad has been measured.

- **Alive at idle.** Each creature breathes at its own tempo, sways, blinks at moments of its own, looks at the hats while bare and up at its hat when it has one, and a bare one pats its head now and then. A loose hat scuttles. All of it runs on the attended clock and stops when the game rests.
- **Motion and sound on every touch.** A hat, a creature, the arch and the bare floor each answer when the finger lands, with a squash and a voice, and the lift plays the move. Sound is synthesized from numbers in `voices.ts`.
- **Weight, squash, and follow-through.** A hat squashes under the finger, turns over in the air and squashes on landing; what it lands on squashes too and springs back with that creature's own spring.
- **Kid-clear.** Three creatures, four hats and one arch, each with its own outline and colour, on a floor of a hue no piece uses; the hats lie on the lightest, plainest surface.
- **Wordless clarity for the declared age.** No word, letter, numeral or symbol anywhere on the kid side; `npm run wordless:check` passes. Everything essential is a tap.
- **Wordless guidance.** The idle ladder's glow is drawn as the takeable hats stirring. The ghost hand is not drawn yet.
- **60 fps on a mid-range iPad.** Not measured. Built for it: pixel ratio capped at 2, 14 draw calls, about 31,000 triangles, no shadow map, no post pass, geometry built once, the loop paused when unattended, four tiers.
- **Procedural or committed assets only.** Everything is built in code: no texture file, no font, no clip.
- **Its own art direction.** Foam play mats; the art guide is the part of `ART.md` under "The look".

### The learning claim

As the sheet has it after its first check, not yet passed: Hats for All is designed from three California preschool and transitional kindergarten learning foundations, which are foundations published by a state department and not standards, and from four records of guidance by the Dutch curriculum institute, which is guidance and not law. The pairing of one with one is taken from the Dutch record alone, and of the California foundation on dealing the game takes only one for each. Every record named was `confirmed` when the lookup was read on 2026-10-03; the states are to be read again on the day of the pull request. For a two-year-old in California the game rests on no record. Nothing here says what a child has reached. The records are named by pack id in `ART.md`, "The records".

### Defaults taken for the owner

- No symbol of any kind: the band starts below 6.
- No speech: every creature's voice is invented and synthesized, and no number word is spoken.
- No camera shake and no pause on impact: the answer to a touch is carried by chains of consequence, sound and squash.
- The look is the first row reserved for the game; no other row was spiked.
- From the sheet: sets of five or fewer; three kinds of hat; the cycle's change and the parade come by themselves once the crew has been left alone for two seconds; no harder option laid beside an easier one.

### What the next builder should know

- Write every sound as numbers with a range test before wiring it: the test caught a voice below its lowest pitch on a machine that cannot hear.
- Keep the motion as a pure module that returns numbers and let the view only draw them. The toy's seven tests press, tap and step it with no renderer.
- When the rules say which thing is nearest, give the rules and the view the same pure geometry (`stage.ts`), so what looks nearest is nearest.
- A fixed scene at load, with every seed fixed, is what lets a still be taken again.

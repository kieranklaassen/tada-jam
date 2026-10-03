<!-- template: cartridge/REFINEMENT.md v2 -->
# Refinement log

## Status

- Stage: sheet, waiting for its second check. The rules are written as pure modules with tests, at the builder's own risk, and stand on the sheet at commit `b0bcc0a42cf827c8e47177b1159725850c0e05a8`. No toy yet: it waits for the template version the canvas pilot proves.
- Look in use: first reserved look, glossy die-cut stickers. The spike is being built; this line is replaced when it is in.
- Sheet check, round 1 (checker: B): open, 16 findings, on the sheet part with hash `0659dc7f45ee29208c1d79cf31059c38e93c2e68155b656e5d1e3e359aa2e3b2` (commit `e24e096051c073276cc2920f61540190af7ec486`). All sixteen replacements are pasted as written, none refused, and nothing else in the sheet part was changed. The rules and their tests were brought into line in the commit after it.
- Open: sheet ready for check, round 2. The sheet as it now stands is at commit `b0bcc0a42cf827c8e47177b1159725850c0e05a8`; the hash of its sheet part is `55977cef6da87dafa04f895ade0ae94c2187597008f67cba6a9334e18b475b1e`.
- For the next checker, one reading the rules took where two pasted sentences meet: the carrier "is laid out ... whenever a patient comes in and no carrier stands there" (the designed order) and is "none when it was touched; laid out again as 'A harder option the child picks' says" (scene 4). The model leaves the carrier's place empty when its patient comes in, and lays the next one out when a patient next comes in from the door. If it should be filled at once, `comeIn` in `clinic.ts` is the one place.
- Open: the voices as plain numbers, the scenes as beat lists and the motion personalities are not written. They belong to the toy and the game, which this run does not cover.
- Requests to the lead: a registry row for the look in `docs/art-direction.md` once the owner has seen it. No frozen file needs a change.
- Answers handled: `docs/build/answers/boo-boo-vet-1.md`.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- `config.ts`: changed. `LADDER` holds the game's eight position ids and `FIRST_VISIT` three rows (ages 3, 4 and 5). The generated `FIRST_VISIT` builds its second row from the oldest age of the band; a game with more than two rows drops that and no longer uses `OLDEST`. Nothing wrong, **for the template** only as a remark: a comment could say the rows are free.
- `state.ts`: used as copied, and wrapped by `save.ts` as its header says. **For the template:** `finishCycle` and `beginCycle` spread their argument, so a wrapper that passes its own larger record gets all of its older fields back with the two that changed. `clinic.ts` therefore takes only `position` and `finished` from the result. A line in the header saying so would save the next game a wrong table.
- `state.ts`, same header: `finished` is true here from the moment the last need is met until the child brings the next one in, since the ending stays as long as the child likes. On load the wrapper sets it from the table (an animal that is well) and never from the stored flag, so the two cannot disagree.
- `manifest.ts`, `index.ts`, `audio.ts`, `input.ts`, `guidance.ts`, `scene.ts`, `overlay.ts` and their tests: as copied, not yet used.
- `perf.ts`, `quality.ts`, `attention.ts`, `saveCadence.ts`: frozen, untouched.
- `boo-boo-vet.tsx` (the Mount): see the entry under the look spike below, once it is in.
- The generator ran clean and the untouched copy passed its tests.

### For the owner to decide

- **The look.** Glossy die-cut stickers, to be seen at the toy checkpoint.
- **The claim rests on people records.** Every feelings record in the pack is about people, and no record says a need can be read in an animal. The sheet says so in its claim. Whether a game may be called "designed from" those records when its patients are animals is the checker's first question and, after that, his.
- **Speech.** The game would be better with a spoken feeling word that belongs to the animal and sounds when it is touched. The default says no game depends on on-device speech before the trial on his iPad, so the game has none and its animals have invented voices. If the trial goes well, this game is a place to use it.
- **The carrier.** The harder option the child can pick is a shut carrier beside the door, with a patient laid out one position further on. It stands there from the fifth position to the one before the last. It adds a second thing to touch at the door for the oldest children; if that is one thing too many, the game works without it.

## Pass log

No pass yet. One row per pass: what was looked at, the critique written as the child, the one themed fix set, what was reverted, the measured frame rate, and what is still weak.

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

So far the game is a design sheet, a look spike and its rules. No line of the bar is met yet by a playable game; each entry says what exists.

- **Alive at idle.** In the spike only: see the look spike entry. Nothing asks or beckons; the one who waits does not look at the child.
- **Motion and sound on every touch.** Not built. The grid in `grid.ts` gives each of the thirty cells a motion and a voice of its own by name, and a test holds that no two share one. The voices as numbers are not written.
- **Weight, squash and follow-through.** Not built. `cast.ts` holds a tempo, a weight and an overshoot for each animal, and a test holds that no two animals are close in all three.
- **Kid-clear.** The spike's layout is tested for targets of about 100 logical pixels, apart, with none in the bottom strip. At most five things on the cart and two needs in a patient, held by `ladder.test.ts`.
- **Wordless clarity for the declared age.** The band starts at 3: no word, letter, numeral or symbol, no `symbols.ts`. `npm run -s wordless:check` passes. A need is shown in the body and never by an icon.
- **Wordless guidance.** Designed in the sheet (a glow, then the ghost hand strokes the animal, never a tap on the thing that fits). Not built.
- **60 fps on a mid-range iPad.** Not measured. No frame rate has been taken on any machine; the lead takes the spike's on a real graphics card. No physical iPad has been measured.
- **Procedural or committed assets only.** Everything in the spike is drawn in canvas 2D at run time. No asset file, no web address. `node scripts/egress-check.ts` passes.
- **Its own art direction.** Glossy die-cut stickers, the first look reserved for the game. The art guide goes under `## The look` in `ART.md` when the owner has seen the spike.
- **Found as left.** `save.test.ts`: a long careless visit reads back exactly after every move, a load judges and replays nothing, and the largest legal room is under 2 KB.
- **The next patient waits for a touch.** `clinic.ts`: nothing comes in by itself; `comeIn` is called only for a touch on the one who waits or on the carrier.

### The learning claim

As the sheet has it after its first check (`ART.md`, "The claim"), read through the lookup on 2026-10-03, every record `confirmed` that day. To be read again on the day of the pull request.

Boo-Boo Vet is designed from three California preschool and transitional kindergarten learning foundations (`us-ca 1.3` and `us-ca 1.8` of Social and Emotional Development, and `us-ca 3.7` of Science), which are foundations published by the state's Department of Education and not standards; from two California content standards adopted by the State Board of Education (`us-ca K-LS1-1` and `us-ca K.7.2.M`); and from one statement of California's Transformative Social and Emotional Learning competencies (`us-ca 3.B.1`, cross-grade), which is voluntary guidance. It is also designed from six statements of the Dutch curriculum institute SLO, three bullets of its content cards for peuters, two bullets of its content cards for fase 1, and one of its goals per fase (`nl ojw/pdm/4/05/fase1`), all of which are guidance, not law, and say what can be offered, not what a child must know. All twelve records are confirmed in the pack.

What the `us-ca` records carry, and all the game is designed from in them: recognising how simple feelings show in another person (`us-ca 1.3`; `us-ca 3.B.1` for the cues of face and body, its naming of the feeling not being in the game); concern for what someone in distress needs and, at the later age only, comforting and helping (`us-ca 1.8`); kind ways of showing another that one cares (`us-ca K.7.2.M`, whose telling is not in the game); and that animals have to be looked after and that water helps them stay alive (`us-ca 3.7`; `us-ca K-LS1-1`, whose describing is not in the game). What the `nl` records carry, and all the game is designed from in them: reading the outward signs of simple feelings in someone else, one basic reaction to another's need, treating animals with care, and that animals need water. Under both headings the feelings records are about people, and none names a state of the body such as a sore paw, cold, an itch or thirst. That a need can be read in an animal from how it moves, the five signs, and the pairing of each sign with its care are the game's own design and rest on no record; of the five cares, only water is named by a record. The game makes no statement about what any child has learned or can do.

Two records were added to the ten the brief named, both for the one pair that a record carries (the one that droops and the bowl of water): `us-ca K-LS1-1` and `nl Groeien, bloeien en voortplanten / 1`. None was dropped. `us-ca 1.1.5.P` is named in the sheet as not used.

### Defaults taken for the owner

From the guide's list, all taken as written:

- No symbol of any kind (the band starts at 3), no letters, no written words.
- No reading on an object: nothing measures how well the child did. How well a patient is shows only in the animal.
- No camera shake and no impact pause. The response is carried by chains, sound and squash.
- No on-device speech: the animals have invented, synthesized voices and say no word.
- The look is the first row the lead reserved, and the owner sees it at the toy checkpoint.
- The demo's verb was changed and its fantasy kept: in the demo the problem was drawn on the animal (a thorn, mud) and the child matched a tool to it; here the need is in how the animal behaves, and the child reads it.

From the game's own sheet:

- While a need on the table is unmet, a touch on the one who waits or on the carrier brings nobody in: it is answered where the animal stands. This is the checker's reading in round 1, and the rules follow it.
- A cycle counts as gone well only when no care failed to fit and the patient carried what is new at the stored position; two or more that did not fit is gone badly.
- Six animals, five needs, five care things, and the tastes in `cast.ts`.
- The first visit starts at `bowl` for age 3 or no age, `blanket` for 4, `plaster` for 5 and older.

### What the next builder should know

- The education lookup prints a record's limits only in the record file it names. Reading "Summary" and "Limits" out of each file with one `awk` line took a minute for twelve records and was all the sheet needed.
- The feelings records are about people. A game about animals should say in its sheet, before the records, what no record carries; the brief's Notes said it and the sheet repeats it in the claim.
- A waiting customer is laid out before the cycle on the table is judged, and a new thing is shown before its need may come. Together they make every new need arrive three patients after the step up. `clinic.test.ts` plays this through to the top of the ladder, and that test found nothing only because the rule had been worked out on paper first: write the walk-through of patients P1, P2, P3 into the sheet before coding it.
- A position can only be left by a cycle that played what is new at it. Without that rule a child who is good at the first need climbs four steps without ever meeting the second.
- The wrapper pattern of `state.ts` works, with the caution under Template notes about what `finishCycle` returns.
- While another worker writes files in the same folder, commit by file name, never by folder.
- The first check found sixteen things, and eleven of them were places where two sentences of the sheet disagreed with each other or with a stored field: a count of cells, a thing that "lies where it was dropped" against a save that holds a few named spots, a scene filled from a list the save did not hold. Read the sheet once more for nothing but that before asking for the check: for every thing a sentence leaves in the world, name the field that holds it or say it is short-lived.
- The answer to a check comes as a file on the base branch. Pasting it by script, with an assertion on the first words of each line it replaces, took one pass and left nothing to compare by eye.

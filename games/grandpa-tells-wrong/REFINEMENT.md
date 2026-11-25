<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. The whole sheet is built.
- Look in use: Woven tapestry, the first choice. The art guide is under "The look" in `ART.md`.
- Sheet check: one round by a fresh reader, not passed, 17 findings. All were resolved in the sheet; no second round was run. The sheet was changed once more after the owner's report on the games before this one.
- Open: nobody has heard a sound of the game. They are tested as numbers.
- Open: measured on a machine without a graphics card; no iPad, no WebKit.
- Open: no child has played it and the owner has not seen it.
- Weak: a lamp is an indirect way to say "make it so"; what carries it is its glow and Grandpa's licked fingers.
- Weak: a goose that has been muddied on her neck can be taken for another kind of goose.

### Template notes

Used as copied except `config.ts`, the Mount, and `scene.ts` with its test and `state.test.ts`, which were removed: its scenes change nothing after they start, and its saved state is in `save.ts`, whose test holds the ladder too.

### For the owner to decide

The look and the toy, at the first play. Whether the protest of the wronged one should stay on at `order` and `any` as well.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | first stills of a whole day and night | his white moustache is lost on white; crossfading skies go muddy; the dark at the lamp turns skin brown; his arm covers the grandmother's face | a brown edge under the moustache; a sky is woven up instead of faded; the dark in indigo; his long arm goes low | not measured | puppets small |
| 2 | every coat on everyone, 844×390, portrait | puppets in the pictures have no readable faces; cream things vanish on a cream round; the moon's balloon is behind its hat | glove puppets: head and shoulders, larger; a dark round; the moon's string tied at its side | Chromium in software, production build, shared probe, pixel ratio 2, tier 0: 60 fps, worst second 60, CPU p95 5 ms | the loop has many steps for a first visit |
| 3 | the owner's report that a child of 4 does not see the loops of the games before this one | three things to remember before anything is told; Grandpa waits to be asked; nothing says a picture is wrong; what to do next glows late and in two places | a first day of one thing and one picture; he tells by himself; the wronged one protests; the ladder has a head start and shows one want; the ghost hand carries the thing; the whole night sky wakes the cock | not measured again: no cost was added per frame | as in Status |
| 4 | cold playtest proxy: a fresh reader with nineteen stills and nothing else. They named put it on somebody, splat, night, morning; not that he told it wrong, nor that the picture made it so | the muddied grandmother in a picture is a bear; nothing ties a picture to the pig; lamp and splat are not one; the weft band reads as water; the mud is a cake; rings all at once; Grandpa stays muddy without noticing | a puppet's coat stops above the face; a bubble with what it really was, and the falsely told shakes their head; each picture flies to whoever it is of; his puppet pulls the weft; a pail that drips; one ring at a time; the thing hangs above the finger; he finds himself muddy in the morning | not measured again | no second cold run |
| 5 | code review by a fresh reader: 15 findings | a smeared tap did nothing on the pieces; his hand never reached the wick; the sky cut on the second day; a night save opened on a pink frame; a worn balloon blew up again for every splash; the slits were off-dye; a lie about himself never curled his moustache; a second throw vanished; smaller ones | all fixed, with tests for the touches, except one: a voice already sounding when a beat of the lamp is skipped rings out over the next | see Status | as in Status |
| 6 | slow machine, shared probe | 42 fps at 4x throttle in the last tier | the cloth is woven every second frame in the last tier | Chromium in software, production build, 4x throttle, adaptive, tier 3: 58 fps of display, worst second 50, the picture moving at about 29 | iPad and WebKit not measured |
| 7 | the rule main gained from the owner's report: show the loop, and not only the first move | the hand shows a gesture and leaves out what comes of it; nobody asks for anything; six rings | an opening round played for real; whoever asks thinks of one thing; one ring, at 1.5 s, and the hand at 3.5 s shows that same step | no cost added per frame | not seen by a child |

## For the pull request

### How the game meets the quality bar

- Alive at idle: everyone breathes, blinks and looks in their own tempo; Grandpa's puppet mutters in his sleep.
- Motion and sound on every touch, in the frame of the touch.
- Weight and follow-through: tips, splashes, squash and thirty answers, one for each of five to each of six things.
- Clear tappables: large flat masses, every hit target over 100 units.
- Wordless: no text, numeral or sign. An opening round, one wish, glow at 1.5 s, ghost hand at 3.5 s, sooner after a scene.
- Frame rate: passes 2 and 6. No canvas is made from frame to frame (`view.test.ts`); the read-back of the beads and the figures' gradients are. No iPad and no WebKit measured.
- Nothing passes through anything: everyone has a place of their own, held by `layout.ts`; Grandpa's long arm goes in front of everyone on purpose.
- Procedural only.

### The learning claim

As in `ART.md`: designed from a part of a California preschool foundation (3.2) and of Dutch curriculum-institute guidance for fase 1, all four confirmed. It needs no speech.

### Defaults taken for the owner

First days of one happening; a protest at the early tellings and none where the order is the joke.

### What the next builder should know

Judge the loop of a first visit with one of everything before building three. A picture drawn at bead size and looked up in a table costs about 60,000 beads a frame and runs at 60 fps without a graphics card.

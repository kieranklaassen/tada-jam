<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: dry-wipe whiteboard and magnets, the first choice.
- Sheet check, round 1: not passed, 12 findings (band wording, a silent cell, a swaying hidden monster, what three scenes store, lanes and limits in the records). All applied, with three cells the builder corrected beside them. Round 2, by the same checker and so no pass: one finding, applied. Then the sheet changed with the game (the first kind of round in view, seen-first rounds, the curtain drawn aside) and went to a fresh checker, round 3: not passed, 8 findings on consistency, what is stored and how records are cited. All applied verbatim. Not checked again after that.

### Template notes

- `state.ts`, `scene.ts` and `input.ts`: deleted. Fingers go to `play.ts` by their ids, since two children may each have some down; the world and its save are in `save.ts`.
- `config.ts`: the order, where a first visit starts, one press for the ghost hand, and how many marker lines a tier draws.
- `monster-telephone.tsx`: Half a Horse's Mount, which is the template's with fingers by id.
- The rest as copied. The four frozen files are unchanged.

### For the owner to decide

- The curtain is not enforced: a child who looks can look. A harder separation would need two devices.
- The first kind of round (in view) is a matching game with no telling in it. It is there because a young child has to see what "make the same" means before it is hidden.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | Rest, a held curtain, building, a meeting, at 1180 by 820 | The look works at once: ink is ink and plastic is plastic. The ostrich stands behind the curtain and loses half her face; the mole is cut by the edge; the rolled curtain hides a tall one's head; the lumpy sack has no lumps; the two overlap when they lean | Ostrich before the curtain, her head in round its edge to peek with a lump in the cloth; mole moved in; the roll thinner and higher; lumps; the two lean only as far as there is room | not measured | |
| 2 | The mime, wearing, finale, next one | The ostrich comes up through the magnets while the two still lean | She waits until the last half second; rings follow a leaning place | not measured | |
| 3 | The loop, judged as a child of four who cannot read (the owner said of earlier games that the loop was not clear to a child) | Nothing says what to do first: a shut curtain, a bare ball and seven magnets. The cord that ends a round is small and at the edge. What a twin is is never shown | A first kind of round with both in view and pen outlines where the parts go, met by the last part; early new ones jump out and are looked at before the curtain; a curtain that can be drawn aside by hand; the knob bobs when the twin has enough parts; the ghost hand carries the magnet it shows; sacks hop until one is carried | 58.2 fps, see below | |

## For the pull request

### How the game meets the quality bar

- Alive at idle: breathing and blinking, the ostrich's neck and gaze, the mole's free hand, a toe under the curtain, sacks that hop.
- Motion and sound on every touch: every place has an answer and a voice of its own when the finger lands (`play.test.ts`); no two voices are the same (`voices.test.ts`).
- Weight, squash, follow-through: magnets hang and swing, bodies wobble like jelly, the parts on it ring, the curtain drops and sways.
- Silhouettes and tappables: seven outlines told apart by their edge; targets 88 units and more; a tap for every essential act but the two that end something.
- Wordless: no word, numeral or symbol; passes `wordless:check`.
- Idle guidance: outlines and stirring magnets in the first kind of round; the ladder; one first showing by the ostrich.
- 60 fps: 58.2 fps over 42 s of the shared probe, production build, headless Chromium with software rendering (no GPU), no throttle, tiers on automatic, ending at tier 2 (pixel ratio 1.25). DRAWS No blur, shadow or filter; one full composite. **WebKit and a physical iPad were not measured.**
- Nothing passes through anything: 2D, so `layout.test.ts` in place of the intersection audit.
- Assets: all drawn and sounded in code.

### The learning claim

As in `ART.md`, "The claim". Every record was `confirmed` when it was looked up on 2026-11-24. No child has tried the game.

### Defaults taken for the owner

The look is the first reserved one. A child of five and younger, or of no known age, starts in view.

### What the next builder should know

- A hidden thing is no first scene. Show the whole round once in the open, then hide one piece of it.
- Motion read from "when did this last happen" needs no springs and nothing to save, and a test of the rules needs no view.

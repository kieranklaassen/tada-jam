<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: Foil sweet wrappers (reserved first); String and pins is the backup.
- Sheet: round 1 by a fresh reader, nine findings with exact replacements, all pasted (round 2 passed from the diff). Then the owner said of the jam's newest games that a four-year-old does not see their loop, so the jumper became the row itself, with no step between, and the sheet was rewritten for that: round 3 by a second fresh reader, one finding, pasted word for word; round 4 passed from the diff (a paste only). sha256 of the sheet part: `648bd44a1fc97cf9aa13e58d531e5fdbcc357bbd21f992b8d51ee7ba4c34f774`.
- Open: nothing.

The stages in order are sheet, toy, game, gates. Keep this block current: the stage reached, the look in use, and what is open (the sheet's check, requests to the lead, findings not yet fixed). Ask for the sheet's check by writing `Open: sheet ready for check, round N` here; when it passes, record the round and the commit it judged. Someone with no session to read resumes from this block and the files. The two parts below belong to the block.

### Template notes

- Used as copied: the frozen files, `audio.ts`, `input.ts`, `stage.ts`, `guidance.ts`, `overlay.ts`, `state.ts`.
- `config.ts`: `TAP_PRESSES` is 1, because a second tap on the door would end the coming of the next one. The constant that read the band went with it.
- `scene.ts` and `rng.ts` were removed: the scenes live in `play.ts`, and nothing here is drawn by chance.

### For the owner to decide

- Whether a child sees the loop. Nobody but model readers has played it.
- The sound has not been heard by anyone; it was checked as notes.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | Rest, all five customers | Chilled skin came out black; the scissors read as a numeral; the customer at the door showed below the half door | Colours mixed as hex, scissors redrawn, door clipped | not measured | |
| 2 | The loop, after the owner said that a four-year-old does not see the loops of the newest games | A row was laid, then a magpie made the jumper, then it was worn: three places to look at | The row is the jumper: each piece laid leaps up as a ring at once; a short row is a bare blue tail. Sheet rewritten and checked again | not measured | |
| 3 | Cold playtest proxy, screenshots only, no source read | Understood laying and closing up. Not clear: that it is finished and what comes next; that bare means cold; what a full strip does. Snail's rings hidden by its house | Finish: hop, pink cheeks, a knock and a ring round the one at the door. Cold: shakes, snowflakes, icicles, breath from the first frame. Full strip: the piece bounces home. House raised. A drop across an edge goes beside it | at most 79 draws a frame, counted over 85,056 frames | the mouse's card is easy to miss |
| 4 | Independent code review, 27 findings, most reproduced by running the rules | A stroke and then a press elsewhere pulled the whole jumper off; a finger bounce sent the customer away; a double tap ended the arrival; a showing was marked and never shown; a wobbly tap laid nothing; heaps burst when shoved; customers shared one gait; a guest let go wrongly vanished to the door | Every fault fixed, six with tests that play them | 59.1 fps, see below | |

## For the pull request

Written as the game is built and kept at the end of this file: the pull request is made from it.

### How the game meets the quality bar

- Alive at idle: breathing, blinking, shivering, snow, whoever was dressed last outside the window, eyes that go to what is wanted.
- Motion and sound on every touch: every place answers when the finger lands, in a voice of its own.
- Weight, squash, follow-through: pieces hop and skid by kind, shove one another, rings swell and settle, fifteen different ways to take a piece.
- Silhouettes and tappables: five animals in five metals, three pieces in three colours; targets about 100 units, and taps alone can do everything that matters.
- Wordless: no word, letter, numeral or sign; passes `wordless:check`. No speech and no microphone.
- Idle guidance: a glow, then a ghost hand that lays one piece and shows its ring. It never shows the whole answer.
- 60 fps: 59.1 fps over 27 s of the shared probe, production build, headless Chromium with software rendering (no GPU), no throttle, tiers on automatic, ending at tier 1 (pixel ratio 1.5), worst second 46; Half a Horse on the same machine the same hour gave 57.4, ending at tier 2. At tier 0 with a sixfold throttle the same software renderer gives 6.3 (Half a Horse 4.2), which says nothing about a tablet. At most 79 draws a frame, counted; no blur, shadow or filter; one full composite. **WebKit and a physical iPad were not measured.**
- Nothing passes through anything: a 2D game, so there is no intersection audit; the row is held by model tests (shoving, closing up, heaps, the strip's ends).
- Found as left: the position is saved before the arrival plays; a piece in the hand is saved where it came from; nothing replays on load.
- Assets: all drawn in code.

### The learning claim

A Jumper for the Crocodile is designed from two California preschool and transitional kindergarten learning foundations, published by a state department, in part (measuring length by laying real objects one after another, a later-age foundation, without the telling of a number; and comparing two things by length, by looking), and from two goals of guidance by the Dutch curriculum institute for fase 1, in part (measuring with informal measures, and thinking about length in situations that make it matter, both by doing and never by telling); all four records are confirmed.

### Defaults taken for the owner

- The look is the first reserved one.
- The finished jumper needs only a covered tail: holes and bulges are funny and are never refused.
- The next one comes only at the child's touch.

### What the next builder should know

- Put the consequence on the thing itself, at once. The first design had the same parts with one step between laying and wearing, and that step was what a small child would lose.
- Measure a drag from where that drag began. A field that remembers the last landing is overwritten by the next finger while the first drag is still being ended.
- Decide near or far by the farthest point of a drag, not by its end, or a piece carried out and brought home counts as a tap.
- Notes put into the future outlive the scene they belong to. Say them when the scene gets there.

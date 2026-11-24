<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: Silk painting with gutta (the first row reserved). The second was not tried.
- Sheet: round 1 by a fresh reader came back with 10 findings, every replacement pasted word for word. One sentence was added afterwards, in pass 2: guests taken up with each other in a scene are out of reach until it ends.
- The owner has not seen the game. No physical iPad was measured, nobody has listened to the sounds, and no two children have shared it.
- Reader: the first reading came back NOT READY; every finding was built or its sentence in the sheet changed (targets at least 10 apart; a thing flies to the hand; hair and lips come clean as the bell rings; a stiff guest's face is still). A second reading was not made.
- Requests to the lead: none. Section 4 of `docs/art-direction.md` is as it was found.

### Template notes

- `input.ts` and `scene.ts` were replaced: this game takes one working finger on each half of the surface, so two children can play. The template's forgiving rules (lift and carry on, cancel takes back, extra fingers, a resting finger gives way) are kept on each half in `party.ts` and held by `play.test.ts`.
- `stage.ts` holds the point type. The four frozen files are as copied.
- **For the template:** a throttled save has no trailing edge of its own, so a change inside the window waits for the next change or for put-away. Every change here is a whole one, so each is saved at once.

### For the owner to decide

- The look and the toy, seen on a real iPad.
- The first wait of the copy: 0.45 s with no age. The pendulum changes it.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | Idle and a pour, 1180×820 | The sofa's middle is empty. The dog has no ears. The pot straightens while I still hold it. Hills stick out of the window. | A quilted sofa and a sleeping cat; ears; the thing stays tipped over a guest; garden clipped; dye made wide enough for off-centre shapes; larger flowers | not measured | Scenes unseen |
| 2 | Every gesture, five scenes, the idle guide, a phone held sideways | In the bubble scene the walrus lost his bubble: the copy hit whoever sat there by then. | Nothing reaches guests in a scene of two; what the seats show changes over with them | not measured | 772 draws a frame |
| 3 | Counted draws, production build | Too dear to draw. | Painted parts kept as pictures; the room painted at the surface's size; pictures that are only moved are copied pixel for pixel; the satin band halved | Software Chromium, production build: 26 fps at ratio 2 before, 38 after; 57 (worst second 46) with adaptive quality | Ratio 2 without a graphics card |
| 4 | Three cold runs of 45 random taps and drags each, production build | The table things ran into each other; gale curls crossed in one point. | Table things at 0.86; curls start apart; every change saved at once | 29 fps at four times slower, with adaptive quality | No child has played it |

| 5 | A fresh reader of the folder, a bug review and a simplify review, then stills | Two children each carrying a thing lost one; a drag through the place above never dabbed; lifting two fingers made a copy; every guest shared its moods; the window hid the wants; lone rings | About forty points: a carry for each half, a held-back act comes when the last is over, two hands led at once are not copied, the beat of a copy is fixed when it starts; each guest's own answers, the walrus's sip, hair on end, a second bubble, a feather on the nose; window guests whole; the clink at the meeting; hands rub with the handkerchiefs; rings in three pieces; tests for each | as pass 4; not measured again | `view.ts` still paints the small props itself |

### Cold playtest proxy

Three runs, each a fresh slot and 45 random taps or drags over the whole surface. Each changed a guest or a thing within 5 to 13 actions with no guide; each ended with two or more coats, hair in a new state, and other guests and things in place; no errors. A random finger is not a child.

## For the pull request

### How the game meets the quality bar

- Alive at idle: breathing, blinking, a ship, a chick, a pendulum, a sleeping cat, asking guests.
- Motion and sound on every touch: the thing squeaks and the hand starts in the frame of the touch; an extra finger gets a ring.
- Weight and follow-through: sprung hands and things, jolts by body, hair that lags.
- Silhouettes and tappables: two unlike aunts, four unlike guests, targets of at least 100 units, held by `layout.test.ts`.
- Wordless: no text, numeral or sign; the glow and the ghost hand show moves, never answers.
- Frame rate: see the pass log. Chromium drawing in software, production build, shared probe pointed at that Chromium. WebKit and a physical iPad were not measured. 60 draws in a frame at rest; about 200 at the median with both aunts at work, held by `view.test.ts`. A frame in which several pictures are first painted is dearer.
- Procedural only, drawn and synthesised.

### The learning claim

The game has no learning goal and claims no school skill.

### Defaults taken for the owner

- The table bell is there only when there is something to tidy.
- A first visit is tea for the walrus and glue for the dog.

### What the next builder should know

- Without a graphics card the cost of canvas 2D was the smoothing of turned and scaled pictures, not the number of draws. A picture that is only moved can skip it.

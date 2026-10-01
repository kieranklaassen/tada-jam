# Building an arcade-round prototype

The arcade round is the lab's second round. A prototype here is judged by a person playing it on an iPad, so it has to feel good in the hand within ten seconds. There is no pure sim, no persona panel and no contract suite: one folder, one exported `proto`.

Read `RESEARCH.md` (why this round exists and the checklist), your section of `BRIEFS.md`, `kit/types.ts`, and `kit/example/index.ts` (a complete small prototype that uses the kit the intended way). Skim `kit/fx.ts`, `kit/sfx.ts`, `kit/draw.ts` and `kit/math.ts` for what is available; the interfaces at the top of each are the API.

## The contract

`lab/arcade/protos/<key>/index.ts` exports:

```ts
export const proto: Proto = { meta, create }   // Proto, ProtoMeta, Game, Stage, Pointer from '../../kit/types.ts'
```

- `create(stage)` returns a `Game`: `update(dt)`, `draw(g)`, and optional `down(p)`, `move(p)`, `up(p)`, `dispose()`.
- The field is 1180 by 820 logical pixels, landscape. The stage scales it to fit.
- `stage.fx` (burst, confetti, ring, text, shake, flash, hitstop), `stage.sfx` (pop, boing, coin, ding, thud, whoosh, splat, chomp, zap, crunch, nope, win, fanfare, note, tone, noise), `stage.after`, `stage.tween`, `stage.rand`, `stage.time`, `stage.pointers`, `stage.restart`.
- The stage draws fx on top of your `draw`, applies the shake, unlocks audio on the first touch and pauses when the tab is hidden.
- More `.ts` files in your folder are fine. `matter-js` is available (`import Matter from 'matter-js'`) when you need real rigid bodies; write your own simple physics when circles and gravity are enough.

## Rules for the code

- Own only `lab/arcade/protos/<key>/`. Do not edit the kit, the shell, another prototype, or anything outside your folder. If the kit is missing something, write it in your folder and say so in your report.
- TypeScript is strict here: no unused locals or parameters, `import type` for types, explicit `.ts` on relative imports, no `enum` and no constructor parameter properties (erasable syntax only).
- Nothing at module top level may touch `document`, `window` or `AudioContext` (the module is also imported in Node). Create things inside `create`.
- No network, no image or audio files. Draw with canvas; use `sprite(g, '🍉', ...)` for recognisable things and `eyes`/`face` plus shapes for characters that must squash and react.
- `Math.random` is fine. Use `stage.rand()` when a restart should lay the world out differently but repeatably.
- Keep it fast: mean frame cost under 4 ms in the shot tool. Cache anything expensive to an offscreen canvas made inside `create`.

## Rules for the play

These are the research checklist turned into requirements. A prototype that misses them is not done.

1. **Something delightful within one second of the first touch**, wherever the child touches. Respond on `down`, not `up`.
2. **Every touch makes sound and motion.** No dead touches anywhere on the field: an empty spot still gives a ring, a puff, a look from a character.
3. **Alive before it is touched.** Things bob, blink, breathe, look at the finger.
4. **Readable without words.** A four-year-old cannot read; a ten-year-old will not. Show what to do with the scene itself and an idle hint (`hint()` in `draw.ts`) after about five seconds without a touch. Words are allowed for flavour ("YUM!", a score), never for instructions.
5. **No dead ends and no waiting.** No title screen, no "tap to start", no game-over screen. The game is playing when it appears. If the child can fail, the retry is automatic and takes under a second, with a funny failure rather than a sad one.
6. **Weight.** Squash on landing, stretch in flight, overshoot on anything that appears (`ease.outBack`), anticipation before a big move, hit-stop and shake on big impacts only. Nothing moves linearly and nothing stops dead.
7. **Escalation.** The first 20 seconds teach the verb; then something new arrives every 30 to 60 seconds (a new item, a twist, a bigger payoff), so minute three is not minute one. Celebrate milestones loudly (confetti, fanfare) and keep going.
8. **Sized for the age in your brief.** Under six: targets about 100 pixels, drags that forgive a lifted finger, no timing demands, no fail state. Six and up: mastery, a number that goes up, a rare thing to hope for, something a little cheeky.
9. **Tap and drag only.** One finger must be enough. Nothing important in the bottom 50 pixels.
10. **It looks like the thing.** A recognisable scene with a backdrop, characters with faces, and colour. Not shapes on a blank page.

## The loop you work in

A dev server is already running on port 4175. Do not start another server, do not run `lab:build` or `lab:serve`, and do not run git commands that change anything.

1. Write the prototype.
2. Typecheck, reading only your own folder's errors (other builders are mid-edit in theirs):
   `npx tsc --noEmit -p lab/tsconfig.json 2>&1 | grep "arcade/protos/<key>/"`
3. Play it headlessly and look at it:
   `node lab/arcade/shot.mjs <key>` runs a generic mash and saves PNGs under `lab/arcade/shots/<key>/`. Read them with the Read tool.
   Write your own action script to reach the moments that matter (`--actions-file`; the header of `shot.mjs` lists the actions, coordinates are the game's own). Put the script in your scratch space or `lab/arcade/shots/<key>/`, not in your prototype folder.
4. Critique what you see as the child and as the owner: is the first frame inviting? Is it obvious what to touch? Did the touch land? Is anything tiny, overlapping, cut off, or dull? Fix one set of things, shoot again.
5. Do at least three such passes. The summary must show no thrown errors and no console errors.

You cannot hear it, so reason about the sound: every event has a cue, streaks climb with `step`, and nothing plays every frame.

## When you are done

Leave `index.ts` (and any helper files) in your folder, passing typecheck and the shot tool. Reply with under 150 words: what the child does, the best moment, what you cut, and what is still weak. Be plain about weaknesses; the owner rates these and a known flaw is more useful than a hidden one.

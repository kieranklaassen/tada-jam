<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates. Sheet checked in one round by a fresh reader (8 findings). Six were pasted; two were changed in the pasting: the slack between places is left out, since the places alone decide what lies where, and the first place is the moose's nose instead of an antler. No second round was read.
- Look in use: first reserved choice.
- Open: no child, no iPad and no graphics card has run it, and the sounds have not been heard. Extra fingers and a resting palm are handled as the template handles them: a palm that lands first keeps the game.

### Template notes

`guidance.ts`: glow at 1.5 s and a move at 3 s, for a four-year-old. `input.ts`, `audio.ts`, `stage.ts`, `rng.ts`, `overlay.ts`: as copied. `state.ts` and `scene.ts` are not used; `save.ts` is the game's own.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame rate | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | First frame, a pull, the light | The boot was already out; the bulb got lost on a yellow muzzle; the snow looked scribbled | Boot jammed at the rim, white muzzle, round snow, cut-out moon | none taken | |
| 2 | Tap-only play to the last place | The string crossed the moose's face and lay over the switch | Places taken round the picture; the switch drawn over the string | none taken | The fullest string is a busy picture, made by the child |
| 3 | Review by a fresh reader, 12 findings with failing plays | A stopped wind-up stored wrongly; one loop hung two places; low branches wound all up; dog cells from the wrong part; a switch that never stopped rocking | All fixed with tests but the palm | 46 fps at rest and 28 fps with everything lit | |
| 4 | Cold run of 11 s without a touch, production build | The round reads: pull, hang, press. After it the switch is the one thing that asks | none | Headless Chromium, no graphics card, DPR 2, unthrottled: as above. Two earlier games on the same machine at rest: 54 and 36 fps | A real iPad |

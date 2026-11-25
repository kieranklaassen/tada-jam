<!-- template: cartridge/REFINEMENT.md v3 -->
# Refinement log

## Status

- Stage: gates.
- Look in use: Gingerbread and piped icing, the first of two set aside. The backup was not spiked.
- The sheet: two rounds by two readers who did not write it (nine findings, then five). Not formally passed: round 2's replacements were pasted as given, then the playtest changed two sentences (when a full ball hops, what starts the walk) and nobody has read those again. sha256 of `ART.md` above the line `## The look`: `aeaf3af7c75b77a626f6611040f9f43e7318caa0e40320cd44c86373cd3186bb`.
- Open: nobody has heard the sounds, held it on an iPad, or seen a child play it.

### Template notes

- `config.ts`: the designed order removed. `scene.ts` and `input.ts` removed; `world.ts` and `play.ts` take their place. `state.ts` rewritten. `guidance.ts`: glow at 1.5 s and hand at 3 s, since the last games were found slow to show what to do. The four frozen files are untouched.

### For the owner to decide

- The look and the toy, by playing it.
- Whether a whole snowman should wait for a touch before he walks (he does now) or set off by himself.

## Pass log

| Pass | Looked at | Critique | Fix set | Frame cost | Still weak |
| --- | --- | --- | --- | --- | --- |
| 1 | First scene, one roll, hop, walk, flop, at 1180 by 820 | "His head goes out of the top. His mitten is on his eye. The thumb is a ring. The glow is a big orange fog. The sky is empty." | Balls smaller, acts capped, arm pats beside the eyes, thumb filled, glow thinner, garland of sweets | under 150 stamps, tested | Things crowd a small ball |
| 2 | Tap-only play and three-ball rounds | "The ball was full after one roll and jumped away." | Less growth per cell; things pressed in smaller and further apart; the ball stops without sliding on | as above | Tapping things |
| 3 | Code review by the second reader | Nine bugs: a tap on a thing missed it, a ball ground in place before him, a held finger built all three balls, a rolling ball was not saved, a full ball hopped on load, and four to see | All nine fixed, each of the first six with a test | as above | See 4 |
| 4 | Cold playtest by someone who had read nothing, on the build before pass 3, 1180 by 820, 1024 by 600, portrait | Outer loop clear by itself. "Tapping the cat does nothing. The ball jumps on before I am done. The dance starts when I tap the wheel. I never saw him whole. The little show is tiny. White ball on white snow." | Taps roll to the thing; wider reach in depth; a full ball waits longer; only he starts the walk and not for the first moment; robin's show a third larger; snow a shade darker and balls outlined; grin piped in white | 40 stamps at most in the probe | Crowded faces stay funny and not tidy; three balls are learned by doing. The playtest was not repeated on the fixes |

## For the pull request

### How the game meets the quality bar

- **Alive at idle**: arms pat, eyes follow, cat breathes, goose stretches, robin, smoke, drifting icing.
- **Motion and sound on every touch**: snow, each thing, man, robin, house, trees and sky each answer in their own way; 24 acts, all different to see and to hear (tested).
- **Weight**: ball slows as it grows, squash on press, stick and landing, spring arms.
- **Silhouettes**: brown outlined biscuits on white; targets about 100 units; the bottom strip is the slab's edge.
- **Wordless clarity at three**: the arms pat where the next ball goes; the robin shows a whole round in miniature; no word, numeral or sign.
- **Guidance**: glow 1.5 s, hand 3 s, four showings.
- **60 fps**: no physical iPad and no graphics card here. Shared probe, production build, Chrome, 6x throttle, DPR 2, tier 0, software renderer: p95 frame work 7.6 ms, at most 40 stamps. The frame rate there (6) is the software renderer and says nothing about a tablet. WebKit was not measured
- **Assets**: all drawn by code.

### The learning claim

None.

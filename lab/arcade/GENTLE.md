# The gentle set

## Why it exists

The owner played the first 30 arcade prototypes and said: "these are really fun, but also addictive. They should be for children and rooted in some Montessori and Waldorf as well. Make more around those. Imaginary."

His ratings said the same thing in a different way. Marked "Build it": the pizza kitchen (five stars), the vet, the fire truck, the truck wash, the hair salon, balloon popping, fruit slicing, the claw machine, the campfire. Marked "No": the peg shooter, the slingshot, whack-a-mole, the stacking tower, the monster feeder. What he kept is real-life making and caring. What he dropped is abstract skill at speed.

The first 30 got their pull partly from borrowed hooks: scores, coins, shops, upgrades, rare drops, streaks, rounds that speed up, a fanfare every few seconds. The gentle set keeps what was good (every touch answers, the scene is alive, things have weight, it is beautiful) and takes those hooks out. It draws its activities from Montessori practical life and sensorial work and from Waldorf handwork, rhythm and imaginative play.

This is also closer to where a winner has to end up: the jam's own rules forbid engagement mechanics, so a gentle prototype has less to strip out before it becomes a cartridge.

## What replaces the arcade rules

`BUILD.md` still gives the contract, the code rules, and the look-critique-fix loop. Its "rules for the play" are replaced by these for the gentle set.

1. **Real work, or real pretend.** The activity is one a child knows from life or from play, with its real steps in their real order. No invented mechanic.
2. **The hand does the work.** Pour by tilting, knead by pushing, wring, peg, cut, brush, button, arrange. One difficulty at a time, and the difficulty is in the movement, not in speed or memory.
3. **Child-paced.** Nothing happens until the child does it. No timer, no countdown, nothing that speeds up, nothing that burns, expires or is lost by waiting or by putting it down. Stillness is allowed. No character pleads, hurries, praises, or reacts to being left.
4. **The material shows the mistake.** Spilled tea is on the cloth and can be wiped; a stem too long tips its head. No buzzer, no cross, no "try again", and equally no "great job": no praise words, stars, ticks or cheering.
5. **No outside rewards.** No score, coins, shop, upgrades, unlocks, levels, streaks, combo counters, collections with a tally, rare or random prizes, or anything dangled for later.
6. **A whole cycle with an ending.** A beginning, a middle, and a completion that is its own reward (the bread is shared, the washing sways on the line, Teddy sleeps). Then rest: a quiet finished scene that stays as long as the child likes. Beginning again is the child's choice, made by an obvious wordless act in the scene (the empty bowl, opening the curtains), never an automatic next round. Materials are finite and visibly used up (the jug empties, the basket empties), and where it fits there is a put-away step (the cloth back on its hook). Doing it again is the same activity, not a harder level: next time differs only because the child chooses differently or the season has turned. Open-ended pretend prototypes have no ending; they have a calm way to tidy up.
7. **Quiet feedback.** Every touch still answers in the same frame with sound and motion. The sound is the sound of the thing: water, wood, cloth, a spoon in a bowl, a soft pentatonic chime. Motion has weight and spring. Particles are small and belong to the material (flour dust, drops, petals). Do not use `fx.shake`, `fx.hitstop`, `fx.confetti`, `fx.flash`, `fx.text`, `sfx.fanfare`, `sfx.win`, `sfx.coin`, `sfx.zap` or `sfx.nope`. Keep volumes low and leave gaps of quiet.
8. **No words or numbers at all.** Nothing to read anywhere on the field.
9. **Beautiful, natural, hand-made.** Wood, wool, linen, clay, paper, beeswax, water. Soft daylight, a limited warm palette, visible grain and texture, hand-drawn shapes with slightly irregular edges. Draw everything with canvas; do not use emoji sprites (`sprite()`), which look like stickers. Faces are simple and gentle: two eyes and a small mouth, calm by default.
10. **Open where it is pretend.** No right arrangement, no target picture. What the child makes stays as they made it.
11. **Alive, slowly.** Light moves, leaves stir, a cat breathes, steam curls. Idle life is slow and never demands attention. The idle hint, if one is needed, is the material itself inviting (a jug that glints, a drawer ajar), not a pointing hand.
12. **Still a delight.** Calm is not dull. A four-year-old should smile in the first ten seconds because the dough squashes or the tea pours. If the verb is not a pleasure in the hand, no amount of calm saves it.

## Fantasy building

After the first gentle prototypes the owner asked for more that are "calm and building games, and really fantasy", leaning into Waldorf. The eight under "Fantasy building" in `GENTLE-BRIEFS.md` follow every rule above, with these additions.

- **Building is the verb.** The child makes something out of simple natural pieces. Pieces rest where they are put: no toppling, no physics that punishes, no right design, nothing counted.
- **The world answers what was built.** The payoff is that someone comes to live in it, or it comes alive, using exactly what the child made, in the shape they made it. This is Waldorf's picture of play: the plain block becomes the tower because the child imagined it.
- **Breathing rhythm.** Day is for making; the child draws the evening down when ready; dusk is the living picture, and it stays; morning comes when the child raises the sun. Nothing happens on a clock.
- **Fairy-tale folk, not characters.** Gnomes, water sprites, wind children, King Winter: small, simple, kindly, a little shy, with barely-drawn faces. They never ask for anything, never thank or praise the child, and are never sad if nothing is built.
- **Picture-book look.** Soft watercolour washes with bleeding edges, warm earth and plant-dye colours, lantern light at dusk, in the manner of old Waldorf picture books. Nothing glossy, outlined in black, or cartoon-cute.

## Looks

The owner then asked for "different kinds of looks in there too: 3D, 2D, gritty, kiddy, three.js, painted, aquarelle, crayon, cosy, mega arcade, all of it". So each prototype from the fantasy-building group onward is given its own look, and no two share one. Where a look below disagrees with rule 9 or with "picture-book look" above (bold outlines, neon, grit), the assigned look wins. Every rule about behaviour still holds: calm, child-paced, no rewards, no words.

| Prototype | Look |
|---|---|
| `advent-market` | Cosy gouache by candlelight: warm, matte, soft-edged, lit from many small flames. |
| `block-castle` | Real 3D with three.js: a sunlit toy room, solid wooden blocks with grain and soft shading, a fixed three-quarter camera. The castle it becomes is 3D too. |
| `sand-kingdom` | Real 3D with three.js: a beach as a sculpted height field under a low sun, with a water surface that rises. |
| `tiny-island` | Real 3D with three.js: a low-poly wooden-toy diorama on a turntable, soft pastels, warm rim light. |
| `bark-boats` | Aquarelle: loose wet watercolour on rough paper, pigment pooling at the edges, pencil under-drawing showing through. |
| `leaf-creatures` | Wax crayon: block and stick crayons on toothy paper, visible strokes, leaf rubbings. |
| `treetop-village` | Cut paper: a layered shadow box of coloured paper with soft drop shadows and a little parallax, lit from inside at dusk. |
| `wool-picture` | Needle-felt: carded wool with visible fibres and no hard edges. |
| `ice-palace` | Gritty print: linocut or risograph, three or four inks (night blue, ice white, gold, one red), rough ink texture, grain, slightly off-register. |
| `mushroom-village` | Kiddy: as if drawn by a happy five-year-old with felt-tips and poster paint. Wobbly bold lines, bright flat colour that misses the edges, big simple shapes. |
| `glow-pegs` | Mega arcade: neon on black, bloom, a chrome cabinet bezel, a faint scan-line shimmer. Loud to look at, calm to play. |
| `chalk-town` | Gritty: chalk on real asphalt. Tar texture, cracks, weeds, chalk dust, worn chalk ends. |
| `box-fort` | Cardboard craft: corrugated edges, kraft paper, torn tape, marker scribble, fairy lights. |

**Building a 3D look.** `three` is installed (`import * as THREE from 'three'`), and `cannon-es` if you want 3D physics. Inside `create`, make your own canvas with `document.createElement('canvas')`, give it to a `THREE.WebGLRenderer`, render your scene in `draw`, and copy it onto the stage with `g.drawImage(glCanvas, 0, 0, W, H)`; draw any 2D overlay with `g` after that. Size the renderer at about 1.5 times the logical field. Dispose the renderer, geometries, materials and textures in `dispose`. Turn the stage's pointer into a ray with `THREE.Raycaster` from the logical x and y. Keep it cheap for an iPad: under about 80 draw calls and 60,000 triangles, no shadow maps (fake them with blob shadows or baked vertex colour), no post-processing passes. The screenshot tool renders WebGL in software, so its frame times will read high for 3D; report draw calls and triangle count (`renderer.info`) instead, and say so.

## For the builder

- Set `meta.set` to `'gentle'`. `meta.whyFun` says what the pleasure in the hand is; `meta.basedOn` names the Montessori or Waldorf practice it comes from.
- Under six: targets about 100 pixels, drags that forgive a lifted finger, nothing important in the bottom 50 pixels.
- Look at your screenshots as a Montessori guide or a Waldorf kindergarten teacher would: is it beautiful, is it truthful about the real activity, is anything nagging, flashing, counting or hurrying? Then as the child: do I want to touch it?
- Your report says where the natural ending is and how the child begins again.

## Where the rules come from

A research pass on 2026-09-30 checked these against the sources. Montessori (AMI glossary and guides): practical life as "the simple work of life in the home", isolation of one difficulty, control of error, the cycle of activity, repetition by choice, no rewards. Waldorf (Steiner; Howard for WECAN; IASWECE): activities "derived directly from life itself", imitation without verbal instruction, rhythm and repetition, simple under-formed toys that leave the imagination work to do, self-initiated play, the pentatonic mood of the fifth. Manipulative design in children's apps (Radesky and others, 2022): lures such as coins and daily rewards in 45% of apps studied, navigation constraints such as auto-advance in 46%, parasocial pressure from characters in 25%, fabricated time pressure in 17%; autoplay reduces children's self-regulation (Hiniker, CHI 2018).

The two traditions disagree about fantasy: Montessori keeps to the real for under-sixes, Waldorf tells fairy tales. The set leans on what both accept, realistic role play with open endings, and keeps its fairy folk to one prototype.

## Honest limits

Both traditions are wary of screens for young children, Waldorf strongly so, and a touch-screen cannot give the weight of a real jug or the smell of bread. These prototypes are inspired by the two traditions and do not claim to be Montessori materials or Waldorf play. They borrow the content and the attitude: real activities, the child's own pace, completion over reward, beauty, and room to imagine. The owner decides whether that is enough.

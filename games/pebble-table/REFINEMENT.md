# Pebble Table: ten refinement passes

The owner asked for shader fur ("the hair looks a little bad") and ten passes to make the scene more refined. Each pass: screenshot at 1180×820 (DPR 2) → honest critique → one focused set of fixes → re-screenshot → fps check.

**How each pass was measured.** A fixed Fair Feeding table is seeded into storage (three guests with two stones each, one leftover in the bowl so the knife is out, loose whole stones and two halves). The shot is taken 6.4 seconds after load, so the idle glow and the ghost-hand demonstration are in frame. Frame times are then sampled for 4 seconds with no screenshots (headless Chrome on an Apple M4, DPR 2). Pass 7 uses a seeded Honest Scale table, because that pass changed the scale.

Screenshots are in the Project store under `media/pebble-table-v3/` (`iter-00-before.png` to `iter-10.png`, `before-after.png`, `pebble-table-v3-walkthrough.mp4`).

| Pass | Critique (what reads badly or looks cheap) | Change | fps (avg / p99 frame) |
| --- | --- | --- | --- |
| 0: before | Guests are smooth balls; hedgehog spikes are pasted-on cones. Colours are soft and pastel. Stones read as flat orange discs from the high camera. Side guests are near profile. The bowl is a shallow dish. Halves are slivers. Scale rods are hair-thin and straight. The glow disappears on the cream rug. | Baseline | 60.0 / 16.8 ms |
| 1: shader fur | Fur needed to be sculpted clay, not realistic hair. The first shell pass covered the bear's light belly and muzzle and read like towelling. | Instanced clay-tuft shells over rabbit and bear body and head: alpha-tested against fat tool-stroke tufts, darker root and lighter tip, soft rim, breath and wind sway in the vertex shader. Front-facing surfaces stay bare so faces and bellies read cleanly. Shell count 3 to 6 from on-screen size. Hedgehog quills are instanced tapered clay spikes that sway out of phase. | 60.0 / 16.8 ms |
| 2: camera | The 56° camera flattens stones into discs and shows the tops of heads. | 46° pitch, 27° lens, target nudged back. Stones gain visible thickness; guests face out more. | 60.0 / 16.8 ms |
| 3: guests | Guests are small for a four-year-old; side guests still read as profiles; eyes are small dots. | Guests 14% bigger, turned further toward the child (head-look clamp tightened), bigger bead eyes with a double shine, seats moved back so bodies clear the plates (guest collision radius 58 → 64). | 60.0 / 16.8 ms |
| 4: colour and light | Washed out and pastel; guests sit flat against the table. The first try (grade before tone mapping) turned the bag's highlights pink and washed the table out. | Deeper sage table, warmer backdrop; warmer, stronger key, less ambient, cool fill, and a new rim light from behind. The grade moved after ACES tone mapping and became a display-space S-curve plus saturation; warmth eased back after a too-gold try. | 60.0 / 16.8 ms |
| 5: stones | Stones still look like flat lozenges with a dull finish. | Domed pebble profile (thicker on top), underside shading baked into vertex colours, a lower-roughness clay sheen, tighter and darker contact shadows. | 60.0 / 16.8 ms |
| 6: bowl and halves | The bowl reads as a saucer; halves are slivers that don't look like half a stone. | Deep flared bowl with a rolled lip and a darker floor (physics wall 3.2 → 4.8 cm to match). Halves and quarters are the whole pebble with flat cut faces, drawn as their own instanced meshes. | 60.0 / 16.8 ms |
| 7: scale | Pencil-thin beam, hair-thin straight hangers, flat pans. A deeper pan first try hid the stones in it, so it was reverted. | Chunky beam with bead collars, twisted clay-rope hangers (three times thicker), rolled pan rims at the original pan depth. | 60.0 / 16.8 ms |
| 8: guidance glow | The idle glow is invisible on the cream rug; the leftover's glow drew under the new, deeper bowl floor. | Golden ring texture (clear edge, soft core) that breathes in size; glows and shadows for stones in the bowl sit on the bowl floor. | 60.0 / 16.8 ms |
| 9: handmade detail | Empty stools are plain cylinders; the rug edge is bare; thumbprints on the slab are faint. | Pinched clay cushions with a piped seam and button, a rolled clay rope around the rug hem, deeper slab thumbprints. No new props where a child plays. | 60.0 / 16.8 ms |
| 10: sound and final polish | Sounds were unchanged since the 2D slice: bright wooden ticks, a plain sine number voice, thin munch. The focus band was tuned for the old camera. | Clay sound pass: dull thocks with a low body, soft pats, a muffled cloth-bag clatter, a marimba-like number voice, a blooming chord, "nom" munches, a boing hop, and a small procedural room reverb. Tilt-shift focus moved onto the play area; vignette slightly stronger. | 60.0 / 16.8 ms |

**Whole-game check after pass 10.** The scripted walkthrough (spill, sweep, feed, knife, scale, portrait; about 57 seconds) runs at 59.9 fps average, 99th-percentile frame 16.8 ms, with one frame over 25 ms, the same as before the passes. The draw count rose from about 45 to about 55 (fur shells, quills, three stone meshes, rug rope), still under the 80 target.

## Still weak

- The fur is convincing at play distance but reads as flocking up close; the tuft pattern needs a real flow direction per body part (it follows sphere UVs, which pinch at the poles).
- The rabbit's ears and the bear's arms have no fur shells, so they read as smoother clay than the body.
- The backdrop is still one flat colour; a soft, out-of-focus room behind the table would add depth.
- The new sounds were tuned by reasoning, not by ear on an iPad speaker; they need a listening pass.
- Not yet measured on a physical iPad.

# Animation passes: every character moves like itself

The owner: "make sure animations are not all the same, more unique, more depth and iteration." Before these passes every guest shared one breathe, one blink rhythm, one hop when a stone landed, one three-chomp munch, and one reach toward the bowl, differing only by a phase offset. Motion now lives in [`motion.ts`](motion.ts): a personality per species (idle life, blink rhythm, head-turn spring, reach) with several variants of every action (react, eat, poke, arrive) and rare delights, picked by a per-guest director that never repeats a variant back to back, randomizes amplitude and speed, and plays delights only while nothing else happens. `motion.test.ts` fails if two species share an action, if two variants are near-copies, or if a variant repeats.

Each pass: record a scripted scene (poke every guest twice, deal six stones so everyone reacts twice and the party eats, then idle) as video, cut per-guest frame strips, ask "does this look like the same animation reused?", fix, re-record. Frame rate was checked on a production build after the last pass.

| Pass | Critique | Change |
| --- | --- | --- |
| 1: personalities | Everything was one shared motion. First cut of the personality system: the hedgehog's curl-up and the bear's slow wave read at once, but the bear's belly laugh and the rabbit's giggle were invisible at play distance, and eating barely registered. | Rabbit, bear cub, and hedgehog get their own idle, blink, and head-turn spring, 2 to 3 variants per action and 4 delights each (rabbit: twitch-hop, thump, binky, nibble, ear flick, scratch; bear: belly pat, heavy bounce, happy rock, big chomps and sigh, yawn; hedgehog: shuffle, quill ripple, tippy-toes, curl-up, sneeze). Ears, nose, and cheeks split out of the head so they can flick, wiggle, and puff; quills puff. A poke is no longer the same hop as a stone landing. |
| 2: readable at play distance | The bear's belly pat hid behind the same-coloured belly from the camera; eats were tiny head nods. | Pats swing the arms out and back in (the silhouette changes); the belly laugh shakes, bounces, and throws the head back; the giggle bounces; each eat gets body motion (rabbit bobs, bear sways and sighs deeper, hedgehog wiggles after). |
| 3: objects | Every stone size landed with one spring; the bag always tipped the same way; pans were rigid; the knife just appeared. | Stones by size: a whole stone squashes deep and rocks slowly as it settles, halves and quarters are springier and rattle quicker. The bag alternates a lurch with a shake-out and gets floppier as it empties. Pans swing on their ropes behind the beam. The knife pops in, leans into drags, and chops when let go. |
| 4: idle up close | Side by side the hedgehog's idle shuffle was nearly invisible, chomping mouths were too small to read, and the rabbit's nose wiggle was lost. | The hedgehog shuffles in visible bursts with a slow twist; mouths open wider, with a width per species (the bear's is widest); nose wiggles doubled. |
| 5: synchronised moments | When the ghost hand appears, all three guests reached for the bowl at the same instant with the identical lean and arms-out pose: the last shared animation. Pokes all made the same hop sound. | Reaching moved into the personalities: the rabbit stretches up on tiptoe with ears pricked, the bear slowly holds out both paws, the hedgehog leans in sniffing, each with its own response speed, so they stagger. Pokes answer in each species' voice: a squeaky giggle, a low "hm-hm", a tiny sniff-squeak. |

**Frame rate after the passes** (production build, 1180×820, DPR 2): Chrome at 6× CPU throttle 60 fps idle, spill, and drag; WebKit 60 fps; Chrome at 20× throttle 60 idle, 52 spill, 60 drag (the governor at balanced). Draw calls rose from 40 to 48 (nose, cheeks, and ears as separate meshes), still under the 80 budget.

## Still weak (motion)

- Eating is still quieter than it should be for the hedgehog; its chomps read mostly as a lean.
- The objects' new character was checked in code and in the full walkthrough, but the scripted object recording missed the knife and the bag moments, so they have not had a dedicated critique pass.
- The munch still starts at the same moment for everyone (the controller fires one munch for the party); staggering it by personality is the next step.

# Intersection audit: no pieces through each other

The jam's intersection audit (`npm run check:intersections -- pebble-table`) plays a four-year-old's first open on the production build, in five moments: the story beat, where the bag tips one stone toward the hungry guest and the ghost hand carries it to the plate, then a ten-stone spill; stones dealt to a plate and the bowl, pokes, the knife cutting a leftover into halves and quarters, a stone carried over a guest's head to its plate, and a sweep through the pile; an idle long enough for the glow, a rumble and a ghost-hand demonstration; the Honest Scale with stones and all four jars' parts carried onto both pans, then the ghost stone's demonstration; and Knock-Knock, with knocks, the visitors coming in, a poke, and a rest. Every quarter-second of game time (208 samples over 54 s) it looks for pieces passing into each other.

**Found.** The first run found 146 visible findings: 72 decals or pieces sinking into what they lie on, 47 pieces through other pieces, 18 parts set deeper into their own figure than at rest, 7 pieces wholly inside another, and 2 z-fights. Another 140 were hidden (out of sight or under the pixel floor). All 146 were real.

| Seen | Change |
| --- | --- |
| Contact shadows and glow rings (63) reaching into the rug's hem, plate and bowl rims, a guest's body, the post, the nest and loose parts; wholly inside the rug; z-fighting with it | Each disc lies a hair above what it is cast on and shrinks to where that is flat: the pan, bowl or plate it lies in, clear of the hem and of the side of any plate or the bowl beside it, and in a pan to the middles of the dish's turned sides. Plates and the bowl stand a hair above the rug, so their bases never share its plane. |
| Stones through stones, the rug's hem, the plates, the bowl, the bag and the table (21), and the hem rope through the rug (1) | Stones collide as they are drawn (low prisms round the drawn pebble) and rest on the drawn heights of the rug, plates, bowl and pan floors. They squash, rock and pop about their lowest point, never into a neighbour, and a sweeping finger never presses them into the table. The hem rope is solid, so a stone rests on it or beside it. Stones leave the bag from just past its mouth. |
| Loose parts through each other, stones, the table, the nest and a pan (20), and jar lids through their jars and the table (6) | Parts and jars collide as drawn, a shell is solid to its rim, and a part landing fast on a stone meets it instead of sinking in. A part jittering against a neighbour still falls asleep. |
| Guests' arms, ears, cheeks, nose and mouth deeper into their own head or body (10), and guests' bodies into the table, rug, hem, plates and a stone (6) | A guest's parts are posed by one pure function that never swings an arm, ear, nose or cheek deeper into what it hangs on, and a curling hedgehog puts its cheeks away once they sink under its face. Guests stand clear of their plates on the highest thing under them, and a stone carried over a guest rides over its head. |
| The scale's ropes through the beam, the beam through the post, the post in the table, and stones in the pans' rims (8) | The ropes, beam and post meet the same way at every tilt. The pans swing on their ropes with their colliders, are solid round their rolled rims, and a stone or part carried over a raised pan rides over the rim. A pan rope is laid over a stone or part carried into it. |
| The ghost stone through a stone, a stick and shells (4) | The ghost stone lies on whatever it is shown lifting or carried over. |
| The shelf's choosers and the album through each other (4) | They stand apart on the shelf. |
| Stones in the empty seats' stools, and a stool in the hem (3) | Stools collide as drawn and stand on their lumpy cushion. A stone lying where a stool pops up hops out beside it. |

The Knock-Knock visitors come and go clear of the house, its door and each other, and stones hop out of the door's swing and the visitors' path.

**Once the audit enforced**, more turned up, each in one run of several, because the stones' and parts' fall differs a little from run to run:

- A guest's idling arm swung into a stone leaning on the guest. The guest's collider now holds its idling arms, and a stone left leaning on a guest hops off.
- A shell poured from its jar went into a stone, and a poured stick did too: a part landing fast now meets a stone instead of sinking in.
- The ghost stone went through a stick lying on the table. It now lies over loose parts too.
- The Knock-Knock moment never reached the door mat: a tap on a tall shelf token's top could fall within reach of the token behind it. A tap now brings out the nearest.
- A stone carried over the hedgehog went 25% into its nose: the stone came down as soon as it left the guest's body, but a guest's head, leaning in and looking down, reaches much farther. Something carried over a guest now stays up until it is clear of the guest's head.
- A shadow in the left pan sank into the pan's wall (24%, 12 px): the pan is drawn with 40 sides, so its flat floor ends about 0.4 mm inside the circle the decals were shrunk to. They now stop at the sides' middles.
- A stone sank 0.41 cm into the left pan half a second after the scale came out. Stones left on the table stay where they lay when a mat changes, so one could lie across where a pan's rim now stands, or under a pan that then came down on it. When the scale comes out, a stone caught across a rim is now laid inside the pan if there is room, and one under a pan (or with no room in it) is set down beside it, clear of where either pan can swing.

Four test fixes came out of the same runs: the bag-spill and random-spill tests count a stone hopping off a guest as still on the table, and a tap on the album while a stone is hopping sets the page back exactly.

**After.** Two enforcing runs of the final build are clean: no open and no allowed findings in 205 samples each, with 3 hidden (two shadows wholly under a shelf chooser, out of sight, and a guest's head on its body). A replay of the first run's photographed findings re-photographs 91 of them at the same moment and spot, and none is still there. Nothing is allowed. The config ignores only the fur shells and hedgehog quills: their vertex shaders push and sway them, so the CPU copy the audit reads is not what is drawn, and each quill is planted in the body by design. They are reviewed by eye in the close-ups and contact sheets.

**Regression tests.** 66 new tests. The 52 in `intersections.test.ts` pin each fix at the level of the shapes and physics that caused it, and each fails against the code the audit first ran on. `controller.test.ts` (8) holds the stones that hop out of the way of a guest's arm, a stool, the door and the visitors; nothing under a pan rim weighing on the beam; a tap bringing out the chooser tapped; the album setting the page back exactly while a stone hops; and a stone carried over a guest, and over its head. `guest.test.ts` (3) holds the guests' posing, and `physics3d.test.ts` (3) a swinging pan waking only what lies in it, jittering parts falling asleep, and the shape cull landing a pour exactly where trying every shape does.

**Perf.** Measured on this GPU-less VM with Playwright's bundled Chromium at 6× CPU throttle, a half-size viewport and full quality pinned: three interleaved runs per build and scene of the perf probe's scripted play (about a minute each), `main` 53596a3 against this branch. The figures are each frame's CPU work, the median over the runs of each run's 95th and 50th percentiles, with the runs' range. The machine was shared (load average 3.9 to 10.1 during the runs), so run-to-run noise is several milliseconds.

| Scene | cpuP95 main | cpuP95 branch | cpuP50 main | cpuP50 branch |
| --- | --- | --- | --- | --- |
| Fair Feeding | 27.3 ms (25.5–30.1) | 31.2 ms (27.1–37.4) | 9.6 ms | 11.1 ms |
| Honest Scale (jars tipped, stones and parts carried over the pans) | 28.7 ms (21.9–32.8) | 51.0 ms (50.8–53.9) | 8.4 ms | 18.2 ms |

Every run stayed at the full tier, with 20 to 34 draw calls. Fair Feeding is within the noise. The Honest Scale is not: every run of this branch costs more than every run of `main`, about twice its median. The loose parts now collide as drawn (sticks and shells are chains of little balls), and two commits in this pass cut the controller's cost of a four-jar pour in Node from a mean of 3.5 ms to 1.0 ms at 1× (`main`: 0.5 ms), but the scale still costs about twice what it did. The frame-budget test (a ten-stone spill under 0.75 ms a frame) and the governor rules pass unchanged.

## Still weak (intersections)

- The Honest Scale costs about twice `main`'s CPU per frame (above). Profiling where the rest goes and cutting it is the next step.
- The scale coming out clears stones from under its pans, but a stone or part that comes to rest on the table under a pan's rim during play could still be pressed by the pan coming down as the beam tips. No audit run has shown one.
- The fur shells and quills are outside the audit and reviewed by eye only.

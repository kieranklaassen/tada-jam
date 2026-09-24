# What the Owl Sees

- **Verb:** tuck
- **Depth engine:** mystery
- **Age band:** 4 to 7
- **Lens:** physical-toy (hide-and-seek)
- **Hooks declared:** dawn

## Loop
Three chicks (yellow, brown, grey) sleep in a nest. The child carries one out into a meadow and lets go. An owl on a perch sweeps its gaze across the field; when the beam reaches a chick the owl either swoops on it (the chick is whisked home to the nest, unharmed) or glides past (the chick pulses green). Nothing says why. The hidden sight rules:

1. **Stillness.** A chick that has moved in the last 1.2 s (or is being carried) is seen by every sweep. A quick GLANCE sees nothing else. A long STARE (the owl's eyes go wide while it rests, so the cue is readable) also sees chicks that hold still, unless the chick is hidden by one of:
2. **Colour.** Sitting on a patch of its own colour.
3. **Cover.** Sitting inside a reed clump, or behind one (in its shadow, measured along the line from the perch, not far). A clump hides only the one chick nearest its middle.

There are three owls, told apart by how they look (pale barn, dark tawny with tufts, white snowy). Each is fooled by two of the three hiding ways and not the third: barn by colour and inside, tawny by inside and behind, snowy by colour and behind. The mapping never changes; the owl and the meadow are dealt per round.

When all three chicks sit unseen through a whole stare, the `dawn` hook fires: the owl flies off, the sun comes up, the chicks go home, and the meadow is dealt again (a different perch, a different owl, new reeds and patches).

## What should vary on repeat play
The given play-5 line: "The child arrives knowing the owl misses anything that holds still, so they hide the chick at once and then test on purpose whether matching a patch colour or sitting behind reeds also fools it, the blind spot they have not found."

How the sim produces it: the rules are fixed across sessions, so what a child learns carries. Play 1 finds stillness (a chick left wriggling is seen; one left alone survives the glance). The stare is the twist that makes stillness alone fail, so the next thing to find is that colour and cover fool the long look. Then comes the part that keeps the mystery alive: which of colour, inside-the-reeds, and behind-the-reeds fools THIS owl. The owl is dealt from the seed (and changes at every dawn), so a child who learned "reeds work" meets the snowy owl that looks straight into them and must test the other ways again. "Behind" also moves with the perch, and a clump hides one chick, so hiding all three needs a mix of ways. A fixed plan fails: always-barn hiding brings a dawn only when the barn owl comes; only the child who has learned each owl's blind spot brings dawns every round.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: kaia, tess, arch-3, arch-6, arch-7, arch-8 (18 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 3 of 18 runs (17%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 3, 1, 0 of 18.
- **Play 5 against play 1:** change 0.32 (0.32 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 36 adopted, 14 made progress. Tried: caught down, caught up, dawns down, dawns up, safe down, safe up, tucked down, tucked up.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective safe up; outcome variety 1.52 bits (by policy: greedy 1.52, random 1.52, repeat-one 1.52). Dominant strategy: no (the objective never varied).
- **Hook flags** (raw material for the guidelines; session 3 return 16.7% with every hook on, 16.7% with all off):
  - `dawn`: inconclusive (the persona model has no reward response); without it 16.7%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 3 of 18 target-panel runs (17%) start session 3, 33.3 points short of the 50% line (6 more runs needed).
- Hook ablation says little for `dawn`: removing it changed nothing the personas can register.
- Left first: `arch-3`, starting 1.0 of 5 sessions on average (the best in the target panel starts 2.0).

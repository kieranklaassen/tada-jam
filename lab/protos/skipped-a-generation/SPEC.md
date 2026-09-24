# Skipped a Generation

- **Verb:** cross
- **Depth engine:** combination
- **Age band:** 10 to 12
- **Lens:** other
- **Hooks declared:** wish

## Loop
Five meadow creatures wander. The child taps two to cross them; an egg wobbles and a hatchling appears in the nest, blended by hidden rules: its hue is the middle of the parents' hues on the colour wheel (opposites tie toward the first parent picked), its ears follow the longer parent, and its spots are a recessive gene that shows only when both inherited copies carry spots. The child taps the hatchling to keep it in the meadow (cap of eight, so a full meadow means sending someone through the gate first) or ignores it and it wanders off after about twelve seconds. Tiny parent and grandparent dots under each creature are the only pedigree shown; the spot genes themselves are never drawn. A thin meadow gets a wild visitor, so a line of short ears or a spotted body can be lost and found again. The `wish` hook adds a visitor who wants a colour, then a colour and ears, then those plus spots; keeping a matching hatchling fulfils it and brings a gift carrier creature.

## What should vary on repeat play
The given play 5 line: The child pairs two spotless grandchildren of a spotted creature because they know spots skip a generation, raising a spotted, long-eared hatchling on purpose.

How the sim produces it: the meadow starts different each session (seeded hues, ear lengths, which founder is spotted, whether a hidden carrier is among the plain ones). Spotted crossed with plain gives plain carrier hatchlings whose pedigree dots show a spotted parent; two carriers give a spotted hatchling one time in four (the `skip` event), and two spotted creatures always breed spotted. Ears follow the longer, so a long-eared body needs one long-eared parent while short ears need two short ones. Hue is the middle of the parents' hues, so a wanted colour is a choice of parents. Play 1 is random crosses; by play 5 a child reads the dots, picks two carriers, and steers all three traits at once.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-9, arch-11 (6 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** fail. 0 of 6 runs (0%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 0, 0, 0 of 6.
- **Play 5 against play 1:** change 0.28 (0.28 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 7 adopted, 0 made progress. Tried: bodies up, hatched down, spotted up, wishes down.
- **First 10 seconds:** not assessed (did not pass the depth gate).
- **Self-play:** objective bodies up; outcome variety 1.56 bits (by policy: greedy 0.38, random 2.26, repeat-one 0.38). Dominant strategy: yes, repeat-one beats random on the objective while its variety collapses.
- **Hook flags** (raw material for the guidelines; session 3 return 0.0% with every hook on, 0.0% with all off):
  - `wish`: inconclusive (the persona model has no reward response); without it 0.0%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Fails the depth gate: 0 of 6 target-panel runs (0%) start session 3, 50.0 points short of the 50% line (3 more runs needed).
- Dominant strategy in self-play: repeat-one beats random on the objective while its variety collapses.
- Hook ablation says little for `wish`: removing it changed nothing the personas can register.
- No self-set aim made progress (0 of 7 adopted).
- Left first: `arch-9`, starting 1.0 of 5 sessions on average (the best in the target panel starts 1.3).

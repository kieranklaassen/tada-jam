# Sly Paws

- **Verb:** bluff
- **Depth engine:** other-minds (secondary: rule-play)
- **Age band:** 8 to 11
- **Lens:** other
- **Hooks declared:** match, crow

## Loop

Each round the child hides a pebble in one of its own two paws (tap the bottom half, left or right) and guesses which of the creature's two paws holds its pebble (tap the top half, left or right). Both choices in, the round is revealed: the child found the creature's pebble, the creature found the child's, both, or neither. The creature never sees the current round; it hides and guesses by habit, reading only the child's earlier rounds with it, and a strip of the last six rounds shows what each side did. A visit lasts ten rounds (or a match, see below), then the next creature walks in. Three of five creatures are drawn per session in a seeded order; each hides by one rule and guesses by another, with a 12 percent chance of an off-habit slip so a habit is a lean and not a machine.

| Creature | Hides | Guesses |
|---|---|---|
| Fox | where you last looked | stays after a hit, switches after a miss |
| Owl | away from where you last looked | left, unless you hid in one paw three times running, then bets a fourth |
| Hare | alternates paws | fixed cycle: left, right, right |
| Badger | stays put until found twice at the same paw | bets you switch from your last hide |
| Magpie | away from where you last hid | where you last looked |
| Crow (hook) | in the paw you looked in least lately | learns whether you stay or switch after being caught, and bets on it |

The characteristic moment is the dodge (state event `sly`, signature class `sly`): the creature acted on a read of the child's earlier rounds and missed. Against the owl it is feeding a false habit (hide right three times) and breaking it on the fourth.

## What should vary on repeat play

Given play 5 line: The child knows the fox switches after a miss and the owl bets you will repeat, so they feed the owl a false habit for three rounds and break it on the fourth.

How the sim produces it: the habits are the same in every session, only the roster and its order change with the seed, so what a child works out about the owl in session 1 is worth something against the owl in session 5, and a new visitor is a new mind to read. Play 1 is mostly guessing (edge near zero for any naive policy). Naive policies do not win everywhere: always switching beats the owl and the magpie but loses to the badger; always staying beats the magpie but loses to the owl; guessing by alternation loses to the fox. A child who has the owl's rule gets about +0.8 edge per round with the R, R, R, L pattern. The signature carries a grip (0 to 2: found its pebble three in four rounds, and not caught in those four), so a session where the child has a creature's number lands in different signature classes than a session of guessing.

Hooks:

- `match`: first to 5 points ends the visit (a find is a point, a dodge is a second point, being found is the creature's point). A child win brings the next creature; a creature win means a rematch with the same creature, which remembers the child, with the score reset. Without it a visit is a fixed ten rounds and there is no score.
- `crow`: two dodges in one visit unlock the Crow, who joins the roster next. Without it the roster stays at three.

## Findings
<!-- findings:start -->
_The panel numbers are model guesses at children, not measurements; real children check anything before it is polished into a cartridge. Target panel: arch-7, arch-8, arch-9, arch-11 (12 runs). Thresholds u2-panel-1, master seed 1._

- **Depth gate:** pass. 8 of 12 runs (67%) start session 3; the line is 50%. Runs starting session 3, 4, 5: 8, 4, 3 of 12.
- **Play 5 against play 1:** change 4.59 (4.59 new signatures per 100 actions plus 0.00 new action kinds).
- **Self-set aims:** 54 adopted, 25 made progress. Tried: dodges down, dodges up, edge up, grip down, grip up, rounds down, rounds up, switchRate down, switchRate up.
- **First 10 seconds:** clear. 78% of 148 cue-blind touches changed the sim, first change at tick 16 (about 0.5 s) on average, 3 action kinds tried.
- **Self-play:** objective edge up; outcome variety 3.14 bits (by policy: greedy 2.11, random 3.16, repeat-one 2.46). Dominant strategy: no (no policy dominates).
- **Hook flags** (raw material for the guidelines; session 3 return 66.7% with every hook on, 16.7% with all off):
  - `match`: needed; without it 25.0%
  - `crow`: needed; without it 33.3%
- **Crashes:** none.
<!-- findings:end -->

## Known weaknesses

- Leans on hook `match`: removing it drops session-3 return from 66.7% to 25.0%.
- Leans on hook `crow`: removing it drops session-3 return from 66.7% to 33.3%.
- Left first: `arch-9`, starting 2.3 of 5 sessions on average (the best in the target panel starts 3.7).

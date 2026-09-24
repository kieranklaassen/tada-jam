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
_The persona panel fills this in._
<!-- findings:end -->

## Known weaknesses

_Filled after the panel run._

Builder's notes, before the panel run:

- The rounds are independent taps, so the panel's learning-progress signal (predicting what a touch does from the touch alone) sees little to learn; the depth here lives in the creature's hidden habit, which the panel can only see through signature novelty and self-set aims on `edge`, `grip`, and `dodges`.
- `switchRate`, `dodges`, and `rounds` are features a self-set aim can push without any mind-reading (tap fast to raise `rounds`), so aims on them will look like progress.
- The Crow is only reachable through the `crow` hook, and unlocking it takes a dodge streak that only a child who has read a creature usually reaches; a persona that never reads may never meet it.
- A 12 percent slip keeps habits from being machines but also makes a wrong-looking round easy to over-read; the ten-round visit gives a child a few rounds per creature per session to notice.
- Touch targets are the four quarters of the field, so any tap chooses a paw; there is no way to tap "nothing". The history panel sits over the top right quarter and taps there choose the creature's right paw.

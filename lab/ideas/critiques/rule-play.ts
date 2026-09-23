import type { Critique } from '../types.ts'

export const critiques: readonly Critique[] = [
  {
    id: 'rule-play-01',
    verdict: 'keep',
    reason:
      'Sliding the pivot inverts the "heavy always goes down" habit and lets the child learn to read where the pivot must sit for each pair, but play 1 and play 5 are nearly the same move, so vary the animal weights and ledge heights or it thins out; a 4-year-old can still drag and tip the plank.',
    depth: 3,
    risk: 'low',
  },
  {
    id: 'rule-play-02',
    verdict: 'keep',
    reason:
      'A held finger bends gravity in a region, and the play-5 skill is reading a hop arc and placing the bubble where it carries the chick, which a plain watch-it-rise play 1 does not show; watch that it does not collapse into pure timing practice, and the hold is easy for a 3-year-old.',
    depth: 3,
    risk: 'low',
  },
  {
    id: 'rule-play-03',
    verdict: 'cut',
    reason:
      'Fails the escalation test: play 5 is the same fell-a-block move over a wider creek (stack a second block to cross water no single block spans), so repeat play is a bigger gap, and a toppling stack is fussy to make deterministic.',
    depth: 2,
    risk: 'medium',
  },
  {
    id: 'rule-play-04',
    verdict: 'keep',
    reason:
      'The circular scare rule breaks the size-decides habit a child brings from play 1, and using it on purpose to clear a jam is exactly a learned, exploitable rule; make the cat, mouse, and elephant silhouettes carry the circle wordlessly, and the first tap to send an animal is easy at 5.',
    depth: 4,
    risk: 'low',
  },
  {
    id: 'rule-play-05',
    verdict: 'cut',
    reason:
      'Fails the play-5 test and hides an ordinary shape sorter: the plug-with-a-misfit trick is the whole game and is fully known after one play, so play 5 is the same move on a different open hole.',
    depth: 1,
    risk: 'low',
  },
  {
    id: 'rule-play-06',
    verdict: 'keep',
    reason:
      'The head-and-tail swap is a real bent rule (a train that can reverse out of what it drove into), and the child learns to plan an entry knowing the exit; use wide or snapped corridors so a 4-year-old can drag the head without tracing a precise path.',
    depth: 3,
    risk: 'medium',
  },
  {
    id: 'rule-play-07',
    verdict: 'keep',
    reason:
      'Split small to fit through, rejoin whole to push is a clear bent rule with a read-ahead plan behind it, though play 5 is close to play 1 so watch that it stays about the split-and-rejoin habit rather than more cracks; a two-finger pinch is hard for a 5-year-old, so allow press-and-pull to split.',
    depth: 3,
    risk: 'medium',
  },
  {
    id: 'rule-play-08',
    verdict: 'keep',
    reason:
      'Bumps that add up and bounce off the pinned end give the child a rule to learn and anticipate (where and when two bumps will meet), so play 5 uses the reflection on purpose; keep the wave a simple 1D sim and show the bell threshold by a visible ring, not a number.',
    depth: 4,
    risk: 'medium',
  },
  {
    id: 'rule-play-09',
    verdict: 'cut',
    reason:
      'Fails the duplicates/generic test: it is peg solitaire with one extra move, a fixed board solved once, so play 5 is only a harder position that needs authored, solvability-checked boards, and an 8-year-old lowest age is a steep first action.',
    depth: 2,
    risk: 'medium',
  },
  {
    id: 'rule-play-10',
    verdict: 'keep',
    reason:
      'The robots follow one readable rule, and the child comes to exploit it by lining robots up to collide, a clear play-1-to-play-5 shift from running away to herding; seed the starting layouts so it is not just more robots, and a one-square tap is easy at 7.',
    depth: 4,
    risk: 'low',
  },
  {
    id: 'rule-play-11',
    verdict: 'keep',
    reason:
      'A looping past self is a bent rule of time that the child learns to choreograph, and overlapping two ghost loops so one is always on the plate is a plan play 1 could not show; watch the loop timing tolerance so an imprecise 8-year-old drag still works.',
    depth: 4,
    risk: 'medium',
  },
  {
    id: 'rule-play-12',
    verdict: 'keep',
    reason:
      'This is the purest fit: the rules are objects the child rewrites, and breaking one on purpose to cross a room is exactly the play-5 line, but keep the grammar to a handful of picture tiles or it becomes an unbounded rule-parser (high build risk), and the wordless rule-tile reading is abstract even at 10.',
    depth: 5,
    risk: 'high',
  },
  {
    id: 'rule-play-13',
    verdict: 'keep',
    reason:
      'Placing the pull yourself and learning how a probe bends around it gives a real anticipate-the-arc skill with a high ceiling, but static planets deflect the probe without adding speed, so build it as bending the path around the wall and drop the speed claim.',
    depth: 3,
    risk: 'medium',
  },
  {
    id: 'rule-play-14',
    verdict: 'keep',
    reason:
      'The earlier cut does not hold: the play-5 line is a transferable habit, not a new puzzle (read where two ledges sit, pick the crease that lands one on the other, then fold again from the far side to chain), and it is the only idea here that bends space itself, so the shard is poorer without it. The build-risk cut was inconsistent with keeping rule-play-12 at high risk, and it is bounded by scoping the prototype to vertical creases on a side-on strip: fold is a mirror of one side onto the other, layers stack, and the creature steps between ledges that overlap in x within a small height gap, with no free-angle creases. Depth stays at 3 because each new layout is authored, so seed varied ledge pairs so the crease choice changes each play; a 10-year-old can drag a crease line.',
    depth: 3,
    risk: 'medium',
  },
]

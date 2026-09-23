import type { Critique } from '../types.ts'

export const critiques: readonly Critique[] = [
  {
    id: 'other-minds-01',
    verdict: 'keep',
    reason:
      'Each creature has its own fixed count and reappearance habit, so play 5 is the child lifting each blanket on that creature\'s beat and watching where the fox will pop up; the beat window must be wide enough for a 2-year-old\'s imprecise tap.',
    depth: 3,
    risk: 'low',
  },
  {
    id: 'other-minds-02',
    verdict: 'keep',
    reason:
      'Three simple follow rules (stall at flowers, cut corners, follow the one ahead) make the line reorder itself, and the child steering a loop to change the order is a real read-and-exploit; watch that the ducklings\' habits are visibly distinct shapes or motions.',
    depth: 4,
    risk: 'low',
  },
  {
    id: 'other-minds-03',
    verdict: 'cut',
    reason:
      'Fails duplicates and depth: it is the same "wait while a creature comes when its own timing allows" core as Blanket Beats, and once the child learns to hold still for the bold ones first the loop is solved and the wow is gone.',
    depth: 2,
    risk: 'low',
  },
  {
    id: 'other-minds-04',
    verdict: 'keep',
    reason:
      'Per-blob rules for how a mood spreads make seating order the child\'s lever, and the crier-next-to-giggler fix is learned by reading, not by more content; watch that the child has one obvious want (calm the crowd) and that moods read from face shapes alone.',
    depth: 3,
    risk: 'medium',
  },
  {
    id: 'other-minds-05',
    verdict: 'keep',
    reason:
      'Control jumping into whichever creature you tag makes "whose body do I want next" a real choice, and each body flees or chases by its own habit, so play 5 is picking bodies and cornering by habit; watch that the glow handoff reads clearly to a 5-year-old.',
    depth: 4,
    risk: 'medium',
  },
  {
    id: 'other-minds-06',
    verdict: 'keep',
    reason:
      'The earlier cut does not hold: the engine fit is direct (every creature pulls by its own habit, and play 5 is reading the bear\'s lag, the kitten\'s stamina, and the goat\'s butterfly weakness), and only the bear shares Blanket Beats\' delay idea, while the kid\'s real choices here are lineup order, call time per creature, and striking when the rival crew is catching its breath. It is also buildable: a few per-creature state machines plus one rival force on a breathing cycle, integrated into one knot position. Build it lean (rival as a single pulsing force, one scripted butterfly), and check the knot leaning toward whoever heaves in step reads as a pull with no win tally on the kid side.',
    depth: 4,
    risk: 'medium',
  },
  {
    id: 'other-minds-07',
    verdict: 'keep',
    reason:
      'Each cat\'s tell before the pounce is a readable habit and freezing the dot mid-wiggle exploits it, so play 5 is the child steering cats by their tells; keep the sulking cat one tap from returning so nothing is lost, and check a 5-year-old can tell the stalk, wiggle, and pounce cues apart.',
    depth: 3,
    risk: 'medium',
  },
  {
    id: 'other-minds-08',
    verdict: 'keep',
    reason:
      'A fixed dominance order among the fish means the child learns who bullies whom and then uses decoy scatters to feed the shy one, a genuine read-and-exploit with a clear want; watch that rank shows by size alone and the fish turning away is a visible cue.',
    depth: 4,
    risk: 'medium',
  },
  {
    id: 'other-minds-09',
    verdict: 'cut',
    reason:
      'Fails engine fit and escalation: it is a rhythm-timing game where the creatures\' "speed up" and "add a step" responses are a difficulty ramp in character costume, and it shares the beat-timing core of Blanket Beats.',
    depth: 2,
    risk: 'medium',
  },
  {
    id: 'other-minds-10',
    verdict: 'keep',
    reason:
      'Each creature hides and guesses by a fixed habit, so the child can model an opponent, plant a false pattern, and break it, which is theory of mind driving play 5; keep round results as small gestures with no win or loss tally on the kid side.',
    depth: 4,
    risk: 'low',
  },
  {
    id: 'other-minds-11',
    verdict: 'keep',
    reason:
      'Guards act on where they last saw the treasure, not where it is, so play 5 is the child exploiting each guard\'s false belief and rechecking habit, the clearest read-a-mind loop in the shard; watch the sight cones and belief cues so they stay legible with flat shapes.',
    depth: 5,
    risk: 'medium',
  },
  {
    id: 'other-minds-12',
    verdict: 'keep',
    reason:
      'Blending in depends on reading which sheep pause and drift and when the dog looks away, so play 5 is timing a crossing off the dog\'s habit; the "moves like the sheep" test needs a simple speed-and-pause match rule, and watch that the fox\'s exposure shows by colour, not a meter or numbers.',
    depth: 4,
    risk: 'medium',
  },
  {
    id: 'other-minds-13',
    verdict: 'keep',
    reason:
      'A fixed ring of gossip habits makes the child learn who tells whom and route goodwill through a friend, but the loop needs one visible want (the shy badger) and posture cues instead of a friendship meter, or it drifts into a tally.',
    depth: 3,
    risk: 'medium',
  },
  {
    id: 'other-minds-14',
    verdict: 'cut',
    reason:
      'Fails duplicates: it shares Grumble and Giggle\'s core of one character\'s reaction spreading to its neighbours to steer a group, and its want ("the corner they wanted") is never stated, so it lacks one obvious goal.',
    depth: 3,
    risk: 'medium',
  },
]

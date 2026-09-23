// The closed set of depth engines: what makes play 5 differ from play 1.

export const ENGINE_IDS = [
  'emergence',
  'combination',
  'mastery',
  'mystery',
  'other-minds',
  'expression',
  'variation',
  'rule-play',
] as const

export type Engine = (typeof ENGINE_IDS)[number]

export interface EngineInfo {
  id: Engine
  definition: string
  // How play 5 differs from play 1 when this engine works.
  play5: string
}

export const ENGINES: readonly EngineInfo[] = [
  {
    id: 'emergence',
    definition:
      'A few simple rules interact so outcomes are surprising and not scripted by the author: physics, chain reactions, crowds, growth.',
    play5: 'The same setup produces a chain or pattern the child has not seen, and the child starts to predict and steer it.',
  },
  {
    id: 'combination',
    definition:
      'Things the child combines into new things (parts, colours, sounds, tools), so the space of results is far larger than the list of ingredients.',
    play5: 'The child tries combinations no earlier session reached, including ones that only make sense after learning what the parts do.',
  },
  {
    id: 'mastery',
    definition:
      'A physical or rhythmic skill (timing, aim, balance, control) that deepens with practice and has room above what a first try shows.',
    play5: 'The child can do something on play 5 that was out of reach on play 1, and reaches for a harder version on their own.',
  },
  {
    id: 'mystery',
    definition:
      'Something hidden or unexplained that the child works out by poking: cause and effect to infer, secrets in the world, a rule not stated.',
    play5: 'The child arrives already knowing part of the secret and goes after the part they have not found.',
  },
  {
    id: 'other-minds',
    definition:
      'Creatures or characters with their own goals and habits whose behaviour the child has to read and respond to.',
    play5: 'The child knows how each character behaves and plays with or around them differently.',
  },
  {
    id: 'expression',
    definition:
      'The child makes something (marks, structures, songs, paths) and the world responds to what they made.',
    play5: 'The child makes something they could not have made on play 1, with intent, and the world answers it in its own way.',
  },
  {
    id: 'variation',
    definition:
      'Procedural or seeded variety: each session has a different world, layout, deck, or weather that changes what works.',
    play5: 'The world is new in a way that changes what the child does, not just what it looks like.',
  },
  {
    id: 'rule-play',
    definition:
      'A rule of the world the child can bend, invert, or exploit, and then find out what follows from it.',
    play5: 'The child uses the bent rule on purpose to reach something a plain approach could not.',
  },
]

// Idea records. Parallel writers each own one file, so the record is split by
// writer and joined by catalog.ts: drafts (ideators), critiques (critics),
// decisions (the selector, and the lead's replacement swaps).

import type { Engine } from './engines.ts'

export type Lens = 'physical-toy' | 'other'
export type AgeBucket = '2-4' | '5-6' | '7-9' | '10-12'
export type IdeaStatus = 'built' | 'reserve' | 'cut'

export interface IdeaDraft {
  // `<engine>-NN`, assigned inside the ideator's shard.
  id: string
  name: string
  // One line: what the child does and what the world does back.
  loop: string
  // One lowercase word: the primary verb.
  verb: string
  // Whole years 2 to 12, at most 4 wide.
  ageBand: readonly [number, number]
  // Null only for the catalog test fixtures; real ideas always name one.
  engine: Engine | null
  secondaryEngines: readonly Engine[]
  lens: Lens
  // A toy id from toys.ts; required when lens is 'physical-toy'.
  toy: string | null
  // What concretely is different on play 5. Null only in test fixtures.
  play5: string | null
}

export interface Critique {
  id: string
  verdict: 'keep' | 'cut'
  reason: string
}

export interface Decision {
  id: string
  status: IdeaStatus
  cutReason: string | null
  // Kebab-case folder name under lab/protos/, for built ideas.
  protoKey: string | null
  batch: 1 | 2 | 3 | null
  // 1 is the first reserve to promote.
  reserveOrder: number | null
  // For a promoted reserve: the id of the failed idea it replaces.
  replaces: string | null
}

export interface IdeaRecord extends IdeaDraft {
  critique: Critique | null
  decision: Decision | null
}

// The bucket containing the lowest age in an idea's band.
export function ageBucket(band: readonly [number, number]): AgeBucket {
  const lowest = band[0]
  if (lowest <= 4) return '2-4'
  if (lowest <= 6) return '5-6'
  if (lowest <= 9) return '7-9'
  return '10-12'
}

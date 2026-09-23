// One file per engine (`lab/ideas/critiques/<engine>.ts`), each holding the
// critic's keep-or-cut verdict for every idea in the next engine's shard.
// Parallel writers own those files, so this list stays empty until the lead
// adds one import per file and spreads it in, e.g.:
//
//   import { emergence } from './emergence.ts'
//   export const critiques: readonly Critique[] = [...emergence, ...]

import type { Critique } from '../types.ts'

export const critiques: readonly Critique[] = []

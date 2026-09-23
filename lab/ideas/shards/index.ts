// One entry per engine shard (`lab/ideas/shards/<engine>.ts`), each a list of
// 14 idea drafts written by that engine's ideator. Parallel writers own the
// shard files, so this list stays empty until the lead adds one import per
// shard, e.g.:
//
//   import { emergence } from './emergence.ts'
//   export const shards = [emergence, ...]

import type { IdeaDraft } from '../types.ts'

export const shards: readonly (readonly IdeaDraft[])[] = []

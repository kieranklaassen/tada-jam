// One entry per engine shard (`lab/ideas/shards/<engine>.ts`), each a list of
// 14 idea drafts written by that engine's ideator. Parallel writers own the
// shard files; this list imports them all.

import type { IdeaDraft } from '../types.ts'
import { ideas as combination } from './combination.ts'
import { ideas as emergence } from './emergence.ts'
import { ideas as expression } from './expression.ts'
import { ideas as mastery } from './mastery.ts'
import { ideas as mystery } from './mystery.ts'
import { ideas as otherMinds } from './other-minds.ts'
import { ideas as rulePlay } from './rule-play.ts'
import { ideas as variation } from './variation.ts'

export const shards: readonly (readonly IdeaDraft[])[] = [
  emergence,
  combination,
  mastery,
  mystery,
  otherMinds,
  expression,
  variation,
  rulePlay,
]

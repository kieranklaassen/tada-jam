// One file per engine shard (`lab/ideas/critiques/<engine>.ts`), each holding
// a critic's keep-or-cut verdict for every idea in that shard. Parallel
// writers own those files; this list imports them all.

import type { Critique } from '../types.ts'
import { critiques as combination } from './combination.ts'
import { critiques as emergence } from './emergence.ts'
import { critiques as expression } from './expression.ts'
import { critiques as mastery } from './mastery.ts'
import { critiques as mystery } from './mystery.ts'
import { critiques as otherMinds } from './other-minds.ts'
import { critiques as rulePlay } from './rule-play.ts'
import { critiques as variation } from './variation.ts'

export const critiques: readonly Critique[] = [
  ...emergence,
  ...combination,
  ...mastery,
  ...mystery,
  ...otherMinds,
  ...expression,
  ...variation,
  ...rulePlay,
]

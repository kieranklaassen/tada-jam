// Joins the three files that parallel writers own into full idea records.
//
//   drafts      one shard per engine       (ideators; shards/index.ts)
//   critiques   one file per engine        (critics;  critiques/index.ts)
//   decisions   one file                   (selector; decisions.ts)
//
// The join reports what does not line up. It never throws and it keeps a
// record for every draft, so validation can still run on a broken catalog.

import { critiques as critiqueFiles } from './critiques/index.ts'
import { decisions as decisionFile } from './decisions.ts'
import { shards } from './shards/index.ts'
import type { Critique, Decision, IdeaDraft, IdeaRecord } from './types.ts'
import { validate } from './validate.ts'
import type { Problem, ValidateOptions } from './validate.ts'

export interface LoadedCatalog {
  records: IdeaRecord[]
  problems: Problem[]
}

// The plan builds 30 prototypes; loadCatalog validates against that unless told otherwise.
export const EXPECTED_BUILT = 30

// The first item with each id wins; later ones are reported as duplicates.
function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) if (!map.has(item.id)) map.set(item.id, item)
  return map
}

function duplicateProblems(list: string, items: readonly { id: string }[]): Problem[] {
  const counts = new Map<string, number>()
  for (const { id } of items) counts.set(id, (counts.get(id) ?? 0) + 1)
  const problems: Problem[] = []
  for (const [id, count] of counts) {
    if (count > 1) problems.push({ rule: 'join-duplicate-id', id, message: `id appears ${count} times in the ${list}` })
  }
  return problems
}

export function joinCatalog(
  drafts: readonly IdeaDraft[],
  critiqueList: readonly Critique[],
  decisionList: readonly Decision[],
): LoadedCatalog {
  const draftById = indexById(drafts)
  const critiqueById = indexById(critiqueList)
  const decisionById = indexById(decisionList)

  const problems: Problem[] = [
    ...duplicateProblems('drafts', drafts),
    ...duplicateProblems('critiques', critiqueList),
    ...duplicateProblems('decisions', decisionList),
  ]

  for (const id of draftById.keys()) {
    if (!critiqueById.has(id)) problems.push({ rule: 'join-missing-critique', id, message: 'draft has no critique' })
    if (!decisionById.has(id)) problems.push({ rule: 'join-missing-decision', id, message: 'draft has no decision' })
  }
  for (const id of critiqueById.keys()) {
    if (!draftById.has(id)) problems.push({ rule: 'join-orphan-critique', id, message: 'critique has no draft with this id' })
  }
  for (const id of decisionById.keys()) {
    if (!draftById.has(id)) problems.push({ rule: 'join-orphan-decision', id, message: 'decision has no draft with this id' })
  }

  const records = drafts.map((draft): IdeaRecord => ({
    ...draft,
    critique: critiqueById.get(draft.id) ?? null,
    decision: decisionById.get(draft.id) ?? null,
  }))
  return { records, problems }
}

// The real catalog: every shard, critique, and decision, joined and validated.
// Join problems come first, then validator problems.
export function loadCatalog(options: ValidateOptions = { expectedBuilt: EXPECTED_BUILT }): LoadedCatalog {
  const { records, problems } = joinCatalog(shards.flat(), critiqueFiles, decisionFile)
  return { records, problems: [...problems, ...validate(records, options)] }
}

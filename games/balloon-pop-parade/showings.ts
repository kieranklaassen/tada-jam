import { KINDS, type Kind } from './kinds'
import type { Save, Shown } from './save'
import type { Count } from './world'

// The first showing of a new idea (the design sheet's pass-by scene): a troop
// of another kind crosses the scene and does the new move once. There are
// three ideas, each shown one time and then marked in the save. A later idea
// holds the earlier ones, so its showing marks them too, and a child who
// starts further along the order is never shown an idea they are already past.

/** `give`: a balloon goes to a friend of its colour. `each`: one for each friend. `bunch`: a bunch for a whole troop. */
export type Idea = 'give' | 'each' | 'bunch'

/** The troop that passes by, and the marks to set when it starts. */
export type Showing = { idea: Idea; kind: Kind; size: Count; marks: Idea[] }

/** The idea in the world as it stands that has not been shown yet, the furthest one first. */
function ideaDue(save: Save): Idea | null {
  if (!save.shown.bunch && save.sky.some((bunch) => bunch.count > 1)) return 'bunch'
  if (!save.shown.each && save.troop.size > 1) return 'each'
  return save.shown.give ? null : 'give'
}

/**
 * The troop that passes is never the kind on screen, so what is shown is the
 * move and not the answer to the child's own troop, and not the kind that
 * waits at the edge either when another is left, so no kind is on screen twice.
 */
function passingKind(save: Save): Kind {
  const others = KINDS.filter((kind) => kind !== save.troop.kind)
  return others.find((kind) => kind !== save.next.kind) ?? others[0]
}

function showingDue(save: Save): Showing | null {
  const idea = ideaDue(save)
  if (idea === null) return null
  const kind = passingKind(save)
  // The bunch is shown for a troop as large as the child's own, so the bunch that hangs low for it is one the child's sky can hold.
  if (idea === 'bunch') return { idea, kind, size: save.troop.size, marks: ['bunch', 'each', 'give'] }
  if (idea === 'each') return { idea, kind, size: 2, marks: ['each', 'give'] }
  return { idea, kind, size: 1, marks: ['give'] }
}

/**
 * For a save that has never been touched: the idea of the position it starts
 * at, already crossing when the game opens. Once its marks are set this is
 * null on every later visit, so nothing replays on load.
 */
export function showingAtStart(save: Save): Showing | null {
  return showingDue(save)
}

/** For the save as it stands just after the next troop stepped in: the idea that troop or its sky brings, when it is the first of its sort. */
export function showingAtStepIn(save: Save): Showing | null {
  return showingDue(save)
}

/** The marks after a showing started. A mark is set once and never taken back. */
export function markShown(shown: Shown, marks: readonly Idea[]): Shown {
  return { give: shown.give || marks.includes('give'), each: shown.each || marks.includes('each'), bunch: shown.bunch || marks.includes('bunch') }
}

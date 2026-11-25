import type { Kind } from './row'

// The customers: how long each is, how thick along its length, and what it
// thinks of the three measures. None of it ever changes.

export type Who = 'croc' | 'dog' | 'snail' | 'seal' | 'python'
export const WHO: readonly Who[] = ['croc', 'dog', 'snail', 'seal', 'python']

/** How the customer takes a piece held out to it. */
export type Turn = 'lick' | 'gulp' | 'gasp' | 'poke' | 'spit' | 'chew' | 'kiss' | 'sneeze' | 'shut' | 'search' | 'hat' | 'stiff' | 'bark' | 'balance' | 'cross'

export type Customer = {
  length: number
  loves: Kind
  hates: Kind
  turn: Record<Kind, Turn>
  /** Voice pitch, as a factor. */
  pitch: number
  /** Half thickness at shares of the length from neck to tail tip. */
  shape: readonly number[]
}

export const CAST: Record<Who, Customer> = {
  croc: { length: 720, loves: 'sausage', hates: 'duck', turn: { sausage: 'lick', shoe: 'sneeze', duck: 'stiff' }, pitch: 0.62, shape: [56, 68, 72, 70, 60, 46, 34, 24, 12] },
  dog: { length: 432, loves: 'shoe', hates: 'sausage', turn: { sausage: 'gasp', shoe: 'chew', duck: 'bark' }, pitch: 1.1, shape: [52, 58, 56, 54, 55, 50, 22, 14, 8] },
  snail: { length: 360, loves: 'duck', hates: 'shoe', turn: { sausage: 'poke', shoe: 'shut', duck: 'hat' }, pitch: 1.5, shape: [44, 48, 48, 46, 42, 36, 28, 18, 8] },
  seal: { length: 540, loves: 'shoe', hates: 'sausage', turn: { sausage: 'spit', shoe: 'kiss', duck: 'balance' }, pitch: 0.85, shape: [50, 64, 74, 72, 62, 50, 36, 26, 30] },
  python: { length: 828, loves: 'sausage', hates: 'shoe', turn: { sausage: 'gulp', shoe: 'search', duck: 'cross' }, pitch: 0.75, shape: [38, 46, 52, 50, 48, 46, 40, 28, 10] },
}

export const lengthOf = (who: readonly Who[]): number => who.reduce((n, w) => n + CAST[w].length, 0)

/** Two fit on the table together only with room to spare behind them. */
export const MOST_TOGETHER = 864

/** Half the customer's thickness at `x` from its neck. */
export function girth(who: Who, x: number): number {
  const { shape, length } = CAST[who]
  const at = Math.max(0, Math.min(1, x / length)) * (shape.length - 1), i = Math.min(shape.length - 2, Math.floor(at))
  return shape[i] + (shape[i + 1] - shape[i]) * (at - i)
}

/** Half the thickness along whoever lies on the table, and nothing past the last tail. */
export function girthOf(on: readonly Who[], x: number): number {
  let from = 0
  for (const w of on) {
    if (x < from + CAST[w].length) return girth(w, x - from)
    from += CAST[w].length
  }
  return 0
}

/** Who each place in the designed order lays out. */
export const PARTY: Record<string, readonly Who[]> = {
  'croc-alone': ['croc'],
  'dog-shorter': ['dog'],
  'snail-in-ducks': ['snail'],
  'seal-in-shoes': ['seal'],
  'python-mixed': ['python'],
  'snails-share': ['snail', 'snail'],
  'dog-and-snail': ['dog', 'snail'],
}
/** The customers and pairs of the full shop, in turn. */
export const ROUND: readonly (readonly Who[])[] = [['croc'], ['seal'], ['dog', 'dog'], ['python'], ['snail'], ['dog', 'snail'], ['croc'], ['dog'], ['snail', 'snail']]

/** The trays that are torn open when somebody lies down. */
export function needs(on: readonly Who[]): Kind[] {
  const k: Kind[] = ['sausage']
  if (on.includes('snail') || on.length > 1) k.push('duck')
  if (on.includes('seal')) k.push('duck', 'shoe')
  if (on.includes('python')) k.push('duck', 'shoe')
  return k
}

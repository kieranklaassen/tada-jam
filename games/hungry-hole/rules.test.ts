import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { KINDS, type Kind } from './kinds'
import { burped, swallowed, takes } from './rules'
import { STOCK } from './street'

describe('the three rules', () => {
  it('let an empty hole take a pie, or a stack standing on a pie, and nothing else', () => {
    for (const kind of KINDS) {
      expect(takes([], [kind]), kind).toBe(kind === 'pie')
      expect(takes([], [kind, 'pie']), `${kind} under a pie`).toBe(kind === 'pie')
      expect(takes([], ['pie', kind]), `a pie under ${kind}`).toBe(true)
    }
    expect(takes([], [])).toBe(false)
  })

  it('take a stack by its bottom thing, however wide the things on it are', () => {
    expect(takes(['pie'], ['hat', 'drummer'])).toBe(true)
    expect(takes(['pie'], ['drummer', 'hat'])).toBe(false)
  })

  it('swallow a stack bottom first, and burp the last thing in up underneath what rides', () => {
    expect(swallowed(['pie'], ['dog', 'hat'])).toEqual(['pie', 'dog', 'hat'])
    expect(burped(['pie', 'dog', 'hat'], [])).toEqual({ belly: ['pie', 'dog'], breath: ['hat'] })
    expect(burped(['pie', 'dog'], ['hat'])).toEqual({ belly: ['pie'], breath: ['dog', 'hat'] })
    expect(burped([], ['hat'])).toBeNull()
  })
})

// Every state a street can reach, and in each of them: is the child stuck?
//
// The walk below is wider than the game. It lets a hole that holds anything take whatever it is offered, where the
// game asks the mouth to be wide enough, and it tells the things apart only by whether an empty hole takes them
// (a pie) or not (everything else). Both make the walk reach more: every move the game allows is a move here, since
// a move the game refuses is only ever refused for width, and what an empty hole takes depends on nothing but
// whether the bottom thing is a pie. So every state the game can reach is one of the states walked, and what holds
// in all of these holds in all of those.
type State = { belly: string; breath: string; street: string[] }

const letterOf = (kind: Kind): string => (takes([], [kind]) ? 'p' : 'x')
const kindsOf = (letters: string): Kind[] => [...letters].map((letter) => (letter === 'p' ? 'pie' : 'hat'))
const keyOf = (state: State): string => `${state.belly}|${state.breath}|${[...state.street].sort().join(',')}`

function movesFrom(state: State): State[] {
  const next: State[] = []
  const belly = kindsOf(state.belly)
  // The hole takes a thing or a stack: always when it holds something, and by the game's own rule when it is empty.
  state.street.forEach((stack, index) => {
    if (belly.length === 0 && !takes([], kindsOf(stack))) return
    next.push({ belly: state.belly + stack, breath: state.breath, street: state.street.filter((_, other) => other !== index) })
  })
  // A burp.
  const up = burped(belly, kindsOf(state.breath))
  if (up) next.push({ belly: state.belly.slice(0, -1), breath: state.belly[state.belly.length - 1] + state.breath, street: state.street })
  // The hole moves away and the riding stack stands on the street. When that stack is the whole street, the float goes out and the street is over.
  if (state.breath && !(state.belly === '' && state.street.length === 0)) next.push({ belly: state.belly, breath: '', street: [...state.street, state.breath] })
  return next
}

function walk(stock: readonly Kind[]): { states: number; stuck: string[]; noPie: string[] } {
  const start: State = { belly: '', breath: '', street: stock.map(letterOf) }
  const seen = new Set<string>([keyOf(start)])
  const todo: State[] = [start]
  const stuck: string[] = [], noPie: string[] = []
  while (todo.length > 0) {
    const state = todo.pop()!
    const moves = movesFrom(state)
    const whole = state.belly === '' && state.street.length === 0
    if (moves.length === 0 && !whole) stuck.push(keyOf(state))
    if (state.belly === '') {
      // An empty hole: on the street there is a pie or a stack standing on one, or such a stack rides on the breath and is one move from standing there.
      const fits = state.breath ? state.breath[0] === 'p' : state.street.some((stack) => stack[0] === 'p')
      if (!fits) noPie.push(keyOf(state))
    }
    for (const move of moves) {
      const key = keyOf(move)
      if (!seen.has(key)) { seen.add(key); todo.push(move) }
    }
  }
  return { states: seen.size, stuck, noPie }
}

describe('from every state a street can reach', () => {
  for (const id of LADDER) {
    it(`an empty hole on the ${id} street finds a pie, or a stack standing on a pie, and the child is never stuck`, () => {
      const found = walk(STOCK[id])
      expect(found.states).toBeGreaterThan(1000)
      expect(found.noPie).toEqual([])
      expect(found.stuck).toEqual([])
    })
  }

  it('the walk would find a stuck child if the rule were the other one: a stack as wide as its widest part', () => {
    // Three pies and a hat burped in a row and set down as one stack: with the widest part deciding, nothing fits an empty hole.
    const widest: State = { belly: '', breath: '', street: ['x'] }
    expect(movesFrom(widest)).toEqual([])
  })
})

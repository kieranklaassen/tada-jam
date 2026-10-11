import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ACTS, ACT_IDS, type ActId } from './acts'
import { walkEverything } from './finger'
import type { Game } from './game'
import { SHOWN, isShown } from './shown'

// One timeline: every sound is queued with the name of what is drawn making it (game.ts), shown.ts says when that
// is drawn, and the view draws from the same values. This walks every cell of the grid, the bare hand and every
// scene (finger.ts), looks at the game at each moment a frame would be drawn, and fails when a sound is heard
// while its maker is not shown making it. Then it reads the view's source and fails when the view does not read
// a value a channel stands on, or does not draw an act that sounds.

describe('nothing is only heard', () => {
  const lone: string[] = [], acted = new Set<ActId>(), channels = new Set<string>()
  let sounds = 0, phases = new Set<string>(), scenes = new Set<string>()
  function watch(game: Game): void {
    for (const heard of game.takeHeard()) {
      sounds += 1
      channels.add(heard.by)
      if (heard.act) acted.add(heard.act)
      if (!isShown(game, heard)) lone.push(`${JSON.stringify(heard.sound)} by ${heard.by}${heard.act ? ` in ${heard.act}` : ''} at ${game.time.toFixed(2)}`)
    }
    for (const actor of [game.teddy, game.duck, game.cat, game.lampFx, game.tub]) if (actor.act) acted.add(actor.act.id)
    phases.add(game.rec.phase)
    if (game.sceneId) scenes.add(game.sceneId)
  }

  it('walks every cell of the grid, the hand and every scene with a sound only where its maker is drawn making it', () => {
    walkEverything(watch)
    expect(sounds).toBeGreaterThan(500)
    expect(lone).toEqual([])
  })

  it('reached every act, every channel, every phase and every scene on the way, so none of them went unwalked', () => {
    expect(ACT_IDS.filter((id) => !acted.has(id))).toEqual([])
    expect(Object.keys(SHOWN).filter((by) => !channels.has(by))).toEqual([])
    expect([...phases].sort()).toEqual(['evening', 'morning', 'night'])
    expect([...scenes].sort()).toEqual(['asleep', 'catWalk', 'comingIn', 'garden'])
  })

  it('draws from every value a channel stands on, and from every act that sounds', () => {
    const view = readFileSync(new URL('./view.ts', import.meta.url), 'utf8')
    for (const [by, row] of Object.entries(SHOWN)) expect(view, by).toMatch(new RegExp(`\\b${row.reads}\\b`))
    // An act with a sound is drawn from its own clock: the view names it.
    for (const id of ACT_IDS) if (ACTS[id].cues.length > 0) expect(view, id).toContain(`'${id}'`)
  })
})

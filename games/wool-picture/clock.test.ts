import { describe, expect, it } from 'vitest'

// One clock for sight and sound. Everything the game shows and plays is read
// from the toy's own clock (toy.ts). The game's own modules therefore name no
// other clock and set no timer; the files copied from the template keep the
// frame loop, the attended clock and the audio context, which only carry the
// toy's time and its notes.

const sources = import.meta.glob('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** The game's own modules: everything it draws, moves and sounds with. */
const OWN = ['acts', 'buses', 'calls', 'carry', 'cast', 'felted', 'fixtures', 'folk', 'folkArt', 'folkDraw', 'game', 'hands', 'hint', 'layout', 'life', 'lit', 'patches', 'room', 'save', 'scenes', 'sky', 'toy', 'view', 'voices', 'wall', 'weather', 'wool']
const OTHER_CLOCKS = /setTimeout|setInterval|Date\.now|new Date|performance\.now|requestAnimationFrame|currentTime|timeStamp/

describe('the one clock', () => {
  it('is the only clock the game\'s own modules know', () => {
    for (const name of OWN) {
      const source = sources[`./${name}.ts`]
      expect(source, `${name}.ts is one of the game's modules`).toBeTypeOf('string')
      expect(OTHER_CLOCKS.exec(source)?.[0], `${name}.ts`).toBeUndefined()
    }
  })

  it('is handed to the view and to the sounds by the Mount, which keeps no clock of its own for either', () => {
    const mount = sources['./wool-picture.tsx']
    // The Mount advances the toy by the attended clock's step and draws from the toy.
    expect(mount).toMatch(/game\.advance\(playing\.step\)/)
    expect(sources['./game.ts']).toMatch(/this\.toy\.advance\(seconds\)/)
    // Its only other uses of a clock are the template's: the save throttle and the measure of its own work.
    const uses = mount.split('\n').filter((line) => /performance\.now|timeStamp/.test(line) && !line.trim().startsWith('//'))
    for (const line of uses) expect(line, line.trim()).toMatch(/cadence|lastWork|const start|touch\.|overlay\./)
    expect(mount).not.toMatch(/setTimeout|setInterval|Date\.now|currentTime/)
  })
})

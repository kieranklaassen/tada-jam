import { describe, expect, it } from 'vitest'
import type { Voice } from './audio'
import { Bus } from './bus'
import { CAT, POT } from './layout'
import { MID, PAPER_MID, coloured, heard, saved, savedAt, tap } from './rehearsal'
import type { Save } from './save'
import { STEP, Toy } from './toy'
import { everyVoice } from './voices'

const sources = import.meta.glob<string>('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })
const pages = import.meta.glob<string>('./*.md', { query: '?raw', import: 'default', eager: true })

// The files of the template keep their own time for what is neither sight nor sound of the game: the audio
// unlock, the attended clock, the frame budget, the save throttle, the touch slop and the grown-up overlay.
const TEMPLATE = ['attention', 'audio', 'guidance', 'input', 'overlay', 'perf', 'quality', 'saveCadence', 'scene', 'stage', 'state', 'rng', 'config', 'manifest', 'index']
const own = Object.entries(sources).filter(([path]) => !path.endsWith('.test.ts') && !path.endsWith('.tsx') && !TEMPLATE.includes(path.slice(2, -3)))
const tests = Object.entries(sources).filter(([path]) => path.endsWith('.test.ts'))

describe('one clock for sight and sound', () => {
  it('plays the same sights and sounds from the same seed and the same touches, however the seconds are cut up', () => {
    const run = (cut: number): { sounds: string; save: Save; cat: unknown; bird: unknown; show: unknown } => {
      const toy = new Toy(savedAt('finger'), 7)
      const sounds: unknown[] = []
      const go = (seconds: number): void => {
        for (let i = 0; i < Math.round(seconds / cut); i++) {
          toy.step(cut)
          sounds.push(...heard(toy))
        }
      }
      tap(toy, MID.x, MID.y)
      go(1)
      tap(toy, POT.x, POT.ys[1])
      go(0.5)
      tap(toy, CAT.paws[0].x, CAT.paws[0].y)
      go(2)
      tap(toy, PAPER_MID.x, PAPER_MID.y)
      go(7.5)
      sounds.push(...heard(toy))
      return { sounds: JSON.stringify(sounds), save: toy.toSave(), cat: { ...toy.cat.pose }, bird: { ...toy.bird.pose }, show: JSON.parse(JSON.stringify(toy.show)) }
    }
    const whole = run(STEP), halves = run(STEP / 2), thirds = run(STEP / 3)
    for (const other of [halves, thirds]) {
      expect(other.sounds).toBe(whole.sounds)
      expect(other.save).toEqual(whole.save)
      expect(other.cat).toEqual(whole.cat)
      expect(other.bird).toEqual(whole.bird)
      expect(other.show).toEqual(whole.show)
    }
    expect(whole.sounds.length).toBeGreaterThan(200)
  })

  it('names no clock and no chance of its own in any file that moves or sounds the game', () => {
    const CLOCKS = /setTimeout|setInterval|Date\.now|new Date|performance\.|requestAnimationFrame|requestIdleCallback|currentTime|Math\.random|timeStamp/
    expect(own.map(([path]) => path)).toEqual(expect.arrayContaining(['./toy.ts', './tray.ts', './cat.ts', './bird.ts', './voices.ts', './view.ts', './catArt.ts', './art.ts', './backdrop.ts', './spring.ts', './hint.ts', './scenes.ts', './hands.ts', './bus.ts', './marble.ts', './water.ts', './ink.ts']))
    for (const [path, text] of own) expect(text.match(CLOCKS)?.[0], path).toBeUndefined()
  })

  it('hides no wait inside a voice: no note of any voice starts later than its voice, and no file but the template\'s player names one', () => {
    for (const voice of everyVoice()) for (const note of voice) expect('delay' in note).toBe(false)
    for (const [path, text] of Object.entries(sources)) {
      if (path.endsWith('.test.ts') || path === './audio.ts') continue
      expect(text.match(/\bdelay\b/)?.[0], path).toBeUndefined()
    }
  })

  it('is stepped by the Mount with the attended clock\'s step alone, and sounded only from what the game queued', () => {
    const mount = sources['./wet-paint.tsx']
    expect(mount.match(/toy\.step\(([^)]*)\)/g)).toEqual(['toy.step(playing.step)'])
    expect(mount).toContain('playing.step = clock.advance(now)')
    expect(mount.match(/audio\.play\(/g)).toHaveLength(1)
    expect(mount).toContain('const sounds = toy.takeSounds(), voices: Voice[] = []')
    expect(mount.match(/setTimeout|setInterval|Date\.now|new Date|currentTime/)).toBeNull()
    // What a touch does goes through hands.ts, where it is tested, and nowhere else.
    expect(mount.match(/toy\.(press|move|release)\(/)).toBeNull()
    expect(mount.match(/hands\.take\(/g)).toHaveLength(1)
    expect(mount.match(/ladder\.touch\(/)).toBeNull()
  })
})

/** A stand-in for the audio graph: gains that remember what they are joined to. */
function graph() {
  const made: { gain: { value: number }; to: unknown[]; cut: boolean }[] = []
  const context = {
    createGain: () => {
      const node = { gain: { value: 1 }, to: [] as unknown[], cut: false, connect(to: unknown) { node.to.push(to) }, disconnect() { node.cut = true } }
      made.push(node)
      return node
    },
  } as unknown as AudioContext
  return { context, made, out: { name: 'out' } as unknown as AudioNode }
}

describe('sound that is cut off', () => {
  it('sends a scene\'s sounds through a bus of their own inside the bus of every sound', () => {
    const { context, made, out } = graph()
    const every = new Bus(), scene = new Bus(every)
    const reached: AudioNode[] = []
    const voice: Voice = (_, to) => { reached.push(to) }
    every.through(voice)(context, out, 0)
    scene.through(voice)(context, out, 0)
    expect(made).toHaveLength(2)
    expect(reached[0]).toBe(made[0])
    expect(reached[1]).toBe(made[1])
    expect(made[0].to).toEqual([out])
    expect(made[1].to).toEqual([made[0]])
    // The same bus again makes no new gain.
    scene.through(voice)(context, out, 0)
    expect(made).toHaveLength(2)
  })

  it('silences what rings on a closed bus at once and for good, and gives the next sound a new one', () => {
    const { context, made, out } = graph()
    const every = new Bus(), scene = new Bus(every)
    const voice: Voice = () => {}
    every.through(voice)(context, out, 0)
    scene.through(voice)(context, out, 0)
    scene.close()
    expect(made[1]).toMatchObject({ gain: { value: 0 }, cut: true })
    expect(made[0]).toMatchObject({ gain: { value: 1 }, cut: false })
    scene.through(voice)(context, out, 0)
    expect(made).toHaveLength(3)
    expect(made[2].gain.value).toBe(1)
    expect(made[2].to).toEqual([made[0]])
    // Put away: every sound's bus closes, and the scene's inside it.
    scene.close()
    every.close()
    expect(made[0]).toMatchObject({ gain: { value: 0 }, cut: true })
    expect(made[2]).toMatchObject({ gain: { value: 0 }, cut: true })
    // The next visit's first sound gets new ones.
    scene.through(voice)(context, out, 0)
    expect(made).toHaveLength(5)
    // Closing a bus that never sounded does nothing.
    new Bus().close()
  })

  it('closes the scene\'s bus in the frame a touch ends a scene, before that frame\'s sounds are played, and both at put-away', () => {
    const mount = sources['./wet-paint.tsx']
    const hush = mount.indexOf('if (sounds.hush) sceneSound.close()'), played = mount.indexOf('audio.play(')
    expect(hush).toBeGreaterThan(0)
    expect(hush).toBeLessThan(played)
    const away = mount.slice(mount.indexOf('const putAway = () => {'), mount.indexOf('const at = (event: PointerEvent)'))
    expect(away).toContain('act(touch.clear())')
    expect(away).toContain('hands.putAway(toy, ladder, clock.seconds, seedOf(window.location.search))')
    expect(away).toContain('view.rest()')
    expect(away).toContain('sceneSound.close()')
    expect(away).toContain('everySound.close()')
    expect(away).toContain('cadence.settle(performance.now())')
    expect(away.indexOf('act(touch.clear())')).toBeLessThan(away.indexOf('hands.putAway'))
    // Both ways out go through it: unattended or hidden, and unmounted.
    expect(mount.match(/\bputAway\(\)/g)).toHaveLength(2)
    // The game itself marks the hush: a touch on a playing scene, and a put-away.
    const toy = new Toy(savedAt('soap'), 3)
    coloured(toy)
    tap(toy, PAPER_MID.x, PAPER_MID.y)
    toy.step(1)
    toy.takeSounds()
    toy.press(1100, 800)
    expect(toy.takeSounds().hush).toBe(true)
    toy.release('tap')
    expect(toy.takeSounds().hush).toBe(false)
  })
})

describe('the rules kept by hand, held by a scan', () => {
  it('reads the child\'s age in one place, to choose where a first visit starts, and nowhere while playing', () => {
    const readers = Object.entries(sources).filter(([path, text]) => !path.endsWith('.test.ts') && /childAge/.test(text.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''))).map(([path]) => path).sort()
    expect(readers).toEqual(['./save.ts', './state.ts', './wet-paint.tsx'])
    expect(sources['./wet-paint.tsx'].match(/childAge/g)).toHaveLength(2)
    expect(sources['./wet-paint.tsx']).toContain('deserialize(value, ctxRef.current.childAge)')
    // The age changes which tools lie there on a first visit, and nothing else about the game.
    const young = new Toy(saved(), 1), old = new Toy(saved({ position: 'soap' }), 1)
    expect(young.tools).toEqual([])
    expect(old.tools).toEqual(['comb', 'straw', 'soap'])
    for (const toy of [young, old]) {
      tap(toy, MID.x, MID.y)
      expect(toy.inked).toBe(true)
    }
  })

  it('has no test that writes a file or reads the environment', () => {
    expect(tests.length).toBeGreaterThan(20)
    // Spelled in pieces, so this file does not find itself.
    const FORBIDDEN = new RegExp(['process' + '\\.env', 'node' + ':', "from 'f" + "s'", 'write' + 'File', 'read' + 'File', 'mk' + 'dir', 'child' + '_process'].join('|'))
    for (const [path, text] of tests) expect(text.match(FORBIDDEN)?.[0], path).toBeUndefined()
  })

  it('names no web address anywhere, and no machine path in the two pages', () => {
    for (const [path, text] of [...Object.entries(sources), ...Object.entries(pages)]) expect(text.match(new RegExp('ht' + 'tps?:|w' + 'ww\\.'))?.[0], path).toBeUndefined()
    expect(Object.keys(pages).sort()).toEqual(['./ART.md', './REFINEMENT.md'])
    for (const [path, text] of Object.entries(pages)) expect(text.match(new RegExp(['/ho' + 'me/', '/t' + 'mp/', 'scr' + 'atch', 'work' + 'tree', '/ro' + 'ot/'].join('|')))?.[0], path).toBeUndefined()
  })

  it('keeps the helpers of the tests out of the game: no file of the game reads the rehearsal or the recording', () => {
    for (const [path, text] of Object.entries(sources)) {
      if (path.endsWith('.test.ts') || path === './rehearsal.ts' || path === './recording.ts') continue
      expect(text.match(/from '\.\/(rehearsal|recording)'/)?.[0], path).toBeUndefined()
    }
  })
})

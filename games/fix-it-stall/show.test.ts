import { describe, expect, it } from 'vitest'
import { Scene, followedBy, sceneLength } from './scene'
import { atRest, changeOverScene, handBackScene, laidBackScene, LENGTH, neatWayScene, settled, type Show } from './show'

const play = (_show: Show, beats: ReturnType<typeof handBackScene>, until = Infinity) => {
  const scene = new Scene(beats)
  let saved = 0
  scene.start(0, () => { saved++ })
  for (let t = 0; t <= Math.min(until, sceneLength(beats) + 0.1); t += 1 / 60) scene.update(t)
  return { scene, saved }
}

describe('the scenes', () => {
  it('last 4 to 10 seconds, the hand-back and the neat way together too; the change of customers is short', () => {
    for (const seconds of [LENGTH.handBack, LENGTH.laidBack, LENGTH.neatWay]) {
      expect(seconds).toBeGreaterThanOrEqual(4)
      expect(seconds).toBeLessThanOrEqual(10)
    }
    expect(LENGTH.changeOver).toBeLessThan(2)
    expect(sceneLength(followedBy(handBackScene(atRest(), 'x'), neatWayScene(atRest())))).toBeCloseTo(LENGTH.handBack + LENGTH.neatWay, 6)
    expect(sceneLength(handBackScene(atRest(), 'x'))).toBeCloseTo(LENGTH.handBack, 6)
    expect(sceneLength(laidBackScene(atRest(), 'x'))).toBeCloseTo(LENGTH.laidBack, 6)
  })

  it('save their outcome once, before the first beat', () => {
    const show = atRest()
    const scene = new Scene(handBackScene(show, 'owl-settles-in-the-glow'))
    let order = ''
    scene.start(0, () => { order += show.take === 0 && show.act === null ? 'saved-first' : 'late' })
    expect(order).toBe('saved-first')
  })

  it('the hand-back ends as a load of its outcome begins: gadget in hand, shut, running, the reaction played out', () => {
    const show = atRest()
    play(show, handBackScene(show, 'owl-settles-in-the-glow'))
    expect(show).toEqual(settled('owl-settles-in-the-glow', false))
    const both = atRest()
    play(both, followedBy(handBackScene(both, 'owl-settles-in-the-glow'), neatWayScene(both)))
    expect(both).toEqual(settled('owl-settles-in-the-glow', true))
  })

  it('a touch at any moment leaves the same end: the scene is never a different outcome for being cut short', () => {
    for (const cut of [0, 0.3, 1, 2.5, 5, 7, 9]) {
      const show = atRest()
      const { scene } = play(show, followedBy(handBackScene(show, 'yak-wilts'), neatWayScene(show)), cut)
      scene.finish()
      expect(show, `cut at ${cut}`).toEqual(settled('yak-wilts', true))
    }
  })

  it('the hand-back that does not run ends where it began, whenever it is cut short', () => {
    for (const cut of [0, 0.5, 2, 3.4, 4.3, 10]) {
      const show = atRest()
      const { scene } = play(show, laidBackScene(show, 'owl-tries-it-twice-and-lays-it-back'), cut)
      scene.finish()
      expect(show, `cut at ${cut}`).toEqual(atRest())
    }
  })

  it('the change of customers starts from nothing in anyone\'s hands and ends at rest', () => {
    const show = settled('moth-droops', true)
    const { scene } = play(show, changeOverScene(show), 0.5)
    expect(show.walk).toBeGreaterThan(0)
    expect(show.walk).toBeLessThan(1)
    expect({ ...show, walk: 1 }).toEqual(atRest())
    scene.finish()
    expect(show).toEqual(atRest())
  })

  it('the gadget is taken before its lid is shut, shut before it is switched on, and switched on before the reaction', () => {
    const show = atRest()
    const scene = new Scene(handBackScene(show, 'x'))
    scene.start(0, () => {})
    const seen: string[] = []
    for (let t = 0; t <= LENGTH.handBack; t += 1 / 60) {
      scene.update(t)
      if (show.take >= 1 && !seen.includes('taken')) seen.push('taken')
      if (show.lid >= 1 && !seen.includes('shut')) seen.push('shut')
      if (show.on >= 1 && !seen.includes('on')) seen.push('on')
      if (show.react > 0.5 && !seen.includes('reacting')) seen.push('reacting')
    }
    expect(seen).toEqual(['taken', 'shut', 'on', 'reacting'])
  })
})

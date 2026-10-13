import { describe, expect, it } from 'vitest'
import { BALL, ICICLE, ON_BANK_Y, restOf, type Kind, type Rest } from './blocks'
import { AT, AT_NIGHT } from './cast'
import { BERRY, firstWorld } from './first'
import { BLOCK_H, SUN, SUN_PULL } from './ground'
import { MOST_LAMPS } from './night'
import { bare, carry, copy, cut, drag, faults, letGo, names, press, pullSun, run, toMorning, toNight } from './testing'
import { Toy, type World } from './toy'
import { NOSE_UP } from './toyKids'
import { DUSK_S, MORNING_S } from './toyScenes'

const row = (n: number): number => ON_BANK_Y - n * BLOCK_H
const on = (kind: Kind, len: number, x: number, n: number): Rest => restOf(kind, len, x, row(n), 'built')
/** Two posts and a lintel, so the night has one hung lamp and a seat for the king. */
const gate = (): Rest[] => [on('clear', 64, 400, 0), on('clear', 64, 560, 0), on('clear', 224, 480, 1)]
const palace = (more: Rest[] = [], night = false): World => ({ ...bare(night), blocks: [{ ...BERRY }, ...gate(), ...more] })

describe('the sun is the handle of the day', () => {
  it('goes back up when it is let go above the ridge: no scene, and it is still day', () => {
    const toy = new Toy(palace(), 1)
    drag(toy, SUN.x, SUN.day, SUN.x, SUN_PULL.down - 20, 6)
    letGo(toy)
    expect(toy.sceneRunning).toBe(false)
    run(toy, 2)
    expect(toy.sunY).toBe(SUN.day)
    expect(toy.world().night).toBe(false)
  })

  it('dusk saves its whole outcome when it starts, and moves no block', () => {
    const toy = new Toy(palace(), 1)
    const before = toy.world()
    toy.takeChanged()
    pullSun(toy, true)
    expect(toy.sceneRunning).toBe(true)
    expect(toy.takeChanged()).toBe('now')
    expect(toy.world()).toEqual({ ...before, night: true })
    run(toy, DUSK_S + 3)
    expect(toy.sceneRunning).toBe(false)
    expect(toy.world()).toEqual({ ...before, night: true })
  })

  it('dusk plays its beats in order: the flood, a lamp lit for each as it is hung, then the king walks in and sits on the highest block that will bear him', () => {
    const toy = new Toy(palace(), 1)
    pullSun(toy, true)
    toy.takeSounds()
    run(toy, 1.7)
    expect(toy.flood).toBe(1)
    expect(toy.sunY).toBe(SUN.night)
    expect(names(toy)).toContain('yawn')
    expect(toy.lampsLit).toBe(0)
    run(toy, 3.4)
    const heard = names(toy)
    expect(heard.filter((n) => n === 'lampLit')).toHaveLength(2)
    expect(heard).toContain('bell')
    expect(toy.nightNow.lamps).toHaveLength(2)
    expect(toy.king.sat).toBe(0)
    run(toy, DUSK_S)
    expect(names(toy)).toContain('oomph')
    const lintel = toy.pieces.find((p) => p.len === 224)!
    expect(toy.king).toMatchObject({ where: 'seat', seat: lintel.id, sat: 1, x: 480, y: row(1) - BLOCK_H / 2, behind: false })
    // The scene left the lamp child on the front snow; by now it has gone round the bank's end to the lowest lit clear block.
    expect(toy.kids.lamp).toMatchObject({ x: 400, y: row(0) + NOSE_UP, behind: true })
    expect(toy.kids.peeper).toMatchObject({ ...AT_NIGHT.peeper })
  })

  it('a touch ends dusk at once with every beat landed, without a sound of the scene, and is then an ordinary touch', () => {
    const toy = new Toy(palace(), 1)
    pullSun(toy, true)
    toy.takeSounds()
    run(toy, 0.8)
    const during = toy.takeSounds()
    expect(during.length).toBeGreaterThan(0)
    expect(during.every((sound) => sound.scene)).toBe(true)
    press(toy, 500, 668)
    expect(toy.takeHush()).toBe(true)
    expect(toy.sceneRunning).toBe(false)
    expect(toy).toMatchObject({ flood: 1, sunY: SUN.night, lampsLit: MOST_LAMPS })
    expect(toy.king).toMatchObject({ where: 'seat', sat: 1, path: [] })
    expect(toy.kids).toEqual({ lamp: { ...AT_NIGHT.lamp, up: 1, behind: false }, peeper: { ...AT_NIGHT.peeper, up: 1 } })
    // The touch itself is heard, and nothing of the scene is.
    const heard = toy.takeSounds()
    expect(heard.map((sound) => sound.name)).toEqual(['bite'])
    expect(heard.some((sound) => sound.scene)).toBe(false)
    expect(toy.cut).not.toBeNull()
    letGo(toy)
    run(toy, 3)
    expect(names(toy)).toEqual([])
  })

  it('morning saves its whole outcome when it starts: a whole pond, a full drift and bough, a cap on every block under open sky, and what floated or was frozen in lying on the ice', () => {
    const start: World = {
      night: true, drift: 5, icicles: [1, 3],
      blocks: [{ ...BERRY, x: 600, y: 700, place: 'afloat' }, ...gate(), on('snow', 100, 700, 0), restOf('icicle', ICICLE, 480, row(2), 'built'), restOf('icicle', ICICLE, 420, 640, 'frozen'), restOf('ball', BALL, 300, 660, 'afloat')],
      holes: [{ x: 600, y: 700, angle: 0, len: 120 }, { x: 300, y: 660, angle: 0.3, len: 80 }],
    }
    const toy = new Toy(start, 1)
    toy.takeChanged()
    pullSun(toy, false)
    expect(toy.takeChanged()).toBe('now')
    const saved = copy(toy.world())
    expect(saved).toMatchObject({ night: false, holes: [], drift: 0, icicles: [] })
    expect(saved.blocks.filter((b) => b.place === 'afloat' || b.place === 'frozen')).toEqual([])
    // The snow block stands under open sky; the posts stand under the lintel, and the lintel under an icicle.
    expect(saved.blocks.filter((b) => b.cap).map((b) => b.len)).toEqual([100])
    expect(faults(saved)).toEqual([])
    run(toy, MORNING_S + 3)
    expect(toy.world()).toEqual(saved)
    expect(toy).toMatchObject({ flood: 0, sunY: SUN.day, lampsLit: 0, driftShown: 0, iciclesShown: [] })
    expect(toy.holes).toHaveLength(0)
    expect(toy.king).toMatchObject({ where: 'home', x: AT.king.x, y: AT.king.y, sat: 0 })
    expect(toy.pieces.every((p) => p.mode === 'rest' && p.x === p.rest.x && p.y === p.rest.y)).toBe(true)
  })

  it('a touch ends morning with every beat landed, and nothing of it is heard after', () => {
    const toy = new Toy(palace([], true), 1)
    pullSun(toy, false)
    run(toy, 0.5)
    const saved = copy(toy.world())
    toy.takeSounds()
    press(toy, 590, 40)
    expect(toy.takeHush()).toBe(true)
    expect(toy).toMatchObject({ flood: 0, sunY: SUN.day, lampsLit: 0, snowing: 0 })
    expect(toy.kids).toEqual({ lamp: { ...AT.lamp, up: 0, behind: false }, peeper: { ...AT.peeper, up: 0 } })
    expect(toy.king).toMatchObject({ where: 'home', x: AT.king.x, sat: 0 })
    expect(names(toy)).toEqual(['flake'])
    letGo(toy)
    run(toy, 3)
    expect(names(toy)).toEqual([])
    expect(toy.world()).toEqual(saved)
  })

  it('a whole day and night and morning leaves a palace that still stands, with nothing covering anything', () => {
    const toy = new Toy(firstWorld(null), 3)
    cut(toy, 380, 720, 520, 700)
    carry(toy, 560, 606, 420, 300)
    toNight(toy)
    cut(toy, 700, 720, 800, 700)
    toMorning(toy)
    expect(toy.world().night).toBe(false)
    expect(faults(toy.world())).toEqual([])
    expect(toy.pieces.filter((p) => p.rest.place === 'built').length).toBe(3)
  })
})

describe('at night', () => {
  it('opens as it was left: lamps lit, the king seated, no scene, and not a sound', () => {
    const toy = new Toy(palace([], true), 1)
    expect(toy.sceneRunning).toBe(false)
    expect(toy).toMatchObject({ flood: 1, sunY: SUN.night, lampsLit: MOST_LAMPS })
    expect(toy.nightNow.lamps.map((lamp) => lamp.hung)).toEqual([true, false])
    expect(toy.king).toMatchObject({ where: 'seat', sat: 1 })
    run(toy, 4)
    expect(names(toy)).toEqual([])
    expect(toy.takeMotions()).toEqual([])
  })

  it.each([
    ['clear', 100, 'bell'],
    ['cloudy', 100, 'flute'],
    ['berry', 78, 'reed'],
    ['icicle', ICICLE, 'glitter'],
    ['snow', 100, 'drum'],
    ['ball', BALL, 'thud'],
  ] as const)('the light answers a %s thing set in it at once, with its own voice', (kind, len, sound) => {
    // Three posts and two lintels: the lamp hangs in the left hollow, the king sits on the right lintel, and the thing is set on the left one.
    const wall = [on('clear', 64, 300, 0), on('clear', 64, 460, 0), on('clear', 224, 380, 1), on('clear', 180, 700, 0), on('clear', 180, 700, 1), on('clear', 180, 700, 2)]
    const lying = kind === 'berry' ? [] : [restOf(kind, len, 600, 600, 'lying')]
    const toy = new Toy({ ...bare(true), blocks: [{ ...BERRY, x: kind === 'berry' ? 600 : 952, y: kind === 'berry' ? 600 : 786 }, ...wall, ...lying] }, 1)
    drag(toy, 600, 600, 380, 300, 8)
    letGo(toy)
    toy.takeSounds()
    run(toy, 1.5)
    expect(names(toy)).toContain(sound)
    expect(toy.world().night).toBe(true)
  })

  it('a touch on the seated king is never taken for the block under him', () => {
    const toy = new Toy(palace([], true), 1)
    press(toy, toy.king.x, toy.king.y - 60)
    expect(names(toy)).toEqual(['harrumph'])
    expect(toy.hand).toBeNull()
  })

  it('a point on his seat sends him straight up with a squawk, unhurt, and then to another seat', () => {
    const more = [restOf('icicle', ICICLE, 480, row(2), 'built'), on('clear', 180, 720, 0)]
    const toy = new Toy(palace(more), 1)
    toNight(toy)
    run(toy, 6)
    const other = toy.pieces.find((p) => p.len === 180)!
    expect(toy.king).toMatchObject({ where: 'seat', seat: other.id, sat: 1 })
    const again = new Toy(palace(more), 1)
    pullSun(again, true)
    again.takeSounds()
    run(again, 16)
    expect(names(again)).toEqual(expect.arrayContaining(['squawk', 'oomph']))
  })

})


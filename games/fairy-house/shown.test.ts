import { describe, expect, it } from 'vitest'
import type { Sheet } from './art'
import { CELLS } from './cells'
import { FOUND, KINDS, SUPPORTS, type Kind } from './kinds'
import { drawnBox } from './lie'
import type { Pen } from './pencil'
import { build, laidOf, type Laid } from './rest'
import { freshSave, type Save } from './save'
import { STAGE } from './stage'
import { SUN_AT, TICK, Toy, type Show } from './toy'
import { View } from './view'

// What the toy shows is what the view draws, and where a thing is drawn is
// where a finger takes it. A stand-in canvas writes down every call it is
// given, with its numbers; a value the model computes and no call depends on
// would be a pose nobody sees.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const day = (things: Laid[]): Save => ({ ...freshSave(7), things: laidOf(build(things)) })
const run = (toy: Toy, seconds: number): void => { for (let i = 0; i < Math.round(seconds / TICK); i++) toy.step(TICK) }

/** A pen that writes down every call and every setting, and sheets that are told apart. */
function scribe(): { pen: Pen; make: () => Sheet; log: string[] } {
  const log: string[] = []
  let sheets = 0
  const say = (value: unknown): string => (typeof value === 'number' ? value.toFixed(4) : typeof value === 'object' && value !== null ? `sheet${(value as { n?: number }).n ?? '?'}` : String(value))
  const pen = new Proxy({}, {
    get: (_, name) => (...args: unknown[]) => { log.push(`${String(name)}(${args.map(say).join(',')})`) },
    set: (_, name, value) => { log.push(`${String(name)}=${say(value)}`); return true },
  }) as unknown as Pen
  const make = (): Sheet => ({ width: 0, height: 0, n: ++sheets, getContext: () => pen }) as unknown as Sheet
  return { pen, make, log }
}

const { pen, make, log } = scribe()
const view = new View(pen, make, 1)
view.resize(STAGE.width, STAGE.height, 1, 1)
/** Everything the view does with one frame, as one string. */
function drawn(show: Show): string {
  log.length = 0
  view.draw(show)
  return log.join(';')
}

/** Frames that between them hold every kind of thing the game can show. */
function frames(): Show[] {
  const out: Show[] = []
  const keep = (toy: Toy, glow = 0, demo: number | null = null, index = 0): void => { out.push(JSON.parse(JSON.stringify(toy.show({ glow, demo, demoIndex: index }))) as Show) }
  // By day: a slide, a bell, a flag, a lamp, a bath; a thing in the hand over its shadow; the cue and the hand; dust; the owl ducked, the snail hidden.
  const house: Laid[] = [
    { id: idOf('pebble', 0), x: 620 }, { id: idOf('leaf', 0), x: 630 }, { id: idOf('twig', 0), x: 770 }, { id: idOf('cap', 0), x: 770 },
    { id: idOf('twig', 1), x: 832 }, { id: idOf('feather', 0), x: 832 }, { id: idOf('pebble', 1), x: 540 }, { id: idOf('cap', 1), x: 540 },
  ]
  const toy = new Toy(day(house), 2)
  keep(toy, 1, 0.5, 0)
  keep(toy, 1, 0.5, 2)
  toy.press(600, 150)
  toy.release()
  toy.press(742, 168)
  toy.release()
  const snail = toy.show(null).snail
  toy.press(snail.x, snail.y - 16)
  toy.release()
  run(toy, 0.1)
  keep(toy)
  const moss = FOUND[idOf('moss')]
  toy.press(moss.home.x, moss.home.y - 12)
  toy.dragStart()
  toy.dragMove(420, 480)
  run(toy, 0.2)
  keep(toy)
  toy.drop()
  // The bell and the flag swing after a landing beside them; the owl blinks now and then.
  for (let i = 0; i < 40; i++) {
    run(toy, 0.1)
    keep(toy)
  }
  // At evening: every instant of an evening with a roof, a bed, a bath on the step, a lamp, a bell and a broom, and the morning after.
  const night = new Toy(day([
    { id: idOf('cap', 0), x: 422 }, { id: idOf('twig', 0), x: 392 }, { id: idOf('twig', 1), x: 452 }, { id: idOf('leaf', 0), x: 422 },
    { id: idOf('moss', 0), x: 560 }, { id: idOf('leaf', 1), x: 560 }, { id: idOf('pebble', 0), x: 660 }, { id: idOf('cap', 1), x: 660 }, { id: idOf('feather', 0), x: 770 },
  ]), 2)
  const sunTo = (y: number): void => {
    night.press(SUN_AT.x, night.show(null).sun.y)
    night.dragStart()
    night.dragMove(SUN_AT.x, (SUN_AT.y + SUN_AT.setY) / 2)
    run(night, 0.05)
    keep(night)
    night.dragMove(SUN_AT.x, y)
    night.drop()
  }
  sunTo(SUN_AT.under)
  while (night.playing) {
    run(night, 0.12)
    keep(night)
  }
  keep(night, 1, 0.5, 0)
  sunTo(SUN_AT.y)
  while (night.playing) {
    run(night, 0.12)
    keep(night)
  }
  return out
}

/** Every number and every yes-or-no in a frame, as a path to it. A thing in front is drawn as any thing is, so both lists are one. */
function leaves(value: unknown, path: (string | number)[] = [], out: { path: (string | number)[]; name: string }[] = []): { path: (string | number)[]; name: string }[] {
  if (typeof value === 'number' || typeof value === 'boolean') out.push({ path, name: path.map((part) => (typeof part === 'number' ? '[]' : part)).join('.').replace(/^front\./, 'things.') })
  else if (Array.isArray(value)) value.forEach((entry, index) => leaves(entry, [...path, index], out))
  else if (typeof value === 'object' && value !== null) for (const [key, entry] of Object.entries(value)) leaves(entry, [...path, key], out)
  return out
}

function changed(show: Show, path: (string | number)[]): Show {
  const copy = JSON.parse(JSON.stringify(show)) as Record<string, unknown>
  let at: Record<string | number, unknown> = copy
  for (const part of path.slice(0, -1)) at = at[part] as Record<string | number, unknown>
  const last = path[path.length - 1], was = at[last]
  at[last] = typeof was === 'boolean' ? !was : was === 1 || was === -1 ? -(was as number) : (was as number) + 0.37
  return copy as unknown as Show
}

describe('every value the toy shows is read by the view', () => {
  const all = frames()

  it('draws differently when any one number or flag of a frame changes', () => {
    const names = new Set(all.flatMap((show) => leaves(show).map((leaf) => leaf.name)))
    // The whole of what is shown: the things, the three as they stand and as they are, the wood's own, the light, and the cue.
    for (const expected of ['things.[].x', 'things.[].angle', 'things.[].side', 'things.[].swing', 'things.[].sx', 'things.[].sy', 'things.[].snapped', 'things.[].wet', 'things.[].glows', 'things.[].id',
      'stand.fat.x', 'stand.tidy.turn', 'stand.tiny.scale', 'inside.fat', 'behind.fat', 'behind.tidy', 'behind.tiny', 'folk.fat.lean', 'folk.tidy.part', 'folk.tiny.prop', 'folk.fat.gazeX', 'folk.tiny.lid', 'folk.tidy.brow', 'folk.fat.open', 'folk.tiny.wide', 'folk.fat.bob',
      'shadow.x', 'shadow.w', 'snail.hidden', 'moth.flap', 'owl.duck', 'owl.shut', 'owl.gazeX', 'sun.x', 'sun.y', 'sun.bob', 'sun.turn', 'sun.glows', 'dusk', 'puffs.[].age', 'puffs.[].seed', 'spill.fade', 'spill.from', 'glow', 'hand.x', 'hand.press', 'hand.opacity', 'seconds']) expect(names, expected).toContain(expected)
    const unread: string[] = []
    for (const name of names) {
      let read = false
      for (const show of all) {
        const before = drawn(show)
        for (const leaf of leaves(show)) {
          if (leaf.name !== name) continue
          if (drawn(changed(show, leaf.path)) !== before) {
            read = true
            break
          }
        }
        if (read) break
      }
      if (!read) unread.push(name)
    }
    expect(unread).toEqual([])
  }, 60000)

  it('draws each mouth, each kind of dust and each way a thing lies as itself', () => {
    const base = all[0]
    const mouths = ['smile', 'o', 'grin', 'flat', 'yawn', 'pout'].map((mouth) => drawn({ ...base, folk: { ...base.folk, fat: { ...base.folk.fat, mouth: mouth as Show['folk']['fat']['mouth'], open: 0.5 } } }))
    expect(new Set(mouths).size).toBe(6)
    const puffs = (['dust', 'water', 'fluff', 'leaves', 'stir', 'far'] as const).map((kind) => drawn({ ...base, puffs: [{ x: 600, y: 400, age: 0.1, seed: 3, kind }] }))
    expect(new Set(puffs).size).toBe(6)
    // The sun itself is drawn where the toy says, with no cue round it.
    const plain = { ...base, sun: { ...base.sun, glows: false } }
    expect(drawn({ ...plain, sun: { ...plain.sun, x: plain.sun.x + 10 } })).not.toBe(drawn(plain))
    // Every cell of the grid is a different picture: the form picks the sprite and the transform (lie.ts).
    const pictures = new Set<string>()
    for (const kind of KINDS) for (const on of SUPPORTS) {
      const house: Laid[] = on === 'ground' ? [] : [{ id: idOf(on, kind === on ? 1 : 0), x: 640 }]
      const toy = new Toy(day([...house, { id: idOf(kind), x: 650 }]), 1)
      const thing = toy.show(null).things.find((shown) => shown.id === idOf(kind))!
      pictures.add(`${kind} ${thing.form} ${thing.angle.toFixed(3)} ${thing.extra} ${(thing.y - (toy.rested[0]?.y ?? 0)).toFixed(1)} ${CELLS[kind][on].shift}`)
    }
    expect(pictures.size).toBe(35)
  })
})

describe('a thing is touched where it is drawn', () => {
  it('in every cell of the grid: a finger on the middle of its picture takes it', () => {
    for (const kind of KINDS) for (const on of SUPPORTS) {
      const under: Laid[] = on === 'ground' ? [] : [{ id: idOf(on, kind === on ? 1 : 0), x: 640 }]
      const toy = new Toy(day([...under, { id: idOf(kind), x: 650 }]), 1)
      const thing = toy.show(null).things.find((shown) => shown.id === idOf(kind))!
      const box = drawnBox(thing)
      toy.press(box.x + box.w / 2, box.y + box.h / 2)
      expect(toy.sounds.map((sound) => sound.from), `${kind} on ${on}`).toEqual([`lift ${idOf(kind)}`])
    }
  })

  it('on the forest floor, as a stump, on a twig across two others, and at evening', () => {
    const toy = new Toy(day([]), 1)
    for (const found of FOUND) {
      const thing = toy.show(null).things.find((shown) => shown.id === found.id)!
      const box = drawnBox(thing)
      toy.sounds.length = 0
      toy.press(box.x + box.w / 2, box.y + box.h / 2)
      toy.release()
      run(toy, 0.6)
      expect(toy.sounds[0].from, `thing ${found.id}`).toBe(`lift ${found.id}`)
    }
    // A stump is half as tall: a finger above it, where the twig used to reach, takes nothing.
    const stumps = new Toy({ ...day([{ id: idOf('twig'), x: 640 }]), snapped: [idOf('twig')] }, 1)
    const stump = stumps.show(null).things.find((shown) => shown.id === idOf('twig'))!
    expect(stump.snapped).toBe(true)
    const box = drawnBox(stump)
    expect(box.h).toBeLessThan(62)
    stumps.press(640, box.y - 30)
    stumps.release()
    expect(stumps.sounds.map((sound) => sound.from)).toEqual(['wood'])
    stumps.sounds.length = 0
    stumps.press(box.x + box.w / 2, box.y + box.h / 2)
    expect(stumps.sounds.map((sound) => sound.from)).toEqual([`lift ${idOf('twig')}`])
    // While it rocks, a thing is not taken: it is taken once it lies still, where it then is.
    const rocking = new Toy(day([{ id: idOf('bark'), x: 640 }]), 1)
    const ball = FOUND[idOf('pebble')]
    rocking.press(ball.home.x, ball.home.y - 12)
    rocking.dragStart()
    rocking.dragMove(640, 500)
    rocking.drop()
    run(rocking, 4)
    const rolled = rocking.show(null).things.find((shown) => shown.id === ball.id)!
    const where = drawnBox(rolled)
    rocking.sounds.length = 0
    rocking.press(where.x + where.w / 2, where.y + where.h / 2)
    expect(rocking.sounds.map((sound) => sound.from)).toEqual([`lift ${ball.id}`])
  })
})

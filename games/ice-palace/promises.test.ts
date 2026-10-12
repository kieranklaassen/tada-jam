import { describe, expect, it } from 'vitest'
import { BALL, ON_BANK_Y, restOf, widthOf, type Kind, type Rest } from './blocks'
import { AT_NIGHT, BOLT_S, HARE_FIRS, HARE_S, HARE_STEPS, KID_SCALE, REACTIONS, hareHide, harePose } from './cast'
import { TIERS } from './config'
import { BERRY } from './first'
import { WET_DROPS, WET_FALL } from './figures'
import { SOAK } from './kids'
import { BLOCK_H, FIRS, FIR_FOOT, GROUND_Y, POND, ridge, type Point } from './ground'
import { RIM, RIM_GROW, RIM_PUSH, lampsOf, nightOf, rimPush } from './night'
import { bare, carry, drag, frame, letGo, moveTo, names, pullSun, run, toNight } from './testing'
import { BEADS } from './things'
import { STEP, Toy, type World } from './toy'
import { fishLooksFrom, hareNow, hareOut, redOnPond } from './toyDay'
import { hangFrom, lampAim, lampLift, lampMood, mittenNow, rapPlace } from './toyKids'
import { View } from './view'
import { SHARDS } from './viewThings'
import { SOUNDS } from './voices'

// What the sheet promises of the characters, each held where a child would
// see or hear it: the hare, the lamp child's one rap, King Winter's morning
// shake, a snowball afloat, the fish and anything red, the peeper and every
// splash, and no chime for a block set on the bank.

const row = (n: number): number => ON_BANK_Y - n * BLOCK_H
const on = (kind: Kind, len: number, x: number, n: number): Rest => restOf(kind, len, x, row(n), 'built')
const gate = (kind: Kind = 'clear'): Rest[] => [on(kind, 64, 400, 0), on(kind, 64, 560, 0), on(kind, 224, 480, 1)]
const palace = (more: Rest[] = [], night = false, kind: Kind = 'clear'): World => ({ ...bare(night), blocks: [{ ...BERRY }, ...gate(kind), ...more] })
const far = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

describe('the hare', () => {
  it('comes out from behind one fir and goes in behind another: it is never first or last seen on open snow', () => {
    const out = hareHide(0), into = hareHide(1)
    for (const [hide, which] of [[out, 0], [into, 1]] as const) {
      const [x, tall] = FIRS[HARE_FIRS[which]]
      // The place is at the fir's foot and inside its lowest boughs, which are wider than the hare is long.
      expect(hide.x).toBe(x)
      expect(hide.y).toBeLessThanOrEqual(ridge(x) + FIR_FOOT)
      expect(hide.y).toBeGreaterThan(ridge(x) + FIR_FOOT - tall * 0.3)
      expect(tall).toBeGreaterThan(100)
    }
    const toy = new Toy(bare(), 1)
    let first: Point | null = null, last: Point | null = null
    const steps = Math.round((toy.hareAt + HARE_S + 2) / STEP)
    for (let step = 0; step < steps; step++) {
      frame(toy)
      if (!hareOut(toy)) continue
      first ??= { ...hareNow(toy) }
      last = { ...hareNow(toy) }
    }
    expect(far(first!, out)).toBeLessThan(8)
    expect(far(last!, into)).toBeLessThan(8)
    expect(out.x).not.toBe(into.x)
  })

  it('is printed with its firs over it, as the sun’s ring of paper is: the firs are laid again after the sun and after the hare', () => {
    /** The stamps of one frame, and where in their order a shape was cut out to print inside. */
    const ops = (toy: Toy): string[] => {
      const seen: string[] = []
      const surface = new Proxy({} as Record<string, unknown>, {
        get: (target, name) => (typeof name !== 'string' ? undefined : name in target ? target[name] : () => {
          if (name === 'drawImage' || name === 'clip') seen.push(name)
          return name === 'createPattern' ? {} : undefined
        }),
        set: (target, name, value) => { if (typeof name === 'string') target[name] = value; return true },
      }) as unknown as CanvasRenderingContext2D
      const view = new View(() => ({ width: 0, height: 0, getContext: () => surface }) as unknown as HTMLCanvasElement)
      view.paint(surface, 1180, 820, 2, toy, null, toy.time, TIERS[0])
      seen.length = 0
      view.paint(surface, 1180, 820, 2, toy, null, toy.time, TIERS[0])
      return seen
    }
    // The first cut-out of a frame is the sky the sun is printed in; the second is the firs, with the still sheet stamped inside it.
    const between = (seen: string[]): number => {
      const first = seen.indexOf('clip'), second = seen.indexOf('clip', first + 1)
      expect(first).toBeGreaterThan(0)
      expect(second).toBeGreaterThan(first)
      expect(seen[second + 1]).toBe('drawImage')
      return seen.slice(first + 1, second).filter((op) => op === 'drawImage').length
    }
    const toy = new Toy(bare(), 1)
    const hidden = between(ops(toy))
    expect(hidden).toBeGreaterThanOrEqual(1)
    run(toy, toy.hareAt + 1)
    expect(hareOut(toy)).toBe(true)
    // One stamp more before the firs are laid again: the hare.
    expect(between(ops(toy))).toBe(hidden + 1)
  })

  it('caught out by the dusk it bolts for the nearer fir and is behind it before it is gone', () => {
    const toy = new Toy(palace(), 1)
    run(toy, toy.hareAt + 2.2)
    expect(hareOut(toy)).toBe(true)
    const from = { ...hareNow(toy) }
    pullSun(toy, true)
    expect(toy.cast.hare.what).toBe('bolt')
    expect(names(toy)).toContain('thump')
    let last: Point = from, steps = 0
    while (hareOut(toy) && steps < 200) {
      last = { ...hareNow(toy) }
      frame(toy)
      steps++
    }
    // It was seen all the way: it ran for the whole of its dash, and the last place it was seen is a fir's foot.
    expect(steps).toBeGreaterThanOrEqual(Math.floor(BOLT_S / STEP) - 1)
    expect(Math.min(far(last, hareHide(0)), far(last, hareHide(1)))).toBeLessThan(10)
    expect(far(from, last)).toBeGreaterThan(40)
    // And it keeps to the day: through a whole night it does not come out.
    run(toy, 60)
    expect(toy.night).toBe(true)
    expect(hareOut(toy)).toBe(false)
  })

  it('goes in uneven bounds along a line that wanders, and its tracks are where it lands', () => {
    const bounds = HARE_STEPS.slice(1).map((step, i) => far(step, HARE_STEPS[i]))
    for (let i = 1; i < bounds.length; i++) expect(Math.abs(bounds[i] - bounds[i - 1]), `bounds ${i - 1} and ${i}`).toBeGreaterThan(3)
    expect(Math.max(...bounds) / Math.min(...bounds)).toBeGreaterThan(1.6)
    // The line turns up and down the slope more than twice, and once it even doubles back.
    const dy = HARE_STEPS.slice(1).map((step, i) => Math.sign(step.y - HARE_STEPS[i].y))
    expect(dy.filter((sign, i) => i > 0 && sign !== dy[i - 1]).length).toBeGreaterThan(2)
    expect(HARE_STEPS.slice(1).some((step, i) => step.x > HARE_STEPS[i].x)).toBe(true)
    // Every landing of the crossing is one of the printed places.
    let t = 0
    for (const step of HARE_STEPS.slice(1)) {
      t += 0.4
      expect(far(harePose(t, -1), step)).toBeLessThan(0.01)
      t += step.stop
    }
  })
})

describe('the lamp child and a lamp shut in behind snow', () => {
  it('walks to the snow block, raps on it once with its mitten on the block, and then waits at its place, looking at it', () => {
    const toy = new Toy(palace([], false, 'snow'), 1)
    pullSun(toy, true)
    toy.takeSounds()
    let raps = 0, mitten: Point | null = null, child: Point | null = null
    for (let step = 0; step < Math.round(40 / STEP); step++) {
      frame(toy)
      if (!toy.takeSounds().some((sound) => sound.name === 'rap')) continue
      raps++
      mitten = mittenNow(toy)
      child = { x: toy.kids.lamp.x, y: toy.kids.lamp.y - lampLift(toy) }
    }
    expect(raps).toBe(1)
    const shut = toy.pieces.find((p) => p.id === toy.taste.shut?.id)!
    expect(shut.kind).toBe('snow')
    // The mitten is on the block when the rap is heard: on its edge, and not in the air in front of it.
    const dx = Math.max(0, Math.abs(mitten!.x - shut.rest.x) - widthOf(shut) / 2), dy = Math.max(0, Math.abs(mitten!.y - shut.rest.y) - BLOCK_H / 2)
    expect(Math.hypot(dx, dy)).toBeLessThan(6)
    // It stood beside the block to do it, on the front snow, and not where it stands by night.
    expect(far(child!, AT_NIGHT.lamp)).toBeGreaterThan(150)
    expect(Math.abs(child!.x - shut.rest.x)).toBeLessThan(widthOf(shut) / 2 + 90)
    // Now it is back at its place, frowning, its arm towards the snow; and it stays there.
    expect(toy.kids.lamp).toMatchObject({ ...AT_NIGHT.lamp, behind: false })
    expect(lampMood(toy)).toBe('frown')
    expect(lampAim(toy)).toMatchObject({ x: shut.rest.x, y: shut.rest.y })
    expect(toy.lampWalk).toEqual([])
  })

  it('jumps for a block that stands higher than its mitten reaches, and raps the block’s lower edge at the top of the jump', () => {
    const toy = new Toy({ ...bare(true), blocks: [{ ...BERRY }, on('clear', 120, 500, 0), on('clear', 120, 500, 1), on('clear', 120, 500, 2), on('clear', 120, 500, 3), on('snow', 120, 500, 4)] }, 1)
    const high = toy.pieces.find((p) => p.kind === 'snow')!, low = toy.pieces.find((p) => p.rest.y === row(0))!
    const up = rapPlace(toy, high)!, down = rapPlace(toy, low)!
    expect(up.jump).toBeGreaterThan(20)
    expect(up.on.y).toBe(high.rest.y + BLOCK_H / 2)
    expect(down.jump).toBe(0)
    expect(Math.abs(down.on.y - low.rest.y)).toBeLessThanOrEqual(BLOCK_H / 2)
  })

  it('raps again only when a lamp has been let out and shut in anew', () => {
    const toy = new Toy(palace([restOf('clear', 64, 600, 600, 'lying')], false, 'snow'), 1)
    toNight(toy)
    run(toy, 10)
    toy.takeSounds()
    run(toy, 20)
    expect(names(toy)).toEqual([])
    // The left snow post is swapped for ice: the lamp's light gets out, and the child forgets the snow.
    carry(toy, 400, row(0), 300, 600, 3)
    carry(toy, 600, 600, 400, row(0) - 10, 3)
    expect(toy.taste.shut).toBeNull()
    expect(toy.knocked).toBe(0)
    // Ice for snow again: the lamp is shut in anew, and that is one more rap.
    toy.takeSounds()
    carry(toy, 400, row(0), 300, 640, 3)
    carry(toy, 300, 600, 400, row(0) - 10, 3)
    expect(toy.pieces.find((p) => p.rest.x === 400 && p.rest.y === row(0))?.kind).toBe('snow')
    let raps = 0
    for (let step = 0; step < Math.round(30 / STEP); step++) {
      frame(toy)
      raps += names(toy).filter((name) => name === 'rap').length
    }
    expect(raps).toBe(1)
  })

  it('does not rap again when one of two snow blocks that shut a lamp in is taken: no lamp has been let out', () => {
    const toy = new Toy(palace([], false, 'snow'), 1)
    toNight(toy)
    let raps = 0
    const watch = (seconds: number): void => {
      for (let step = 0; step < Math.round(seconds / STEP); step++) {
        frame(toy)
        raps += names(toy).filter((name) => name === 'rap').length
      }
    }
    watch(20)
    expect(raps).toBe(1)
    const lamp = toy.nightNow.lamps[0]
    // The right post is carried off: the lamp moves along its hollow and is as shut in as it was.
    drag(toy, 560, row(0), 300, 620, 8)
    watch(0.3)
    letGo(toy)
    watch(25)
    expect(toy.nightNow.lamps[0].x).not.toBe(lamp.x)
    expect(toy.nightNow.shut).toHaveLength(1)
    expect(raps).toBe(1)
    // It still frowns at snow that shuts the lamp in, from its place.
    expect(toy.kids.lamp).toMatchObject({ ...AT_NIGHT.lamp })
    expect(lampMood(toy)).toBe('frown')
    expect(toy.pieces.find((p) => p.id === toy.taste.shut?.id)?.kind).toBe('snow')
  })
})

describe('dusk', () => {
  it.each([
    ['two hollows', [...gate(), on('clear', 64, 660, 0), on('clear', 64, 800, 0), on('clear', 204, 730, 1)], 2],
    ['one hollow, and the other lamp stood on the snow beside the wall', gate(), 2],
    ['no hollow, the two lamps stood on the snow beside the wall', [on('clear', 120, 500, 0)], 2],
  ] as const)('each lamp lights as the lamp child hangs it, standing under its place, and none while it is out on the pond: %s', (_, blocks, count) => {
    const toy = new Toy({ ...bare(), blocks: [{ ...BERRY }, ...blocks] }, 1)
    const lamps = lampsOf(blocks)
    expect(lamps).toHaveLength(count)
    pullSun(toy, true)
    const litAt: Point[] = []
    for (let step = 0; step < Math.round(5 / STEP); step++) {
      const before = toy.lampsLit
      frame(toy)
      if (toy.lampsLit > lamps.length) break
      if (toy.lampsLit === before) continue
      // One at a time, from left to right.
      expect(toy.lampsLit).toBe(before + 1)
      expect(toy.nightNow.lamps).toHaveLength(toy.lampsLit)
      litAt.push({ ...toy.kids.lamp })
    }
    expect(litAt).toHaveLength(count)
    litAt.forEach((child, n) => {
      const stand = hangFrom(lamps[n])
      // It has come in off the pond to the foot of the bank, under the lamp's place: within a stride of where it stands to hang it.
      expect(far(child, stand), `lamp ${n} at ${lamps[n].x}: the child at ${Math.round(child.x)}, ${Math.round(child.y)}`).toBeLessThan(45)
      expect(Math.abs(child.x + 26 * KID_SCALE - lamps[n].x)).toBeLessThan(45)
      expect(Math.abs(child.y - GROUND_Y)).toBeLessThan(45)
    })
  })
})

describe('morning', () => {
  it('King Winter stands on his seat and shakes the night off before he walks home', () => {
    const toy = new Toy(palace([], true), 1)
    const seat = { x: toy.king.x, y: toy.king.y }
    pullSun(toy, false)
    toy.takeSounds()
    let shook = 0, there = true
    const heard: string[] = []
    for (let step = 0; step < Math.round(4 / STEP); step++) {
      frame(toy)
      heard.push(...names(toy))
      if (toy.cast.king.what !== 'shake') continue
      shook++
      there &&= toy.king.x === seat.x && toy.king.y === seat.y
    }
    expect(shook).toBeGreaterThanOrEqual(Math.floor(REACTIONS.king.shake.lasts / STEP) - 1)
    expect(there).toBe(true)
    expect(heard).toContain('brr')
    run(toy, 6)
    expect(toy.king).toMatchObject({ where: 'home', sat: 0 })
  })
})

describe('on the water', () => {
  const pondWorld = (more: Rest[]): World => ({ ...bare(), blocks: [{ ...BERRY }, ...more], holes: [{ x: 900, y: 668, angle: 0, len: 120 }] })

  it('a snowball afloat bubbles three times, each bubble seen and heard in the same step', () => {
    const toy = new Toy(pondWorld([restOf('ball', BALL, 700, 600, 'lying')]), 1)
    drag(toy, 700, 600, 900, 668, 8)
    letGo(toy)
    toy.takeSounds()
    toy.takeMotions()
    let heard = 0, seen = 0, together = 0
    for (let step = 0; step < Math.round(5 / STEP); step++) {
      frame(toy)
      const sound = toy.takeSounds().filter((s) => s.name === 'bubble').length, sight = toy.takeMotions().filter((m) => m.type === 'bubbles').length
      heard += sound
      seen += sight
      if (sound > 0 && sound === sight) together++
    }
    expect([heard, seen, together]).toEqual([3, 3, 3])
  })

  it('the fish comes to anything red on its pond: the berry block lying on the ice or carried over it, as well as afloat', () => {
    const lying = new Toy({ ...bare(), blocks: [{ ...BERRY, x: 600, y: 700 }] }, 1)
    run(lying, 2)
    expect(lying.fishStare).toBe(1)
    expect(redOnPond(lying)).not.toBeNull()
    const looks = fishLooksFrom({ x: 600, y: 700 })
    expect(far(looks, { x: 600, y: 700 })).toBeLessThan(90)
    expect(Math.hypot((looks.x - POND.cx) / POND.rx, (looks.y - POND.cy) / POND.ry)).toBeLessThan(1)
    // On the snow it is nothing to the fish; carried out over the ice, the fish comes; carried back, it goes.
    const toy = new Toy(bare(), 1)
    run(toy, 2)
    expect(toy.fishStare).toBe(0)
    drag(toy, BERRY.x, BERRY.y, 620, 690, 8)
    run(toy, 2)
    expect(toy.fishStare).toBe(1)
    moveTo(toy, 620, 520)
    run(toy, 2)
    expect(toy.fishStare).toBe(0)
  })

  it('the drops that fly off the soaked peeper are no row of marks: no two the same size, no even step, and not on one line', () => {
    const drops = [...SOAK].sort((a, b) => a[0] - b[0])
    expect(new Set(drops.map((drop) => drop[2])).size).toBe(drops.length)
    const steps = drops.slice(1).map((drop, i) => drop[0] - drops[i][0])
    expect(Math.max(...steps) / Math.min(...steps)).toBeGreaterThan(1.5)
    // How far each drop lies off the straight line from the first to the last: a row would have them all on it.
    const [x0, y0] = drops[0], [x1, y1] = drops[drops.length - 1], len = Math.hypot(x1 - x0, y1 - y0)
    const off = drops.slice(1, -1).map(([x, y]) => ((x - x0) * (y1 - y0) - (y - y0) * (x1 - x0)) / len)
    expect(Math.max(...off) - Math.min(...off)).toBeGreaterThan(30)
    expect(off.some((d) => d > 8) && off.some((d) => d < -8)).toBe(true)
  })

  it('the peeper is soaked every time something goes in, however far off, and laughs', () => {
    const toy = new Toy(pondWorld([restOf('clear', 80, 700, 600, 'lying')]), 1)
    expect(far(toy.kids.peeper, { x: 900, y: 668 })).toBeGreaterThan(700)
    drag(toy, 700, 600, 900, 668, 8)
    letGo(toy)
    toy.takeSounds()
    run(toy, 1.2)
    expect(toy.cast.peeper.what).toBe('soaked')
    expect(names(toy)).toContain('giggle')
  })
})

describe('a block set on the bank by day', () => {
  it('has no chime: there is no jingle in the game, and the lamp child’s answer is a look that makes no sound', () => {
    expect((SOUNDS as readonly string[]).includes('jingle')).toBe(false)
    expect(REACTIONS.lamp.lift.sound).toBeNull()
    expect(REACTIONS.lamp.knock.sound).toBeNull()
  })

  it.each([['clear', 'crunch'], ['cloudy', 'thunk'], ['snow', 'flump'], ['berry', 'roundKnock']] as const)('a %s block lands with its own landing sound and nothing else, and the lamp child looks', (kind, sound) => {
    const lying = kind === 'berry' ? [] : [restOf(kind, 90, 600, 600, 'lying')]
    const toy = new Toy({ ...bare(), blocks: [{ ...BERRY, x: kind === 'berry' ? 600 : BERRY.x, y: kind === 'berry' ? 600 : BERRY.y }, ...lying] }, 1)
    drag(toy, 600, 600, 500, 300, 8)
    letGo(toy)
    toy.takeSounds()
    let looked = false
    const heard: string[] = []
    for (let step = 0; step < 90; step++) {
      frame(toy)
      heard.push(...names(toy))
      looked ||= toy.cast.lamp.what === 'lift'
    }
    expect(heard.filter((name) => name !== 'tweet')).toEqual([sound])
    expect(looked).toBe(true)
  })
})

describe('marks that are no signs', () => {
  const apart = (values: number[]): number => Math.min(...values.flatMap((a, i) => values.slice(i + 1).map((b) => Math.abs(a - b))))

  it.each([
    ['a snowball', restOf('ball', BALL, 480, row(2), 'built'), true],
    ['a short snow block', on('snow', 64, 480, 2), false],
  ] as const)('the rim of light round the unlit shape of %s is an arc on its two far sides, never a closed ring or frame', (_, thing, round) => {
    // A lamp hangs in the gate's hollow and the thing stands on the lintel, to one side of the lamp or the other.
    for (const x of [420, 540]) {
      const blocks = [...gate(), { ...thing, x }]
      const night = nightOf(blocks), patch = night.patches.find((p) => p.tone === 'dark')!
      expect(patch.of).toBe(3)
      const push = rimPush(patch.cast)
      expect(Math.sign(push.x)).toBe(Math.sign(x - night.lamps[0].x))
      expect(push.y).toBeGreaterThan(0)
      // Just outside the unlit shape, all the way round it: is there light? In the thing's own measures, about its middle.
      const half = round ? 0 : 32, r = round ? BALL / 2 : 0, cy = round ? (BLOCK_H - BALL) / 2 : 0
      const lit: boolean[] = []
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a)
        // A point 1.5 outside the outline: a circle for the ball, the block's box for the block.
        const k = round ? r + 1.5 : Math.min((half + 1.5) / Math.abs(ux || 1e-9), (BLOCK_H / 2 + 1.5) / Math.abs(uy || 1e-9))
        const px = ux * k - push.x, py = cy + uy * k - push.y
        lit.push(round ? Math.hypot(px, py - cy) <= r + RIM_GROW : Math.abs(px) <= half + RIM_GROW && Math.abs(py) <= BLOCK_H / 2 + RIM_GROW)
      }
      // Lit on the far side and bare on the near one, in one stretch each: an arc.
      const turns = lit.filter((now, i) => now !== lit[(i + 1) % lit.length]).length
      expect(turns).toBe(2)
      const bare = lit.filter((now) => !now).length / lit.length
      expect(bare).toBeGreaterThan(0.25)
      expect(bare).toBeLessThan(0.75)
      // The middle of the near side is bare and the middle of the far side is lit.
      const toward = Math.round(((Math.atan2(-push.y, -push.x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 72) % 72
      expect(lit[toward]).toBe(false)
      expect(lit[(toward + 36) % 72]).toBe(true)
      // The patch's box holds the rim as well as the shape.
      expect(patch.x1 - patch.x0).toBeGreaterThan((round ? BALL : 64) + RIM_GROW)
    }
    expect(RIM).toBe(RIM_GROW + RIM_PUSH)
    expect(RIM_PUSH).toBeGreaterThan(RIM_GROW)
  })

  it('the beads of water on a clear block under a thumb are no row of dots: no two the same size, no even step, never level', () => {
    expect(BEADS).toHaveLength(3)
    expect(apart(BEADS.map((bead) => bead.rx))).toBeGreaterThanOrEqual(0.5)
    const steps = BEADS.slice(1).map((bead, i) => bead.u - BEADS[i].u)
    expect(Math.max(...steps) / Math.min(...steps)).toBeGreaterThan(1.4)
    for (let heat = 0; heat <= 1.001; heat += 0.05) expect(apart(BEADS.map((bead) => bead.y + heat * bead.run)), `at a warmth of ${heat.toFixed(2)}`).toBeGreaterThanOrEqual(4)
  })

  it('the drops under King Winter’s wet beard are no row of dots: no two the same size, no even step, never level', () => {
    expect(WET_DROPS).toHaveLength(4)
    expect(apart(WET_DROPS.map((drop) => drop.rx))).toBeGreaterThanOrEqual(0.4)
    const steps = WET_DROPS.slice(1).map((drop, i) => drop.x - WET_DROPS[i].x)
    expect(Math.max(...steps) / Math.min(...steps)).toBeGreaterThan(1.5)
    for (let wet = 0; wet <= 1.001; wet += 0.02) expect(apart(WET_DROPS.map((drop) => (wet * 90 + drop.from) % WET_FALL)), `at ${wet.toFixed(2)}`).toBeGreaterThanOrEqual(5)
  })

  it('the light of an icicle is three shards that meet nowhere: each from its own place, no two the same length or lean, spreading as they go', () => {
    expect(SHARDS).toHaveLength(3)
    const ends = SHARDS.map(([ax, ay, bx, by, cx, cy, dx, dy]) => ({ near: { x: (ax + bx) / 2, y: (ay + by) / 2 }, far: { x: (cx + dx) / 2, y: (cy + dy) / 2 } }))
    const long = ends.map(({ near, far: to }) => far(near, to)), lean = ends.map(({ near, far: to }) => Math.atan2(to.x - near.x, to.y - near.y))
    expect(apart(long)).toBeGreaterThan(5)
    expect(apart(lean)).toBeGreaterThan(0.15)
    // No two start in one point, and none shares a corner with another: no arrowhead.
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      expect(far(ends[i].near, ends[j].near)).toBeGreaterThan(9)
      for (let a = 0; a < 8; a += 2) for (let b = 0; b < 8; b += 2) expect(Math.hypot(SHARDS[i][a] - SHARDS[j][b], SHARDS[i][a + 1] - SHARDS[j][b + 1])).toBeGreaterThan(3)
      // Their far ends are further apart than their near ends: they spread.
      expect(far(ends[i].far, ends[j].far)).toBeGreaterThan(far(ends[i].near, ends[j].near))
    }
    // They lean in order from left to right, as a fan does, and their near ends are not level.
    expect(lean[0]).toBeLessThan(lean[1])
    expect(lean[1]).toBeLessThan(lean[2])
    expect(apart(ends.map((end) => end.near.y))).toBeGreaterThan(1)
  })
})

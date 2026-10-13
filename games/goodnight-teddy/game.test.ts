import { describe, expect, it } from 'vitest'
import { Finger, pourOver, spotOf } from './finger'
import { IdleLadder } from './guidance'
import { CELL_PART, SEEN, cellX, cellY, freshFur, has, isDry, share, wants } from './fur'
import { Game } from './game'
import { ACTS } from './acts'
import { CAT, CAT_NIGHT_X, CLOTH_IDS, CURTAIN, DOORWAY, DUCK, HOMES, LAMP, TEDDY, THING_IDS, WASH_IDS, blanketDome, coveredBy, duckSpot, whatAt } from './room'
import { WEARERS, deserialize, freshSave, serialize, type Save } from './save'
import type { Sound } from './voices'

const fresh = (over: Partial<Save> = {}, age: number | null = null): Game => new Game({ ...freshSave(age), ...over }, 1)
/** What ctx.storage would hand back if the game were put away now. */
const putAway = (game: Game): Game => new Game(deserialize(JSON.parse(JSON.stringify(serialize(game.toSave()))), null, 1), 1)
const heard = (game: Game): string[] => game.takeSounds().map((sound: Sound) => sound.id)
const belly = { x: TEDDY.x + 8, y: TEDDY.y - 170 }, wall = { x: TEDDY.x, y: 60 }
/** A place on the wall that a thing can be carried to from the bath side without passing over anyone. */
const door = { x: 400, y: 230 }
/** A clean, dry bear: nothing on his coat. */
const clean = (over: Partial<Save> = {}): Game => new Game({ ...freshSave(null), ...over, fur: freshFur([]), mudPlaces: [] }, 1)

describe('a first evening', () => {
  it('starts by age: two muddy places at 3 and younger or with no age, four at 4 and older, both ends open', () => {
    const young = share(fresh({}, null).fur, 'mud')
    for (const age of [0, 1, 2, 3]) expect(share(fresh({}, age).fur, 'mud')).toBe(young)
    for (const age of [4, 5, 9, 40]) expect(share(fresh({}, age).fur, 'mud')).toBeGreaterThan(young)
    const game = fresh()
    expect(game.rec).toMatchObject({ phase: 'evening', lamp: 'up', curtain: 'closed', blanket: 'bed', pyjamas: 'peg', finished: false })
    expect(game.want).toBe('soap')
    expect(game.busy).toBe(false)
  })

  it('asks for one thing at a time: what his coat needs, then the blanket, then the lamp', () => {
    const game = clean()
    expect(game.want).toBe('blanket')
    new Finger(game).use('blanket', 'teddy')
    expect(game.want).toBe('lamp')
    const muddy = fresh()
    expect(muddy.want).toBe(wants(muddy.fur))
  })
})

describe('an evening in taps', () => {
  /** The child taps whatever the room asks for and waits for it to come home, until he sleeps. `idle` counts the taps that changed nothing. */
  const evening = (game: Game): string[] & { idle: number } => {
    const finger = new Finger(game), taps = Object.assign([] as string[], { idle: 0 })
    for (let n = 0; n < 16 && game.rec.phase === 'evening'; n++) {
      const want = game.want!, before = JSON.stringify(serialize(game.toSave()))
      taps.push(want)
      finger.tap(want === 'lamp' ? LAMP : game.rests()[want as (typeof THING_IDS)[number]]).wait(3.2)
      if (JSON.stringify(serialize(game.toSave())) === before) taps.idle += 1
    }
    return taps
  }
  const count = (taps: string[], id: string): number => taps.filter((tap) => tap === id).length

  it('is done by tapping what the room asks for, one whole job a tap, at either starting age', () => {
    for (const [age, soaps] of [[null, 2], [5, 4]] as const) {
      const game = fresh({}, age), taps = evening(game)
      expect(game.rec.phase, taps.join(' ')).toBe('night')
      expect(count(taps, 'soap')).toBeLessThanOrEqual(soaps)
      // One sheet of water rinses all of him, mud and foam.
      expect(count(taps, 'jug')).toBe(1)
      expect(has(game.fur, 'mud')).toBe(false)
      expect(count(taps, 'towel')).toBeLessThanOrEqual(4)
      expect(taps.slice(-2)).toEqual(['blanket', 'lamp'])
      expect(taps.length).toBeLessThanOrEqual(soaps + 7)
      expect(taps.idle).toBe(0)
    }
  })

  it('is done as surely from a blanket on a muddy bear and from pyjamas on a wet bear: no tap does nothing', () => {
    for (const age of [null, 5]) {
      const wet = freshSave(age).fur
      CELL_PART.forEach((part, i) => { if (part) wet.wet[i] = 0.85 })
      for (const over of [{ blanket: 'teddy' }, { pyjamas: 'teddy', fur: wet }] as Partial<Save>[]) {
        const game = fresh(over, age)
        const taps = evening(game)
        expect(game.rec.phase, taps.join(' ')).toBe('night')
        expect(has(game.fur, 'mud')).toBe(false)
        expect(taps.length).toBeLessThanOrEqual(12)
        expect(taps.idle, taps.join(' ')).toBe(0)
      }
    }
  })

  it('takes what he wears off for a dragged wash thing whose work is under it, and leaves a clean dry bear dressed', () => {
    const muddy = fresh({ blanket: 'teddy', pyjamas: 'teddy' }), finger = new Finger(muddy)
    finger.use('soap', 'teddy')
    expect(muddy.rec).toMatchObject({ blanket: 'bed', pyjamas: 'peg' })
    expect(has(muddy.fur, 'foam')).toBe(true)
    // Clean and dry, the towel only rubs what shows, and the room asks for the lamp.
    const tidy = clean({ blanket: 'teddy', pyjamas: 'teddy' })
    expect(tidy.want).toBe('lamp')
    new Finger(tidy).tap(HOMES.towel).wait(3.2)
    expect(tidy.rec).toMatchObject({ blanket: 'teddy', pyjamas: 'teddy' })
  })
})

describe('the grid: each carried thing on each of the five', () => {
  it('soap: foam on Teddy, a wig on the duck, a stripe on the cat, bubbles on the shade, suds in the bath', () => {
    const game = fresh(), finger = new Finger(game)
    finger.use('soap', 'teddy')
    expect(has(game.fur, 'foam')).toBe(true)
    expect(heard(game)).toEqual(expect.arrayContaining(['grab', 'stroke', 'giggle', 'home']))
    finger.use('soap', 'duck')
    expect(game.rec.duck).toBe('foam')
    expect(game.duck.wig).toBeGreaterThan(0.5)
    expect(heard(game)).toEqual(expect.arrayContaining(['duckRub', 'blurp']))
    finger.use('soap', 'cat', 1.2, 0)
    expect(game.rec.cat).toBe('foam')
    expect(game.cat.act?.id).toBe('lick')
    finger.wait(2.4)
    expect(heard(game)).toEqual(expect.arrayContaining(['fizz', 'chirrup', 'spit']))
    finger.use('soap', 'lamp')
    expect(game.rec.shade).toBe('foam')
    expect(heard(game)).toEqual(expect.arrayContaining(['glassSqueak', 'tinkle']))
    finger.use('soap', 'tub', 0.5)
    expect(game.rec.suds).toBeGreaterThanOrEqual(1)
    expect(heard(game)).toEqual(expect.arrayContaining(['glop', 'crackle']))
    // The suds stop at their highest and never go past it.
    finger.use('soap', 'tub', 6)
    expect(game.rec.suds).toBe(3)
    expect(game.things.soap.mode).toBe('home')
  })

  it('jug: Teddy squirms and shakes, the duck spins and squirts, the cat is drenched, the shade steams, the bath sloshes', () => {
    const game = fresh({ duck: 'foam', shade: 'foam', suds: 2 }), finger = new Finger(game)
    new Finger(game).use('soap', 'teddy', 2)
    const foam = share(game.fur, 'foam'), mud = share(game.fur, 'mud')
    game.takeSounds()
    finger.take('jug').move({ x: TEDDY.x - 62, y: TEDDY.y - 566 }).wait(1.6)
    expect(game.teddy.squirm).toBeGreaterThan(0.5)
    expect(game.stream?.on).toBe('teddy')
    finger.drop().wait(0.5)
    expect(game.teddy.shake).toBeGreaterThan(0)
    finger.wait(1.2)
    expect(share(game.fur, 'foam')).toBeLessThan(foam)
    expect(share(game.fur, 'mud')).toBeLessThan(mud)
    expect(has(game.fur, 'wet')).toBe(true)
    expect(heard(game)).toEqual(expect.arrayContaining(['stroke', 'shudder', 'shake', 'mew']))
    finger.use('jug', 'duck', 1, 1.2)
    expect(game.rec.duck).toBe('plain')
    expect(heard(game)).toEqual(expect.arrayContaining(['patter', 'squirt']))
    finger.use('jug', 'cat', 0.6, 1.8)
    expect(game.rec.cat).toBe('wet')
    expect(heard(game)).toEqual(expect.arrayContaining(['splat', 'hiss', 'yowl']))
    finger.use('jug', 'lamp', 0.6, 2)
    expect(game.rec.shade).toBe('plain')
    expect(heard(game)).toEqual(expect.arrayContaining(['sizzle', 'waver']))
    finger.use('jug', 'tub', 1, 1.4)
    expect(game.rec.suds).toBe(1)
    expect(heard(game)).toEqual(expect.arrayContaining(['fill', 'slosh']))
    // The suds go down a step with each pour, and stop at none.
    finger.use('jug', 'tub', 1, 1.4).use('jug', 'tub', 1, 1.4)
    expect(game.rec.suds).toBe(0)
  })

  it('towel: fluff on wet fur, a shine on the duck until it shoots out, a ball of fluff or a roll, a flare, and a soaking', () => {
    const game = clean({ cat: 'wet' }), finger = new Finger(game)
    finger.take('jug').move({ x: TEDDY.x - 62, y: TEDDY.y - 566 }).wait(1.5).drop().wait(1.6)
    expect(isDry(game.fur)).toBe(false)
    game.takeSounds()
    const wet = share(game.fur, 'wet')
    finger.use('towel', 'teddy', 2.5)
    expect(share(game.fur, 'wet')).toBeLessThan(wet)
    expect(heard(game)).toEqual(expect.arrayContaining(['stroke', 'hum', 'thump', 'puff']))
    finger.take('towel').move(spotOf('duck', game)).rub(0.5)
    expect(game.rec.duck).toBe('shine')
    finger.rub(2)
    expect(heard(game)).toEqual(expect.arrayContaining(['polish', 'plop']))
    finger.drop().wait(1)
    // A wet cat is rubbed into a ball of fluff; rubbed again, dry, it rolls over.
    finger.use('towel', 'cat', 2, 1.5)
    expect(game.rec.cat).toBe('fluff')
    expect(heard(game)).toEqual(expect.arrayContaining(['crackleFur', 'rattle']))
    const dry = clean(), second = new Finger(dry)
    second.use('towel', 'cat', 0.8, 0)
    expect(dry.cat.act?.id).toBe('roll')
    second.wait(2)
    finger.take('towel').move(spotOf('lamp', game)).rub(0.8)
    expect(game.lampFx.rubbed).toBe(1)
    finger.drop().wait(1)
    expect(heard(game)).toEqual(expect.arrayContaining(['glassRub', 'ting']))
    finger.take('towel').move(spotOf('tub', game)).rub(0.6)
    expect(game.things.towel.soaked).toBe(1)
    finger.drop().wait(0.6)
    expect(heard(game)).toEqual(expect.arrayContaining(['slurp', 'plip']))
    // It drips all the way home and is dry again there.
    finger.wait(2)
    expect(game.things.towel).toMatchObject({ mode: 'home', soaked: 0 })
  })

  it('the towel takes a brown print from mud and leaves the mud, and raises no fluff over it', () => {
    const game = fresh(), mud = share(game.fur, 'mud'), muddy = game.fur.mud.map((m) => m >= SEEN), fluff = [...game.fur.fluff]
    new Finger(game).use('towel', 'teddy', 1.5)
    expect(share(game.fur, 'mud')).toBeCloseTo(mud, 5)
    game.fur.fluff.forEach((f, i) => { if (muddy[i]) expect(f).toBe(fluff[i]) })
    const again = fresh(), finger = new Finger(again)
    finger.take('towel').move(belly).rub(0.6)
    expect(again.things.towel.print).toBeGreaterThan(0)
  })

  it.each(CLOTH_IDS.flatMap((id) => WEARERS.map((who) => [id, who] as const)))('%s let go over %s stay there, in the record at once, and are answered', (id, who) => {
    const game = clean(), finger = new Finger(game)
    finger.take(id).move(spotOf(who, game)).wait(0.3)
    // In the hand it is not in the record.
    expect(game.rec[id]).toBe(id === 'blanket' ? 'bed' : 'peg')
    game.changed = 0
    finger.drop()
    expect(game.rec[id]).toBe(who)
    expect(game.changed).toBe(2)
    expect(game.worn(id, who)).toBe(true)
    const sounds = heard(game)
    expect(sounds.length).toBeGreaterThan(0)
    expect(game.busy).toBe(true)
    finger.wait(6)
    expect(game.worn(id, who)).toBe(true)
    expect(putAway(game).rec[id]).toBe(who)
  })

  it('answers each cloth on each of the five in its own way', () => {
    const acts: Record<string, string> = {}
    for (const id of CLOTH_IDS) for (const who of WEARERS) {
      const game = clean(), finger = new Finger(game)
      finger.take(id).move(spotOf(who, game)).wait(0.3).drop()
      const actor = who === 'teddy' ? game.teddy.act : who === 'cat' ? game.cat.act : who === 'lamp' ? game.lampFx.act : game.duck.act
      acts[`${id} ${who}`] = actor?.id ?? game.sceneId ?? ''
    }
    expect(acts).toEqual({
      'pyjamas teddy': 'dress', 'pyjamas duck': 'tent', 'pyjamas cat': 'catWalk', 'pyjamas lamp': 'wear', 'pyjamas tub': 'raft',
      'blanket teddy': 'wrap', 'blanket duck': 'tuck', 'blanket cat': 'lump', 'blanket lamp': 'glowTent', 'blanket tub': 'dome',
    })
  })

  it('lets only Teddy wear both: on anyone else the one that was there goes back to its place', () => {
    const game = clean(), finger = new Finger(game)
    finger.use('pyjamas', 'duck', 0, 4).use('blanket', 'duck', 0, 2)
    expect(game.rec).toMatchObject({ blanket: 'duck', pyjamas: 'peg' })
    expect(game.things.pyjamas).toMatchObject({ mode: 'home', place: 'peg' })
    finger.use('blanket', 'teddy', 0, 2).use('pyjamas', 'teddy', 0, 2)
    expect(game.rec).toMatchObject({ blanket: 'teddy', pyjamas: 'teddy' })
  })

  it('stops what a cloth set off when the cloth is lifted, and flutters a cloth back from anywhere else', () => {
    const game = clean(), finger = new Finger(game)
    finger.use('blanket', 'cat', 0, 0.4)
    expect(game.cat.act?.id).toBe('lump')
    finger.take('blanket')
    expect(game.cat.act).toBeNull()
    game.takeSounds()
    finger.move(wall).drop()
    expect(heard(game)).toContain('flutter')
    finger.wait(1)
    // It goes back to where it was picked up, and the record never changed.
    expect(game.rec.blanket).toBe('cat')
    expect(game.worn('blanket', 'cat')).toBe(true)
  })

  it('on wet fur the blanket and the pyjamas show the wet, in the place where it is', () => {
    const game = clean(), finger = new Finger(game)
    finger.take('jug').move({ x: TEDDY.x - 62, y: TEDDY.y - 566 }).wait(1.5).drop().wait(1.6)
    finger.use('blanket', 'teddy', 0, 0.1)
    expect(game.teddy.act?.id).toBe('wrapWet')
    finger.wait(2)
    expect(game.teddy.shiver).toBeGreaterThan(0.6)
    expect(game.rec.phase).toBe('evening')
    finger.tap(LAMP).wait(1)
    // Wet under the blanket in the dark: still no sleep, and the state stays.
    expect(game.rec).toMatchObject({ phase: 'evening', blanket: 'teddy', lamp: 'down' })
    const dressed = clean(), second = new Finger(dressed)
    second.take('jug').move({ x: TEDDY.x - 62, y: TEDDY.y - 566 }).wait(1.5).drop().wait(1.6)
    second.use('pyjamas', 'teddy', 0, 3)
    expect(dressed.teddy.pluck).toBeGreaterThan(0.6)
  })

  it('the hand: a tickle, a squeak, a purr or a swat, the lamp, a splash, and dust anywhere else', () => {
    const game = clean(), finger = new Finger(game)
    finger.tap(belly)
    expect(heard(game)).toContain('giggle')
    finger.tap(spotOf('duck', game))
    expect(heard(game)).toContain('squeak')
    finger.tap({ x: CAT.x - 20, y: CAT.y - 30 })
    expect(heard(game)).toContain('purr')
    finger.wait(2).tap({ x: CAT.x + 50, y: CAT.y + 50 })
    expect(heard(game)).toContain('chirp')
    finger.tap(LAMP)
    expect(game.rec.lamp).toBe('down')
    expect(heard(game)).toContain('lampDown')
    finger.tap(LAMP)
    expect(game.rec.lamp).toBe('up')
    expect(heard(game)).toContain('lampUp')
    finger.tap(spotOf('tub', game)).wait(0.6)
    expect(heard(game)).toEqual(expect.arrayContaining(['splosh', 'plink']))
    finger.tap(wall)
    expect(heard(game)).toContain('thud')
    expect(game.bits.some((bit) => bit.kind === 'dust')).toBe(true)
    // The evening curtain opens and closes under the hand, and is saved.
    finger.tap(CURTAIN)
    expect(game.rec.curtain).toBe('open')
    finger.tap(CURTAIN)
    expect(game.rec.curtain).toBe('closed')
  })

  it('works as itself anywhere else in the room and leaves nothing behind', () => {
    const game = clean(), finger = new Finger(game), before = JSON.stringify(serialize(game.toSave()))
    finger.take('soap').move(door).rub(0.6).drop().wait(0.2)
    expect(game.bits.some((bit) => bit.kind === 'smear')).toBe(true)
    finger.take('towel').move(door).rub(0.6).drop().wait(0.2)
    expect(game.bits.some((bit) => bit.kind === 'wipe')).toBe(true)
    finger.take('jug').move({ x: 308, y: 300 }).wait(0.6).drop()
    expect(game.bits.some((bit) => bit.kind === 'damp')).toBe(true)
    finger.wait(3)
    expect(game.bits).toHaveLength(0)
    expect(JSON.stringify(serialize(game.toSave()))).toBe(before)
  })

  it('does the same to the same one every time', () => {
    const once = (): string => { const game = fresh(), finger = new Finger(game); finger.use('soap', 'teddy').use('jug', 'teddy').use('towel', 'cat').use('blanket', 'duck'); return JSON.stringify(serialize(game.toSave())) + heard(game).join() }
    expect(once()).toBe(once())
  })
})

describe('a tap', () => {
  it('sends a wash thing to Teddy, where it works once by itself and goes home', () => {
    for (const id of WASH_IDS) {
      const game = fresh(), finger = new Finger(game), before = JSON.stringify(game.fur)
      finger.tap(HOMES[id])
      expect(game.things[id].mode, id).toBe('flying')
      finger.wait(3.2)
      expect(game.things[id].mode, id).toBe('home')
      if (id !== 'towel') expect(JSON.stringify(game.fur), id).not.toBe(before)
      expect(heard(game), id).toEqual(expect.arrayContaining(['grab', 'home']))
    }
  })

  it("writes a tap's work to the record when the finger lifts, the same however long the frames are", () => {
    const quick = fresh(), slow = fresh(), away = fresh()
    for (const game of [quick, slow, away]) { game.press(HOMES.soap); game.tap() }
    const atLift = JSON.stringify(serialize(away.toSave()))
    for (let n = 0; n < 300; n++) quick.step(1 / 120)
    for (let n = 0; n < 25; n++) slow.step(0.1)
    expect(JSON.stringify(serialize(quick.toSave()))).toBe(atLift)
    expect(JSON.stringify(serialize(slow.toSave()))).toBe(atLift)
    expect(has(away.toSave().fur, 'foam')).toBe(true)
  })

  it('puts a cloth on Teddy, and takes one he already wears back to its own place', () => {
    const game = clean(), finger = new Finger(game)
    finger.tap(HOMES.blanket)
    expect(game.rec.blanket).toBe('teddy')
    finger.wait(2)
    expect(game.worn('blanket', 'teddy')).toBe(true)
    finger.tap(belly)
    expect(game.rec.blanket).toBe('bed')
    finger.wait(1)
    expect(game.things.blanket).toMatchObject({ mode: 'home', place: 'bed' })
  })

  it('makes no move when a press or a drag is taken away', () => {
    const game = clean(), finger = new Finger(game), before = JSON.stringify(serialize(game.toSave()))
    for (const id of THING_IDS) {
      finger.take(id).cancel().wait(1)
      expect(game.things[id].mode, id).toBe('home')
      finger.take(id).move(spotOf('duck', game), 60).cancel().wait(1)
      expect(game.things[id].mode, id).toBe('home')
    }
    expect(game.rec).toMatchObject({ blanket: 'bed', pyjamas: 'peg' })
    expect(JSON.stringify(serialize(game.toSave()).blanket)).toBe(JSON.stringify(JSON.parse(before).blanket))
    expect(game.held).toBeNull()
  })

  it('keeps a thing waiting in the air when the finger lifts mid-drag, and takes it up again', () => {
    const game = fresh(), finger = new Finger(game)
    finger.take('soap').move(belly)
    game.dragLift()
    expect(game.things.soap.mode).toBe('waiting')
    finger.wait(0.2)
    finger.move({ x: belly.x + 40, y: belly.y })
    expect(game.things.soap.mode).toBe('held')
    finger.drop().wait(1)
    expect(game.things.soap.mode).toBe('home')
  })
})

describe('sleep, and what keeps him from it', () => {
  it('yawns once for each of the three as it comes true, in any order, and sleeps on the third', () => {
    for (const order of [['blanket', 'lamp'], ['lamp', 'blanket']] as const) {
      const game = clean(), finger = new Finger(game), yawns: string[] = []
      const watch = (): void => { for (const sound of game.takeSounds()) if (sound.id === 'yawn') yawns.push(`yawn${sound.size}`) }
      for (const step of order) {
        if (step === 'blanket') finger.use('blanket', 'teddy', 0, 0); else finger.tap(LAMP)
        watch()
        if (game.rec.phase === 'evening') { finger.wait(3); watch() }
      }
      expect(game.rec).toMatchObject({ phase: 'night', finished: true, curtain: 'closed' })
      expect(game.sceneId).toBe('asleep')
      finger.wait(9)
      watch()
      expect(yawns).toEqual(['yawn2', 'yawn3'])
      expect(game.sceneId).toBeNull()
      expect(game.teddy.lying).toBe(1)
      expect(game.cat.x).toBe(CAT_NIGHT_X)
      expect(game.env.night).toBeGreaterThan(0.9)
    }
  })

  it('shows why he does not sleep: he peeps at the lamp, or hugs himself for the blanket', () => {
    const tucked = clean(), finger = new Finger(tucked)
    finger.use('blanket', 'teddy', 0, 3)
    expect(tucked.teddy.peep).toBeGreaterThan(0.8)
    expect(tucked.rec.phase).toBe('evening')
    const dark = clean(), second = new Finger(dark)
    second.tap(LAMP).wait(2)
    expect(dark.teddy.hug).toBeGreaterThan(0.8)
    expect(dark.want).toBe('blanket')
  })

  it('falls asleep on the last wet cell too: the towel can be the third', () => {
    const game = clean(), finger = new Finger(game)
    // Wet on his head, which shows above the blanket.
    CELL_PART.forEach((part, i) => { if (part === 'head' && Math.abs(cellX(i)) < 60 && cellY(i) > -400 && cellY(i) < -340) game.fur.wet[i] = 0.9 })
    finger.use('blanket', 'teddy', 0, 3).tap(LAMP).wait(1)
    expect(game.rec.phase).toBe('evening')
    finger.take('towel').move({ x: TEDDY.x, y: TEDDY.y - 380 })
    for (let n = 0; n < 40 && game.rec.phase === 'evening'; n++) finger.rub(0.1, 80)
    expect(game.rec.phase).toBe('night')
    expect(game.sceneId).toBe('asleep')
    // The finger that did it has let go: the towel goes home by itself.
    expect(game.held).toBeNull()
  })
})

describe('the scenes', () => {
  /** The evening done: clean, in the blanket, the lamp down. Returns the game at the first moment of the ending. */
  const toSleep = (over: Partial<Save> = {}): { game: Game; finger: Finger } => {
    const game = clean({ blanket: 'teddy', ...over }), finger = new Finger(game)
    finger.tap(LAMP)
    return { game, finger }
  }

  it('saves the ending whole when it starts, and a game put away in the middle is found asleep with no ending to play', () => {
    const { game, finger } = toSleep({ curtain: 'open' })
    expect(game.changed).toBe(2)
    expect(game.sceneId).toBe('asleep')
    for (const moment of [0, 0.5, 2, 4.5, 6]) {
      finger.wait(moment === 0 ? 0 : 0.5)
      const back = putAway(game)
      expect(back.rec).toMatchObject({ phase: 'night', finished: true, curtain: 'closed', blanket: 'teddy', lamp: 'down' })
      expect(back.sceneId).toBeNull()
      expect(back.busy).toBe(false)
      expect(back.teddy.lying).toBe(1)
      expect(back.env.night).toBe(1)
      back.step(0.5)
      expect(back.takeSounds()).toEqual([])
    }
  })

  it('finds a tapped blanket asleep too: the tap is in the record before its arc is drawn', () => {
    const game = clean({ lamp: 'down' })
    game.press(HOMES.blanket)
    game.tap()
    expect(game.things.blanket.mode).toBe('flying')
    expect(game.rec.phase).toBe('night')
    const back = putAway(game)
    expect(back.rec).toMatchObject({ phase: 'night', blanket: 'teddy', finished: true })
    expect(back.sceneId).toBeNull()
    expect(back.worn('blanket', 'teddy')).toBe(true)
  })

  it('takes a scene straight to its last pose on any touch, and the touch is then an ordinary touch', () => {
    const { game, finger } = toSleep({ curtain: 'open' })
    finger.wait(1)
    game.takeSounds()
    finger.tap({ x: TEDDY.x, y: 60 })
    expect(game.sceneId).toBeNull()
    expect(game.teddy.lying).toBe(1)
    expect(game.env).toMatchObject({ night: 1, curtainAt: 0 })
    expect(game.cat.x).toBe(CAT_NIGHT_X)
    // Only the touch itself is heard: a puff of dust, and none of the beats that were cut.
    expect(heard(game)).toEqual(['thud'])
  })

  it('stays night for as long as the child likes, and nothing happens until the curtain is touched', () => {
    const { game, finger } = toSleep()
    finger.wait(9)
    game.takeSounds()
    const before = JSON.stringify(serialize(game.toSave()))
    game.changed = 0
    finger.wait(40)
    expect(JSON.stringify(serialize(game.toSave()))).toBe(before)
    expect(game.changed).toBe(0)
    expect(game.want).toBe('curtain')
    // A touch on him is answered and changes nothing; the blanket stays on him.
    finger.tap({ x: 1002, y: 506 })
    expect(game.teddy.act?.id).toBe('stir')
    expect(heard(game)).toContain('sigh')
    finger.wait(2).tap(HOMES.soap).wait(1.5)
    expect(game.things.soap.mode).toBe('home')
    expect(JSON.stringify(serialize(game.toSave()))).toBe(before)
  })

  it('goes out to the garden on a touch of the curtain: saved whole at the start, with new mud that differs from the morning before', () => {
    const { game, finger } = toSleep({ duck: 'foam', cat: 'fluff', shade: 'foam', suds: 2, pyjamas: 'duck' })
    finger.wait(9)
    const was = [...game.rec.mudPlaces]
    game.changed = 0
    finger.tap({ x: CURTAIN.x + 30, y: CURTAIN.y + 20 })
    expect(game.sceneId).toBe('garden')
    expect(game.changed).toBe(2)
    const saved = game.toSave()
    expect(saved).toMatchObject({ phase: 'morning', curtain: 'open', blanket: 'bed', pyjamas: 'peg', duck: 'plain', cat: 'plain', shade: 'plain', suds: 0, finished: true })
    expect(saved.mudPlaces.length).toBeGreaterThanOrEqual(2)
    expect(saved.mudPlaces.length).toBeLessThanOrEqual(4)
    expect([...saved.mudPlaces].sort()).not.toEqual([...was].sort())
    expect(has(saved.fur, 'mud')).toBe(true)
    expect(isDry(saved.fur)).toBe(true)
    // Put away mid-scene: found in the morning, behind the glass, no scene.
    finger.wait(2)
    const back = putAway(game)
    expect(back.rec.phase).toBe('morning')
    expect(back.sceneId).toBeNull()
    expect(back.teddy).toMatchObject({ outside: 1, pressed: 1 })
    expect(back.want).toBe('door')
    finger.wait(6)
    expect(game.sceneId).toBeNull()
    expect(game.teddy).toMatchObject({ outside: 1, pressed: 1, lying: 0 })
    expect(JSON.stringify(game.fur)).toBe(JSON.stringify(saved.fur))
    expect(game.things.blanket).toMatchObject({ mode: 'home', place: 'bed' })
    expect(game.things.pyjamas).toMatchObject({ mode: 'home', place: 'peg' })
    expect(game.cat.x).toBe(CAT.x)
    // The morning waits: he never knocks or calls.
    game.takeSounds()
    finger.wait(30)
    expect(game.takeSounds()).toEqual([])
    expect(game.rec.phase).toBe('morning')
  })

  it('comes in on a touch of the door: the next evening, saved at the start, with the lamp up', () => {
    const { game, finger } = toSleep()
    finger.wait(9).tap({ x: CURTAIN.x + 30, y: CURTAIN.y + 20 }).wait(8)
    game.changed = 0
    finger.tap({ x: DOORWAY.x + 24, y: DOORWAY.y + 60 })
    expect(game.sceneId).toBe('comingIn')
    expect(game.changed).toBe(2)
    expect(game.toSave()).toMatchObject({ phase: 'evening', finished: false, lamp: 'up', curtain: 'open' })
    const back = putAway(game)
    expect(back.sceneId).toBeNull()
    expect(back.teddy.stance).toMatchObject({ x: TEDDY.x, y: TEDDY.y, scale: 1 })
    finger.wait(6)
    expect(game.sceneId).toBeNull()
    expect(game.teddy.stance).toMatchObject({ x: TEDDY.x, y: TEDDY.y, scale: 1 })
    expect(game.show.lamp).toBe('up')
    expect(game.want).toBe('soap')
    expect(game.env.doorAt).toBeLessThan(0.05)
  })

  it('the cat walks off in the pyjamas and comes back to sit in them, saved when it starts', () => {
    const game = clean(), finger = new Finger(game)
    finger.take('pyjamas').move(spotOf('cat', game)).wait(0.3)
    game.changed = 0
    finger.drop()
    expect(game.sceneId).toBe('catWalk')
    expect(game.changed).toBe(2)
    expect(game.rec.pyjamas).toBe('cat')
    let sunk = 0
    for (let n = 0; n < 60 * 6; n++) { game.step(1 / 60); sunk = Math.max(sunk, game.cat.sunk) }
    expect(sunk).toBe(1)
    expect(game.sceneId).toBeNull()
    expect(game.cat).toMatchObject({ x: CAT.x, sunk: 0, stiff: 0 })
    expect(heard(game)).toEqual(expect.arrayContaining(['flump', 'warble', 'step']))
    expect(putAway(game).rec.pyjamas).toBe('cat')
  })
})

describe('found as left', () => {
  it('comes back with everything where it was, nothing easing in, and silent', () => {
    const game = fresh(), finger = new Finger(game)
    finger.use('soap', 'teddy').use('soap', 'duck').use('jug', 'cat').use('soap', 'lamp').use('soap', 'tub', 0.4).tap(LAMP).use('pyjamas', 'lamp').use('blanket', 'tub', 0, 3).tap(CURTAIN).wait(1)
    const back = putAway(game)
    expect(serialize(back.toSave())).toEqual(serialize(game.toSave()))
    expect(back.show).toEqual({ duck: 'foam', cat: 'wet', shade: 'foam', suds: 1, lamp: 'down' })
    expect(back.env).toMatchObject({ curtainAt: 1, curtainGoal: 1 })
    expect(back.duck.wig).toBe(1)
    expect(back.tub.sudsAt).toBe(1)
    expect(back.worn('pyjamas', 'lamp')).toBe(true)
    expect(back.worn('blanket', 'tub')).toBe(true)
    expect(back.busy).toBe(false)
    back.step(1 / 60)
    expect(back.takeSounds()).toEqual([])
    expect(back.changed).toBe(0)
  })

  it('saves nothing in the hand or in the air: a thing put away mid-drag is back at its place', () => {
    const game = clean(), finger = new Finger(game)
    finger.take('blanket').move(spotOf('duck', game))
    expect(putAway(game).rec.blanket).toBe('bed')
    finger.drop()
    expect(putAway(game).rec.blanket).toBe('duck')
  })

  it('is found asleep when it was left dry, tucked in and in the dark by an older save', () => {
    const game = clean({ blanket: 'teddy', lamp: 'down' })
    expect(game.rec).toMatchObject({ phase: 'night', finished: true, curtain: 'closed' })
    expect(game.sceneId).toBeNull()
  })

  it('never lets a pending answer outlive its cause or start full on load', () => {
    const game = clean({ blanket: 'duck', lamp: 'down' }), finger = new Finger(game)
    // The duck snores only after a while, never in the first frame of a visit.
    game.step(1 / 60)
    expect(game.takeSounds()).toEqual([])
    finger.wait(3)
    expect(heard(game)).toContain('snore')
    // The blanket is lifted: no snore follows.
    finger.take('blanket')
    game.takeSounds()
    finger.wait(5)
    expect(heard(game)).not.toContain('snore')
    finger.cancel().wait(1)
  })
})

describe('what the first reading found', () => {
  it('yawns for as long as the yawn sounds when the blanket is tapped: the yawn waits for the blanket to land', () => {
    const game = clean(), finger = new Finger(game)
    let wrap = 0, yawn = 0, heardAt = -1, t = 0
    finger.tap(HOMES.blanket)
    for (let n = 0; n < 60 * 6; n++) {
      finger.wait(1 / 60); t += 1 / 60
      if (game.teddy.act?.id === 'wrap') wrap += 1 / 60
      if (game.teddy.act?.id === 'yawn2') yawn += 1 / 60
      if (heard(game).includes('yawn') && heardAt < 0) heardAt = t
    }
    expect(wrap).toBeGreaterThan(ACTS.wrap.length - 0.1)
    expect(yawn).toBeGreaterThan(ACTS.yawn2.length - 0.1)
    // It is heard when it starts, after the blanket has landed and settled.
    expect(heardAt).toBeGreaterThan(ACTS.wrap.length)
  })

  it('keeps the lamp down while he sleeps: a touch swings it and is heard, and parked is as loaded', () => {
    const game = clean({ blanket: 'teddy' }), finger = new Finger(game)
    finger.tap(LAMP).wait(12)
    expect(game.rec.phase).toBe('night')
    heard(game)
    finger.tap(LAMP)
    expect(heard(game)).toContain('lampDown')
    expect(Math.abs(game.lampFx.swing.v) + Math.abs(game.lampFx.swing.d)).toBeGreaterThan(0)
    finger.wait(2)
    expect(game.rec.lamp).toBe('down')
    expect(game.show.lamp).toBe('down')
    const loaded = putAway(game)
    expect(loaded.show.lamp).toBe(game.show.lamp)
    expect(loaded.rec).toMatchObject({ phase: 'night', lamp: 'down', blanket: 'teddy', finished: true })
  })

  it('picks the blanket up where it is drawn: on the dome while it swells, by its corner once it has sunk', () => {
    const game = clean(), finger = new Finger(game)
    finger.use('blanket', 'tub', 0.4, 0.3)
    expect(game.duck.act?.id).toBe('dome')
    const dome = blanketDome(game.domeSwell())
    expect(game.domeSwell()).toBeGreaterThan(0.5)
    expect(whatAt({ x: dome.x + 70, y: dome.y + 6 }, game.world())).toEqual({ kind: 'thing', id: 'blanket' })
    expect(game.rests().blanket).toMatchObject({ x: dome.x, y: dome.y })
    // The duck rides up on it and is touched where it is drawn, on top.
    expect(duckSpot(game.world()).y).toBeLessThan(DUCK.y - 50)
    expect(whatAt({ x: DUCK.x, y: duckSpot(game.world()).y - 20 }, game.world())).toEqual({ kind: 'who', id: 'duck' })
    finger.wait(3)
    expect(game.duck.act).toBeNull()
    expect(game.rests().blanket).toMatchObject({ x: 230, y: 632 })
    expect(whatAt({ x: 230, y: 632 }, game.world())).toEqual({ kind: 'thing', id: 'blanket' })
  })

  it('shows the wet patch of a cloth where the water is, and none for foam', () => {
    const fur = freshFur([])
    CELL_PART.forEach((part, i) => { if (part && cellX(i) > 60 && cellY(i) > -200) fur.wet[i] = 0.9 })
    const wet = new Game({ ...freshSave(null), fur, mudPlaces: [], blanket: 'teddy' }, 1)
    const at = wet.dampUnder('blanket')!
    expect(at.x).toBeGreaterThan(60)
    expect(at.y).toBeGreaterThan(-200)
    const foam = freshFur([])
    CELL_PART.forEach((part, i) => { if (part) foam.foam[i] = 0.9 })
    expect(new Game({ ...freshSave(null), fur: foam, mudPlaces: [], blanket: 'teddy' }, 1).dampUnder('blanket')).toBeNull()
  })

  it('holds out the paw nearer the thing his coat asks for, and lifts a foot at each thump', () => {
    const game = fresh(), finger = new Finger(game)
    finger.wait(2)
    expect(game.rests().soap.x).toBeLessThan(TEDDY.x)
    expect(game.teddy.armL.v).toBeGreaterThan(0.3)
    expect(game.teddy.armR.v).toBeLessThan(0.1)
    const wet = clean()
    CELL_PART.forEach((part, i) => { if (part) wet.fur.wet[i] = 0.9 })
    const rub = new Finger(wet)
    let lifted = 0
    rub.take('towel').move({ x: TEDDY.x, y: TEDDY.y - 200 })
    for (let n = 0; n < 40; n++) { rub.rub(0.1); if (heard(wet).includes('thump')) { expect(wet.teddy.stamp).toBeGreaterThan(0.3); lifted += 1 } }
    expect(lifted).toBeGreaterThan(0)
  })
})

describe('what the second reading found', () => {
  /** His head, where a cloth never lies. */
  const onHead = (i: number): boolean => CELL_PART[i] === 'head'
  /** Under the blanket only: his legs, which the pyjamas leave bare. */
  const legs = (i: number): boolean => CELL_PART[i] !== null && coveredBy('blanket', cellX(i), cellY(i)) && !coveredBy('pyjamas', cellX(i), cellY(i))
  const trunk = (i: number): boolean => CELL_PART[i] !== null && coveredBy('pyjamas', cellX(i), cellY(i))

  it('sends a tapped soap to where it shows on a clean bear who wears a cloth: foam on his head, never nothing', () => {
    for (const over of [{ blanket: 'teddy' }, { pyjamas: 'teddy' }, { blanket: 'teddy', pyjamas: 'teddy' }] as const) {
      const game = clean(over), before = JSON.stringify(serialize(game.toSave()))
      new Finger(game).tap(game.rests().soap).wait(3.2)
      // The cloth stays on, and the foam is where the child can see it.
      expect(game.rec).toMatchObject(over)
      expect(game.fur.foam.some((foam, i) => onHead(i) && foam >= SEEN)).toBe(true)
      expect(game.fur.foam.every((foam, i) => foam < SEEN || onHead(i))).toBe(true)
      expect(JSON.stringify(serialize(game.toSave()))).not.toBe(before)
    }
  })

  it('sends back only the cloth the work lies under', () => {
    // Water on his legs, under the blanket: the pyjamas stay on.
    const wetLegs = clean({ blanket: 'teddy', pyjamas: 'teddy' })
    CELL_PART.forEach((_part, i) => { if (legs(i)) wetLegs.fur.wet[i] = 0.9 })
    expect([...CELL_PART.keys()].some(legs)).toBe(true)
    new Finger(wetLegs).tap(wetLegs.rests().towel).wait(3.2)
    expect(wetLegs.rec).toMatchObject({ blanket: 'bed', pyjamas: 'teddy' })
    // Foam on his trunk, under both: both go.
    const foamy = clean({ blanket: 'teddy', pyjamas: 'teddy' })
    CELL_PART.forEach((_part, i) => { if (trunk(i)) foamy.fur.foam[i] = 0.9 })
    new Finger(foamy).tap(foamy.rests().jug).wait(3.2)
    expect(foamy.rec).toMatchObject({ blanket: 'bed', pyjamas: 'peg' })
  })

  it('makes a wash thing tapped while a tapped cloth is in the air wait for it to land, and then send it back first', () => {
    const game = clean(), finger = new Finger(game)
    CELL_PART.forEach((_part, i) => { if (legs(i)) game.fur.wet[i] = 0.9 })
    const before = share(game.fur, 'wet')
    finger.tap(HOMES.blanket).tap(game.rests().towel)
    expect(game.things.blanket.mode).toBe('flying')
    expect(game.things.towel.mode).toBe('waiting')
    expect(game.rec.blanket).toBe('teddy')
    // It hangs where it is until the blanket is down, and goes in that same moment.
    let waited = 0
    while (game.things.blanket.mode === 'flying' && waited < 60) { expect(game.things.towel.mode).toBe('waiting'); finger.wait(1 / 60); waited += 1 }
    expect(waited).toBeGreaterThan(5)
    expect(game.things.blanket.mode).toBe('returning')
    expect(game.things.towel.mode).toBe('flying')
    finger.wait(3.2)
    // The towel did its work: the blanket went back to the bed and the water under it is less.
    expect(game.rec.blanket).toBe('bed')
    expect(share(game.fur, 'wet')).toBeLessThan(before * 0.6)
    expect(game.things.towel.mode).toBe('home')
    // Put away while it waits, it is back at its place with the blanket on him.
    const waiting = clean(), tapper = new Finger(waiting)
    tapper.tap(HOMES.blanket).tap(waiting.rests().soap)
    const back = putAway(waiting)
    expect(back.rec.blanket).toBe('teddy')
    expect(back.things.soap.mode).toBe('home')
  })

  it('gives foam alone under the blanket no shiver, no drops and no drip, and water there all three', () => {
    const under = (layer: 'foam' | 'wet'): { shiver: number; drips: number; acts: Set<string> } => {
      const game = clean(), finger = new Finger(game), acts = new Set<string>()
      CELL_PART.forEach((_part, i) => { if (legs(i)) game.fur[layer][i] = 0.9 })
      finger.use('blanket', 'teddy', 0, 0)
      let drips = 0, shiver = 0
      for (let n = 0; n < 60 * 6; n++) {
        finger.wait(1 / 60)
        if (game.teddy.act) acts.add(game.teddy.act.id)
        drips += heard(game).filter((id) => id === 'drip').length
        shiver = Math.max(shiver, game.teddy.shiver)
      }
      return { shiver, drips, acts }
    }
    const foam = under('foam'), wet = under('wet')
    expect(foam.shiver).toBe(0)
    expect(foam.drips).toBe(0)
    expect(foam.acts.has('wrapWet')).toBe(false)
    expect(foam.acts.has('wrap')).toBe(true)
    expect(wet.shiver).toBeGreaterThan(0.9)
    expect(wet.drips).toBeGreaterThan(0)
    expect(wet.acts.has('wrapWet')).toBe(true)
  })

  it('throws the ear shadows every time the blanket lands on the lamp, after whatever he is doing', () => {
    const game = clean(), finger = new Finger(game)
    // The pyjamas are tapped onto him, and the blanket is on the lamp while he is still getting into them.
    finger.tap(HOMES.pyjamas).use('blanket', 'lamp', 0, 0)
    expect(game.worn('blanket', 'lamp')).toBe(true)
    expect(game.teddy.act?.id).toBe('dress')
    const acts: string[] = []
    for (let n = 0; n < 60 * 8; n++) { finger.wait(1 / 60); const id = game.teddy.act?.id; if (id && acts[acts.length - 1] !== id) acts.push(id) }
    expect(acts).toContain('shadow')
    expect(acts.indexOf('shadow')).toBeGreaterThan(acts.indexOf('dress'))
    // And again the next time it lands there.
    finger.use('blanket', 'bed' as never, 0, 0.2)
    finger.take('blanket').move(spotOf('lamp', game)).wait(0.3).drop().wait(0.2)
    expect(game.teddy.act?.id).toBe('shadow')
    // Lifted off before he got to them, there are none.
    const other = clean(), hand = new Finger(other)
    hand.tap(HOMES.pyjamas).use('blanket', 'lamp', 0, 0).take('blanket').move({ x: 400, y: 230 }).drop()
    let shadows = 0
    for (let n = 0; n < 60 * 6; n++) { hand.wait(1 / 60); if (other.teddy.act?.id === 'shadow') shadows += 1 }
    expect(shadows).toBe(0)
  })

  it('lets the water of the jug sound brighter the faster the jug is swept over him', () => {
    const speeds = (sweep: boolean): number[] => {
      const game = fresh(), finger = new Finger(game), out: number[] = []
      const over = pourOver('teddy', game)
      finger.take('jug').move(over).wait(0.6)
      game.takeSounds()
      for (let n = 0; n < 40; n++) {
        if (sweep) finger.move({ x: over.x + (n % 2 ? 70 : -70), y: over.y }, 24); else finger.wait(0.1)
        for (const sound of game.takeSounds()) if (sound.id === 'stroke' && sound.thing === 'jug') out.push(sound.speed)
      }
      return out
    }
    const still = speeds(false), swept = speeds(true)
    expect(still.length).toBeGreaterThan(3)
    expect(swept.length).toBeGreaterThan(3)
    expect(Math.max(...still)).toBeLessThan(0.15)
    expect(Math.max(...swept)).toBeGreaterThan(0.5)
  })

  /** The Mount's idle ladder over a game nobody touches: which demonstrations of the ghost hand came, in order. */
  const handsShown = (game: Game, seconds: number): { shown: number[]; acts: Set<string> } => {
    const ladder = new IdleLadder(0), shown: number[] = [], acts = new Set<string>()
    for (let n = 1; n <= seconds * 60; n++) {
      game.step(1 / 60)
      const now = n / 60
      if (game.busy) ladder.touch(now)
      const index = ladder.update(now).demoIndex
      if (index >= 0 && shown[shown.length - 1] !== index) shown.push(index)
      for (const act of [game.teddy.act, game.duck.act]) if (act) acts.add(act.id)
    }
    return { shown, acts }
  }

  it('lets the ghost hand back off while a clean dry bear yawns by himself', () => {
    const { shown, acts } = handsShown(clean(), 100)
    expect(acts.has('yawnIdle')).toBe(true)
    // Each demonstration comes once, later each time, and then no more: the yawn does not start the ladder again.
    expect(shown).toEqual([0, 1, 2, 3])
  })

  it('still brings the ghost hand with the duck tucked in and the lamp down, snoring', () => {
    const game = clean({ blanket: 'duck', lamp: 'down' })
    const { shown, acts } = handsShown(game, 100)
    expect(acts.has('snore')).toBe(true)
    expect(shown).toEqual([0, 1, 2, 3])
    expect(game.want).toBe('blanket')
  })
})

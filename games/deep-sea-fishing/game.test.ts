import { describe, expect, it } from 'vitest'
import { Game, HUNTER_REACHES, LINE_PER_CLICK, LINE_PER_CLICK_UP, PULL_OUT, REEL_STEP, bodyBox } from './game'
import { CELLS, type CellKey } from './grid'
import { FRAME, beside, bring, draw, make, run } from './kit'
import { CAT_IS_DOWN, OPINIONS, catPose } from './motion'
import { makeRng } from './rng'
import { BAITS, CREATURES, CREATURE_IDS, HOOK_REST, NET, PEGS, TUB_SLOTS, WATERLINE, slotAt, type Bait, type CreatureId, type Rect } from './sea'

// The rules of the sheet (ART.md): the baits on their pegs, the six kinds of
// outcome, the three rules of passing, the net and the tub, and what waits
// for the child's touch.

const names = (cues: readonly { name: string }[]): string[] => cues.map((cue) => cue.name)
const peg = (bait: Exclude<Bait, 'none'>): { x: number; y: number } => ({ x: PEGS[bait].x, y: PEGS[bait].y + 24 })
/** Lifts the hook out of the water under the rod. */
const lift = (game: Game, seconds = 1.6): ReturnType<typeof run> => draw(game, { x: 620, y: 150 }, seconds)

describe('the baits on their pegs', () => {
  it('puts a tapped bait on the hook, and takes it off again with a tap on its empty peg', () => {
    const game = make()
    for (const bait of BAITS) {
      game.press(peg(bait))
      expect(game.bait).toBe(bait)
      expect(names(game.cues)).toEqual(['baitOn'])
      expect(game.dirty).toBe(2)
      game.cues.length = 0
    }
    game.press(peg('boot'))
    expect(game.bait).toBe('none')
    expect(names(game.cues)).toEqual(['baitOff'])
  })

  it('swaps one bait for another wherever the hook hangs, so a bait can be changed in the deep', () => {
    const game = make({ bait: 'glow', hook: { x: 700, y: 640 } })
    game.press(peg('spoon'))
    expect(game.bait).toBe('spoon')
    expect(game.rest).toEqual({ x: 700, y: 640 })
    expect(game.held).toBe(false)
  })

  it('only swings a bait on its peg while someone is on the hook', () => {
    const game = make({ hooked: 'puffer', hook: { x: 700, y: 400 } })
    game.press(peg('cheese'))
    expect(game.bait).toBe('none')
    expect(names(game.cues)).toEqual(['pegTok'])
    expect(game.peg).toEqual({ bait: 'cheese', since: 0 })
  })
})

describe('the six kinds of outcome', () => {
  const landed = (bait: Bait, id: CreatureId, seconds = 2.6): Game => { const game = beside(id, bait); bring(game, id, seconds); return game }

  it('bites: the creature is on the hook, the bait is back on its peg, and it comes up with the line', () => {
    for (const [bait, id] of [['worm', 'puffer'], ['worm', 'angler'], ['boot', 'jelly'], ['boot', 'octopus']] as const) {
      const game = landed(bait, id)
      expect(game.hooked, id).toBe(id)
      expect(game.bait, id).toBe('none')
      expect(game.creatures[id].mode, id).toBe('hooked')
      draw(game, { x: 700, y: 330 }, 1.2)
      const at = game.centre(id)
      expect(Math.hypot(at.x - game.hook.x, at.y - game.hook.y), id).toBeLessThan(110)
    }
  })

  it('steals: the bait is gone from the hook and back on its peg, and nobody is hooked', () => {
    for (const [bait, id] of [['worm', 'shoal'], ['worm', 'turtle'], ['worm', 'squid'], ['worm', 'octopus'], ['glow', 'shark']] as const) {
      const game = landed(bait, id)
      expect(game.bait, id).toBe('none')
      expect(game.hooked, id).toBeNull()
      expect(game.following, id).toEqual([])
    }
  })

  it('follows: the creature trails behind the hook for as long as that bait is on it', () => {
    for (const [bait, id] of [['spoon', 'shoal'], ['spoon', 'turtle'], ['glow', 'jelly'], ['glow', 'angler'], ['cheese', 'blobfish']] as const) {
      const game = landed(bait, id)
      expect(game.following, id).toEqual([id])
      expect(game.bait, id).toBe(bait)
      const before = game.centre(id)
      draw(game, { x: 760, y: 330 }, 6)
      const after = game.centre(id)
      // It has come after the hook, up through the layers too.
      expect(Math.hypot(after.x - 760, after.y - 330), id).toBeLessThan(Math.hypot(before.x - 760, before.y - 330))
      expect(Math.hypot(after.x - game.hook.x, after.y - game.hook.y), id).toBeLessThan(260)
      // The bait changes: it drifts home at its own pace.
      game.release()
      game.press(peg('boot'))
      expect(game.following, id).toEqual([])
      expect(game.creatures[id].mode, id).toBe('return')
      run(game, 14)
      expect(game.creatures[id].mode, id).toBe('home')
    }
  })

  it('flees upward: the pufferfish bolts from the spoon and bumps the hull, away from the net', () => {
    const game = beside('puffer', 'spoon')
    // It is taken where its stretch is clear of the net.
    for (let i = 0; i < 2000 && !(game.centre('puffer').x > NET.right + 20 && game.centre('puffer').x < 260); i++) run(game, FRAME)
    const heard = bring(game, 'puffer', 2.4)
    expect(names(heard)).toContain('fright')
    expect(names(heard)).toContain('bump')
    expect(game.tub).toEqual([])
    run(game, 6)
    expect(game.creatures.puffer.mode).toBe('home')
  })

  it('flees upward into the net when it comes up under it, and is scooped into the tub', () => {
    const game = beside('puffer', 'spoon')
    for (let i = 0; i < 3000 && !(game.centre('puffer').x > NET.left + 12 && game.centre('puffer').x < NET.right - 6); i++) run(game, FRAME)
    expect(game.centre('puffer').x).toBeLessThan(NET.right)
    const heard = bring(game, 'puffer', 1)
    expect(names(heard)).toContain('scoop')
    // It is in the tub from the moment the net has it.
    expect(game.tub).toEqual(['puffer'])
    expect(game.dirty).toBe(2)
    expect(names(run(game, 1.5))).toContain('land')
    expect(game.flights).toEqual([])
    expect(game.cat.act).toBe(OPINIONS.puffer)
  })

  it('whether the net gets the pufferfish is never luck: it is under the net for a part of every round of its stretch', () => {
    const game = make()
    let under = 0, steps = 0
    for (let t = 0; t < 2 * Math.PI / 0.4; t += 0.1, steps++) { run(game, 0.1); const x = game.centre('puffer').x; if (x >= NET.left && x <= NET.right) under++ }
    expect(under / steps).toBeGreaterThan(0.1)
    expect(under / steps).toBeLessThan(0.4)
    // And the squid's stretch passes under it too.
    let squid = 0
    for (let t = 0; t < 2 * Math.PI / 0.3; t += 0.1) { run(game, 0.1); const x = game.centre('squid').x; if (x >= NET.left && x <= NET.right) squid++ }
    expect(squid).toBeGreaterThan(0)
  })

  it('tows: the shark takes the worm and the scene starts, with its outcome already in place', () => {
    const game = beside('shark', 'worm', { tub: ['puffer'] })
    bring(game, 'shark', 0.6)
    expect(game.tow).not.toBeNull()
    expect(game.snapshot()).toEqual({ bait: 'none', hook: { ...HOOK_REST }, hooked: null, following: [], tub: ['puffer'], finished: false })
    expect(game.dirty).toBe(2)
    expect(game.held).toBe(false)
  })

  it('a joke changes nothing but the moment', () => {
    for (const [bait, id] of [['cheese', 'squid'], ['boot', 'shark'], ['spoon', 'octopus'], ['none', 'blobfish'], ['glow', 'turtle']] as const) {
      const game = beside(id, bait), before = { ...game.snapshot(), hook: null }
      bring(game, id, 3.4)
      expect({ ...game.snapshot(), hook: null }, `${bait}.${id}`).toEqual(before)
    }
  })

  it('nothing is caught with a bare hook', () => {
    for (const id of CREATURE_IDS) {
      const game = beside(id, 'none')
      bring(game, id, 3.4)
      expect(game.hooked, id).toBeNull()
      expect(game.following, id).toEqual([])
    }
  })

  it('names an outcome for every cell that the rules can carry out', () => {
    for (const key of Object.keys(CELLS) as CellKey[]) expect(['bites', 'steals', 'follows', 'flees', 'tows', 'joke']).toContain(CELLS[key].outcome)
  })
})

describe('the tub', () => {
  it('takes a catch lifted out of the water, from the moment it leaves the hook, and the cat gives its opinion', () => {
    const game = beside('angler', 'worm')
    bring(game, 'angler', 1.6)
    game.dirty = 0
    let saved = -1
    const heard = draw(game, { x: 620, y: 150 }, 3, () => { if (saved < 0 && game.tub.length === 1) saved = game.flights.length })
    // It was in the saved tub while it was still in the air.
    expect(saved).toBe(1)
    expect(game.dirty).toBe(2)
    expect(game.hooked).toBeNull()
    expect(game.tub).toEqual(['angler'])
    expect(names(heard)).toContain('land')
    expect(names(heard)).toContain('catPounce')
    expect(game.creatures.angler.mode).toBe('away')
  })

  it('gives each catch the same opinion every time', () => {
    for (const [bait, id] of [['worm', 'puffer'], ['boot', 'jelly'], ['boot', 'octopus']] as const) {
      for (const seed of [3, 11]) {
        const game = beside(id, bait, {}, seed)
        bring(game, id, 2.2)
        let act: string | null = null
        lift(game, 0.2)
        draw(game, { x: 620, y: 150 }, 3, () => { if (game.cat.act?.startsWith('op')) act = game.cat.act })
        expect(act, id).toBe(OPINIONS[id])
      }
    }
  })

  it('bounces a fifth catch off a full tub: it falls back into the sea and swims home, and the tub is as it was', () => {
    const tub = ['puffer', 'squid', 'jelly', 'octopus'] as const
    const game = beside('angler', 'worm', { tub: [...tub] })
    bring(game, 'angler', 1.6)
    const heard = lift(game, 3)
    expect(names(heard)).toContain('bounce')
    expect(names(heard)).not.toContain('land')
    expect(game.tub).toEqual([...tub])
    expect(game.hooked).toBeNull()
    expect(['return', 'home']).toContain(game.creatures.angler.mode)
    run(game, 12)
    expect(game.creatures.angler.mode).toBe('home')
    expect(game.flights).toEqual([])
  })

  it('slops when it is tapped before it is full, and the cat flinches', () => {
    const game = make({ tub: ['puffer', 'squid', 'jelly'] })
    game.press({ x: 285, y: 140 })
    expect(names(game.cues)).toEqual(['slosh', 'flinch'])
    expect(game.cat.act).toBe('flinch')
    expect(game.tip).toBeNull()
    expect(game.tub).toHaveLength(3)
    expect(game.dirty).toBe(0)
  })

  it('tips one catch back over the rail when that catch is tapped, saved at once, and the others close up', () => {
    const game = make({ tub: ['puffer', 'squid', 'jelly'] })
    game.press({ x: TUB_SLOTS[1].x, y: TUB_SLOTS[1].y })
    expect(game.tub).toEqual(['puffer', 'jelly'])
    expect(game.dirty).toBe(2)
    expect(names(game.cues)).toEqual(['tipBack'])
    run(game, 1.5)
    expect(game.flights).toEqual([])
    expect(['return', 'home']).toContain(game.creatures.squid.mode)
    expect(game.creatures.jelly.off.x).toBeCloseTo(TUB_SLOTS[1].x, 0)
    run(game, 9)
    expect(game.creatures.squid.mode).toBe('home')
  })

  it('never takes a tap on a catch or on the cat for a tap on the tub', () => {
    const game = make({ tub: ['puffer', 'squid', 'jelly', 'octopus'] })
    game.press({ x: 446, y: 110 })
    expect(game.tip).toBeNull()
    expect(game.tub).toHaveLength(4)
    game.press({ x: TUB_SLOTS[3].x, y: TUB_SLOTS[3].y })
    expect(game.tip).toBeNull()
    expect(game.tub).toHaveLength(3)
  })
})

describe('who passes whom', () => {
  it('a light in the dark: the spoon is dull below the sunlit water and flashes in it', () => {
    const dark = make({ bait: 'spoon', hook: { x: 700, y: 650 } })
    expect(dark.spoonFlashes()).toBe(false)
    const sun = make({ bait: 'spoon', hook: { x: 700, y: 300 } })
    expect(sun.spoonFlashes()).toBe(true)
  })

  it('a light in the dark: the spoon flashes beside the jellyfish, the stick-lit shark and a following anglerfish', () => {
    const byJelly = make({ bait: 'spoon', hook: { x: 520, y: 470 } })
    expect(byJelly.spoonFlashes()).toBe(true)
    const shark = make({ bait: 'spoon', hook: { x: 845, y: 600 } })
    expect(shark.spoonFlashes()).toBe(false)
    shark.creatures.shark.extra = 5
    run(shark, FRAME)
    const at = shark.centre('shark')
    draw(shark, { x: at.x, y: at.y + 100 }, 0.02)
    shark.creatures.shark.extra = 5
    expect(shark.litAt({ x: at.x, y: at.y + 90 })).toBeGreaterThan(0)
  })

  it('a light in the dark: the glow stick is no light in the sunlit water, where daylight drowns it', () => {
    const sun = make({ bait: 'glow', hook: { x: 700, y: 300 } })
    expect(sun.lights().some((light) => light.by === 'bait')).toBe(false)
    const deep = make({ bait: 'glow', hook: { x: 700, y: 600 } })
    expect(deep.lights().some((light) => light.by === 'bait')).toBe(true)
  })

  it('a light in the dark: the shark with the stick inside it is a light for a while, and the jellyfish drifts after it', () => {
    const game = beside('shark', 'glow')
    bring(game, 'shark', 1.4)
    expect(game.creatures.shark.extra).toBeGreaterThan(8)
    expect(game.lights().some((light) => light.by === 'shark')).toBe(true)
    game.release()
    // The jellyfish is near enough to see it.
    const shark = game.centre('shark'), jelly = game.creatures.jelly
    jelly.off.x = shark.x - 250 - CREATURES.jelly.home.x
    jelly.off.y = 0
    const before = Math.hypot(game.centre('jelly').x - shark.x, game.centre('jelly').y - shark.y)
    run(game, 2.5)
    const now = game.centre('shark'), after = Math.hypot(game.centre('jelly').x - now.x, game.centre('jelly').y - now.y)
    expect(after).toBeLessThan(before + 40)
    run(game, 14)
    expect(game.creatures.shark.extra).toBe(0)
    expect(game.lights().some((light) => light.by === 'shark')).toBe(false)
  })

  it('a hunter going by: the squid bolts straight up from a following anglerfish, and into the net if it is under it', () => {
    const game = beside('angler', 'glow')
    bring(game, 'angler', 1.6)
    const heard: string[] = []
    // The stick is led up past the squid, so that the anglerfish comes up after it and close by.
    for (let i = 0; i < 1500 && game.creatures.squid.mode === 'home'; i++) {
      game.drag({ x: game.centre('squid').x + 10, y: 330 })
      heard.push(...names(run(game, FRAME)))
    }
    expect(game.creatures.squid.mode).toBe('flee')
    expect(heard).toContain('startle')
    expect(game.inks.length).toBeGreaterThan(0)
    const after = names(run(game, 2.5))
    // The net has it, or the hull turns it back: one or the other, by where it came up.
    expect(after.includes('scoop') || after.includes('bump')).toBe(true)
    expect(game.tub.includes('squid')).toBe(game.creatures.squid.mode === 'away')
    expect(game.creatures.squid.mode).not.toBe('flee')
  })

  it('a hunter going by: the pufferfish swells and bobs up, and the shoal scatters and gathers again', () => {
    const puffer = beside('angler', 'glow')
    bring(puffer, 'angler', 1.6)
    const heard: string[] = []
    for (let i = 0; i < 1500 && puffer.creatures.puffer.mode === 'home'; i++) {
      puffer.drag({ x: puffer.centre('puffer').x + 110, y: 300 })
      heard.push(...names(run(puffer, FRAME)))
    }
    expect(puffer.creatures.puffer.mode).toBe('flee')
    expect(heard).toContain('startle')
    // Found as left on the far side of the shark, which would eat the stick, and led up beside the shoal.
    const shoal = make({ bait: 'glow', following: ['angler'], hook: { x: 1120, y: 600 } })
    const by: string[] = []
    draw(shoal, { x: 1110, y: 300 }, 0)
    for (let i = 0; i < 1500 && shoal.creatures.shoal.extra === 0; i++) by.push(...names(run(shoal, FRAME)))
    expect(shoal.bait).toBe('glow')
    expect(by).toContain('scatter')
    expect(shoal.creatures.shoal.mode).toBe('home')
    run(shoal, 2)
    expect(shoal.creatures.shoal.extra).toBe(0)
    expect(HUNTER_REACHES).toBeGreaterThan(100)
  })

  it('ink: whoever follows loses the line in an ink cloud and drifts home, so a train breaks where it meets ink', () => {
    const game = beside('jelly', 'glow')
    bring(game, 'jelly', 1.8)
    expect(game.following).toEqual(['jelly'])
    const at = game.centre('jelly')
    game.inks.push({ x: at.x, y: at.y, age: 0, size: 1 })
    const heard = names(run(game, 0.1))
    expect(heard).toContain('inkLost')
    expect(game.following).toEqual([])
    expect(['return', 'home']).toContain(game.creatures.jelly.mode)
    // The stick is still on the hook: the bait stays.
    expect(game.bait).toBe('glow')
  })

  it('ink: a catch drawn up through ink comes up black, and the black is short-lived', () => {
    const game = beside('puffer', 'worm')
    bring(game, 'puffer', 1.6)
    const at = game.centre('puffer')
    game.inks.push({ x: at.x, y: at.y, age: 0, size: 1 })
    run(game, 0.1)
    expect(game.creatures.puffer.inked).toBeGreaterThan(0)
    const again = new Game(game.snapshot(), makeRng(1))
    expect(again.creatures.puffer.inked).toBe(0)
  })
})

describe('what waits for the child', () => {
  it('starts nothing before the child has touched the line, however near a creature drifts', () => {
    // The worm hangs right in the shark's path.
    const game = make({ bait: 'worm', hook: { x: 845, y: 514 } })
    const heard = run(game, 30)
    expect(heard).toEqual([])
    expect(game.tow).toBeNull()
    expect(game.bait).toBe('worm')
    expect(game.dirty).toBe(0)
    for (const id of CREATURE_IDS) expect(game.creatures[id].cell, id).toBeNull()
  })

  it('answers a hook the child has parked, when a creature drifts to it', () => {
    const game = make({ bait: 'none', hook: { x: 845, y: 400 } })
    draw(game, { x: 700, y: 514 }, 0.5)
    game.release()
    const heard = names(run(game, 16))
    expect(heard).toContain('tooth')
  })

  it('brings the shark round to a hook laid on its back, and the pufferfish to a worm beside its stretch', () => {
    /** How long until someone answers a hook held at a place. */
    const waits = (bait: Bait, id: CreatureId, at: (game: Game) => { x: number; y: number }): number => {
      const game = make({ bait, hook: { x: 640, y: 420 } })
      const to = at(game)
      draw(game, to, 0)
      for (let t = 0; t < 30; t += FRAME) {
        run(game, FRAME)
        if (game.creatures[id].cell !== null || game.tow) return t
      }
      return Infinity
    }
    // On the shark's tail end, a body's length from its mouth.
    expect(waits('none', 'shark', (game) => { const pose = game.pose('shark'); return { x: pose.x - 100 * pose.face, y: pose.y + 10 } })).toBeLessThan(4)
    expect(waits('glow', 'shark', (game) => { const pose = game.pose('shark'); return { x: pose.x - 100 * pose.face, y: pose.y + 10 } })).toBeLessThan(4)
    // The worm where a first visit's hand leaves it, at either end of the pufferfish's stretch.
    expect(waits('worm', 'puffer', () => ({ x: 262, y: 380 }))).toBeLessThan(5)
    expect(waits('worm', 'puffer', () => ({ x: 150, y: 340 }))).toBeLessThan(5)
  })

  it('keeps the cat and the gull answering as themselves', () => {
    const game = make()
    const mews = new Set<string | null>()
    let last: string | null = null
    for (let i = 0; i < 8; i++) {
      game.press({ x: 446, y: 110 })
      expect(names(game.cues)).toEqual(['mew'])
      expect(game.cat.act).not.toBe(last)
      last = game.cat.act
      mews.add(last)
      game.cues.length = 0
      run(game, 1.6)
    }
    expect(mews.size).toBe(3)
    game.press({ x: 690, y: 40 })
    expect(names(game.cues)).toEqual(['squawk'])
    expect(game.gull.hop).toBe(0)
  })

  it('draws what it sounds on the deck: a busy cat mews where it is, and flinches at the tub only when it is heard to', () => {
    // Flat under a catch that is coming up: touched, it mews with its mouth open and its tail lashing, and stays flat.
    const game = make({ hooked: 'puffer', hook: { x: 620, y: 240 } })
    run(game, 0.3)
    expect(game.cat.act).toBe('duck')
    const flat = catPose(game.cat.t, game.time, game.cat.act, game.cat.since, game.cat.slot, false, { x: 0, y: 0 }, game.cat.poked)
    game.cues.length = 0
    game.press({ x: 446, y: 110 })
    expect(names(game.cues)).toEqual(['mew'])
    expect(game.cat.act).toBe('duck')
    run(game, 0.2)
    const mewing = catPose(game.cat.t, game.time, game.cat.act, game.cat.since, game.cat.slot, false, { x: 0, y: 0 }, game.cat.poked)
    expect(mewing.open).toBeGreaterThan(flat.open + 0.5)
    expect(mewing.tail).toBeGreaterThan(flat.tail + 0.5)
    run(game, 0.4)
    expect(catPose(game.cat.t, game.time, game.cat.act, game.cat.since, game.cat.slot, false, { x: 0, y: 0 }, game.cat.poked).open).toBe(flat.open)
    // The tub slopped under a flat cat: the water is heard and the cat is not, since it does not flinch.
    game.cues.length = 0
    game.press({ x: 285, y: 140 })
    expect(names(game.cues)).toEqual(['slosh'])
    expect(game.cat.act).toBe('duck')
    // Sitting up, it flinches and is heard.
    const calm = make()
    calm.press({ x: 285, y: 140 })
    expect(names(calm.cues)).toEqual(['slosh', 'flinch'])
    expect(calm.cat.act).toBe('flinch')
  })

  it('touches a catch where it stands, and takes an empty place above the rim for air', () => {
    // Two in the tub: the places of the third and fourth are empty, and a touch there is an ordinary one that draws the line.
    const game = make({ tub: ['puffer', 'squid'] })
    run(game, 0.5)
    game.cues.length = 0
    game.press({ x: TUB_SLOTS[3].x + 20, y: 50 })
    expect(game.held).toBe(true)
    expect(game.tub).toEqual(['puffer', 'squid'])
    expect(names(game.cues)).not.toContain('slosh')
    game.release()
    // Where the empty third place lies in front of the second catch, the touch goes to the catch that is drawn there.
    const between = { x: TUB_SLOTS[1].x + 28, y: TUB_SLOTS[1].y }
    expect(slotAt(between)).toBe(1)
    const one = make({ tub: ['puffer'] })
    run(one, 0.5)
    one.press({ x: TUB_SLOTS[0].x + 28, y: TUB_SLOTS[0].y })
    expect(one.tub).toEqual([])
    // The trip over, the cat sleeps in the tub: touched there it stirs, and its empty seat is only deck, where a touch begins the next trip.
    const over = make({ finished: true })
    run(over, 0.5)
    over.cues.length = 0
    over.press({ x: 291, y: 96 })
    expect(names(over.cues)).toEqual(['sleepy'])
    expect(over.finished).toBe(true)
    over.cues.length = 0
    over.press({ x: 446, y: 110 })
    expect(over.finished).toBe(false)
  })

  it('clicks quicker coming up than going down: a shorter stretch of line for each click, and the reel a step for each', () => {
    const game = make({ hook: { x: 640, y: 260 } })
    // The clicks one way, counted while the finger draws the hook there; the few the other way, as the hook swings past and back, are left out.
    const clicks = (to: { x: number; y: number }, rising: boolean): number => {
      // A finger that draws the line at a child's pace, a fifth of the way down the sea in a second.
      const was = game.reel, from = { ...game.hook }, heard: { name: string; up?: boolean }[] = []
      for (let i = 1; i <= 180; i++) heard.push(...draw(game, { x: from.x + ((to.x - from.x) * Math.min(i, 150)) / 150, y: from.y + ((to.y - from.y) * Math.min(i, 150)) / 150 }, FRAME).filter((cue) => cue.name === 'click'))
      // The reel has turned a step for every click, forward for line out and back for line in.
      expect(game.reel - was).toBeCloseTo(heard.reduce((sum, cue) => sum + (cue.up ? -REEL_STEP : REEL_STEP), 0), 6)
      return heard.filter((cue) => (cue.up === true) === rising).length
    }
    const down = clicks({ x: 640, y: 700 }, false)
    const up = clicks({ x: 640, y: 260 }, true)
    expect(down).toBeGreaterThan(10)
    // The same stretch of line both ways, and half as many clicks again on the way up.
    expect(up).toBeGreaterThanOrEqual(Math.floor(down * 1.4))
    expect(LINE_PER_CLICK_UP).toBeLessThan(LINE_PER_CLICK * 0.7)
  })

  it('touches the cat where it is drawn: in the tub it pounced into and on its way out of it, answering as the cat', () => {
    // The anglerfish is landed; the cat chases the lamp, pounces and falls into the tub.
    const game = make({ hooked: 'angler', hook: { x: 640, y: 300 } })
    for (let i = 0; i < 6 * 60 && game.cat.act !== 'opAngler'; i++) { draw(game, { x: 620, y: 150 }, 0); run(game, FRAME) }
    game.release()
    while (game.cat.since < 1.6) run(game, FRAME)
    const where = game.catRect(), seat = { x: 446, y: 110 }
    expect(where.right).toBeLessThan(446)
    const middle = { x: (where.left + where.right) / 2, y: (where.top + where.bottom) / 2 }
    expect(slotAt(middle)).not.toBeNull()
    game.cues.length = 0
    game.press(middle)
    expect(names(game.cues)).toEqual(['mew'])
    expect(game.tub).toEqual(['angler'])
    expect(game.cat.act).toBe('opAngler')
    expect(game.held).toBe(false)
    // Its empty seat is only deck.
    game.cues.length = 0
    game.press(seat)
    expect(names(game.cues)).not.toContain('mew')
    expect(game.held).toBe(true)
    game.release()
    run(game, 2)
    expect(game.catRect().left).toBeCloseTo(381, 0)
    // Waking after a trip: it is still in the tub when the next trip begins, and is touched there.
    const over = make({ finished: true })
    run(over, 0.5)
    over.press({ x: 700, y: 400 })
    over.release()
    expect(over.cat.act).toBe('wake')
    run(over, 0.1)
    const lying = over.catRect()
    expect(lying.left).toBeLessThan(330)
    over.cues.length = 0
    over.press({ x: (lying.left + lying.right) / 2, y: (lying.top + lying.bottom) / 2 })
    expect(names(over.cues)).toEqual(['mew'])
    expect(over.cat.act).toBe('wake')
  })

  it('touches a catch that is closing up after a tip-back where it is drawn while it moves', () => {
    const game = make({ tub: ['puffer', 'squid', 'jelly'] })
    run(game, 0.5)
    game.press({ x: TUB_SLOTS[0].x - 20, y: TUB_SLOTS[0].y })
    expect(game.tub).toEqual(['squid', 'jelly'])
    run(game, FRAME)
    // The squid has hardly left its old place: it is still drawn there, and a touch on it there is a touch on the squid.
    const squid = game.creatures.squid.off
    expect(Math.abs(squid.x - TUB_SLOTS[1].x)).toBeLessThan(12)
    game.press({ x: squid.x - 22, y: squid.y })
    expect(game.tub).toEqual(['jelly'])
    // And its new place, where nothing is drawn yet, is only air.
    const next = make({ tub: ['puffer', 'squid'] })
    run(next, 0.5)
    next.press({ x: TUB_SLOTS[0].x - 20, y: TUB_SLOTS[0].y })
    run(next, FRAME)
    next.press({ x: TUB_SLOTS[0].x - 28, y: TUB_SLOTS[0].y })
    expect(next.tub).toEqual(['squid'])
    expect(next.held).toBe(true)
  })

  it('splashes on one clock: a catch tipped back or bounced off a full tub is heard to meet the water in the step its ring is drawn', () => {
    const watch = (game: Game, seconds: number): { splashes: number; rings: number } => {
      let splashes = 0, rings = 0
      const seen = new Set(game.ripples)
      run(game, seconds, (cues) => {
        const heard = cues.filter((cue) => cue.name === 'railSplash').length, fresh = game.ripples.filter((ripple) => !seen.has(ripple))
        expect(heard).toBe(fresh.length)
        for (const ripple of fresh) seen.add(ripple)
        splashes += heard
        rings += fresh.length
      })
      return { splashes, rings }
    }
    const back = make({ tub: ['puffer', 'squid'] })
    run(back, 0.5)
    back.press({ x: TUB_SLOTS[1].x, y: TUB_SLOTS[1].y })
    expect(names(back.cues)).toEqual(['tipBack'])
    back.cues.length = 0
    expect(watch(back, 2)).toEqual({ splashes: 1, rings: 1 })
    // A fifth catch bounces off the pile. The hook leaves the water first, with its own ring and its own splash.
    const full = make({ hooked: 'octopus', hook: { x: 640, y: 300 }, tub: ['puffer', 'squid', 'blobfish', 'angler'] })
    let bounced = false
    for (let i = 0; i < 6 * 60 && !bounced; i++) { draw(full, { x: 620, y: 150 }, 0); bounced = run(full, FRAME).some((cue) => cue.name === 'bounce') }
    expect(bounced).toBe(true)
    expect(watch(full, 2)).toEqual({ splashes: 1, rings: 1 })
    expect(full.tub).toHaveLength(4)
  })

  it('has the squid wave after the stick whenever it is drawn away, also before its answer has run to the end', () => {
    for (const stays of [0.3, 0.9, 2.2]) {
      const game = beside('squid', 'glow')
      bring(game, 'squid', stays)
      expect(game.creatures.squid.cell === 'glow.squid' || stays > 1.6, String(stays)).toBe(true)
      const at = game.touchPoint('squid')
      let waved = false
      draw(game, { x: at.x + 420, y: at.y + 40 }, 0)
      run(game, 4, () => { if (game.creatures.squid.cell === 'glow.squid.bye') waved = true })
      expect(waved, String(stays)).toBe(true)
    }
    // It owes no wave to a stick it never answered.
    const game = make({ bait: 'glow', hook: { x: 900, y: 300 } })
    let waved = false
    draw(game, { x: 1000, y: 320 }, 0)
    run(game, 3, () => { if (game.creatures.squid.cell === 'glow.squid.bye') waved = true })
    expect(waved).toBe(false)
  })

  it('goes where the finger is, clicks as the line pays out, and splashes at the waterline', () => {
    const game = make()
    game.press({ x: 640, y: 400 })
    expect(names(game.cues)).toEqual(['click'])
    game.cues.length = 0
    const down = run(game, 2.2)
    expect(down.filter((cue) => cue.name === 'click').length).toBeGreaterThan(3)
    expect(Math.hypot(game.hook.x - 640, game.hook.y - 400)).toBeLessThan(4)
    const pitches = down.filter((cue) => cue.name === 'click').map((cue) => cue.depth!)
    expect(pitches[pitches.length - 1]).toBeGreaterThan(pitches[0])
    game.drag({ x: 620, y: 150 })
    const up = run(game, 1.4)
    expect(names(up)).toContain('splashOut')
    expect(up.filter((cue) => cue.name === 'click').every((cue) => cue.up === true)).toBe(true)
    expect(game.hook.y).toBeLessThan(WATERLINE)
    game.release()
    expect(game.rest.y).toBeLessThan(WATERLINE)
    expect(game.dirty).toBe(1)
  })

  it('puts the hook back where the line was taken up when the touch is taken away', () => {
    const game = make({ hook: { x: 700, y: 300 } })
    game.press({ x: 900, y: 600 })
    run(game, 0.3)
    game.cancel()
    run(game, 1.5)
    expect(game.rest).toEqual({ x: 700, y: 300 })
    expect(Math.hypot(game.hook.x - 700, game.hook.y - 300)).toBeLessThan(3)
    expect(game.dirty).toBe(0)
  })
})

describe('a thing is touched where it is drawn', () => {
  /** Places on a body: its middle and four points most of the way out to its edges. */
  const places = (box: Rect): { x: number; y: number }[] => {
    const x = (box.left + box.right) / 2, y = (box.top + box.bottom) / 2, rx = (box.right - box.left) * 0.42, ry = (box.bottom - box.top) * 0.42
    return [{ x, y }, { x: x - rx, y }, { x: x + rx, y }, { x, y: y - ry }, { x, y: y + ry }]
  }

  it('a hook brought anywhere onto any of the nine is answered by that one, with a bait on it or bare: tail, shell, tentacles, pot and all', () => {
    for (const id of CREATURE_IDS) {
      for (const bait of ['none', 'worm', 'boot'] as const) {
        const probe = make({ bait })
        for (const [index, at] of places(bodyBox(id, probe.creatures[id], probe.centre(id))).entries()) {
          // The hook hangs in open water and is drawn to the place in one move, as a tap does it.
          const game = make({ bait, hook: { x: 1120, y: 300 } })
          let answered = false
          const look = (): void => { if (game.creatures[id].cell !== null || game.tow !== null || game.hooked === id) answered = true }
          const box = bodyBox(id, game.creatures[id], game.centre(id)), all = places(box)
          game.press(all[index])
          for (let i = 0; i < 6 * 60 && !answered; i++) {
            // The finger rests where it landed on the body; the body drifts under it, so it keeps to the same part of it.
            const now = places(bodyBox(id, game.creatures[id], game.centre(id)))[index]
            // On the shark it rests in one place, and the shark comes round to it.
            if (id !== 'shark' && game.creatures[id].mode === 'home' && !game.creatures[id].comes && !game.creatures[id].came) game.drag(now)
            run(game, FRAME, look)
          }
          expect(answered, `${bait} on the ${id} at place ${index} (${Math.round(at.x)}, ${Math.round(at.y)})`).toBe(true)
        }
      }
    }
  }, 120000)

  it('the turtle brings its mouth round to a bait laid on its shell, and then eats it as it always does', () => {
    const game = make({ bait: 'worm', hook: { x: 600, y: 400 } })
    const shell = { x: game.centre('turtle').x - 10, y: game.centre('turtle').y - 40 }
    const heard = draw(game, shell, 3.5).map((cue) => cue.name)
    expect(heard.filter((name) => name === 'crunch')).toHaveLength(3)
    expect(game.bait).toBe('none')
    // It went to the worm, and the worm did not go to it.
    expect(Math.hypot(game.hook.x - shell.x, game.hook.y - shell.y)).toBeLessThan(12)
  })

  it('answers once: a hook left lying on a body is not answered again until it has left it', () => {
    const game = make({ hook: { x: 1120, y: 300 } })
    const at = game.centre('jelly')
    const first = draw(game, { x: at.x, y: at.y - 40 }, 5).map((cue) => cue.name)
    expect(first.filter((name) => name === 'wobble')).toHaveLength(2)
    expect(run(game, 8).map((cue) => cue.name).filter((name) => name === 'wobble')).toEqual([])
  })
})

describe('no touch waits for the game', () => {
  const HOLDERS = (Object.keys(CELLS) as CellKey[]).filter((key) => (CELLS[key] as { grip?: true }).grip === true)

  it('lets go of the hook the moment the finger draws it away, whoever has hold of it, and what it was sounding stops', () => {
    expect(HOLDERS.length).toBeGreaterThan(5)
    for (const key of HOLDERS) {
      const [bait, id] = key.split('.') as [Bait, CreatureId]
      const game = beside(id, bait)
      bring(game, id, 0.5)
      expect(game.creatures[id].cell, key).toBe(key)
      const held = { x: game.hook.x, y: game.hook.y }
      game.hushes.length = 0
      // A small move of the finger is still inside the grip; a real pull is not.
      const away = { x: held.x + (held.x > 600 ? -1 : 1) * (PULL_OUT + 30), y: held.y - PULL_OUT - 30 }
      game.drag(away)
      expect(game.creatures[id].cut, key).toBe(true)
      // Only its own voices are asked to stop.
      expect(game.hushes, key).toEqual([id])
      const after = run(game, 0.35)
      // The hook is on its way to the finger within a third of a second, and the joke sounds no more.
      expect(Math.hypot(game.hook.x - held.x, game.hook.y - held.y), key).toBeGreaterThan(PULL_OUT)
      const beats = CELLS[key].beats.map((beat) => beat.cue as string)
      expect(after.map((cue) => cue.name).filter((name) => beats.includes(name)), key).toEqual([])
    }
  })

  it('ends a scene with a touch, which is then an ordinary touch, and asks for the scene\'s sound to stop in that frame', () => {
    const game = beside('shark', 'worm')
    bring(game, 'shark', 1)
    game.release()
    run(game, 1)
    expect(game.playing).toBe(true)
    game.hushes.length = 0
    game.cues.length = 0
    game.press({ x: 700, y: 400 })
    expect(game.playing).toBe(false)
    expect(game.hushes).toEqual(['scene'])
    expect(names(game.cues)).toEqual(['click'])
    expect(names(run(game, 8)).filter((name) => name.startsWith('tow'))).toEqual([])
  })
})

describe('the cat and a catch coming in', () => {
  it('gets down before the catch leaves the water, with its own sound, and stays down until the catch has gone by overhead', () => {
    for (const fast of [false, true]) {
      const game = beside('angler', 'worm')
      bring(game, 'angler', 1.6)
      expect(game.hooked).toBe('angler')
      const heard: string[] = []
      let ducked = -1, left = -1, upDuringFlight = 0
      const look = (cues: readonly { name: string }[]): void => {
        heard.push(...names(cues))
        const down = game.cat.act === 'duck' && game.cat.since >= CAT_IS_DOWN
        if (ducked < 0 && game.cat.act === 'duck') ducked = game.time
        if (left < 0 && game.hooked === null) { left = game.time; expect(down).toBe(true) }
        if (game.flights.some((flight) => flight.kind === 'land' && flight.t < 0.7) && !down) upDuringFlight++
      }
      if (fast) draw(game, { x: 620, y: 150 }, 3, look)
      else { draw(game, { x: 620, y: 230 }, 2.5, look); expect(game.hooked).toBe('angler'); draw(game, { x: 620, y: 150 }, 2.5, look) }
      expect(ducked).toBeGreaterThan(0)
      expect(left).toBeGreaterThan(ducked)
      expect(upDuringFlight).toBe(0)
      expect(heard.indexOf('catDuck')).toBeGreaterThanOrEqual(0)
      expect(heard.indexOf('catDuck')).toBeLessThan(heard.indexOf('land'))
      expect(heard.filter((name) => name === 'catDuck')).toHaveLength(1)
      expect(game.tub).toEqual(['angler'])
    }
  })

  it('sits up again when the catch is let down, and is not drawn up by a poke while one is coming', () => {
    const game = beside('angler', 'worm')
    bring(game, 'angler', 1.6)
    draw(game, { x: 620, y: 230 }, 2.5)
    expect(game.cat.act).toBe('duck')
    game.press({ x: 446, y: 110 })
    expect(game.cat.act).toBe('duck')
    game.release()
    draw(game, { x: 700, y: 520 }, 2.5)
    expect(game.cat.act).toBeNull()
  })
})

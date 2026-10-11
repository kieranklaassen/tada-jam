import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { standIn } from './recording'
import { STAGE } from './stage'
import type { Guidance } from './guidance'
import { freshSave } from './save'
import { BARE_PAPER, everyLoad, newToy, play, playHome, pullAndLetGo, pullAt, slotAt, type Played } from './testing'
import { View } from './view'
import { CATAPULT, CHICK, CLOUD, DRIFT, IGLOO, PUFFIN, SEALS, WALRUS, WHALE_EYE, BALLOON, BERG, KIT } from './world'

// The draw count of this game is what it puts on the surface in a frame: the
// figures it stamps, and the strokes and fills it draws live. The view counts
// them itself, for the grown-up overlay and the probe; here a stand-in
// context counts them too, and the two must agree.

const BUDGET = 80

function viewFor(tier = 0, width: number = STAGE.width, height: number = STAGE.height) {
  const stand = standIn()
  const view = new View(stand.make)
  view.setTier(TIERS[tier])
  view.build(stand.ctx, width, height, TIERS[tier].dpr)
  return { view, stand }
}

/** Every thing on the page pressed at once, on top of whatever else is going on. */
function pokeEverything(played: Played): void {
  for (const [x, y] of [[SEALS[0].x, SEALS[0].y - 30], [SEALS[1].x, SEALS[1].y - 28], [CHICK.x, CHICK.y], [IGLOO.x + 30, IGLOO.y - 40], [WALRUS.x, WALRUS.y], [BERG.x0 + 20, BERG.y0 + 200], [PUFFIN.x, PUFFIN.y], [BALLOON.x, BALLOON.y - 20], [WHALE_EYE.x, WHALE_EYE.y], [CLOUD[2].x, CLOUD[2].y], [KIT.x1 + 3, KIT.y1 - 20], [DRIFT.x, DRIFT.y - 20], [300, 420], [320, 440], [340, 400]]) played.toy.press(x, y)
}

describe('the frame budget', () => {
  it('draws the bare page, before there is a state, as the page and its squares', () => {
    const { view, stand } = viewFor()
    stand.reset()
    view.draw(stand.ctx, null, 0)
    expect(view.drawCalls).toBe(2)
    expect(stand.tally).toMatchObject({ stamps: 1, strokes: 1, fills: 0 })
  })

  it('counts what it draws, and stays under the budget through every load, every landing, every scene and a storm of presses', () => {
    const { view, stand } = viewFor()
    let most = 0, least = Infinity, where = ''
    const guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
    const look = (played: Played, name: string, shown: Guidance | null = null): void => {
      stand.reset()
      view.draw(stand.ctx, played.toy.show(shown), 1 / 60)
      expect(view.drawCalls).toBe(stand.tally.stamps + stand.tally.strokes + stand.tally.fills)
      if (view.drawCalls > most) { most = view.drawCalls; where = name }
      least = Math.min(least, view.drawCalls)
    }
    // Idle, with the glow and the hand up, bare and with the two bulkiest parts on and a friend eating.
    const idle = newToy(), laden = newToy(1, { ...freshSave(null), bolted: ['balloon', 'fish'], last: { x: -60, y: 50 }, eating: { who: 'puffin', fish: 'wet' } })
    for (let n = 0; n < 30; n++) {
      idle.toy.step(1 / 60, guidance)
      look(idle, 'idle', guidance)
      laden.toy.step(1 / 60, guidance)
      look(laden, 'idle and laden', guidance)
    }
    // Every pair of parts, flown from pulls that reach the cloud, the seals, the water and the friends, with a
    // finger held for the rocket and a storm of presses now and then, as a child with both hands on the glass makes one.
    const pulls = [pullAt(40, 170), pullAt(60, 200), pullAt(25, 190)]
    for (const load of everyLoad()) for (const pull of pulls) {
      const played = newToy(1, { ...freshSave(null), bolted: [...load.parts], last: { x: -60, y: 50 }, eating: { who: 'chick', fish: 'frozen' } })
      // The flight before left its line and its marks on the paper.
      pullAndLetGo(played, pullAt(50, 190))
      playHome(played)
      pullAndLetGo(played, pull)
      for (let n = 0; n < 1500 && played.toy.phase !== 'loaded'; n++) {
        if (n === 8) played.toy.press(BARE_PAPER.x, BARE_PAPER.y)
        if (n % 45 === 20 && played.toy.phase === 'fly') pokeEverything(played)
        play(played, 1 / 60)
        look(played, `${load.parts.join(' and ') || 'bare'} from ${Math.round(pull.x)}, ${Math.round(pull.y)} at frame ${n}`)
      }
    }
    // A part on its way while another drops back, with everything pressed.
    const bolting = newToy(1, { ...freshSave(null), bolted: ['rocket', 'wings'], last: { x: -60, y: 50 }, eating: { who: 'walrus', fish: 'wet' } })
    bolting.toy.press(slotAt('umbrella').x, slotAt('umbrella').y)
    for (let n = 0; n < 50; n++) {
      if (n === 20) pokeEverything(bolting)
      play(bolting, 1 / 60)
      look(bolting, 'bolting')
    }
    expect(most, where).toBeLessThan(BUDGET)
    // A quiet frame is about half of that.
    expect(least).toBeLessThan(50)
    expect(least).toBeGreaterThan(25)
  }, 120_000)

  it('lays the page down once, as the frame\'s one full-surface stamp, and nothing else as large', () => {
    const { view, stand } = viewFor()
    const played = newToy(1, { ...freshSave(null), bolted: ['rocket', 'wings'] })
    pullAndLetGo(played, pullAt(40, 170))
    for (let n = 0; n < 200; n++) {
      play(played, 1 / 60)
      stand.reset()
      view.draw(stand.ctx, played.toy.show(), 1 / 60)
      const large = (stand.tally.stamped as { width: number; height: number }[]).filter((image) => image.width * image.height >= STAGE.width * 2 * STAGE.height * 2 * 0.3)
      expect(large.length).toBe(1)
      expect(stand.tally.stamped.indexOf(large[0])).toBe(0)
      // No blur, shadow or blend is ever set: the one composite is the page itself.
      expect(stand.tally.clips).toBeLessThanOrEqual(1)
    }
  })

  it('draws fewer crumbs on a lower tier, and the same toy', () => {
    const counts = TIERS.map((_, tier) => {
      const { view, stand } = viewFor(tier)
      const played = newToy()
      for (let n = 0; n < 6; n++) pokeEverything(played)
      play(played, 0.05)
      view.draw(stand.ctx, played.toy.show(), 1 / 60)
      return view.drawCalls
    })
    for (let tier = 1; tier < counts.length; tier++) expect(counts[tier]).toBeLessThan(counts[tier - 1])
    for (const count of counts) expect(count).toBeLessThan(BUDGET)
    for (let tier = 1; tier < TIERS.length; tier++) {
      expect(TIERS[tier].crumbs).toBeLessThan(TIERS[tier - 1].crumbs)
      expect(TIERS[tier].dpr).toBeLessThan(TIERS[tier - 1].dpr)
    }
    expect(TIERS[0].dpr).toBe(2)
  })

  it('draws nothing on a surface with no size, and draws again when it has one', () => {
    const { view, stand } = viewFor()
    view.build(stand.ctx, 0, 0, 2)
    stand.reset()
    view.draw(stand.ctx, null, 0)
    expect(view.drawCalls).toBe(0)
    expect(stand.tally.stamps).toBe(0)
    view.build(stand.ctx, STAGE.width, STAGE.height, 2)
    view.draw(stand.ctx, null, 0)
    expect(view.drawCalls).toBe(2)
  })

  it('fits the stage whole into a surface of any shape, and draws there too', () => {
    for (const [width, height] of [[1180, 820], [1024, 768], [820, 1180], [390, 844], [2360, 1640]]) {
      const { view, stand } = viewFor(0, width, height)
      expect(view.fit.scale).toBeCloseTo(Math.min(width / STAGE.width, height / STAGE.height), 9)
      const played = newToy()
      play(played, 0.1)
      stand.reset()
      view.draw(stand.ctx, played.toy.show(), 1 / 60)
      expect(view.drawCalls).toBeGreaterThan(25)
      expect(view.drawCalls).toBeLessThan(BUDGET)
    }
  })

  it('keeps the grip of the pouch a finger wide on the smallest surface the shell gives', () => {
    const { view } = viewFor(0, 390, 844)
    expect(CATAPULT.grip * 2 * view.fit.scale).toBeGreaterThanOrEqual(40)
  })
})

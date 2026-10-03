import { describe, expect, it } from 'vitest'
import { normalise, runNight, type Plan } from './night'
import { ACTS, AT_DUSK, DISLIKED, WANTS, content, reactions, type Act } from './tastes'
import { CAMPERS, SITES, type CamperId, type Site } from './world'

const quarry = SITES.quarry[0] // cook ring 1, reader ring 3, scout ring 2, sleeper ring 2; pin 0 lights the reader, and the sleeper on the high wick
const ford = SITES.ford[1] // seven hours; cook, small one, scout, reader; the fire's dial goes two, three, four
const ridge = SITES.ridge[1] // the small one at ring 3; pin 0 lights the small one, and the reader on the high wick
const acts = (site: Site, part: Partial<Plan>, camper: CamperId, left = 0): Act[] =>
  reactions(site, runNight(site, normalise(site, part)), left).filter((reaction) => reaction.camper === camper).map((reaction) => reaction.act)

describe('the tastes are fixed', () => {
  it('gives every camper one want, something they like to do and something they do when displeased', () => {
    for (const camper of CAMPERS) {
      expect(WANTS[camper].length).toBeGreaterThan(0)
      expect(ACTS[camper].some((act) => !DISLIKED.has(act)), camper).toBe(true)
      expect(ACTS[camper].some((act) => DISLIKED.has(act)), camper).toBe(true)
    }
  })

  it('shows every want at dusk, before any night is slid, each in a pose of its own', () => {
    const poses = CAMPERS.map((camper) => AT_DUSK[camper].pose)
    expect(new Set(poses).size).toBe(CAMPERS.length)
    for (const camper of CAMPERS) expect(AT_DUSK[camper].toward.length, camper).toBeGreaterThan(0)
    expect(WANTS.cook).toBe('a big fire')
  })

  it('shares no act between two campers', () => {
    const all = CAMPERS.flatMap((camper) => [...ACTS[camper]])
    expect(new Set(all).size).toBe(all.length)
  })

  it('gives the same acts for the same night, every time', () => {
    const plan = normalise(quarry, { logs: 10, fire: 1, oil: 2 })
    expect(reactions(quarry, runNight(quarry, plan))).toEqual(reactions(quarry, runNight(quarry, plan)))
  })

  it('is about the camp: no want and no act names the child, a verdict or a reward', () => {
    const words = [...Object.values(WANTS), ...CAMPERS.flatMap((camper) => [...ACTS[camper]])].join(' ')
    expect(words).not.toMatch(/child|player|you|wrong|right|correct|fail|well done|thanks|praise|star|score/i)
  })
})

describe('the reader wants light to read by', () => {
  it('reads by the lantern all night when its oil lasts', () => {
    expect(acts(quarry, { logs: 16, oil: 3 }, 'reader')).toEqual(['reads-by-lantern'])
  })

  it('walks to the fire when the lantern runs dry, and into the stream when the fire is out too', () => {
    expect(acts(quarry, { logs: 16, oil: 1 }, 'reader')).toEqual(['reads-by-lantern', 'walks-to-the-light'])
    expect(acts(quarry, { logs: 8, oil: 1 }, 'reader')).toEqual(['reads-by-lantern', 'walks-to-the-light', 'walks-into-the-stream'])
    const walk = reactions(quarry, runNight(quarry, normalise(quarry, { logs: 8, oil: 1 }))).filter((reaction) => reaction.camper === 'reader')
    expect(walk.map((reaction) => reaction.at)).toEqual([{ num: 0, den: 1 }, { num: 3, den: 1 }, { num: 4, den: 1 }])
  })

  it('makes do with firelight when the lantern stands elsewhere and the fire reaches', () => {
    expect(acts(quarry, { logs: 40, fire: 2, oil: 3, lanterns: [{ pin: 1, wick: 0 }] }, 'reader')).toEqual(['reads-by-fire'])
  })
})

describe('the sleeper wants warmth and the dark', () => {
  it('sleeps through inside the circle with no lantern on the tent', () => {
    expect(acts(quarry, { logs: 24, fire: 1, oil: 3 }, 'sleeper')).toEqual(['sleeps-through'])
  })

  it('hides from a lantern, drags the bag in from outside the circle, and wakes cold when the fire dies', () => {
    expect(acts(quarry, { logs: 24, fire: 1, oil: 4, lanterns: [{ pin: 0, wick: 1 }] }, 'sleeper')).toEqual(['hides-in-the-bag'])
    expect(acts(quarry, { logs: 16, fire: 0, oil: 3 }, 'sleeper')).toEqual(['drags-the-bag-to-the-fire'])
    expect(acts(quarry, { logs: 12, fire: 1, oil: 3 }, 'sleeper')).toEqual(['wakes-hugging-a-raccoon'])
  })
})

describe('the cook wants a big fire, and likes a full kettle', () => {
  it('beams at the highest setting, tends a middle one and fans the lowest', () => {
    expect(acts(ford, { logs: 35, fire: 2, water: 5 }, 'cook')).toEqual(['beams-at-the-fire'])
    expect(acts(ford, { logs: 21, fire: 1, water: 5 }, 'cook')).toEqual(['tends-the-fire'])
    expect(acts(ford, { logs: 14, fire: 0, water: 5 }, 'cook')).toEqual(['fans-the-fire'])
    expect(acts(SITES.meadow[0], { logs: 18 }, 'scout')).toEqual(['keeps-watch', 'tips-the-hat'])
  })

  it('looks into a dry kettle at the hour it ran dry, and tastes the first cold round', () => {
    const night = reactions(ford, runNight(ford, normalise(ford, { logs: 6, fire: 1, water: 4 }))).filter((reaction) => reaction.camper === 'cook')
    expect(night.map((reaction) => [reaction.act, reaction.at.num])).toEqual([['tends-the-fire', 0], ['tastes-cold-cocoa', 2], ['looks-into-the-kettle', 6]])
  })
})

describe('the scout wants to carry nothing back', () => {
  it('tips the hat at a tight morning and straps on a tower as tall as the leftover', () => {
    expect(acts(quarry, { logs: 16, oil: 3 }, 'scout')).toEqual(['keeps-watch', 'tips-the-hat'])
    const loaded = reactions(quarry, runNight(quarry, normalise(quarry, { logs: 40, oil: 3 })), 21).find((reaction) => reaction.act === 'straps-a-tower-on-the-mule')
    expect(loaded).toMatchObject({ camper: 'scout', size: 21, at: { num: 8, den: 1 } })
  })
})

describe('the small one never wants the dark', () => {
  it('sleeps on the dog in any light', () => {
    expect(acts(ridge, { logs: 18, oil: 2, water: 5 }, 'small')).toEqual(['sleeps-on-the-dog'])
  })

  it('moves in with whoever still has light, and hides under the dog when nobody has', () => {
    const night = reactions(ridge, runNight(ridge, normalise(ridge, { logs: 18, oil: 1, water: 5 }))).filter((reaction) => reaction.camper === 'small')
    expect(night.map((reaction) => reaction.act)).toEqual(['sleeps-on-the-dog', 'moves-in-with'])
    expect(night[1]).toMatchObject({ withCamper: 'cook', at: { num: 3, den: 1 } })
    expect(acts(ridge, { logs: 0, oil: 0, water: 5 }, 'small')).toEqual(['hides-under-the-dog'])
  })
})

describe('a night that suits everyone', () => {
  it('exists at the first site of every position that has a choice to make, and leaves every camper content', () => {
    const suits = (site: Site, part: Partial<Plan>) => {
      const all = reactions(site, runNight(site, normalise(site, part)))
      return site.tents.every((tent) => content(tent.camper, all))
    }
    expect(suits(SITES.meadow[0], { logs: 18 })).toBe(true)
    expect(suits(SITES.birchwood[0], { logs: 40, fire: 2 })).toBe(true)
    expect(suits(ford, { logs: 35, fire: 2, water: 5 })).toBe(true)
    expect(suits(quarry, { logs: 40, fire: 2, oil: 3 })).toBe(true)
    // And a plan that only gets through the night does not suit everyone.
    expect(suits(quarry, { logs: 16, fire: 0, oil: 3 })).toBe(false)
  })
})

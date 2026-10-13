import { describe, expect, it } from 'vitest'
import { drawn } from './fixtures'
import { BLOCKS, BURROW_INDEX, CAGE, TOOL_HOME, grassNode } from './layout'
import { deserialize, freshSave, serialize, toSave, worldOf, type Save } from './save'
import { layWorld, type World } from './world'

/** A hand-drawn cave with the burrow dug, as every saved hill has it. */
function cave(...rows: string[]): World {
  const world = drawn(...rows)
  world.kinds[BURROW_INDEX] = 'open'
  return world
}

/** A cave at rest with something in every field a save has. */
function busy(): World {
  const world = cave('ooooog', '@ebeX', 'e~pse')
  world.seed = 77
  world.position = 'wild'
  world.hits[5] = 2
  world.hits[29] = 1
  world.wet[4] = true
  world.gems.push({ colour: 'red', at: 1, rest: 'hung' }, { colour: 'green', at: 3, rest: 'floor' }, { colour: 'blue', at: 0, rest: 'bucket' })
  world.tools.rope = 1
  world.tools.wedge = 2
  world.mole = { at: 13, sooty: true, tool: 'bucket', load: 'blue' }
  return world
}

describe('what is saved', () => {
  it('names every field the sheet names, and nothing else', () => {
    const save = toSave(busy())
    expect(Object.keys(save).sort()).toEqual(['cells', 'finished', 'gems', 'hits', 'mole', 'position', 'seed', 'tools', 'v', 'water', 'wet'])
    expect(Object.keys(save.mole).sort()).toEqual(['bucket', 'c', 'cage', 'r', 'sooty', 'tool'])
    expect(Object.keys(save.tools).sort()).toEqual(['bucket', 'rope', 'wedge'])
    expect(save.finished).toBe(false)
    expect(save.cells).toHaveLength(BLOCKS)
    expect(save.cells.slice(0, 7)).toBe('ooooogo')
    // A gem in its block is marked by its colour and by the ground that holds it.
    expect(save.cells[17]).toBe('X')
    expect(save.cells.slice(26, 30)).toBe('eops')
    expect(save.hits[5] + save.hits[29]).toBe('21')
    expect(save.water[27] + save.wet[27] + save.wet[4] + save.wet[3]).toBe('1110')
    expect(save.gems).toEqual([{ colour: 'red', c: 1, r: 0, rest: 'hung' }, { colour: 'green', c: 3, r: 0, rest: 'floor' }, { colour: 'blue', c: 0, r: 1, rest: 'bucket' }])
    expect(save.mole).toEqual({ c: 0, r: 1, sooty: true, cage: false, tool: 'bucket', bucket: 'blue' })
    expect(save.tools.rope).toMatchObject({ c: 1, r: 0, tied: 'gem' })
  })

  it('comes back from a slot as it went in', () => {
    const world = busy()
    const save = toSave(world)
    const back = worldOf(JSON.parse(JSON.stringify(serialize(save))), 7, 1)
    expect(toSave(back)).toEqual(save)
    expect(back.kinds).toEqual(world.kinds)
    expect(back.lode).toEqual(world.lode)
    expect(back.hits).toEqual(world.hits)
    expect(back.gems.map((gem) => gem.rest)).toEqual(['hung', 'floor', 'bucket'])
  })

  it('keeps the mole on the grass and in the cage, and a rope tied to the boulder beside him', () => {
    const world = layWorld(3, 'near')
    world.mole.at = CAGE
    expect(toSave(world).mole).toMatchObject({ c: 4, r: -1, cage: true })
    expect(worldOf(toSave(world), null, 1).mole.at).toBe(CAGE)
    const tied = cave('@bo')
    tied.mole.tool = 'rope'
    tied.tied = 1
    expect(toSave(tied).tools.rope).toMatchObject({ tied: 'boulder', to: { c: 1, r: 0 } })
    expect(worldOf(toSave(tied), null, 1).tied).toBe(1)
  })

  it('gives a first visit by the age: near for eight and younger and for no age, wild from nine, with both ends open', () => {
    for (const age of [null, 2, 7, 8]) expect(freshSave(age, 5).position).toBe('near')
    for (const age of [9, 11, 12, 40]) expect(freshSave(age, 5).position).toBe('wild')
    expect(freshSave(null, 5)).toEqual(toSave(layWorld(5, 'near')))
    expect(freshSave(null, 5).mole).toEqual({ c: 6, r: 0, sooty: false, cage: false, tool: 'none', bucket: 'nothing' })
  })

  it('lets a saved game win over the age', () => {
    const save = toSave(layWorld(8, 'near'))
    expect(deserialize(save, 11, 1).position).toBe('near')
    expect(deserialize({ ...toSave(layWorld(8, 'wild')) }, 7, 1).position).toBe('wild')
  })

  it('opens a first visit on anything that is not its record', () => {
    for (const raw of [null, undefined, 4, 'x', [], {}, { v: 2 }, { v: 1 }]) {
      const save = deserialize(raw, null, 21)
      expect(save.cells).toHaveLength(BLOCKS)
      expect(save.cells[BURROW_INDEX]).toBe('o')
    }
    expect(deserialize(null, null, 21)).toEqual(freshSave(null, 21))
    // A record with no hill in it keeps its position and its seed.
    expect(deserialize({ v: 1, position: 'wild', seed: 99 }, 7, 21)).toEqual(toSave(layWorld(99, 'wild')))
  })

  it('repairs each field by itself', () => {
    const good = toSave(busy())
    const broken: Record<string, unknown>[] = [
      { ...good, hits: 'nonsense' }, { ...good, wet: 5 }, { ...good, water: null }, { ...good, gems: 'many' }, { ...good, mole: [] }, { ...good, tools: 3 },
      { ...good, gems: [{ colour: 'pink', c: 0, r: 0, rest: 'floor' }, { colour: 'red', c: 99, r: 0, rest: 'floor' }, { colour: 'red', c: 4, r: 1, rest: 'floor' }, null] },
      { ...good, mole: { c: 4, r: 1, sooty: 'yes', tool: 'spoon', bucket: 'soup' } },
      { ...good, tools: { wedge: { c: 0, r: 0 }, bucket: { c: 0, r: 0 }, rope: { c: 0, r: 0, tied: 'boulder', to: { c: 5, r: 5 } } } },
    ]
    for (const raw of broken) {
      const world = worldOf(raw, null, 1)
      expect(world.kinds).toEqual(busy().kinds)
      expect(world.position).toBe('wild')
      expect(world.seed).toBe(77)
      expect(world.mole.at === BURROW_INDEX || world.kinds[world.mole.at] === 'open').toBe(true)
      for (const gem of world.gems) if (gem.rest !== 'bucket') expect(world.kinds[gem.at]).toBe('open')
      expect(toSave(worldOf(toSave(world), null, 1))).toEqual(toSave(world))
    }
    const moleless = worldOf({ ...good, mole: { c: 4, r: 1 } }, null, 1)
    // The bucket lies where it lay with the gem still in it.
    expect(moleless.mole).toEqual({ at: BURROW_INDEX, sooty: false, tool: null, load: 'blue' })
    expect(worldOf({ ...good, tools: 3 }, null, 1).tools.wedge).toBe(TOOL_HOME.wedge)
    // Water stands only in dug blocks, and what it stands in is wet.
    const flooded = worldOf({ ...good, water: '1'.repeat(BLOCKS), wet: '0'.repeat(BLOCKS) }, null, 1)
    flooded.water.forEach((stands, index) => { if (stands) { expect(flooded.kinds[index]).toBe('open'); expect(flooded.wet[index]).toBe(true) } })
    expect(worldOf({ ...good, cells: good.cells.replace('o', '?') }, null, 1)).toEqual(layWorld(77, 'wild'))
  })

  it('brings a cave to rest when it opens, so nothing falls or runs then', () => {
    const world = cave('@~b', 'oeo', 'oeo')
    world.gems.push({ colour: 'red', at: 0, rest: 'right' })
    const back = worldOf(toSave(world), null, 1)
    expect(back.water[26]).toBe(true)
    expect(back.kinds[28]).toBe('boulder')
    expect(back.gems[0]).toEqual({ colour: 'red', at: 26, rest: 'floor' })
    expect(toSave(worldOf(toSave(back), null, 1))).toEqual(toSave(back))
  })

  it('stays far below half of the 64 KB cap at its largest', () => {
    const world = layWorld(1, 'wild')
    world.kinds.fill('open')
    world.lode.fill(null)
    world.wet.fill(true)
    world.water.fill(true)
    for (let i = 0; i < 9; i++) world.gems.push({ colour: 'green', at: 80 + i, rest: 'right' })
    world.mole = { at: grassNode(12), sooty: true, tool: 'bucket', load: 'water' }
    const size = JSON.stringify(serialize(toSave(world) as Save)).length
    expect(size).toBeLessThan(2000)
    expect(size).toBeLessThan(32 * 1024)
  })
})

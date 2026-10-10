import { describe, expect, it } from 'vitest'
import { demoPlayerHref, demoRoute, findDemo, listedDemos, parseDemoCatalog } from './demos'

const demo = { key: 'bread-day', name: 'Bread Day', emoji: '🍞', ages: [3, 7], pitch: 'Knead dough.', question: 'Is kneading fun?' }

describe('parseDemoCatalog', () => {
  it('reads groups and their demos', () => {
    const groups = parseDemoCatalog({ groups: [{ id: 'calm-work', title: 'Real work, calmly', testing: 'Whether a real task is enough.', demos: [demo, { ...demo, key: 'tea-time', look: 'gouache' }] }] })
    expect(groups).toHaveLength(1)
    expect(groups[0].demos.map((d) => d.key)).toEqual(['bread-day', 'tea-time'])
    expect(groups[0].demos[0].look).toBeUndefined()
    expect(groups[0].demos[1].look).toBe('gouache')
  })

  it('drops what is malformed and never throws', () => {
    expect(parseDemoCatalog(null)).toEqual([])
    expect(parseDemoCatalog('nope')).toEqual([])
    expect(parseDemoCatalog({ groups: 'nope' })).toEqual([])
    const groups = parseDemoCatalog({
      groups: [
        null,
        { id: 'no-demos', title: 'Empty', testing: 'Nothing.', demos: [] },
        { id: 'mixed', title: 'Mixed', testing: 'Some good, some not.', demos: [demo, { ...demo, key: '../escape' }, { ...demo, ages: [3] }, { name: 'No key' }, 7] },
      ],
    })
    expect(groups.map((g) => g.id)).toEqual(['mixed'])
    expect(groups[0].demos).toHaveLength(1)
  })

  it('gives a demo without an emoji a stand-in', () => {
    const groups = parseDemoCatalog({ groups: [{ id: 'g', title: 'G', testing: 'T.', demos: [{ ...demo, emoji: '' }] }] })
    expect(groups[0].demos[0].emoji).toBe('🎲')
  })
})

describe('what a demo became and how it was rated', () => {
  const catalog = (demos: unknown[]) => parseDemoCatalog({ groups: [{ id: 'g', title: 'G', testing: 'T.', demos }] })

  it('keeps the game a demo became and the verdict, and drops a malformed one of either', () => {
    const [group] = catalog([
      { ...demo, key: 'campfire-nights', game: 'night-camp', verdict: 'build' },
      { ...demo, key: 'odd', game: '../escape', verdict: 'great' },
    ])
    expect(group.demos[0]).toMatchObject({ game: 'night-camp', verdict: 'build' })
    expect(group.demos[1].game).toBeUndefined()
    expect(group.demos[1].verdict).toBeUndefined()
  })

  it('lists a demo once: not when its key is a game, not when the game it became is one', () => {
    const groups = catalog([demo, { ...demo, key: 'campfire-nights', game: 'night-camp' }, { ...demo, key: 'tiny-island' }, { ...demo, key: 'draw-a-bridge', game: 'bridge-crew' }])
    const listed = listedDemos(groups, new Set(['bread-day', 'night-camp']))
    expect(listed[0].demos.map((d) => d.key)).toEqual(['tiny-island', 'draw-a-bridge'])
  })

  it('does not list a demo rated "No", and keeps the other verdicts', () => {
    const groups = catalog([{ ...demo, key: 'peg-blaster', verdict: 'no' }, { ...demo, key: 'claw-machine', verdict: 'build' }, { ...demo, key: 'mutant-garden', verdict: 'maybe' }])
    expect(listedDemos(groups, new Set())[0].demos.map((d) => d.key)).toEqual(['claw-machine', 'mutant-garden'])
  })

  it('drops a group left with no demo', () => {
    expect(listedDemos(catalog([demo]), new Set(['bread-day']))).toEqual([])
  })

  it('finds a demo by key in any group, listed or not', () => {
    const groups = catalog([{ ...demo, key: 'peg-blaster', verdict: 'no' }])
    expect(findDemo(groups, 'peg-blaster')?.name).toBe('Bread Day')
    expect(findDemo(groups, 'nope')).toBeUndefined()
  })
})

describe('where a demo opens', () => {
  it('opens in the jam under its own route', () => {
    expect(demoRoute('bread-day')).toBe('#/demo/bread-day')
  })

  it('frames the demo player by file, without its strip, so it works with or without a trailing slash', () => {
    expect(demoPlayerHref('bread-day', false)).toBe('lab/arcade/index.html?chrome=0#/play/bread-day')
  })

  it('leads a grown-up to the demo with its rating strip', () => {
    expect(demoPlayerHref('bread-day', true)).toBe('lab/arcade/index.html#/play/bread-day')
  })
})

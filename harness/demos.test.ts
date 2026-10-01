import { describe, expect, it } from 'vitest'
import { demoHref, parseDemoCatalog } from './demos'

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

describe('demoHref', () => {
  it('points at the demo player by file, so it works with or without a trailing slash', () => {
    expect(demoHref('bread-day')).toBe('lab/arcade/index.html#/play/bread-day')
  })
})

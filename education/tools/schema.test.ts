import { describe, expect, it } from 'vitest'
import {
  DESIGN_NOTES,
  ENGLISH_GLOSS,
  FIELDS,
  FRAME_CHECK_STRENGTHS,
  JURISDICTIONS,
  KINDS,
  LEVELS,
  OFFICIAL_WORDING,
  REGIMES,
  STANDINGS,
  SUMMARY,
  fieldOrder,
  frameId,
  objectiveId,
  parseId,
  pathForId,
  regionsFor,
  sourceId,
} from './schema.ts'

describe('ids and paths', () => {
  it('builds an objective id and the path it belongs at', () => {
    const id = objectiveId('us-ca', 'grade-4', 'mathematics', '4-nf-3-a')
    expect(id).toBe('edu.us-ca.grade-4.mathematics.objective.4-nf-3-a')
    expect(pathForId(id)).toBe('corpus/us-ca/grade-4/mathematics/objectives/4-nf-3-a.md')
    expect(parseId(id)).toEqual({ kind: 'objective', jurisdiction: 'us-ca', level: 'grade-4', subject: 'mathematics', slug: '4-nf-3-a' })
  })

  it('builds a frame id: one frame per lane, at frame.md', () => {
    const id = frameId('nl', 'fase-1', 'reading-language')
    expect(id).toBe('edu.nl.fase-1.reading-language.frame.lane')
    expect(pathForId(id)).toBe('corpus/nl/fase-1/reading-language/frame.md')
    expect(parseId('edu.nl.fase-1.reading-language.frame.other')).toBeNull()
  })

  it('builds a source id, which names no level or subject because a source spans lanes', () => {
    const id = sourceId('nl', 'kerndoelen-2026')
    expect(id).toBe('edu.nl.source.kerndoelen-2026')
    expect(pathForId(id)).toBe('sources/kerndoelen-2026.md')
    expect(parseId(id)).toEqual({ kind: 'source', jurisdiction: 'nl', slug: 'kerndoelen-2026' })
  })

  it('reads no id that starts with anything but edu.us-ca. or edu.nl.', () => {
    expect(parseId('edu.us.grade-4.mathematics.objective.a')).toBeNull()
    expect(parseId('nl.fase-1.mathematics.objective.a')).toBeNull()
    expect(parseId('edu.nl.fase-1.mathematics.objective.A_b')).toBeNull()
    expect(parseId('edu.nl.fase-1.mathematics.constraint.a')).toBeNull()
    expect(pathForId('edu.nl.fase-1.mathematics')).toBeNull()
  })
})

describe('the vocabularies', () => {
  it('keeps levels, standings and regimes per jurisdiction', () => {
    for (const jurisdiction of JURISDICTIONS) {
      expect(LEVELS[jurisdiction].length).toBeGreaterThan(0)
      expect(STANDINGS[jurisdiction].length).toBeGreaterThan(0)
    }
    expect(STANDINGS.nl.filter((standing) => STANDINGS['us-ca'].includes(standing))).toEqual([])
    expect(REGIMES['us-ca']).toEqual([])
    expect(REGIMES.nl).toEqual(['2006', '2026', '2027-draft'])
  })

  it('gives every kind its fields once, in one order, starting with id and kind', () => {
    for (const kind of KINDS) {
      const order = fieldOrder(kind)
      expect(order.slice(0, 2)).toEqual(['id', 'kind'])
      expect(new Set(order).size).toBe(order.length)
      expect(order).toEqual(FIELDS[kind].map((field) => field.name))
    }
  })
})

describe('the fields this pack adds', () => {
  it('keeps the hash of the text that accompanies a statement right after the wording hash, and only where there is such text', () => {
    const order = fieldOrder('objective')
    expect(order.indexOf('supplement_sha256')).toBe(order.indexOf('wording_sha256') + 1)
    expect(FIELDS.objective.find((field) => field.name === 'supplement_sha256')).toMatchObject({ type: 'string', optional: true })
  })

  it('lets a frame name several check renditions, and say that its parts are checked in both ways', () => {
    const order = fieldOrder('frame')
    expect(order).not.toContain('check_rendition')
    expect(order.indexOf('check_strength')).toBe(order.indexOf('check_renditions') + 1)
    expect(FIELDS.frame.find((field) => field.name === 'check_renditions')).toMatchObject({ type: 'strings' })
    expect(FRAME_CHECK_STRENGTHS).toEqual(['second-rendition', 'second-reading', 'mixed'])
  })
})

describe('regionsFor', () => {
  it('names the regions a record holds, in order, by reuse policy and language', () => {
    expect(regionsFor('verbatim', 'nl')).toEqual([OFFICIAL_WORDING, ENGLISH_GLOSS, DESIGN_NOTES])
    expect(regionsFor('verbatim', 'en')).toEqual([OFFICIAL_WORDING, DESIGN_NOTES])
    expect(regionsFor('description-only', 'en')).toEqual([SUMMARY, DESIGN_NOTES])
    expect(regionsFor('description-only', 'nl')).toEqual([SUMMARY, ENGLISH_GLOSS, DESIGN_NOTES])
  })
})

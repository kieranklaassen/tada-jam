import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { derivedPath, ocrPage, parseRecognised } from './ocr.ts'
import type { OcrPage, Recogniser } from './ocr.ts'

// Every text here is invented. No official wording belongs in a test.

const PIN = 'a'.repeat(64)
const LANGUAGES = ['nl-NL', 'en-US']

const page = (...texts: string[]): OcrPage => ({
  recogniser: 'invented',
  languages: LANGUAGES,
  width: 600,
  height: 800,
  lines: texts.map((text, index) => ({ text, xMin: 40, yMin: 100 + index * 14, xMax: 200, yMax: 110 + index * 14, confidence: 1 })),
})

describe('text recognition of a page', () => {
  let store: string

  beforeEach(() => {
    store = mkdtempSync(join(tmpdir(), 'education-ocr-'))
  })

  afterEach(() => {
    rmSync(store, { recursive: true, force: true })
  })

  it('asks the recogniser for the page and saves what it gives in the store', () => {
    const asked: unknown[] = []
    const recognise: Recogniser = (pdf, number, languages) => (asked.push([pdf, number, languages]), page('de appels liggen', 'in de mand'))
    const read = ocrPage(store, PIN, '/somewhere/card.pdf', 2, LANGUAGES, recognise)
    expect(read.lines.map((line) => line.text)).toEqual(['de appels liggen', 'in de mand'])
    expect(asked).toEqual([['/somewhere/card.pdf', 2, LANGUAGES]])
    const saved = derivedPath(store, PIN, 'ocr-page-2.json')
    expect(saved).toBe(join(store, 'derived', PIN, 'ocr-page-2.json'))
    expect(JSON.parse(readFileSync(saved, 'utf8'))).toEqual(read)
  })

  it('reads the saved text on a later run, whatever the recogniser would give then', () => {
    ocrPage(store, PIN, '/somewhere/card.pdf', 1, LANGUAGES, () => page('de appels liggen'))
    let asked = 0
    const later = ocrPage(store, PIN, '/somewhere/card.pdf', 1, LANGUAGES, () => ((asked += 1), page('de apples liggen')))
    expect(later.lines.map((line) => line.text)).toEqual(['de appels liggen'])
    expect(asked).toBe(0)
    // Another page of the same file is still recognised.
    expect(existsSync(derivedPath(store, PIN, 'ocr-page-2.json'))).toBe(false)
  })

  it('gives the lines from the top of the page down', () => {
    const jumbled: OcrPage = { ...page(), lines: [page('c', 'd').lines[1]!, { ...page('b').lines[0]!, xMin: 300, xMax: 400 }, page('a').lines[0]!] }
    expect(ocrPage(store, PIN, '/somewhere/card.pdf', 1, LANGUAGES, () => jumbled).lines.map((line) => line.text)).toEqual(['a', 'b', 'd'])
  })
})

describe('what the recogniser prints', () => {
  it('is read as the page size and its lines, in points from the top left', () => {
    // A page of 600 by 800 points rendered at 144 dots per inch is 1200 by 1600 pixels.
    const output = ['size\t1200\t1600', '0.1000\t0.2500\t0.5000\t0.2750\t0.50\tde appels liggen', '0.1000\t0.3000\t0.4000\t0.3250\t1.00\tin de mand\tvan oma', ''].join('\n')
    expect(parseRecognised(output, 144)).toEqual({
      width: 600,
      height: 800,
      lines: [
        { text: 'de appels liggen', xMin: 60, yMin: 200, xMax: 300, yMax: 220, confidence: 0.5 },
        { text: 'in de mand\tvan oma', xMin: 60, yMin: 240, xMax: 240, yMax: 260, confidence: 1 },
      ],
    })
  })

  it('is refused when it does not start with the size of the picture', () => {
    expect(() => parseRecognised('cannot load the picture\n', 144)).toThrow('text recognition')
  })
})

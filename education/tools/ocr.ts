// On-device text recognition for pages whose statements are drawn as images.
// A page of the PDF is rendered to a picture with pdftoppm and read by the
// text recogniser of macOS (Vision), through the small Swift script beside
// this file. Nothing leaves the machine.
//
// What was read is saved in the store and read from there ever after:
//
//   <store>/derived/<pin>/ocr-page-<n>.json
//
// so a later run extracts the same text even when a newer recogniser would
// read a letter differently. To recognise a page again, delete its file.
//
// Recognition is not exact. The lanes that use it say so in their frame, and
// each misread is put right by a correction in the locator, checked by eye
// against the page.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

// One recognised line and where it is on the page: in points from the top
// left corner, the units and origin of pdftotext -bbox.
export interface OcrLine {
  text: string
  xMin: number
  yMin: number
  xMax: number
  yMax: number
  // The recogniser's own confidence in the line, from 0 to 1.
  confidence: number
}

export interface OcrPage {
  // What read the page, and the languages it was asked for, first choice first.
  recogniser: string
  languages: string[]
  // The size of the page in points.
  width: number
  height: number
  // From the top of the page down; lines at one height from left to right.
  // On a page of several columns that is not yet reading order: rendition.ts
  // assigns the lines to columns.
  lines: OcrLine[]
}

// Reads one page (counted from 1) of the PDF at `pdf`.
export type Recogniser = (pdf: string, page: number, languages: readonly string[]) => OcrPage

// Where something derived from the fetched file with this pin is kept in the store.
export function derivedPath(store: string, pin: string, name: string): string {
  return join(store, 'derived', pin, name)
}

// The dots per inch a page is rendered at before it is read: what the
// manifest's plan for the image-based cards says.
export const DPI = 220

const round = (value: number): number => Math.round(value * 100) / 100

// What ocr.swift prints, as a page: a first line `size`, the picture's width
// and height in pixels, then one line per recognised line: its left, top,
// right and bottom as shares of the picture measured from the top left, its
// confidence, and its text, all separated by tabs.
export function parseRecognised(output: string, dpi: number): Pick<OcrPage, 'width' | 'height' | 'lines'> {
  const rows = output.split('\n').filter((row) => row !== '')
  const size = rows[0]?.split('\t') ?? []
  const [pixelsWide, pixelsHigh] = [Number(size[1]), Number(size[2])]
  if (size[0] !== 'size' || !(pixelsWide > 0) || !(pixelsHigh > 0)) throw new Error(`text recognition did not print the size of the picture first: ${rows[0] ?? '(nothing)'}`)
  const width = round((pixelsWide * 72) / dpi)
  const height = round((pixelsHigh * 72) / dpi)
  const lines = rows.slice(1).map((row) => {
    const [left, top, right, bottom, confidence, ...text] = row.split('\t')
    return {
      text: text.join('\t'),
      xMin: round(Number(left) * width),
      yMin: round(Number(top) * height),
      xMax: round(Number(right) * width),
      yMax: round(Number(bottom) * height),
      confidence: Number(confidence),
    }
  })
  return { width, height, lines }
}

// The recogniser of this machine: pdftoppm (found on PATH, from the same
// poppler as pdftotext) renders the page, and Vision reads it.
export const recogniseWithVision: Recogniser = (pdf, page, languages) => {
  const folder = mkdtempSync(join(tmpdir(), 'education-ocr-'))
  try {
    const picture = join(folder, 'page')
    execFileSync('pdftoppm', ['-f', String(page), '-l', String(page), '-r', String(DPI), '-png', '-singlefile', pdf, picture], { stdio: ['ignore', 'pipe', 'pipe'] })
    const output = execFileSync('swift', [join(import.meta.dirname, 'ocr.swift'), `${picture}.png`, ...languages], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] })
    return { recogniser: 'macos-vision', languages: [...languages], ...parseRecognised(output, DPI) }
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}

// The recognised text of one page of the fetched file pinned as `pin`, which
// is the PDF at `pdf`: from the store when the page was read before, from
// the recogniser and then saved otherwise.
export function ocrPage(store: string, pin: string, pdf: string, page: number, languages: readonly string[], recognise: Recogniser = recogniseWithVision): OcrPage {
  const saved = derivedPath(store, pin, `ocr-page-${page}.json`)
  if (existsSync(saved)) return JSON.parse(readFileSync(saved, 'utf8')) as OcrPage

  const read = recognise(pdf, page, languages)
  const result: OcrPage = { ...read, lines: read.lines.slice().sort((a, b) => a.yMin - b.yMin || a.xMin - b.xMin) }
  // Written under another name and then renamed, so a saved page is never half written.
  mkdirSync(dirname(saved), { recursive: true })
  const partial = `${saved}.${process.pid}.partial`
  writeFileSync(partial, `${JSON.stringify(result, null, 2)}\n`)
  renameSync(partial, saved)
  return result
}

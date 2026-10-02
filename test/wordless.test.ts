import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { scanGames, scanWordless } from '../scripts/wordless-check'

type Band = [number, number]

const rules = (source: string, file = 'games/demo/view.tsx', ageBand?: Band) => scanWordless(source, file, { ageBand }).map((f) => f.rule)

// A fraction drawn from two integers, as a game's symbols.ts would hold it.
const FRACTION = `export function drawFraction(g: CanvasRenderingContext2D, top: number, bottom: number, x: number, y: number): void {
  g.fillText(\`\${top}/\${bottom}\`, x, y) // wordless-ok: numeral a fraction laid on the strip it measures
}`

describe('wordless check', () => {
  it('flags words and numerals between JSX tags', () => {
    expect(rules('export const A = () => <p>Tap the bag</p>')).toEqual(['kid-text-jsx'])
    expect(rules('export const A = () => <p>3</p>')).toEqual(['kid-text-jsx'])
  })

  it('flags string and template children', () => {
    expect(rules("export const A = () => <p>{'Tap'}</p>")).toEqual(['kid-text-literal'])
    expect(rules('export const A = (n: number) => <p>{`${n} left`}</p>')).toEqual(['kid-text-literal'])
  })

  it('flags values formatted as text children', () => {
    expect(rules('export const A = (n: number) => <p>{String(n)}</p>')).toEqual(['kid-text-number'])
    expect(rules('export const A = (n: number) => <p>{n.toFixed(1)}</p>')).toEqual(['kid-text-number'])
    expect(rules('export const A = (f: Intl.NumberFormat) => <p>{f.format(3)}</p>')).toEqual(['kid-text-number'])
  })

  it('flags DOM and canvas text APIs, in .ts files too', () => {
    expect(rules("el.textContent = 'Hi'", 'games/demo/hud.ts')).toEqual(['kid-text-api'])
    expect(rules("ctx.fillText('5', 10, 10)", 'games/demo/draw.ts')).toEqual(['kid-text-api'])
    expect(rules("document.createTextNode('x')", 'games/demo/draw.ts')).toEqual(['kid-text-api'])
  })

  it('flags text components', () => {
    expect(rules('export const A = () => <Text>hi</Text>')).toContain('kid-text-component')
    expect(rules('export const A = () => <Drei.Text3D />')).toEqual(['kid-text-component'])
  })

  it('allows attributes, whitespace, expressions, and wordless markup', () => {
    const source = `export const A = ({ n }: { n: number }) => (
      <div aria-label="Pebble table" className="stage">
        {n > 0 && <span style={{ width: n }} />}
        {' '}
        <canvas />
      </div>
    )`
    expect(rules(source)).toEqual([])
  })

  it('allows attribute values written as template literals or expressions', () => {
    const source = `export const A = ({ on, i }: { on: boolean; i: number }) => (
      <button className={\`round \${on ? 'is-on' : ''}\`} aria-label={\`Phase \${i + 1} of 8\`} data-step={String(i)} />
    )`
    expect(rules(source)).toEqual([])
  })

  it('flags attributes the browser draws as text', () => {
    expect(rules('export const A = () => <input placeholder="Your name" />')).toEqual(['kid-text-attribute'])
    expect(rules('export const A = (n: number) => <img alt={`${n} stones`} />')).toEqual(['kid-text-attribute'])
    expect(rules("export const A = () => <button title={'Tap me'} />")).toEqual(['kid-text-attribute'])
    expect(rules('export const A = (n: number) => <input value={n.toFixed(1)} />')).toEqual(['kid-text-attribute'])
    expect(rules('export const A = () => <img alt="" />')).toEqual([])
  })

  it('still scans JSX passed through an attribute', () => {
    expect(rules('export const A = () => <Slot icon={<p>Hi</p>} />')).toEqual(['kid-text-jsx'])
    expect(rules("export const A = () => <Slot icon={<p>{'Hi'}</p>} />")).toEqual(['kid-text-literal'])
  })

  it('reports the line of the finding', () => {
    expect(scanWordless('const a = 1\n\nexport const A = () => <p>Hi</p>', 'games/demo/a.tsx')[0].line).toBe(3)
  })

  describe('mathematics signs', () => {
    it('flags an equals sign as SVG text or a string child in a view file, at any band', () => {
      for (const band of [[4, 7], [9, 12]] as Band[]) {
        expect(rules('export const A = () => <svg><text x={4}>=</text></svg>', 'games/demo/view.tsx', band)).toEqual(['kid-text-jsx'])
        expect(rules("export const A = () => <p>{'='}</p>", 'games/demo/view.tsx', band)).toEqual(['kid-text-literal'])
      }
    })

    it('flags every sign of the symbol rule, in keyboard and Unicode forms', () => {
      for (const sign of ['+', '-', '−', '*', '×', '÷', ':', '/', '⁄', '=', '<', '>', '.', ',', '%']) {
        expect(rules(`export const A = () => <p>{'${sign}'}</p>`), sign).toEqual(['kid-text-literal'])
      }
      expect(rules('export const A = () => <p>+</p>')).toEqual(['kid-text-jsx'])
      expect(rules('export const A = (a: number, b: number) => <p>{`${a}/${b}`}</p>')).toEqual(['kid-text-literal'])
      expect(rules('export const A = () => <input placeholder="+" />')).toEqual(['kid-text-attribute'])
    })

    it('leaves signs alone where they are not text on screen', () => {
      const source = `// - a minus as a list bullet in a comment
      export const A = ({ on }: { on: boolean }) => (
        <svg className="pan-left is-on" viewBox="0 0 10 10" aria-label="1 + 1 = 2" data-ratio="1/2">
          {/* - not code either */}
          <path d="M0,0 L1.5-1 Z" transform={\`translate(\${on ? -2 : 2}, 0.5)\`} />
          <use href="#pan/left" style={{ opacity: on ? 1 : 0.4 }} />
        </svg>
      )`
      expect(rules(source)).toEqual([])
    })

    it('passes a sign only in symbols.ts, under the numeral exception, when the band starts at 6 or above', () => {
      const sign = "export const drawEquals = (g: CanvasRenderingContext2D, x: number, y: number) => g.fillText('=', x, y) // wordless-ok: numeral between the two pans it compares"
      expect(rules(sign, 'games/demo/symbols.ts', [9, 12])).toEqual([])
      expect(rules(sign, 'games/demo/symbols.ts', [4, 7])).toEqual(['numeral-exception-band'])
      expect(rules(sign, 'games/demo/draw.ts', [9, 12])).toEqual(['numeral-exception-misplaced'])
    })
  })

  describe('the numeral exception', () => {
    it("passes in a game's symbols.ts when the band starts at 6 or above", () => {
      expect(scanWordless(FRACTION, 'games/demo/symbols.ts', { ageBand: [9, 12] })).toEqual([])
      expect(scanWordless(FRACTION, 'games/demo/symbols.ts', { ageBand: [6, 10] })).toEqual([])
    })

    it('fails when the band starts below 6, and names the band', () => {
      expect(scanWordless(FRACTION, 'games/demo/symbols.ts', { ageBand: [4, 7] })).toEqual([
        { file: 'games/demo/symbols.ts', line: 2, rule: 'numeral-exception-band', match: expect.stringContaining('band [4, 7] starts below 6') },
      ])
      expect(rules(FRACTION, 'games/demo/symbols.ts', [5, 8])).toEqual(['numeral-exception-band'])
    })

    it('is accepted on the line above the call', () => {
      const source = '// wordless-ok: numeral the count laid on the set it names\ng.fillText(String(n), x, y)'
      expect(rules(source, 'games/demo/symbols.ts', [6, 10])).toEqual([])
    })

    it('fails in any file other than the symbols.ts directly in the game folder', () => {
      const source = 'g.fillText(String(n), x, y) // wordless-ok: numeral the count laid on the set it names'
      expect(rules(source, 'games/demo/view/draw.ts', [9, 12])).toEqual(['numeral-exception-misplaced'])
      expect(rules(source, 'games/demo/view/symbols.ts', [9, 12])).toEqual(['numeral-exception-misplaced'])
      expect(rules(source, 'games/demo/view/overlay.ts', [9, 12])).toEqual(['numeral-exception-misplaced'])
    })

    it('does not excuse a literal that holds a letter', () => {
      const unit = "g.fillText('cm', x, y) // wordless-ok: numeral the length of the plank"
      const mixed = 'g.fillText(`${n} cm`, x, y) // wordless-ok: numeral the length of the plank'
      const either = "label.textContent = n > 1 ? String(n) : 'one' // wordless-ok: numeral the count laid on the set it names"
      for (const source of [unit, mixed, either]) {
        expect(rules(source, 'games/demo/symbols.ts', [9, 12])).toEqual(['numeral-exception-letter'])
      }
    })
  })

  describe('the plain exception', () => {
    const corner = '// wordless-ok: grown-up corner behind a hold gesture\nexport const A = () => <p>Volume</p>'

    it('passes in a grown-up overlay file, at any band', () => {
      for (const file of ['games/demo/view/overlay.tsx', 'games/demo/view/perf.tsx']) {
        expect(rules(corner, file, [3, 7])).toEqual([])
        expect(rules(corner, file, [9, 12])).toEqual([])
      }
    })

    it('fails in a kid-side file that is not a grown-up overlay', () => {
      expect(rules(corner, 'games/demo/view.tsx', [9, 12])).toEqual(['plain-exception-misplaced'])
    })

    it('fails inside symbols.ts', () => {
      const source = 'g.fillText(String(n), x, y) // wordless-ok: the count laid on the set it names'
      expect(rules(source, 'games/demo/symbols.ts', [9, 12])).toEqual(['plain-exception-misplaced'])
    })
  })

  it('takes the file class when it is passed in, for a copy that lives outside games/', () => {
    expect(scanWordless(FRACTION, 'copy/symbols.ts', { fileClass: 'symbols', ageBand: [9, 12] })).toEqual([])
    expect(rules(FRACTION, 'copy/symbols.ts', [9, 12])).toEqual(['numeral-exception-misplaced'])
  })

  it("reads each game's band from its manifest, and reports a manifest it cannot use as one finding", () => {
    const temp = mkdtempSync(join(tmpdir(), 'wordless-bands-'))
    const game = (key: string, manifest: string, symbols?: string): void => {
      mkdirSync(join(temp, 'games', key), { recursive: true })
      writeFileSync(join(temp, 'games', key, 'manifest.ts'), manifest)
      writeFileSync(join(temp, 'games', key, 'rules.ts'), 'export const turns = 3\n')
      if (symbols) writeFileSync(join(temp, 'games', key, 'symbols.ts'), symbols)
    }
    const manifest = (key: string, band: string): string =>
      `import type { CartridgeManifest } from '../types'\n\nexport const demoManifest: CartridgeManifest = { key: '${key}', name: 'Demo', ageBand: ${band}, permissions: [], iconIdentity: { family: 'play', contrast: 'paper' } }\n`
    try {
      game('older', manifest('older', '[9, 12]'), FRACTION)
      game('younger', manifest('younger', '[4, 7]'), FRACTION)
      game('throws', "throw new Error('boom')\n")
      game('bandless', "export const demoManifest = { key: 'bandless', name: 'Demo' }\n")
      const findings = scanGames(temp)
      const of = (key: string) => findings.filter((f) => f.file.startsWith(`games/${key}/`))
      expect(of('older')).toEqual([])
      expect(of('younger')).toEqual([{ file: 'games/younger/symbols.ts', line: 2, rule: 'numeral-exception-band', match: expect.stringContaining('[4, 7]') }])
      expect(of('throws')).toEqual([{ file: 'games/throws/manifest.ts', line: 0, rule: 'manifest-age-band', match: expect.stringContaining('boom') }])
      expect(of('bandless')).toEqual([{ file: 'games/bandless/manifest.ts', line: 0, rule: 'manifest-age-band', match: expect.stringContaining('ageBand') }])
    } finally {
      rmSync(temp, { recursive: true, force: true })
    }
  })

  it('every jam game is wordless on the kid side', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    expect(scanGames(root)).toEqual([])
  })
})

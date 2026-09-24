import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { scanGames, scanWordless } from '../scripts/wordless-check'

const rules = (source: string, file = 'games/demo/view.tsx') => scanWordless(source, file).map((f) => f.rule)

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

  it('allows a deliberate exception marked wordless-ok', () => {
    expect(rules('// wordless-ok: grown-up corner behind a hold gesture\nexport const A = () => <p>Volume</p>')).toEqual([])
  })

  it('reports the line of the finding', () => {
    expect(scanWordless('const a = 1\n\nexport const A = () => <p>Hi</p>', 'games/demo/a.tsx')[0].line).toBe(3)
  })

  it('every jam game is wordless on the kid side', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    expect(scanGames(root)).toEqual([])
  })
})

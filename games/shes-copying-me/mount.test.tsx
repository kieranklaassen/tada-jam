// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CartridgeContext, CartridgeStorage } from '../types'
import { shesCopyingMeCartridge } from './shes-copying-me'
import type { GameState } from './state'

// The Mount as a child's fingers and the shell meet it: pointer events on the
// surface, and what reaches storage.

const { Mount } = shesCopyingMeCartridge

function context(): CanvasRenderingContext2D {
  const kept = new Map<string | symbol, unknown>()
  return new Proxy({}, {
    get: (_, name) => (kept.has(name) ? kept.get(name) : String(name).startsWith('create') ? () => ({ addColorStop: () => {} }) : name === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : () => {}),
    set: (_, name, value) => {
      kept.set(name, value)
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

let saves: GameState[] = [], frames: FrameRequestCallback[] = [], now = 0, root: Root, box: HTMLElement
let stored: unknown = null
const storage: CartridgeStorage = {
  load: () => Promise.resolve(stored) as never,
  save: (value: unknown) => { saves.push(JSON.parse(JSON.stringify(value)) as GameState) },
  flush: () => Promise.resolve(),
}
const ctx = (attended: boolean): CartridgeContext => ({ childNickname: 'Sam', childAge: null, language: 'en', theme: 'meadow', status: 'ready', storage, attention: { attended } })

const show = (attended: boolean) => act(async () => root.render(<Mount ctx={ctx(attended)} />))
function run(seconds: number): void {
  for (let t = 0; t < seconds; t += 1 / 60) {
    now += 1000 / 60
    const due = frames
    frames = []
    for (const each of due) each(now)
  }
}
function finger(type: string, x: number, y: number, pointerId = 1): void {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true })
  Object.defineProperty(event, 'pointerId', { value: pointerId })
  box.firstElementChild!.dispatchEvent(event)
}
const tap = (x: number, y: number) => {
  finger('pointerdown', x, y)
  run(0.05)
  finger('pointerup', x, y)
}
const last = () => saves[saves.length - 1]

describe('the mount', () => {
  beforeEach(async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    saves = []
    frames = []
    stored = null
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => frames.push(f))
    vi.stubGlobal('cancelAnimationFrame', () => { frames = [] })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => context()) as never)
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1180 })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 820 })
    HTMLElement.prototype.setPointerCapture = () => {}
    box = document.createElement('div')
    document.body.appendChild(box)
    root = createRoot(box)
    await show(true)
    await act(async () => {})
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    box.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('pours here, and there a beat later, from one tap over a guest', () => {
    tap(135, 340)
    run(3)
    expect(last().coats).toMatchObject({ walrus: 'wet', dog: 'gluey' })
  })
  it('lets two fingers lead two hands', () => {
    finger('pointerdown', 135, 340, 1)
    finger('pointerdown', 1045, 340, 2)
    run(0.6)
    finger('pointerup', 135, 340, 1)
    finger('pointerup', 1045, 340, 2)
    run(3)
    expect(last().coats).toMatchObject({ walrus: 'wet', dog: 'gluey' })
  })
  it('puts a carried thing back when the browser takes the finger, and when it is put away', async () => {
    for (const end of ['pointercancel', 'park']) {
      finger('pointerdown', 372, 650)
      finger('pointermove', 372, 450)
      run(0.2)
      if (end === 'park') await show(false)
      else finger('pointercancel', 372, 450)
      run(1)
      if (saves.length) expect([...last().held, ...last().table].sort()).toHaveLength(6)
      if (saves.length) expect(last().held).toEqual(['teapot', 'glue'])
      await show(true)
    }
  })
  it('asks for no frames while parked, and hands the newest state over on the way', async () => {
    tap(590, 398)
    tap(135, 340)
    run(0.5)
    await show(false)
    expect(frames).toHaveLength(0)
    expect(last().beat).toBe('steady')
    expect(last().coats.walrus).toBe('wet')
    const dog = last().coats.dog
    await show(true)
    run(3)
    expect(last().coats.dog).toBe(dog)
  })
})

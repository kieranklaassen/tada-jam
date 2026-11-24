// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CartridgeContext, CartridgeStorage } from '../types'
import { animalsVoteCartridge } from './animals-vote'
import type { Saved } from './save'

// The Mount as a child's fingers and the shell meet it: pointer events on the
// surface, and what reaches storage.

const { Mount } = animalsVoteCartridge

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

let saves: Saved[] = [], frames: FrameRequestCallback[] = [], now = 0, root: Root, box: HTMLElement
let stored: unknown = null
const storage: CartridgeStorage = {
  load: () => Promise.resolve(stored) as never,
  save: (value: unknown) => { saves.push(JSON.parse(JSON.stringify(value)) as Saved) },
  flush: () => Promise.resolve(),
}
const ctx = (attended: boolean): CartridgeContext => ({ childNickname: 'Child', childAge: null, language: 'en', theme: 'meadow', status: 'ready', storage, attention: { attended } })

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

  it('sends a tapped animal to its column and saves it there', () => {
    tap(108, 700)
    run(1)
    expect(last().columns).toEqual([[], ['pig'], []])
  })
  it('saves a vote as read the moment the bell is rung', () => {
    tap(934, 148)
    expect(last()).toMatchObject({ finished: true, fresh: true, position: 'one-over' })
  })
  it('puts a carried animal back when the browser takes the finger, and when it is put away', async () => {
    for (const end of ['pointercancel', 'park']) {
      finger('pointerdown', 896, 700)
      finger('pointermove', 600, 300)
      run(0.2)
      if (end === 'park') await show(false)
      else finger('pointercancel', 600, 300)
      run(1)
      if (saves.length) expect(last().columns.flat()).toEqual([])
      await show(true)
    }
  })
  it('asks for no frames while parked, and hands the newest state over on the way', async () => {
    tap(108, 700)
    tap(148, 500)
    run(0.1)
    await show(false)
    expect(frames).toHaveLength(0)
    expect(last().columns).toEqual([['elephant'], ['pig'], []])
    await show(true)
    run(1)
    expect(last().columns).toEqual([['elephant'], ['pig'], []])
  })
})

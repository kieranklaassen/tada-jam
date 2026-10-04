// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CartridgeContext, CartridgeStorage } from '../harness/contract'
import { templateCartridge } from '../templates/cartridge/game'
import { IDLE_BEFORE_DEMO, IdleLadder, type Guidance } from '../templates/cartridge/guidance'
import { ForgivingTouch, type Gesture } from '../templates/cartridge/input'
import { TierGovernor } from '../templates/cartridge/quality'
import { SaveCadence } from '../templates/cartridge/saveCadence'
import { STATE_VERSION, deserialize } from '../templates/cartridge/state'

// The template's Mount, run the way a shell runs it: mounted, parked while it
// stays mounted, brought back, and unmounted. Every game made from the
// template starts with this wiring, so what the contract asks of a Mount
// (nothing lost and nothing overwritten on a put-away, nothing running while
// unattended, nothing left behind on unmount) is held here. The file sits
// outside templates/cartridge/ so the generator does not copy it into a game.
//
// The blank surface draws nothing, so the test reads what the Mount's own
// helpers report: the gestures the touch tracker yields, what the idle ladder
// would show, what reaches storage, the tier marked on the canvas and the
// grown-up overlay's box.

// `deserialize` is wrapped, not replaced, to see when the Mount reads the slot.
vi.mock('../templates/cartridge/state', async (original) => {
  const actual = await original<typeof import('../templates/cartridge/state')>()
  return { ...actual, deserialize: vi.fn(actual.deserialize) }
})

const { Mount } = templateCartridge
const SAVED = { v: STATE_VERSION, position: 'second', finished: true }

/** A stand-in for requestAnimationFrame: frames run only when the test steps time. Events are stamped from the same clock, as in a browser. */
function fakeFrames() {
  const pending = new Map<number, FrameRequestCallback>()
  const cancelled = new Map<number, FrameRequestCallback>()
  let nextId = 1
  let now = 1000
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    pending.set(nextId, callback)
    return nextId++
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    const callback = pending.get(id)
    if (callback) cancelled.set(id, callback)
    pending.delete(id)
  })
  return {
    pending,
    cancelled,
    now: () => now,
    /** Runs `count` frames, each `ms` after the one before. */
    run(count: number, ms = 100): void {
      for (let i = 0; i < count; i++) {
        now += ms
        const due = [...pending.values()]
        pending.clear()
        for (const callback of due) callback(now)
      }
    },
    /** Delivers a frame that was cancelled, as if the browser had already begun it. */
    deliverCancelled(): void {
      now += 16
      for (const callback of cancelled.values()) callback(now)
    },
  }
}

/** A slot whose read the test answers when it chooses. */
function fakeStorage() {
  let answer: (value: unknown) => void = () => {}
  const storage = {
    load: vi.fn(() => new Promise<unknown>((resolve) => (answer = resolve))) as unknown as CartridgeStorage['load'],
    save: vi.fn(),
    flush: () => Promise.resolve(),
  } satisfies CartridgeStorage
  return {
    storage,
    /** The shell's read of the slot comes back. */
    async loaded(value: unknown): Promise<void> {
      await act(async () => answer(value))
    },
  }
}

const context = (storage: CartridgeStorage, attended: boolean): CartridgeContext => ({
  childNickname: 'Kaia',
  childAge: 4,
  language: 'en',
  theme: 'meadow',
  status: 'ready',
  storage,
  attention: { attended },
})

/** Mounts the template's Mount and hands back what a shell and a finger can do to it. */
function open(frames: ReturnType<typeof fakeFrames>, attended = true) {
  const slot = fakeStorage()
  const view = render(<Mount ctx={context(slot.storage, attended)} />)
  const root = view.container.firstElementChild as HTMLElement
  const pointer = (type: string, id = 1, x = 40, y = 40): void => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
    Object.defineProperty(event, 'pointerId', { value: id })
    Object.defineProperty(event, 'timeStamp', { value: frames.now() })
    root.dispatchEvent(event)
  }
  return {
    ...slot,
    root,
    canvas: root.querySelector('canvas')!,
    pointer,
    attend: (next: boolean) => view.rerender(<Mount ctx={context(slot.storage, next)} />),
    unmount: () => view.unmount(),
  }
}

describe('the template Mount', () => {
  let frames: ReturnType<typeof fakeFrames>
  let gestures: Gesture[]
  let shown: Guidance[]
  let size: { width: number; height: number }
  let resized: () => void
  let observers: { disconnected: boolean }[]

  beforeEach(() => {
    frames = fakeFrames()
    gestures = []
    shown = []
    size = { width: 800, height: 600 }
    observers = []
    resized = () => {}
    vi.mocked(deserialize).mockClear()

    // jsdom lays nothing out and has no media queries, pointer capture or ResizeObserver.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => size.width)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => size.height)
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    Element.prototype.setPointerCapture = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly record = { disconnected: false }
        constructor(callback: () => void) {
          resized = callback
          observers.push(this.record)
        }
        observe(): void {}
        disconnect(): void {
          this.record.disconnected = true
        }
      },
    )

    // Every gesture the tracker yields to the Mount, in order.
    for (const method of ['down', 'move', 'up', 'cancel', 'advance', 'clear'] as const) {
      const yielded = ForgivingTouch.prototype[method] as (...args: unknown[]) => Gesture[]
      vi.spyOn(ForgivingTouch.prototype, method).mockImplementation(function (this: ForgivingTouch, ...args: unknown[]) {
        const result = yielded.apply(this, args)
        gestures.push(...result)
        return result
      })
    }
    // What the ladder would show on each frame. It reuses one object, so each frame is copied.
    const update = IdleLadder.prototype.update
    vi.spyOn(IdleLadder.prototype, 'update').mockImplementation(function (this: IdleLadder, now: number) {
      const guidance = update.call(this, now)
      shown.push({ ...guidance })
      return guidance
    })
    // The blank surface never changes its state. A game does, so every rest here finds a change waiting to be saved.
    const settle = SaveCadence.prototype.settle
    vi.spyOn(SaveCadence.prototype, 'settle').mockImplementation(function (this: SaveCadence, time: number) {
      this.mark()
      settle.call(this, time)
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', window.location.pathname)
  })

  const types = (): string[] => gestures.map((gesture) => gesture.type)
  /** Opens the page with a query string, as a grown-up measuring the game does. */
  const address = (search: string): void => window.history.replaceState(null, '', search)
  /** The governor steps to `tier` on the next frame it judges, as it does after a run of slow or clean windows. */
  const stepTo = (tier: number): void => {
    vi.spyOn(TierGovernor.prototype, 'sample').mockImplementationOnce(function (this: TierGovernor) {
      this.tier = tier
      return true
    })
  }
  /** Every sizing of the backing store from now on, each with the tier that was applied when it happened. */
  const sizings = (canvas: HTMLCanvasElement): string[] => {
    const seen: string[] = []
    let width = canvas.width
    Object.defineProperty(canvas, 'width', {
      configurable: true,
      get: () => width,
      set: (value: number) => {
        width = value
        seen.push(`${value} wide at tier ${canvas.dataset.tier}`)
      },
    })
    return seen
  }
  const overlayOf = (root: HTMLElement): HTMLElement | null => root.querySelector('[data-perf-overlay]')

  it('saves nothing when it is parked before the slot has been read, and saves the state it read after that', async () => {
    const game = open(frames)
    game.attend(false)
    expect(game.storage.save).not.toHaveBeenCalled()

    await game.loaded(SAVED)
    expect(deserialize).toHaveBeenCalledWith(SAVED, 4)
    game.attend(true)
    game.attend(false)
    expect(game.storage.save).toHaveBeenCalledTimes(1)
    expect(game.storage.save).toHaveBeenCalledWith(SAVED)
  })

  it('starts on a first-visit state when the slot cannot be read', async () => {
    const slot = fakeStorage()
    slot.storage.load = (() => Promise.reject(new Error('no slot'))) as CartridgeStorage['load']
    const view = render(<Mount ctx={context(slot.storage, true)} />)
    await act(async () => {})
    view.rerender(<Mount ctx={context(slot.storage, false)} />)
    expect(slot.storage.save).toHaveBeenCalledWith({ v: STATE_VERSION, position: 'first', finished: false })
  })

  it('cancels its pending frame when it is parked and asks for no other until attention returns', () => {
    const game = open(frames)
    expect(frames.pending.size).toBe(1)
    frames.run(3)
    expect(shown).toHaveLength(3)
    expect(frames.pending.size).toBe(1)

    game.attend(false)
    expect(frames.pending.size).toBe(0)
    expect(frames.cancelled.size).toBe(1)
    frames.run(5)
    // Even a frame the browser still delivers plays nothing and asks for no other.
    frames.deliverCancelled()
    expect(shown).toHaveLength(3)
    expect(frames.pending.size).toBe(0)

    game.attend(true)
    expect(frames.pending.size).toBe(1)
    frames.run(2)
    expect(shown).toHaveLength(5)
  })

  it('does not start its loop when it is mounted unattended', () => {
    const game = open(frames, false)
    expect(frames.pending.size).toBe(0)
    game.attend(true)
    expect(frames.pending.size).toBe(1)
  })

  it('ends a press without a tap when it is parked under the finger', () => {
    const game = open(frames)
    game.pointer('pointerdown')
    expect(types()).toEqual(['press'])
    game.attend(false)
    expect(types()).toEqual(['press', 'pressEnd'])
    // The finger lifts while the game is away, or after it is back: neither is a tap.
    game.pointer('pointerup')
    game.attend(true)
    game.pointer('pointerup')
    expect(types()).toEqual(['press', 'pressEnd'])
  })

  it('ignores a touch that lands while it is parked', () => {
    const game = open(frames)
    game.attend(false)
    game.pointer('pointerdown')
    game.pointer('pointerup')
    expect(types()).toEqual([])
  })

  it('keeps the idle ladder at the bottom while a finger is held or dragging, however long', () => {
    const game = open(frames)
    const framesPast = Math.ceil((IDLE_BEFORE_DEMO + 2) / 0.1)
    game.pointer('pointerdown')
    frames.run(framesPast)
    game.pointer('pointermove', 1, 200, 40)
    frames.run(framesPast)
    expect(types()).toContain('dragMove')
    expect(shown.length).toBe(2 * framesPast)
    expect(shown.filter((guidance) => guidance.glow > 0 || guidance.demo !== null).length, 'frames on which the ladder showed something').toBe(0)

    // Once the hand is off the glass the ladder climbs as it would from any touch.
    game.pointer('pointerup', 1, 200, 40)
    shown.length = 0
    frames.run(framesPast)
    expect(shown.some((guidance) => guidance.glow > 0)).toBe(true)
    expect(shown.some((guidance) => guidance.demo !== null)).toBe(true)
  })

  it('sizes its canvas from its own element, and keeps the last size when it measures 0×0', () => {
    const game = open(frames)
    expect([game.canvas.width, game.canvas.height]).toEqual([800, 600])
    size = { width: 1024, height: 700 }
    resized()
    expect([game.canvas.width, game.canvas.height]).toEqual([1024, 700])
    size = { width: 0, height: 0 }
    resized()
    expect([game.canvas.width, game.canvas.height]).toEqual([1024, 700])
  })

  it('applies the tier it starts on before its first frame, attended or not', () => {
    expect(open(frames, false).canvas.dataset.tier).toBe('0')
    expect(frames.pending.size).toBe(0)
    cleanup()
    // A touch device starts one tier down.
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    expect(open(frames, false).canvas.dataset.tier).toBe('1')
    cleanup()
    // A tier pinned in the address is applied the same way.
    address('?tier=3')
    expect(open(frames, false).canvas.dataset.tier).toBe('3')
  })

  it('applies a tier the governor steps to on a display of ratio 1, where the surface is not sized again', () => {
    const game = open(frames)
    // The first frame after waking has no interval, so the governor judges from the second.
    frames.run(1)
    const sized = sizings(game.canvas)
    stepTo(2)
    frames.run(1)
    expect(game.canvas.dataset.tier).toBe('2')
    // Every tier's pixel ratio cap is at or over 1: the ratio in use did not change, and nothing was resized.
    expect(sized).toEqual([])
    expect([game.canvas.width, game.canvas.height]).toEqual([800, 600])
    // A step back up is applied as well.
    frames.run(1)
    stepTo(0)
    frames.run(1)
    expect(game.canvas.dataset.tier).toBe('0')
  })

  it('applies a tier before it sizes the surface for that tier\'s pixel ratio', () => {
    vi.stubGlobal('devicePixelRatio', 2)
    const game = open(frames)
    expect([game.canvas.width, game.canvas.height]).toEqual([1600, 1200])
    frames.run(1)
    const sized = sizings(game.canvas)
    stepTo(1)
    frames.run(1)
    expect(sized).toEqual(['1200 wide at tier 1'])
    expect(game.canvas.height).toBe(900)
  })

  it('draws once itself when the slot has been read, since a resting or parked game has no frame coming', () => {
    // The blank surface draws nothing, so a draw cannot be seen from outside. What is held here is the wiring,
    // read from the source: the load's callback sets the state and its last act is a draw.
    const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../templates/cartridge/game.tsx'), 'utf8')
    const callback = /\.load<unknown>\(\)[^\n]*\.then\(\(value\) => \{\n([\s\S]*?)\n {4}\}\)\n/.exec(source)?.[1] ?? ''
    const code = callback.split('\n').map((line) => line.trim()).filter((line) => line !== '' && !line.startsWith('//'))
    expect(code[0]).toBe('if (disposed) return')
    expect(code.some((line) => line.startsWith('state = deserialize('))).toBe(true)
    expect(code.at(-1)).toBe('draw()')
    expect(code.filter((line) => line === 'draw()')).toHaveLength(1)
  })

  /** A quick tap by one pointer: down and up in the same place. */
  const tapAt = (game: ReturnType<typeof open>, x: number, y: number, id = 1): void => {
    game.pointer('pointerdown', id, x, y)
    game.pointer('pointerup', id, x, y)
  }

  it('opens the grown-up overlay on a finger held a second in its top right corner and lifted there, then three taps, and feeds it every frame', () => {
    const game = open(frames)
    const box = overlayOf(game.root)!
    expect(box.style.display).toBe('none')
    frames.run(3, 20)
    expect(box.textContent).toBe('')
    // A touch in the corner is still a touch: the game gets it too.
    game.pointer('pointerdown', 1, 790, 10)
    frames.run(50, 20)
    game.pointer('pointerup', 1, 790, 10)
    for (let tap = 0; tap < 3; tap++) {
      expect(box.style.display).toBe('none')
      tapAt(game, 790, 10)
    }
    expect(types()).toEqual(['press', 'tap', 'press', 'tap', 'press', 'tap', 'press', 'tap'])
    expect(box.style.display).toBe('block')
    frames.run(2, 20)
    expect(box.textContent).toContain('50 fps')
    expect(box.textContent).toContain(`tier ${game.canvas.dataset.tier}`)
    // Three taps anywhere else leave it as it is.
    for (let tap = 0; tap < 3; tap++) tapAt(game, 400, 300)
    expect(box.style.display).toBe('block')
  })

  it('counts only the working finger towards the overlay: a second finger tapping beside a hold undoes nothing, and its taps are none of the three', () => {
    const game = open(frames)
    const box = overlayOf(game.root)!
    // Pointer 1 holds the corner for a second while pointer 2 taps in the middle of the surface and in the corner.
    game.pointer('pointerdown', 1, 790, 10)
    frames.run(20, 20)
    tapAt(game, 400, 300, 2)
    frames.run(10, 20)
    tapAt(game, 780, 20, 2)
    frames.run(20, 20)
    game.pointer('pointerup', 1, 790, 10)
    // Two taps by pointer 1, each with a tap by pointer 2 inside it: counted, those would make three too soon.
    for (let tap = 0; tap < 2; tap++) {
      game.pointer('pointerdown', 1, 790, 10)
      tapAt(game, 780, 20, 2)
      game.pointer('pointerup', 1, 790, 10)
      expect(box.style.display).toBe('none')
    }
    tapAt(game, 790, 10)
    expect(box.style.display).toBe('block')
    // The tracker gave the second finger nothing either.
    expect(types()).toEqual(['press', 'tap', 'press', 'tap', 'press', 'tap', 'press', 'tap'])
  })

  it.each([
    ['the game is parked under it and comes back', (game: ReturnType<typeof open>) => { game.attend(false); game.attend(true) }],
    ['the browser takes the finger away', (game: ReturnType<typeof open>) => game.pointer('pointercancel', 1, 790, 10)],
    ['the finger leaves the corner and comes back to it', (game: ReturnType<typeof open>) => { game.pointer('pointermove', 1, 400, 300); frames.run(50, 20); game.pointer('pointermove', 1, 790, 10) }],
  ])('does not take a touch in the corner for the overlay\'s hold when %s', (_, interrupt) => {
    const game = open(frames)
    const box = overlayOf(game.root)!
    game.pointer('pointerdown', 1, 790, 10)
    frames.run(50, 20)
    interrupt(game)
    game.pointer('pointerup', 1, 790, 10)
    for (let tap = 0; tap < 3; tap++) {
      frames.run(5, 20)
      tapAt(game, 790, 10)
      expect(box.style.display).toBe('none')
    }
    // Nothing is left over from it: the whole gesture, made afterwards, opens the overlay.
    frames.run(200, 20)
    game.pointer('pointerdown', 1, 790, 10)
    frames.run(50, 20)
    game.pointer('pointerup', 1, 790, 10)
    for (let tap = 0; tap < 3; tap++) tapAt(game, 790, 10)
    expect(box.style.display).toBe('block')
  })

  it('opens the grown-up overlay from the start with fps=1 in the address', () => {
    address('?fps=1')
    expect(overlayOf(open(frames).root)!.style.display).toBe('block')
  })

  it('ends the touch, saves, and leaves nothing behind when it is unmounted', async () => {
    const game = open(frames)
    await game.loaded(null)
    game.pointer('pointerdown')
    game.pointer('pointermove', 1, 200, 40)
    expect(window.__jamPerf).toBeDefined()
    expect(overlayOf(game.root)).not.toBeNull()
    const clear = vi.mocked(ForgivingTouch.prototype.clear)
    const settle = vi.mocked(SaveCadence.prototype.settle)

    expect(() => game.unmount()).not.toThrow()
    // The finger never let go, so the drag is cancelled and not dropped: the thing in hand goes back before the
    // last save, as on a put-away.
    expect(types()).toEqual(['press', 'dragStart', 'dragMove', 'dragCancel'])
    expect(game.storage.save).toHaveBeenCalledTimes(1)
    expect(clear.mock.invocationCallOrder.at(-1)!).toBeLessThan(settle.mock.invocationCallOrder.at(-1)!)
    expect(window.__jamPerf).toBeUndefined()
    expect(overlayOf(game.root)).toBeNull()
    expect(frames.pending.size).toBe(0)
    expect(observers).toEqual([{ disconnected: true }])

    // The surface no longer listens: a touch on it reaches nothing.
    gestures.length = 0
    const down = vi.mocked(ForgivingTouch.prototype.down)
    const calls = down.mock.calls.length
    game.pointer('pointerdown', 2)
    game.pointer('pointermove', 2, 300, 40)
    game.pointer('pointerup', 2, 300, 40)
    game.pointer('pointercancel', 2)
    expect(down.mock.calls.length).toBe(calls)
    expect(types()).toEqual([])
  })

  it('ignores a slot that is read after it was unmounted', async () => {
    const game = open(frames)
    game.unmount()
    await game.loaded(SAVED)
    expect(deserialize).not.toHaveBeenCalled()
    expect(game.storage.save).not.toHaveBeenCalled()
  })
})

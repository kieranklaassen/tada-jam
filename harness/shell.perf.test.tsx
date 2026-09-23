// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CartridgeContext, JamGame } from './contract'
import { JamShell } from './JamShell'
import { createJamStorage, memoryBackend, slotKey } from './storage'

// The shell must cost a game nothing per frame: saving is on a game's hot
// path (some save every frame), and the shell must not re-render the game or
// itself while it plays. Counted, not timed, so a busy runner cannot fail it.

const FRAMES = 600
const FRAME_MS = 16

describe('storage on the hot path', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('a save every frame serializes nothing, writes nothing and arms one timer; one write follows the quiet stretch', () => {
    const backend = memoryBackend()
    const write = vi.spyOn(backend, 'write')
    const storage = createJamStorage('demo', { permitted: true, backend })
    const stringify = vi.spyOn(JSON, 'stringify')
    const timers = vi.spyOn(globalThis, 'setTimeout')
    for (let frame = 0; frame < FRAMES; frame++) {
      storage.save({ frame, stones: Array.from({ length: 40 }, (_, i) => ({ id: i, x: frame + i })) })
      vi.advanceTimersByTime(FRAME_MS)
    }
    expect(stringify, 'serializations during play').not.toHaveBeenCalled()
    expect(write, 'writes during play').not.toHaveBeenCalled()
    // Re-arming for the rest of the quiet period happens once per debounce interval, not once per save.
    expect(timers.mock.calls.length, 'timers armed over 600 saves').toBeLessThanOrEqual(Math.ceil((FRAMES * FRAME_MS) / 2000) + 1)
    vi.advanceTimersByTime(2000)
    expect(write).toHaveBeenCalledTimes(1)
    expect(JSON.parse(backend.data.get(slotKey('demo'))!).frame).toBe(FRAMES - 1)
  })
})

describe('the shell during play', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.clear()
    window.location.hash = ''
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('never re-renders the game or writes storage while a game saves every frame', async () => {
    let renders = 0
    let context: CartridgeContext | null = null
    const dummy: JamGame = {
      emoji: '🧪',
      cartridge: {
        manifest: { key: 'shell-probe', name: 'Shell probe', ageBand: [4, 8], permissions: ['storage'] },
        Mount: ({ ctx }) => {
          renders += 1
          context = ctx
          return <div data-probe />
        },
      },
    }
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    render(<JamShell game={dummy} onExit={() => {}} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(context, 'the game mounted').not.toBeNull()
    const rendersAtStart = renders
    const writesAtStart = setItem.mock.calls.length
    await act(async () => {
      for (let frame = 0; frame < FRAMES; frame++) {
        context!.storage.save({ frame })
        await vi.advanceTimersByTimeAsync(FRAME_MS)
      }
    })
    expect(renders - rendersAtStart, 'game re-renders caused by the shell during play').toBe(0)
    expect(setItem.mock.calls.length - writesAtStart, 'storage writes during play').toBe(0)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(setItem.mock.calls.length - writesAtStart, 'one write after the quiet stretch').toBe(1)
  })
})

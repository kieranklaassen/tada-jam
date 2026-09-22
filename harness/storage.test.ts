import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createJamStorage, memoryBackend, slotKey, STATE_CAP_BYTES } from './storage'

describe('createJamStorage', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns null on first run', async () => {
    const storage = createJamStorage('demo', { permitted: true, backend: memoryBackend() })
    expect(await storage.load()).toBeNull()
  })

  it('debounces saves and persists only the newest state', async () => {
    const backend = memoryBackend()
    const storage = createJamStorage('demo', { permitted: true, backend, debounceMs: 2000 })
    storage.save({ n: 1 })
    storage.save({ n: 2 })
    expect(backend.data.size).toBe(0)
    vi.advanceTimersByTime(1999)
    expect(backend.data.size).toBe(0)
    vi.advanceTimersByTime(1)
    expect(JSON.parse(backend.data.get(slotKey('demo'))!)).toEqual({ n: 2 })
  })

  it('answers load from the cache immediately after a save', async () => {
    const storage = createJamStorage('demo', { permitted: true, backend: memoryBackend() })
    storage.save({ n: 3 })
    expect(await storage.load()).toEqual({ n: 3 })
  })

  it('flush writes the pending state now', async () => {
    const backend = memoryBackend()
    const storage = createJamStorage('demo', { permitted: true, backend })
    storage.save({ n: 4 })
    expect(storage.hasPending()).toBe(true)
    await storage.flush()
    expect(storage.hasPending()).toBe(false)
    expect(JSON.parse(backend.data.get(slotKey('demo'))!)).toEqual({ n: 4 })
  })

  it('survives a reload through the backend', async () => {
    const backend = memoryBackend()
    const first = createJamStorage('demo', { permitted: true, backend })
    first.save({ table: 'kept' })
    await first.flush()
    const second = createJamStorage('demo', { permitted: true, backend })
    expect(await second.load()).toEqual({ table: 'kept' })
  })

  it('refuses state over the 64 KB cap like the server does', async () => {
    const backend = memoryBackend()
    const log = vi.fn()
    const storage = createJamStorage('demo', { permitted: true, backend, log })
    storage.save({ blob: 'x'.repeat(STATE_CAP_BYTES) })
    await storage.flush()
    expect(backend.data.size).toBe(0)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('64 KB'))
  })

  it('is inert without the storage permission', async () => {
    const backend = memoryBackend()
    const storage = createJamStorage('demo', { permitted: false, backend })
    storage.save({ n: 1 })
    await storage.flush()
    expect(await storage.load()).toBeNull()
    expect(backend.data.size).toBe(0)
  })

  it('treats a corrupt slot as a first run', async () => {
    const backend = memoryBackend()
    backend.write(slotKey('demo'), '{not json')
    const storage = createJamStorage('demo', { permitted: true, backend })
    expect(await storage.load()).toBeNull()
  })

  it('reset forgets the slot', async () => {
    const backend = memoryBackend()
    const storage = createJamStorage('demo', { permitted: true, backend })
    storage.save({ n: 1 })
    await storage.flush()
    storage.reset()
    expect(backend.data.size).toBe(0)
    expect(await storage.load()).toBeNull()
  })
})

import type { CartridgeStorage } from './contract'

// The jam's stand-in for Tada's server storage (app/frontend/kid/storage.ts):
// one slot per app key, save() debounced ~2 s with newest-wins, flush() sends
// now, load() answers from a local cache after the first read, and the 64 KB
// cap is enforced the way the server enforces it (the write is refused).
// "The server" here is the harness's own localStorage; games never touch it.
//
// save() is on a game's hot path (some save every frame), so it only records
// the state: no serialization, no write, and at most one timer armed at a
// time. Serializing and writing happen once per quiet stretch, in an idle
// callback where the browser has one.

export const DEBOUNCE_MS = 2000
export const STATE_CAP_BYTES = 64 * 1024

export type SlotBackend = {
  read(key: string): string | null
  write(key: string, value: string): void
  remove(key: string): void
}

export type JamStorage = CartridgeStorage & {
  /** Harness-only: forget the slot, as if the child had never played. */
  reset(): void
  /** Harness-only: whether a save is waiting for the debounce timer. */
  hasPending(): boolean
}

type Options = {
  permitted: boolean
  backend?: SlotBackend
  debounceMs?: number
  log?: (message: string, detail?: unknown) => void
  /** Clock in ms, for the debounce's quiet period. */
  now?: () => number
}

type IdleWindow = { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (handle: number) => void }

/** Longest an idle write may wait for an idle moment before it runs anyway. */
const IDLE_TIMEOUT_MS = 1000

const NOTHING = Symbol('nothing')

export function slotKey(appKey: string): string {
  return `tada-jam:slot:${appKey}`
}

export function memoryBackend(): SlotBackend & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    read: (key) => data.get(key) ?? null,
    write: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  }
}

export function browserBackend(): SlotBackend {
  return {
    read: (key) => window.localStorage.getItem(key),
    write: (key, value) => window.localStorage.setItem(key, value),
    remove: (key) => window.localStorage.removeItem(key),
  }
}

export function createJamStorage(appKey: string, options: Options): JamStorage {
  const backend = options.backend ?? browserBackend()
  const debounceMs = options.debounceMs ?? DEBOUNCE_MS
  const log = options.log ?? (() => {})
  const now = options.now ?? (() => Date.now())
  const key = slotKey(appKey)
  const idle = (typeof window === 'undefined' ? {} : window) as IdleWindow

  let loaded = false
  let cache: unknown = null
  let pending: unknown = NOTHING
  let lastSave = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let idleHandle: number | null = null

  function cancel(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
    if (idleHandle !== null) idle.cancelIdleCallback?.(idleHandle)
    idleHandle = null
  }

  /** The debounce timer: persist once the saves have been quiet for debounceMs, re-arming for whatever is left. */
  function onTimer(): void {
    timer = null
    const quiet = now() - lastSave
    if (quiet < debounceMs) {
      timer = setTimeout(onTimer, debounceMs - quiet)
      return
    }
    if (idle.requestIdleCallback) {
      idleHandle = idle.requestIdleCallback(() => {
        idleHandle = null
        persist()
      }, { timeout: IDLE_TIMEOUT_MS })
    } else persist()
  }

  function persist(): void {
    cancel()
    if (pending === NOTHING) return
    const state = pending
    pending = NOTHING
    let encoded: string
    try {
      encoded = JSON.stringify(state)
    } catch (error) {
      log(`save refused for "${appKey}": state is not JSON-serializable`, error)
      return
    }
    const bytes = new TextEncoder().encode(encoded).length
    if (bytes > STATE_CAP_BYTES) {
      log(`save refused for "${appKey}": ${bytes} bytes exceeds the 64 KB cap (HTTP 413 in Tada)`)
      return
    }
    backend.write(key, encoded)
    log(`persisted "${appKey}" (${bytes} bytes)`)
  }

  if (!options.permitted) {
    return {
      load: () => Promise.resolve(null),
      save: () => {},
      flush: () => Promise.resolve(),
      reset: () => {},
      hasPending: () => false,
    }
  }

  return {
    load<T>(): Promise<T | null> {
      if (!loaded) {
        loaded = true
        const raw = backend.read(key)
        if (raw !== null) {
          try {
            cache = JSON.parse(raw)
          } catch {
            cache = null
          }
        }
      }
      return Promise.resolve(cache as T | null)
    },
    save(state: unknown): void {
      loaded = true
      cache = state
      pending = state
      lastSave = now()
      if (timer === null && idleHandle === null) timer = setTimeout(onTimer, debounceMs)
    },
    flush(): Promise<void> {
      persist()
      return Promise.resolve()
    },
    reset(): void {
      cancel()
      pending = NOTHING
      cache = null
      loaded = true
      backend.remove(key)
    },
    hasPending: () => pending !== NOTHING,
  }
}

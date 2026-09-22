import type { CartridgeStorage } from './contract'

// The jam's stand-in for Tada's server storage (app/frontend/kid/storage.ts):
// one slot per app key, save() debounced ~2 s with newest-wins, flush() sends
// now, load() answers from a local cache after the first read, and the 64 KB
// cap is enforced the way the server enforces it (the write is refused).
// "The server" here is the harness's own localStorage; games never touch it.

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
}

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
  const key = slotKey(appKey)

  let loaded = false
  let cache: unknown = null
  let pending: unknown = NOTHING
  let timer: ReturnType<typeof setTimeout> | null = null

  function persist(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
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
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(persist, debounceMs)
    },
    flush(): Promise<void> {
      persist()
      return Promise.resolve()
    },
    reset(): void {
      if (timer !== null) clearTimeout(timer)
      timer = null
      pending = NOTHING
      cache = null
      loaded = true
      backend.remove(key)
    },
    hasPending: () => pending !== NOTHING,
  }
}

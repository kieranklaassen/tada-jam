import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CartridgeBoundary } from './CartridgeBoundary'
import type { CartridgeContext, CartridgeStatus, JamGame } from './contract'
import { PortraitOverlay } from './PortraitOverlay'
import { createJamStorage } from './storage'

// A thin stand-in for the Tada kid shell: builds a CartridgeContext, owns the
// loading -> ready lifecycle, flushes storage on park / pagehide / hidden,
// toggles attention, contains crashes, and covers portrait. Grown-up dev
// controls sit in a strip above the game surface and can be hidden
// (or start hidden with ?chrome=0) for full-bleed play and screenshots.

const THEMES: Record<string, Record<string, string>> = {
  meadow: {
    '--color-surface': '#f1f8e6',
    '--color-ink': '#2d4520',
    '--color-accent': '#6aa336',
    '--radius-chip': '0.5rem',
    '--wallpaper': 'linear-gradient(180deg, #d3eef8 0%, #ecf8dc 60%, #c4e6a0 100%)',
  },
  boring: {
    '--color-surface': '#f4f4f2',
    '--color-ink': '#1d1b19',
    '--color-accent': '#5a5550',
    '--radius-chip': '0.5rem',
    '--wallpaper': 'none',
  },
}

const AGES: readonly (number | null)[] = [null, 3, 4, 5, 6, 7, 8]
const LANGUAGES = ['en', 'nl', 'fr'] as const

type Prefs = { childAge: number | null; language: string; theme: string }

const PREFS_KEY = 'tada-jam:prefs'

function readPrefs(): Prefs {
  const fallback: Prefs = { childAge: 4, language: 'en', theme: 'meadow' }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null') as Partial<Prefs> | null
    if (!parsed) return fallback
    return {
      childAge: typeof parsed.childAge === 'number' || parsed.childAge === null ? parsed.childAge : fallback.childAge,
      language: typeof parsed.language === 'string' ? parsed.language : fallback.language,
      theme: typeof parsed.theme === 'string' && parsed.theme in THEMES ? parsed.theme : fallback.theme,
    }
  } catch {
    return fallback
  }
}

function initialChromeVisible(): boolean {
  return new URLSearchParams(window.location.search).get('chrome') !== '0'
}

export function JamShell({ game, onExit }: { game: JamGame; onExit: () => void }) {
  const { manifest, Mount } = game.cartridge
  const [prefs, setPrefs] = useState<Prefs>(readPrefs)
  const [attended, setAttended] = useState(true)
  const [parked, setParked] = useState(false)
  const [status, setStatus] = useState<CartridgeStatus>('loading')
  const [chrome, setChrome] = useState(initialChromeVisible)
  const [openCount, setOpenCount] = useState(0)

  const storage = useMemo(
    () =>
      createJamStorage(manifest.key, {
        permitted: manifest.permissions.includes('storage'),
        log: (message, detail) => console.info(`[jam-shell] ${message}`, detail ?? ''),
      }),
    [manifest],
  )

  useEffect(() => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  }, [prefs])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    storage.load().then(
      () => !cancelled && setStatus('ready'),
      () => !cancelled && setStatus('error'),
    )
    return () => {
      cancelled = true
    }
  }, [storage, openCount])

  useEffect(() => {
    const flush = () => void storage.flush()
    const onVisibility = () => document.visibilityState === 'hidden' && flush()
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      flush()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [storage])

  const ctx: CartridgeContext = useMemo(
    () => ({
      childNickname: 'Kaia',
      childAge: prefs.childAge,
      language: prefs.language,
      childCountry: prefs.language === 'nl' ? 'nl' : null,
      childClass: null,
      theme: prefs.theme,
      status,
      storage,
      attention: { attended: attended && !parked },
    }),
    [prefs, status, storage, attended, parked],
  )

  const park = () => {
    void storage.flush()
    setParked(true)
  }

  // Changing the child's age or language is a fresh open in Tada, so remount.
  const reopen = (next: Partial<Prefs>) => {
    void storage.flush()
    setPrefs((current) => ({ ...current, ...next }))
    setOpenCount((count) => count + 1)
  }

  const resetSlot = () => {
    storage.reset()
    setOpenCount((count) => count + 1)
  }

  return (
    <div className="jam-shell" data-theme={prefs.theme} style={THEMES[prefs.theme] as CSSProperties}>
      {chrome ? (
        <div className="jam-toolbar" role="toolbar" aria-label="Harness controls">
          <button type="button" onClick={onExit}>
            ← Games
          </button>
          <strong>{manifest.name}</strong>
          <label>
            Age
            <select
              value={prefs.childAge === null ? '' : String(prefs.childAge)}
              onChange={(event) => reopen({ childAge: event.target.value === '' ? null : Number(event.target.value) })}
            >
              {AGES.map((age) => (
                <option key={String(age)} value={age === null ? '' : String(age)}>
                  {age === null ? 'unset' : age}
                </option>
              ))}
            </select>
          </label>
          <label>
            Language
            <select value={prefs.language} onChange={(event) => reopen({ language: event.target.value })}>
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label>
            Theme
            <select value={prefs.theme} onChange={(event) => setPrefs((p) => ({ ...p, theme: event.target.value }))}>
              {Object.keys(THEMES).map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input type="checkbox" checked={attended} onChange={(event) => setAttended(event.target.checked)} />
            Attended
          </label>
          {parked ? (
            <button type="button" onClick={() => setParked(false)}>
              Bring back
            </button>
          ) : (
            <button type="button" onClick={park}>
              Park
            </button>
          )}
          <button type="button" onClick={resetSlot} title="Forget this game's saved state">
            Reset slot
          </button>
          <span className="jam-spacer" />
          <button type="button" onClick={() => setChrome(false)} title="Hide controls (tap the corner dot to show)">
            Hide
          </button>
        </div>
      ) : (
        <button type="button" className="jam-chrome-dot" aria-label="Show harness controls" onClick={() => setChrome(true)} />
      )}
      <div className="jam-surface">
        {status === 'loading' && <div className="jam-loading" />}
        {status === 'error' && (
          <div className="jam-error">
            <button type="button" onClick={() => setOpenCount((count) => count + 1)}>
              Try again
            </button>
          </div>
        )}
        {status === 'ready' && (
          <div className="jam-mount" style={{ display: parked ? 'none' : 'block' }}>
            <CartridgeBoundary key={openCount} onPark={park} onCrash={(error) => console.error('[jam-shell] crash', error)}>
              <Mount ctx={ctx} />
            </CartridgeBoundary>
          </div>
        )}
        {parked && (
          <div className="jam-plank">
            <button type="button" onClick={() => setParked(false)}>
              {game.emoji} Bring back
            </button>
          </div>
        )}
      </div>
      <PortraitOverlay />
    </div>
  )
}

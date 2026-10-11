import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CartridgeBoundary } from './CartridgeBoundary'
import { CornerControl } from './CornerControl'
import type { CartridgeContext, CartridgeStatus, JamGame } from './contract'
import { PortraitOverlay } from './PortraitOverlay'
import { AGES, readPrefs, writePrefs, type Prefs } from './prefs'
import { createJamStorage } from './storage'

// A thin stand-in for the Tada kid shell: builds a CartridgeContext, owns the
// loading -> ready lifecycle, flushes storage on park / pagehide / hidden,
// toggles attention, contains crashes, and covers portrait. A game opens full
// bleed under one corner control: a tap goes home, and a held finger shows the
// grown-up dev controls in a strip above the surface (so does ?chrome=1).

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

const LANGUAGES = ['en', 'nl', 'fr'] as const

// chrome=1 opens with the strip; chrome=0 draws nothing at all over the surface
// (the probes and the audits measure the game alone); otherwise the corner
// control is the only thing over the game.
type Chrome = 'strip' | 'corner' | 'bare'
function initialChrome(): Chrome {
  const asked = new URLSearchParams(window.location.search).get('chrome')
  return asked === '1' ? 'strip' : asked === '0' ? 'bare' : 'corner'
}

export function JamShell({ game, onExit }: { game: JamGame; onExit: () => void }) {
  const { manifest, Mount } = game.cartridge
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs(Object.keys(THEMES)))
  const [attended, setAttended] = useState(true)
  const [parked, setParked] = useState(false)
  const [status, setStatus] = useState<CartridgeStatus>('loading')
  const [chrome, setChrome] = useState<Chrome>(initialChrome)
  // Forgetting a save takes two taps, so a hand that found the strip by accident loses nothing.
  const [resetArmed, setResetArmed] = useState(false)
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
    writePrefs(prefs)
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
    if (!resetArmed) {
      setResetArmed(true)
      return
    }
    setResetArmed(false)
    storage.reset()
    setOpenCount((count) => count + 1)
  }
  useEffect(() => {
    if (!resetArmed) return
    const timer = window.setTimeout(() => setResetArmed(false), 3000)
    return () => window.clearTimeout(timer)
  }, [resetArmed])

  return (
    <div className="jam-shell" data-theme={prefs.theme} style={THEMES[prefs.theme] as CSSProperties}>
      {chrome === 'strip' ? (
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
            {resetArmed ? 'Tap again to reset' : 'Reset slot'}
          </button>
          <span className="jam-spacer" />
          <button type="button" onClick={() => setChrome('corner')} title="Hide controls (hold the corner control to show)">
            Hide
          </button>
        </div>
      ) : chrome === 'corner' ? (
        <CornerControl onHome={onExit} onHold={() => setChrome('strip')} holdLabel="Hold for grown-up controls" />
      ) : null}
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

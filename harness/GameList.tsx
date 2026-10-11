import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import '@fontsource/albert-sans/400.css'
import '@fontsource/albert-sans/500.css'
import '@fontsource/albert-sans/600.css'
import '@fontsource/albert-sans/700.css'
import foxLandscape from './assets/fox-landscape.webp'
import tadaMark from './assets/tada-mark.svg'
import yourApp from './assets/your-app.svg'
import type { JamGame, JamShowcase } from './contract'
import { DemoShelf } from './DemoShelf'
import { AGES, readPrefs, writePrefs } from './prefs'
import { Tile } from './Tile'
import './home.css'

// The jam's home page, after the tada.computer landing hero (Figma
// "Landing" › landing_kid › hero): a cream frame, the fox landscape along the
// bottom, and the games as glossy app tiles, with the demos as tiles of the
// same kind below them. Everything enters in a short choreographed sequence;
// reduced motion shows the finished page at once.

const HEADLINE = "Tiny games your kids can't break. Build together"

const bandOf = (game: JamGame) => game.cartridge.manifest.ageBand
const ages = (band: readonly [number, number]) => `ages ${band[0]}–${band[1]}`

/** The games made for the child's age first, then the rest; each part by name, as given. */
export function orderForAge(games: readonly JamGame[], age: number | null): JamGame[] {
  if (age === null) return [...games]
  const fits = (game: JamGame) => bandOf(game)[0] <= age && age <= bandOf(game)[1]
  return [...games.filter(fits), ...games.filter((game) => !fits(game))]
}

/** Two crossing arrows: a child who cannot read the button still sees it picks something for them. */
function ShuffleIcon() {
  return (
    <svg className="home-cta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h3.5c2.2 0 3.6 1.2 4.8 3.2l1.4 2.6c1.2 2 2.6 3.2 4.8 3.2H21" />
      <path d="M3 17h3.5c1.3 0 2.3-.4 3.1-1.2M14.4 8.2c.8-.8 1.8-1.2 3.1-1.2H21" />
      <path d="m18 4 3 3-3 3M18 14l3 3-3 3" />
    </svg>
  )
}

export function GameList({ games: allGames, showcases = [], onPick, onPickDemo }: { games: readonly JamGame[]; showcases?: readonly JamShowcase[]; onPick: (key: string) => void; onPickDemo: (key: string) => void }) {
  const [surprise, setSurprise] = useState<number | null>(null)
  const [childAge, setChildAge] = useState(() => readPrefs().childAge)
  const games = useMemo(() => orderForAge(allGames, childAge), [allGames, childAge])
  const gameKeys = useMemo(() => new Set(allGames.map((game) => game.cartridge.manifest.key)), [allGames])
  // How many of the first tiles are made for the child's age: "Surprise me" picks among those.
  const fitting = childAge === null ? games.length : games.filter((game) => bandOf(game)[0] <= childAge && childAge <= bandOf(game)[1]).length

  const chooseAge = (value: string) => {
    const next = value === '' ? null : Number(value)
    setChildAge(next)
    setSurprise(null)
    // The strip above a game may have set the language or theme since this page read them.
    writePrefs({ ...readPrefs(['meadow', 'boring']), childAge: next })
  }
  const frameRef = useRef<HTMLDivElement>(null)

  // The landscape drifts a touch against the pointer, like looking through a window.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const move = (event: globalThis.PointerEvent) => {
      const rect = frame.getBoundingClientRect()
      frame.style.setProperty('--drift', String((event.clientX - rect.left) / rect.width - 0.5))
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])

  const surpriseMe = () => {
    if (!games.length || surprise !== null) return
    setSurprise(Math.floor(Math.random() * (fitting || games.length)))
  }

  return (
    <div className="home">
      <div className="home-frame" ref={frameRef}>
        <header className="home-logo" aria-label="tada.computer jam">
          <img src={tadaMark} alt="" width={34.5443} height={30.0405} />
          <span>tada.computer</span>
          <span className="home-logo-jam">jam</span>
        </header>

        <main className="home-main">
          <p className="home-eyebrow">Tada Jam</p>
          <h1 className="home-title" aria-label={HEADLINE}>
            {HEADLINE.split(' ').map((word, i) => (
              <span key={i} className="home-word" style={{ '--w': i } as CSSProperties} aria-hidden>
                {word}
              </span>
            ))}
          </h1>
          <p className="home-lede">Experimental Tada cartridges made in the jam.</p>

          <label className="home-age">
            Playing today, age
            <select value={childAge === null ? '' : String(childAge)} onChange={(event) => chooseAge(event.target.value)}>
              {AGES.map((age) => (
                <option key={String(age)} value={age === null ? '' : String(age)}>
                  {age === null ? 'any' : age}
                </option>
              ))}
            </select>
          </label>

          <ul className={`home-dock${surprise !== null ? ' is-choosing' : ''}`} aria-label="Games">
            {games.map((game, i) => (
              <Tile key={game.cartridge.manifest.key} id={game.cartridge.manifest.key} name={game.cartridge.manifest.name} emoji={game.emoji} art={game.tile} caption={ages(bandOf(game))} index={i} chosen={surprise === i} onPick={onPick} />
            ))}
            <li className="home-tile-slot" style={{ '--i': games.length } as CSSProperties} aria-hidden>
              <span className="home-tile home-tile-yours">
                <img src={yourApp} alt="" width={80} height={80} className="home-tile-dashed" />
                <span className="home-tile-name">Your game</span>
                <span className="home-tile-age">add a folder</span>
              </span>
            </li>
          </ul>

          {showcases.length > 0 && (
            <section className="home-showcases" aria-label="Showcases">
              <p className="home-showcases-label">Showcase · not a Tada cartridge</p>
              <ul className="home-dock home-dock-showcase">
                {showcases.map((showcase, i) => (
                  <Tile key={showcase.cartridge.manifest.key} id={showcase.cartridge.manifest.key} name={showcase.cartridge.manifest.name} emoji={showcase.emoji} art={showcase.tile} caption={ages(bandOf(showcase))} pill={showcase.requires} index={games.length + 1 + i} onPick={onPick} />
                ))}
              </ul>
            </section>
          )}

          {games.length > 0 && (
            <button type="button" className="home-cta" onClick={surpriseMe}>
              <ShuffleIcon />
              Surprise me
            </button>
          )}

          <DemoShelf gameKeys={gameKeys} onPick={onPickDemo} />

        </main>

        <div className="home-landscape" aria-hidden>
          <img src={foxLandscape} alt="" draggable={false} />
        </div>
      </div>
    </div>
  )
}

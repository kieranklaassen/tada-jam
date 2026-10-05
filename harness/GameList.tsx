import { Fragment, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import '@fontsource/albert-sans/400.css'
import '@fontsource/albert-sans/500.css'
import '@fontsource/albert-sans/600.css'
import '@fontsource/albert-sans/700.css'
import foxLandscape from './assets/fox-landscape.webp'
import tadaMark from './assets/tada-mark.svg'
import type { JamGame, JamShowcase } from './contract'
import { DemoShelf } from './DemoShelf'
import { fallbackColours } from './home-tiles'
import './home.css'

// The jam's home page, after the tada.computer landing hero (Figma
// "Landing" › landing_kid › hero): a cream frame, the fox landscape along the
// bottom, and the games as glossy app tiles. Everything enters in a short
// choreographed sequence; reduced motion shows the finished page at once.

const HEADLINE = 'Little worlds. Big imaginations.'
const LAUNCH_MS = 420

function Tile({ game, index, requires, onPick }: { game: JamGame; index: number; requires?: string; onPick: (key: string) => void }) {
  const { cartridge, emoji, tile } = game
  const ref = useRef<HTMLButtonElement>(null)
  const [launching, setLaunching] = useState(false)

  // The tile leans towards the finger and its gloss follows it.
  const lean = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height
    event.currentTarget.style.setProperty('--tilt-x', `${(0.5 - y) * 16}deg`)
    event.currentTarget.style.setProperty('--tilt-y', `${(x - 0.5) * 16}deg`)
    event.currentTarget.style.setProperty('--gloss-x', `${x * 100}%`)
    event.currentTarget.style.setProperty('--gloss-y', `${y * 100}%`)
  }
  const settle = () => {
    ref.current?.style.setProperty('--tilt-x', '0deg')
    ref.current?.style.setProperty('--tilt-y', '0deg')
  }
  const launch = () => {
    if (launching) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { onPick(cartridge.manifest.key); return }
    setLaunching(true)
    window.setTimeout(() => onPick(cartridge.manifest.key), LAUNCH_MS)
  }
  const [from, to] = tile ? [tile.from, tile.to] : fallbackColours(cartridge.manifest.key)
  const face: CSSProperties = { backgroundImage: `linear-gradient(45deg, ${from} 0%, ${to} 83%)` }
  return (
    <li className="home-tile-slot" style={{ '--i': index } as CSSProperties}>
      <button
        ref={ref}
        type="button"
        className={`home-tile${launching ? ' is-launching' : ''}`}
        onPointerMove={lean}
        onPointerLeave={settle}
        onPointerCancel={settle}
        onClick={launch}
      >
        <span className="home-tile-face" style={face}>
          {tile ? <img src={tile.art} alt="" draggable={false} /> : <span className="home-tile-emoji" aria-hidden>{emoji}</span>}
          <span className="home-tile-gloss" aria-hidden />
        </span>
        <span className="home-tile-name">{cartridge.manifest.name}</span>
        {requires ? (
          <span className="home-tile-requires">{requires}</span>
        ) : (
          <span className="home-tile-age">ages {cartridge.manifest.ageBand[0]}–{cartridge.manifest.ageBand[1]}</span>
        )}
      </button>
    </li>
  )
}

export function GameList({ games, showcases = [], onPick }: { games: readonly JamGame[]; showcases?: readonly JamShowcase[]; onPick: (key: string) => void }) {
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
              <Fragment key={i}>
                <span className="home-word" style={{ '--w': i } as CSSProperties} aria-hidden>{word}</span>
                {i === 1 && <br />}
              </Fragment>
            ))}
          </h1>
          <p className="home-lede">Build a castle. Mix a colour. Make a little mess.<br />Explore playful demos from the Tada lab.</p>

          <DemoShelf />

          <details className="home-originals">
            <summary>More from the jam <span>Original games &amp; showcase</span></summary>
            <ul className="home-dock" aria-label="Original jam games">
              {games.map((game, i) => (
                <Tile key={game.cartridge.manifest.key} game={game} index={i} onPick={onPick} />
              ))}
            </ul>

            {showcases.length > 0 && (
              <section className="home-showcases" aria-label="Showcases">
                <p className="home-showcases-label">Showcase · not a Tada cartridge</p>
                <ul className="home-dock home-dock-showcase">
                  {showcases.map((showcase, i) => (
                    <Tile key={showcase.cartridge.manifest.key} game={showcase} index={games.length + 1 + i} requires={showcase.requires} onPick={onPick} />
                  ))}
                </ul>
              </section>
            )}

          </details>

        </main>

        <div className="home-landscape" aria-hidden>
          <img src={foxLandscape} alt="" draggable={false} />
        </div>
      </div>
    </div>
  )
}

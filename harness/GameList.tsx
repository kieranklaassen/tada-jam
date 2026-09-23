import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import '@fontsource/albert-sans/400.css'
import '@fontsource/albert-sans/500.css'
import '@fontsource/albert-sans/600.css'
import '@fontsource/albert-sans/700.css'
import foxLandscape from './assets/fox-landscape.png'
import tadaMark from './assets/tada-mark.svg'
import yourApp from './assets/your-app.svg'
import type { JamGame } from './contract'
import './home.css'

// The jam's home page, after the tada.computer landing hero (Figma
// "Landing" › landing_kid › hero): a cream frame, the fox landscape along the
// bottom, and the games as glossy app tiles. Everything enters in a short
// choreographed sequence; reduced motion shows the finished page at once.

const HEADLINE = "Tiny games your kids can't break. Build together"
const LAUNCH_MS = 420

function Tile({ game, index, chosen, onPick }: { game: JamGame; index: number; chosen: boolean; onPick: (key: string) => void }) {
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
  // "Surprise me" picks a tile: it bounces, then opens as if tapped.
  useEffect(() => {
    if (!chosen) return
    const timer = window.setTimeout(launch, 650)
    return () => window.clearTimeout(timer)
  }, [chosen])

  const face: CSSProperties = tile ? { backgroundImage: `linear-gradient(45deg, ${tile.from} 0%, ${tile.to} 83%)` } : {}
  return (
    <li className="home-tile-slot" style={{ '--i': index } as CSSProperties}>
      <button
        ref={ref}
        type="button"
        className={`home-tile${launching ? ' is-launching' : ''}${chosen ? ' is-chosen' : ''}`}
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
        <span className="home-tile-age">ages {cartridge.manifest.ageBand[0]}–{cartridge.manifest.ageBand[1]}</span>
      </button>
    </li>
  )
}

export function GameList({ games, onPick }: { games: readonly JamGame[]; onPick: (key: string) => void }) {
  const [surprise, setSurprise] = useState<number | null>(null)
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
    setSurprise(Math.floor(Math.random() * games.length))
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
          <p className="home-lede">
            Experimental Tada cartridges made in the jam. Every one runs on the real cartridge contract, so it can move
            straight into Tada.
          </p>

          <ul className={`home-dock${surprise !== null ? ' is-choosing' : ''}`} aria-label="Games">
            {games.map((game, i) => (
              <Tile key={game.cartridge.manifest.key} game={game} index={i} chosen={surprise === i} onPick={onPick} />
            ))}
            <li className="home-tile-slot" style={{ '--i': games.length } as CSSProperties} aria-hidden>
              <span className="home-tile home-tile-yours">
                <img src={yourApp} alt="" width={80} height={80} className="home-tile-dashed" />
                <span className="home-tile-name">Your game</span>
                <span className="home-tile-age">add a folder</span>
              </span>
            </li>
          </ul>

          {games.length > 0 && (
            <button type="button" className="home-cta" onClick={surpriseMe}>
              Surprise me
            </button>
          )}
        </main>

        <div className="home-landscape" aria-hidden>
          <img src={foxLandscape} alt="" draggable={false} />
        </div>
      </div>
    </div>
  )
}

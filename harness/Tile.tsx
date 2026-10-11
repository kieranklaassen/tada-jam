import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { JamGame } from './contract'

// One glossy app tile of the home page. Games, showcases and demos all use it,
// so everything on the page is picked the same way.

// Games without their own tile art still get a colour of their own, picked from the key.
const TILE_COLOURS: readonly [string, string][] = [
  ['#d055b1', '#ea82d0'], ['#2f7fd8', '#7fc0f5'], ['#2f9c7a', '#8fdcb4'], ['#e0763a', '#f7c16a'],
  ['#7a5bd6', '#b9a4f5'], ['#c9453e', '#f29a7a'], ['#3a8f9e', '#8fd3d6'], ['#b5842c', '#f0d27a'],
]
function fallbackColours(key: string) {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TILE_COLOURS[hash % TILE_COLOURS.length]
}
const LAUNCH_MS = 420

export type TileProps = {
  /** What onPick is called with. */
  id: string
  name: string
  emoji: string
  art?: JamGame['tile']
  /** The small line under the name. */
  caption: string
  /** A pill under the name in place of the caption. */
  pill?: string
  index: number
  chosen?: boolean
  onPick: (id: string) => void
}

export function Tile({ id, name, emoji, art: tile, caption, pill, index, chosen = false, onPick }: TileProps) {
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
    if (reduced) { onPick(id); return }
    setLaunching(true)
    window.setTimeout(() => onPick(id), LAUNCH_MS)
  }
  // "Surprise me" picks a tile: it bounces, then opens as if tapped.
  useEffect(() => {
    if (!chosen) return
    const timer = window.setTimeout(launch, 650)
    return () => window.clearTimeout(timer)
  }, [chosen])

  const [from, to] = tile ? [tile.from, tile.to] : fallbackColours(id)
  const face: CSSProperties = { backgroundImage: `linear-gradient(45deg, ${from} 0%, ${to} 83%)` }
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
        <span className="home-tile-name">{name}</span>
        {pill ? <span className="home-tile-requires">{pill}</span> : <span className="home-tile-age">{caption}</span>}
      </button>
    </li>
  )
}

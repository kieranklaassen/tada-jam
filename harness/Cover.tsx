import type { CSSProperties } from 'react'
import type { JamTile } from './contract'
import { coverOf } from './covers'

// What a game looks like, filling whatever box it is put in: a picture of the
// game itself, or its tile art or emoji on a colour of its own until one is taken.

const COLOURS: readonly [string, string][] = [
  ['#d055b1', '#ea82d0'], ['#2f7fd8', '#7fc0f5'], ['#2f9c7a', '#8fdcb4'], ['#e0763a', '#f7c16a'],
  ['#7a5bd6', '#b9a4f5'], ['#c9453e', '#f29a7a'], ['#3a8f9e', '#8fd3d6'], ['#b5842c', '#f0d27a'],
]
function coloursFor(key: string): readonly [string, string] {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return COLOURS[hash % COLOURS.length]
}

export function Cover({ id, emoji, art, eager = false }: { id: string; emoji: string; art?: JamTile; eager?: boolean }) {
  const picture = coverOf(id)
  const [from, to] = art ? [art.from, art.to] : coloursFor(id)
  const ground: CSSProperties = { backgroundImage: `linear-gradient(45deg, ${from}, ${to})` }
  return (
    <span className="home-cover" style={ground} aria-hidden>
      {picture ? (
        <img src={picture} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} />
      ) : art ? (
        <img className="home-cover-art" src={art.art} alt="" draggable={false} />
      ) : (
        <span className="home-cover-emoji">{emoji}</span>
      )}
    </span>
  )
}

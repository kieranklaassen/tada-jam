import type { JamTile } from './contract'
import { Cover } from './Cover'

// One game of the home page, as a picture of itself. Games, showcases and
// demos all use it, so everything on the page is picked the same way.

/** Starts the launch from the picture that was touched. */
export type Launch = (id: string, from: HTMLElement) => void

export type GameCardProps = {
  id: string
  /** The picture it wears, where that is not its id. */
  cover?: string
  name: string
  emoji: string
  art?: JamTile
  /** The small line under the name. */
  caption: string
  onLaunch: Launch
}

export function GameCard({ id, cover = id, name, emoji, art, caption, onLaunch }: GameCardProps) {
  return (
    <li>
      <button type="button" className="home-card" onClick={(event) => onLaunch(id, event.currentTarget.querySelector<HTMLElement>('.home-cover') ?? event.currentTarget)}>
        <Cover id={cover} emoji={emoji} art={art} />
        <span className="home-card-name">{name}</span>
        <span className="home-card-caption">{caption}</span>
      </button>
    </li>
  )
}

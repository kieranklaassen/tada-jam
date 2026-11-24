import type { Demo } from './demos'
import { GameCard, type Launch } from './GameCard'

// The old games: every demo the lab ever made, opened just as it was, also
// where a newer game grew from it. They keep to a section of their own, so the
// shelves show each game once.
export function OldGames({ demos, onLaunch }: { demos: readonly Demo[]; onLaunch: Launch }) {
  if (demos.length === 0) return null
  return (
    <section className="home-shelf" aria-label="Old games">
      <h2 className="home-shelf-title">Old games</h2>
      <ul className="home-grid" aria-label="Old games">
        {demos.map((demo) => (
          <GameCard key={demo.key} id={demo.key} cover={`old/${demo.key}`} name={demo.name} emoji={demo.emoji} caption={`ages ${demo.ages[0]}–${demo.ages[1]}`} onLaunch={onLaunch} />
        ))}
      </ul>
    </section>
  )
}

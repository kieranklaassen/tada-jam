import { useEffect, useState } from 'react'
import { listedDemos, loadDemoCatalog, type DemoGroup } from './demos'
import { GameCard, type Launch } from './GameCard'

// Demos on the jam's home page: cards of the same kind as the games, grouped
// by what they try out, each marked as a demo. A demo that became a game, or
// that the owner turned down, is not here, so with every demo rebuilt this
// shows nothing.
export function DemoShelf({ gameKeys, onLaunch }: { gameKeys: ReadonlySet<string>; onLaunch: Launch }) {
  const [groups, setGroups] = useState<DemoGroup[]>([])

  useEffect(() => {
    let alive = true
    void loadDemoCatalog().then((loaded) => {
      if (alive) setGroups(loaded)
    })
    return () => {
      alive = false
    }
  }, [])

  const listed = listedDemos(groups, gameKeys)
  if (listed.length === 0) return null

  return (
    <section aria-label="Demos">
      {listed.map((group) => (
        <div key={group.id} className="home-shelf">
          <h2 className="home-shelf-title">{group.title}</h2>
          <ul className="home-grid" aria-label={group.title}>
            {group.demos.map((demo) => (
              <GameCard key={demo.key} id={demo.key} name={demo.name} emoji={demo.emoji} caption={`demo · ages ${demo.ages[0]}–${demo.ages[1]}`} onLaunch={onLaunch} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

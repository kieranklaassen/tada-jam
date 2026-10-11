import { useEffect, useState } from 'react'
import { DEMO_PLAYER_URL, listedDemos, loadDemoCatalog, type DemoGroup } from './demos'
import { Tile } from './Tile'

// Demos on the jam's home page: tiles of the same kind as the games, grouped
// by what they try out, each marked as a demo. A demo is a quick prototype of
// one idea, not a game. It opens in the jam's own frame, full bleed, and one
// grown-up link at the foot leads to the demo player with its ratings.
export function DemoShelf({ gameKeys, onPick }: { gameKeys: ReadonlySet<string>; onPick: (key: string) => void }) {
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
    <section className="home-demos" aria-label="Demos">
      <p className="home-showcases-label">Demos · ideas being tried out</p>
      {listed.map((group) => (
        <div key={group.id} className="home-demo-group">
          <p className="home-demo-group-title">{group.title}</p>
          <ul className="home-dock home-dock-demos" aria-label={group.title}>
            {group.demos.map((demo, i) => (
              <Tile key={demo.key} id={demo.key} name={demo.name} emoji={demo.emoji} caption={`demo · ages ${demo.ages[0]}–${demo.ages[1]}`} index={i} onPick={onPick} />
            ))}
          </ul>
        </div>
      ))}
      <a className="home-demos-all" href={DEMO_PLAYER_URL}>For grown-ups: rate the demos</a>
    </section>
  )
}

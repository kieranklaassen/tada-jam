import { useEffect, useState } from 'react'
import { DEMO_PLAYER_URL, demoHref, loadDemoCatalog, type DemoGroup } from './demos'

// Demos on the jam's home page, grouped by what they test and folded away by
// default so the page stays short. A demo is a quick prototype of one idea,
// not a game: opening one leaves the jam shell for the demo player.
export function DemoShelf() {
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

  if (groups.length === 0) return null
  const total = groups.reduce((sum, group) => sum + group.demos.length, 0)

  return (
    <section className="home-demos" aria-label="Demos">
      <p className="home-showcases-label">Demos · not games yet</p>
      <p className="home-demos-lede">
        {total} quick prototypes. Each one tests a single idea, and none is a Tada cartridge. Open a group to see what it is testing.
      </p>
      <div className="home-demo-groups">
        {groups.map((group) => (
          <details key={group.id} className="home-demo-group">
            <summary>
              <span className="home-demo-group-title">{group.title}</span>
              <span className="home-demo-group-count">{group.demos.length}</span>
            </summary>
            <p className="home-demo-testing">
              <strong>What we are testing:</strong> {group.testing}
            </p>
            <ul className="home-demo-list">
              {group.demos.map((demo) => (
                <li key={demo.key}>
                  <a className="home-demo" href={demoHref(demo.key)}>
                    <span className="home-demo-emoji" aria-hidden>{demo.emoji}</span>
                    <span className="home-demo-text">
                      <span className="home-demo-name">
                        {demo.name}
                        {demo.look && <span className="home-demo-look">{demo.look}</span>}
                      </span>
                      <span className="home-demo-question">{demo.question}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      <a className="home-demos-all" href={DEMO_PLAYER_URL}>All demos, with ratings</a>
    </section>
  )
}

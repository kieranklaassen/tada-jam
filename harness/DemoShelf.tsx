import { useEffect, useState } from 'react'
import { DEMO_PLAYER_URL, demoHref, loadDemoCatalog, type Demo, type DemoGroup } from './demos'
import { fallbackColours } from './home-tiles'

const FEATURED = ['wet-paint', 'sand-kingdom', 'gem-miner', 'whack-a-mole', 'animal-tower', 'snack-merge']
const PAGE_SIZE = 12
const GROUP_LABELS: Record<string, string> = {
  'calm-work': 'Make & care',
  'playful-jobs': 'Silly jobs',
  'build-and-live': 'Build worlds',
  'open-play': 'Art & imagination',
  'tap-toys': 'Little ones',
  'one-verb': 'Tap & try',
  'arcade-loops': 'Arcade',
}

function DemoIcon({ demo }: { demo: Demo }) {
  const [from, to] = fallbackColours(demo.key)
  return (
    <span className="home-tile-face" style={{ backgroundImage: `linear-gradient(45deg, ${from}, ${to})` }}>
      <span className="home-tile-emoji" aria-hidden="true">{demo.emoji}</span>
      <span className="home-tile-gloss" aria-hidden="true" />
    </span>
  )
}

// The homepage reads the published catalog; game code stays in the lab.
export function DemoShelf() {
  const [groups, setGroups] = useState<DemoGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  useEffect(() => {
    let alive = true
    void loadDemoCatalog().then((loaded) => {
      if (!alive) return
      setGroups(loaded)
      setLoading(false)
    })
    return () => { alive = false }
  }, [attempt])

  const all = groups.flatMap((group) => group.demos)
  const featured = FEATURED.flatMap((key) => all.find((demo) => demo.key === key) ?? [])
  const selected = groups.find((group) => group.id === category)
  const search = query.trim().toLocaleLowerCase()
  const filtered = (selected ? selected.demos : all).filter((demo) =>
    `${demo.name} ${demo.pitch} ${demo.look ?? ''}`.toLocaleLowerCase().includes(search),
  )

  if (loading) return <p className="home-catalog-status" role="status">Getting the demos ready…</p>
  if (all.length === 0) return (
    <section className="home-catalog-status" aria-label="Demo library">
      <p>The demo library couldn’t load.</p>
      <button className="home-secondary" type="button" onClick={() => { setLoading(true); setAttempt((n) => n + 1) }}>Try again</button>
      <a className="home-demos-all" href={DEMO_PLAYER_URL}>Open the demo player</a>
    </section>
  )

  return (
    <>
      <section className="home-featured" aria-label="Try a demo">
        <ul className="home-dock home-featured-dock">
          {featured.map((demo) => (
            <li key={demo.key}>
              <a className="home-tile" href={demoHref(demo.key)}>
                <DemoIcon demo={demo} />
                <span className="home-tile-name">{demo.name}</span>
                <span className="home-tile-age">ages {demo.ages[0]}–{demo.ages[1]}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="home-play-actions">
          <button type="button" className="home-cta" onClick={() => {
            const demo = all[Math.floor(Math.random() * all.length)]
            window.location.assign(demoHref(demo.key))
          }}>
            <svg className="home-cta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7h3.5c2.2 0 3.6 1.2 4.8 3.2l1.4 2.6c1.2 2 2.6 3.2 4.8 3.2H21M3 17h3.5c1.3 0 2.3-.4 3.1-1.2M14.4 8.2c.8-.8 1.8-1.2 3.1-1.2H21m-3-13 3 3-3 3m0 7 3 3-3 3" />
            </svg>
            Surprise me
          </button>
          <a className="home-browse-link" href="#demo-library">Explore all {all.length} demos <span aria-hidden="true">↓</span></a>
        </div>
        <p className="home-prototype-note">Little experiments, ready to try. These demos are still growing.</p>
      </section>

      <section className="home-library" id="demo-library" aria-labelledby="demo-library-title">
        <div className="home-library-heading">
          <div>
            <p className="home-showcases-label">The play shelf</p>
            <h2 id="demo-library-title">What shall we play?</h2>
          </div>
          <label className="home-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6" /></svg>
            <span className="home-sr-only">Search demos</span>
            <input type="search" placeholder="Find a little adventure…" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(PAGE_SIZE) }} />
          </label>
        </div>
        <div className="home-filters" role="group" aria-label="Demo categories">
          <button type="button" aria-pressed={category === 'all'} onClick={() => { setCategory('all'); setLimit(PAGE_SIZE) }}>All demos <span>{all.length}</span></button>
          {groups.map((group) => (
            <button key={group.id} type="button" aria-pressed={category === group.id} onClick={() => { setCategory(group.id); setLimit(PAGE_SIZE) }}>
              {GROUP_LABELS[group.id] ?? group.title} <span>{group.demos.length}</span>
            </button>
          ))}
        </div>
        <div className="home-library-meta">
          <p>{selected ? selected.title : 'A little making, a little exploring, a lot to try.'}</p>
          <p role="status">{filtered.length} {filtered.length === 1 ? 'demo' : 'demos'}{search ? ' found' : ''}</p>
        </div>
        {filtered.length > 0 ? (
          <ul className="home-demo-grid" aria-label="Demo library">
            {filtered.slice(0, limit).map((demo) => (
              <li key={demo.key}>
                <a className="home-demo-card" href={demoHref(demo.key)}>
                  <div className="home-demo-card-top">
                    <DemoIcon demo={demo} />
                    <span className="home-demo-card-age">ages {demo.ages[0]}–{demo.ages[1]}</span>
                  </div>
                  <h3>{demo.name}</h3>
                  <p>{demo.pitch || demo.question}</p>
                  <span className="home-demo-card-play">Let’s play <span aria-hidden="true">↗</span></span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="home-empty">
            <p>No demos found. Try another word or explore the whole shelf.</p>
            <button type="button" className="home-secondary" onClick={() => { setQuery(''); setCategory('all'); setLimit(PAGE_SIZE) }}>Show all demos</button>
          </div>
        )}
        {filtered.length > limit && (
          <button type="button" className="home-secondary home-show-more" onClick={() => setLimit(filtered.length)}>Show {filtered.length - limit} more demos</button>
        )}
        <p className="home-library-note">Demos, not finished Tada games. <a href={DEMO_PLAYER_URL}>Visit the lab to play and leave a rating <span aria-hidden="true">↗</span></a></p>
      </section>
    </>
  )
}

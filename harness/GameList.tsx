import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import '@fontsource/albert-sans/400.css'
import '@fontsource/albert-sans/500.css'
import '@fontsource/albert-sans/600.css'
import '@fontsource/albert-sans/700.css'
import foxLandscape from './assets/fox-landscape.webp'
import tadaMark from './assets/tada-mark.svg'
import type { JamGame, JamShowcase } from './contract'
import { Cover } from './Cover'
import { DemoShelf } from './DemoShelf'
import { GameCard } from './GameCard'
import { AGES, readPrefs, writePrefs } from './prefs'
import { fillShelves, fitsAge, keyOf, lineFor, matches } from './shelves'
import { useLaunch } from './useLaunch'
import './home.css'

// The jam's home page, for finding something to play. Every game is shown as a
// picture of itself. One game fills the top; below it the games stand on
// shelves by what the hands do. A grown-up sets the child's age, picks a shelf
// or types a word; a child points at a picture. The page keeps the cream, the
// ink and the fox landscape of the tada.computer landing.

const ages = (game: JamGame) => `ages ${game.cartridge.manifest.ageBand.join('–')}`

// What was open when a game was picked, so coming home is coming back to the
// same place. It lives as long as the page does and is saved nowhere.
const left = { shelf: null as string | null, query: '', scroll: 0 }

const pickOne = <T,>(list: readonly T[]): T | undefined => list[Math.floor(Math.random() * list.length)]

const SURPRISE_MS = 700

type Props = { games: readonly JamGame[]; showcases?: readonly JamShowcase[]; onPick: (key: string) => void; onPickDemo: (key: string) => void }

export function GameList({ games, showcases = [], onPick, onPickDemo }: Props) {
  const [childAge, setChildAge] = useState(() => readPrefs().childAge)
  const [shelf, setShelf] = useState(left.shelf)
  const [query, setQuery] = useState(left.query)
  const root = useRef<HTMLDivElement>(null)
  const spotlight = useRef<HTMLDivElement>(null)

  const gameKeys = useMemo(() => new Set(games.map(keyOf)), [games])
  const shelves = useMemo(() => fillShelves(games), [games])
  const fitting = useMemo(() => games.filter((game) => fitsAge(game, childAge)), [games, childAge])
  // The game at the top is a fresh pick on every visit and for every age, never one chosen by date.
  const [surprised, setSurprised] = useState<JamGame | null>(null)
  const offered = useMemo(() => pickOne(fitting) ?? games[0], [fitting, games])
  const featured = surprised ?? offered

  const searching = query.trim() !== ''
  // A search looks everywhere; otherwise the chosen shelf, the games for the age first and none hidden.
  const shown = shelves
    .filter((s) => searching || shelf === null || s.id === shelf)
    .map((s) => ({ ...s, games: s.games.filter((game) => matches(game, query)) }))
  const now = shown.map((s) => ({ ...s, games: searching ? s.games : s.games.filter((game) => fitsAge(game, childAge)) })).filter((s) => s.games.length > 0)
  const others = searching ? [] : shown.flatMap((s) => s.games.filter((game) => !fitsAge(game, childAge)))

  useLayoutEffect(() => {
    root.current?.ownerDocument.scrollingElement?.scrollTo?.(0, left.scroll)
  }, [])
  const leave = useCallback(
    (open: (key: string) => void) => (key: string) => {
      left.scroll = document.scrollingElement?.scrollTop ?? 0
      open(key)
    },
    [],
  )
  const launch = useLaunch(useMemo(() => leave(onPick), [leave, onPick]))
  const launchDemo = useLaunch(useMemo(() => leave(onPickDemo), [leave, onPickDemo]))

  const chooseAge = (age: number | null) => {
    setChildAge(age)
    setSurprised(null)
    // The strip above a game may have set the language or theme since this page read them.
    writePrefs({ ...readPrefs(['meadow', 'boring']), childAge: age })
  }
  const chooseShelf = (id: string | null) => {
    left.shelf = id
    left.query = ''
    setShelf(id)
    setQuery('')
    // Chosen from far down the page, a shelf starts under the buttons, where it can be seen.
    const top = spotlight.current ? spotlight.current.offsetTop + spotlight.current.offsetHeight : 0
    if ((document.scrollingElement?.scrollTop ?? 0) > top) document.scrollingElement?.scrollTo?.(0, top)
  }
  const search = (text: string) => {
    left.query = text
    setQuery(text)
  }
  const playFeatured = () => featured && spotlight.current && launch(keyOf(featured), spotlight.current.querySelector<HTMLElement>('.home-cover') ?? spotlight.current)
  // A surprise is seen before it opens: the game takes the top of the page, then grows from there.
  const surprise = () => !surprised && setSurprised(pickOne(fitting.filter((game) => game !== featured)) ?? featured)
  useEffect(() => {
    if (!surprised) return
    const timer = window.setTimeout(playFeatured, SURPRISE_MS)
    return () => window.clearTimeout(timer)
  }, [surprised])

  const card = (game: JamGame) => <GameCard key={keyOf(game)} id={keyOf(game)} name={game.cartridge.manifest.name} emoji={game.emoji} art={game.tile} caption={ages(game)} onLaunch={launch} />

  return (
    <div className="home" ref={root}>
      <header className="home-top">
        <p className="home-logo" aria-label="tada.computer jam">
          <img src={tadaMark} alt="" width={30} height={26} />
          <span>tada.computer</span>
          <span className="home-logo-jam">jam</span>
        </p>
        <input className="home-search" type="search" placeholder="Find a game" aria-label="Find a game by name" value={query} onChange={(event) => search(event.target.value)} />
        <fieldset className="home-ages">
          <legend>Playing today</legend>
          {AGES.map((age) => (
            <label key={String(age)} className="home-age">
              <input type="radio" name="home-age" checked={childAge === age} onChange={() => chooseAge(age)} aria-label={age === null ? 'any age' : `age ${age}`} />
              <span aria-hidden>{age ?? 'any'}</span>
            </label>
          ))}
        </fieldset>
      </header>

      <main className="home-main">
        {featured && !searching && (
          <section className="home-spotlight" ref={spotlight} aria-label="Try this one">
            <Cover key={keyOf(featured)} id={keyOf(featured)} emoji={featured.emoji} art={featured.tile} eager />
            <div className="home-spotlight-words">
              <h1 className="home-title">Tiny games your kids can’t break</h1>
              <p className="home-spotlight-line">
                <strong>{featured.cartridge.manifest.name}</strong> {lineFor(keyOf(featured))}
              </p>
              <div className="home-actions">
                <button type="button" className="home-play" onClick={playFeatured} aria-label={`Play ${featured.cartridge.manifest.name}`}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                    <path d="M7 4.6v14.8c0 .9 1 1.5 1.8 1l11.6-7.4a1.2 1.2 0 0 0 0-2L8.8 3.6c-.8-.5-1.8.1-1.8 1Z" />
                  </svg>
                  Play
                </button>
                <button type="button" className="home-surprise" onClick={surprise}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7h3.5c2.2 0 3.6 1.2 4.8 3.2l1.4 2.6c1.2 2 2.6 3.2 4.8 3.2H21" />
                    <path d="M3 17h3.5c1.3 0 2.3-.4 3.1-1.2M14.4 8.2c.8-.8 1.8-1.2 3.1-1.2H21" />
                    <path d="m18 4 3 3-3 3M18 14l3 3-3 3" />
                  </svg>
                  Surprise me
                </button>
              </div>
            </div>
          </section>
        )}

        <nav className="home-finder" aria-label="Shelves">
          <div className="home-shelf-picks">
            <button type="button" className="home-pick" aria-pressed={shelf === null && !searching} onClick={() => chooseShelf(null)}>
              All {games.length}
            </button>
            {shelves.map((s) => {
              const face = s.games.find((game) => fitsAge(game, childAge)) ?? s.games[0]
              return (
                <button key={s.id} type="button" className="home-pick" aria-pressed={shelf === s.id && !searching} onClick={() => chooseShelf(s.id)}>
                  <Cover id={keyOf(face)} emoji={face.emoji} art={face.tile} eager />
                  {s.label}
                </button>
              )
            })}
          </div>
        </nav>

        {now.map((s) => (
          <section key={s.id} className="home-shelf" aria-label={s.title}>
            <h2 className="home-shelf-title">{s.title}</h2>
            <ul className="home-grid" aria-label={s.title}>
              {s.games.map(card)}
            </ul>
          </section>
        ))}

        {others.length > 0 && (
          <section className="home-shelf" aria-label="Made for other ages">
            <h2 className="home-shelf-title">Made for other ages</h2>
            <ul className="home-grid" aria-label="Made for other ages">
              {others.map(card)}
            </ul>
          </section>
        )}

        {searching && now.length === 0 && (
          <p className="home-nothing">
            No game has “{query.trim()}” in its name or its line.{' '}
            <button type="button" onClick={() => search('')}>
              Show all games
            </button>
          </p>
        )}

        {shelf === null && !searching && (
          <>
            {showcases.length > 0 && (
              <section className="home-shelf" aria-label="Showcases">
                <h2 className="home-shelf-title">Bigger adventures</h2>
                <ul className="home-grid" aria-label="Bigger adventures">
                  {showcases.map((s) => (
                    <GameCard key={keyOf(s)} id={keyOf(s)} name={s.cartridge.manifest.name} emoji={s.emoji} art={s.tile} caption={s.requires ?? ages(s)} onLaunch={launch} />
                  ))}
                </ul>
              </section>
            )}
            <DemoShelf gameKeys={gameKeys} onLaunch={launchDemo} />
          </>
        )}
      </main>

      <div className="home-landscape" aria-hidden>
        <img src={foxLandscape} alt="" draggable={false} />
      </div>
    </div>
  )
}

import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DemoFrame } from './DemoFrame'
import { demoRoute } from './demos'
import { GameList } from './GameList'
import { findGame, games, showcases } from './games'
import { JamShell } from './JamShell'
import './harness.css'

type Route = { view: 'home' } | { view: 'play' | 'demo'; key: string }

function currentRoute(): Route {
  const match = window.location.hash.match(/^#\/(play|demo)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)
  return match ? { view: match[1] as 'play' | 'demo', key: match[2] } : { view: 'home' }
}

function App() {
  const [route, setRoute] = useState(currentRoute)

  useEffect(() => {
    const onHash = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const openGame = useCallback((key: string) => {
    // In place of the old link, so going back does not come round to it again.
    window.location.replace(`#/play/${key}`)
  }, [])

  // The address changes inside the tap; the page changes when the launch has grown, to wherever the address is by then.
  const pick = (hash: string) => {
    window.history.pushState(null, '', hash)
    return () => setRoute(currentRoute())
  }

  const goHome = useCallback(() => {
    window.location.hash = ''
  }, [])

  // A demo that became a game of the same name opens as the game, so an old link still plays.
  const game = route.view === 'home' ? undefined : findGame(route.key)
  if (game && route.view !== 'home') return <JamShell key={route.key} game={game} onExit={goHome} />
  if (route.view === 'demo') return <DemoFrame key={route.key} demoKey={route.key} onExit={goHome} onGame={openGame} />
  return <GameList games={games} showcases={showcases} onPick={(key) => pick(`#/play/${key}`)} onPickDemo={(key) => pick(demoRoute(key))} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

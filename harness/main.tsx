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

  const goHome = useCallback(() => {
    window.location.hash = ''
  }, [])

  const game = route.view === 'play' ? findGame(route.key) : undefined
  if (game) return <JamShell key={route.view === 'play' ? route.key : ''} game={game} onExit={goHome} />
  if (route.view === 'demo') return <DemoFrame key={route.key} demoKey={route.key} onExit={goHome} />
  return <GameList games={games} showcases={showcases} onPick={(key) => (window.location.hash = `#/play/${key}`)} onPickDemo={(key) => (window.location.hash = demoRoute(key))} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GameList } from './GameList'
import { findGame, games, showcases } from './games'
import { JamShell } from './JamShell'
import './harness.css'

function currentKey(): string | null {
  const match = window.location.hash.match(/^#\/play\/([a-z0-9-]+)$/)
  return match ? match[1] : null
}

function App() {
  const [key, setKey] = useState(currentKey)

  useEffect(() => {
    const onHash = () => setKey(currentKey())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const game = key ? findGame(key) : undefined
  if (game) {
    return <JamShell key={key} game={game} onExit={() => (window.location.hash = '')} />
  }
  return <GameList games={games} showcases={showcases} onPick={(next) => (window.location.hash = `#/play/${next}`)} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

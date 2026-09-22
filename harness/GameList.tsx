import type { JamGame } from './contract'

export function GameList({ games, onPick }: { games: readonly JamGame[]; onPick: (key: string) => void }) {
  return (
    <main className="jam-list">
      <h1>Tada Jam</h1>
      <p>Experimental Tada-compatible games. Pick one to play it in the jam shell.</p>
      {games.length === 0 ? (
        <p className="jam-empty">No games yet. Add a folder under games/ (see README).</p>
      ) : (
        <ul>
          {games.map(({ cartridge, emoji }) => (
            <li key={cartridge.manifest.key}>
              <button type="button" onClick={() => onPick(cartridge.manifest.key)}>
                <span className="jam-emoji" aria-hidden>
                  {emoji}
                </span>
                <span className="jam-name">{cartridge.manifest.name}</span>
                <span className="jam-age">
                  ages {cartridge.manifest.ageBand[0]}–{cartridge.manifest.ageBand[1]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

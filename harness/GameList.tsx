import type { JamGame } from './contract'

function Tile({ game: { cartridge, emoji }, onPick }: { game: JamGame; onPick: (key: string) => void }) {
  return (
    <li>
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
  )
}

export function GameList({ games, showcases = [], onPick }: { games: readonly JamGame[]; showcases?: readonly JamGame[]; onPick: (key: string) => void }) {
  return (
    <main className="jam-list">
      <h1>Tada Jam</h1>
      <p>Experimental Tada-compatible games. Pick one to play it in the jam shell.</p>
      {games.length === 0 ? (
        <p className="jam-empty">No games yet. Add a folder under games/ (see README).</p>
      ) : (
        <ul>
          {games.map((game) => (
            <Tile key={game.cartridge.manifest.key} game={game} onPick={onPick} />
          ))}
        </ul>
      )}
      {showcases.length > 0 && (
        <section className="jam-showcases" aria-label="Showcases">
          <h2>Showcase</h2>
          <p>Owner-approved pieces that are not cartridges: they do not follow the kid-side rules and are not meant for Tada.</p>
          <ul>
            {showcases.map((game) => (
              <Tile key={game.cartridge.manifest.key} game={game} onPick={onPick} />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

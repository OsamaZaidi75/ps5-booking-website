import './GameCard.css'

function GameCard({ game }) {
  return (
    <article className="game-card">
      <div className="game-media">
        <img src={game.image} alt={game.name} loading="lazy" />
        <span className="game-genre">{game.genre}</span>
      </div>
      <div className="game-body">
        <div className="game-title-row">
          <h3>{game.name}</h3>
          <span className="game-players">👥 {game.players}</span>
        </div>
        <p className="game-desc">{game.description}</p>
        <div className="game-tags">
          <span>4K HDR</span>
          <span>Extra Pass</span>
          <span>DualSense</span>
        </div>
      </div>
    </article>
  )
}

export default GameCard

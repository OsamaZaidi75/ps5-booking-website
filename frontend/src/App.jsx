import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import BookingForm from './components/BookingForm'
import GameCard from './components/GameCard'

// Relative path — works both locally (`vercel dev` proxies /api) and once
// deployed to Vercel (same-origin serverless functions).
const API_URL = '/api'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Instant confirmation',
    text: 'Pick a slot, pick your games, and get a confirmed booking in under a minute. No calls, no waiting.',
  },
  {
    icon: '🎯',
    title: 'Zero double-booking',
    text: 'Real-time availability checks block overlaps automatically, so your session always starts on time.',
  },
  {
    icon: '✨',
    title: 'Premium setup included',
    text: 'PS5 console, Extra Pass library, 4K HDR display and a lounge-grade setup — all in one flat price.',
  },
]

const STATS = [
  { value: '200+', label: 'Weekend sessions booked' },
  { value: '4.9/5', label: 'Average player rating' },
  { value: '<1 min', label: 'To confirm a slot' },
  { value: '0', label: 'Double-bookings, ever' },
]

const STEPS = [
  { n: '01', title: 'Choose your games', text: 'Browse the library and shortlist the titles you want to play.' },
  { n: '02', title: 'Pick a time slot', text: 'Select a date, start time and duration. Availability is live.' },
  { n: '03', title: 'Show up & play', text: 'Walk in, grab the DualSense, and your session is ready to go.' },
]

const TESTIMONIALS = [
  {
    quote: 'Cleanest booking flow I have used. Slot confirmed in seconds and the 4K setup is genuinely elite.',
    name: 'Arjun M.',
    role: 'Tekken 8 regular',
  },
  {
    quote: 'Booked a 3-hour Ghost of Tsushima session for the weekend. No follow-ups needed — just walked in and played.',
    name: 'Sara K.',
    role: 'Weekend gamer',
  },
  {
    quote: '₹200 an hour for this setup feels like a steal. The Extra Pass library alone is worth it.',
    name: 'Rohan D.',
    role: 'MK11 player',
  },
]

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  x: `${(i * 71 + 8) % 100}%`,
  size: `${5 + ((i * 37) % 8)}px`,
  dur: `${11 + ((i * 53) % 12)}s`,
  delay: `${-((i * 29) % 18)}s`,
}))

const GLYPHS = ['△', '○', '✕', '□']
const PS_GLYPHS = Array.from({ length: 10 }, (_, i) => ({
  g: GLYPHS[i % GLYPHS.length],
  x: `${(i * 53 + 6) % 100}%`,
  dur: `${16 + ((i * 41) % 14)}s`,
  delay: `${-((i * 23) % 20)}s`,
  size: `${1.1 + ((i * 3) % 4) * 0.3}rem`,
}))

function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient-orb o1" />
      <span className="ambient-orb o2" />
      <span className="ambient-orb o3" />
      <span className="ambient-grid" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="ambient-particle"
          style={{ '--x': p.x, '--size': p.size, '--dur': p.dur, '--delay': p.delay }}
        />
      ))}
      {PS_GLYPHS.map((p, i) => (
        <span
          key={i}
          className="ambient-glyph"
          style={{ '--x': p.x, '--dur': p.dur, '--delay': p.delay, '--size': p.size }}
        >
          {p.g}
        </span>
      ))}
    </div>
  )
}

function App() {
  const [games, setGames] = useState([])
  const [lastBooking, setLastBooking] = useState(null)
  const [view, setView] = useState('home')
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetchGames()
  }, [])

  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [view, loading, games.length])

  const fetchGames = async () => {
    try {
      const response = await axios.get(`${API_URL}/games`)
      setGames(response.data)
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBookingCreated = (booking) => {
    setLastBooking(booking)
    setView('confirmation')
  }

  const go = (next) => {
    setView(next)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-pill">
          <span className="loading-dot" />
          Loading PS5 Arena…
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <AmbientBackground />
      {/* Floating nav */}
      <header className="nav-wrap">
        <nav className="nav-pill">
          <button className="brand" onClick={() => go('home')} aria-label="PS5 Arena home">
            <span className="brand-mark">◉</span>
            PS5&nbsp;Arena
          </button>
          <div className="nav-links">
            <button className={view === 'home' ? 'active' : ''} onClick={() => go('home')}>Home</button>
            <button className={view === 'games' ? 'active' : ''} onClick={() => go('games')}>Games</button>
            <button className={view === 'booking' ? 'active' : ''} onClick={() => go('booking')}>Pricing</button>
          </div>
          <button className="btn btn-dark btn-sm nav-cta" onClick={() => go('booking')}>
            Book now →
          </button>
          <button
            className={`nav-burger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </nav>
        {menuOpen && (
          <div className="nav-mobile-menu">
            <button className={view === 'home' ? 'active' : ''} onClick={() => go('home')}>Home</button>
            <button className={view === 'games' ? 'active' : ''} onClick={() => go('games')}>Games</button>
            <button className={view === 'booking' ? 'active' : ''} onClick={() => go('booking')}>Pricing</button>
          </div>
        )}
      </header>

      {view === 'home' && (
        <main>
          {/* Hero */}
          <section className="hero">
            <div className="hero-grid">
              <div className="hero-copy animate-in">
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  Now booking · 4K HDR lounge · ₹200/hr
                </div>
                <h1>
                  Next-gen PS5 sessions, <em>booked in seconds.</em>
                </h1>
                <p className="lede">
                  A marketing-clean booking experience for a gaming lounge.
                  Browse top PS5 titles, check live availability, and lock
                  your session — no DMs, no phone calls.
                </p>
                <div className="hero-ctas">
                  <button className="btn btn-dark btn-lg" onClick={() => go('booking')}>
                    Book your session →
                  </button>
                  <button className="btn btn-ghost btn-lg" onClick={() => go('games')}>
                    Browse games
                  </button>
                </div>
                <div className="hero-proof">
                  <div className="avatars" aria-hidden="true">
                    <span>AK</span><span>SR</span><span>RD</span><span>+</span>
                  </div>
                  <div>
                    <div className="stars">★★★★★ <b>4.9/5</b></div>
                    <div className="proof-sub">from 200+ weekend sessions</div>
                  </div>
                </div>
              </div>

              {/* Hero visual — game art + booking card mock */}
              <div className="hero-visual animate-in">
                <div className="hero-art">
                  {(games.length > 0 ? games.slice(0, 3) : [{ id: 0, name: 'Tekken 8' }, { id: 1, name: 'Ghost of Tsushima' }, { id: 2, name: 'MK 11' }]).map((g) => (
                    <figure key={g.id || g.name}>
                      {g.image && <img src={g.image} alt={g.name} loading="lazy" />}
                      <figcaption>{g.name}</figcaption>
                    </figure>
                  ))}
                </div>
                <div className="hero-card">
                  <div className="hero-card-top">
                    <div>
                      <p className="hc-label">Upcoming session</p>
                      <p className="hc-title">Saturday · 6:00 PM</p>
                    </div>
                    <span className="hc-status">Confirmed</span>
                  </div>
                  <div className="hc-slots">
                    {['Tekken 8', 'Ghost of Tsushima', 'MK 11'].map((g) => (
                      <span key={g} className="hc-chip">{g}</span>
                    ))}
                  </div>
                  <div className="hc-row">
                    <div>
                      <p className="hc-label">Duration</p>
                      <p className="hc-value">2 hours</p>
                    </div>
                    <div>
                      <p className="hc-label">Total</p>
                      <p className="hc-value">₹400</p>
                    </div>
                    <button className="btn btn-lime btn-sm" onClick={() => go('booking')}>Book slot</button>
                  </div>
                  <div className="hc-bar">
                    <span style={{ width: '72%' }} />
                  </div>
                  <p className="hc-note">72% of weekend slots fill by Friday</p>
                </div>
                <div className="float-chip fc-1">⚡ Live availability</div>
                <div className="float-chip fc-2">✓ No double-booking</div>
              </div>
            </div>

            {/* Trust strip — scrolling marquee */}
            <div className="trust" aria-hidden="true">
              <div className="trust-track">
                {[0, 1].map((dup) => (
                  <span key={dup} style={{ display: 'contents' }}>
                    <span>PS5 CONSOLE</span><i>•</i>
                    <span>4K HDR</span><i>•</i>
                    <span>EXTRA PASS</span><i>•</i>
                    <span>DUALSENSE</span><i>•</i>
                    <span>INSTANT CONFIRM</span><i>•</i>
                    <span>₹200 / HOUR</span><i>•</i>
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Stats bento band */}
          <section className="section reveal stats-section">
            <div className="stats-band">
              {STATS.map((s, i) => (
                <div key={s.label} className="stat-tile" style={{ '--reveal-delay': `${i * 0.08}s` }}>
                  <p className="stat-value">{s.value}</p>
                  <p className="stat-label">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="section reveal">
            <div className="section-head">
              <p className="kicker">Why PS5 Arena</p>
              <h2>Everything handled, <em>you just play.</em></h2>
              <p className="sub">One flat price, premium hardware, and a booking flow that respects your time.</p>
            </div>
            <div className="cards-3">
              {FEATURES.map((f, i) => (
                <div key={f.title} className="feature-card reveal" style={{ '--reveal-delay': `${i * 0.1}s` }}>
                  <div className="feature-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Games preview */}
          <section className="section section-tint reveal">
            <div className="section-head split">
              <div>
                <p className="kicker">Game library</p>
                <h2>Top titles, <em>ready to play.</em></h2>
              </div>
              <button className="btn btn-ghost" onClick={() => go('games')}>View all games →</button>
            </div>
            <div className="games-grid">
              {games.slice(0, 3).map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </section>

          {/* Steps */}
          <section className="section reveal">
            <div className="section-head">
              <p className="kicker">How it works</p>
              <h2>Book in <em>three steps.</em></h2>
            </div>
            <div className="cards-3">
              {STEPS.map((s, i) => (
                <div key={s.n} className="step-card reveal" style={{ '--reveal-delay': `${i * 0.1}s` }}>
                  <span className="step-n">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Testimonials */}
          <section className="section section-tint reveal">
            <div className="section-head">
              <p className="kicker">Loved by players</p>
              <h2>Weekend regulars <em>keep coming back.</em></h2>
            </div>
            <div className="cards-3">
              {TESTIMONIALS.map((t, i) => (
                <figure key={t.name} className="quote-card reveal" style={{ '--reveal-delay': `${i * 0.1}s` }}>
                  <div className="stars">★★★★★</div>
                  <blockquote>“{t.quote}”</blockquote>
                  <figcaption>
                    <b>{t.name}</b>
                    <span>{t.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="section reveal">
            <div className="cta-banner">
              <div>
                <p className="kicker kicker-light">₹200/hour · min 1 hr · max 5 hrs</p>
                <h2>Your controller is <em>already waiting.</em></h2>
                <p className="cta-sub">Lock a slot now — weekend evenings fill fast.</p>
              </div>
              <div className="cta-actions">
                <button className="btn btn-lime btn-lg" onClick={() => go('booking')}>Book now →</button>
              </div>
            </div>
          </section>
        </main>
      )}

      {view === 'booking' && (
        <main className="section narrow">
          <div className="section-head">
            <p className="kicker">Booking</p>
            <h2>Lock your <em>session.</em></h2>
            <p className="sub">Live availability · instant confirmation · pay at the lounge.</p>
          </div>
          <div className="booking-layout">
            <aside className="price-card">
              <p className="kicker">Pricing</p>
              <p className="price"><b>₹200</b><span>/hour</span></p>
              <ul>
                <li>✓ PS5 console + DualSense</li>
                <li>✓ Extra Pass library</li>
                <li>✓ 4K HDR display</li>
                <li>✓ 1–5 hours per session</li>
                <li>✓ Free cancellation before start</li>
              </ul>
              <div className="price-note">Weekend tip: book 2+ hours to skip the queue.</div>
            </aside>
            <BookingForm games={games} onBookingCreated={handleBookingCreated} apiUrl={API_URL} />
          </div>
        </main>
      )}

      {view === 'games' && (
        <main className="section narrow">
          <div className="section-head">
            <p className="kicker">Game library</p>
            <h2>Choose your <em>battle.</em></h2>
            <p className="sub">Every title includes PS5 Extra Pass access.</p>
          </div>
          <div className="games-grid">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
          <div className="center">
            <button className="btn btn-dark btn-lg" onClick={() => go('booking')}>Book with these games →</button>
          </div>
        </main>
      )}

      {view === 'confirmation' && lastBooking && (
        <main className="section narrow">
          <div className="confirmation-card">
            <span className="confirmation-icon">✓</span>
            <p className="kicker">Booking confirmed</p>
            <h2>You're all set, <em>{lastBooking.name}.</em></h2>
            <p className="sub">Save your booking reference — you'll need it if you contact the lounge.</p>
            <div className="confirmation-ref">{lastBooking.booking_ref}</div>
            <div className="confirmation-details">
              <div><span>Date</span><b>{lastBooking.date}</b></div>
              <div><span>Time</span><b>{lastBooking.start_time} – {lastBooking.end_time}</b></div>
              <div><span>Duration</span><b>{lastBooking.duration_hours}h</b></div>
              <div><span>Status</span><b className="confirmation-status">{lastBooking.status}</b></div>
            </div>
            <p className="confirmation-note">
              Check your inbox for a confirmation email with this reference and a link to cancel if your plans change.
              Didn't provide an email? Just quote your reference number at the lounge.
            </p>
            <button className="btn btn-dark btn-lg" onClick={() => go('booking')}>Book another session →</button>
          </div>
        </main>
      )}

      <footer className="footer">
        <div className="footer-inner">
          <div className="brand">
            <span className="brand-mark">◉</span>
            PS5&nbsp;Arena
          </div>
          <p>Premium gaming lounge · Est. 2026 · Play more, wait less.</p>
          <div className="footer-links">
            <button onClick={() => go('home')}>Home</button>
            <button onClick={() => go('games')}>Games</button>
            <button onClick={() => go('booking')}>Book now</button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import './BookingForm.css'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

function loadTurnstileScript() {
  if (document.getElementById('turnstile-script')) return
  const script = document.createElement('script')
  script.id = 'turnstile-script'
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

function BookingForm({ games, onBookingCreated, apiUrl }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    startTime: '',
    durationHours: '1',
    selectedGames: [],
    website: '', // honeypot — real users never see or fill this
  })

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [slots, setSlots] = useState({ loading: false, times: [] })
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef(null)
  const widgetIdRef = useRef(null)

  // ── Cloudflare Turnstile CAPTCHA ──────────────────────────────────
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    loadTurnstileScript()

    let cancelled = false
    const tryRender = () => {
      if (cancelled) return
      if (window.turnstile && turnstileRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
        })
      } else if (!window.turnstile) {
        setTimeout(tryRender, 200)
      }
    }
    tryRender()
    return () => { cancelled = true }
  }, [])

  // ── Fetch live availability whenever date/duration changes ───────
  const fetchSlots = useCallback(async (date, durationHours) => {
    if (!date || !durationHours) return
    setSlots({ loading: true, times: [] })
    try {
      const { data } = await axios.get(`${apiUrl}/availability`, {
        params: { date, durationHours },
      })
      setSlots({ loading: false, times: data.availableStartTimes || [] })
    } catch (error) {
      console.error('Error fetching availability:', error)
      setSlots({ loading: false, times: [] })
    }
  }, [apiUrl])

  useEffect(() => {
    fetchSlots(formData.date, formData.durationHours)
    setFormData((prev) => ({ ...prev, startTime: '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, formData.durationHours])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleGameSelect = (gameId) => {
    setFormData(prev => {
      const selected = prev.selectedGames.includes(gameId)
        ? prev.selectedGames.filter(id => id !== gameId)
        : [...prev.selectedGames, gameId]
      return { ...prev, selectedGames: selected }
    })
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits'
    }
    if (!formData.date) newErrors.date = 'Date is required'
    if (!formData.startTime) newErrors.startTime = 'Please pick an available start time'
    if (formData.selectedGames.length === 0) {
      newErrors.games = 'Select at least one game'
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      newErrors.submit = 'Please complete the CAPTCHA challenge.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setSubmitting(true)

    try {
      const response = await axios.post(`${apiUrl}/book`, {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone,
        date: formData.date,
        startTime: formData.startTime,
        durationHours: Number(formData.durationHours),
        selectedGames: formData.selectedGames,
        website: formData.website,
        turnstileToken,
      })
      onBookingCreated(response.data)

      setFormData({
        name: '',
        email: '',
        phone: '',
        date: '',
        startTime: '',
        durationHours: '1',
        selectedGames: [],
        website: '',
      })
      setTurnstileToken('')
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.reset(widgetIdRef.current)
      }
    } catch (error) {
      if (error.response?.status === 409) {
        setErrors({ submit: 'This time slot is already booked. Please choose another time.' })
      } else if (error.response?.status === 429) {
        setErrors({ submit: 'Too many attempts. Please wait a minute and try again.' })
      } else if (error.response?.data?.error) {
        setErrors({ submit: error.response.data.error })
      } else {
        setErrors({ submit: 'Failed to create booking. Please try again.' })
      }
      console.error('Error creating booking:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const totalCost = formData.durationHours * 200

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="booking-form-container">
      <p className="kicker">Reserve a slot</p>
      <h2>Book Your Gaming Session</h2>
      <form onSubmit={handleSubmit} className="booking-form">
        {/* Honeypot — hidden from real users via CSS, bots fill every field */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            type="text"
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={formData.website}
            onChange={handleChange}
          />
        </div>

        <div className="form-section">
          <div className="form-section-head">
            <span className="form-step">1</span>
            <h3>Your details</h3>
          </div>
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
            />
            {errors.name && <span className="error">{errors.name}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email (optional)</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="For a confirmation + cancel link"
              />
              {errors.email && <span className="error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
              />
              {errors.phone && <span className="error">{errors.phone}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-head">
            <span className="form-step">2</span>
            <h3>Schedule</h3>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                min={today}
              />
              {errors.date && <span className="error">{errors.date}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration *</label>
              <select
                id="duration"
                name="durationHours"
                value={formData.durationHours}
                onChange={handleChange}
              >
                <option value="1">1 hour - ₹200</option>
                <option value="2">2 hours - ₹400</option>
                <option value="3">3 hours - ₹600</option>
                <option value="4">4 hours - ₹800</option>
                <option value="5">5 hours - ₹1000</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="startTime">Start Time *</label>
            <select
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              disabled={!formData.date || slots.loading}
            >
              <option value="">
                {!formData.date
                  ? 'Pick a date first'
                  : slots.loading
                    ? 'Loading available times…'
                    : slots.times.length === 0
                      ? 'No slots available this date'
                      : 'Select a start time'}
              </option>
              {slots.times.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.startTime && <span className="error">{errors.startTime}</span>}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-head">
            <span className="form-step">3</span>
            <h3>Choose your games</h3>
            {formData.selectedGames.length > 0 && (
              <span className="form-step-count">{formData.selectedGames.length} selected</span>
            )}
          </div>
          <div className="game-selection">
            {games.map(game => {
              const selected = formData.selectedGames.includes(game.id)
              return (
                <div
                  key={game.id}
                  className={`game-option ${selected ? 'selected' : ''}`}
                  onClick={() => handleGameSelect(game.id)}
                  role="checkbox"
                  aria-checked={selected}
                  tabIndex={0}
                >
                  <div className="game-option-media">
                    {game.image && <img src={game.image} alt={game.name} loading="lazy" />}
                    <span className="game-option-check">✓</span>
                  </div>
                  <div className="game-option-body">
                    <span className="game-option-name">{game.name}</span>
                    <span className="game-option-genre">{game.genre}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {errors.games && <span className="error">{errors.games}</span>}
        </div>

        {TURNSTILE_SITE_KEY && (
          <div className="turnstile-wrap" ref={turnstileRef} />
        )}

        <div className="total-cost">
          <div>
            <span className="total-cost-label">Total Cost</span>
            <span className="total-cost-sub">{formData.durationHours} hour{formData.durationHours > 1 ? 's' : ''} · ₹200/hr</span>
          </div>
          <span className="amount">₹{totalCost}</span>
        </div>

        {errors.submit && <div className="error submit-error">{errors.submit}</div>}

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? 'Booking…' : 'Confirm Booking →'}
        </button>
      </form>
    </div>
  )
}

export default BookingForm

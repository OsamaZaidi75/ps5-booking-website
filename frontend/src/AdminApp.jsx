import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import './AdminApp.css'

const API_URL = '/api'
axios.defaults.withCredentials = true

function StatusBadge({ status }) {
  return <span className={`admin-badge admin-badge-${status}`}>{status}</span>
}

function AdminApp() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [dayFilter, setDayFilter] = useState('') // '' = upcoming list view, else YYYY-MM-DD day view
  const [actionError, setActionError] = useState('')

  const loadBookings = useCallback(async (date) => {
    setLoadingBookings(true)
    setActionError('')
    try {
      const { data } = await axios.get(`${API_URL}/admin/bookings`, {
        params: date ? { date } : undefined,
      })
      setBookings(data)
      setAuthed(true)
    } catch (error) {
      if (error.response?.status === 401) {
        setAuthed(false)
      } else {
        setActionError('Failed to load bookings.')
      }
    } finally {
      setLoadingBookings(false)
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    loadBookings(dayFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      await axios.post(`${API_URL}/admin/login`, { password })
      setPassword('')
      await loadBookings(dayFilter)
    } catch (error) {
      setLoginError(error.response?.data?.error || 'Login failed.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/admin/logout`)
    } finally {
      setAuthed(false)
      setBookings([])
    }
  }

  const updateStatus = async (id, status) => {
    setActionError('')
    try {
      await axios.patch(`${API_URL}/admin/bookings/${id}`, { status })
      await loadBookings(dayFilter)
    } catch (error) {
      setActionError(error.response?.data?.error || 'Failed to update booking.')
    }
  }

  const applyDayFilter = (e) => {
    e.preventDefault()
    loadBookings(dayFilter)
  }

  if (checking) {
    return <div className="admin-page admin-loading">Loading…</div>
  }

  if (!authed) {
    return (
      <div className="admin-page admin-login-page">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <h1>PS5 Arena Admin</h1>
          <p className="admin-sub">Restricted access</p>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {loginError && <div className="admin-error">{loginError}</div>}
          <button type="submit" disabled={loggingIn || !password}>
            {loggingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>PS5 Arena Admin</h1>
        <button className="admin-logout" onClick={handleLogout}>Log out</button>
      </header>

      <form className="admin-filter" onSubmit={applyDayFilter}>
        <label>
          Day view
          <input type="date" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} />
        </label>
        <button type="submit">{dayFilter ? 'View day' : 'View upcoming'}</button>
        {dayFilter && (
          <button type="button" className="admin-filter-clear" onClick={() => { setDayFilter(''); loadBookings('') }}>
            Clear
          </button>
        )}
      </form>

      {actionError && <div className="admin-error">{actionError}</div>}

      {loadingBookings ? (
        <p className="admin-sub">Loading bookings…</p>
      ) : bookings.length === 0 ? (
        <p className="admin-sub">No bookings found.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Date</th>
                <th>Time</th>
                <th>Hrs</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.booking_ref}</td>
                  <td>{b.name}</td>
                  <td>{b.phone}</td>
                  <td>{b.email || '—'}</td>
                  <td>{b.date}</td>
                  <td>{b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)}</td>
                  <td>{b.duration_hours}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="admin-actions">
                    {b.status !== 'confirmed' && (
                      <button onClick={() => updateStatus(b.id, 'confirmed')}>Confirm</button>
                    )}
                    {b.status !== 'cancelled' && (
                      <button className="admin-cancel" onClick={() => updateStatus(b.id, 'cancelled')}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminApp

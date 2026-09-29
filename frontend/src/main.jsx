import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AdminApp from './AdminApp.jsx'
import './index.css'

// No react-router — this is intentionally the only route split. /admin is
// not linked from anywhere in the public UI; it's reachable only if you
// know the URL, and is itself password-protected server-side.
const isAdmin = window.location.pathname.startsWith('/admin')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminApp /> : <App />}
  </React.StrictMode>,
)

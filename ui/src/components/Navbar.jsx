import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const isActive = (path) => location.pathname === path ? 'active' : ''

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/"><span className="logo-icon">🎫</span><span className="logo-text">EventHub</span></Link>
      </div>
      <div className="navbar-links">
        <Link to="/events" className={isActive('/events')}>Events</Link>
        <Link to="/venues" className={isActive('/venues')}>Venues</Link>
        <Link to="/about" className={isActive('/about')}>About Us</Link>
        <Link to="/bookings" className={isActive('/bookings')}>My Bookings</Link>
        <Link to="/support" className={isActive('/support')}>Support</Link>
        {user?.role === 'ADMIN' && <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>}
      </div>
      <div className="navbar-user">
        {user ? (
          <>
            <span className="user-badge">{user.role}</span>
            <span className="user-name">{user.name}</span>
            <button onClick={handleLogout} className="btn btn-outline btn-sm">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}

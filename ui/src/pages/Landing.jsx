import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleAction = () => {
    if (user) {
      navigate('/events')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Experience The <br/> <span className="text-gradient">Best Events Worldwide</span></h1>
          <p>Book your perfect seat instantly. From sold-out concerts to professional tech conferences, EventHub guarantees your ticket securely.</p>
          <div className="hero-buttons">
            <button className="btn btn-primary btn-lg" onClick={handleAction}>
              {user ? 'Browse Events Now' : 'Get Started'}
            </button>
            {!user && <Link to="/register" className="btn btn-outline btn-lg">Create Account</Link>}
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img src="/images/banner.jpg" alt="Event Banner" className="hero-banner" />
        </div>
      </section>

      {/* Trust Banner / Stats */}
      <section className="trust-banner">
        <div className="stat-box">
          <h2>100K+</h2>
          <p>Tickets Sold</p>
        </div>
        <div className="stat-box">
          <h2>500+</h2>
          <p>Live Events</p>
        </div>
        <div className="stat-box">
          <h2>50+</h2>
          <p>Cities Worldwide</p>
        </div>
        <div className="stat-box">
          <h2>100%</h2>
          <p>Secure Booking</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Why Choose EventHub?</h2>
        <div className="features-grid">
          <div className="feature-card card" onClick={handleAction}>
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Seat Locking</h3>
            <p>Our advanced system ensures no double-booking. When you click a seat, it's yours. Guaranteed.</p>
          </div>
          <div className="feature-card card" onClick={handleAction}>
            <div className="feature-icon">🎨</div>
            <h3>Stunning Previews</h3>
            <p>Interactive seat layouts and gorgeous event media give you the full vibe before you even arrive.</p>
          </div>
          <div className="feature-card card" onClick={handleAction}>
            <div className="feature-icon">🎫</div>
            <h3>Instant E-Tickets</h3>
            <p>Pay securely and immediately receive your glowing digital ticket right in your dashboard.</p>
          </div>
        </div>
      </section>

      {/* Secondary Visual Banner */}
      <section className="visual-banner card" style={{ padding: 0, overflow: 'hidden', margin: '40px auto', maxWidth: '1100px', display: 'flex' }}>
        <div style={{ flex: 1, padding: '60px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '16px', background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Elevate Your Experience
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '24px' }}>
            VIP packages, early access passes, and seamless entry at the door. Upgrade to a premium membership to bypass queues entirely.
          </p>
          <button className="btn btn-primary" onClick={handleAction} style={{ alignSelf: 'flex-start' }}>Explore VIP Access</button>
        </div>
        <div style={{ flex: 1 }}>
          <img src="/images/1.jpg" alt="VIP Access" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </section>

      {/* Social Proof / Call to action */}
      <section className="cta-section">
        <div className="card cta-card">
          <h2>Ready to secure your spot?</h2>
          <p>Join thousands of users enjoying live experiences every day.</p>
          <button className="btn btn-primary" onClick={handleAction} style={{marginTop: '20px'}}>
            Book A Ticket
          </button>
        </div>
      </section>
    </div>
  )
}

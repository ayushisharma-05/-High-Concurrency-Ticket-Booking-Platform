import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const { data } = await axios.get('/api/events')
      setEvents(data)
    } catch (err) {
      setError('Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Delete this event?')) return
    try {
      await axios.delete(`/api/events/${id}`)
      setEvents(events.filter(ev => ev._id !== id))
    } catch (err) {
      alert('Failed to delete event')
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>

  return (
    <div>
      <div className="page-header">
        <h1>Upcoming Events</h1>
        {user?.role === 'ADMIN' && (
          <Link to="/events/create" className="btn btn-primary">+ Create Event</Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎭</div>
          <h3>No events found</h3>
          <p>Check back later for exciting new events!</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((event, i) => {
            // Get consistent random image 1-6 based on ID
            const charCode = event._id.charCodeAt(event._id.length - 1);
            const imageNum = (charCode % 6) + 1;
            
            return (
              <div key={event._id} className="card event-card" onClick={() => navigate(`/events/${event._id}`)}>
                <div className="event-card-img">
                  <img src={`/images/${imageNum}.jpg`} alt={event.title} />
                </div>
                <div className="event-card-content">
                  <div className="event-date">
                    {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <h3>{event.title}</h3>
                  <div className="event-venue">📍 {event.venue}</div>
                  
                  <div className="event-meta">
                    <span>{user?.role === 'ADMIN' ? (event.isPublished ? <span className="event-status published">PUBLISHED</span> : <span className="event-status draft">DRAFT</span>) : 'Tickets Available'}</span>
                    {user?.role === 'ADMIN' && (
                      <div className="actions flex-between gap-2">
                        <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); navigate(`/events/${event._id}/edit`) }}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={(e) => handleDelete(event._id, e)}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

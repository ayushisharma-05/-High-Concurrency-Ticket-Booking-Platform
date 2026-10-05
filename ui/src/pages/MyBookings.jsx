import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const { data } = await axios.get('/api/bookings')
      setBookings(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>

  return (
    <div>
      <div className="page-header">
        <h1>{user?.role === 'ADMIN' ? 'All Bookings' : 'My Bookings'}</h1>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎟️</div>
          <h3>No bookings found</h3>
          <p>You haven't booked any tickets yet.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Event</th>
                {user?.role === 'ADMIN' && <th>User</th>}
                <th>Seats</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                    {b.ticketNumber || b._id.substring(b._id.length - 8).toUpperCase()}
                  </td>
                  <td style={{ fontWeight: 600 }}>{b.event?.title || 'Unknown Event'}</td>
                  {user?.role === 'ADMIN' && <td>{b.user?.name || b.user?.email}</td>}
                  <td>{b.seats.join(', ')}</td>
                  <td style={{ fontWeight: 700 }}>₹{b.totalAmount}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`status-badge ${b.status.toLowerCase()}`}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => navigate(`/bookings/${b._id}`)}
                    >
                      View
                    </button>
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

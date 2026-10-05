import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

export default function BookingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    axios.get(`/api/bookings/${id}`)
      .then(res => setBooking(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [id])

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking? This will release the seats immediately.')) return
    setCancelling(true)
    try {
      await axios.post(`/api/bookings/${id}/cancel`)
      setBooking(prev => ({ ...prev, status: 'CANCELLED' }))
    } catch (err) {
      alert('Failed to cancel booking')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>
  if (!booking) return <div className="empty-state">Booking not found</div>

  return (
    <div style={{ padding: '40px 0' }}>
      <div className="page-header" style={{ maxWidth: '600px', margin: '0 auto 32px' }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/bookings')}>← Back to Bookings</button>
      </div>

      <div className="ticket">
        <div className="ticket-content">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2>{booking.event?.title || 'Event'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {booking.event ? new Date(booking.event.date).toLocaleString() : ''}
              <br/>
              📍 {booking.event?.venue}
            </p>
          </div>

          <div className="ticket-row">
            <div>
              <div className="ticket-label">Attendee</div>
              <div className="ticket-value">{booking.user?.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="ticket-label">Status</div>
              <div className={`status-badge ${booking.status.toLowerCase()}`}>{booking.status}</div>
            </div>
          </div>

          <div className="ticket-row">
            <div>
              <div className="ticket-label">Seats</div>
              <div className="ticket-value" style={{ color: 'var(--cyan)' }}>{booking.seats.join(', ')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="ticket-label">Amount Paid</div>
              <div className="ticket-value">₹{booking.totalAmount}</div>
            </div>
          </div>

          {booking.ticketNumber && (
            <div className="ticket-number">
              {booking.ticketNumber}
            </div>
          )}
        </div>
      </div>

      {booking.status === 'CONFIRMED' && (user._id === booking.user._id || user.role === 'ADMIN') && (
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling...' : 'Cancel Booking & Release Seats'}
          </button>
        </div>
      )}
    </div>
  )
}

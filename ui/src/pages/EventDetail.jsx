import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import socket from '../socket'
import SeatMap from '../components/SeatMap'
import { useAuth } from '../context/AuthContext'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [event, setEvent] = useState(null)
  const [seats, setSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [lockingReq, setLockingReq] = useState(false)
  const [error, setError] = useState('')
  
  // Payment Modal state
  const [showPayment, setShowPayment] = useState(false)
  const [bookingId, setBookingId] = useState(null)
  const [paymentLoading, setPaymentLoading] = useState(false)

  useEffect(() => {
    fetchEventAndSeats()
    
    // Connect socket and join event room
    socket.connect()
    socket.emit('joinEvent', id)
    
    socket.on('seatsUpdated', (updatedSeats) => {
      setSeats(updatedSeats)
      // Check if any of our selected seats got booked/locked by someone else
      setSelectedSeats(currentBtn => {
        return currentBtn.filter(seatId => {
          const updatedSeat = updatedSeats.find(s => s.seatId === seatId)
          if (!updatedSeat) return false
          if (updatedSeat.status === 'BOOKED') return false
          if (updatedSeat.status === 'LOCKED' && updatedSeat.lockedBy !== user._id) return false
          return true
        })
      })
    })

    return () => {
      socket.emit('leaveEvent', id)
      socket.off('seatsUpdated')
    }
  }, [id])

  const fetchEventAndSeats = async () => {
    try {
      const [evRes, seatRes] = await Promise.all([
        axios.get(`/api/events/${id}`),
        axios.get(`/api/events/${id}/seats`)
      ])
      setEvent(evRes.data)
      setSeats(seatRes.data)
    } catch (err) {
      setError('Failed to load event details')
    } finally {
      setLoading(false)
    }
  }

  const handleSeatClick = (seat) => {
    if (selectedSeats.includes(seat.seatId)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seat.seatId))
    } else {
      if (selectedSeats.length >= 10) {
        alert('You can select a maximum of 10 seats')
        return
      }
      setSelectedSeats([...selectedSeats, seat.seatId])
    }
  }

  const handleLockAndProceed = async () => {
    if (selectedSeats.length === 0) return
    setLockingReq(true)
    setError('')
    
    try {
      // 1. Attempt to lock seats
      await axios.post('/api/seats/lock', { eventId: id, seatIds: selectedSeats })
      
      // 2. If locking succeeds, create temporary booking
      const { data } = await axios.post('/api/bookings', { eventId: id, seatIds: selectedSeats })
      setBookingId(data._id)
      setShowPayment(true)
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to lock seats. They may have just been taken!')
      if (err.response?.data?.failedSeats) {
        // Remove failed seats from local selection
        const failed = err.response.data.failedSeats
        setSelectedSeats(prev => prev.filter(s => !failed.includes(s)))
      }
    } finally {
      setLockingReq(false)
    }
  }

  const handleSimulatePayment = async (resultType) => {
    setPaymentLoading(true)
    try {
      await axios.post(`/api/bookings/${bookingId}/payment`, { simulateResult: resultType })
      if (resultType === 'success') {
        navigate(`/bookings/${bookingId}`)
      } else {
        alert(resultType === 'timeout' ? 'Payment Timed Out. Seats released.' : 'Payment Failed. Seats released.')
        setShowPayment(false)
        setBookingId(null)
        setSelectedSeats([]) // clear selection
      }
    } catch (err) {
      alert('Payment simulation error')
      setShowPayment(false)
      setSelectedSeats([])
    } finally {
      setPaymentLoading(false)
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>
  if (!event) return <div className="empty-state">Event not found</div>

  const selectedSeatModels = seats.filter(s => selectedSeats.includes(s.seatId))
  const totalPrice = selectedSeatModels.reduce((sum, s) => sum + s.price, 0)

  return (
    <div className="event-detail">
      <div className="event-info">
        <h1>{event.title}</h1>
        <div className="meta">
          <span>📅 {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString()}</span>
          <span>📍 {event.venue}</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{event.description}</p>
        
        {error && <div className="alert alert-error">{error}</div>}
        
        <div className="card">
          <SeatMap seats={seats} selectedSeats={selectedSeats} onSeatClick={handleSeatClick} />
        </div>
      </div>
      
      <div className="booking-panel">
        <div className="card">
          <h3>Your Selection</h3>
          {selectedSeats.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Click on available seats to select them.</p>
          ) : (
            <>
              <div className="selected-seats-list">
                {selectedSeatModels.map(s => (
                  <div key={s.seatId} className="selected-seat-item">
                    <span>Seat {s.seatId}</span>
                    <span>₹{s.price}</span>
                  </div>
                ))}
              </div>
              <div className="booking-total">
                <span>Total</span>
                <span>₹{totalPrice}</span>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '16px' }}
                onClick={handleLockAndProceed}
                disabled={lockingReq}
              >
                {lockingReq ? 'Securing Seats...' : 'Book Tickets'}
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
                Seats will be locked for 5 minutes during payment.
              </p>
            </>
          )}
        </div>
      </div>

      {showPayment && (
        <div className="modal-overlay">
          <div className="modal" style={{ textAlign: 'center' }}>
            <h2>Complete Payment</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
              Amount to pay: <strong style={{ fontSize: '20px', color: 'var(--cyan)' }}>₹{totalPrice}</strong>
            </p>
            
            <div style={{ margin: '0 auto 24px', background: '#fff', padding: '16px', display: 'inline-block', borderRadius: '12px' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=eventhub@mockbank&pn=EventHub&am=${totalPrice}`} alt="Payment QR Code" />
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Scan the QR code to test payment, or use the simulation buttons below to test concurrency and state rollbacks.
            </p>
            
            <div className="payment-options">
              <button className="btn btn-success" onClick={() => handleSimulatePayment('success')} disabled={paymentLoading}>
                {paymentLoading ? 'Processing...' : 'Simulate SUCCESS'}
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-danger" onClick={() => handleSimulatePayment('failure')} disabled={paymentLoading} style={{ flex: 1 }}>
                  Simulate FAILURE
                </button>
                <button className="btn btn-warning" onClick={() => handleSimulatePayment('timeout')} disabled={paymentLoading} style={{ flex: 1 }}>
                  Simulate TIMEOUT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

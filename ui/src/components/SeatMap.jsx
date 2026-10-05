import { useAuth } from '../context/AuthContext'

export default function SeatMap({ seats, selectedSeats, onSeatClick }) {
  const { user } = useAuth()

  // Group by row
  const rows = {}
  seats.forEach(seat => {
    if (!rows[seat.row]) rows[seat.row] = []
    rows[seat.row].push(seat)
  })
  Object.values(rows).forEach(r => r.sort((a, b) => a.number - b.number))

  const getSeatClass = (seat) => {
    if (seat.status === 'BOOKED') return 'seat booked'
    if (seat.status === 'LOCKED') {
      return seat.lockedBy === user?._id ? 'seat locked-mine' : 'seat locked'
    }
    if (selectedSeats.includes(seat.seatId)) return 'seat selected'
    return 'seat available'
  }

  const isClickable = (seat) => {
    if (seat.status === 'BOOKED') return false
    if (seat.status === 'LOCKED' && seat.lockedBy !== user?._id) return false
    return true
  }

  return (
    <div className="seat-map">
      <div className="screen"><div className="screen-label">STAGE</div></div>
      <div className="seats-grid">
        {Object.entries(rows).sort(([a], [b]) => a.localeCompare(b)).map(([row, rowSeats]) => (
          <div key={row} className="seat-row">
            <span className="row-label">{row}</span>
            <div className="row-seats">
              {rowSeats.map(seat => (
                <button key={seat.seatId} className={getSeatClass(seat)}
                  onClick={() => isClickable(seat) && onSeatClick(seat)}
                  disabled={!isClickable(seat)} title={`${seat.seatId} — ₹${seat.price}`}
                >{seat.number}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="seat-legend">
        <div className="legend-item"><span className="legend-dot available"></span> Available</div>
        <div className="legend-item"><span className="legend-dot selected"></span> Selected</div>
        <div className="legend-item"><span className="legend-dot locked"></span> Locked (Others)</div>
        <div className="legend-item"><span className="legend-dot booked"></span> Booked</div>
      </div>
    </div>
  )
}

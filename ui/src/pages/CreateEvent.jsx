import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function CreateEvent() {
  const { id } = useParams()
  const isEditing = !!id
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    title: '', description: '', date: '', venue: '', isPublished: true
  })
  const [seatConfig, setSeatConfig] = useState([
    { row: 'A', count: 5, price: 1000 },
    { row: 'B', count: 5, price: 800 },
    { row: 'C', count: 5, price: 500 }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEditing) {
      axios.get(`/api/events/${id}`).then(res => {
        const { title, description, date, venue, isPublished } = res.data
        setFormData({ title, description, date: date.substring(0,16), venue, isPublished })
        // Note: simplified edit doesn't re-parse seat config for this demo
      }).catch(err => setError('Failed to load event'))
    }
  }, [id, isEditing])

  const generateSeats = () => {
    const seats = []
    seatConfig.forEach(conf => {
      for (let i = 1; i <= conf.count; i++) {
        seats.push({
          seatId: `${conf.row}${i}`,
          row: conf.row,
          number: i,
          price: Number(conf.price),
          status: 'AVAILABLE'
        })
      }
    })
    return seats
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isEditing) {
        await axios.put(`/api/events/${id}`, formData)
      } else {
        const payload = { ...formData, seats: generateSeats() }
        await axios.post('/api/events', payload)
      }
      navigate('/events')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  const updateSeatRow = (index, field, value) => {
    const newConfig = [...seatConfig]
    newConfig[index][field] = value
    setSeatConfig(newConfig)
  }

  const addSeatRow = () => setSeatConfig([...seatConfig, { row: '', count: 5, price: 500 }])
  const removeSeatRow = (index) => setSeatConfig(seatConfig.filter((_, i) => i !== index))

  return (
    <div className="create-event-form">
      <h1>{isEditing ? 'Edit Event' : 'Create New Event'}</h1>
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="card mt-4">
        <div className="form-group">
          <label>Event Title</label>
          <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
        </div>
        
        <div className="form-group">
          <label>Date & Time</label>
          <input type="datetime-local" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
        </div>
        
        <div className="form-group">
          <label>Venue</label>
          <input type="text" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} required />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        </div>

        <div className="form-group">
          <label className="flex-between gap-2" style={{justifyContent: 'flex-start'}}>
            <input type="checkbox" checked={formData.isPublished} onChange={e => setFormData({...formData, isPublished: e.target.checked})} style={{width: 'auto'}} />
            Publish immediately
          </label>
        </div>

        {!isEditing && (
          <div className="form-group">
            <div className="flex-between">
              <label>Seat Layout Configuration</label>
              <button type="button" className="btn btn-sm btn-outline" onClick={addSeatRow}>+ Add Row</button>
            </div>
            <div className="seats-config">
              <div className="form-row" style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
                <span>Row (e.g. A)</span><span>Seats Count</span><span>Price (₹)</span><span></span>
              </div>
              {seatConfig.map((conf, index) => (
                <div key={index} className="form-row">
                  <input type="text" value={conf.row} onChange={e => updateSeatRow(index, 'row', e.target.value)} placeholder="Row letter" required maxLength={2} />
                  <input type="number" min="1" max="50" value={conf.count} onChange={e => updateSeatRow(index, 'count', e.target.value)} required />
                  <input type="number" min="0" value={conf.price} onChange={e => updateSeatRow(index, 'price', e.target.value)} required />
                  {seatConfig.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeSeatRow(index)}>X</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary mt-4" disabled={loading} style={{width: '100%'}}>
          {loading ? 'Saving...' : (isEditing ? 'Update Event' : 'Create Event')}
        </button>
      </form>
    </div>
  )
}

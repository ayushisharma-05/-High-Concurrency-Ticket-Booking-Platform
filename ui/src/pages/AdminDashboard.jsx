import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/dashboard')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>
  if (!data) return <div className="empty-state">Failed to load dashboard</div>

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
      </div>

      <div className="dashboard-stats">
        <div className="card stat-card">
          <div className="stat-value">{data.totalEvents}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{data.totalBookings}</div>
          <div className="stat-label">Total Bookings</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">₹{data.revenue.toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{data.soldSeats} / {data.availableSeats + data.soldSeats}</div>
          <div className="stat-label">Seats Sold</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card chart-card">
          <h3>Revenue by Event</h3>
          <div style={{ height: '300px', margin: '20px -20px 0' }}>
            {data.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>No revenue data yet</div>
            )}
          </div>
        </div>

        <div className="card chart-card">
          <h3>Recent Bookings</h3>
          {data.recentBookings && data.recentBookings.length > 0 ? (
            <div style={{ marginTop: '20px' }}>
              {data.recentBookings.map(b => (
                <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{b.event?.title || 'Unknown'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.user?.name} &bull; {b.seats.length} seats</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--cyan)' }}>₹{b.totalAmount}</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }} className={`status-badge ${b.status.toLowerCase()}`}>{b.status}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>No recent bookings</div>
          )}
        </div>
      </div>
    </div>
  )
}

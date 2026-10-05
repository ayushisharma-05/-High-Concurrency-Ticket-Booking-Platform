import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const parsed = JSON.parse(stored)
      setUser(parsed)
      axios.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password })
    setUser(data)
    localStorage.setItem('user', JSON.stringify(data))
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    return data
  }

  const register = async (name, email, password, role) => {
    const { data } = await axios.post('/api/auth/register', { name, email, password, role })
    setUser(data)
    localStorage.setItem('user', JSON.stringify(data))
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    return data
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

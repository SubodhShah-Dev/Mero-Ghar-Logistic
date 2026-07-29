import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AUTH } from '../services/api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string, role?: string) => Promise<{ ok: boolean; message?: string }>
  register: (data: { name: string; email: string; password: string; role?: string; phone?: string }) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
  isAuthenticated: boolean
  hasRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedUser = localStorage.getItem('meroGharUser')
    const storedToken = localStorage.getItem('meroGharToken')
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
      } catch {
        localStorage.removeItem('meroGharUser')
        localStorage.removeItem('meroGharToken')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string, role?: string) => {
    try {
      const res = await AUTH.login({ email, password, role })
      const data = res.data
      if (!data.success) return { ok: false, message: data.message }
      if (!data.user) return { ok: false, message: 'No user data received' }

      const userData: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        loggedIn: true,
      }

      localStorage.setItem('meroGharUser', JSON.stringify(userData))
      if (data.token) {
        localStorage.setItem('meroGharToken', data.token)
        setToken(data.token)
      }
      setUser(userData)
      return { ok: true }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Server error'
      return { ok: false, message: msg }
    }
  }, [])

  const register = useCallback(async (data: {
    name: string
    email: string
    password: string
    role?: string
    phone?: string
  }) => {
    try {
      const res = await AUTH.register(data)
      const result = res.data
      if (!result.success) return { ok: false, message: result.message }
      return { ok: true }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Server error'
      return { ok: false, message: msg }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('meroGharUser')
    localStorage.removeItem('meroGharToken')
    setUser(null)
    setToken(null)
    navigate('/login')
  }, [navigate])

  const hasRole = useCallback((...roles: string[]) => {
    return !!user && roles.includes(user.role)
  }, [user])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

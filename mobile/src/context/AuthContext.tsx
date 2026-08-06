import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AUTH } from '../services/api'

interface User {
  id: number
  name: string
  email: string
  role: 'user' | 'vendor' | 'admin'
  loggedIn: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string, role?: string) => Promise<{ ok: boolean; message?: string; role?: string }>
  register: (data: { name: string; email: string; password: string; role?: string; phone?: string }) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [storedUser, storedToken] = await Promise.all([
          AsyncStorage.getItem('meroGharUser'),
          AsyncStorage.getItem('meroGharToken'),
        ])
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser))
          setToken(storedToken)
        }
      } catch {}
      setLoading(false)
    })()
  }, [])

  const login = async (email: string, password: string, role?: string) => {
    try {
      const res = await AUTH.login({ email, password, role })
      const data = res.data
      if (!data.success) return { ok: false, message: data.message }
      const userData: User = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        loggedIn: true,
      }
      await AsyncStorage.setItem('meroGharUser', JSON.stringify(userData))
      if (data.token) {
        await AsyncStorage.setItem('meroGharToken', data.token)
        setToken(data.token)
      }
      setUser(userData)
      return { ok: true, role: data.user.role }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Server error'
      return { ok: false, message: msg }
    }
  }

  const register = async (data: { name: string; email: string; password: string; role?: string; phone?: string }) => {
    try {
      const res = await AUTH.register(data)
      if (!res.data.success) return { ok: false, message: res.data.message }
      return { ok: true }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Server error'
      return { ok: false, message: msg }
    }
  }

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem('meroGharUser'),
      AsyncStorage.removeItem('meroGharToken'),
    ])
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

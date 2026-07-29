import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      showToast('Please enter email and password', 'red')
      return
    }
    setLoading(true)
    const res = await login(email, password, role)
    setLoading(false)
    if (!res.ok) {
      showToast(res.message || 'Login failed', 'red')
      return
    }
    const user = JSON.parse(localStorage.getItem('meroGharUser') || '{}')
    const roleRoutes: Record<string, string> = { user: '/book', admin: '/admin', vendor: '/vendor' }
    navigate(roleRoutes[user.role] || '/')
  }

  return (
    <div className="min-h-screen bg-forest-950 pt-24 pb-12 flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl font-black text-cream-50 tracking-tight mb-2">
            <span className="w-9 h-9 bg-saffron-400 rounded flex items-center justify-center text-forest-900 text-lg font-black leading-none">M</span>
            Mero<span className="text-saffron-400">Ghar</span>
          </Link>
          <p className="text-forest-400 text-sm">Welcome back — log in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-forest-900 border border-forest-700 rounded-sm p-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-cream-200 text-sm font-medium mb-1.5">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 transition-colors min-h-[44px]"
              placeholder="your@email.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-cream-200 text-sm font-medium mb-1.5">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 transition-colors min-h-[44px]"
              placeholder="••••••••" />
          </div>
          <div>
            <label htmlFor="role" className="block text-cream-200 text-sm font-medium mb-1.5">Role</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm outline-none focus:border-saffron-400 transition-colors min-h-[44px]">
              <option value="user">Customer</option>
              <option value="vendor">Mover / Vendor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-sm py-3.5 rounded-sm transition-all hover:-translate-y-0.5 shadow-md min-h-[44px] disabled:opacity-50">
            {loading ? 'Logging in...' : 'Login →'}
          </button>
        </form>

        <p className="text-center mt-6 text-forest-400 text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-saffron-400 hover:text-saffron-300 font-semibold">Sign up</Link>
        </p>
      </div>
    </div>
  )
}

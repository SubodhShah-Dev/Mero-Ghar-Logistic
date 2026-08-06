import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, Star, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const demoAccounts = [
  { role: 'Customer', email: 'customer@test.com', password: 'customerpass123' },
  { role: 'Mover', email: 'vendor@test.com', password: 'vendorpass123' },
  { role: 'Admin', email: 'admin@test.com', password: 'adminpass123' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
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
    const res = await login(email, password)
    setLoading(false)
    if (!res.ok) {
      showToast(res.message || 'Login failed', 'red')
      return
    }
    const user = JSON.parse(localStorage.getItem('meroGharUser') || '{}')
    const roleRoutes: Record<string, string> = { user: '/book', admin: '/admin', vendor: '/vendor' }
    navigate(roleRoutes[user.role] || '/')
  }

  const inputCls = 'w-full bg-forest-800/70 border border-forest-600/80 rounded-sm px-4 py-3 pl-11 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 focus:ring-1 focus:ring-saffron-400/40 transition-all min-h-[44px]'

  return (
    <div className="min-h-screen bg-forest-950 pt-20 pb-12 flex items-center justify-center px-5 relative overflow-hidden">
      <div className="absolute top-32 -right-40 w-[480px] h-[480px] bg-saffron-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-forest-500/8 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl">
        <div className="grid lg:grid-cols-2 bg-forest-900/80 backdrop-blur border border-forest-700/60 rounded-xl overflow-hidden shadow-2xl shadow-black/40">
          {/* Brand panel */}
          <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-forest-900 via-forest-950 to-forest-950 border-r border-forest-800 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="login-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f5a623" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#login-grid)" />
              </svg>
            </div>

            <div className="relative">
              <span className="inline-flex items-center gap-2 text-saffron-400 text-xs font-semibold tracking-[0.22em] uppercase">
                <ShieldCheck className="w-4 h-4" /> Nepal's Trusted Moving Network
              </span>
              <h2 className="font-display font-black text-3xl text-cream-50 leading-tight mt-5">
                Move your home,<br />the <span className="text-saffron-400">easy way.</span>
              </h2>
              <ul className="mt-8 space-y-3">
                {[
                  'Verified, rated household movers',
                  'Free quote within 2 hours',
                  'Coverage across all 7 provinces',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-forest-300 text-sm">
                    <span className="w-5 h-5 bg-saffron-400/15 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-saffron-400" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex items-center gap-3">
              <div className="flex text-saffron-400">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-forest-400 text-sm">Rated 4.8/5 by 8,000+ happy movers</p>
            </div>
          </div>

          {/* Form panel */}
          <div className="p-8 sm:p-10">
            <div className="mb-7 lg:hidden">
              <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl font-black text-cream-50 tracking-tight">
                <span className="w-9 h-9 bg-saffron-400 rounded flex items-center justify-center text-forest-900 text-lg font-black leading-none">M</span>
                Mero<span className="text-saffron-400">Ghar</span>
              </Link>
            </div>

            <h1 className="font-display font-black text-2xl text-cream-50">Welcome back</h1>
            <p className="text-forest-400 text-sm mt-1.5 mb-8">Log in to continue your move</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-cream-200 text-sm font-medium mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-forest-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className={inputCls} placeholder="your@email.com" autoComplete="email" />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-cream-200 text-sm font-medium mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-forest-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input id="password" type={showPassword ? 'text' : 'password'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className={inputCls + ' pr-12'} placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-forest-400 hover:text-cream-100 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-sm py-3.5 rounded-sm transition-all hover:-translate-y-0.5 shadow-md shadow-saffron-600/20 min-h-[44px] disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2">
                {loading ? 'Logging in...' : <><span>Login</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <button onClick={() => setShowDemo(!showDemo)}
              className="mt-5 w-full text-center text-forest-500 text-xs hover:text-forest-300 transition-colors">
              {showDemo ? 'Hide demo accounts' : 'Need test credentials? Show demo accounts'}
            </button>

            {showDemo && (
              <div className="mt-3 rounded-sm border border-saffron-400/25 bg-saffron-400/5 overflow-hidden animate-slide-in">
                {demoAccounts.map((a) => (
                  <button key={a.role} onClick={() => { setEmail(a.email); setPassword(a.password) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-saffron-400/10 transition-colors flex items-center justify-between gap-3 border-b border-saffron-400/10 last:border-0">
                    <span className="text-xs text-cream-200 font-medium">{a.role}</span>
                    <span className="text-[11px] text-forest-400">{a.email} · {a.password}</span>
                  </button>
                ))}
              </div>
            )}

            <p className="text-center mt-6 text-forest-400 text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-saffron-400 hover:text-saffron-300 font-semibold">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password || !confirmPassword) {
      showToast('Please fill in all fields.', 'red')
      return
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'red')
      return
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'red')
      return
    }
    setLoading(true)
    const res = await register({ name, email, password, role, phone: phone || undefined })
    setLoading(false)
    if (!res.ok) {
      showToast(res.message || 'Signup failed', 'red')
      return
    }
    showToast('Signup successful! Please login.', 'green')
    setTimeout(() => navigate('/login'), 1500)
  }

  return (
    <div className="min-h-screen bg-forest-950 pt-24 pb-12 flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl font-black text-cream-50 tracking-tight mb-2">
            <span className="w-9 h-9 bg-saffron-400 rounded flex items-center justify-center text-forest-900 text-lg font-black leading-none">M</span>
            Mero<span className="text-saffron-400">Ghar</span>
          </Link>
          <p className="text-forest-400 text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-forest-900 border border-forest-700 rounded-sm p-8 space-y-5">
          <div>
            <label htmlFor="signupName" className="block text-cream-200 text-sm font-medium mb-1.5">Full Name</label>
            <input id="signupName" type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 transition-colors min-h-[44px]"
              placeholder="Ram Sharma" />
          </div>
          <div>
            <label htmlFor="signupEmail" className="block text-cream-200 text-sm font-medium mb-1.5">Email</label>
            <input id="signupEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 transition-colors min-h-[44px]"
              placeholder="your@email.com" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-cream-200 text-sm font-medium mb-1.5">Phone (optional)</label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 transition-colors min-h-[44px]"
              placeholder="98XXXXXXXX" pattern="[0-9]{10}" maxLength={10} />
          </div>
          <div>
            <label htmlFor="signupPassword" className="block text-cream-200 text-sm font-medium mb-1.5">Password</label>
            <input id="signupPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 transition-colors min-h-[44px]"
              placeholder="Min 6 characters" />
          </div>
          <div>
            <label htmlFor="signupConfirmPassword" className="block text-cream-200 text-sm font-medium mb-1.5">Confirm Password</label>
            <input id="signupConfirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 transition-colors min-h-[44px]"
              placeholder="Same as above" />
          </div>
          <div>
            <span className="block text-cream-200 text-sm font-medium mb-2">I am a...</span>
            <div className="flex gap-4">
              {[
                { value: 'user', label: 'Customer' },
                { value: 'vendor', label: 'Mover' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" value={opt.value} checked={role === opt.value}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-4 h-4 accent-saffron-400" />
                  <span className="text-cream-200 text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-sm py-3.5 rounded-sm transition-all hover:-translate-y-0.5 shadow-md min-h-[44px] disabled:opacity-50">
            {loading ? 'Creating account...' : 'Sign Up →'}
          </button>
        </form>

        <p className="text-center mt-6 text-forest-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-saffron-400 hover:text-saffron-300 font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  )
}

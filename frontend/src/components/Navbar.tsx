import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Phone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const isHome = location.pathname === '/'

  const navLinks = [
    { label: 'Services', href: isHome ? '#services' : '/#services' },
    { label: 'How It Works', href: isHome ? '#how' : '/#how' },
    { label: 'Coverage', href: isHome ? '#provinces' : '/#provinces' },
    { label: 'Reviews', href: isHome ? '#reviews' : '/#reviews' },
    { label: 'FAQ', href: isHome ? '#faq' : '/#faq' },
  ]

  const dashboardLink = () => {
    if (!user) return null
    if (user.role === 'admin') return '/admin'
    if (user.role === 'vendor') return '/vendor'
    if (user.role === 'user') return '/book'
    return null
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-forest-900 border-b border-forest-800 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-black text-cream-50 tracking-tight">
            <span className="w-8 h-8 bg-saffron-400 rounded flex items-center justify-center text-forest-900 text-sm font-black leading-none">M</span>
            Mero<span className="text-saffron-400">Ghar</span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-forest-300 text-sm font-medium hover:text-cream-50 transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a href="tel:+977980000000" className="text-forest-400 text-xs hover:text-cream-100 transition-colors flex items-center gap-1">
              <Phone className="w-3 h-3" /> +977 980-000-000
            </a>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={dashboardLink() || '/'}
                  className="bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-sm px-5 py-2.5 rounded-sm transition-all hover:-translate-y-0.5 shadow-md shadow-saffron-600/20"
                >
                  Dashboard →
                </Link>
                <button onClick={logout} className="text-forest-400 text-xs hover:text-cream-100 transition-colors">
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-sm px-5 py-2.5 rounded-sm transition-all hover:-translate-y-0.5 shadow-md shadow-saffron-600/20"
              >
                Login →
              </Link>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-cream-100 p-3" aria-label="Menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="bg-forest-900 border-t border-forest-800 shadow-xl shadow-black/40 md:hidden">
          <div className="max-w-7xl mx-auto px-5 lg:px-10 py-4 space-y-1">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="block px-2 py-3 text-forest-300 text-sm font-medium hover:text-cream-50">
                {l.label}
              </a>
            ))}
            <div className="pt-2 pb-1">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <Link to={dashboardLink() || '/'} onClick={() => setMobileOpen(false)}
                    className="block bg-saffron-400 text-forest-900 font-bold text-sm px-5 py-3 rounded-sm text-center">
                    Dashboard →
                  </Link>
                  <button onClick={() => { logout(); setMobileOpen(false) }}
                    className="block w-full text-center text-forest-400 text-sm py-2">
                    Logout
                  </button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="block bg-saffron-400 text-forest-900 font-bold text-sm px-5 py-3 rounded-sm text-center">
                  Login →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

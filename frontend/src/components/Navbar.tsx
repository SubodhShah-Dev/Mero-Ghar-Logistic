import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Phone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

type PageKind = 'home' | 'auth' | 'book' | 'bookings' | 'admin' | 'vendor' | 'notfound'

function pageKind(pathname: string): PageKind {
  switch (pathname) {
    case '/': return 'home'
    case '/login':
    case '/signup': return 'auth'
    case '/book': return 'book'
    case '/my-bookings': return 'bookings'
    case '/admin': return 'admin'
    case '/vendor': return 'vendor'
    default: return 'notfound'
  }
}

type NavAction =
  | { kind: 'link'; label: string; to: string }
  | { kind: 'cta'; label: string; to: string }
  | { kind: 'button'; label: string; onClick: () => void }

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'How It Works', href: '#how' },
  { label: 'Coverage', href: '#provinces' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'FAQ', href: '#faq' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, isAuthenticated, loading, logout } = useAuth()
  const location = useLocation()
  const kind = pageKind(location.pathname)
  const isHome = kind === 'home'

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const dashboardLink = () => {
    if (!user) return null
    if (user.role === 'admin') return '/admin'
    if (user.role === 'vendor') return '/vendor'
    if (user.role === 'user') return '/book'
    return null
  }

  let actions: NavAction[] = []

  if (!loading) {
    if (isAuthenticated) {
      const dash = dashboardLink()
      switch (kind) {
        case 'book':
          actions.push(
            user?.role === 'user'
              ? { kind: 'link', label: 'My Bookings', to: '/my-bookings' }
              : { kind: 'link', label: 'View Site', to: '/' },
          )
          break
        case 'bookings':
          actions.push({ kind: 'cta', label: 'Book a Move →', to: '/book' })
          break
        case 'admin':
        case 'vendor':
          actions.push({ kind: 'link', label: 'View Site', to: '/' })
          break
        case 'auth':
          if (dash) actions.push({ kind: 'cta', label: 'Dashboard →', to: dash })
          break
        case 'notfound':
          actions.push({ kind: 'link', label: 'Home', to: '/' })
          break
        default:
          if (dash) actions.push({ kind: 'cta', label: 'Dashboard →', to: dash })
      }
      actions.push({ kind: 'button', label: 'Logout', onClick: logout })
    } else {
      switch (kind) {
        case 'auth': {
          const isLogin = location.pathname === '/login'
          actions.push(
            isLogin
              ? { kind: 'cta', label: 'Sign Up →', to: '/signup' }
              : { kind: 'cta', label: 'Login →', to: '/login' },
          )
          break
        }
        case 'bookings':
          actions.push({ kind: 'cta', label: 'Book a Move →', to: '/book' })
          actions.push({ kind: 'link', label: 'Login', to: '/login' })
          break
        case 'notfound':
          actions.push({ kind: 'link', label: 'Home', to: '/' })
          actions.push({ kind: 'cta', label: 'Login →', to: '/login' })
          break
        default:
          actions.push({ kind: 'cta', label: 'Login →', to: '/login' })
      }
    }
  }

  const renderAction = (a: NavAction, mobile = false, onNavigate?: () => void) => {
    switch (a.kind) {
      case 'link':
        return (
          <Link key={a.label} to={a.to} onClick={onNavigate}
            className={mobile
              ? 'block px-2 py-3 text-forest-300 text-sm font-medium hover:text-cream-50 transition-colors'
              : 'text-forest-300 text-sm font-medium hover:text-cream-50 transition-colors relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-saffron-400 hover:after:w-full after:transition-all after:duration-300'}>
            {a.label}
          </Link>
        )
      case 'cta':
        return (
          <Link key={a.label} to={a.to} onClick={onNavigate}
            className={mobile
              ? 'block bg-saffron-400 text-forest-900 font-bold text-sm px-5 py-3 rounded-sm text-center'
              : 'bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-sm px-5 py-2.5 rounded-sm transition-all hover:-translate-y-0.5 shadow-md shadow-saffron-600/20'}>
            {a.label}
          </Link>
        )
      case 'button':
        return (
          <button key={a.label} onClick={() => { onNavigate?.(); a.onClick() }}
            className={mobile
              ? 'block w-full text-center text-forest-400 text-sm py-2'
              : 'text-forest-400 text-xs hover:text-cream-100 transition-colors'}>
            {a.label}
          </button>
        )
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-forest-900/85 backdrop-blur-xl border-b border-forest-800/60 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-black text-cream-50 tracking-tight group">
            <span className="w-8 h-8 bg-saffron-400 rounded flex items-center justify-center text-forest-900 text-sm font-black leading-none transition-transform group-hover:scale-110">
              M
            </span>
            Mero<span className="text-saffron-400">Ghar</span>
          </Link>

          {isHome && (
            <div className="hidden md:flex items-center gap-7">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href}
                  className="text-forest-300 text-sm font-medium hover:text-cream-50 transition-colors relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-saffron-400 hover:after:w-full after:transition-all after:duration-300">
                  {l.label}
                </a>
              ))}
            </div>
          )}

          <div className="hidden md:flex items-center gap-4">
            {isHome && (
              <a href="tel:+977980000000"
                className="text-forest-400 text-xs hover:text-cream-100 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-sm border border-forest-700/70 hover:border-forest-500">
                <Phone className="w-3 h-3 text-saffron-400" /> +977 980-000-000
              </a>
            )}
            {loading ? (
              <div className="w-24 h-9 bg-forest-800 rounded-sm animate-pulse" />
            ) : (
              actions.map((a) => renderAction(a))
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-cream-100 p-3 transition-transform hover:scale-105" aria-label="Menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-forest-900/95 backdrop-blur-xl border-t border-forest-800 shadow-xl shadow-black/40">
          <div className="max-w-7xl mx-auto px-5 lg:px-10 py-4 space-y-1">
            {isHome && navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="block px-2 py-3 text-forest-300 text-sm font-medium hover:text-cream-50">
                {l.label}
              </a>
            ))}
            <div className="pt-2 pb-1 space-y-2">
              {!loading && actions.map((a) => renderAction(a, true, () => setMobileOpen(false)))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

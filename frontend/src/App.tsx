import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import GoToTop from './components/GoToTop'
import MeroBot from './components/MeroBot'
import UpdateDialog from './components/UpdateDialog'
import ErrorBoundary from './components/ErrorBoundary'
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const BookingPage = lazy(() => import('./pages/BookingPage'))
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const VendorPage = lazy(() => import('./pages/VendorPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-forest-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-forest-700 border-t-saffron-400 rounded-full animate-spin" />
    </div>
  )
}

function AppContent() {
  return (
    <ErrorBoundary>
      <Navbar />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/book" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/admin" element={<RoleRoute roles={['admin']}><AdminPage /></RoleRoute>} />
          <Route path="/vendor" element={<RoleRoute roles={['vendor']}><VendorPage /></RoleRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Footer />
      <GoToTop />
      <MeroBot />
      <UpdateDialog />
    </ErrorBoundary>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App

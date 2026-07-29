import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import GoToTop from './components/GoToTop'
import MeroBot from './components/MeroBot'
import UpdateDialog from './components/UpdateDialog'
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import BookingPage from './pages/BookingPage'
import MyBookingsPage from './pages/MyBookingsPage'
import AdminPage from './pages/AdminPage'
import VendorPage from './pages/VendorPage'

function AppContent() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/book" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/admin" element={<RoleRoute roles={['admin']}><AdminPage /></RoleRoute>} />
        <Route path="/vendor" element={<RoleRoute roles={['vendor']}><VendorPage /></RoleRoute>} />
      </Routes>
      <Footer />
      <GoToTop />
      <MeroBot />
      <UpdateDialog />
    </>
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

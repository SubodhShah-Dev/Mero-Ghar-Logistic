import { useState, useEffect } from 'react'
import { Package, Clock } from 'lucide-react'
import { SHIPMENTS } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { Shipment } from '../types'

const statusColors: Record<string, string> = {
  pending: 'bg-saffron-400/20 text-saffron-300',
  accepted: 'bg-blue-400/20 text-blue-300',
  in_transit: 'bg-purple-400/20 text-purple-300',
  delivered: 'bg-green-400/20 text-green-300',
  cancelled: 'bg-red-400/20 text-red-300',
}

export default function MyBookingsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const { user } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    loadShipments()
    // Runs once per sign-in; email lookups are triggered by the Search button below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadShipments = async () => {
    setLoading(true)
    try {
      if (user) {
        const res = await SHIPMENTS.getMy()
        setShipments(res.data.shipments || [])
      } else if (email) {
        const res = await SHIPMENTS.getByEmail(email)
        setShipments(res.data.shipments || [])
      }
    } catch {
      showToast('Failed to load bookings', 'red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-forest-950 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-5">
        <div className="flex items-center gap-3 mb-8">
          <Package className="w-6 h-6 text-saffron-400" />
          <h1 className="font-display font-black text-2xl text-cream-50">My Bookings</h1>
        </div>

        {!user && (
          <div className="bg-forest-900 border border-forest-700 rounded-sm p-6 mb-6">
            <p className="text-cream-200 text-sm mb-3">Enter your email to find your bookings</p>
            <div className="flex gap-3">
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm outline-none focus:border-saffron-400"
                placeholder="your@email.com" />
              <button onClick={loadShipments}
                className="bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold px-5 py-3 rounded-sm text-sm transition-all min-h-[44px]">
                Search
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-3 border-saffron-400/20 border-t-saffron-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-forest-400 text-sm">Loading bookings...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-16 bg-forest-900 border border-forest-700 rounded-sm">
            <Clock className="w-12 h-12 text-forest-600 mx-auto mb-4" />
            <p className="text-forest-400 text-sm">No bookings found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shipments.map((s) => (
              <div key={s.id} className="bg-forest-900 border border-forest-700 rounded-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-display font-bold text-cream-50 text-lg">{s.booking_id}</p>
                    <p className="text-forest-400 text-xs mt-0.5">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-sm text-xs font-semibold ${statusColors[s.status] || 'bg-forest-700 text-forest-300'}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-forest-500 text-xs uppercase tracking-wide mb-0.5">From</p>
                    <p className="text-cream-200">{s.pickup_city}, {s.pickup_district}</p>
                  </div>
                  <div>
                    <p className="text-forest-500 text-xs uppercase tracking-wide mb-0.5">To</p>
                    <p className="text-cream-200">{s.drop_city}, {s.drop_district}</p>
                  </div>
                  {s.vendor_name && (
                    <div>
                      <p className="text-forest-500 text-xs uppercase tracking-wide mb-0.5">Mover</p>
                      <p className="text-cream-200">{s.vendor_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-forest-500 text-xs uppercase tracking-wide mb-0.5">Vehicle</p>
                    <p className="text-cream-200">{s.vehicle_type}</p>
                  </div>
                  {s.final_quote && (
                    <div>
                      <p className="text-forest-500 text-xs uppercase tracking-wide mb-0.5">Quote</p>
                      <p className="text-saffron-400 font-bold">NPR {s.final_quote.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

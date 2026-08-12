import { useState, useCallback, useMemo } from 'react'
import { Truck, Package, Plus, X, User, Ticket, Star, Send, MessageCircle, MapPin, ChevronDown, ChevronUp, Wallet } from 'lucide-react'
import { VENDOR, TICKETS } from '../services/api'
import { useToast } from '../context/ToastContext'
import ChatPanel from '../components/ChatPanel'
import { ChartCard, Bars } from '../components/charts'
import { provinces, districtsByProvince } from '../utils/nepal'
import type { Shipment, Vehicle, SupportTicket, VendorRoute } from '../types'

type Tab = 'jobs' | 'claim' | 'fleet' | 'tickets' | 'profile'

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-saffron-400/20 text-saffron-300',
    accepted: 'bg-blue-400/20 text-blue-300',
    in_transit: 'bg-purple-400/20 text-purple-300',
    delivered: 'bg-green-400/20 text-green-300',
    cancelled: 'bg-red-400/20 text-red-300',
  }
  return map[status] || 'bg-forest-700 text-forest-300'
}

const jobStatusFilter = ['all', 'pending', 'accepted', 'in_transit', 'delivered', 'cancelled']

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const money = (value: number) => `NPR ${value.toLocaleString()}`

const parseList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string' || !value) return []
  let cur: unknown = value
  for (let i = 0; i < 3; i++) {
    try { cur = JSON.parse(cur as string) } catch { break }
  }
  if (Array.isArray(cur)) return cur.map(String)
  return typeof cur === 'string' && cur ? [cur] : []
}

export default function VendorPage() {
  const [tab, setTab] = useState<Tab>('jobs')
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [available, setAvailable] = useState<Shipment[]>([])
  const [chatFor, setChatFor] = useState<number | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [profile, setProfile] = useState({
    business_name: '', owner_name: '', phone: '', email: '', service_region: '', address: '', rating: 0, total_jobs: 0,
  })
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [routes, setRoutes] = useState<VendorRoute[]>([])
  const [routeDraft, setRouteDraft] = useState({ from_province: '', from_district: '', to_province: '', to_district: '' })
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketMessage, setTicketMessage] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [newVehicle, setNewVehicle] = useState({ name: '', plate_number: '', vehicle_type: '', capacity_tonnes: 0, driver_name: '', driver_phone: '' })
  const { showToast } = useToast()

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [sRes, vRes, pRes, tRes, aRes, rRes] = await Promise.allSettled([
      VENDOR.getShipments(),
      VENDOR.getVehicles(),
      VENDOR.getProfile(),
      TICKETS.getMine(),
      VENDOR.getAvailable(),
      VENDOR.getRoutes(),
    ])
    if (sRes.status === 'fulfilled') setShipments(sRes.value.data.shipments || [])
    if (vRes.status === 'fulfilled') setVehicles(vRes.value.data.vehicles || [])
    if (pRes.status === 'fulfilled' && pRes.value.data.vendor) setProfile(pRes.value.data.vendor)
    if (tRes.status === 'fulfilled') setTickets(tRes.value.data.tickets || [])
    if (aRes.status === 'fulfilled') setAvailable(aRes.value.data.shipments || [])
    if (rRes.status === 'fulfilled') setRoutes(rRes.value.data.routes || [])
    const failed = [sRes, vRes, pRes, tRes, aRes, rRes].filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      showToast(`Failed to load ${failed} of 6 data sources`, 'red')
    }
    setLoading(false)
  }, [showToast])

  const updateShipmentStatus = async (id: number, action: string) => {
    try {
      const actions: Record<string, () => Promise<unknown>> = {
        accept: () => VENDOR.acceptShipment(id),
        start: () => VENDOR.startDelivery(id),
        complete: () => VENDOR.completeDelivery(id),
        reject: () => VENDOR.rejectShipment(id),
      }
      if (actions[action]) {
        await actions[action]()
        const verbs: Record<string, string> = { accept: 'accepted', start: 'started', complete: 'completed', reject: 'rejected' }
        showToast(`Job ${verbs[action] || action}`, 'green')
        loadAll()
      }
    } catch { showToast('Failed to update', 'red') }
  }

  const claimJob = async (id: number) => {
    try {
      await VENDOR.claim(id)
      showToast('Job claimed — it is now in your Jobs', 'green')
      loadAll()
    } catch { showToast('Failed to claim job', 'red') }
  }

  const addVehicle = async () => {
    try {
      await VENDOR.addVehicle(newVehicle)
      showToast('Vehicle added', 'green')
      setShowAddVehicle(false)
      setNewVehicle({ name: '', plate_number: '', vehicle_type: '', capacity_tonnes: 0, driver_name: '', driver_phone: '' })
      loadAll()
    } catch { showToast('Failed to add vehicle', 'red') }
  }

  const deleteVehicle = async (id: number) => {
    try {
      await VENDOR.deleteVehicle(id)
      showToast('Vehicle removed', 'green')
      loadAll()
    } catch { showToast('Failed to remove vehicle', 'red') }
  }

  const toggleVehicleStatus = async (id: number, status: string) => {
    try {
      await VENDOR.updateVehicleStatus(id, status)
      showToast(`Vehicle set to ${status}`, 'green')
      loadAll()
    } catch { showToast('Failed to update vehicle', 'red') }
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      await VENDOR.updateProfile({
        business_name: profile.business_name,
        owner_name: profile.owner_name,
        phone: profile.phone,
        service_region: profile.service_region,
        address: profile.address,
      })
      showToast('Profile updated', 'green')
      loadAll()
    } catch {
      showToast('Failed to update profile', 'red')
    } finally {
      setSavingProfile(false)
    }
  }

  const addRoute = async () => {
    if (!routeDraft.from_province || !routeDraft.to_province) {
      showToast('Pick both pickup and drop provinces', 'red')
      return
    }
    try {
      await VENDOR.addRoute(routeDraft)
      showToast('Route added', 'green')
      setRouteDraft({ from_province: '', from_district: '', to_province: '', to_district: '' })
      loadAll()
    } catch {
      showToast('Failed to add route', 'red')
    }
  }

  const removeRoute = async (id: number) => {
    try {
      await VENDOR.removeRoute(id)
      showToast('Route removed', 'green')
      loadAll()
    } catch {
      showToast('Failed to remove route', 'red')
    }
  }

  const submitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      showToast('Subject and message are required', 'red')
      return
    }
    try {
      await TICKETS.submit({ subject: ticketSubject.trim(), message: ticketMessage.trim() })
      showToast('Ticket submitted', 'green')
      setTicketSubject('')
      setTicketMessage('')
      loadAll()
    } catch {
      showToast('Failed to submit ticket', 'red')
    }
  }

  const tabs = [
    { id: 'jobs' as Tab, icon: Package, label: 'Jobs' },
    { id: 'claim' as Tab, icon: MessageCircle, label: 'Claim Pool' },
    { id: 'fleet' as Tab, icon: Truck, label: 'Fleet' },
    { id: 'tickets' as Tab, icon: Ticket, label: 'Support' },
    { id: 'profile' as Tab, icon: User, label: 'Profile' },
  ]

  const inputCls = 'w-full bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 transition-colors min-h-[44px]'

  const activeJobs = shipments.filter((s) => ['accepted', 'in_transit'].includes(s.status)).length
  const deliveredJobs = shipments.filter((s) => s.status === 'delivered').length
  const availableVehicles = vehicles.filter((v) => v.status === 'available').length
  const totalEarned = shipments
    .filter((s) => s.status === 'delivered' && s.final_quote)
    .reduce((sum, s) => sum + (s.final_quote || 0), 0)
  const completionRate = shipments.length > 0
    ? Math.round((deliveredJobs / shipments.length) * 100)
    : 0

  const visibleJobs = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? shipments
      : shipments.filter((s) => s.status === statusFilter)
    return [...filtered].sort((a, b) => {
      const da = a.move_date ? new Date(a.move_date).getTime() : 0
      const db = b.move_date ? new Date(b.move_date).getTime() : 0
      if (da !== db) return da - db
      return (a.id || 0) - (b.id || 0)
    })
  }, [shipments, statusFilter])

  const earnings = useMemo(() => {
    const now = new Date()
    const months: { label: string; key: string; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ label: d.toLocaleString('en', { month: 'short' }), key: monthKey(d), value: 0 })
    }
    const byMonth = new Map<string, number>()
    for (const s of shipments) {
      if (s.status !== 'delivered' || !s.final_quote || !s.created_at) continue
      const key = monthKey(new Date(s.created_at))
      byMonth.set(key, (byMonth.get(key) || 0) + (s.final_quote || 0))
    }
    for (const m of months) m.value = byMonth.get(m.key) || 0
    return months
  }, [shipments])

  const pickupFull = (s: Shipment) =>
    [s.pickup_ward, s.pickup_city, s.pickup_district, s.pickup_province].filter(Boolean).join(', ')
  const dropFull = (s: Shipment) =>
    [s.drop_ward, s.drop_city, s.drop_district, s.drop_province].filter(Boolean).join(', ')

  if (loading) {
    return (
      <div className="min-h-screen bg-forest-950 pt-24 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-saffron-400/20 border-t-saffron-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-forest-950 pt-20">
      <div className="max-w-7xl mx-auto px-5 lg:px-10 flex gap-6">
        <aside className="hidden md:block w-56 shrink-0 pt-6">
          <div className="space-y-1 sticky top-24">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium transition-all text-left ${
                  tab === t.id ? 'bg-saffron-400/10 text-saffron-400' : 'text-forest-400 hover:text-cream-50 hover:bg-forest-800'
                }`}>
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="md:hidden flex gap-1 overflow-x-auto pt-4 pb-2 w-full">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-sm text-xs font-medium transition-all ${
                tab === t.id ? 'bg-saffron-400/10 text-saffron-400' : 'bg-forest-800 text-forest-400'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <main className="flex-1 pt-6 pb-12 min-w-0">
          {tab === 'jobs' && (
            <div className="space-y-6">
              <h1 className="font-display font-black text-2xl text-cream-50">My Jobs</h1>

              {/* Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Active Jobs', value: activeJobs, color: 'bg-blue-400/10 border-blue-400/30 text-blue-400' },
                  { label: 'Delivered', value: deliveredJobs, color: 'bg-green-400/10 border-green-400/30 text-green-400' },
                  { label: 'Available Fleet', value: `${availableVehicles}/${vehicles.length}`, color: 'bg-teal-400/10 border-teal-400/30 text-teal-400' },
                  { label: 'Completion Rate', value: `${completionRate}%`, color: 'bg-purple-400/10 border-purple-400/30 text-purple-400' },
                ].map((s) => (
                  <div key={s.label} className={`${s.color} border rounded-sm p-5`}>
                    <p className="text-xl font-black">{s.value}</p>
                    <p className="text-xs mt-1 opacity-80">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Earnings */}
              <ChartCard
                title="Monthly Earnings"
                subtitle="Delivered jobs, last 6 months"
                action={
                  <div className="flex items-center gap-2 bg-saffron-400/10 border border-saffron-400/30 text-saffron-400 px-3 py-1.5 rounded-sm">
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm font-black">{money(totalEarned)}</span>
                    <span className="text-xs opacity-80">earned</span>
                  </div>
                }
              >
                {earnings.some((m) => m.value > 0)
                  ? <Bars data={earnings} format={money} />
                  : <p className="text-forest-400 text-sm">No delivered jobs yet — earnings appear here once you complete moves.</p>}
              </ChartCard>

              {/* Status filter */}
              <div className="flex gap-1 flex-wrap">
                {jobStatusFilter.map((opt) => (
                  <button key={opt} onClick={() => setStatusFilter(opt)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all capitalize ${
                      statusFilter === opt ? 'bg-saffron-400 text-forest-900' : 'bg-forest-800 text-forest-400 hover:text-cream-50'
                    }`}>
                    {opt.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {visibleJobs.length === 0 ? (
                <p className="text-forest-400 text-sm">No jobs{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''} assigned yet.</p>
              ) : (
                <div className="space-y-4">
                  {visibleJobs.map((s) => (
                    <div key={s.id} className="bg-forest-900 border border-forest-700 rounded-sm p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="font-semibold text-cream-50 text-sm">{s.booking_id}</p>
                          <p className="text-forest-400 text-xs">{s.pickup_city} → {s.drop_city}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded text-xs font-medium ${statusBadge(s.status)}`}>{s.status}</span>
                      </div>

                      {/* Progress strip */}
                      {['pending', 'accepted', 'in_transit'].includes(s.status) && (
                        <div className="flex items-center gap-1 mb-4">
                          {['pending', 'accepted', 'in_transit', 'delivered'].map((step, i) => {
                            const order = ['pending', 'accepted', 'in_transit', 'delivered']
                            const done = order.indexOf(s.status) >= i
                            return (
                              <div key={step} className="flex-1 flex items-center gap-1">
                                <div className={`flex-1 h-1 rounded ${done ? 'bg-saffron-400' : 'bg-forest-700'}`} />
                                <span className={`text-[10px] capitalize ${done ? 'text-saffron-300' : 'text-forest-600'}`}>
                                  {step.replace('_', ' ')}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm text-forest-300 mb-4">
                        <div><span className="text-forest-500">Customer:</span> {s.first_name} {s.last_name}</div>
                        <div><span className="text-forest-500">Phone:</span> {s.mobile_number}</div>
                        <div><span className="text-forest-500">Move Date:</span> {s.move_date}</div>
                        <div><span className="text-forest-500">Vehicle:</span> {s.vehicle_type}</div>
                        {s.final_quote ? <div><span className="text-forest-500">Quote:</span> NPR {s.final_quote.toLocaleString()}</div> : null}
                        {s.payment_status ? <div><span className="text-forest-500">Payment:</span> <span className="capitalize">{s.payment_status}</span></div> : null}
                      </div>

                      {expandedId === s.id && (
                        <div className="grid sm:grid-cols-2 gap-3 text-sm text-forest-300 border-t border-forest-700 pt-4 mb-4">
                          <div>
                            <p className="text-forest-500 text-xs uppercase tracking-wide mb-1">Pickup</p>
                            <p className="text-cream-200">{s.pickup_address || pickupFull(s)}</p>
                            {s.pickup_floor && <p className="text-forest-400 text-xs mt-0.5">Floor: {s.pickup_floor} · Lane access: {s.pickup_lane_access || '—'}</p>}
                          </div>
                          <div>
                            <p className="text-forest-500 text-xs uppercase tracking-wide mb-1">Drop-off</p>
                            <p className="text-cream-200">{s.drop_address || dropFull(s)}</p>
                            {s.drop_floor && <p className="text-forest-400 text-xs mt-0.5">Floor: {s.drop_floor}</p>}
                          </div>
                          {s.selected_items && (
                            <div><span className="text-forest-500">Items:</span> {parseList(s.selected_items).join(', ') || '—'}</div>
                          )}
                          {s.add_on_services && <div><span className="text-forest-500">Add-ons:</span> {parseList(s.add_on_services).join(', ') || '—'}</div>}
                          {s.special_notes && <div className="sm:col-span-2"><span className="text-forest-500">Notes:</span> {s.special_notes}</div>}
                          {s.alternate_mobile && <div><span className="text-forest-500">Alt Phone:</span> {s.alternate_mobile}</div>}
                          {s.preferred_time_slot && <div><span className="text-forest-500">Time Slot:</span> {s.preferred_time_slot}</div>}
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {s.status === 'pending' && (
                          <>
                            <button onClick={() => updateShipmentStatus(s.id, 'accept')}
                              className="bg-green-400/20 text-green-300 px-4 py-2 rounded-sm text-xs font-medium hover:bg-green-400/30 transition-colors">Accept</button>
                            <button onClick={() => updateShipmentStatus(s.id, 'reject')}
                              className="bg-red-400/20 text-red-300 px-4 py-2 rounded-sm text-xs font-medium hover:bg-red-400/30 transition-colors">Reject</button>
                          </>
                        )}
                        {s.status === 'accepted' && (
                          <button onClick={() => updateShipmentStatus(s.id, 'start')}
                            className="bg-saffron-400/20 text-saffron-300 px-4 py-2 rounded-sm text-xs font-medium hover:bg-saffron-400/30 transition-colors">Start Delivery</button>
                        )}
                        {s.status === 'in_transit' && (
                          <button onClick={() => updateShipmentStatus(s.id, 'complete')}
                            className="bg-green-400/20 text-green-300 px-4 py-2 rounded-sm text-xs font-medium hover:bg-green-400/30 transition-colors">Mark Delivered</button>
                        )}
                        <button onClick={() => setChatFor(s.id)}
                          className="flex items-center gap-1.5 bg-blue-400/20 text-blue-300 px-4 py-2 rounded-sm text-xs font-medium hover:bg-blue-400/30 transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" /> Chat
                        </button>
                        <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                          className="flex items-center gap-1.5 bg-forest-800 text-forest-300 px-4 py-2 rounded-sm text-xs font-medium hover:bg-forest-700 transition-colors">
                          {expandedId === s.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {expandedId === s.id ? 'Less' : 'Details'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'claim' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display font-black text-2xl text-cream-50">Claim Pool</h1>
                <p className="text-forest-400 text-sm mt-1">
                  Bookings no mover could auto-assign. Match your vehicle type, then claim one to take the job.
                </p>
              </div>

              {available.length === 0 ? (
                <div className="bg-forest-900 border border-forest-700 rounded-sm p-10 text-center">
                  <MapPin className="w-10 h-10 text-forest-600 mx-auto mb-3" />
                  <p className="text-forest-400 text-sm">Nothing in the pool right now.</p>
                  <p className="text-forest-500 text-xs mt-1">Check back later for new bookings.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {available.map((s) => (
                    <div key={s.id} className="bg-forest-900 border border-forest-700 rounded-sm p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="font-semibold text-cream-50 text-sm">{s.booking_id}</p>
                          <p className="text-forest-400 text-xs">{s.pickup_city} → {s.drop_city}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded text-xs font-medium bg-saffron-400/20 text-saffron-300">Available</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm text-forest-300 mb-4">
                        <div><span className="text-forest-500">Customer:</span> {s.first_name} {s.last_name}</div>
                        <div><span className="text-forest-500">Phone:</span> {s.mobile_number}</div>
                        <div><span className="text-forest-500">Move Date:</span> {s.move_date}</div>
                        <div><span className="text-forest-500">Vehicle:</span> {s.vehicle_type}</div>
                        <div className="col-span-2"><span className="text-forest-500">Route:</span> {s.pickup_province} → {s.drop_province}</div>
                        {s.home_size ? <div><span className="text-forest-500">Home Size:</span> {s.home_size}</div> : null}
                        {s.final_quote ? <div><span className="text-forest-500">Quote:</span> NPR {s.final_quote.toLocaleString()}</div> : null}
                      </div>
                      <button onClick={() => claimJob(s.id)}
                        className="flex items-center gap-2 bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold px-5 py-2.5 rounded-sm text-sm transition-all min-h-[44px]">
                        <Package className="w-4 h-4" /> Claim Job
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'fleet' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-display font-black text-2xl text-cream-50">My Fleet</h1>
                <button onClick={() => setShowAddVehicle(true)}
                  className="flex items-center gap-2 bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold px-4 py-2.5 rounded-sm text-sm transition-all min-h-[44px]">
                  <Plus className="w-4 h-4" /> Add Vehicle
                </button>
              </div>
              {vehicles.length === 0 ? (
                <p className="text-forest-400 text-sm">No vehicles registered.</p>
              ) : (
                <div className="grid gap-4">
                  {vehicles.map((v) => (
                    <div key={v.id} className="bg-forest-900 border border-forest-700 rounded-sm p-5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-cream-50 text-sm">{v.name} ({v.plate_number})</p>
                        <p className="text-forest-400 text-xs mt-0.5">{v.vehicle_type} · {v.capacity_tonnes}t · Driver: {v.driver_name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                          v.status === 'available' ? 'bg-green-400/20 text-green-300' :
                          v.status === 'in_use' ? 'bg-saffron-400/20 text-saffron-300' :
                          'bg-red-400/20 text-red-300'
                        }`}>{v.status}</span>
                        {v.status === 'available' ? (
                          <button onClick={() => toggleVehicleStatus(v.id, 'maintenance')}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-saffron-400/20 text-saffron-300 hover:bg-saffron-400/30 transition-colors">
                            Set Maintenance
                          </button>
                        ) : v.status === 'maintenance' ? (
                          <button onClick={() => toggleVehicleStatus(v.id, 'available')}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-green-400/20 text-green-300 hover:bg-green-400/30 transition-colors">
                            Mark Available
                          </button>
                        ) : null}
                        <button onClick={() => deleteVehicle(v.id)}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showAddVehicle && (
                <div className="fixed inset-0 z-50 bg-black/72 flex items-center justify-center p-6">
                  <div className="bg-forest-900 border border-forest-700 rounded-2xl p-6 w-full max-w-md">
                    <h3 className="font-display font-bold text-lg text-cream-50 mb-5">Add Vehicle</h3>
                    <div className="space-y-4">
                      <input placeholder="Vehicle Name" value={newVehicle.name} onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })} className={inputCls} />
                      <input placeholder="Plate Number" value={newVehicle.plate_number} onChange={(e) => setNewVehicle({ ...newVehicle, plate_number: e.target.value })} className={inputCls} />
                      <select value={newVehicle.vehicle_type} onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_type: e.target.value })} className={inputCls}>
                        <option value="">Vehicle Type</option>
                        <option value="Cargo Tempo">Cargo Tempo</option>
                        <option value="Mini Truck">Mini Truck</option>
                        <option value="Large Truck">Large Truck</option>
                      </select>
                      <input type="number" placeholder="Capacity (tonnes)" value={newVehicle.capacity_tonnes || ''} onChange={(e) => setNewVehicle({ ...newVehicle, capacity_tonnes: parseFloat(e.target.value) || 0 })} className={inputCls} />
                      <input placeholder="Driver Name" value={newVehicle.driver_name} onChange={(e) => setNewVehicle({ ...newVehicle, driver_name: e.target.value })} className={inputCls} />
                      <input placeholder="Driver Phone" value={newVehicle.driver_phone} onChange={(e) => setNewVehicle({ ...newVehicle, driver_phone: e.target.value })} className={inputCls} />
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => setShowAddVehicle(false)}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-forest-400 text-sm font-medium hover:text-cream-50 transition-colors">Cancel</button>
                      <button onClick={addVehicle}
                        className="flex-1 py-3 rounded-xl bg-saffron-400 text-forest-900 text-sm font-bold hover:bg-saffron-300 transition-colors">Add</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'tickets' && (
            <div className="space-y-6">
              <h1 className="font-display font-black text-2xl text-cream-50">Support Tickets</h1>

              <div className="bg-forest-900 border border-forest-700 rounded-sm p-6 space-y-4">
                <h2 className="font-display font-bold text-base text-cream-50">Submit a Ticket</h2>
                <input placeholder="Subject" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} className={inputCls} />
                <textarea placeholder="Describe your issue..." value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} className={inputCls + ' min-h-[110px] resize-none'} />
                <div className="flex justify-end">
                  <button onClick={submitTicket}
                    className="flex items-center gap-2 bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold px-5 py-2.5 rounded-sm text-sm transition-all min-h-[44px]">
                    <Send className="w-4 h-4" /> Submit
                  </button>
                </div>
              </div>

              <div>
                <h2 className="font-display font-bold text-base text-cream-50 mb-3">My Tickets ({tickets.length})</h2>
                {tickets.length === 0 ? (
                  <p className="text-forest-400 text-sm">No tickets submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((t) => (
                      <div key={t.id} className="bg-forest-900 border border-forest-700 rounded-sm p-5">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className="font-semibold text-cream-50 text-sm">#{t.id} · {t.subject}</p>
                          <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                            t.status === 'open' ? 'bg-saffron-400/20 text-saffron-300' :
                            t.status === 'resolved' ? 'bg-green-400/20 text-green-300' :
                            'bg-forest-700 text-forest-300'
                          }`}>{t.status}</span>
                        </div>
                        <p className="text-sm text-forest-400">{t.message}</p>
                        <p className="text-xs text-forest-500 mt-2">{new Date(t.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <div className="space-y-6">
              <h1 className="font-display font-black text-2xl text-cream-50">My Profile</h1>

              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Rating', value: profile.rating ? `${profile.rating}★` : '—', color: 'bg-saffron-400/10 border-saffron-400/30 text-saffron-400', icon: Star },
                  { label: 'Total Jobs', value: profile.total_jobs, color: 'bg-blue-400/10 border-blue-400/30 text-blue-400', icon: Package },
                  { label: 'Status', value: 'Active', color: 'bg-green-400/10 border-green-400/30 text-green-400', icon: Truck },
                ].map((s) => (
                  <div key={s.label} className={`${s.color} border rounded-sm p-4 flex items-center gap-3`}>
                    <s.icon className="w-5 h-5" />
                    <div>
                      <p className="text-lg font-black">{s.value}</p>
                      <p className="text-xs opacity-80">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-forest-900 border border-forest-700 rounded-sm p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">Business Name</label>
                    <input value={profile.business_name} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">Owner Name</label>
                    <input value={profile.owner_name} onChange={(e) => setProfile({ ...profile, owner_name: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">Phone</label>
                    <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">Email</label>
                    <input value={profile.email} disabled className={inputCls + ' opacity-50 cursor-not-allowed'} />
                  </div>
                  <div>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">Service Region</label>
                    <input value={profile.service_region} onChange={(e) => setProfile({ ...profile, service_region: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">Address</label>
                    <input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={saveProfile} disabled={savingProfile}
                    className="bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold px-6 py-3 rounded-sm text-sm transition-all min-h-[44px] disabled:opacity-50">
                    {savingProfile ? 'Saving...' : 'Update Profile'}
                  </button>
                </div>
              </div>

              <div className="bg-forest-900 border border-forest-700 rounded-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-cream-50 font-bold">Coverage Routes</h2>
                    <p className="text-forest-400 text-sm">You appear in booking results only on routes you cover. With no routes you match everything (legacy).</p>
                  </div>
                </div>

                {routes.length === 0 ? (
                  <p className="text-forest-400 text-sm">No routes declared — you currently match every route. Add routes below to control which jobs you receive.</p>
                ) : (
                  <ul className="space-y-2">
                    {routes.map((r) => (
                      <li key={r.id} className="flex items-center justify-between bg-forest-800 border border-forest-700 rounded-sm px-4 py-3">
                        <span className="text-cream-100 text-sm">
                          {r.from_district || 'Whole province'} ({r.from_province}) → {r.to_district || 'Whole province'} ({r.to_province})
                        </span>
                        <button onClick={() => removeRoute(r.id)}
                          className="text-xs text-red-300 hover:text-red-200 transition-colors px-2 py-1">
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">Pickup Province</label>
                    <select value={routeDraft.from_province} onChange={(e) => setRouteDraft({ ...routeDraft, from_province: e.target.value, from_district: '' })} className={inputCls}>
                      <option value="">Select province</option>
                      {provinces.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">Pickup District <span className="text-forest-400">(optional)</span></label>
                    <select value={routeDraft.from_district} onChange={(e) => setRouteDraft({ ...routeDraft, from_district: e.target.value })} className={inputCls} disabled={!routeDraft.from_province}>
                      <option value="">Whole province</option>
                      {routeDraft.from_province && districtsByProvince((provinces.find((p) => p.name === routeDraft.from_province) || { id: '' }).id).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">Drop Province</label>
                    <select value={routeDraft.to_province} onChange={(e) => setRouteDraft({ ...routeDraft, to_province: e.target.value, to_district: '' })} className={inputCls}>
                      <option value="">Select province</option>
                      {provinces.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">Drop District <span className="text-forest-400">(optional)</span></label>
                    <select value={routeDraft.to_district} onChange={(e) => setRouteDraft({ ...routeDraft, to_district: e.target.value })} className={inputCls} disabled={!routeDraft.to_province}>
                      <option value="">Whole province</option>
                      {routeDraft.to_province && districtsByProvince((provinces.find((p) => p.name === routeDraft.to_province) || { id: '' }).id).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={addRoute}
                    className="bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold px-6 py-3 rounded-sm text-sm transition-all min-h-[44px]">
                    Add Route
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {chatFor !== null && (
        <ChatPanel
          shipmentId={chatFor}
          senderRole="vendor"
          title={`Job ${chatFor} · Customer Chat`}
          onClose={() => setChatFor(null)}
        />
      )}
    </div>
  )
}

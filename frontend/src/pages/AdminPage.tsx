import { useState, useCallback, useMemo } from 'react'
import {
  LayoutDashboard, Truck, Users, Settings, Ticket, BadgeCheck,
  CreditCard, Calendar,
} from 'lucide-react'
import { ADMIN, AUTH, SHIPMENTS, TICKETS } from '../services/api'
import { useToast } from '../context/ToastContext'
import { ChartCard, Bars, HBars, Donut } from '../components/charts'
import type { Shipment, Vendor as VendorType, SupportTicket } from '../types'

type Tab = 'dashboard' | 'shipments' | 'vendors' | 'users' | 'settings' | 'tickets'

type AdminUser = {
  id: number
  name: string
  email: string
  role: string
  phone: string | null
  created_at: string
}

const statusFilterOptions = ['all', 'pending', 'accepted', 'in_transit', 'delivered', 'cancelled']

const statusColors: Record<string, string> = {
  pending: '#f5a623',
  accepted: '#5aa9e6',
  in_transit: '#b07cc6',
  delivered: '#4caf7d',
  cancelled: '#e74c3c',
}

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

const approvalBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-saffron-400/20 text-saffron-300',
    approved: 'bg-green-400/20 text-green-300',
    rejected: 'bg-red-400/20 text-red-300',
  }
  return map[status] || 'bg-forest-700 text-forest-300'
}

const money = (value: number) => `NPR ${value.toLocaleString()}`

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [vendors, setVendors] = useState<VendorType[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [sRes, vRes, uRes, stRes, tRes] = await Promise.allSettled([
      SHIPMENTS.getAll(),
      ADMIN.getVendors(),
      AUTH.getUsers(),
      ADMIN.getSettings(),
      TICKETS.getAll(),
    ])
    if (sRes.status === 'fulfilled') setShipments(sRes.value.data.shipments || [])
    if (vRes.status === 'fulfilled') setVendors(vRes.value.data.vendors || [])
    if (uRes.status === 'fulfilled') setUsers(uRes.value.data.users || [])
    if (stRes.status === 'fulfilled') {
      const raw: Record<string, string> = stRes.value.data.settings || {}
      const normalized: Record<string, string> = {}
      for (const [k, v] of Object.entries(raw)) normalized[k] = String(v)
      setSettings(normalized)
      setEditedSettings(normalized)
    }
    if (tRes.status === 'fulfilled') setTickets(tRes.value.data.tickets || [])
    const failed = [sRes, vRes, uRes, stRes, tRes].filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      showToast(`Failed to load ${failed} of 5 data sources`, 'red')
    }
    setLoading(false)
  }, [showToast])

  const toggleVendorStatus = async (id: number, currentStatus: string) => {
    if (currentStatus === 'banned') return
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await ADMIN.updateVendorStatus(id, newStatus)
      showToast(`Vendor ${newStatus}`, 'green')
      loadAll()
    } catch {
      showToast('Failed to update vendor', 'red')
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const changed = Object.entries(editedSettings).filter(
        ([k, v]) => settings[k] !== v
      )
      await Promise.all(changed.map(([key, value]) => ADMIN.updateSettings(key, value)))
      showToast('Settings saved', 'green')
      setSettings({ ...editedSettings })
    } catch {
      showToast('Failed to save settings', 'red')
    } finally {
      setSaving(false)
    }
  }

  const resolveTicket = async (id: number) => {
    try {
      await TICKETS.resolve(id)
      showToast('Ticket resolved', 'green')
      loadAll()
    } catch { showToast('Failed to resolve ticket', 'red') }
  }

  const closeTicket = async (id: number) => {
    try {
      await TICKETS.close(id)
      showToast('Ticket closed', 'green')
      loadAll()
    } catch { showToast('Failed to close ticket', 'red') }
  }

  const tabs = [
    { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'shipments' as Tab, icon: Truck, label: 'Shipments' },
    { id: 'vendors' as Tab, icon: Users, label: 'Vendors' },
    { id: 'users' as Tab, icon: BadgeCheck, label: 'Users' },
    { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
    { id: 'tickets' as Tab, icon: Ticket, label: 'Tickets' },
  ]

  const activeVendors = vendors.filter((v) => v.status === 'active')
  const recentShipments = [...shipments].sort((a, b) => b.id - a.id).slice(0, 6)
  const filteredShipments = statusFilter === 'all'
    ? shipments
    : shipments.filter((s) => s.status === statusFilter)

  const totalRevenue = shipments
    .filter((s) => s.payment_status === 'paid' && s.final_quote)
    .reduce((sum, s) => sum + (s.final_quote || 0), 0)
  const deliveredCount = shipments.filter((s) => s.status === 'delivered').length
  const inTransitCount = shipments.filter((s) => s.status === 'in_transit').length
  const pendingCount = shipments.filter((s) => s.status === 'pending').length
  const completionRate = shipments.length > 0
    ? Math.round((deliveredCount / shipments.length) * 100)
    : 0

  const stats = useMemo(() => {
    const now = new Date()

    // Status distribution
    const statusDist = (Object.keys(statusColors) as string[]).map((status) => ({
      label: status,
      value: shipments.filter((s) => s.status === status).length,
      color: statusColors[status],
    })).filter((d) => d.value > 0)

    // Shipments per day, last 14 days
    const days: { key: string; label: string; value: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      days.push({ key: dayKey(d), label: d.getDate().toString(), value: 0 })
    }
    const byDay = new Map<string, number>()
    for (const s of shipments) {
      if (!s.created_at) continue
      const key = dayKey(new Date(s.created_at))
      byDay.set(key, (byDay.get(key) || 0) + 1)
    }
    for (const d of days) d.value = byDay.get(d.key) || 0

    // Monthly revenue, last 6 months
    const months: { key: string; label: string; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: monthKey(d),
        label: d.toLocaleString('en', { month: 'short' }),
        value: 0,
      })
    }
    const revByMonth = new Map<string, number>()
    for (const s of shipments) {
      if (s.payment_status !== 'paid' || !s.final_quote || !s.created_at) continue
      const key = monthKey(new Date(s.created_at))
      revByMonth.set(key, (revByMonth.get(key) || 0) + (s.final_quote || 0))
    }
    for (const m of months) m.value = revByMonth.get(m.key) || 0

    // Vehicle-type mix
    const vehicleMix = new Map<string, number>()
    for (const s of shipments) {
      if (!s.vehicle_type) continue
      vehicleMix.set(s.vehicle_type, (vehicleMix.get(s.vehicle_type) || 0) + 1)
    }

    // Top vendors by completed jobs
    const topVendors = [...vendors]
      .sort((a, b) => b.total_jobs - a.total_jobs)
      .slice(0, 5)
      .map((v) => ({ label: v.business_name, value: v.total_jobs }))

    return { statusDist, days, months, vehicleMix, topVendors }
  }, [shipments, vendors])

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
        {/* Sidebar */}
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

        {/* Mobile tabs */}
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

        {/* Content */}
        <main className="flex-1 pt-6 pb-12 min-w-0">
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="font-display font-black text-2xl text-cream-50">Dashboard</h1>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Shipments', value: shipments.length, color: 'bg-saffron-400/10 border-saffron-400/30 text-saffron-400' },
                  { label: 'Pending', value: pendingCount, color: 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' },
                  { label: 'In Transit', value: inTransitCount, color: 'bg-blue-400/10 border-blue-400/30 text-blue-400' },
                  { label: 'Delivered', value: deliveredCount, color: 'bg-green-400/10 border-green-400/30 text-green-400' },
                  { label: 'Vendors', value: vendors.length, color: 'bg-purple-400/10 border-purple-400/30 text-purple-400' },
                  { label: 'Active Vendors', value: activeVendors.length, color: 'bg-teal-400/10 border-teal-400/30 text-teal-400' },
                  { label: 'Registered Users', value: users.length, color: 'bg-orange-400/10 border-orange-400/30 text-orange-400' },
                  { label: 'Completion Rate', value: `${completionRate}%`, color: 'bg-pink-400/10 border-pink-400/30 text-pink-400' },
                ].map((s) => (
                  <div key={s.label} className={`${s.color} border rounded-sm p-5`}>
                    <p className="text-2xl font-black">{s.value}</p>
                    <p className="text-xs mt-1 opacity-80">{s.label}</p>
                  </div>
                ))}
              </div>

              {totalRevenue > 0 && (
                <div className="bg-forest-900 border border-forest-700 rounded-sm p-5 flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-saffron-400" />
                  <p className="text-sm text-forest-300">
                    Collected revenue:{' '}
                    <span className="text-cream-50 font-bold text-lg">{money(totalRevenue)}</span>
                    <span className="text-forest-500"> from {shipments.filter((s) => s.payment_status === 'paid').length} paid shipments</span>
                  </p>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                <ChartCard title="Shipments" subtitle="Last 14 days">
                  <Bars data={stats.days} />
                </ChartCard>
                <ChartCard title="Status Distribution" subtitle="All shipments by current status">
                  {stats.statusDist.length === 0
                    ? <p className="text-forest-400 text-sm">No shipments yet.</p>
                    : <Donut segments={stats.statusDist} centerLabel={String(shipments.length)} />}
                </ChartCard>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <ChartCard title="Monthly Revenue" subtitle="Paid shipments, last 6 months">
                  {stats.months.some((m) => m.value > 0)
                    ? <Bars data={stats.months} format={money} />
                    : <p className="text-forest-400 text-sm">No revenue recorded yet.</p>}
                </ChartCard>
                <ChartCard title="Top Movers" subtitle="By completed jobs">
                  {stats.topVendors.length === 0
                    ? <p className="text-forest-400 text-sm">No movers registered.</p>
                    : <HBars data={stats.topVendors} />}
                </ChartCard>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <ChartCard title="Vehicle Mix" subtitle="Requested vehicle types">
                  {stats.vehicleMix.size === 0
                    ? <p className="text-forest-400 text-sm">No bookings yet.</p>
                    : (
                      <HBars
                        data={[...stats.vehicleMix.entries()].map(([label, value]) => ({ label, value }))}
                      />
                    )}
                </ChartCard>

                {/* Recent shipments */}
                <ChartCard title="Recent Shipments">
                  {recentShipments.length === 0 ? (
                    <p className="text-forest-400 text-sm">No shipments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentShipments.map((s) => (
                        <div key={s.id} className="bg-forest-800 border border-forest-600 rounded-sm p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-cream-50 truncate">{s.booking_id}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${statusBadge(s.status)}`}>{s.status}</span>
                          </div>
                          <p className="text-xs text-forest-400 mt-1 truncate">{s.pickup_city} → {s.drop_city}</p>
                          <p className="text-xs text-forest-500 mt-0.5">
                            {s.vendor_name ? `Mover: ${s.vendor_name}` : 'No mover assigned'} · {new Date(s.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ChartCard>
              </div>
            </div>
          )}

          {tab === 'shipments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-display font-black text-2xl text-cream-50">All Shipments</h1>
                <div className="flex gap-1 flex-wrap">
                  {statusFilterOptions.map((opt) => (
                    <button key={opt} onClick={() => setStatusFilter(opt)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-all capitalize ${
                        statusFilter === opt ? 'bg-saffron-400 text-forest-900' : 'bg-forest-800 text-forest-400 hover:text-cream-50'
                      }`}>
                      {opt.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {filteredShipments.length === 0 ? (
                <p className="text-forest-400 text-sm">No shipments in this view.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-forest-400 text-xs uppercase tracking-wider border-b border-forest-700">
                        <th className="text-left py-3 px-3">Booking</th>
                        <th className="text-left py-3 px-3">Customer</th>
                        <th className="text-left py-3 px-3">Route</th>
                        <th className="text-left py-3 px-3">Move Date</th>
                        <th className="text-left py-3 px-3">Vehicle</th>
                        <th className="text-left py-3 px-3">Mover</th>
                        <th className="text-left py-3 px-3">Payment</th>
                        <th className="text-left py-3 px-3">Approval</th>
                        <th className="text-left py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShipments.map((s) => (
                        <tr key={s.id} className="border-b border-forest-800 text-cream-200 hover:bg-forest-800/50">
                          <td className="py-3 px-3">{s.booking_id}</td>
                          <td className="py-3 px-3">{s.first_name} {s.last_name}</td>
                          <td className="py-3 px-3 text-xs">{s.pickup_city} → {s.drop_city}</td>
                          <td className="py-3 px-3 text-xs">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-forest-500" /> {s.move_date}</span>
                          </td>
                          <td className="py-3 px-3">{s.vehicle_type}</td>
                          <td className="py-3 px-3 text-xs">{s.vendor_name || '—'}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              s.payment_status === 'paid' ? 'bg-green-400/20 text-green-300' : 'bg-forest-700 text-forest-300'
                            }`}>{s.payment_status}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${approvalBadge(s.approval_status)}`}>{s.approval_status}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(s.status)}`}>{s.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'vendors' && (
            <div className="space-y-4">
              <h1 className="font-display font-black text-2xl text-cream-50 mb-4">Vendors</h1>
              {vendors.length === 0 ? (
                <p className="text-forest-400 text-sm">No vendors registered.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-forest-400 text-xs uppercase tracking-wider border-b border-forest-700">
                        <th className="text-left py-3 px-3">Business</th>
                        <th className="text-left py-3 px-3">Owner</th>
                        <th className="text-left py-3 px-3">Phone</th>
                        <th className="text-left py-3 px-3">Region</th>
                        <th className="text-left py-3 px-3">Rating</th>
                        <th className="text-left py-3 px-3">Jobs</th>
                        <th className="text-left py-3 px-3">Status</th>
                        <th className="text-left py-3 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((v) => (
                        <tr key={v.id} className="border-b border-forest-800 text-cream-200 hover:bg-forest-800/50">
                          <td className="py-3 px-3 font-medium">{v.business_name}</td>
                          <td className="py-3 px-3">{v.owner_name}</td>
                          <td className="py-3 px-3">{v.phone}</td>
                          <td className="py-3 px-3 text-xs">{v.service_region || '—'}</td>
                          <td className="py-3 px-3">{v.rating}★</td>
                          <td className="py-3 px-3">{v.total_jobs}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              v.status === 'active' ? 'bg-green-400/20 text-green-300' :
                              v.status === 'pending' ? 'bg-saffron-400/20 text-saffron-300' :
                              'bg-red-400/20 text-red-300'
                            }`}>{v.status}</span>
                          </td>
                          <td className="py-3 px-3">
                            {v.status === 'banned' ? (
                              <span className="px-3 py-1.5 rounded text-xs font-medium bg-red-400/20 text-red-300">Banned</span>
                            ) : (
                              <button onClick={() => toggleVendorStatus(v.id, v.status)}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                  v.status === 'active'
                                    ? 'bg-red-400/20 text-red-300 hover:bg-red-400/30'
                                    : 'bg-green-400/20 text-green-300 hover:bg-green-400/30'
                                }`}>
                                {v.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <h1 className="font-display font-black text-2xl text-cream-50 mb-4">Registered Users</h1>
              {users.length === 0 ? (
                <p className="text-forest-400 text-sm">No users registered.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-forest-400 text-xs uppercase tracking-wider border-b border-forest-700">
                        <th className="text-left py-3 px-3">Name</th>
                        <th className="text-left py-3 px-3">Email</th>
                        <th className="text-left py-3 px-3">Role</th>
                        <th className="text-left py-3 px-3">Phone</th>
                        <th className="text-left py-3 px-3">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-forest-800 text-cream-200 hover:bg-forest-800/50">
                          <td className="py-3 px-3 font-medium">{u.name}</td>
                          <td className="py-3 px-3">{u.email}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              u.role === 'admin' ? 'bg-purple-400/20 text-purple-300' :
                              u.role === 'vendor' ? 'bg-blue-400/20 text-blue-300' :
                              'bg-forest-700 text-forest-300'
                            }`}>{u.role}</span>
                          </td>
                          <td className="py-3 px-3">{u.phone || '—'}</td>
                          <td className="py-3 px-3 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-6">
              <h1 className="font-display font-black text-2xl text-cream-50">Settings</h1>
              <div className="bg-forest-900 border border-forest-700 rounded-sm p-6">
                {Object.entries(editedSettings).length === 0 ? (
                  <p className="text-forest-400 text-sm">No settings configured.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(editedSettings).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-4">
                        <label className="text-cream-200 text-sm font-medium w-40 shrink-0">{key}</label>
                        <input value={value}
                          onChange={(e) => setEditedSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="flex-1 bg-forest-800 border border-forest-600 rounded-sm px-4 py-2.5 text-cream-50 text-sm outline-none focus:border-saffron-400" />
                      </div>
                    ))}
                    <div className="pt-4 flex justify-end">
                      <button onClick={saveSettings} disabled={saving}
                        className="px-6 py-2.5 bg-saffron-400 text-forest-950 font-bold text-sm rounded-sm hover:bg-saffron-500 transition-colors disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save All'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'tickets' && (
            <div className="space-y-4">
              <h1 className="font-display font-black text-2xl text-cream-50 mb-4">Support Tickets</h1>
              {tickets.length === 0 ? (
                <p className="text-forest-400 text-sm">No support tickets yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-forest-400 text-xs uppercase tracking-wider border-b border-forest-700">
                        <th className="text-left py-3 px-3">ID</th>
                        <th className="text-left py-3 px-3">Vendor</th>
                        <th className="text-left py-3 px-3">Subject</th>
                        <th className="text-left py-3 px-3">Message</th>
                        <th className="text-left py-3 px-3">Date</th>
                        <th className="text-left py-3 px-3">Status</th>
                        <th className="text-left py-3 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr key={t.id} className="border-b border-forest-800 text-cream-200 hover:bg-forest-800/50">
                          <td className="py-3 px-3">#{t.id}</td>
                          <td className="py-3 px-3">{t.business_name || '—'}</td>
                          <td className="py-3 px-3">{t.subject}</td>
                          <td className="py-3 px-3 text-xs text-forest-400 max-w-[260px] truncate">{t.message}</td>
                          <td className="py-3 px-3 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              t.status === 'open' ? 'bg-saffron-400/20 text-saffron-300' :
                              t.status === 'resolved' ? 'bg-green-400/20 text-green-300' :
                              'bg-forest-700 text-forest-300'
                            }`}>{t.status}</span>
                          </td>
                          <td className="py-3 px-3 flex gap-2">
                            {t.status === 'open' && (
                              <>
                                <button onClick={() => resolveTicket(t.id)}
                                  className="px-3 py-1.5 bg-green-400/20 text-green-300 rounded text-xs font-medium hover:bg-green-400/30">
                                  Resolve
                                </button>
                                <button onClick={() => closeTicket(t.id)}
                                  className="px-3 py-1.5 bg-forest-700 text-forest-300 rounded text-xs font-medium hover:bg-forest-600">
                                  Close
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

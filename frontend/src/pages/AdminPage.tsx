import { useState, useEffect } from 'react'
import { LayoutDashboard, Truck, Users, Settings, Ticket, Check, X, Search } from 'lucide-react'
import { ADMIN, SHIPMENTS, TICKETS } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import type { Shipment, Vendor as VendorType, SupportTicket } from '../types'

type Tab = 'dashboard' | 'shipments' | 'vendors' | 'settings' | 'tickets'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [vendors, setVendors] = useState<VendorType[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [sRes, vRes, stRes, tRes] = await Promise.all([
        SHIPMENTS.getAll().catch(() => ({ data: { shipments: [] } })),
        ADMIN.getVendors().catch(() => ({ data: { vendors: [] } })),
        ADMIN.getSettings().catch(() => ({ data: { settings: [] } })),
        TICKETS.getAll().catch(() => ({ data: { tickets: [] } })),
      ])
      setShipments(sRes.data.shipments || [])
      setVendors(vRes.data.vendors || [])
      const s: Record<string, string> = {}
      ;(stRes.data.settings || []).forEach((st: { setting_key: string; setting_value: string }) => {
        s[st.setting_key] = st.setting_value
      })
      setSettings(s)
      setEditedSettings(s)
      setTickets(tRes.data.tickets || [])
    } catch {
      showToast('Failed to load dashboard', 'red')
    } finally {
      setLoading(false)
    }
  }

  const toggleVendorStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await ADMIN.updateVendorStatus(id, newStatus)
      showToast(`Vendor ${newStatus}`, 'green')
      loadAll()
    } catch {
      showToast('Failed to update vendor', 'red')
    }
  }

  const approveShipment = async (id: number) => {
    try {
      await ADMIN.approveShipment(id)
      showToast('Shipment approved', 'green')
      loadAll()
    } catch { showToast('Failed to approve', 'red') }
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
    { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
    { id: 'tickets' as Tab, icon: Ticket, label: 'Tickets' },
  ]

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
              <h1 className="font-display font-black text-2xl text-cream-50">Dashboard</h1>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Shipments', value: shipments.length, color: 'bg-saffron-400/10 border-saffron-400/30 text-saffron-400' },
                  { label: 'Pending', value: shipments.filter((s) => s.status === 'pending').length, color: 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' },
                  { label: 'In Transit', value: shipments.filter((s) => s.status === 'in_transit').length, color: 'bg-blue-400/10 border-blue-400/30 text-blue-400' },
                  { label: 'Delivered', value: shipments.filter((s) => s.status === 'delivered').length, color: 'bg-green-400/10 border-green-400/30 text-green-400' },
                  { label: 'Vendors', value: vendors.length, color: 'bg-purple-400/10 border-purple-400/30 text-purple-400' },
                  { label: 'Active Vendors', value: vendors.filter((v) => v.status === 'active').length, color: 'bg-teal-400/10 border-teal-400/30 text-teal-400' },
                ].map((s) => (
                  <div key={s.label} className={`${s.color} border rounded-sm p-5`}>
                    <p className="text-2xl font-black">{s.value}</p>
                    <p className="text-xs mt-1 opacity-80">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'shipments' && (
            <div className="space-y-4">
              <h1 className="font-display font-black text-2xl text-cream-50 mb-4">All Shipments</h1>
              {shipments.length === 0 ? (
                <p className="text-forest-400 text-sm">No shipments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-forest-400 text-xs uppercase tracking-wider border-b border-forest-700">
                        <th className="text-left py-3 px-3">ID</th>
                        <th className="text-left py-3 px-3">Customer</th>
                        <th className="text-left py-3 px-3">Route</th>
                        <th className="text-left py-3 px-3">Vehicle</th>
                        <th className="text-left py-3 px-3">Status</th>
                        <th className="text-left py-3 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipments.map((s) => (
                        <tr key={s.id} className="border-b border-forest-800 text-cream-200 hover:bg-forest-800/50">
                          <td className="py-3 px-3">{s.booking_id}</td>
                          <td className="py-3 px-3">{s.first_name} {s.last_name}</td>
                          <td className="py-3 px-3 text-xs">{s.pickup_city} → {s.drop_city}</td>
                          <td className="py-3 px-3">{s.vehicle_type}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              s.status === 'pending' ? 'bg-saffron-400/20 text-saffron-300' :
                              s.status === 'in_transit' ? 'bg-blue-400/20 text-blue-300' :
                              s.status === 'delivered' ? 'bg-green-400/20 text-green-300' :
                              'bg-forest-700 text-forest-300'
                            }`}>{s.status}</span>
                          </td>
                          <td className="py-3 px-3 flex gap-2">
                            {s.status === 'pending' && (
                              <>
                                <button onClick={() => approveShipment(s.id)}
                                  className="p-1.5 bg-green-400/20 text-green-300 rounded hover:bg-green-400/30">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button className="p-1.5 bg-red-400/20 text-red-300 rounded hover:bg-red-400/30">
                                  <X className="w-3.5 h-3.5" />
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
                        <th className="text-left py-3 px-3">Rating</th>
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
                          <td className="py-3 px-3">{v.rating}★</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              v.status === 'active' ? 'bg-green-400/20 text-green-300' :
                              v.status === 'pending' ? 'bg-saffron-400/20 text-saffron-300' :
                              'bg-red-400/20 text-red-300'
                            }`}>{v.status}</span>
                          </td>
                          <td className="py-3 px-3">
                            <button onClick={() => toggleVendorStatus(v.id, v.status)}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                v.status === 'active'
                                  ? 'bg-red-400/20 text-red-300 hover:bg-red-400/30'
                                  : 'bg-green-400/20 text-green-300 hover:bg-green-400/30'
                              }`}>
                              {v.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
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

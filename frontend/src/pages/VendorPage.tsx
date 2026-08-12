import { useState, useCallback } from 'react'
import { Truck, Package, Plus, X, User, Ticket, Star, Send, MessageCircle, MapPin } from 'lucide-react'
import { VENDOR, TICKETS } from '../services/api'
import { useToast } from '../context/ToastContext'
import ChatPanel from '../components/ChatPanel'
import type { Shipment, Vehicle, SupportTicket } from '../types'

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
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketMessage, setTicketMessage] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newVehicle, setNewVehicle] = useState({ name: '', plate_number: '', vehicle_type: '', capacity_tonnes: 0, driver_name: '', driver_phone: '' })
  const { showToast } = useToast()

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [sRes, vRes, pRes, tRes, aRes] = await Promise.allSettled([
      VENDOR.getShipments(),
      VENDOR.getVehicles(),
      VENDOR.getProfile(),
      TICKETS.getMine(),
      VENDOR.getAvailable(),
    ])
    if (sRes.status === 'fulfilled') setShipments(sRes.value.data.shipments || [])
    if (vRes.status === 'fulfilled') setVehicles(vRes.value.data.vehicles || [])
    if (pRes.status === 'fulfilled' && pRes.value.data.vendor) setProfile(pRes.value.data.vendor)
    if (tRes.status === 'fulfilled') setTickets(tRes.value.data.tickets || [])
    if (aRes.status === 'fulfilled') setAvailable(aRes.value.data.shipments || [])
    const failed = [sRes, vRes, pRes, tRes, aRes].filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      showToast(`Failed to load ${failed} of 5 data sources`, 'red')
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
        showToast(`Job ${action}ed`, 'green')
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
  const totalQuotes = shipments.reduce((sum, s) => sum + (s.final_quote || 0), 0)

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
                  { label: 'Total Quotes', value: totalQuotes ? `NPR ${totalQuotes.toLocaleString()}` : '—', color: 'bg-saffron-400/10 border-saffron-400/30 text-saffron-400' },
                ].map((s) => (
                  <div key={s.label} className={`${s.color} border rounded-sm p-5`}>
                    <p className="text-xl font-black">{s.value}</p>
                    <p className="text-xs mt-1 opacity-80">{s.label}</p>
                  </div>
                ))}
              </div>

              {shipments.length === 0 ? (
                <p className="text-forest-400 text-sm">No jobs assigned yet.</p>
              ) : (
                <div className="space-y-4">
                  {shipments.map((s) => (
                    <div key={s.id} className="bg-forest-900 border border-forest-700 rounded-sm p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="font-semibold text-cream-50 text-sm">{s.booking_id}</p>
                          <p className="text-forest-400 text-xs">{s.pickup_city} → {s.drop_city}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded text-xs font-medium ${statusBadge(s.status)}`}>{s.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm text-forest-300 mb-4">
                        <div><span className="text-forest-500">Customer:</span> {s.first_name} {s.last_name}</div>
                        <div><span className="text-forest-500">Phone:</span> {s.mobile_number}</div>
                        <div><span className="text-forest-500">Move Date:</span> {s.move_date}</div>
                        <div><span className="text-forest-500">Vehicle:</span> {s.vehicle_type}</div>
                        {s.final_quote ? <div><span className="text-forest-500">Quote:</span> NPR {s.final_quote.toLocaleString()}</div> : null}
                        {s.payment_status ? <div><span className="text-forest-500">Payment:</span> <span className="capitalize">{s.payment_status}</span></div> : null}
                      </div>
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

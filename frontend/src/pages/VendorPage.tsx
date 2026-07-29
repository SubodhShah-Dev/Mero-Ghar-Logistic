import { useState, useEffect } from 'react'
import { Truck, Package, Plus, X, User } from 'lucide-react'
import { VENDOR, TICKETS } from '../services/api'
import { useToast } from '../context/ToastContext'
import type { Shipment, Vehicle, SupportTicket } from '../types'

type Tab = 'jobs' | 'fleet' | 'tickets' | 'profile'

export default function VendorPage() {
  const [tab, setTab] = useState<Tab>('jobs')
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [profile, setProfile] = useState({ business_name: '', owner_name: '', phone: '', service_region: '', address: '' })
  const [loading, setLoading] = useState(true)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newVehicle, setNewVehicle] = useState({ name: '', plate_number: '', vehicle_type: '', capacity_tonnes: 0, driver_name: '', driver_phone: '' })
  const { showToast } = useToast()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [sRes, vRes, tRes, pRes] = await Promise.all([
        VENDOR.getShipments().catch(() => ({ data: { shipments: [] } })),
        VENDOR.getVehicles().catch(() => ({ data: { vehicles: [] } })),
        TICKETS.getAll().catch(() => ({ data: { tickets: [] } })),
        VENDOR.getProfile().catch(() => ({ data: { vendor: {} } })),
      ])
      setShipments(sRes.data.shipments || [])
      setVehicles(vRes.data.vehicles || [])
      setTickets(tRes.data.tickets || [])
      if (pRes.data.vendor) setProfile(pRes.data.vendor)
    } catch { showToast('Failed to load data', 'red') }
    finally { setLoading(false) }
  }

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

  const tabs = [
    { id: 'jobs' as Tab, icon: Package, label: 'Jobs' },
    { id: 'fleet' as Tab, icon: Truck, label: 'Fleet' },
    { id: 'profile' as Tab, icon: User, label: 'Profile' },
  ]

  const inputCls = 'w-full bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 transition-colors min-h-[44px]'

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
            <div className="space-y-4">
              <h1 className="font-display font-black text-2xl text-cream-50 mb-4">My Jobs</h1>
              {shipments.length === 0 ? (
                <p className="text-forest-400 text-sm">No jobs assigned yet.</p>
              ) : (
                shipments.map((s) => (
                  <div key={s.id} className="bg-forest-900 border border-forest-700 rounded-sm p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-semibold text-cream-50 text-sm">{s.booking_id}</p>
                        <p className="text-forest-400 text-xs">{s.pickup_city} → {s.drop_city}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                        s.status === 'pending' ? 'bg-saffron-400/20 text-saffron-300' :
                        s.status === 'accepted' ? 'bg-blue-400/20 text-blue-300' :
                        s.status === 'in_transit' ? 'bg-purple-400/20 text-purple-300' :
                        s.status === 'delivered' ? 'bg-green-400/20 text-green-300' :
                        'bg-forest-700 text-forest-300'
                      }`}>{s.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm text-forest-300 mb-4">
                      <div><span className="text-forest-500">Customer:</span> {s.first_name} {s.last_name}</div>
                      <div><span className="text-forest-500">Phone:</span> {s.mobile_number}</div>
                      <div><span className="text-forest-500">Move Date:</span> {s.move_date}</div>
                      <div><span className="text-forest-500">Vehicle:</span> {s.vehicle_type}</div>
                      {s.final_quote && <div><span className="text-forest-500">Quote:</span> NPR {s.final_quote.toLocaleString()}</div>}
                    </div>
                    <div className="flex gap-2">
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
                    </div>
                  </div>
                ))
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

          {tab === 'profile' && (
            <div className="space-y-6">
              <h1 className="font-display font-black text-2xl text-cream-50">My Profile</h1>
              <div className="bg-forest-900 border border-forest-700 rounded-sm p-6 space-y-4">
                {[
                  { label: 'Business Name', value: profile.business_name },
                  { label: 'Owner Name', value: profile.owner_name },
                  { label: 'Phone', value: profile.phone },
                  { label: 'Service Region', value: profile.service_region },
                  { label: 'Address', value: profile.address },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-cream-200 text-sm font-medium mb-1.5">{f.label}</label>
                    <input defaultValue={f.value} className={inputCls} />
                  </div>
                ))}
                <button className="bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold px-6 py-3 rounded-sm text-sm transition-all min-h-[44px]">
                  Update Profile
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

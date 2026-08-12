import React, { useState, useEffect, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
  Alert, TextInput, RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { VENDOR, TICKETS } from '../services/api'
import { COLORS } from '../utils/theme'
import type { RootStackParamList } from '../App'

type Tab = 'jobs' | 'claim' | 'fleet' | 'tickets' | 'profile'
type JobFilter = 'all' | 'pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled'
type Nav = StackNavigationProp<RootStackParamList, 'Vendor'>

const STATUS_COLORS: Record<string, string> = {
  pending: '#f5a623',
  accepted: '#5aa9e6',
  in_transit: '#b07cc6',
  delivered: '#4caf7d',
  cancelled: '#e74c3c',
}
const JOB_FILTERS: JobFilter[] = ['all', 'pending', 'accepted', 'in_transit', 'delivered', 'cancelled']
const money = (v: number) => `NPR ${v.toLocaleString()}`
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}`

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

const emptyVehicle = {
  name: '', plate_number: '', vehicle_type: '', capacity_tonnes: '0', driver_name: '', driver_phone: '',
}

export default function VendorScreen() {
  const [tab, setTab] = useState<Tab>('jobs')
  const [shipments, setShipments] = useState<any[]>([])
  const [available, setAvailable] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [profileDraft, setProfileDraft] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<JobFilter>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newVehicle, setNewVehicle] = useState({ ...emptyVehicle })
  const navigation = useNavigation<Nav>()

  const reload = async () => {
    try {
      const [shipRes, vehRes, tickRes, availRes, profRes] = await Promise.all([
        VENDOR.getShipments(),
        VENDOR.getVehicles(),
        TICKETS.getMine(),
        VENDOR.getAvailable(),
        VENDOR.getProfile(),
      ])
      setShipments(shipRes.data.shipments || [])
      setVehicles(vehRes.data.vehicles || [])
      setTickets(tickRes.data.tickets || [])
      setAvailable(availRes.data.shipments || [])
      const vendor = profRes.data?.vendor
      if (vendor) {
        setProfile(vendor)
        setProfileDraft({
          business_name: vendor.business_name || '',
          owner_name: vendor.owner_name || '',
          phone: vendor.phone || '',
          service_region: vendor.service_region || '',
          address: vendor.address || '',
        })
      }
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    reload()
  }

  const updateStatus = async (id: number, action: 'accept' | 'start' | 'complete') => {
    try {
      const actions: Record<string, () => Promise<any>> = {
        accept: () => VENDOR.acceptShipment(id),
        start: () => VENDOR.startDelivery(id),
        complete: () => VENDOR.completeDelivery(id),
      }
      await actions[action]()
      const verbs: Record<string, string> = { accept: 'accepted', start: 'started', complete: 'completed', reject: 'rejected' }
      Alert.alert('Success', `Job ${verbs[action] || action}`)
      const res = await VENDOR.getShipments()
      setShipments(res.data.shipments || [])
    } catch {
      Alert.alert('Error', 'Failed to update')
    }
  }

  const claimJob = async (id: number) => {
    try {
      await VENDOR.claim(id)
      Alert.alert('Success', 'Job claimed — it is now in your Jobs')
      await reload()
    } catch {
      Alert.alert('Error', 'Failed to claim job')
    }
  }

  const openChat = (id: number, bookingId?: string) => {
    navigation.navigate('Chat', {
      shipmentId: id,
      senderRole: 'vendor',
      title: `${bookingId || `Job #${id}`} · Customer`,
    })
  }

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Subject and message are required')
      return
    }
    setSubmitting(true)
    try {
      await TICKETS.create({ subject: subject.trim(), message: message.trim() })
      setSubject('')
      setMessage('')
      Alert.alert('Success', 'Ticket submitted')
      const res = await TICKETS.getMine()
      setTickets(res.data.tickets || [])
    } catch {
      Alert.alert('Error', 'Failed to submit ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const setVehicleStatus = async (id: number, status: string) => {
    try {
      await VENDOR.updateVehicleStatus(id, status)
      const res = await VENDOR.getVehicles()
      setVehicles(res.data.vehicles || [])
    } catch {
      Alert.alert('Error', 'Failed to update vehicle')
    }
  }

  const addVehicle = async () => {
    if (!newVehicle.name.trim() || !newVehicle.plate_number.trim() || !newVehicle.vehicle_type) {
      Alert.alert('Error', 'Vehicle name, plate number and type are required')
      return
    }
    try {
      await VENDOR.addVehicle({
        ...newVehicle,
        capacity_tonnes: parseFloat(newVehicle.capacity_tonnes) || 0,
      })
      Alert.alert('Success', 'Vehicle added')
      setShowAddVehicle(false)
      setNewVehicle({ ...emptyVehicle })
      const res = await VENDOR.getVehicles()
      setVehicles(res.data.vehicles || [])
    } catch {
      Alert.alert('Error', 'Failed to add vehicle')
    }
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      await VENDOR.updateProfile(profileDraft)
      Alert.alert('Success', 'Profile updated')
      await reload()
    } catch {
      Alert.alert('Error', 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const visibleJobs = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? shipments
      : shipments.filter((s) => s.status === statusFilter)
    return [...filtered].sort((a, b) => {
      const da = a.move_date ? new Date(a.move_date).getTime() : 0
      const db = b.move_date ? new Date(b.move_date).getTime() : 0
      return da - db || (a.id || 0) - (b.id || 0)
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
  const maxEarn = Math.max(1, ...earnings.map((m) => m.value))

  const activeJobs = shipments.filter((s) => ['accepted', 'in_transit'].includes(s.status)).length
  const deliveredJobs = shipments.filter((s) => s.status === 'delivered').length
  const totalEarned = shipments
    .filter((s) => s.status === 'delivered' && s.final_quote)
    .reduce((sum, s) => sum + (s.final_quote || 0), 0)
  const completionRate = shipments.length > 0 ? Math.round((deliveredJobs / shipments.length) * 100) : 0

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.saffron[400]} />
      </View>
    )
  }

  const tabStyle = (t: Tab) => [styles.tab, tab === t && styles.tabActive]
  const tabTextStyle = (t: Tab) => [styles.tabText, tab === t && styles.tabTextActive]

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={styles.tabRow}>
          {(['jobs', 'claim', 'fleet', 'tickets', 'profile'] as Tab[]).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={tabStyle(t)}>
              <Text style={tabTextStyle(t)}>
                {t === 'jobs' ? `Jobs (${shipments.length})` : t === 'claim' ? `Claim (${available.length})` : t === 'fleet' ? `Fleet (${vehicles.length})` : t === 'profile' ? 'Profile' : `Support (${tickets.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 24 }}>
        {tab === 'jobs' && (
          <>
            <Text style={styles.title}>My Jobs</Text>

            <View style={styles.statsRow}>
              <View style={styles.statCard}><Text style={[styles.statNum, { color: '#5aa9e6' }]}>{activeJobs}</Text><Text style={styles.statLabel}>Active</Text></View>
              <View style={styles.statCard}><Text style={[styles.statNum, { color: '#4caf7d' }]}>{deliveredJobs}</Text><Text style={styles.statLabel}>Delivered</Text></View>
              <View style={styles.statCard}><Text style={[styles.statNum, { color: COLORS.saffron[300] }]}>{completionRate}%</Text><Text style={styles.statLabel}>Completed</Text></View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Monthly Earnings</Text>
              <Text style={styles.cardSub}>Delivered jobs, last 6 months · Earned {money(totalEarned)}</Text>
              <View style={styles.vBarRow}>
                {earnings.map((m) => (
                  <View key={m.key} style={styles.vBarCol}>
                    <Text style={styles.vBarValue}>{m.value > 0 ? m.value : ''}</Text>
                    <View style={styles.vBarTrack}>
                      <View style={[styles.vBarFill, { height: `${Math.max((m.value / maxEarn) * 100, m.value > 0 ? 8 : 2)}%` }]} />
                    </View>
                    <Text style={styles.vBarLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={styles.filterRow}>
                {JOB_FILTERS.map((f) => (
                  <TouchableOpacity key={f} onPress={() => setStatusFilter(f)} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}>
                    <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>{f.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {visibleJobs.length === 0 ? (
              <Text style={{ color: COLORS.forest[400], fontSize: 15 }}>
                No jobs{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''} assigned.
              </Text>
            ) : (
              visibleJobs.map((s: any) => {
                const expanded = expandedId === s.id
                return (
                  <View key={s.id} style={styles.card}>
                    <View style={styles.cardRow}>
                      <Text style={styles.idText}>{s.booking_id}</Text>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[s.status] || COLORS.saffron[300] }]}>
                        {s.status.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={styles.route}>{s.pickup_city} → {s.drop_city}</Text>
                    <Text style={styles.detail}>Customer: {s.first_name} {s.last_name}</Text>
                    <Text style={styles.detail}>Phone: {s.mobile_number}</Text>
                    <Text style={styles.detail}>Move Date: {s.move_date}</Text>
                    {s.final_quote ? <Text style={styles.quote}>{money(s.final_quote)}</Text> : null}

                    {['pending', 'accepted', 'in_transit'].includes(s.status) && (
                      <View style={styles.progressRow}>
                        {['pending', 'accepted', 'in_transit', 'delivered'].map((step, i) => {
                          const order = ['pending', 'accepted', 'in_transit', 'delivered']
                          const done = order.indexOf(s.status) >= i
                          return (
                            <View key={step} style={styles.progressSeg}>
                              <View style={[styles.progressBar, done && styles.progressBarDone]} />
                              <Text style={[styles.progressLabel, done && styles.progressLabelDone]}>
                                {step.replace('_', ' ')}
                              </Text>
                            </View>
                          )
                        })}
                      </View>
                    )}

                    {expanded && (
                      <View style={styles.detailBlock}>
                        <Text style={styles.detail}>Pickup: {s.pickup_address || [s.pickup_ward, s.pickup_city, s.pickup_district, s.pickup_province].filter(Boolean).join(', ')}</Text>
                        <Text style={styles.detail}>Drop-off: {s.drop_address || [s.drop_ward, s.drop_city, s.drop_district, s.drop_province].filter(Boolean).join(', ')}</Text>
                        {s.selected_items ? <Text style={styles.detail}>Items: {parseList(s.selected_items).join(', ') || '—'}</Text> : null}
                        {s.add_on_services ? <Text style={styles.detail}>Add-ons: {parseList(s.add_on_services).join(', ') || '—'}</Text> : null}
                        {s.special_notes ? <Text style={styles.detail}>Notes: {s.special_notes}</Text> : null}
                        {s.alternate_mobile ? <Text style={styles.detail}>Alt Phone: {s.alternate_mobile}</Text> : null}
                        {s.preferred_time_slot ? <Text style={styles.detail}>Time Slot: {s.preferred_time_slot}</Text> : null}
                        {s.payment_status ? <Text style={styles.detail}>Payment: {s.payment_status}</Text> : null}
                      </View>
                    )}

                    <View style={styles.btnRow}>
                      {s.status === 'pending' && (
                        <>
                          <TouchableOpacity onPress={() => updateStatus(s.id, 'accept')} style={styles.greenBtn}>
                            <Text style={styles.btnText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => Alert.alert('Reject job?', 'This returns the job to the pool.', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Reject', style: 'destructive', onPress: async () => {
                                try {
                                  await VENDOR.rejectShipment(s.id)
                                  Alert.alert('Success', 'Job rejected')
                                  await reload()
                                } catch { Alert.alert('Error', 'Failed to reject') }
                              } },
                          ])} style={styles.redBtn}>
                            <Text style={styles.redBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {s.status === 'accepted' && (
                        <TouchableOpacity onPress={() => updateStatus(s.id, 'start')} style={styles.goldBtn}>
                          <Text style={[styles.btnText, { color: COLORS.forest[900] }]}>Start Delivery</Text>
                        </TouchableOpacity>
                      )}
                      {s.status === 'in_transit' && (
                        <TouchableOpacity onPress={() => updateStatus(s.id, 'complete')} style={styles.greenBtn}>
                          <Text style={styles.btnText}>Mark Delivered</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => openChat(s.id, s.booking_id)} style={styles.blueBtn}>
                        <Text style={styles.blueBtnText}>Chat</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setExpandedId(expanded ? null : s.id)} style={styles.blueBtn}>
                        <Text style={styles.blueBtnText}>{expanded ? 'Less' : 'Details'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              })
            )}
          </>
        )}

        {tab === 'claim' && (
          <>
            <Text style={styles.title}>Claim Pool</Text>
            <Text style={{ color: COLORS.forest[300], fontSize: 14, marginBottom: 12 }}>
              Bookings no mover could auto-assign. Claim one that matches your fleet.
            </Text>
            {available.length === 0 ? (
              <Text style={{ color: COLORS.forest[400], fontSize: 15 }}>Nothing in the pool right now.</Text>
            ) : (
              available.map((s: any) => (
                <View key={s.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.idText}>{s.booking_id}</Text>
                    <Text style={[styles.statusText, { color: COLORS.saffron[300] }]}>Available</Text>
                  </View>
                  <Text style={styles.route}>{s.pickup_city} → {s.drop_city}</Text>
                  <Text style={styles.detail}>Route: {s.pickup_province} → {s.drop_province}</Text>
                  <Text style={styles.detail}>Customer: {s.first_name} {s.last_name}</Text>
                  <Text style={styles.detail}>Phone: {s.mobile_number}</Text>
                  <Text style={styles.detail}>Move Date: {s.move_date}</Text>
                  <Text style={styles.detail}>Vehicle: {s.vehicle_type}</Text>
                  {s.home_size ? <Text style={styles.detail}>Home Size: {s.home_size}</Text> : null}
                  {s.final_quote ? <Text style={styles.quote}>{money(s.final_quote)}</Text> : null}
                  <TouchableOpacity onPress={() => claimJob(s.id)} style={styles.goldBtn}>
                    <Text style={[styles.btnText, { color: COLORS.forest[900] }]}>Claim Job</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'fleet' && (
          <>
            <View style={styles.titleRow}>
              <Text style={styles.title}>My Fleet</Text>
              <TouchableOpacity onPress={() => setShowAddVehicle((v) => !v)} style={styles.goldBtn}>
                <Text style={[styles.btnText, { color: COLORS.forest[900] }]}>{showAddVehicle ? 'Cancel' : '+ Add Vehicle'}</Text>
              </TouchableOpacity>
            </View>

            {showAddVehicle && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Add Vehicle</Text>
                <TextInput value={newVehicle.name} onChangeText={(v) => setNewVehicle({ ...newVehicle, name: v })} placeholder="Vehicle Name" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
                <TextInput value={newVehicle.plate_number} onChangeText={(v) => setNewVehicle({ ...newVehicle, plate_number: v })} placeholder="Plate Number" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
                {['Cargo Tempo', 'Mini Truck', 'Large Truck'].map((type) => (
                  <TouchableOpacity key={type} onPress={() => setNewVehicle({ ...newVehicle, vehicle_type: type })} style={[styles.typeChip, newVehicle.vehicle_type === type && styles.typeChipActive]}>
                    <Text style={[styles.typeChipText, newVehicle.vehicle_type === type && styles.typeChipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
                <TextInput value={newVehicle.capacity_tonnes} onChangeText={(v) => setNewVehicle({ ...newVehicle, capacity_tonnes: v })} placeholder="Capacity (tonnes)" keyboardType="numeric" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
                <TextInput value={newVehicle.driver_name} onChangeText={(v) => setNewVehicle({ ...newVehicle, driver_name: v })} placeholder="Driver Name" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
                <TextInput value={newVehicle.driver_phone} onChangeText={(v) => setNewVehicle({ ...newVehicle, driver_phone: v })} placeholder="Driver Phone" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
                <TouchableOpacity onPress={addVehicle} style={styles.saveBtn}>
                  <Text style={styles.saveText}>Add Vehicle</Text>
                </TouchableOpacity>
              </View>
            )}

            {vehicles.length === 0 ? (
              <Text style={{ color: COLORS.forest[400], fontSize: 15 }}>No vehicles added yet.</Text>
            ) : (
              vehicles.map((v: any) => (
                <View key={v.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.idText}>{v.name}</Text>
                    <Text style={styles.statusText}>{v.status.replace('_', ' ')}</Text>
                  </View>
                  <Text style={styles.detail}>{v.vehicle_type} · {v.plate_number} · {v.capacity_tonnes}t</Text>
                  <Text style={styles.detail}>Driver: {v.driver_name}</Text>
                  <View style={styles.btnRow}>
                    {v.status === 'available' ? (
                      <TouchableOpacity onPress={() => setVehicleStatus(v.id, 'maintenance')} style={styles.goldBtn}>
                        <Text style={[styles.btnText, { color: COLORS.forest[900] }]}>Set to Maintenance</Text>
                      </TouchableOpacity>
                    ) : v.status === 'maintenance' ? (
                      <TouchableOpacity onPress={() => setVehicleStatus(v.id, 'available')} style={styles.greenBtn}>
                        <Text style={styles.btnText}>Mark Available</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'tickets' && (
          <>
            <Text style={styles.title}>Support</Text>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Raise a Support Ticket</Text>
              <TextInput value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
              <TextInput
                value={message} onChangeText={setMessage} placeholder="Describe your issue..." placeholderTextColor={COLORS.forest[400]}
                multiline numberOfLines={3} style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              />
              <TouchableOpacity onPress={submitTicket} disabled={submitting} style={styles.goldBtn}>
                <Text style={[styles.btnText, { color: COLORS.forest[900] }]}>
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </Text>
              </TouchableOpacity>
            </View>
            {tickets.length === 0 ? (
              <Text style={{ color: COLORS.forest[400], fontSize: 15 }}>No tickets submitted yet.</Text>
            ) : (
              tickets.map((t: any) => (
                <View key={t.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.idText}>{t.subject}</Text>
                    <Text style={styles.statusText}>{t.status}</Text>
                  </View>
                  <Text style={styles.detail}>{t.message}</Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'profile' && profileDraft && (
          <>
            <Text style={styles.title}>My Profile</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}><Text style={styles.statNum}>{profile?.rating || '—'}</Text><Text style={styles.statLabel}>Rating</Text></View>
              <View style={styles.statCard}><Text style={styles.statNum}>{profile?.total_jobs || 0}</Text><Text style={styles.statLabel}>Total Jobs</Text></View>
              <View style={styles.statCard}><Text style={[styles.statNum, { color: profile?.status === 'active' ? '#4caf7d' : COLORS.saffron[300], fontSize: 16, paddingTop: 4 }]}>{profile?.status || '—'}</Text><Text style={styles.statLabel}>Status</Text></View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Business Details</Text>
              <TextInput value={profileDraft.business_name} onChangeText={(v) => setProfileDraft({ ...profileDraft, business_name: v })} placeholder="Business Name" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
              <TextInput value={profileDraft.owner_name} onChangeText={(v) => setProfileDraft({ ...profileDraft, owner_name: v })} placeholder="Owner Name" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
              <TextInput value={profileDraft.phone} onChangeText={(v) => setProfileDraft({ ...profileDraft, phone: v })} placeholder="Phone" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
              <TextInput value={profileDraft.service_region} onChangeText={(v) => setProfileDraft({ ...profileDraft, service_region: v })} placeholder="Service Region" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
              <TextInput value={profileDraft.address} onChangeText={(v) => setProfileDraft({ ...profileDraft, address: v })} placeholder="Address" placeholderTextColor={COLORS.forest[400]} style={styles.input} />
              <TouchableOpacity onPress={saveProfile} disabled={savingProfile} style={styles.saveBtn}>
                <Text style={styles.saveText}>{savingProfile ? 'Saving...' : 'Update Profile'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.forest[950], padding: 16 },
  center: { flex: 1, backgroundColor: COLORS.forest[950], justifyContent: 'center', alignItems: 'center' },
  title: { color: COLORS.cream[50], fontSize: 22, fontWeight: '900', marginBottom: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 4, backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700] },
  tabActive: { backgroundColor: 'rgba(245,166,35,0.18)', borderColor: COLORS.saffron[400] },
  tabText: { color: COLORS.forest[300], fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.saffron[300] },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 16, alignItems: 'center' },
  statNum: { color: COLORS.saffron[400], fontSize: 26, fontWeight: '900' },
  statLabel: { color: COLORS.forest[400], fontSize: 12, marginTop: 4 },
  card: { backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 16, marginBottom: 12 },
  cardTitle: { color: COLORS.cream[50], fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardSub: { color: COLORS.forest[400], fontSize: 12, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  idText: { color: COLORS.cream[50], fontSize: 15, fontWeight: '700' },
  statusText: { color: COLORS.saffron[300], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' as const },
  route: { color: COLORS.forest[300], fontSize: 14, marginBottom: 4 },
  detail: { color: COLORS.forest[400], fontSize: 13, marginBottom: 2 },
  detailBlock: { borderTopWidth: 1, borderTopColor: COLORS.forest[700], paddingTop: 8, marginBottom: 8 },
  quote: { color: COLORS.saffron[400], fontSize: 15, fontWeight: '700', marginTop: 4 },
  sectionTitle: { color: COLORS.cream[50], fontSize: 15, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600], borderRadius: 4, color: COLORS.cream[50], paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  greenBtn: { backgroundColor: 'rgba(76,175,125,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, alignSelf: 'flex-start' },
  goldBtn: { backgroundColor: 'rgba(245,166,35,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, alignSelf: 'flex-start' },
  redBtn: { backgroundColor: 'rgba(220,38,38,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, alignSelf: 'flex-start' },
  redBtnText: { color: '#ef7b7b', fontWeight: '600', fontSize: 13 },
  blueBtn: { backgroundColor: 'rgba(64,145,210,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, alignSelf: 'flex-start' },
  blueBtnText: { color: '#5aa9e6', fontWeight: '600', fontSize: 13 },
  btnText: { color: '#4caf7d', fontWeight: '600', fontSize: 13 },
  progressRow: { flexDirection: 'row', gap: 4, marginTop: 10, marginBottom: 8 },
  progressSeg: { flex: 1, alignItems: 'center' },
  progressBar: { width: '100%', height: 4, backgroundColor: COLORS.forest[700], borderRadius: 2, marginBottom: 3 },
  progressBarDone: { backgroundColor: COLORS.saffron[400] },
  progressLabel: { color: COLORS.forest[600], fontSize: 9, textTransform: 'capitalize' },
  progressLabelDone: { color: COLORS.saffron[300] },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700] },
  filterChipActive: { backgroundColor: 'rgba(245,166,35,0.18)', borderColor: COLORS.saffron[400] },
  filterText: { color: COLORS.forest[300], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  filterTextActive: { color: COLORS.saffron[300] },
  vBarRow: { flexDirection: 'row', alignItems: 'flex-end', height: 120, marginTop: 8 },
  vBarCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  vBarValue: { color: COLORS.cream[200], fontSize: 10, fontWeight: '600', marginBottom: 4 },
  vBarTrack: { width: 22, flex: 1, backgroundColor: COLORS.forest[800], borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  vBarFill: { width: '100%', backgroundColor: 'rgba(245,166,35,0.85)', borderRadius: 4 },
  vBarLabel: { color: COLORS.forest[500], fontSize: 10, marginTop: 4 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600], marginBottom: 8, marginRight: 8 },
  typeChipActive: { backgroundColor: 'rgba(245,166,35,0.18)', borderColor: COLORS.saffron[400] },
  typeChipText: { color: COLORS.forest[300], fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: COLORS.saffron[300] },
  saveBtn: { backgroundColor: COLORS.saffron[400], paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginTop: 4 },
  saveText: { color: COLORS.forest[900], fontWeight: '700', fontSize: 15 },
})

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
  TextInput, RefreshControl, Alert,
} from 'react-native'
import { SHIPMENTS, ADMIN } from '../services/api'
import { COLORS } from '../utils/theme'
import { useAuth } from '../context/AuthContext'

type Tab = 'overview' | 'shipments' | 'vendors' | 'admins' | 'settings'
type Filter = 'all' | 'pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f5a623',
  accepted: '#5aa9e6',
  in_transit: '#b07cc6',
  delivered: '#4caf7d',
  cancelled: '#e74c3c',
}

const FILTERS: Filter[] = ['all', 'pending', 'accepted', 'in_transit', 'delivered', 'cancelled']

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
const money = (v: number) => `NPR ${v.toLocaleString()}`

export default function AdminScreen() {
  const { user } = useAuth()
  const isSuper = user?.role === 'super_admin'
  const [tab, setTab] = useState<Tab>('overview')
  const [shipments, setShipments] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [draftSettings, setDraftSettings] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [branches, setBranches] = useState<any[]>([])
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'branch_admin', branch_ids: [] as number[] })
  const [creatingAdmin, setCreatingAdmin] = useState(false)

  const load = useCallback(async () => {
    try {
      const [sRes, vRes, stRes] = await Promise.all([
        SHIPMENTS.getAll(),
        ADMIN.getVendors(),
        ADMIN.getSettings(),
      ])
      setShipments(sRes.data.shipments || [])
      setVendors(vRes.data.vendors || [])
      const raw: Record<string, string> = stRes.data.settings || {}
      const norm: Record<string, string> = {}
      for (const [k, v] of Object.entries(raw)) norm[k] = String(v)
      setSettings(norm)
      setDraftSettings(norm)
      if (user?.role === 'super_admin') {
        const br = await ADMIN.getBranches()
        setBranches(br.data.branches || [])
      }
    } catch {} finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.role])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const toggleVendorStatus = async (id: number, next: string) => {
    try {
      await ADMIN.updateVendorStatus(id, next)
      Alert.alert('Success', `Mover ${next === 'active' ? 'activated' : 'deactivated'}`)
      await load()
    } catch {
      Alert.alert('Error', 'Failed to update mover status')
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const changed = Object.entries(draftSettings).filter(([k, v]) => settings[k] !== v)
      await Promise.all(changed.map(([key, value]) => ADMIN.updateSettings(key, value)))
      setSettings({ ...draftSettings })
      Alert.alert('Success', 'Settings saved')
    } catch {
      Alert.alert('Error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleBranchId = (id: number) => {
    setNewAdmin((prev) => ({
      ...prev,
      branch_ids: prev.branch_ids.includes(id)
        ? prev.branch_ids.filter((b) => b !== id)
        : [...prev.branch_ids, id],
    }))
  }

  const createAdmin = async () => {
    if (!newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password.trim()) {
      Alert.alert('Missing info', 'Name, email and password are required')
      return
    }
    if (newAdmin.role === 'branch_admin' && newAdmin.branch_ids.length === 0) {
      Alert.alert('Missing info', 'Assign the branch admin to at least one branch')
      return
    }
    setCreatingAdmin(true)
    try {
      await ADMIN.createAdminUser({
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim(),
        password: newAdmin.password,
        role: newAdmin.role,
        branch_ids: newAdmin.role === 'branch_admin' ? newAdmin.branch_ids : [],
      })
      Alert.alert('Success', `${newAdmin.role === 'super_admin' ? 'Super admin' : 'Branch admin'} account created`)
      setNewAdmin({ name: '', email: '', password: '', role: 'branch_admin', branch_ids: [] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create account'
      Alert.alert('Error', msg)
    } finally {
      setCreatingAdmin(false)
    }
  }

  const activeVendors = vendors.filter((v) => v.status === 'active')
  const totalRevenue = shipments
    .filter((s) => s.payment_status === 'paid' && s.final_quote)
    .reduce((sum, s) => sum + (s.final_quote || 0), 0)
  const deliveredCount = shipments.filter((s) => s.status === 'delivered').length
  const inTransitCount = shipments.filter((s) => s.status === 'in_transit').length
  const pendingCount = shipments.filter((s) => s.status === 'pending').length
  const completionRate = shipments.length > 0 ? Math.round((deliveredCount / shipments.length) * 100) : 0

  const statusDist = useMemo(() => {
    return (Object.keys(STATUS_COLORS) as Filter[])
      .map((status) => ({ status, value: shipments.filter((s) => s.status === status).length }))
      .filter((d) => d.value > 0)
  }, [shipments])
  const maxStatus = Math.max(1, ...statusDist.map((d) => d.value))

  const days = useMemo(() => {
    const now = new Date()
    const out: { label: string; value: number }[] = []
    const byDay = new Map<string, number>()
    for (const s of shipments) {
      if (!s.created_at) continue
      const key = dayKey(new Date(s.created_at))
      byDay.set(key, (byDay.get(key) || 0) + 1)
    }
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      out.push({ label: d.getDate().toString(), value: byDay.get(dayKey(d)) || 0 })
    }
    return out
  }, [shipments])
  const maxDay = Math.max(1, ...days.map((d) => d.value))

  const visible = shipments.filter((s) => filter === 'all' || s.status === filter)

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
      <View style={styles.tabRow}>
        {(['overview', 'shipments', 'vendors', ...(isSuper ? ['admins'] as Tab[] : []), 'settings'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={tabStyle(t)}>
            <Text style={tabTextStyle(t)}>{t === 'overview' ? 'Overview' : t === 'shipments' ? `Shipments (${shipments.length})` : t === 'vendors' ? `Vendors (${vendors.length})` : t === 'admins' ? 'Admins' : 'Settings'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 24 }}>
        {tab === 'overview' && (
          <>
            <Text style={styles.title}>Overview</Text>
            <Text style={styles.regionNote}>{isSuper ? 'Scope: Whole Nepal (all branches)' : 'Scope: Your assigned region(s)'}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statCard}><Text style={styles.statNum}>{shipments.length}</Text><Text style={styles.statLabel}>Total</Text></View>
              <View style={styles.statCard}><Text style={[styles.statNum, { color: '#f5a623' }]}>{pendingCount}</Text><Text style={styles.statLabel}>Pending</Text></View>
              <View style={styles.statCard}><Text style={[styles.statNum, { color: '#5aa9e6' }]}>{inTransitCount}</Text><Text style={styles.statLabel}>In Transit</Text></View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}><Text style={[styles.statNum, { color: '#4caf7d' }]}>{deliveredCount}</Text><Text style={styles.statLabel}>Delivered</Text></View>
              <View style={styles.statCard}><Text style={[styles.statNum, { color: COLORS.saffron[300] }]}>{completionRate}%</Text><Text style={styles.statLabel}>Completion</Text></View>
              <View style={styles.statCard}><Text style={[styles.statNum, { color: '#b07cc6' }]}>{vendors.length}</Text><Text style={styles.statLabel}>Vendors</Text></View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Revenue</Text>
              <Text style={styles.revenue}>{money(totalRevenue)}</Text>
              <Text style={styles.cardSub}>from {shipments.filter((s) => s.payment_status === 'paid').length} paid shipments · {activeVendors.length} active movers</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Status Distribution</Text>
              {statusDist.length === 0 ? (
                <Text style={styles.empty}>No shipments yet.</Text>
              ) : (
                statusDist.map((d) => (
                  <View key={d.status} style={styles.hBarRow}>
                    <Text style={[styles.hBarLabel, { color: STATUS_COLORS[d.status] }]}>{d.status.replace('_', ' ')}</Text>
                    <View style={styles.hBarTrack}>
                      <View style={[styles.hBarFill, { backgroundColor: STATUS_COLORS[d.status], width: `${Math.max((d.value / maxStatus) * 100, 4)}%` }]} />
                    </View>
                    <Text style={styles.hBarValue}>{d.value}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Shipments</Text>
              <Text style={styles.cardSub}>Last 7 days</Text>
              <View style={styles.vBarRow}>
                {days.map((d) => (
                  <View key={d.label} style={styles.vBarCol}>
                    <Text style={styles.vBarValue}>{d.value}</Text>
                    <View style={styles.vBarTrack}>
                      <View style={[styles.vBarFill, { height: `${Math.max((d.value / maxDay) * 100, d.value > 0 ? 8 : 2)}%` }]} />
                    </View>
                    <Text style={styles.vBarLabel}>{d.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {tab === 'shipments' && (
          <>
            <Text style={styles.title}>All Shipments</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={styles.filterRow}>
                {FILTERS.map((f) => (
                  <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            {visible.length === 0 ? (
              <Text style={styles.empty}>No shipments here.</Text>
            ) : (
              visible.map((s) => (
                <View key={s.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.idText}>{s.booking_id}</Text>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[s.status] || COLORS.saffron[300] }]}>{s.status}</Text>
                  </View>
                  <Text style={styles.route}>{s.pickup_city} → {s.drop_city}</Text>
                  <Text style={styles.customer}>{s.first_name} {s.last_name} · {s.mobile_number}</Text>
                  <Text style={styles.customer}>Approval: {s.approval_status}{s.vendor_name ? ` · Mover: ${s.vendor_name}` : ''}</Text>
                  <Text style={styles.customer}>Payment: {s.payment_status}{s.final_quote ? ` · ${money(s.final_quote)}` : ''}</Text>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'vendors' && (
          <>
            <Text style={styles.title}>Movers</Text>
            {vendors.length === 0 ? (
              <Text style={styles.empty}>No movers registered.</Text>
            ) : (
              vendors.map((v) => (
                <View key={v.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <Text style={styles.idText}>{v.business_name}</Text>
                    <Text style={[styles.statusText, { color: v.status === 'active' ? '#4caf7d' : COLORS.saffron[300] }]}>{v.status}</Text>
                  </View>
                  <Text style={styles.route}>{v.service_region || 'No region'} · {v.rating || '—'}★ · {v.total_jobs || 0} jobs</Text>
                  <Text style={styles.customer}>Branch: {v.branch_name || '—'}</Text>
                  <Text style={styles.customer}>{v.owner_name || ''}{v.phone ? ` · ${v.phone}` : ''}</Text>
                  <TouchableOpacity
                    onPress={() => toggleVendorStatus(v.id, v.status === 'active' ? 'inactive' : 'active')}
                    style={v.status === 'active' ? styles.redBtn : styles.greenBtn}>
                    <Text style={v.status === 'active' ? styles.redBtnText : styles.btnText}>
                      {v.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'admins' && isSuper && (
          <>
            <Text style={styles.title}>Admin Accounts</Text>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Create Admin Account</Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor={COLORS.forest[400]}
                value={newAdmin.name}
                onChangeText={(v) => setNewAdmin({ ...newAdmin, name: v })}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={COLORS.forest[400]}
                autoCapitalize="none"
                keyboardType="email-address"
                value={newAdmin.email}
                onChangeText={(v) => setNewAdmin({ ...newAdmin, email: v })}
              />
              <TextInput
                style={styles.input}
                placeholder="Password (min 6 chars)"
                placeholderTextColor={COLORS.forest[400]}
                secureTextEntry
                value={newAdmin.password}
                onChangeText={(v) => setNewAdmin({ ...newAdmin, password: v })}
              />
              <View style={styles.chipRowWrap}>
                {(['branch_admin', 'super_admin'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setNewAdmin({ ...newAdmin, role: r })}
                    style={[styles.chip, newAdmin.role === r ? styles.chipActive : null]}>
                    <Text style={[styles.chipText, newAdmin.role === r ? styles.chipTextActive : null]}>
                      {r === 'branch_admin' ? 'Branch Admin' : 'Super Admin'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {newAdmin.role === 'branch_admin' && (
                <>
                  <Text style={styles.fieldLabel}>Assign branch(es)</Text>
                  <View style={styles.chipRowWrap}>
                    {branches.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => toggleBranchId(b.id)}
                        style={[styles.chip, newAdmin.branch_ids.includes(b.id) ? styles.chipActive : null]}>
                        <Text style={[styles.chipText, newAdmin.branch_ids.includes(b.id) ? styles.chipTextActive : null]}>
                          {b.name.replace(' Province', '')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <TouchableOpacity onPress={createAdmin} disabled={creatingAdmin} style={styles.saveBtn}>
                <Text style={styles.saveText}>{creatingAdmin ? 'Creating...' : 'Create Account'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {tab === 'settings' && (
          <>
            <Text style={styles.title}>Settings</Text>
            {Object.entries(draftSettings).length === 0 ? (
              <Text style={styles.empty}>No settings configured.</Text>
            ) : (
              <>
                {Object.entries(draftSettings).map(([key, value]) => (
                  <View key={key} style={styles.card}>
                    <Text style={styles.cardSub}>{key}</Text>
                    <TextInput
                      value={value}
                      onChangeText={(v) => setDraftSettings((prev) => ({ ...prev, [key]: v }))}
                      style={styles.input}
                      placeholderTextColor={COLORS.forest[400]}
                    />
                  </View>
                ))}
                <TouchableOpacity onPress={saveSettings} disabled={saving} style={styles.saveBtn}>
                  <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save All'}</Text>
                </TouchableOpacity>
              </>
            )}
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
  regionNote: { color: COLORS.forest[400], fontSize: 12, marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
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
  revenue: { color: COLORS.saffron[400], fontSize: 26, fontWeight: '900' },
  empty: { color: COLORS.forest[400], fontSize: 15 },
  hBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  hBarLabel: { width: 90, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  hBarTrack: { flex: 1, height: 18, backgroundColor: COLORS.forest[800], borderRadius: 4, overflow: 'hidden' },
  hBarFill: { height: '100%', borderRadius: 4 },
  hBarValue: { width: 30, textAlign: 'right', color: COLORS.cream[200], fontSize: 12, fontWeight: '600' },
  redBtn: { backgroundColor: 'rgba(220,38,38,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, alignSelf: 'flex-start', marginTop: 10 },
  redBtnText: { color: '#ef7b7b', fontWeight: '600', fontSize: 13 },
  greenBtn: { backgroundColor: 'rgba(76,175,125,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, alignSelf: 'flex-start', marginTop: 10 },
  btnText: { color: '#4caf7d', fontWeight: '600', fontSize: 13 },
  vBarRow: { flexDirection: 'row', alignItems: 'flex-end', height: 140, marginTop: 8 },
  vBarCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  vBarValue: { color: COLORS.cream[200], fontSize: 10, fontWeight: '600', marginBottom: 4 },
  vBarTrack: { width: 22, flex: 1, backgroundColor: COLORS.forest[800], borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  vBarFill: { width: '100%', backgroundColor: 'rgba(245,166,35,0.85)', borderRadius: 4 },
  vBarLabel: { color: COLORS.forest[500], fontSize: 10, marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700] },
  filterChipActive: { backgroundColor: 'rgba(245,166,35,0.18)', borderColor: COLORS.saffron[400] },
  filterText: { color: COLORS.forest[300], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  filterTextActive: { color: COLORS.saffron[300] },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  idText: { color: COLORS.cream[50], fontSize: 14, fontWeight: '700' },
  statusText: { color: COLORS.saffron[300], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  route: { color: COLORS.forest[300], fontSize: 14, marginBottom: 4 },
  customer: { color: COLORS.forest[400], fontSize: 13, marginBottom: 2 },
  input: {
    backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600], borderRadius: 4,
    color: COLORS.cream[50], paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10,
  },
  saveBtn: { backgroundColor: COLORS.saffron[400], paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginTop: 4 },
  saveText: { color: COLORS.forest[900], fontWeight: '700', fontSize: 15 },
  sectionTitle: { color: COLORS.cream[50], fontSize: 15, fontWeight: '700', marginBottom: 10 },
  fieldLabel: { color: COLORS.forest[300], fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600] },
  chipActive: { backgroundColor: 'rgba(245,166,35,0.18)', borderColor: COLORS.saffron[400] },
  chipText: { color: COLORS.forest[300], fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.saffron[300] },
})

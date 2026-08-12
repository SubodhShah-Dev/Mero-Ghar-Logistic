import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { SHIPMENTS, ADMIN } from '../services/api'
import { COLORS } from '../utils/theme'

type Filter = 'all' | 'pending' | 'approved' | 'delivered'

export default function AdminScreen() {
  const [shipments, setShipments] = useState<any[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await SHIPMENTS.getAll()
      setShipments(res.data.shipments || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const approveShipment = async (id: number) => {
    try {
      await ADMIN.approveShipment(id)
      Alert.alert('Success', 'Shipment approved')
      await load()
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to approve')
    }
  }

  const rejectShipment = async (id: number) => {
    Alert.alert('Reject shipment?', 'This will mark the booking as rejected.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await ADMIN.rejectShipment(id)
            Alert.alert('Success', 'Shipment rejected')
            await load()
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to reject')
          }
        },
      },
    ])
  }

  const visible = shipments.filter((s) => {
    if (filter === 'all') return true
    return s.status === filter || s.approval_status === filter
  })

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.saffron[400]} />
      </View>
    )
  }

  const filters: Filter[] = ['all', 'pending', 'approved', 'delivered']

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{shipments.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{shipments.filter((s) => s.status === 'pending' && s.approval_status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Unmatched</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{shipments.filter((s) => s.status === 'delivered').length}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.title, { marginTop: 8 }]}>All Shipments</Text>
      <Text style={{ color: COLORS.forest[500], fontSize: 12, marginBottom: 12 }}>
        Approve/Reject only shows for unmatched bookings — no mover was auto-assigned.
      </Text>
      {visible.length === 0 ? (
        <Text style={{ color: COLORS.forest[400], fontSize: 15 }}>No shipments here.</Text>
      ) : (
        visible.map((s: any) => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.idText}>{s.booking_id}</Text>
              <Text style={styles.statusText}>{s.status}</Text>
            </View>
            <Text style={styles.routeText}>{s.pickup_city} → {s.drop_city}</Text>
            <Text style={styles.customerText}>{s.first_name} {s.last_name} · {s.mobile_number}</Text>
            {s.payment_status !== 'pending' && (
              <Text style={{ color: COLORS.saffron[300], fontSize: 12, marginTop: 4 }}>
                Payment: {s.payment_status}
              </Text>
            )}
            <Text style={{ color: COLORS.forest[400], fontSize: 12, marginTop: 2 }}>
              Approval: {s.approval_status}{s.vendor_name ? ` · Mover: ${s.vendor_name}` : ''}
            </Text>
            {s.approval_status === 'pending' && s.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity onPress={() => approveShipment(s.id)}
                  style={[styles.actionBtn, { backgroundColor: '#4caf7d' }]}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => rejectShipment(s.id)}
                  style={[styles.actionBtn, { backgroundColor: '#c0393b' }]}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.forest[950], padding: 16 },
  center: { flex: 1, backgroundColor: COLORS.forest[950], justifyContent: 'center', alignItems: 'center' },
  title: { color: COLORS.cream[50], fontSize: 22, fontWeight: '900', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 16, alignItems: 'center' },
  statNum: { color: COLORS.saffron[400], fontSize: 28, fontWeight: '900' },
  statLabel: { color: COLORS.forest[400], fontSize: 12, marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700] },
  filterChipActive: { backgroundColor: 'rgba(245,166,35,0.18)', borderColor: COLORS.saffron[400] },
  filterText: { color: COLORS.forest[300], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' as const },
  filterTextActive: { color: COLORS.saffron[300] },
  card: { backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 16, marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  idText: { color: COLORS.cream[50], fontSize: 14, fontWeight: '700' },
  statusText: { color: COLORS.saffron[300], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' as const },
  routeText: { color: COLORS.forest[300], fontSize: 14, marginBottom: 4 },
  customerText: { color: COLORS.forest[400], fontSize: 13 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
})
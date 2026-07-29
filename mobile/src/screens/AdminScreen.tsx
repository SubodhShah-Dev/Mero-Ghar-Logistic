import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { SHIPMENTS, ADMIN } from '../services/api'
import { COLORS } from '../utils/theme'

export default function AdminScreen() {
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await SHIPMENTS.getAll()
        setShipments(res.data.shipments || [])
      } catch {} finally {
        setLoading(false)
      }
    })()
  }, [])

  const approveShipment = async (id: number) => {
    try {
      await ADMIN.approveShipment(id)
      Alert.alert('Success', 'Shipment approved')
      const res = await SHIPMENTS.getAll()
      setShipments(res.data.shipments || [])
    } catch {
      Alert.alert('Error', 'Failed to approve')
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.saffron[400]} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{shipments.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{shipments.filter((s) => s.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{shipments.filter((s) => s.status === 'delivered').length}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
      </View>

      <Text style={[styles.title, { marginTop: 24 }]}>All Shipments</Text>
      {shipments.map((s: any) => (
        <View key={s.id} style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.idText}>{s.booking_id}</Text>
            <Text style={styles.statusText}>{s.status}</Text>
          </View>
          <Text style={styles.routeText}>{s.pickup_city} → {s.drop_city}</Text>
          <Text style={styles.customerText}>{s.first_name} {s.last_name} · {s.mobile_number}</Text>
          {s.status === 'pending' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity onPress={() => approveShipment(s.id)}
                style={{ backgroundColor: '#4caf7d', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.forest[950], padding: 16 },
  center: { flex: 1, backgroundColor: COLORS.forest[950], justifyContent: 'center', alignItems: 'center' },
  title: { color: COLORS.cream[50], fontSize: 22, fontWeight: '900', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 16, alignItems: 'center' },
  statNum: { color: COLORS.saffron[400], fontSize: 28, fontWeight: '900' },
  statLabel: { color: COLORS.forest[400], fontSize: 12, marginTop: 4 },
  card: { backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 16, marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  idText: { color: COLORS.cream[50], fontSize: 14, fontWeight: '700' },
  statusText: { color: COLORS.saffron[300], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' as const },
  routeText: { color: COLORS.forest[300], fontSize: 14, marginBottom: 4 },
  customerText: { color: COLORS.forest[400], fontSize: 13 },
})

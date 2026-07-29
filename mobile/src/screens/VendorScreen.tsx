import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { VENDOR } from '../services/api'
import { COLORS } from '../utils/theme'

export default function VendorScreen() {
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await VENDOR.getShipments()
        setShipments(res.data.shipments || [])
      } catch {} finally {
        setLoading(false)
      }
    })()
  }, [])

  const updateStatus = async (id: number, action: 'accept' | 'start' | 'complete') => {
    try {
      const actions: Record<string, () => Promise<any>> = {
        accept: () => VENDOR.acceptShipment(id),
        start: () => VENDOR.startDelivery(id),
        complete: () => VENDOR.completeDelivery(id),
      }
      await actions[action]()
      Alert.alert('Success', `Job ${action}ed`)
      const res = await VENDOR.getShipments()
      setShipments(res.data.shipments || [])
    } catch {
      Alert.alert('Error', 'Failed to update')
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
      <Text style={styles.title}>My Jobs</Text>
      {shipments.length === 0 ? (
        <Text style={{ color: COLORS.forest[400], fontSize: 15 }}>No jobs assigned.</Text>
      ) : (
        shipments.map((s: any) => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.idText}>{s.booking_id}</Text>
              <Text style={[styles.statusText, s.status === 'delivered' && { color: '#4caf7d' }]}>
                {s.status.replace('_', ' ')}
              </Text>
            </View>
            <Text style={styles.route}>{s.pickup_city} → {s.drop_city}</Text>
            <Text style={styles.detail}>Customer: {s.first_name} {s.last_name}</Text>
            <Text style={styles.detail}>Phone: {s.mobile_number}</Text>
            <Text style={styles.detail}>Move Date: {s.move_date}</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {s.status === 'pending' && (
                <>
                  <TouchableOpacity onPress={() => updateStatus(s.id, 'accept')}
                    style={styles.greenBtn}>
                    <Text style={styles.btnText}>Accept</Text>
                  </TouchableOpacity>
                </>
              )}
              {s.status === 'accepted' && (
                <TouchableOpacity onPress={() => updateStatus(s.id, 'start')}
                  style={styles.goldBtn}>
                  <Text style={[styles.btnText, { color: COLORS.forest[900] }]}>Start Delivery</Text>
                </TouchableOpacity>
              )}
              {s.status === 'in_transit' && (
                <TouchableOpacity onPress={() => updateStatus(s.id, 'complete')}
                  style={styles.greenBtn}>
                  <Text style={styles.btnText}>Mark Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
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
  card: { backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 16, marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  idText: { color: COLORS.cream[50], fontSize: 15, fontWeight: '700' },
  statusText: { color: COLORS.saffron[300], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' as const },
  route: { color: COLORS.forest[300], fontSize: 14, marginBottom: 4 },
  detail: { color: COLORS.forest[400], fontSize: 13, marginBottom: 2 },
  greenBtn: { backgroundColor: 'rgba(76,175,125,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
  goldBtn: { backgroundColor: 'rgba(245,166,35,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
  btnText: { color: '#4caf7d', fontWeight: '600', fontSize: 13 },
})

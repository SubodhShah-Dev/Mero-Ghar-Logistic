import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { SHIPMENTS } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { COLORS } from '../utils/theme'
import type { RootStackParamList } from '../App'

type Nav = StackNavigationProp<RootStackParamList, 'MyBookings'>

export default function MyBookingsScreen() {
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigation = useNavigation<Nav>()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const res = await SHIPMENTS.getMy()
        setShipments(res.data.shipments || [])
      } catch {} finally {
        setLoading(false)
      }
    })()
  }, [user])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.saffron[400]} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {shipments.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: COLORS.forest[400], fontSize: 15 }}>No bookings found.</Text>
        </View>
      ) : (
        shipments.map((s: any) => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.bookingId}>{s.booking_id}</Text>
              <Text style={[styles.status, s.status === 'delivered' && { color: '#4caf7d' }]}>
                {s.status.replace('_', ' ')}
              </Text>
            </View>
            <Text style={styles.route}>{s.pickup_city} → {s.drop_city}</Text>
            <Text style={styles.detail}>Vehicle: {s.vehicle_type}</Text>
            {s.vendor_name && (
              <View style={styles.vendorBlock}>
                <Text style={styles.detail}>Mover: {s.vendor_name}</Text>
                {s.vendor_phone && <Text style={styles.detail}>Phone: {s.vendor_phone}</Text>}
              </View>
            )}
            {s.final_quote && <Text style={styles.quote}>NPR {s.final_quote.toLocaleString()}</Text>}
            {s.vendor_name ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('Chat', { shipmentId: s.id, senderRole: 'customer', title: `Chat with ${s.vendor_name}` })}
                style={styles.chatBtn}>
                <Text style={styles.chatBtnText}>Chat with your mover</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.waitingText}>
                Searching for a mover in your region… you'll be able to chat once one is assigned.
              </Text>
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
  card: { backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bookingId: { color: COLORS.cream[50], fontSize: 16, fontWeight: '700' },
  status: { color: COLORS.saffron[300], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' as const },
  route: { color: COLORS.forest[300], fontSize: 14, marginBottom: 4 },
  detail: { color: COLORS.forest[400], fontSize: 13, marginBottom: 2 },
  quote: { color: COLORS.saffron[400], fontSize: 15, fontWeight: '700' },
  vendorBlock: { marginTop: 6 },
  chatBtn: { backgroundColor: 'rgba(64,145,210,0.2)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 4, marginTop: 12, alignSelf: 'flex-start' },
  chatBtnText: { color: '#5aa9e6', fontWeight: '600', fontSize: 13 },
  waitingText: { color: COLORS.forest[500], fontSize: 12, marginTop: 10, fontStyle: 'italic' },
})

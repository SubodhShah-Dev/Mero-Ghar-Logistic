import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native'
import { VENDOR, TICKETS } from '../services/api'
import { COLORS } from '../utils/theme'

type Tab = 'jobs' | 'fleet' | 'tickets'

export default function VendorScreen() {
  const [tab, setTab] = useState<Tab>('jobs')
  const [shipments, setShipments] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reload = async () => {
    try {
      const [shipRes, vehRes, tickRes] = await Promise.all([
        VENDOR.getShipments(),
        VENDOR.getVehicles(),
        TICKETS.getMine(),
      ])
      setShipments(shipRes.data.shipments || [])
      setVehicles(vehRes.data.vehicles || [])
      setTickets(tickRes.data.tickets || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.saffron[400]} />
      </View>
    )
  }

  const tabStyle = (t: Tab) => [
    styles.tab,
    tab === t && styles.tabActive,
  ]

  return (
    <ScrollView style={styles.container}>
      <View style={styles.tabRow}>
        {(['jobs', 'fleet', 'tickets'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={tabStyle(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'jobs' ? `Jobs (${shipments.length})` : t === 'fleet' ? `Fleet (${vehicles.length})` : `Support (${tickets.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'jobs' && (
        <>
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
                {s.final_quote ? <Text style={styles.quote}>NPR {s.final_quote.toLocaleString()}</Text> : null}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {s.status === 'pending' && (
                    <TouchableOpacity onPress={() => updateStatus(s.id, 'accept')}
                      style={styles.greenBtn}>
                      <Text style={styles.btnText}>Accept</Text>
                    </TouchableOpacity>
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
        </>
      )}

      {tab === 'fleet' && (
        <>
          {vehicles.length === 0 ? (
            <Text style={{ color: COLORS.forest[400], fontSize: 15 }}>No vehicles added. Add them from the web vendor portal.</Text>
          ) : (
            vehicles.map((v: any) => (
              <View key={v.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.idText}>{v.name}</Text>
                  <Text style={styles.statusText}>{v.status.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.detail}>{v.vehicle_type} · {v.plate_number}</Text>
                <Text style={styles.detail}>Driver: {v.driver_name}</Text>
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
            ))
          )}
        </>
      )}

      {tab === 'tickets' && (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Raise a Support Ticket</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Subject"
              placeholderTextColor={COLORS.forest[400]}
              style={styles.input}
            />
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue..."
              placeholderTextColor={COLORS.forest[400]}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.forest[950], padding: 16 },
  center: { flex: 1, backgroundColor: COLORS.forest[950], justifyContent: 'center', alignItems: 'center' },
  title: { color: COLORS.cream[50], fontSize: 22, fontWeight: '900', marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 4, backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700] },
  tabActive: { backgroundColor: 'rgba(245,166,35,0.18)', borderColor: COLORS.saffron[400] },
  tabText: { color: COLORS.forest[300], fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.saffron[300] },
  card: { backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 16, marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  idText: { color: COLORS.cream[50], fontSize: 15, fontWeight: '700' },
  statusText: { color: COLORS.saffron[300], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' as const },
  route: { color: COLORS.forest[300], fontSize: 14, marginBottom: 4 },
  detail: { color: COLORS.forest[400], fontSize: 13, marginBottom: 2 },
  quote: { color: COLORS.saffron[400], fontSize: 15, fontWeight: '700', marginTop: 4 },
  sectionTitle: { color: COLORS.cream[50], fontSize: 15, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600], borderRadius: 4, color: COLORS.cream[50], paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  greenBtn: { backgroundColor: 'rgba(76,175,125,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, alignSelf: 'flex-start' },
  goldBtn: { backgroundColor: 'rgba(245,166,35,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, alignSelf: 'flex-start' },
  btnText: { color: '#4caf7d', fontWeight: '600', fontSize: 13 },
})
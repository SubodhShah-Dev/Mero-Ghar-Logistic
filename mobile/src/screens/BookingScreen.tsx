import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SHIPMENTS } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { COLORS } from '../utils/theme'

const homeSizes = ['1 Room', '1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Full House']
const itemOptions = ['Furniture', 'Electronics', 'Kitchen', 'Clothes', 'Books', 'Gym Equipment', 'Religious Items', 'Musical Instruments']
const vehicleOptions = ['Cargo Tempo', 'Mini Truck', 'Large Truck']
const paymentMethods = ['eSewa', 'Khalti', 'IME Pay', 'ConnectIPS', 'Cash']

export default function BookingScreen() {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()

  const [form, setForm] = useState({
    pickup_province: '', pickup_district: '', pickup_city: '', pickup_ward: '', pickup_floor: '',
    drop_province: '', drop_district: '', drop_city: '', drop_ward: '', drop_floor: '',
    home_size: '', selected_items: [] as string[], fragile_items: '',
    vehicle_type: '',
    add_on_services: [] as string[], move_date: '', preferred_time_slot: '', move_reason: '',
    first_name: '', last_name: '', mobile_number: '', alternate_mobile: '', email: '',
    payment_method: '', special_notes: '',
  })

  const update = (field: string, value: string) => setForm({ ...form, [field]: value })
  const toggleItem = (field: 'selected_items' | 'add_on_services', value: string) => {
    const arr = form[field]
    setForm({ ...form, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] })
  }

  const steps = ['Location', 'Items', 'Vehicle', 'Extras', 'Contact']

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await SHIPMENTS.create({
        ...form,
        user_id: user?.id || null,
        selected_items: JSON.stringify(form.selected_items),
        add_on_services: JSON.stringify(form.add_on_services),
      })
      if (res.data.success) {
        Alert.alert('Success', 'Booking submitted! We will contact you within 2 hours.')
        setStep(0)
      } else {
        Alert.alert('Error', res.data.message || 'Failed to create booking')
      }
    } catch {
      Alert.alert('Error', 'Server error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = { backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600], borderRadius: 4, paddingHorizontal: 16, paddingVertical: 12, color: COLORS.cream[50], fontSize: 15, minHeight: 48, marginBottom: 12 }
  const labelStyle = { color: COLORS.cream[200], fontSize: 14, fontWeight: '500' as const, marginBottom: 6 }
  const chipStyle = (active: boolean) => ({
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, borderWidth: 1,
    borderColor: active ? COLORS.saffron[400] : COLORS.forest[600],
    backgroundColor: active ? COLORS.saffron[400] : COLORS.forest[800],
    minHeight: 44, justifyContent: 'center' as const, alignItems: 'center' as const,
  })
  const chipText = (active: boolean) => ({
    color: active ? COLORS.forest[900] : COLORS.forest[300],
    fontSize: 13, fontWeight: '600' as const,
  })

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.forest[950] }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: COLORS.saffron[400], fontSize: 13, marginBottom: 24 }}>
        Step {step + 1} of 5: {steps[step]}
      </Text>

      {step === 0 && (
        <>
          <Text style={labelStyle}>Pickup Province</Text>
          <TextInput style={inputStyle} value={form.pickup_province} onChangeText={(v) => update('pickup_province', v)} placeholder="e.g. Bagmati" placeholderTextColor={COLORS.forest[400]} />
          <Text style={labelStyle}>Pickup District</Text>
          <TextInput style={inputStyle} value={form.pickup_district} onChangeText={(v) => update('pickup_district', v)} placeholder="e.g. Kathmandu" placeholderTextColor={COLORS.forest[400]} />
          <Text style={labelStyle}>Pickup City</Text>
          <TextInput style={inputStyle} value={form.pickup_city} onChangeText={(v) => update('pickup_city', v)} placeholder="e.g. Lalitpur" placeholderTextColor={COLORS.forest[400]} />
          <Text style={labelStyle}>Drop Province</Text>
          <TextInput style={inputStyle} value={form.drop_province} onChangeText={(v) => update('drop_province', v)} placeholder="e.g. Gandaki" placeholderTextColor={COLORS.forest[400]} />
          <Text style={labelStyle}>Drop District</Text>
          <TextInput style={inputStyle} value={form.drop_district} onChangeText={(v) => update('drop_district', v)} placeholder="e.g. Kaski" placeholderTextColor={COLORS.forest[400]} />
          <Text style={labelStyle}>Drop City</Text>
          <TextInput style={inputStyle} value={form.drop_city} onChangeText={(v) => update('drop_city', v)} placeholder="e.g. Pokhara" placeholderTextColor={COLORS.forest[400]} />
        </>
      )}

      {step === 1 && (
        <>
          <Text style={labelStyle}>Home Size</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {homeSizes.map((s) => (
              <TouchableOpacity key={s} onPress={() => update('home_size', s)} style={chipStyle(form.home_size === s)}>
                <Text style={chipText(form.home_size === s)}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={labelStyle}>Items to Move</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {itemOptions.map((item) => (
              <TouchableOpacity key={item} onPress={() => toggleItem('selected_items', item)} style={chipStyle(form.selected_items.includes(item))}>
                <Text style={chipText(form.selected_items.includes(item))}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={labelStyle}>Fragile / Special Items</Text>
          <TextInput style={[inputStyle, { minHeight: 80 }]} value={form.fragile_items} onChangeText={(v) => update('fragile_items', v)} placeholder="Glassware, idols, etc." placeholderTextColor={COLORS.forest[400]} multiline />
        </>
      )}

      {step === 2 && (
        <>
          <Text style={labelStyle}>Vehicle Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {vehicleOptions.map((v) => (
              <TouchableOpacity key={v} onPress={() => update('vehicle_type', v)} style={chipStyle(form.vehicle_type === v)}>
                <Text style={chipText(form.vehicle_type === v)}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <Text style={labelStyle}>Move Date</Text>
          <TextInput style={inputStyle} value={form.move_date} onChangeText={(v) => update('move_date', v)} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.forest[400]} />
          <Text style={labelStyle}>Preferred Time</Text>
          <TextInput style={inputStyle} value={form.preferred_time_slot} onChangeText={(v) => update('preferred_time_slot', v)} placeholder="e.g. 6-9 AM" placeholderTextColor={COLORS.forest[400]} />
          <Text style={labelStyle}>Special Notes</Text>
          <TextInput style={[inputStyle, { minHeight: 80 }]} value={form.special_notes} onChangeText={(v) => update('special_notes', v)} placeholder="Auspicious timing, narrow roads..." placeholderTextColor={COLORS.forest[400]} multiline />
        </>
      )}

      {step === 4 && (
        <>
          <Text style={labelStyle}>First Name</Text>
          <TextInput style={inputStyle} value={form.first_name} onChangeText={(v) => update('first_name', v)} placeholder="Ram" placeholderTextColor={COLORS.forest[400]} />
          <Text style={labelStyle}>Last Name</Text>
          <TextInput style={inputStyle} value={form.last_name} onChangeText={(v) => update('last_name', v)} placeholder="Sharma" placeholderTextColor={COLORS.forest[400]} />
          <Text style={labelStyle}>Mobile</Text>
          <TextInput style={inputStyle} value={form.mobile_number} onChangeText={(v) => update('mobile_number', v)} placeholder="98XXXXXXXX" placeholderTextColor={COLORS.forest[400]} keyboardType="phone-pad" maxLength={10} />
          <Text style={labelStyle}>Email</Text>
          <TextInput style={inputStyle} value={form.email} onChangeText={(v) => update('email', v)} placeholder="your@email.com" placeholderTextColor={COLORS.forest[400]} keyboardType="email-address" autoCapitalize="none" />
          <Text style={labelStyle}>Payment Method</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {paymentMethods.map((pm) => (
              <TouchableOpacity key={pm} onPress={() => update('payment_method', pm.toLowerCase())} style={chipStyle(form.payment_method === pm.toLowerCase())}>
                <Text style={chipText(form.payment_method === pm.toLowerCase())}>{pm}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
        <TouchableOpacity onPress={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          style={{ padding: 12, opacity: step === 0 ? 0.3 : 1 }}>
          <Text style={{ color: COLORS.forest[400], fontSize: 15 }}>← Back</Text>
        </TouchableOpacity>

        {step < 4 ? (
          <TouchableOpacity onPress={() => setStep(step + 1)}
            style={{ backgroundColor: COLORS.saffron[400], paddingHorizontal: 32, paddingVertical: 14, borderRadius: 4 }}>
            <Text style={{ color: COLORS.forest[900], fontWeight: '700', fontSize: 15 }}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSubmit} disabled={submitting}
            style={{ backgroundColor: COLORS.saffron[400], paddingHorizontal: 32, paddingVertical: 14, borderRadius: 4, opacity: submitting ? 0.5 : 1 }}>
            <Text style={{ color: COLORS.forest[900], fontWeight: '700', fontSize: 15 }}>
              {submitting ? 'Submitting...' : 'Submit Booking'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

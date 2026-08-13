import React, { useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { SHIPMENTS, PAYMENT, VENDOR, GEOCODE } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { COLORS, FONTS } from '../utils/theme'
import { provinces, getDistricts } from '../utils/nepal'
import { quoteFor } from '../utils/pricing'
import type { RootStackParamList } from '../App'

type Nav = StackNavigationProp<RootStackParamList>

interface FormState {
  pickup_province: string
  pickup_district: string
  pickup_city: string
  pickup_ward: string
  pickup_floor: string
  drop_province: string
  drop_district: string
  drop_city: string
  drop_ward: string
  drop_floor: string
  selected_items: string[]
  fragile_items: string
  vehicle_type: string
  add_on_services: string[]
  move_date: string
  preferred_time_slot: string
  move_reason: string
  first_name: string
  last_name: string
  mobile_number: string
  alternate_mobile: string
  email: string
  payment_method: string
  special_notes: string
}

interface PickerTarget {
  field: string
  title: string
  options: string[]
}

interface PaymentInfo {
  amount: number
  transaction_id: string
  booking_id: string
  payment_method: string
  customer_name: string
  customer_email: string
  customer_phone: string
}

const itemOptions = ['Furniture', 'Electronics', 'Kitchen', 'Clothes', 'Books', 'Gym Equipment', 'Religious Items', 'Musical Instruments']
const vehicleOptions = [
  { value: 'Cargo Tempo', desc: 'Best for narrow lanes & valley moves', icon: '🛺' },
  { value: 'Mini Truck', desc: 'Perfect for inter-city 1-2 BHK moves', icon: '🚛' },
  { value: 'Large Truck', desc: 'Ideal for full household moves', icon: '🚚' },
]
const paymentMethods = ['eSewa', 'Khalti', 'IME Pay', 'ConnectIPS', 'Cash']

const formatNPR = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const chipStyle = (active: boolean) => ({
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: active ? COLORS.saffron[400] : COLORS.forest[600],
  backgroundColor: active ? COLORS.saffron[400] : COLORS.forest[800],
  minHeight: 44,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
})

const chipText = (active: boolean) => ({
  color: active ? COLORS.forest[900] : COLORS.forest[300],
  fontSize: 13,
  fontWeight: '600' as const,
})

const makeInitialForm = (user: { name?: string; email?: string } | null): FormState => ({
  pickup_province: '',
  pickup_district: '',
  pickup_city: '',
  pickup_ward: '',
  pickup_floor: '',
  drop_province: '',
  drop_district: '',
  drop_city: '',
  drop_ward: '',
  drop_floor: '',
  selected_items: [],
  fragile_items: '',
  vehicle_type: '',
  add_on_services: [],
  move_date: '',
  preferred_time_slot: '',
  move_reason: '',
  first_name: user?.name?.split(' ')[0] || '',
  last_name: user?.name?.split(' ').slice(1).join(' ') || '',
  mobile_number: '',
  alternate_mobile: '',
  email: user?.email || '',
  payment_method: '',
  special_notes: '',
})

export default function BookingScreen() {
  const navigation = useNavigation<Nav>()
  const { user } = useAuth()
  const scrollRef = useRef<ScrollView>(null)

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(() => makeInitialForm(user))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [picker, setPicker] = useState<PickerTarget | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [payMobile, setPayMobile] = useState('')
  const [payPassword, setPayPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [matchingVendors, setMatchingVendors] = useState<Array<{ id: number; business_name: string; rating: number; total_jobs: number; service_region: string; branch_name?: string; match_tier?: string }>>([])
  const [selectedVendor, setSelectedVendor] = useState<number | null>(null)

  const [calendarVisible, setCalendarVisible] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number | null; durationMin: number | null; error: boolean; loading: boolean }>({ distanceKm: null, durationMin: null, error: false, loading: false })

  const steps = ['Location', 'Items', 'Vehicle', 'Extras', 'Contact']

  const update = (field: keyof FormState, value: string) => {
    setForm({ ...form, [field]: value })
    if (errors[field]) {
      const n = { ...errors }
      delete n[field]
      setErrors(n)
    }
  }

  const toggleItem = (field: 'selected_items' | 'add_on_services', value: string) => {
    const arr = form[field]
    setForm({ ...form, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] })
    if (errors[field]) {
      const n = { ...errors }
      delete n[field]
      setErrors(n)
    }
  }

  const clearFieldErrors = (fields: string[]) => {
    const n = { ...errors }
    fields.forEach((f) => delete n[f])
    setErrors(n)
  }

  const openProvince = (prefix: 'pickup' | 'drop') => {
    setPicker({
      field: `${prefix}_province`,
      title: `Select ${prefix === 'pickup' ? 'Pickup' : 'Drop'} Province`,
      options: provinces.map((p) => p.name),
    })
  }

  const openDistrict = (prefix: 'pickup' | 'drop') => {
    const prov = form[`${prefix}_province`]
    if (!prov) {
      Alert.alert('Location', 'Select the province first')
      return
    }
    setPicker({
      field: `${prefix}_district`,
      title: `Select ${prefix === 'pickup' ? 'Pickup' : 'Drop'} District`,
      options: getDistricts(prov),
    })
  }

  const onSelectPicker = (value: string) => {
    if (!picker) return
    if (picker.field === 'pickup_province') {
      setForm({ ...form, pickup_province: value, pickup_district: '', pickup_city: '' })
      clearFieldErrors(['pickup_province', 'pickup_district', 'pickup_city'])
    } else if (picker.field === 'pickup_district') {
      setForm({ ...form, pickup_district: value, pickup_city: '' })
      clearFieldErrors(['pickup_district', 'pickup_city'])
    } else if (picker.field === 'drop_province') {
      setForm({ ...form, drop_province: value, drop_district: '', drop_city: '' })
      clearFieldErrors(['drop_province', 'drop_district', 'drop_city'])
    } else if (picker.field === 'drop_district') {
      setForm({ ...form, drop_district: value, drop_city: '' })
      clearFieldErrors(['drop_district', 'drop_city'])
    }
    setPicker(null)
  }

  const getStepErrors = (s: number): Record<string, string> => {
    const errs: Record<string, string> = {}
    switch (s) {
      case 0: {
        if (!form.pickup_province) errs.pickup_province = 'Select pickup province'
        if (!form.pickup_district) errs.pickup_district = 'Select pickup district'
        if (!form.pickup_city) errs.pickup_city = 'Enter pickup city'
        if (!form.drop_province) errs.drop_province = 'Select drop province'
        if (!form.drop_district) errs.drop_district = 'Select drop district'
        if (!form.drop_city) errs.drop_city = 'Enter drop city'
        break
      }
      case 1: {
        if (form.selected_items.length === 0) errs.selected_items = 'Select at least one item'
        break
      }
      case 2: {
        if (!form.vehicle_type) errs.vehicle_type = 'Select a vehicle type'
        break
      }
      case 3: {
        if (!form.move_date) errs.move_date = 'Select a move date'
        else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.move_date)) errs.move_date = 'Use YYYY-MM-DD'
        break
      }
      case 4: {
        if (!form.first_name) errs.first_name = 'First name required'
        if (!form.last_name) errs.last_name = 'Last name required'
        if (!form.mobile_number) errs.mobile_number = 'Mobile number required'
        else if (!/^[0-9]{10}$/.test(form.mobile_number)) errs.mobile_number = 'Must be 10 digits'
        if (!form.email) errs.email = 'Email required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
        if (!form.payment_method) errs.payment_method = 'Select a payment method'
        break
      }
    }
    return errs
  }

  const validateStep = (s: number): boolean => {
    const errs = getStepErrors(s)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      Alert.alert('Almost there', `Please fix ${Object.keys(errs).length} issue(s) before continuing`)
      return false
    }
    return true
  }

  const nextStep = () => {
    if (!validateStep(step)) return
    setStep((s) => Math.min(s + 1, 4))
    setErrors({})
    scrollRef.current?.scrollTo({ y: 0, animated: true })
  }

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0))
    setErrors({})
    scrollRef.current?.scrollTo({ y: 0, animated: true })
  }

  useEffect(() => {
    if (form.vehicle_type && form.pickup_province && form.drop_province && step === 2) {
      VENDOR.getMatching(form.vehicle_type, form.pickup_province, form.drop_province, form.pickup_district, form.drop_district)
        .then(({ data }) => setMatchingVendors(data.vendors || []))
        .catch(() => setMatchingVendors([]))
    } else {
      setMatchingVendors([])
    }
  }, [form.vehicle_type, form.pickup_province, form.drop_province, form.pickup_district, form.drop_district, step])

  // Distance + duration via the ORS geocode proxy once both ends are complete.
  useEffect(() => {
    const complete =
      form.pickup_province && form.pickup_district && form.pickup_city &&
      form.drop_province && form.drop_district && form.drop_city
    if (!complete) {
      setRouteInfo({ distanceKm: null, durationMin: null, error: false, loading: false })
      return
    }
    const timer = setTimeout(async () => {
      setRouteInfo((r) => ({ ...r, loading: true }))
      const pickup = `${form.pickup_city}, ${form.pickup_district}, ${form.pickup_province}, Nepal`
      const drop = `${form.drop_city}, ${form.drop_district}, ${form.drop_province}, Nepal`
      try {
        const [pickupRes, dropRes] = await Promise.all([GEOCODE.search(pickup), GEOCODE.search(drop)])
        const pickupGeo = pickupRes.data?.features?.[0]?.geometry?.coordinates
        const dropGeo = dropRes.data?.features?.[0]?.geometry?.coordinates
        if (!pickupGeo || !dropGeo) throw new Error('geocode empty')
        const matrix = await GEOCODE.matrix([
          [pickupGeo[0], pickupGeo[1]],
          [dropGeo[0], dropGeo[1]],
        ])
        const km = matrix.data?.distances?.[1]?.[0]
        const seconds = matrix.data?.durations?.[1]?.[0]
        if (km == null) throw new Error('matrix empty')
        setRouteInfo({
          distanceKm: Math.round(Number(km) * 10) / 10,
          durationMin: seconds != null ? Math.round(Number(seconds) / 60) : null,
          error: false,
          loading: false,
        })
      } catch {
        setRouteInfo({ distanceKm: null, durationMin: null, error: true, loading: false })
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [form.pickup_province, form.pickup_district, form.pickup_city, form.drop_province, form.drop_district, form.drop_city])

  const openCalendar = () => {
    const selected = form.move_date ? new Date(`${form.move_date}T00:00:00`) : new Date()
    setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
    setCalendarVisible(true)
  }

  const isPastDate = (d: Date) => {
    const today = new Date()
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    return d.getTime() < day
  }

  const selectDate = (d: Date) => {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setForm({ ...form, move_date: iso })
    if (errors.move_date) {
      const n = { ...errors }
      delete n.move_date
      setErrors(n)
    }
    setCalendarVisible(false)
  }

  const shiftMonth = (delta: number) => {
    setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  const formatDuration = (min: number | null) => {
    if (min == null) return null
    const h = Math.floor(min / 60)
    const m = min % 60
    if (h === 0) return `${m} min`
    return m === 0 ? `${h} hr` : `${h} hr ${m} min`
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return
    setSubmitting(true)
    try {
      const res = await SHIPMENTS.create({
        ...form,
        user_id: user?.id || null,
        selected_items: form.selected_items,
        add_on_services: form.add_on_services,
        vendor_id: matchingVendors.length > 0 ? selectedVendor : null,
        distance_km: routeInfo.distanceKm,
        estimated_duration: formatDuration(routeInfo.durationMin),
      })
      const data = res.data
      if (!data.success) {
        Alert.alert('Error', data.message || 'Failed to create booking')
        return
      }
      if (data.payment_required && data.payment_data) {
        setPaymentInfo({
          amount: data.payment_data.amount ?? 0,
          transaction_id: data.transaction_id || '',
          booking_id: data.booking_id || '',
          payment_method: form.payment_method || 'esewa',
          customer_name: data.payment_data.customer_name || user?.name || '',
          customer_email: data.payment_data.customer_email || form.email || '',
          customer_phone: data.payment_data.customer_phone || form.mobile_number || '',
        })
      } else {
        Alert.alert('Success', 'Booking submitted! We will contact you within 2 hours.', [
          { text: 'OK', onPress: () => navigation.navigate('MyBookings') },
        ])
        setForm(makeInitialForm(user))
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      Alert.alert(
        'Could not complete booking',
        msg
          ? `${msg}\n\nGo back to Step 3 and pick another mover, or choose Auto-match.`
          : 'Server error. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayNow = async () => {
    if (!paymentInfo) return
    if (!/^[0-9]{10}$/.test(payMobile)) {
      Alert.alert('Payment', 'Enter a 10-digit mobile number')
      return
    }
    if (!payPassword.trim()) {
      Alert.alert('Payment', 'Enter any password (demo payment)')
      return
    }
    setSubmitting(true)
    try {
      await PAYMENT.process({
        mobile: payMobile,
        password: payPassword,
        amount: paymentInfo.amount,
        transaction_uuid: paymentInfo.transaction_id,
        order_id: paymentInfo.booking_id,
        customer_name: paymentInfo.customer_name,
        customer_email: paymentInfo.customer_email,
        customer_phone: paymentInfo.customer_phone,
      })
      const bid = paymentInfo.booking_id
      setPaymentInfo(null)
      setForm(makeInitialForm(user))
      Alert.alert('Success', `Payment successful for ${bid}. We will contact you soon.`, [
        { text: 'OK', onPress: () => navigation.navigate('MyBookings') },
      ])
    } catch {
      Alert.alert('Payment failed', 'Try again or pay later.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayLater = () => {
    const bid = paymentInfo?.booking_id
    setPaymentInfo(null)
    setForm(makeInitialForm(user))
    Alert.alert('Booking saved', `Booking ${bid} saved! You can pay later.`, [
      { text: 'OK', onPress: () => navigation.navigate('MyBookings') },
    ])
  }

  const renderLabel = (text: string, required?: boolean) => (
    <Text style={styles.label}>
      {text} {required ? <Text style={styles.required}>*</Text> : null}
    </Text>
  )

  const renderError = (field: string) =>
    errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null

  const renderSelectField = (label: string, value: string, placeholder: string, onPress: () => void, field: string) => (
    <View style={{ marginBottom: 12 }}>
      {renderLabel(label, true)}
      <TouchableOpacity onPress={onPress} style={[styles.selectBox, errors[field] ? styles.fieldError : null]}>
        <Text style={value ? styles.selectValue : styles.selectPlaceholder} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
      {renderError(field)}
    </View>
  )

  const renderTextField = (field: keyof FormState, label: string, placeholder: string, opts?: { required?: boolean; multiline?: boolean; keyboardType?: 'default' | 'phone-pad' | 'email-address'; maxLength?: number }) => (
    <View style={{ marginBottom: 12 }}>
      {renderLabel(label, opts?.required)}
      <TextInput
        style={[styles.input, opts?.multiline ? { minHeight: 80, textAlignVertical: 'top' as const } : null, errors[field] ? styles.fieldError : null]}
        value={form[field] as string}
        onChangeText={(v) => update(field, v)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.forest[400]}
        multiline={opts?.multiline}
        keyboardType={opts?.keyboardType}
        maxLength={opts?.maxLength}
      />
      {renderError(field)}
    </View>
  )

  const renderChips = (options: string[], active: (opt: string) => boolean, onPress: (opt: string) => void, field: string) => (
    <View>
      <View style={styles.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity key={opt} onPress={() => onPress(opt)} style={chipStyle(active(opt))}>
            <Text style={chipText(active(opt))}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {renderError(field)}
    </View>
  )

  const renderCalendarDays = () => {
    const today = new Date()
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
    const cells: (Date | null)[] = [
      ...Array.from({ length: firstDay.getDay() }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i + 1)),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    return cells.map((d, i) => {
      if (!d) return <View key={`pad-${i}`} style={styles.calendarDayCell} />
      const past = isPastDate(d)
      const isToday = d.toDateString() === today.toDateString()
      const selected = form.move_date === `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dayStyle = [
        styles.calendarDayCell,
        past ? styles.calendarDayDisabled : null,
        selected ? styles.calendarDayActive : null,
        isToday && !selected ? styles.calendarDayToday : null,
      ]
      const textStyle = [
        styles.calendarDayText,
        past ? styles.calendarDayTextDisabled : null,
        selected ? styles.calendarDayTextActive : null,
      ]
      return (
        <TouchableOpacity
          key={d.toISOString()}
          disabled={past}
          onPress={() => selectDate(d)}
          style={dayStyle}>
          <Text style={textStyle}>{d.getDate()}</Text>
        </TouchableOpacity>
      )
    })
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: COLORS.forest[950] }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.stepTitle}>
          Step {step + 1} of 5: {steps[step]}
        </Text>

        <View style={styles.progressRow}>
          {steps.map((s, i) => (
            <View key={s} style={styles.progressItem}>
              <View style={[styles.progressDot, i <= step ? styles.progressDotActive : null]}>
                <Text style={[styles.progressDotText, i <= step ? styles.progressDotTextActive : null]}>{i + 1}</Text>
              </View>
              {i < steps.length - 1 ? (
                <View style={[styles.progressLine, i < step ? styles.progressLineActive : null]} />
              ) : null}
            </View>
          ))}
        </View>

        {step === 0 && (
          <>
            <Text style={styles.sectionTitle}>📍 Pickup Location</Text>
            {renderSelectField('Pickup Province', form.pickup_province, 'Select province', () => openProvince('pickup'), 'pickup_province')}
            {renderSelectField('Pickup District', form.pickup_district, 'Select district', () => openDistrict('pickup'), 'pickup_district')}
            {renderTextField('pickup_city', 'Pickup City', 'e.g. Kathmandu', { required: true })}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>📍 Drop Location</Text>
            {renderSelectField('Drop Province', form.drop_province, 'Select province', () => openProvince('drop'), 'drop_province')}
            {renderSelectField('Drop District', form.drop_district, 'Select district', () => openDistrict('drop'), 'drop_district')}
            {renderTextField('drop_city', 'Drop City', 'e.g. Pokhara', { required: true })}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>🏠 What are you moving?</Text>
            <View style={{ marginBottom: 16 }}>
              {renderLabel('Items to Move', true)}
              {renderChips(itemOptions, (item) => form.selected_items.includes(item), (item) => toggleItem('selected_items', item), 'selected_items')}
            </View>
            {renderTextField('fragile_items', 'Fragile / Special Items', 'Glassware, idols, etc.', { multiline: true })}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>🛺 Choose Your Vehicle</Text>
            {vehicleOptions.map((v) => {
              const active = form.vehicle_type === v.value
              return (
                <TouchableOpacity key={v.value} onPress={() => update('vehicle_type', v.value)} style={[styles.vehicleCard, active ? styles.vehicleCardActive : null]}>
                  <Text style={styles.vehicleIcon}>{v.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.vehicleName, active ? styles.vehicleNameActive : null]}>{v.value}</Text>
                    <Text style={styles.vehicleDesc}>{v.desc}</Text>
                    {active ? (
                      <Text style={styles.vehicleQuote}>
                        Estimated: NPR {formatNPR(quoteFor(v.value, routeInfo.distanceKm))}
                        {routeInfo.distanceKm != null ? ` for ${routeInfo.distanceKm} km` : ''}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )
            })}
            {renderError('vehicle_type')}
            <Text style={styles.hint}>Estimate shown; final quote is confirmed by your mover after booking.</Text>
            {form.vehicle_type && matchingVendors.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>Available Movers</Text>
                <Text style={styles.hint}>
                  Service branch: <Text style={styles.hintStrong}>{form.pickup_province}</Text> — only
                  movers in this region are offered.
                </Text>
                <Text style={styles.hint}>Pick a mover for this route, or use auto-match.</Text>
                <TouchableOpacity onPress={() => setSelectedVendor(null)} style={[styles.moverCard, selectedVendor === null ? styles.moverCardActive : null]}>
                  <Text style={[styles.moverName, selectedVendor === null ? styles.moverNameActive : null]}>Auto-match — we pick the best mover (recommended)</Text>
                  <Text style={styles.moverMeta}>Best-rated available mover for this route gets the job.</Text>
                </TouchableOpacity>
                {matchingVendors.map((v) => (
                  <TouchableOpacity key={v.id} onPress={() => setSelectedVendor(v.id)} style={[styles.moverCard, selectedVendor === v.id ? styles.moverCardActive : null]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.moverName, selectedVendor === v.id ? styles.moverNameActive : null]}>{v.business_name}</Text>
                      <Text style={styles.moverRating}>★ {v.rating} ({v.total_jobs} jobs)</Text>
                    </View>
                    <Text style={styles.moverMeta}>{v.service_region || 'No region specified'}{v.branch_name ? ` · ${v.branch_name}` : ''}</Text>
                    {v.match_tier === 'province' ? (
                      <Text style={styles.moverTier}>Covers your provinces (route beyond listed districts)</Text>
                    ) : (
                      <Text style={styles.moverTier}>Exact route match</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {form.vehicle_type && matchingVendors.length === 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>No mover available right now</Text>
                <Text style={styles.hint}>
                  No {form.vehicle_type} mover covers this route at the moment. Your booking will be
                  sent to movers in <Text style={styles.hintStrong}>{form.pickup_province}</Text> and
                  the first available one will accept it — no admin needed.
                </Text>
              </View>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>📦 Extras & Timing</Text>
            <View style={{ marginBottom: 12 }}>
              {renderLabel('Preferred Move Date', true)}
              <TouchableOpacity onPress={openCalendar} style={[styles.dateField, errors.move_date ? styles.fieldError : null]}>
                <Text style={form.move_date ? styles.dateValue : styles.datePlaceholder}>
                  {form.move_date || 'Select a date'}
                </Text>
                <Text style={styles.dateIcon}>📅</Text>
              </TouchableOpacity>
              {renderError('move_date')}
            </View>
            {renderTextField('preferred_time_slot', 'Preferred Time', 'e.g. 6-9 AM')}
            {renderTextField('special_notes', 'Special Notes', 'Auspicious timing, narrow roads...', { multiline: true })}
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.sectionTitle}>👤 Your Contact Details</Text>
            {renderTextField('first_name', 'First Name', 'Ram', { required: true })}
            {renderTextField('last_name', 'Last Name', 'Sharma', { required: true })}
            {renderTextField('mobile_number', 'Mobile (+977)', '98XXXXXXXX', { required: true, keyboardType: 'phone-pad', maxLength: 10 })}
            {renderTextField('alternate_mobile', 'Alternate Mobile', '98XXXXXXXX', { keyboardType: 'phone-pad', maxLength: 10 })}
            {renderTextField('email', 'Email', 'ram@email.com', { required: true, keyboardType: 'email-address' })}
            <View style={{ marginBottom: 16 }}>
              {renderLabel('Payment Method', true)}
              {renderChips(paymentMethods, (pm) => form.payment_method === pm.toLowerCase(), (pm) => update('payment_method', pm.toLowerCase()), 'payment_method')}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Booking Summary</Text>
              <Text style={styles.summaryRow}>
                Route: <Text style={styles.summaryStrong}>{form.pickup_city} → {form.drop_city}</Text>
              </Text>
              {routeInfo.loading ? (
                <Text style={styles.summaryRow}>Measuring distance…</Text>
              ) : routeInfo.distanceKm != null ? (
                <>
                  <Text style={styles.summaryRow}>
                    Distance: <Text style={styles.summaryStrong}>{routeInfo.distanceKm} km</Text>
                    {routeInfo.durationMin != null ? ` · Est. ${formatDuration(routeInfo.durationMin)}` : ''}
                  </Text>
                  <Text style={styles.summaryRow}>
                    Vehicle: <Text style={styles.summaryStrong}>{form.vehicle_type || '—'}</Text>
                  </Text>
                  <Text style={styles.summaryTotal}>
                    Estimated Total: NPR {formatNPR(quoteFor(form.vehicle_type, routeInfo.distanceKm))}
                  </Text>
                  <Text style={styles.summaryNote}>Final quote is confirmed by your mover after booking.</Text>
                </>
              ) : routeInfo.error ? (
                <>
                  <Text style={styles.summaryRow}>Distance could not be measured.</Text>
                  <Text style={styles.summaryTotal}>
                    Estimated Total: NPR {formatNPR(quoteFor(form.vehicle_type, null))}
                  </Text>
                  <Text style={styles.summaryNote}>Flat estimate — your mover confirms the exact distance-based price.</Text>
                </>
              ) : (
                <Text style={styles.summaryRow}>Complete the pickup & drop location to measure distance.</Text>
              )}
            </View>

            <Text style={styles.hint}>
              Cash: pay your mover on delivery. Online (eSewa/Khalti/IME Pay/ConnectIPS): you'll complete the demo payment right after submitting.
            </Text>
          </>
        )}

        <View style={styles.navRow}>
          <TouchableOpacity onPress={prevStep} disabled={step === 0} style={[styles.backBtn, step === 0 ? { opacity: 0.3 } : null]}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {step < 4 ? (
            <TouchableOpacity onPress={nextStep} style={styles.nextBtn}>
              <Text style={styles.nextText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[styles.nextBtn, submitting ? { opacity: 0.5 } : null]}>
              <Text style={styles.nextText}>{submitting ? 'Submitting...' : 'Submit Booking'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{picker?.title}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {picker?.options.map((opt) => {
                const selected = picker?.field === 'pickup_province' ? form.pickup_province : picker?.field === 'drop_province' ? form.drop_province : picker?.field === 'pickup_district' ? form.pickup_district : form.drop_district
                const isActive = selected === opt
                return (
                  <TouchableOpacity key={opt} onPress={() => onSelectPicker(opt)} style={[styles.modalOption, isActive ? styles.modalOptionActive : null]}>
                    <Text style={[styles.modalOptionText, isActive ? styles.modalOptionTextActive : null]}>{opt}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
            <TouchableOpacity onPress={() => setPicker(null)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={calendarVisible} transparent animationType="slide" onRequestClose={() => setCalendarVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Move Date</Text>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.calendarNav}>
                <Text style={styles.calendarNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>
                {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.calendarNav}>
                <Text style={styles.calendarNavText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarWeekRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <Text key={d} style={styles.calendarWeekDay}>{d}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {renderCalendarDays()}
            </View>
            <TouchableOpacity onPress={() => setCalendarVisible(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {paymentInfo && (
        <Modal visible transparent animationType="fade" onRequestClose={handlePayLater}>
          <View style={styles.payBackdrop}>
            <View style={styles.payCard}>
              <View style={styles.payIconCircle}>
                <Text style={{ fontSize: 28 }}>💳</Text>
              </View>
              <Text style={styles.payTitle}>Complete Payment</Text>
              <Text style={styles.paySub}>
                Pay via <Text style={styles.paySubStrong}>{paymentInfo.payment_method}</Text>
              </Text>
              <Text style={styles.payAmount}>NPR {formatNPR(paymentInfo.amount)}</Text>
              <Text style={styles.payBooking}>Booking {paymentInfo.booking_id}</Text>

              <TextInput
                style={styles.payInput}
                value={payMobile}
                onChangeText={(v) => setPayMobile(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="Mobile number (demo)"
                placeholderTextColor={COLORS.forest[400]}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <TextInput
                style={styles.payInput}
                value={payPassword}
                onChangeText={setPayPassword}
                placeholder="Password (any)"
                placeholderTextColor={COLORS.forest[400]}
                secureTextEntry
              />

              <TouchableOpacity onPress={handlePayNow} disabled={submitting} style={[styles.payNowBtn, submitting ? { opacity: 0.5 } : null]}>
                <Text style={styles.payNowText}>{submitting ? 'Processing...' : 'Proceed to Pay'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePayLater} style={styles.payLaterBtn}>
                <Text style={styles.payLaterText}>Pay Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  stepTitle: {
    color: COLORS.saffron[400],
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionTitle: {
    ...FONTS.display,
    color: COLORS.cream[50],
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.forest[800],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.forest[600],
  },
  progressDotActive: {
    backgroundColor: COLORS.saffron[400],
    borderColor: COLORS.saffron[400],
  },
  progressDotText: {
    color: COLORS.forest[400],
    fontSize: 12,
    fontWeight: '700',
  },
  progressDotTextActive: {
    color: COLORS.forest[900],
  },
  progressLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.forest[700],
    marginHorizontal: 6,
  },
  progressLineActive: {
    backgroundColor: COLORS.saffron[400],
  },
  label: {
    color: COLORS.cream[200],
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  required: {
    color: COLORS.crimson[500],
  },
  input: {
    backgroundColor: COLORS.forest[800],
    borderWidth: 1,
    borderColor: COLORS.forest[600],
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.cream[50],
    fontSize: 15,
    minHeight: 48,
  },
  fieldError: {
    borderColor: COLORS.crimson[500],
  },
  errorText: {
    color: COLORS.crimson[500],
    fontSize: 12,
    marginTop: 4,
  },
  selectBox: {
    backgroundColor: COLORS.forest[800],
    borderWidth: 1,
    borderColor: COLORS.forest[600],
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    color: COLORS.cream[50],
    fontSize: 15,
    flex: 1,
  },
  selectPlaceholder: {
    color: COLORS.forest[400],
    fontSize: 15,
    flex: 1,
  },
  chevron: {
    color: COLORS.saffron[400],
    fontSize: 16,
    marginLeft: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.forest[800],
    borderWidth: 2,
    borderColor: COLORS.forest[600],
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  vehicleCardActive: {
    borderColor: COLORS.saffron[400],
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
  },
  vehicleIcon: {
    fontSize: 26,
  },
  vehicleName: {
    color: COLORS.cream[50],
    fontSize: 15,
    fontWeight: '600',
  },
  vehicleNameActive: {
    color: COLORS.saffron[300],
  },
  vehicleDesc: {
    color: COLORS.forest[400],
    fontSize: 12,
    marginTop: 2,
  },
  vehicleQuote: {
    color: COLORS.saffron[400],
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.forest[800],
    borderWidth: 1,
    borderColor: COLORS.forest[600],
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateValue: {
    color: COLORS.forest[100],
    fontSize: 14,
  },
  datePlaceholder: {
    color: COLORS.forest[400],
    fontSize: 14,
  },
  dateIcon: {
    fontSize: 18,
  },
  summaryCard: {
    backgroundColor: COLORS.forest[800],
    borderWidth: 1,
    borderColor: COLORS.saffron[500],
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: COLORS.saffron[400],
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryRow: {
    color: COLORS.forest[300],
    fontSize: 14,
    marginVertical: 3,
  },
  summaryStrong: {
    color: COLORS.forest[100],
    fontWeight: '700',
  },
  summaryTotal: {
    color: COLORS.saffron[300],
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  summaryNote: {
    color: COLORS.forest[400],
    fontSize: 12,
    marginTop: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarNav: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  calendarNavText: {
    color: COLORS.saffron[400],
    fontSize: 26,
    lineHeight: 30,
  },
  calendarTitle: {
    color: COLORS.forest[100],
    fontSize: 15,
    fontWeight: '700',
  },
  calendarWeekRow: {
    flexDirection: 'row',
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.forest[400],
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    color: COLORS.forest[100],
    fontSize: 14,
  },
  calendarDayDisabled: {
    opacity: 0.25,
  },
  calendarDayTextDisabled: {
    color: COLORS.forest[500],
  },
  calendarDayToday: {
    borderWidth: 1,
    borderColor: COLORS.saffron[500],
    borderRadius: 20,
  },
  calendarDayActive: {
    backgroundColor: COLORS.saffron[500],
    borderRadius: 20,
  },
  calendarDayTextActive: {
    color: COLORS.forest[950],
    fontWeight: '800',
  },
  moverCard: {
    backgroundColor: COLORS.forest[800],
    borderWidth: 2,
    borderColor: COLORS.forest[600],
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  moverCardActive: {
    borderColor: COLORS.saffron[400],
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
  },
  moverName: {
    color: COLORS.cream[50],
    fontSize: 14,
    fontWeight: '600',
  },
  moverNameActive: {
    color: COLORS.saffron[300],
  },
  moverRating: {
    color: COLORS.saffron[400],
    fontSize: 12,
    fontWeight: '700',
  },
  moverMeta: {
    color: COLORS.forest[400],
    fontSize: 12,
    marginTop: 2,
  },
  moverTier: {
    color: COLORS.saffron[400],
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  hint: {
    color: COLORS.forest[400],
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  hintStrong: {
    color: COLORS.saffron[300],
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  backBtn: {
    padding: 12,
  },
  backText: {
    color: COLORS.forest[300],
    fontSize: 15,
  },
  nextBtn: {
    backgroundColor: COLORS.saffron[400],
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 4,
  },
  nextText: {
    color: COLORS.forest[900],
    fontWeight: '700',
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.forest[900],
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: COLORS.forest[700],
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  modalTitle: {
    color: COLORS.cream[50],
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
  },
  modalOptionText: {
    color: COLORS.cream[100],
    fontSize: 15,
  },
  modalOptionTextActive: {
    color: COLORS.saffron[300],
    fontWeight: '600',
  },
  modalCancel: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.forest[700],
  },
  modalCancelText: {
    color: COLORS.forest[300],
    fontSize: 15,
    fontWeight: '600',
  },
  payBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  payCard: {
    backgroundColor: COLORS.forest[900],
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.2)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  payIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  payTitle: {
    color: COLORS.cream[50],
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  paySub: {
    color: COLORS.forest[400],
    fontSize: 13,
    marginBottom: 4,
  },
  paySubStrong: {
    color: COLORS.cream[200],
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  payAmount: {
    color: COLORS.saffron[400],
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  payBooking: {
    color: COLORS.forest[400],
    fontSize: 11,
    marginBottom: 16,
  },
  payInput: {
    backgroundColor: COLORS.forest[800],
    borderWidth: 1,
    borderColor: COLORS.forest[600],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.cream[50],
    fontSize: 14,
    minHeight: 48,
    width: '100%',
    marginBottom: 12,
  },
  payNowBtn: {
    width: '100%',
    backgroundColor: COLORS.saffron[400],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payNowText: {
    color: COLORS.forest[900],
    fontSize: 14,
    fontWeight: '700',
  },
  payLaterBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 8,
  },
  payLaterText: {
    color: COLORS.forest[300],
    fontSize: 14,
    fontWeight: '500',
  },
})

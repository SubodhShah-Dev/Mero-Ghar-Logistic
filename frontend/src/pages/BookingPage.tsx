import { useReducer, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, MapPin, Home, Truck, Package, User, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { SHIPMENTS, VENDOR, PAYMENT } from '../services/api'
import { NEPAL_DATA, provinces } from '../utils/nepal'
import type { BookingFormData } from '../types'

type StepAction =
  | { type: 'SET_FIELD'; field: keyof BookingFormData; value: string }
  | { type: 'SET_ARRAY'; field: 'selected_items' | 'add_on_services' | 'preferred_contact'; value: string[] }
  | { type: 'TOGGLE_ARRAY'; field: 'selected_items' | 'add_on_services' | 'preferred_contact'; value: string }
  | { type: 'RESET' }
  | { type: 'LOAD'; value: BookingFormData }

const STORAGE_KEY = 'mg_booking_draft'

function loadDraft(): BookingFormData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return initialState()
}

function saveDraft(state: BookingFormData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

function initialState(): BookingFormData {
  return {
    pickup_province: '', pickup_district: '', pickup_city: '', pickup_ward: '', pickup_floor: '', pickup_lane_access: '',
    drop_province: '', drop_district: '', drop_city: '', drop_ward: '', drop_floor: '',
    home_size: '', selected_items: [], fragile_items: '',
    vehicle_type: '',
    add_on_services: [], move_date: '', alternate_date: '', preferred_time_slot: '', move_reason: '', special_notes: '',
    first_name: '', last_name: '', mobile_number: '', alternate_mobile: '', email: '',
    preferred_contact: [], payment_method: '', how_found_us: '',
  }
}

const homeSizes = ['1 Room (PG/Studio)', '1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'House (Full)']
const itemOptions = ['Furniture', 'Electronics', 'Kitchen', 'Clothes', 'Books', 'Gym Equipment', 'Religious Items', 'Musical Instruments']
const vehicleOptions = [
  { value: 'Cargo Tempo', desc: 'Best for narrow lanes & valley moves', icon: '🛺' },
  { value: 'Mini Truck', desc: 'Perfect for inter-city 1-2 BHK moves', icon: '🚛' },
  { value: 'Large Truck', desc: 'Ideal for full household moves', icon: '🚚' },
]
const addonOptions = ['Packing Materials', 'Insurance', 'Furniture Assembly', 'Porter Help', 'Waterproof Packaging']
const timeSlots = ['6-9 AM', '9 AM-12 PM', '12-3 PM', '3-6 PM', '6-9 PM', 'Custom (Auspicious)']
const contactOptions = ['Viber', 'Phone Call', 'WhatsApp', 'SMS']
const howFoundOptions = ['Google', 'Facebook', 'Friend/Family', 'YouTube', 'Viber Group', 'Other']
const paymentMethods = ['eSewa', 'Khalti', 'IME Pay', 'ConnectIPS', 'Cash']

function formReducer(state: BookingFormData, action: StepAction): BookingFormData {
  let next: BookingFormData
  switch (action.type) {
    case 'SET_FIELD':
      // Clear dependent dropdowns when province changes
      if (action.field === 'pickup_province') {
        next = { ...state, pickup_province: action.value, pickup_district: '', pickup_city: '' }
        break
      }
      if (action.field === 'pickup_district') {
        next = { ...state, pickup_district: action.value, pickup_city: '' }
        break
      }
      if (action.field === 'drop_province') {
        next = { ...state, drop_province: action.value, drop_district: '', drop_city: '' }
        break
      }
      if (action.field === 'drop_district') {
        next = { ...state, drop_district: action.value, drop_city: '' }
        break
      }
      next = { ...state, [action.field]: action.value }
      break
    case 'SET_ARRAY':
      next = { ...state, [action.field]: action.value }
      break
    case 'TOGGLE_ARRAY': {
      const arr = state[action.field] as string[]
      next = {
        ...state,
        [action.field]: arr.includes(action.value)
          ? arr.filter((v) => v !== action.value)
          : [...arr, action.value],
      }
      break
    }
    case 'LOAD':
      next = action.value
      break
    case 'RESET':
      next = initialState()
      localStorage.removeItem(STORAGE_KEY)
      return next
    default:
      return state
  }
  saveDraft(next)
  return next
}

type StepErrors = Partial<Record<string, string>>

export default function BookingPage() {
  const [step, setStep] = useState(0)
  const [form, dispatch] = useReducer(formReducer, undefined, loadDraft)
  const [matchingVendors, setMatchingVendors] = useState<Array<{ id: number; business_name: string; rating: number; total_jobs: number; service_region: string }>>([])
  const [selectedVendor, setSelectedVendor] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<{
    amount: number
    transaction_id: string
    booking_id: string
    payment_method: string
    customer_name: string
    customer_email: string
    customer_phone: string
  } | null>(null)
  const [errors, setErrors] = useState<StepErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [payMobile, setPayMobile] = useState('')
  const [payPassword, setPayPassword] = useState('')
  const { user } = useAuth()
  const { showToast } = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const navigate = useNavigate()

  const steps = [
    { icon: MapPin, title: 'Location', subtitle: 'Pickup & Drop' },
    { icon: Home, title: 'Items', subtitle: 'Belongings' },
    { icon: Truck, title: 'Vehicle', subtitle: 'Choose ride' },
    { icon: Package, title: 'Add-ons', subtitle: 'Extras & timing' },
    { icon: User, title: 'Contact', subtitle: 'Your details' },
  ]

  const getProvinceId = useCallback((name: string) => {
    const p = provinces.find((p) => p.name === name)
    return p?.id || ''
  }, [])

  const getDistricts = useCallback((prov: string) => {
    const id = getProvinceId(prov)
    return NEPAL_DATA.districts[id] || []
  }, [getProvinceId])

  useEffect(() => {
    if (form.vehicle_type && form.pickup_province) {
      const vehicle = form.vehicle_type
      const prov = form.pickup_province
      const matchProv = form.drop_province
      VENDOR.getMatching(vehicle, prov, matchProv)
        .then(({ data }) => setMatchingVendors(data.vendors || []))
        .catch(() => setMatchingVendors([]))
    } else {
      setMatchingVendors([])
    }
  }, [form.vehicle_type, form.pickup_province, form.drop_province])

  useEffect(() => {
    if (user && !touched.has('step5')) {
      dispatch({ type: 'SET_FIELD', field: 'first_name', value: user.name.split(' ')[0] || '' })
      dispatch({ type: 'SET_FIELD', field: 'last_name', value: user.name.split(' ').slice(1).join(' ') || '' })
      dispatch({ type: 'SET_FIELD', field: 'email', value: user.email })
    }
  }, [user, touched])

  const markTouched = (field: string) => {
    setTouched((prev) => new Set(prev).add(field))
  }

  const getStepErrors = (s: number): StepErrors => {
    const errs: StepErrors = {}
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
        if (!form.home_size) errs.home_size = 'Select your home size'
        if (form.selected_items.length === 0) errs.selected_items = 'Select at least one item'
        break
      }
      case 2: {
        if (!form.vehicle_type) errs.vehicle_type = 'Select a vehicle type'
        break
      }
      case 3: {
        if (!form.move_date) errs.move_date = 'Select a move date'
        break
      }
      case 4: {
        if (!form.first_name) errs.first_name = 'First name required'
        if (!form.last_name) errs.last_name = 'Last name required'
        if (!form.mobile_number) errs.mobile_number = 'Mobile number required'
        else if (form.mobile_number.length !== 10) errs.mobile_number = 'Must be 10 digits'
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
      showToast(`Please fix ${Object.keys(errs).length} issue(s) before continuing`, 'red')
      return false
    }
    return true
  }

  const nextStep = () => {
    if (!validateStep(step)) return
    if (step === 2 && matchingVendors.length > 0 && !selectedVendor) {
      showToast('Please select a mover from the list', 'red')
      return
    }
    setStep((s) => Math.min(s + 1, steps.length))
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0))
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToStep = (s: number) => {
    if (s >= step) return
    setStep(s)
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        user_id: user?.id || null,
        vendor_id: matchingVendors.length > 0 ? selectedVendor : null,
        selected_items: JSON.stringify(form.selected_items),
        add_on_services: JSON.stringify(form.add_on_services),
        preferred_contact: JSON.stringify(form.preferred_contact),
      }
      const res = await SHIPMENTS.create(payload)
      const data = res.data
      if (!data.success) {
        showToast(data.message || 'Failed to create booking', 'red')
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
        showToast('Booking created! Complete payment now.', 'gold')
      } else {
        showToast('Booking submitted! We will contact you within 2 hours.', 'green')
        navigate('/my-bookings')
      }
    } catch {
      showToast('Server error. Please try again.', 'red')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayNow = async (mobile: string, password: string) => {
    if (!paymentInfo) return
    if (mobile.trim().length !== 10) {
      showToast('Enter a 10-digit mobile number', 'red')
      return
    }
    if (!password.trim()) {
      showToast('Enter any password (demo payment)', 'red')
      return
    }
    setSubmitting(true)
    try {
      await PAYMENT.process({
        mobile,
        password,
        amount: paymentInfo.amount,
        transaction_uuid: paymentInfo.transaction_id,
        order_id: paymentInfo.booking_id,
        customer_name: paymentInfo.customer_name,
        customer_email: paymentInfo.customer_email,
        customer_phone: paymentInfo.customer_phone,
      })
      const bid = paymentInfo.booking_id
      dispatch({ type: 'RESET' })
      setPaymentInfo(null)
      showToast(`Payment successful for ${bid}. We will contact you soon.`, 'green')
      navigate('/my-bookings')
    } catch {
      showToast('Payment failed. Try again or pay later.', 'red')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const inputErrCls = (field: string) =>
    errors[field] ? 'border-crimson-500 focus:border-crimson-500' : 'border-forest-600 focus:border-saffron-400'

  const inputCls = (field: string) =>
    `w-full bg-forest-800 border rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none transition-colors min-h-[48px] ${inputErrCls(field)}`

  const labelCls = 'block text-cream-200 text-sm font-medium mb-1.5'
  const chipCls = (active: boolean) =>
    `px-4 py-3 rounded-sm text-sm font-medium transition-all min-h-[44px] ${
      active ? 'bg-saffron-400 text-forest-900 shadow-sm' : 'bg-forest-800 text-forest-300 border border-forest-600 hover:border-saffron-400 hover:text-cream-50'
    }`

  function Err({ field }: { field: string }) {
    if (!errors[field]) return null
    return (
      <p className="flex items-center gap-1 text-crimson-400 text-xs mt-1">
        <AlertCircle className="w-3 h-3" /> {errors[field]}
      </p>
    )
  }

  const renderPickupDrop = (prefix: 'pickup' | 'drop', label: string) => (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-xl text-cream-50 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-saffron-400" /> {label}
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Province</label>
          <select value={form[`${prefix}_province`]} onChange={(e) => {
            dispatch({ type: 'SET_FIELD', field: `${prefix}_province` as keyof BookingFormData, value: e.target.value })
            markTouched(`${prefix}_province`)
          }} className={inputCls(`${prefix}_province`)}>
            <option value="">Select province</option>
            {provinces.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <Err field={`${prefix}_province`} />
        </div>
        <div>
          <label className={labelCls}>District</label>
          <select value={form[`${prefix}_district`]} onChange={(e) => {
            dispatch({ type: 'SET_FIELD', field: `${prefix}_district` as keyof BookingFormData, value: e.target.value })
            markTouched(`${prefix}_district`)
          }} className={inputCls(`${prefix}_district`)}>
            <option value="">Select district</option>
            {getDistricts(form[`${prefix}_province`]).map((d: string) => <option key={d} value={d}>{d}</option>)}
          </select>
          <Err field={`${prefix}_district`} />
        </div>
        <div>
          <label className={labelCls}>City / Municipality</label>
          <input value={form[`${prefix}_city`]} onChange={(e) => {
            dispatch({ type: 'SET_FIELD', field: `${prefix}_city` as keyof BookingFormData, value: e.target.value })
            markTouched(`${prefix}_city`)
          }} className={inputCls(`${prefix}_city`)} placeholder="e.g. Kathmandu" />
          <Err field={`${prefix}_city`} />
        </div>
        <div>
          <label className={labelCls}>Ward No.</label>
          <input value={form[`${prefix}_ward`]} onChange={(e) => dispatch({ type: 'SET_FIELD', field: `${prefix}_ward` as keyof BookingFormData, value: e.target.value })}
            className={inputCls('')} placeholder="e.g. 3" />
        </div>
        <div>
          <label className={labelCls}>Floor</label>
          <input value={form[`${prefix}_floor`]} onChange={(e) => dispatch({ type: 'SET_FIELD', field: `${prefix}_floor` as keyof BookingFormData, value: e.target.value })}
            className={inputCls('')} placeholder="e.g. 2nd" />
        </div>
        {prefix === 'pickup' && (
          <div>
            <label className={labelCls}>Lane Access</label>
            <select value={form.pickup_lane_access} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'pickup_lane_access', value: e.target.value })} className={inputCls('')}>
              <option value="">Select access</option>
              <option value="wide">Wide Road</option>
              <option value="narrow">Narrow Lane</option>
              <option value="very_narrow">Very Narrow (Tempo Only)</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-forest-950 pt-24 pb-12">
      <div className="max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-5">
        {/* Progress */}
        <div className="flex items-center gap-1 sm:gap-2 mb-8 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <button key={s.title} onClick={() => goToStep(i)} disabled={i > step}
              className="flex items-center gap-1 sm:gap-2 shrink-0 disabled:cursor-default">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                i <= step ? 'bg-saffron-400 text-forest-900' : 'bg-forest-800 text-forest-500'
              } ${i < step ? 'cursor-pointer hover:ring-2 hover:ring-saffron-400/50' : ''}`}>
                {i < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              <div className="hidden sm:block text-left">
                <p className={`text-xs font-medium leading-tight ${i <= step ? 'text-cream-50' : 'text-forest-500'}`}>{s.title}</p>
                <p className="text-[10px] text-forest-400">{s.subtitle}</p>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-6 sm:w-10 h-px mx-1 ${i < step ? 'bg-saffron-400' : 'bg-forest-700'}`} />
              )}
            </button>
          ))}
        </div>

        <form ref={formRef} onSubmit={(e) => {
          e.preventDefault()
          if (step === steps.length - 1) {
            handleSubmit()
          } else {
            nextStep()
          }
        }}
          className="bg-forest-900 border border-forest-700 rounded-sm p-5 sm:p-8 space-y-6 animate-slide-in">

          {/* STEP 0: Location */}
          {step === 0 && (
            <div className="space-y-8 divide-y divide-forest-700">
              {renderPickupDrop('pickup', 'Pickup Location')}
              <div className="pt-8">{renderPickupDrop('drop', 'Drop Location')}</div>
            </div>
          )}

          {/* STEP 1: Items */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-display font-bold text-xl text-cream-50">What are you moving?</h2>
              <div>
                <label className={labelCls}>Home Size <span className="text-crimson-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {homeSizes.map((s) => (
                    <button key={s} type="button" onClick={() => { dispatch({ type: 'SET_FIELD', field: 'home_size', value: s }); setErrors((prev) => { const n = { ...prev }; delete n.home_size; return n }) }}
                      className={chipCls(form.home_size === s)}>{s}</button>
                  ))}
                </div>
                <Err field="home_size" />
              </div>
              <div>
                <label className={labelCls}>Items to Move <span className="text-crimson-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {itemOptions.map((item) => (
                    <button key={item} type="button" onClick={() => { dispatch({ type: 'TOGGLE_ARRAY', field: 'selected_items', value: item }); setErrors((prev) => { const n = { ...prev }; delete n.selected_items; return n }) }}
                      className={chipCls(form.selected_items.includes(item))}>{item}</button>
                  ))}
                </div>
                <Err field="selected_items" />
              </div>
              <div>
                <label className={labelCls}>Fragile / Special Items</label>
                <textarea value={form.fragile_items} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'fragile_items', value: e.target.value })}
                  className={inputCls('') + ' min-h-[90px] resize-none'} placeholder="E.g., glassware, marble, religious idols, musical instruments, stone grinder (silauto)" />
              </div>
            </div>
          )}

          {/* STEP 2: Vehicle */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-display font-bold text-xl text-cream-50">Choose Your Vehicle</h2>
              <div className="grid gap-3">
                {vehicleOptions.map((v) => (
                  <button key={v.value} type="button" onClick={() => { dispatch({ type: 'SET_FIELD', field: 'vehicle_type', value: v.value }); setSelectedVendor(null); setErrors({}) }}
                    className={`text-left px-5 py-4 rounded-sm border-2 transition-all ${
                      form.vehicle_type === v.value
                        ? 'border-saffron-400 bg-saffron-400/10'
                        : 'border-forest-600 bg-forest-800 hover:border-forest-400'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{v.icon}</span>
                      <div>
                        <span className={`font-semibold text-sm ${form.vehicle_type === v.value ? 'text-saffron-300' : 'text-cream-50'}`}>{v.value}</span>
                        <span className="text-xs text-forest-400 block mt-0.5">{v.desc}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <Err field="vehicle_type" />

              {form.vehicle_type && matchingVendors.length > 0 && (
                <div className="pt-2">
                  <h3 className="font-display font-bold text-lg text-cream-50 mb-3">Available Movers</h3>
                  <p className="text-forest-400 text-xs mb-3">Select your preferred mover for this route</p>
                  <div className="grid gap-3">
                    {matchingVendors.map((v) => (
                      <button key={v.id} type="button" onClick={() => setSelectedVendor(v.id)}
                        className={`text-left px-5 py-4 rounded-sm border-2 transition-all ${
                          selectedVendor === v.id
                            ? 'border-saffron-400 bg-saffron-400/10'
                            : 'border-forest-600 bg-forest-800 hover:border-forest-400'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-cream-50">{v.business_name}</span>
                          <span className="flex items-center gap-1 text-xs text-saffron-400">
                            <span className="text-yellow-400">★</span> {v.rating} ({v.total_jobs} jobs)
                          </span>
                        </div>
                        <span className="text-xs text-forest-400">{v.service_region || 'No region specified'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {form.vehicle_type && matchingVendors.length === 0 && (
                <div className="bg-forest-800 border border-dashed border-forest-600 rounded-sm p-5 text-center">
                  <p className="text-forest-400 text-sm">No movers available for this route yet.</p>
                  <p className="text-forest-500 text-xs mt-1">We will match one manually after you submit.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Add-ons */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="font-display font-bold text-xl text-cream-50">Add-on Services</h2>
              <div className="flex flex-wrap gap-2">
                {addonOptions.map((a) => (
                  <button key={a} type="button" onClick={() => dispatch({ type: 'TOGGLE_ARRAY', field: 'add_on_services', value: a })}
                    className={chipCls(form.add_on_services.includes(a))}>{a}</button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Preferred Move Date <span className="text-crimson-500">*</span></label>
                  <input type="date" value={form.move_date} onChange={(e) => { dispatch({ type: 'SET_FIELD', field: 'move_date', value: e.target.value }); setErrors((prev) => { const n = { ...prev }; delete n.move_date; return n }) }}
                    min={today} className={inputCls('move_date')} />
                  <Err field="move_date" />
                </div>
                <div>
                  <label className={labelCls}>Alternate Date</label>
                  <input type="date" value={form.alternate_date} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'alternate_date', value: e.target.value })}
                    min={today} className={inputCls('')} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Preferred Time Slot</label>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((t) => (
                    <button key={t} type="button" onClick={() => dispatch({ type: 'SET_FIELD', field: 'preferred_time_slot', value: t })}
                      className={chipCls(form.preferred_time_slot === t)}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Move Reason</label>
                <select value={form.move_reason} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'move_reason', value: e.target.value })} className={inputCls('')}>
                  <option value="">Select reason (optional)</option>
                  <option value="rental_change">Changing Rental</option>
                  <option value="buying_home">Bought New Home</option>
                  <option value="job_transfer">Job Transfer</option>
                  <option value="family">Family Move</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Special Notes</label>
                <textarea value={form.special_notes} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'special_notes', value: e.target.value })}
                  className={inputCls('') + ' min-h-[90px] resize-none'} placeholder="Auspicious timing, narrow road, special instructions..." />
              </div>
            </div>
          )}

          {/* STEP 4: Contact */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="font-display font-bold text-xl text-cream-50">Your Contact Details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First Name <span className="text-crimson-500">*</span></label>
                  <input value={form.first_name} onChange={(e) => { dispatch({ type: 'SET_FIELD', field: 'first_name', value: e.target.value }); markTouched('step5'); setErrors((prev) => { const n = { ...prev }; delete n.first_name; return n }) }}
                    className={inputCls('first_name')} placeholder="Ram" />
                  <Err field="first_name" />
                </div>
                <div>
                  <label className={labelCls}>Last Name <span className="text-crimson-500">*</span></label>
                  <input value={form.last_name} onChange={(e) => { dispatch({ type: 'SET_FIELD', field: 'last_name', value: e.target.value }); markTouched('step5'); setErrors((prev) => { const n = { ...prev }; delete n.last_name; return n }) }}
                    className={inputCls('last_name')} placeholder="Sharma" />
                  <Err field="last_name" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Mobile (+977) <span className="text-crimson-500">*</span></label>
                  <input type="tel" value={form.mobile_number} onChange={(e) => { dispatch({ type: 'SET_FIELD', field: 'mobile_number', value: e.target.value }); setErrors((prev) => { const n = { ...prev }; delete n.mobile_number; return n }) }}
                    className={inputCls('mobile_number')} placeholder="98XXXXXXXX" pattern="[0-9]{10}" maxLength={10} inputMode="numeric" />
                  <Err field="mobile_number" />
                </div>
                <div>
                  <label className={labelCls}>Alternate Mobile</label>
                  <input type="tel" value={form.alternate_mobile} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'alternate_mobile', value: e.target.value })}
                    className={inputCls('')} placeholder="98XXXXXXXX" pattern="[0-9]{10}" maxLength={10} inputMode="numeric" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email <span className="text-crimson-500">*</span></label>
                <input type="email" value={form.email} onChange={(e) => { dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value }); setErrors((prev) => { const n = { ...prev }; delete n.email; return n }) }}
                  className={inputCls('email')} placeholder="ram@email.com" inputMode="email" />
                <Err field="email" />
              </div>
              <div>
                <label className={labelCls}>Preferred Contact Method</label>
                <div className="flex flex-wrap gap-2">
                  {contactOptions.map((c) => (
                    <button key={c} type="button" onClick={() => dispatch({ type: 'TOGGLE_ARRAY', field: 'preferred_contact', value: c })}
                      className={chipCls(form.preferred_contact.includes(c))}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Payment Method <span className="text-crimson-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {paymentMethods.map((pm) => (
                    <button key={pm} type="button" onClick={() => { dispatch({ type: 'SET_FIELD', field: 'payment_method', value: pm.toLowerCase() }); setErrors((prev) => { const n = { ...prev }; delete n.payment_method; return n }) }}
                      className={chipCls(form.payment_method === pm.toLowerCase())}>{pm}</button>
                  ))}
                </div>
                <Err field="payment_method" />
              </div>
              <div>
                <label className={labelCls}>How did you find us?</label>
                <select value={form.how_found_us} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'how_found_us', value: e.target.value })} className={inputCls('')}>
                  <option value="">Select</option>
                  {howFoundOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Review summary before submitting */}
              <div className="bg-forest-800 border border-forest-600 rounded-sm p-5 space-y-3">
                <h3 className="font-display font-bold text-base text-cream-50 flex items-center gap-2">
                  <Check className="w-4 h-4 text-saffron-400" /> Review Your Booking
                </h3>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-forest-400">From:</span> <span className="text-cream-200">{form.pickup_city}, {form.pickup_district}</span></div>
                  <div><span className="text-forest-400">To:</span> <span className="text-cream-200">{form.drop_city}, {form.drop_district}</span></div>
                  <div><span className="text-forest-400">Home Size:</span> <span className="text-cream-200">{form.home_size}</span></div>
                  <div><span className="text-forest-400">Vehicle:</span> <span className="text-cream-200">{form.vehicle_type}</span></div>
                  <div><span className="text-forest-400">Move Date:</span> <span className="text-cream-200">{form.move_date}</span></div>
                  <div><span className="text-forest-400">Payment:</span> <span className="text-cream-200 capitalize">{form.payment_method}</span></div>
                </div>
                {form.selected_items.length > 0 && (
                  <div className="text-sm"><span className="text-forest-400">Items:</span> <span className="text-cream-200">{form.selected_items.join(', ')}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-forest-700">
            <button type="button" onClick={prevStep} disabled={step === 0}
              className="flex items-center gap-2 text-forest-400 hover:text-cream-50 text-sm font-medium disabled:opacity-30 transition-colors px-4 py-2.5 min-h-[44px]">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-forest-500 text-xs">Step {step + 1} of {steps.length}</span>
              <button type={step === steps.length - 1 ? 'button' : 'submit'} onClick={step === steps.length - 1 ? handleSubmit : undefined}
                disabled={submitting}
                className="flex items-center gap-2 bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-sm px-6 py-3 rounded-sm transition-all hover:-translate-y-0.5 shadow-md min-h-[44px] disabled:opacity-50 disabled:hover:translate-y-0">
                {submitting ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-forest-900 border-t-transparent rounded-full animate-spin" /> Submitting...</span>
                ) : step === steps.length - 1 ? 'Submit Booking' : (
                  <span className="flex items-center gap-2">Next <ChevronRight className="w-4 h-4" /></span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Payment Overlay (demo flow) */}
      {paymentInfo && (
        <div className="fixed inset-0 z-50 bg-black/72 flex items-center justify-center p-6">
          <div className="bg-forest-900 border border-saffron-400/20 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-slide-in">
            <div className="w-14 h-14 rounded-full bg-saffron-400/15 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="text-cream-50 text-lg font-bold mb-1">Complete Payment</h3>
            <p className="text-forest-400 text-sm mb-1">Pay via <span className="capitalize font-semibold text-cream-200">{paymentInfo.payment_method}</span></p>
            <p className="text-saffron-400 font-display font-black text-3xl mb-2">NPR {paymentInfo.amount.toLocaleString()}</p>
            <p className="text-forest-500 text-xs mb-5">Booking {paymentInfo.booking_id}</p>
            <div className="space-y-3">
              <input
                value={payMobile}
                onChange={(e) => setPayMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Mobile number (demo)"
                inputMode="numeric"
                className="w-full bg-forest-800 border border-forest-600 rounded-xl px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 min-h-[48px]"
              />
              <input
                value={payPassword}
                onChange={(e) => setPayPassword(e.target.value)}
                placeholder="Password (any)"
                type="password"
                className="w-full bg-forest-800 border border-forest-600 rounded-xl px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 min-h-[48px]"
              />
              <button onClick={() => handlePayNow(payMobile, payPassword)} disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-saffron-400 text-forest-900 text-sm font-bold hover:bg-saffron-300 transition-all active:scale-[0.98] disabled:opacity-50 min-h-[48px]">
                {submitting ? 'Processing...' : 'Proceed to Pay'}
              </button>
              <button onClick={() => {
                dispatch({ type: 'RESET' })
                setPaymentInfo(null)
                navigate('/my-bookings')
                showToast('Booking saved! You can pay later.', 'green')
              }} className="w-full py-3 rounded-xl border border-white/10 text-forest-400 text-sm font-medium hover:text-cream-50 transition-colors min-h-[44px]">
                Pay Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

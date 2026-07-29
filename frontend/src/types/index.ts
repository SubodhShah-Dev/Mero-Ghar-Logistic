export interface User {
  id: number
  name: string
  email: string
  role: 'user' | 'vendor' | 'admin'
  phone?: string
  loggedIn: boolean
}

export interface Shipment {
  id: number
  booking_id: string
  user_id: number | null
  first_name: string
  last_name: string
  mobile_number: string
  alternate_mobile: string | null
  email: string
  pickup_province: string
  pickup_district: string
  pickup_city: string
  pickup_ward: string
  pickup_floor: string
  pickup_lane_access: string
  pickup_address: string
  drop_province: string
  drop_district: string
  drop_city: string
  drop_ward: string
  drop_floor: string
  drop_address: string
  home_size: string
  selected_items: string | null
  fragile_items: string | null
  vehicle_type: string
  add_on_services: string | null
  move_date: string
  alternate_date: string | null
  preferred_time_slot: string
  move_reason: string
  preferred_contact: string | null
  payment_method: string
  how_found_us: string
  special_notes: string
  status: string
  final_quote: number | null
  distance_km: number | null
  estimated_duration: string | null
  transaction_id: string
  payment_status: string
  assigned_vendor_id: number | null
  vendor_name?: string
  approval_status: string
  created_at: string
}

export interface Vendor {
  id: number
  user_id: number
  business_name: string
  owner_name: string
  phone: string
  email: string
  service_region: string
  address: string
  status: string
  rating: number
  total_jobs: number
  created_at: string
}

export interface Vehicle {
  id: number
  vendor_id: number
  name: string
  plate_number: string
  vehicle_type: string
  capacity_tonnes: number
  driver_name: string
  driver_phone: string
  status: string
  is_active: number
}

export interface SupportTicket {
  id: number
  vendor_id: number
  subject: string
  message: string
  status: 'open' | 'resolved' | 'closed'
  created_at: string
  business_name?: string
}

export interface BookingFormData {
  pickup_province: string
  pickup_district: string
  pickup_city: string
  pickup_ward: string
  pickup_floor: string
  pickup_lane_access: string
  drop_province: string
  drop_district: string
  drop_city: string
  drop_ward: string
  drop_floor: string
  home_size: string
  selected_items: string[]
  fragile_items: string
  vehicle_type: string
  add_on_services: string[]
  move_date: string
  alternate_date: string
  preferred_time_slot: string
  move_reason: string
  special_notes: string
  first_name: string
  last_name: string
  mobile_number: string
  alternate_mobile: string
  email: string
  preferred_contact: string[]
  payment_method: string
  how_found_us: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export interface PaymentData {
  amount: number
  transaction_uuid: string
  booking_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
}

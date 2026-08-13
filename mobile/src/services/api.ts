import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL, PROD_API_URLS } from '../config'

// ── Runtime API base URL resolution ──────────────────────────────────────────
//
// Release builds may be used on any network (venue WiFi, USB + adb reverse,
// no internet at all), so the base URL can't be baked in at build time. We
// probe PROD_API_URLS in order on startup and cache the first responder in
// AsyncStorage. On a mid-session network failure the next reachable candidate
// is tried and the request retried once.

const STORAGE_KEY = 'meroGharApiUrl'
const PROBE_TIMEOUT_MS = 2500
const MAX_FALLBACKS = PROD_API_URLS.length

let resolving: Promise<string> | null = null

const isReachable = async (url: string): Promise<boolean> => {
  try {
    await axios.get(url, {
      timeout: PROBE_TIMEOUT_MS,
      validateStatus: () => true,
    })
    return true
  } catch {
    return false
  }
}

const findWorkingUrl = async (preferred?: string): Promise<string> => {
  const order = preferred && PROD_API_URLS.includes(preferred)
    ? [preferred, ...PROD_API_URLS.filter((u) => u !== preferred)]
    : PROD_API_URLS
  for (const url of order) {
    if (await isReachable(url)) return url
  }
  return PROD_API_URLS[0]
}

const resolveBaseUrl = async (): Promise<string> => {
  let cached: string | null = null
  try {
    cached = await AsyncStorage.getItem(STORAGE_KEY)
  } catch {}
  const url = await findWorkingUrl(cached ?? undefined)
  try {
    await AsyncStorage.setItem(STORAGE_KEY, url)
  } catch {}
  return url
}

const ensureBaseUrl = (): Promise<string> => {
  if (!resolving) resolving = resolveBaseUrl()
  return resolving
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  try {
    config.baseURL = await ensureBaseUrl()
  } catch {}
  try {
    const token = await AsyncStorage.getItem('meroGharToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const { config } = error
    if (!config) return Promise.reject(error)

    const retryable =
      !error.response ||
      (error.response.status >= 502 && error.response.status <= 504)

    if (retryable) {
      const cfg = config as InternalAxiosRequestConfig & { _fallbackCount?: number }
      if (!cfg._fallbackCount) cfg._fallbackCount = 0
      if (cfg._fallbackCount < MAX_FALLBACKS) {
        cfg._fallbackCount += 1
        resolving = null
        try {
          const next = await findWorkingUrl()
          if (next !== config.baseURL) {
            await AsyncStorage.setItem(STORAGE_KEY, next)
            config.baseURL = next
            return api(config)
          }
        } catch {}
      }
    }
    return Promise.reject(error)
  }
)

export default api

export const AUTH = {
  login: (data: { email: string; password: string; role?: string }) =>
    api.post('/api/auth/login', data),
  register: (data: { name: string; email: string; password: string; role?: string; phone?: string }) =>
    api.post('/api/auth/register', data),
}

export const SHIPMENTS = {
  create: (data: Record<string, unknown>) => api.post('/api/shipment/create', data),
  getAll: () => api.get('/api/shipment/all'),
  getMy: () => api.get('/api/shipment/my'),
  getByEmail: (email: string) => api.get(`/api/shipment/email/${email}`),
}

export const GEOCODE = {
  search: (text: string) => api.get(`/api/geocode/search?text=${encodeURIComponent(text)}`),
  matrix: (locations: [number, number][]) => api.post('/api/geocode/matrix', { locations }),
}

export const VENDOR = {
  getShipments: () => api.get('/api/vendor/shipments'),
  acceptShipment: (id: number) => api.put(`/api/vendor/shipments/${id}/accept`),
  startDelivery: (id: number) => api.put(`/api/vendor/shipments/${id}/start`),
  completeDelivery: (id: number) => api.put(`/api/vendor/shipments/${id}/complete`),
  getVehicles: () => api.get('/api/vendor/vehicles'),
  addVehicle: (data: Record<string, unknown>) => api.post('/api/vendor/vehicles', data),
  updateVehicleStatus: (id: number, status: string) =>
    api.put(`/api/vendor/vehicles/${id}/status`, { status }),
  deleteVehicle: (id: number) => api.delete(`/api/vendor/vehicles/${id}`),
  getAvailable: () => api.get('/api/vendor/available'),
  claim: (id: number) => api.put(`/api/vendor/shipments/${id}/claim`),
  getProfile: () => api.get('/api/vendor/profile'),
  register: (data: Record<string, unknown>) => api.post('/api/vendor/register', data),
  updateProfile: (data: Record<string, unknown>) => api.put('/api/vendor/profile', data),
  updateBranch: (branch_id: number) => api.put('/api/vendor/branch', { branch_id }),
  rejectShipment: (id: number) => api.put(`/api/vendor/shipments/${id}/reject`),
  getMatching: (vehicleType: string, pickupProvince: string, dropProvince: string, pickupDistrict?: string, dropDistrict?: string) =>
    api.get(`/api/vendor/matching?vehicle_type=${encodeURIComponent(vehicleType)}&pickup_province=${encodeURIComponent(pickupProvince)}&drop_province=${encodeURIComponent(dropProvince)}&pickup_district=${pickupDistrict ? encodeURIComponent(pickupDistrict) : ''}&drop_district=${dropDistrict ? encodeURIComponent(dropDistrict) : ''}`),
  getRoutes: () => api.get('/api/vendor/routes'),
  addRoute: (data: Record<string, unknown>) => api.post('/api/vendor/routes', data),
  removeRoute: (id: number) => api.delete(`/api/vendor/routes/${id}`),
}

export const CHAT = {
  getMessages: (id: number) => api.get(`/api/shipment/${id}/messages`),
  sendMessage: (id: number, message: string) =>
    api.post(`/api/shipment/${id}/messages`, { message }),
}

export const ADMIN = {
  getShipmentsByStatus: (status: string) => api.get(`/api/admin/shipments/status/${status}`),
  getVendors: () => api.get('/api/admin/vendors'),
  getActiveVendors: () => api.get('/api/admin/vendors/active'),
  updateVendorStatus: (id: number, status: string) =>
    api.put(`/api/admin/vendors/${id}/status`, { status }),
  getSettings: () => api.get('/api/settings'),
  updateSettings: (key: string, value: string) =>
    api.put('/api/settings', { [key]: value }),
  getBranches: () => api.get('/api/admin/branches'),
  getUsers: () => api.get('/api/admin/users'),
  createAdminUser: (data: Record<string, unknown>) => api.post('/api/admin/users', data),
  getAnalytics: () => api.get('/api/admin/analytics'),
  getEscalations: () => api.get('/api/admin/escalations'),
  getAuditLogs: () => api.get('/api/admin/audit'),
}

export const PAYMENT = {
  process: (data: Record<string, unknown>) => api.post('/api/payment/dummy/process', data),
}

export const CHATBOT = {
  sendMessage: (message: string) => api.post('/api/chatbot/message', { message }),
  getQuestions: () => api.get('/api/chatbot/questions'),
}

export const TICKETS = {
  create: (data: { subject: string; message: string }) => api.post('/api/tickets/submit', data),
  getMine: () => api.get('/api/tickets/mine'),
  getAll: () => api.get('/api/tickets/all'),
  resolve: (id: number) => api.put(`/api/tickets/${id}/resolve`),
  close: (id: number) => api.put(`/api/tickets/${id}/close`),
}

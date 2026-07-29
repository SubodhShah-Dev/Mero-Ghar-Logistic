import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-production-d51a3.up.railway.app'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('meroGharToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('meroGharToken')
      localStorage.removeItem('meroGharUser')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api

export const AUTH = {
  login: (data: { email: string; password: string; role?: string }) =>
    api.post('/api/auth/login', data),
  register: (data: {
    name: string
    email: string
    password: string
    role?: string
    phone?: string
  }) => api.post('/api/auth/register', data),
  getUsers: () => api.get('/api/auth/users'),
}

export const SHIPMENTS = {
  create: (data: Record<string, unknown>) => api.post('/api/shipment/create', data),
  getAll: () => api.get('/api/shipment/all'),
  getMy: () => api.get('/api/shipment/my'),
  getByEmail: (email: string) => api.get(`/api/shipment/email/${email}`),
  get: (id: number) => api.get(`/api/shipment/${id}`),
  updateStatus: (id: number, status: string, final_quote?: number) =>
    api.put(`/api/shipment/${id}/status`, { status, final_quote }),
}

export const ADMIN = {
  getPendingShipments: () => api.get('/api/admin/shipments/pending'),
  getShipmentsByStatus: (status: string) => api.get(`/api/admin/shipments/status/${status}`),
  approveShipment: (id: number) => api.put(`/api/admin/shipments/${id}/approve`),
  rejectShipment: (id: number) => api.put(`/api/admin/shipments/${id}/reject`),
  getVendors: () => api.get('/api/admin/vendors'),
  getActiveVendors: () => api.get('/api/admin/vendors/active'),
  updateVendorStatus: (id: number, status: string) =>
    api.put(`/api/admin/vendors/${id}/status`, { status }),
  getSettings: () => api.get('/api/settings'),
  updateSettings: (key: string, value: string) =>
    api.put('/api/settings', { setting_key: key, setting_value: value }),
}

export const VENDOR = {
  getProfile: () => api.get('/api/vendor/profile'),
  updateProfile: (data: Record<string, string>) => api.put('/api/vendor/profile', data),
  register: (data: Record<string, string>) => api.post('/api/vendor/register', data),
  getShipments: () => api.get('/api/vendor/shipments'),
  acceptShipment: (id: number) => api.put(`/api/vendor/shipments/${id}/accept`),
  startDelivery: (id: number) => api.put(`/api/vendor/shipments/${id}/start`),
  completeDelivery: (id: number) => api.put(`/api/vendor/shipments/${id}/complete`),
  rejectShipment: (id: number) => api.put(`/api/vendor/shipments/${id}/reject`),
  getVehicles: () => api.get('/api/vendor/vehicles'),
  addVehicle: (data: Record<string, unknown>) => api.post('/api/vendor/vehicles', data),
  updateVehicleStatus: (id: number, status: string) =>
    api.put(`/api/vendor/vehicles/${id}/status`, { status }),
  deleteVehicle: (id: number) => api.delete(`/api/vendor/vehicles/${id}`),
  getMatching: (vehicleType: string, pickupProvince: string, dropProvince: string) =>
    api.get(`/api/vendor/matching?vehicle_type=${encodeURIComponent(vehicleType)}&pickup_province=${encodeURIComponent(pickupProvince)}&drop_province=${encodeURIComponent(dropProvince)}`),
}

export const CHATBOT = {
  sendMessage: (message: string) => api.post('/api/chatbot/message', { message }),
}

export const TICKETS = {
  create: (data: { subject: string; message: string }) => api.post('/api/tickets', data),
  getAll: () => api.get('/api/tickets'),
  resolve: (id: number) => api.put(`/api/tickets/${id}/resolve`),
  close: (id: number) => api.put(`/api/tickets/${id}/close`),
}

import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../config'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('meroGharToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

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
}

export const ADMIN = {
  getPendingShipments: () => api.get('/api/admin/shipments/pending'),
  getShipmentsByStatus: (status: string) => api.get(`/api/admin/shipments/status/${status}`),
  getVendors: () => api.get('/api/admin/vendors'),
  getActiveVendors: () => api.get('/api/admin/vendors/active'),
  approveShipment: (id: number) => api.put(`/api/admin/shipments/${id}/approve`),
  rejectShipment: (id: number) => api.put(`/api/admin/shipments/${id}/reject`),
  updateVendorStatus: (id: number, status: string) =>
    api.put(`/api/admin/vendors/${id}/status`, { status }),
  getSettings: () => api.get('/api/settings'),
  updateSettings: (key: string, value: string) =>
    api.put('/api/settings', { [key]: value }),
}

export const CHATBOT = {
  sendMessage: (message: string) => api.post('/api/chatbot/message', { message }),
}

export const TICKETS = {
  create: (data: { subject: string; message: string }) => api.post('/api/tickets/submit', data),
  getMine: () => api.get('/api/tickets/mine'),
  getAll: () => api.get('/api/tickets/all'),
  resolve: (id: number) => api.put(`/api/tickets/${id}/resolve`),
  close: (id: number) => api.put(`/api/tickets/${id}/close`),
}

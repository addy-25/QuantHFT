import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const portfolioApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PORTFOLIO_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  register: (email: string, password: string) =>
    api.post('/api/v1/auth/register', { email, password }),

  login: (email: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return api.post('/api/v1/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },

  me: () => api.get('/api/v1/auth/me'),
}

export const ordersApi = {
  place: (order: {
    symbol: string
    side: 'buy' | 'sell'
    type: 'market' | 'limit'
    price?: number
    quantity: number
  }) => api.post('/api/v1/orders', order),

  cancel: (orderId: string) => api.delete(`/api/v1/orders/${orderId}`),
}

export const portfolioApiClient = {
  getPortfolio: (userId: string) =>
    portfolioApi.get(`/api/v1/portfolio/${userId}`),

  getSummary: (userId: string) =>
    portfolioApi.get(`/api/v1/portfolio/${userId}/summary`),

  getTrades: (userId: string) =>
    portfolioApi.get(`/api/v1/portfolio/${userId}/trades`),
}

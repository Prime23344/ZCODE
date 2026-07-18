import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('surety_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('surety_token');
      localStorage.removeItem('surety_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────
export const authApi = {
  signup: (data: { phone: string; fullName: string; email?: string; role: string; countryCode?: string }) =>
    api.post('/auth/signup', data),
  login: (data: { phone: string; countryCode?: string }) =>
    api.post('/auth/login', data),
  verifyOtp: (data: { phone: string; code: string }) =>
    api.post('/auth/verify-otp', data),
};

// ─── Users ───────────────────────────────────────────────
export const userApi = {
  getMe: () => api.get('/users/me'),
  getMyBookings: (params?: { page?: number; status?: string }) =>
    api.get('/users/me/bookings', { params }),
  updateMe: (data: { fullName?: string; email?: string }) =>
    api.put('/users/me', data),
  getUser: (id: string) => api.get(`/users/${id}`),
};

// ─── Categories ──────────────────────────────────────────
export const categoryApi = {
  getAll: () => api.get('/categories'),
};

// ─── Providers ─────────────────────────────────────────────
export const providerApi = {
  search: (params?: { category?: string; county?: string; minRating?: number; verifiedOnly?: boolean; page?: number; limit?: number }) =>
    api.get('/providers', { params }),
  get: (id: string) => api.get(`/providers/${id}`),
  onboarding: (data: { bio?: string; location?: string; county?: string; categoryIds?: string[] }) =>
    api.post('/providers/onboarding', data),
  getVerificationQueue: (params?: { page?: number }) =>
    api.get('/providers/verification/queue', { params }),
  verifyProvider: (id: string, data: { action: string; reason?: string }) =>
    api.post(`/providers/${id}/verify`, data),
  uploadDocuments: (id: string, formData: FormData) =>
    api.post(`/providers/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadPortfolio: (id: string, formData: FormData) =>
    api.post(`/providers/${id}/portfolio`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Bookings ────────────────────────────────────────────
export const bookingApi = {
  create: (data: { providerId: string; categoryId: string; description: string; location: string; county: string; scheduledAt?: string }) =>
    api.post('/bookings', data),
  list: (params?: { page?: number; status?: string }) =>
    api.get('/bookings', { params }),
  get: (id: string) => api.get(`/bookings/${id}`),
  quote: (id: string, data: { amount: number; duration: number; currency?: string }) =>
    api.post(`/bookings/${id}/quote`, data),
  acceptQuote: (id: string) => api.post(`/bookings/${id}/accept-quote`),
  start: (id: string) => api.post(`/bookings/${id}/start`),
  complete: (id: string) => api.post(`/bookings/${id}/complete`),
  cancel: (id: string, data: { reason?: string }) => api.post(`/bookings/${id}/cancel`, data),
  sendMessage: (id: string, content: string) => api.post(`/bookings/${id}/messages`, { content }),
  getMessages: (id: string) => api.get(`/bookings/${id}/messages`),
};

// ─── Payments ────────────────────────────────────────────
export const paymentApi = {
  initiate: (bookingId: string) => api.post('/payments/initiate', { bookingId }),
  confirm: (bookingId: string) => api.post(`/payments/confirm/${bookingId}`),
  payout: (bookingId: string) => api.post(`/payments/payout/${bookingId}`),
  history: (params?: { page?: number }) => api.get('/payments/history', { params }),
};

// ─── Reviews ─────────────────────────────────────────────
export const reviewApi = {
  create: (data: { bookingId: string; rating: number; text: string }) =>
    api.post('/reviews', data),
  getByProvider: (providerId: string, params?: { page?: number }) =>
    api.get(`/reviews/provider/${providerId}`, { params }),
  respond: (id: string, response: string) =>
    api.post(`/reviews/${id}/response`, { response }),
};

// ─── Disputes ─────────────────────────────────────────────
export const disputeApi = {
  create: (data: { bookingId: string; reason: string }) =>
    api.post('/disputes', data),
  list: (params?: { page?: number; status?: string }) =>
    api.get('/disputes', { params }),
  get: (id: string) => api.get(`/disputes/${id}`),
  uploadEvidence: (id: string, formData: FormData) =>
    api.post(`/disputes/${id}/evidence`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  resolve: (id: string, data: { resolutionType: string; adminNotes?: string; partialAmount?: number }) =>
    api.post(`/disputes/${id}/resolve`, data),
  getQueue: () => api.get('/disputes/queue'),
};

// ─── Support ─────────────────────────────────────────────
export const supportApi = {
  create: (data: { subject: string; description: string }) =>
    api.post('/support', data),
  list: (params?: { page?: number; status?: string }) =>
    api.get('/support', { params }),
  get: (id: string) => api.get(`/support/${id}`),
  respond: (id: string, data: { response: string; status?: string }) =>
    api.post(`/support/${id}/respond`, data),
};

// ─── Admin ──────────────────────────────────────────────
export const adminApi = {
  getKPIs: () => api.get('/admin/kpis'),
  getBookingsChart: () => api.get('/admin/bookings-chart'),
  getRevenueChart: () => api.get('/admin/revenue-chart'),
  getCategoryChart: () => api.get('/admin/category-chart'),
  getActivity: (params?: { limit?: number; page?: number }) =>
    api.get('/admin/activity', { params }),
  getUsers: (params?: { page?: number; role?: string; search?: string }) =>
    api.get('/admin/users', { params }),
};

// ─── Uploads ─────────────────────────────────────────────
export const uploadApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export default api;

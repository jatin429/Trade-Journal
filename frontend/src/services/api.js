import axios from 'axios';

export const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const API_BASE = `${BACKEND_URL}/api`;

console.log('API backend URL:', BACKEND_URL);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('trademind_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Auth & Profile
export const loginUser = (data) => api.post('/auth/login', data).then(res => res.data);
export const registerUser = (data) => api.post('/auth/register', data).then(res => res.data);
export const sendRegistrationOtp = (data) => api.post('/auth/send-registration-otp', data).then(res => res.data);
export const verifyRegistrationOtp = (data) => api.post('/auth/verify-registration-otp', data).then(res => res.data);
export const resendRegistrationOtp = (data) => api.post('/auth/resend-registration-otp', data).then(res => res.data);
export const quickDemoLogin = () => api.post('/auth/quick-demo').then(res => res.data);
export const getAuthProfile = () => api.get('/auth/me').then(res => res.data);
export const updateAuthProfile = (data) => api.put('/auth/profile', data).then(res => res.data);
export const uploadAvatar = (formData) => api.post('/auth/avatar', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
}).then(res => res.data);

// Analytics
export const getAnalyticsSummary = () => api.get('/analytics/summary').then(res => res.data);
export const getCalendarData = () => api.get('/analytics/calendar').then(res => res.data);
export const getEquityCurve = () => api.get('/analytics/equity-curve').then(res => res.data);
export const getBreakdowns = () => api.get('/analytics/breakdowns').then(res => res.data);

// Trades
export const getTrades = (params) => api.get('/trades', { params }).then(res => res.data);
export const getTradeById = (id) => api.get(`/trades/${id}`).then(res => res.data);
export const createTrade = (data) => api.post('/trades', data).then(res => res.data);
export const updateTrade = (id, data) => api.put(`/trades/${id}`, data).then(res => res.data);
export const deleteTrade = (id) => api.delete(`/trades/${id}`).then(res => res.data);
export const setTradeCostPrice = (id, costPrice) => api.post(`/trades/${id}/set-cost`, { costPrice }).then(res => res.data);
export const lookupIpoSymbol = (symbol) => api.get('/trades/ipo-lookup', { params: { symbol } }).then(res => res.data);
export const uploadCsv = (formData) => api.post('/trades/bulk-csv', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
}).then(res => res.data);

// Brokers
export const getBrokerStatus = () => api.get('/brokers/status').then(res => res.data);
export const testDhan = (data) => api.post('/brokers/dhan/test', data).then(res => res.data);
export const syncDhan = (data) => api.post('/brokers/dhan/sync', data).then(res => res.data);
export const testAngelOne = (data) => api.post('/brokers/angelone/test', data).then(res => res.data);
export const syncAngelOne = (data) => api.post('/brokers/angelone/sync', data).then(res => res.data);

// Playbooks
export const getPlaybooks = () => api.get('/playbooks').then(res => res.data);
export const createPlaybook = (data) => api.post('/playbooks', data).then(res => res.data);
export const deletePlaybook = (id) => api.delete(`/playbooks/${id}`).then(res => res.data);

// Daily Journal
export const getJournals = () => api.get('/journal').then(res => res.data);
export const getJournalByDate = (date) => api.get(`/journal/${date}`).then(res => res.data);
export const saveJournal = (data) => api.post('/journal', data).then(res => res.data);

// AI Copilot
export const askAiCopilot = (data) => api.post('/ai/chat', data).then(res => res.data);
export const getAiInsights = () => api.get('/ai/insights').then(res => res.data);
export const simulateAiRules = (data) => api.post('/ai/simulate', data).then(res => res.data);
export const getAiProgressAudit = () => api.get('/ai/progress-audit').then(res => res.data);

// Server Status
export const getServerStatus = () => api.get('/status').then(res => res.data);

// Market Data (Live NSE Option Chain + PCR + Heatmap)
export const getOptionChain = (symbol = 'NIFTY', strikes = 20) =>
  api.get('/market/option-chain', { params: { symbol, strikes } }).then(res => res.data);

export const getMarketHeatmap = (index = 'NIFTY50') =>
  api.get('/market/heatmap', { params: { index } }).then(res => res.data);

export default api;

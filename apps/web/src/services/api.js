import axios from 'axios';
import { API_BASE_URL } from '../lib/apiConfig';
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ems_token');
    if (token)
        config.headers.Authorization = `Bearer ${token}`;
    return config;
});
api.interceptors.response.use((res) => res, (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem('ems_token');
        localStorage.removeItem('ems_user');
        window.location.href = '/login';
    }
    return Promise.reject(error);
});
export default api;
// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
    changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { currentPassword, newPassword }),
    logout: () => api.post('/auth/logout'),
};
// ─── Employees ───────────────────────────────────────────────────────────────
export const employeeAPI = {
    getAll: (params) => api.get('/employees', { params }),
    getById: (id) => api.get(`/employees/${id}`),
    create: (data) => api.post('/employees', data),
    update: (id, data) => api.put(`/employees/${id}`, data),
    delete: (id) => api.delete(`/employees/${id}`),
    getMyProfile: () => api.get('/employees/me/profile'),
    updateMyProfile: (data) => api.put('/employees/me/profile', data),
    getStats: () => api.get('/employees/stats'),
};
// ─── Departments ─────────────────────────────────────────────────────────────
export const departmentAPI = {
    getAll: () => api.get('/departments'),
    create: (data) => api.post('/departments', data),
    update: (id, data) => api.put(`/departments/${id}`, data),
    delete: (id) => api.delete(`/departments/${id}`),
};
// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceAPI = {
    checkIn: () => api.post('/attendance/check-in'),
    checkOut: () => api.post('/attendance/check-out'),
    getMyAttendance: (params) => api.get('/attendance/my', { params }),
    getToday: () => api.get('/attendance/today'),
    getMonthlyReport: (params) => api.get('/attendance/monthly-report', { params }),
    markAttendance: (data) => api.post('/attendance/mark', data),
};
// ─── Leaves ──────────────────────────────────────────────────────────────────
export const leaveAPI = {
    apply: (data) => api.post('/leaves', data),
    getMyLeaves: (params) => api.get('/leaves/my', { params }),
    getAll: (params) => api.get('/leaves', { params }),
    // status = 'approved' | 'rejected', reason optional
    updateStatus: (id, status, reason) => api.put(`/leaves/${id}/status`, { status, rejectionReason: reason }),
    cancel: (id) => api.delete(`/leaves/${id}/cancel`),
};
// ─── Tasks ────────────────────────────────────────────────────────────────────
export const taskAPI = {
    create: (data) => api.post('/tasks', data),
    getAll: (params) => api.get('/tasks', { params }),
    getMyTasks: (params) => api.get('/tasks/my', { params }),
    update: (id, data) => api.put(`/tasks/${id}`, data),
    // employee submits work update
    submitUpdate: (id, data) => api.put(`/tasks/${id}/submit`, data),
    addComment: (id, text) => api.post(`/tasks/${id}/comments`, { text }),
    delete: (id) => api.delete(`/tasks/${id}`),
};
// ─── Payroll ──────────────────────────────────────────────────────────────────
export const payrollAPI = {
    generate: (data) => api.post('/payroll/generate', data),
    getAll: (params) => api.get('/payroll', { params }),
    getMyPayslips: () => api.get('/payroll/my'),
    processPayment: (id) => api.put(`/payroll/${id}/pay`),
};
// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportAPI = {
    getSummary: (params) => api.get('/reports/summary', { params }),
    download: (params) => api.get('/reports/download', { params, responseType: 'blob' }),
};
// ─── Daily Reports ───────────────────────────────────────────────────────────
export const dailyReportAPI = {
    create: (data) => api.post('/daily-reports', data),
    getMine: () => api.get('/daily-reports/mine'),
    getAll: (params) => api.get('/daily-reports', { params }),
    update: (id, data) => api.put(`/daily-reports/${id}`, data),
    delete: (id) => api.delete(`/daily-reports/${id}`),
};
// ─── Messages ────────────────────────────────────────────────────────────────
export const messageAPI = {
    send: (data) => api.post('/messages', data),
    getSent: () => api.get('/messages', { params: { type: 'sent' } }),
    getInbox: () => api.get('/messages', { params: { type: 'inbox' } }),
    getAll: (params) => api.get('/messages', { params }),
    markRead: (id) => api.put(`/messages/${id}/read`),
    delete: (id) => api.delete(`/messages/${id}`),
};
// ─── Calendar ────────────────────────────────────────────────────────────────
export const calendarAPI = {
    getEvents: (params) => api.get('/calendar', { params }),
    createEvent: (data) => api.post('/calendar', data),
    updateEvent: (id, data) => api.put(`/calendar/${id}`, data),
    deleteEvent: (id) => api.delete(`/calendar/${id}`),
};
// ─── Uploads ─────────────────────────────────────────────────────────────────
export const uploadAPI = {
    upload: (data) => api.post('/uploads', data),
    getMine: () => api.get('/uploads/my'),
    getById: (id) => api.get(`/uploads/${id}`),
    update: (id, data) => api.put(`/uploads/${id}`, data),
    delete: (id) => api.delete(`/uploads/${id}`),
    getAll: (params) => api.get('/uploads', { params }),
};
// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationAPI = {
    getAll: () => api.get('/notifications'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`),
};

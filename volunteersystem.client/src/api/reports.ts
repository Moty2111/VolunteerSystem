import api from './axios';

export const reportsApi = {
    volunteerSummary: () => api.get('/reports/volunteer-summary').then(r => r.data),
    eventParticipants: (eventId: number) =>
        api.get(`/reports/event-participants/${eventId}`).then(r => r.data),
    partnerReport: () => api.get('/reports/partner-report').then(r => r.data),
    hours: (from: string, to: string) =>
        api.get('/reports/hours', { params: { from, to } }).then(r => r.data),
    volunteerRating: () => api.get('/reports/volunteer-rating').then(r => r.data),
    auditLog: (limit = 100) =>
        api.get('/reports/audit-log', { params: { limit } }).then(r => r.data)
};
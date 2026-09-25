import api from './axios';

export interface Skill {
    skillId: number;
    skillName: string;
    level: string;
    assignedCount: number;
}

export interface VolunteerSkill {
    skillId: number;
    skillName: string;
    level: string;
    yearConfirmed: number | null;
}

export const skillsApi = {
    getAll: () => api.get<Skill[]>('/skills').then(r => r.data),
    create: (data: { skillName: string; level: string }) =>
        api.post<Skill>('/skills', data).then(r => r.data),
    remove: (id: number) => api.delete(`/skills/${id}`).then(r => r.data),

    getVolunteerSkills: (volunteerId: number) =>
        api.get<VolunteerSkill[]>(`/skills/volunteer/${volunteerId}`).then(r => r.data),
    assign: (volunteerId: number, data: { skillId: number; yearConfirmed: number | null }) =>
        api.post(`/skills/volunteer/${volunteerId}`, data).then(r => r.data),
    unassign: (volunteerId: number, skillId: number) =>
        api.delete(`/skills/volunteer/${volunteerId}/${skillId}`).then(r => r.data),
};
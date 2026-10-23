export interface AuthResponse {
    token: string;
    loginName: string;
    role: string;
    volunteerId: number | null;
    expiresAt: string;
}

export interface LoginRequest {
    loginName: string;
    password: string;
}

export interface RegisterRequest {
    fullName: string;
    birthDate: string;
    phone: string;
    email: string;
    city: string;
    loginName: string;
    password: string;
    medBookValidUntil?: string | null;
    medBookScan?: File | null;
}

export interface Volunteer {
    volunteerId: number;
    fullName: string;
    birthDate: string;
    phone: string;
    email: string;
    city: string;
    medBookValidUntil: string | null;
    medBookStatus: string | null;
    medBookScanPath: string | null;
    medBookUploadedAt: string | null;
    medBookVerifiedAt: string | null;
    medBookComment: string | null;
    personalDataConsent: boolean;
    isActive: boolean;
    createdAt: string;
}

export interface EventItem {
    eventId: number;
    eventName: string;
    dateStart: string;
    dateEnd: string;
    location: string;
    eventTypeId: number;
    eventTypeName: string | null;
    description: string | null;
    status: string;
    coordinatorId: number;
    coordinatorName: string | null;
    createdAt: string;
    assignmentsCount: number;
}

export interface RecommendedEventItem {
    eventId: number;
    eventName: string;
    dateStart: string;
    dateEnd: string;
    location: string;
    eventTypeId: number;
    eventTypeName: string | null;
    status: string;
    assignmentsCount: number;
    score: number;
    reasons: string[];
}

export interface AchievementBadge {
    code: string;
    title: string;
    description: string;
    earned: boolean;
    progress: number;
    current: number;
    target: number;
}

export interface AchievementsResponse {
    badges: AchievementBadge[];
    earnedCount: number;
}

export interface EventCommentItem {
    commentId: number;
    eventId: number;
    userId: number;
    authorName: string;
    text: string;
    createdAt: string;
}

export interface Assignment {
    assignmentId: number;
    volunteerId: number;
    volunteerName: string;
    eventId: number;
    eventName: string;
    eventDateStart: string;
    eventDateEnd: string;
    roleId: number;
    roleName: string | null;
    hoursActual: number | null;
    confirmed: boolean;
    assignedAt: string;
}

export interface Partner {
    partnerId: number;
    partnerName: string;
    inn: string | null;
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    supportAmount: number | null;
    contractNumber: string | null;
    contractDate: string | null;
}
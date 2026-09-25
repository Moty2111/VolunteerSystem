type P = { size?: number };
const s = (size = 18) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const IconDashboard = ({ size }: P) => (
    <svg { ...s(size) } > <rect x= "3" y = "3" width = "7" height = "9" rx = "1" /> <rect x="14" y = "3" width = "7" height = "5" rx = "1" /> <rect x="14" y = "12" width = "7" height = "9" rx = "1" /> <rect x="3" y = "16" width = "7" height = "5" rx = "1" /> </svg>
);
export const IconUsers = ({ size }: P) => (
    <svg { ...s(size) } > <path d= "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /> <circle cx="9" cy = "7" r = "4" /> <path d="M23 21v-2a4 4 0 0 0-3-3.87" /> <path d="M16 3.13a4 4 0 0 1 0 7.75" /> </svg>
);
export const IconCalendar = ({ size }: P) => (
    <svg { ...s(size) } > <rect x= "3" y = "4" width = "18" height = "18" rx = "2" /> <line x1="16" y1 = "2" x2 = "16" y2 = "6" /> <line x1="8" y1 = "2" x2 = "8" y2 = "6" /> <line x1="3" y1 = "10" x2 = "21" y2 = "10" /> </svg>
);
export const IconCheckSquare = ({ size }: P) => (
    <svg { ...s(size) } > <polyline points= "9 11 12 14 22 4" /> <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /> </svg>
);
export const IconBriefcase = ({ size }: P) => (
    <svg { ...s(size) } > <rect x= "2" y = "7" width = "20" height = "14" rx = "2" /> <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /> </svg>
);
export const IconBarChart = ({ size }: P) => (
    <svg { ...s(size) } > <line x1= "12" y1 = "20" x2 = "12" y2 = "10" /> <line x1="18" y1 = "20" x2 = "18" y2 = "4" /> <line x1="6" y1 = "20" x2 = "6" y2 = "16" /> </svg>
);
export const IconLogout = ({ size }: P) => (
    <svg { ...s(size) } > <path d= "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /> <polyline points="16 17 21 12 16 7" /> <line x1="21" y1 = "12" x2 = "9" y2 = "12" /> </svg>
);
export const IconPlus = ({ size }: P) => (<svg { ...s(size) } > <line x1= "12" y1 = "5" x2 = "12" y2 = "19" /> <line x1="5" y1 = "12" x2 = "19" y2 = "12" /> </svg>);
export const IconX = ({ size }: P) => (<svg { ...s(size) } > <line x1= "18" y1 = "6" x2 = "6" y2 = "18" /> <line x1="6" y1 = "6" x2 = "18" y2 = "18" /> </svg>);
export const IconSearch = ({ size }: P) => (<svg { ...s(size) } > <circle cx= "11" cy = "11" r = "8" /> <line x1="21" y1 = "21" x2 = "16.65" y2 = "16.65" /> </svg>);
export const IconTrash = ({ size }: P) => (
    <svg { ...s(size) } > <polyline points= "3 6 5 6 21 6" /> <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /> <path d="M10 11v6" /> <path d="M14 11v6" /> <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /> </svg>
);
export const IconEdit = ({ size }: P) => (<svg { ...s(size) } > <path d= "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /> <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /> </svg>);
export const IconCheck = ({ size }: P) => (<svg { ...s(size) } > <polyline points= "20 6 9 17 4 12" /> </svg>);
export const IconClock = ({ size }: P) => (<svg { ...s(size) } > <circle cx= "12" cy = "12" r = "10" /> <polyline points="12 6 12 12 16 14" /> </svg>);
export const IconTrending = ({ size }: P) => (<svg { ...s(size) } > <polyline points= "23 6 13.5 15.5 8.5 10.5 1 18" /> <polyline points="17 6 23 6 23 12" /> </svg>);
export const IconDollar = ({ size }: P) => (<svg { ...s(size) } > <line x1= "12" y1 = "1" x2 = "12" y2 = "23" /> <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /> </svg>);
export const IconInbox = ({ size }: P) => (<svg { ...s(size) } > <polyline points= "22 12 16 12 14 15 10 15 8 12 2 12" /> <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /> </svg>);
export const IconUser = ({ size }: P) => (<svg { ...s(size) } > <path d= "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /> <circle cx="12" cy = "7" r = "4" /> </svg>);
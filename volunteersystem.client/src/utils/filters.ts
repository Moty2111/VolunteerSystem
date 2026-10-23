import type { EventItem, Volunteer } from '../types/index.ts';

const normalize = (value: string) => value.trim().toLocaleLowerCase('ru');

export function filterEvents(items: EventItem[], search: string, status: string, type: string) {
    const query = normalize(search);
    return items.filter(event =>
        (!status || event.status === status) &&
        (!type || String(event.eventTypeId) === type) &&
        (!query || normalize(event.eventName).includes(query) || normalize(event.location).includes(query))
    );
}

export function filterVolunteers(items: Volunteer[], search: string, city: string, active: string) {
    const query = normalize(search);
    const cityQuery = normalize(city);
    return items.filter(volunteer =>
        (!cityQuery || normalize(volunteer.city).includes(cityQuery)) &&
        (!active || volunteer.isActive === (active === 'true')) &&
        (!query || [volunteer.fullName, volunteer.city, volunteer.email, volunteer.phone]
            .some(value => normalize(value).includes(query)))
    );
}

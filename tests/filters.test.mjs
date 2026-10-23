import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEvents, filterVolunteers } from '../volunteersystem.client/src/utils/filters.ts';

const events = [
    { eventId: 1, eventName: 'Уборка', location: 'Москва', status: 'Запланировано', eventTypeId: 2 },
    { eventId: 2, eventName: 'Концерт', location: 'Казань', status: 'Завершено', eventTypeId: 3 },
    { eventId: 3, eventName: 'Помощь', location: 'Москва', status: 'Завершено', eventTypeId: 2 }
];
const volunteers = [
    { volunteerId: 1, fullName: 'Иван', city: 'Москва', email: 'ivan@example.test', phone: '123', isActive: true },
    { volunteerId: 2, fullName: 'Анна', city: 'Казань', email: 'anna@example.test', phone: '456', isActive: false },
    { volunteerId: 3, fullName: 'Пётр', city: 'Москва', email: 'petr@example.test', phone: '789', isActive: false }
];
const ids = items => items.map(item => item.eventId ?? item.volunteerId);

test('event status applies immediately and combines with type and trimmed search', () => {
    assert.deepEqual(ids(filterEvents(events, '', 'Завершено', '')), [2, 3]);
    assert.deepEqual(ids(filterEvents(events, '  МОСКВА  ', 'Завершено', '2')), [3]);
});

test('clearing filters restores all events without mutating the loaded list', () => {
    filterEvents(events, 'уборка', 'Запланировано', '2');
    assert.deepEqual(ids(filterEvents(events, '', '', '')), [1, 2, 3]);
});

test('city and inactive volunteer filters work together without refresh', () => {
    assert.deepEqual(ids(filterVolunteers(volunteers, '', ' мОск ', 'false')), [3]);
    assert.deepEqual(ids(filterVolunteers(volunteers, '  ANNA@  ', '', 'false')), [2]);
    assert.deepEqual(ids(filterVolunteers(volunteers, '', '', 'true')), [1]);
});

test('clearing volunteer filters restores the complete source list', () => {
    filterVolunteers(volunteers, '', 'Казань', 'false');
    assert.deepEqual(ids(filterVolunteers(volunteers, ' ', '', '')), [1, 2, 3]);
});

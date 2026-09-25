import { useEffect, useState } from 'react';
import { assignmentsApi } from '../api/assignments';
import type { Assignment } from '../types';
import { IconClock, IconCheckSquare, IconCheck } from '../components/Icons';

export default function MyAssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setItems(await assignmentsApi.my()); }
      catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const totalHours = items.filter(a => a.confirmed).reduce((s, a) => s + (a.hoursActual ?? 0), 0);
  const confirmed = items.filter(a => a.confirmed).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Мои назначения</h1>
          <p className="page-subtitle">Ваши мероприятия и отработанные часы</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card" style={{ ['--accent' as any]: 'var(--primary)' }}>
          <div className="stat-card-icon"><IconCheckSquare /></div>
          <div className="stat-card-label">Всего назначений</div>
          <div className="stat-card-value">{items.length}</div>
        </div>
        <div className="stat-card" style={{ ['--accent' as any]: 'var(--success)' }}>
          <div className="stat-card-icon"><IconClock /></div>
          <div className="stat-card-label">Отработано часов</div>
          <div className="stat-card-value">{totalHours.toFixed(1)}</div>
        </div>
        <div className="stat-card" style={{ ['--accent' as any]: 'var(--warning)' }}>
          <div className="stat-card-icon"><IconCheck /></div>
          <div className="stat-card-label">Подтверждено</div>
          <div className="stat-card-value">{confirmed}</div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><span className="spinner" /> Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconCheckSquare size={30} /></div>
          <div className="empty-state-title">Назначений нет</div>
          <div className="empty-state-text">Перейдите в «Мероприятия» и запишитесь на событие</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Мероприятие</th><th>Дата</th><th>Роль</th><th>Часы</th><th>Статус</th>
            </tr></thead>
            <tbody>
              {items.map(a => (
                <tr key={a.assignmentId}>
                  <td style={{ fontWeight: 600 }}>{a.eventName}</td>
                  <td>{new Date(a.eventDateStart).toLocaleString('ru-RU')}</td>
                  <td><span className="badge badge-muted">{a.roleName}</span></td>
                  <td>{a.hoursActual ?? <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                  <td>
                    {a.confirmed
                      ? <span className="badge badge-success"><IconCheck size={12} /> Подтверждено</span>
                      : <span className="badge badge-warning">Ожидает</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
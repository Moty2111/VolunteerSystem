import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assignmentsApi } from '../api/assignments';
import type { Assignment } from '../types';
import { EmptyState, Skeleton } from '../components/ui';
import { IllCalendar } from '../components/illustrations';
import { IconClock, IconCheckSquare, IconCheck } from '../components/Icons';

export default function MyAssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
        <div className="stat-card" style={{ ['--accent-color' as string]: 'var(--primary)' }}>
          <span className="accent-bar" />
          <div className="stat-card-head">
            <div className="stat-card-label">Всего назначений</div>
            <div className="stat-card-icon"><IconCheckSquare /></div>
          </div>
          <div className="stat-card-value num">{loading ? '—' : items.length}</div>
        </div>
        <div className="stat-card" style={{ ['--accent-color' as string]: 'var(--success)' }}>
          <span className="accent-bar" />
          <div className="stat-card-head">
            <div className="stat-card-label">Отработано часов</div>
            <div className="stat-card-icon"><IconClock /></div>
          </div>
          <div className="stat-card-value num">{loading ? '—' : totalHours.toFixed(1)}</div>
        </div>
        <div className="stat-card" style={{ ['--accent-color' as string]: 'var(--warning)' }}>
          <span className="accent-bar" />
          <div className="stat-card-head">
            <div className="stat-card-label">Подтверждено</div>
            <div className="stat-card-icon"><IconCheck /></div>
          </div>
          <div className="stat-card-value num">{loading ? '—' : confirmed}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} height={54} radius={12} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            illustration={<IllCalendar size={110} />}
            title="Назначений нет"
            text="Перейдите в «Мероприятия» и запишитесь на событие"
            action={
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/events')}>
                К мероприятиям
              </button>
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="sticky-first">
            <thead><tr>
              <th>Мероприятие</th><th>Дата</th><th>Роль</th><th>Часы</th><th>Статус</th>
            </tr></thead>
            <tbody>
              {items.map(a => (
                <tr key={a.assignmentId}>
                  <td style={{ fontWeight: 600 }}>{a.eventName}</td>
                  <td>{new Date(a.eventDateStart).toLocaleString('ru-RU')}</td>
                  <td><span className="badge badge-muted">{a.roleName}</span></td>
                  <td className="num">{a.hoursActual ?? <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
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

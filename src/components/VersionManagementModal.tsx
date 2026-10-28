import { useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Layers,
  Milestone,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { ProjectVersion, Task } from '../api/mock';

interface VersionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ProjectVersion[];
  tasks: Task[];
  onSaveVersion: (versionData: {
    id?: number;
    name: string;
    release_date?: string | null;
    description?: string;
    status?: 'planned' | 'in_progress' | 'released' | 'archived';
  }) => void;
  onDeleteVersion: (versionId: number) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: 'מתוכנן', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  in_progress: { label: 'בפיתוח', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  released: { label: 'שוחרר', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  archived: { label: 'בארכיון', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' },
};

export function VersionManagementModal({
  isOpen,
  onClose,
  versions,
  tasks,
  onSaveVersion,
  onDeleteVersion,
}: VersionManagementModalProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [status, setStatus] = useState<'planned' | 'in_progress' | 'released' | 'archived'>('in_progress');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (v: ProjectVersion) => {
    setEditingId(v.id);
    setName(v.name);
    setReleaseDate(v.release_date || v.releaseDate || '');
    setStatus(v.status || 'in_progress');
    setDescription(v.description || '');
  };

  const handleResetForm = () => {
    setEditingId(null);
    setName('');
    setReleaseDate('');
    setStatus('in_progress');
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveVersion({
      id: editingId ?? undefined,
      name: name.trim(),
      release_date: releaseDate || null,
      status,
      description: description.trim(),
    });

    handleResetForm();
  };

  // Helper count tasks per version
  const getTaskCount = (verName: string) => {
    return tasks.filter((t) => (t.target_version || t.targetVersion)?.trim() === verName.trim()).length;
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 680, width: '95%' }}
      >
        <header className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge" style={{ color: '#8B5CF6', background: 'rgba(139, 92, 246, 0.12)' }}>
              <Milestone size={18} />
            </span>
            <div>
              <h3>ניהול גרסאות ותאריכי יעד (Version Management)</h3>
              <p className="modal-subtitle">הגדרה ומעקב אחר גרסאות מוצר, תאריכי שחרור ומשימות משויכות</p>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', gap: 20 }}>
          {/* Add / Edit Form */}
          <form onSubmit={handleSubmit} className="version-form-box">
            <div className="version-form-title">
              <span className="font-semibold text-sm">
                {editingId ? 'עריכת גרסה קיימת' : 'הוספת גרסת יעד חדשה'}
              </span>
              {editingId && (
                <button type="button" className="btn ghost xs" onClick={handleResetForm}>
                  בטל עריכה
                </button>
              )}
            </div>

            <div className="version-inputs-grid">
              <div className="form-group">
                <label className="form-label required">שם הגרסה</label>
                <input
                  type="text"
                  className="field"
                  placeholder="לדוגמה: v2.3.0"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">תאריך יעד / שחרור</label>
                <input
                  type="date"
                  className="field"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">סטטוס הגרסה</label>
                <select
                  className="field"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="planned">מתוכנן (Planned)</option>
                  <option value="in_progress">בפיתוח (In Progress)</option>
                  <option value="released">שוחרר (Released)</option>
                  <option value="archived">בארכיון (Archived)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">תיאור קצר</label>
                <input
                  type="text"
                  className="field"
                  placeholder="לדוגמה: שחרור מודול תשלומים חדש"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="version-form-actions">
              <button type="submit" className="btn primary sm" disabled={!name.trim()}>
                {editingId ? <Check size={14} /> : <Plus size={14} />}
                <span>{editingId ? 'שמור שינויים בגרסה' : 'צור גרסה חדשה'}</span>
              </button>
            </div>
          </form>

          {/* Versions Table / List */}
          <div className="versions-list-section">
            <span className="font-semibold text-sm" style={{ marginBottom: 8, display: 'block' }}>
              גרסאות מוגדרות במערכת ({versions.length}):
            </span>

            <div className="versions-table-wrap">
              <table className="list-table admin-table">
                <thead>
                  <tr>
                    <th>גרסה</th>
                    <th>תאריך יעד</th>
                    <th>סטטוס</th>
                    <th>משימות</th>
                    <th>תיאור</th>
                    <th style={{ width: 80 }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                        אין עדיין גרסאות מוגדרות. צור גרסה חדשה בטופס למעלה!
                      </td>
                    </tr>
                  ) : (
                    versions.map((ver) => {
                      const count = getTaskCount(ver.name);
                      const statusInfo = STATUS_LABELS[ver.status || 'in_progress'] || STATUS_LABELS.in_progress;
                      const dateDisplay = ver.release_date || ver.releaseDate;

                      return (
                        <tr key={ver.id} className="list-row">
                          <td>
                            <span className="target-version-badge" style={{ fontSize: 13, padding: '3px 8px' }}>
                              <Milestone size={12} style={{ marginInlineEnd: 4 }} />
                              {ver.name}
                            </span>
                          </td>
                          <td>
                            {dateDisplay ? (
                              <span className="meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={13} />
                                {new Date(dateDisplay).toLocaleDateString('he-IL')}
                              </span>
                            ) : (
                              <span className="meta">לא נקבע</span>
                            )}
                          </td>
                          <td>
                            <span
                              className="user-status-pill"
                              style={{
                                color: statusInfo.color,
                                backgroundColor: statusInfo.bg,
                              }}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td>
                            <span className="subtasks-count-pill" title={`${count} משימות משויכות לגרסה זו`}>
                              {count} משימות
                            </span>
                          </td>
                          <td>
                            <span className="meta" style={{ fontSize: 12 }}>
                              {ver.description || '—'}
                            </span>
                          </td>
                          <td>
                            <div className="row-actions-group" style={{ display: 'flex', gap: 4 }}>
                              <button
                                type="button"
                                className="icon-btn xs"
                                onClick={() => handleStartEdit(ver)}
                                title="ערוך גרסה"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn xs text-danger"
                                onClick={() => onDeleteVersion(ver.id)}
                                title="מחק גרסה"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className="modal-footer">
          <div />
          <button type="button" className="btn secondary" onClick={onClose}>
            סגור
          </button>
        </footer>
      </div>
    </div>
  );
}

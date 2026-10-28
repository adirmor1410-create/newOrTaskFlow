import { useState, useEffect } from 'react';
import { Columns, X, Trash2, Check } from 'lucide-react';
import type { Column } from '../api/mock';

interface EditColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  column: Column | null;
  onSave: (columnId: number, name: string, color: string) => void;
  onDelete?: (columnId: number) => void;
}

const COLOR_OPTIONS = [
  '#64748B', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#06B6D4', '#EC4899', '#EF4444',
];

export function EditColumnModal({
  isOpen,
  onClose,
  column,
  onSave,
  onDelete,
}: EditColumnModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#64748B');

  useEffect(() => {
    if (isOpen && column) {
      setName(column.name);
      setColor(column.color || '#64748B');
    }
  }, [isOpen, column]);

  if (!isOpen || !column) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(column.id, name.trim(), color);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <header className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge" style={{ backgroundColor: color + '22', color }}>
              <Columns size={18} />
            </span>
            <div>
              <h3>עריכת עמודה קיימת</h3>
              <p className="modal-subtitle">שינוי שם העמודה והצבע המזהה שלה בלוח</p>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label required">שם העמודה</label>
              <input
                autoFocus
                dir="auto"
                className="field input-lg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">צבע העמודה</label>
              <div className="color-picker-row">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-pick-circle ${color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  >
                    {color === c && <Check size={14} color="#FFF" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <footer className="modal-footer">
            <div>
              {onDelete && (
                <button
                  type="button"
                  className="btn ghost text-danger"
                  onClick={() => {
                    if (window.confirm(`האם אתה בטוח שברצונך למחוק את העמודה "${column.name}"?`)) {
                      onDelete(column.id);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={15} />
                  <span>מחק עמודה</span>
                </button>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={onClose}>
                ביטול
              </button>
              <button type="submit" className="btn primary" disabled={!name.trim()}>
                שמור שינויים
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

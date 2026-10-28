import { useState, useEffect } from 'react';
import { Users, X, Trash2, Check, Sparkles } from 'lucide-react';
import type { Team } from '../api/mock';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamToEdit?: Team | null;
  onSave: (teamData: { name: string; description: string; color: string }) => void;
  onDelete?: (teamId: number) => void;
}

const COLOR_OPTIONS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#6366F1', '#EF4444',
];

export function TeamModal({
  isOpen,
  onClose,
  teamToEdit,
  onSave,
  onDelete,
}: TeamModalProps) {
  const isEditing = Boolean(teamToEdit);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');

  useEffect(() => {
    if (isOpen) {
      if (teamToEdit) {
        setName(teamToEdit.name);
        setDescription(teamToEdit.description);
        setColor(teamToEdit.color || '#3B82F6');
      } else {
        setName('');
        setDescription('');
        setColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
      }
    }
  }, [isOpen, teamToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      color,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <header className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge" style={{ backgroundColor: color + '22', color }}>
              <Users size={18} />
            </span>
            <div>
              <h3>{isEditing ? 'עריכת צוות קיים' : 'פתיחת צוות חדש'}</h3>
              <p className="modal-subtitle">
                {isEditing ? 'עדכן את פרטי הצוות וצבע הזיהוי' : 'צור צוות שירכז תחום פעילות ופרויקטים'}
              </p>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label required">שם הצוות</label>
              <input
                autoFocus
                dir="auto"
                className="field input-lg"
                placeholder="לדוגמה: צוות פיתוח ליבה, צוות מוצר..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">תיאור תחום הפעילות</label>
              <textarea
                dir="auto"
                className="field textarea-md"
                rows={3}
                placeholder="על מה הצוות אחראי..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">צבע זיהוי הצוות</label>
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
              {isEditing && onDelete && (
                <button
                  type="button"
                  className="btn ghost text-danger"
                  onClick={() => {
                    if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${teamToEdit?.name}"?`)) {
                      onDelete(teamToEdit!.id);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={15} />
                  <span>מחק צוות</span>
                </button>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={onClose}>
                ביטול
              </button>
              <button type="submit" className="btn primary" disabled={!name.trim()}>
                <Sparkles size={15} />
                <span>{isEditing ? 'שמור שינויים' : 'צור צוות'}</span>
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

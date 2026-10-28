import { useState, type CSSProperties, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Check, MoreHorizontal, Pencil, Plus, X } from 'lucide-react';
import { he } from '../../i18n/he';
import type { Column as Col } from '../../api/mock';

interface ColumnProps {
  col: Col;
  count: number;
  onAdd: (title: string) => void;
  onEdit?: (col: Col) => void;
  children: React.ReactNode;
}

export function Column({ col, count, onAdd, onEdit, children }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) {
      inputRef.current?.focus();
    }
  }, [adding]);

  const submit = () => {
    if (title.trim()) {
      onAdd(title.trim());
      setTitle('');
    }
    setAdding(false);
  };

  const cancel = () => {
    setTitle('');
    setAdding(false);
  };

  return (
    <section
      ref={setNodeRef}
      className={`board-column ${isOver ? 'is-over' : ''}`}
      aria-label={col.name}
      style={{ '--col-accent': col.color } as CSSProperties}
    >
      <header className="column-header">
        <div className="col-title-wrap" onDoubleClick={() => onEdit?.(col)}>
          <span className="col-accent-dot" style={{ backgroundColor: col.color }} />
          <h2 className="col-title" title="לחץ פעמיים לעריכת עמודה">{col.name}</h2>
          <span className="col-count-badge">{count}</span>
        </div>

        <div className="col-actions">
          <button
            type="button"
            className="icon-btn sm"
            onClick={() => setAdding(true)}
            title={he.column.addTask}
            aria-label={he.column.addTask}
          >
            <Plus size={16} />
          </button>
          {onEdit && (
            <button
              type="button"
              className="icon-btn sm"
              onClick={() => onEdit(col)}
              title="ערוך עמודה"
              aria-label="ערוך עמודה"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </header>

      <div className="column-body">
        {children}

        {count === 0 && !adding && (
          <div className="column-empty-state">
            <div className="empty-icon-ring">
              <span className="empty-dot" style={{ backgroundColor: col.color }} />
            </div>
            <p className="empty-title">{he.column.emptyColumn}</p>
            <button
              type="button"
              className="empty-action-btn"
              onClick={() => setAdding(true)}
            >
              <Plus size={14} />
              <span>{he.column.addTask}</span>
            </button>
          </div>
        )}
      </div>

      <footer className="column-footer">
        {adding ? (
          <div className="inline-add-card">
            <input
              ref={inputRef}
              dir="auto"
              className="field inline-add-input"
              placeholder={he.column.taskTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
                if (e.key === 'Escape') cancel();
              }}
            />
            <div className="inline-add-actions">
              <button
                type="button"
                className="btn primary sm"
                onClick={submit}
                disabled={!title.trim()}
              >
                <Check size={14} />
                <span>{he.column.save}</span>
              </button>
              <button type="button" className="btn ghost sm" onClick={cancel}>
                <X size={14} />
                <span>{he.column.cancel}</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-add-task-trigger"
            onClick={() => setAdding(true)}
          >
            <Plus size={15} />
            <span>{he.column.addTask}</span>
          </button>
        )}
      </footer>
    </section>
  );
}

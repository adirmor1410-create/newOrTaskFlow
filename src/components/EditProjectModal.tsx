import { useState, useEffect } from 'react';
import {
  FolderKanban,
  X,
  Trash2,
  Check,
  Sparkles,
  Paperclip,
  UploadCloud,
  Download,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  File,
} from 'lucide-react';
import type { Project, Team, FileAttachment } from '../api/mock';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
  teams: Team[];
  defaultTeamId?: number;
  onSave: (projectData: {
    name: string;
    key: string;
    description: string;
    color: string;
    teamId: number;
    attachments?: FileAttachment[];
  }) => void;
  onDelete?: (projectId: number) => void;
}

const COLOR_OPTIONS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#6366F1', '#EF4444',
];

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(type?: string, name?: string) {
  const n = (name || '').toLowerCase();
  const t = (type || '').toLowerCase();
  if (t.startsWith('image/') || n.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    return <ImageIcon size={16} className="text-blue-500" />;
  }
  if (n.endsWith('.pdf') || t.includes('pdf')) {
    return <FileText size={16} className="text-red-500" />;
  }
  if (n.match(/\.(xls|xlsx|csv)$/) || t.includes('sheet') || t.includes('excel')) {
    return <FileSpreadsheet size={16} className="text-emerald-500" />;
  }
  if (n.match(/\.(zip|rar|7z|tar|gz)$/)) {
    return <FileArchive size={16} className="text-amber-500" />;
  }
  if (n.match(/\.(js|ts|tsx|jsx|json|py|html|css|cpp|cs)$/)) {
    return <FileCode size={16} className="text-purple-500" />;
  }
  return <File size={16} className="text-slate-400" />;
}

export function ProjectModal({
  isOpen,
  onClose,
  projectToEdit,
  teams,
  defaultTeamId,
  onSave,
  onDelete,
}: ProjectModalProps) {
  const isEditing = Boolean(projectToEdit);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [teamId, setTeamId] = useState<number>(defaultTeamId || teams[0]?.id || 1);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name);
        setKey(projectToEdit.key);
        setDescription(projectToEdit.description);
        setColor(projectToEdit.color || '#3B82F6');
        setTeamId(projectToEdit.teamId || projectToEdit.team_id || teams[0]?.id || 1);
        setAttachments(projectToEdit.attachments || []);
      } else {
        setName('');
        setKey('');
        setDescription('');
        setColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
        setTeamId(defaultTeamId || teams[0]?.id || 1);
        setAttachments([]);
      }
    }
  }, [isOpen, projectToEdit, defaultTeamId, teams]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const newFile: FileAttachment = {
          id: `patt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: reader.result as string,
          uploaded_at: new Date().toISOString(),
          uploaded_by: 1,
        };
        setAttachments((prev) => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleDeleteAttachment = (fileId: string | number) => {
    setAttachments((prev) => prev.filter((a) => a.id !== fileId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const generatedKey = key.trim().toUpperCase() || name.trim().slice(0, 3).toUpperCase();
    onSave({
      name: name.trim(),
      key: generatedKey,
      description: description.trim(),
      color,
      teamId,
      attachments,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <header className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge" style={{ backgroundColor: color + '22', color }}>
              <FolderKanban size={18} />
            </span>
            <div>
              <h3>{isEditing ? 'עריכת פרויקט קיים' : 'יצירת פרויקט חדש'}</h3>
              <p className="modal-subtitle">
                {isEditing ? 'עדכן פרטי פרויקט, מסמכים, שיוך לצוות וצבע' : 'הגדר פרויקט חדש ושייך אותו לצוות'}
              </p>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            <div className="form-row-grid">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label required">שם הפרויקט</label>
                <input
                  autoFocus
                  dir="auto"
                  className="field input-lg"
                  placeholder="לדוגמה: אפליקציית מובייל, שדרוג תשתיות..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!isEditing && !key) {
                      setKey(e.target.value.slice(0, 3).toUpperCase());
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">שיוך לצוות</label>
                <select
                  className="field"
                  value={teamId}
                  onChange={(e) => setTeamId(Number(e.target.value))}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">קוד מזהה (Key משימות)</label>
                <input
                  className="field"
                  placeholder="ALP, BET..."
                  maxLength={5}
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">תיאור הפרויקט ומטרותיו</label>
              <textarea
                dir="auto"
                className="field textarea-md"
                rows={3}
                placeholder="הסבר קצר על מטרת הפרויקט..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">צבע הפרויקט</label>
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

            {/* Project Attachments Section */}
            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <div className="attachments-header-row">
                <div className="section-title-with-badge">
                  <Paperclip size={15} className="text-secondary" />
                  <span className="form-label" style={{ margin: 0, fontWeight: 600 }}>
                    קבצים ומסמכים מצורפים לפרויקט ({attachments.length})
                  </span>
                </div>
                <label className="btn-upload-file-label">
                  <UploadCloud size={14} />
                  <span>העלה קובץ</span>
                  <input
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {attachments.length === 0 ? (
                <label className="attachments-empty-dropzone">
                  <UploadCloud size={24} className="dropzone-icon" />
                  <span className="dropzone-label">אין קבצים מצורפים לפרויקט</span>
                  <span className="dropzone-sub">לחץ כאן כדי להעלות מסמכים, אפיון, עיצובים או מפרטים</span>
                  <input
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="attachments-grid">
                  {attachments.map((file) => (
                    <div key={file.id} className="attachment-card">
                      <div className="attachment-file-icon">
                        {getFileIcon(file.type, file.name)}
                      </div>
                      <div className="attachment-file-info">
                        <div className="attachment-file-name" title={file.name}>
                          {file.name}
                        </div>
                        <div className="attachment-file-meta">
                          {formatFileSize(file.size)} • {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString('he-IL') : 'הועלה כעת'}
                        </div>
                      </div>
                      <div className="attachment-card-actions">
                        <a
                          href={file.url}
                          download={file.name}
                          className="icon-action-btn"
                          title="הורד קובץ"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={14} />
                        </a>
                        <button
                          type="button"
                          className="icon-action-btn delete"
                          title="מחק קובץ"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAttachment(file.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <footer className="modal-footer">
            <div>
              {isEditing && onDelete && (
                <button
                  type="button"
                  className="btn ghost text-danger"
                  onClick={() => {
                    if (window.confirm(`האם למחוק לצמיתות את הפרויקט "${projectToEdit?.name}" ואת כל משימותיו?`)) {
                      onDelete(projectToEdit!.id);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={15} />
                  <span>מחק פרויקט</span>
                </button>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={onClose}>
                ביטול
              </button>
              <button type="submit" className="btn primary" disabled={!name.trim()}>
                <Sparkles size={15} />
                <span>{isEditing ? 'שמור שינויים' : 'צור פרויקט'}</span>
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

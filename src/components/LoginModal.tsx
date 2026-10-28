import { useState, useEffect } from 'react';
import {
  Laptop,
  Monitor,
  CheckCircle2,
  X,
  LogIn,
  Lock,
  User as UserIcon,
  ShieldAlert,
} from 'lucide-react';
import type { User } from '../api/mock';
import { Avatar } from './ui';
import { detectLocalComputerUsername } from '../utils/device';

export interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  users: User[];
  currentUserId?: number | null;
  onSelectUser: (user: User) => void;
  onRegisterUser: (userData: { computer_username: string; display_name: string }) => void;
}

export function LoginModal({
  isOpen,
  onClose,
  users,
  onSelectUser,
  onRegisterUser,
}: LoginModalProps) {
  // Computer OS username is detected from the machine/session and is completely locked / read-only
  const [detectedOsUser, setDetectedOsUser] = useState(() => detectLocalComputerUsername());
  const [displayName, setDisplayName] = useState('');

  // Synchronize detected computer username when modal opens
  useEffect(() => {
    if (isOpen) {
      const detected = detectLocalComputerUsername();
      setDetectedOsUser(detected);
      setDisplayName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeUsers = users.filter((u) => u.is_active !== false && u.isActive !== false);

  // Check if this computer username is already recognized in the database
  const matchedUser = activeUsers.find((u) => {
    const uComp = (u.computer_username || u.computerUsername || u.computer_name || u.computerName || u.username || '')
      .trim()
      .toLowerCase();
    return uComp === detectedOsUser.trim().toLowerCase();
  });

  const handleLoginMatched = (userToLogin: User) => {
    try {
      localStorage.setItem('jira_current_user_id', String(userToLogin.id));
      localStorage.setItem(
        'jira_local_computer_username',
        userToLogin.computer_username || userToLogin.computerUsername || detectedOsUser
      );
    } catch (e) {}
    onSelectUser(userToLogin);
    if (onClose) onClose();
  };

  const handleRegisterNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !detectedOsUser.trim()) return;

    try {
      localStorage.setItem('jira_local_computer_username', detectedOsUser.trim());
    } catch (e) {}

    onRegisterUser({
      computer_username: detectedOsUser.trim(),
      display_name: displayName.trim(),
    });
    if (onClose) onClose();
  };

  return (
    <div className="modal-backdrop login-modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-container login-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header with icon badge */}
        <header className="modal-header login-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge login-badge">
              <Laptop size={22} />
            </span>
            <div>
              <h3>
                {matchedUser ? 'זיהוי משתמש במחשב' : 'חיבור ראשוני למערכת'}
              </h3>
              <p className="modal-subtitle">
                {matchedUser
                  ? 'שם המשתמש במחשב מזוהה ומשויך לחשבונך'
                  : 'התחברות ראשונה מהמחשב (שם המשתמש במחשב זוהה אוטומטית)'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              title="סגור"
            >
              <X size={18} />
            </button>
          )}
        </header>

        <div className="modal-body login-body">
          {/* Automatic Hardware / OS Detection Banner */}
          <div className="login-device-banner">
            <span className="device-banner-icon">
              <Monitor size={18} />
            </span>
            <div className="device-banner-text">
              <span className="banner-title">זיהוי שם משתמש במחשב (OS User):</span>
              <span className="banner-subtitle">
                המערכת מזהה אוטומטית את שם המשתמש שלך במחשב זה ללא צורך בהקלדה וללא אפשרות לשינוי עצמאי.
              </span>
            </div>
          </div>

          {/* Locked Readonly Computer Username Box */}
          <div className="form-group">
            <label className="form-label">
              <UserIcon size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
              שם המשתמש במחשב שזוהה (נעול לשינוי)
            </label>
            <div className="locked-computer-banner">
              <div className="locked-computer-left">
                <Laptop size={16} className="text-primary" />
                <span className="locked-computer-name-code">{detectedOsUser}</span>
              </div>
              <span className="locked-badge-pill">
                <Lock size={12} />
                זוהה אוטומטית מהמחשב
              </span>
            </div>
          </div>

          {/* CASE 1: Computer username is already registered in the system */}
          {matchedUser ? (
            <div className="matched-user-card">
              <div className="matched-user-top">
                <span className="match-status-tag">
                  <CheckCircle2 size={14} /> המשתמש זוהה בהצלחה במערכת!
                </span>
              </div>
              <div className="matched-user-info">
                <Avatar name={matchedUser.name} size={46} showStatus isOnline />
                <div className="matched-user-details">
                  <h4>{matchedUser.name}</h4>
                  <span className="matched-meta">
                    שם משתמש במחשב: <strong>{matchedUser.computer_username || matchedUser.computerUsername || detectedOsUser}</strong> | {matchedUser.roleLabel || matchedUser.role}
                  </span>
                </div>
              </div>

              <div className="matched-actions">
                <button
                  type="button"
                  className="btn primary lg full-width"
                  onClick={() => handleLoginMatched(matchedUser)}
                >
                  <LogIn size={16} />
                  <span>כניסה למערכת כ-{matchedUser.name}</span>
                </button>
              </div>
            </div>
          ) : (
            /* CASE 2: First-time connection for this computer username -> Set display name once */
            <form onSubmit={handleRegisterNew} className="login-form">
              <div className="form-group">
                <label className="form-label required">
                  <UserIcon size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                  שם מלא לתצוגה (הגדרה ראשונית בלבד)
                </label>
                <input
                  dir="auto"
                  autoFocus
                  className="field login-field input-lg"
                  placeholder="הזן את שמך המלא (למשל: אדיר כהן)..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <span className="field-hint">
                  שם זה ישויך לצמיתות לשם המשתמש במחשב <strong>{detectedOsUser}</strong>.
                </span>
              </div>

              <div className="login-policy-notice">
                <ShieldAlert size={16} />
                <span>
                  <strong>שים לב:</strong> כמשתמש רגיל, לא ניתן לשנות את השם או את שם המשתמש במחשב לאחר החיבור. שינויים יתאפשרו אך ורק על ידי מנהל מערכת (Admin).
                </span>
              </div>

              <button
                type="submit"
                className="btn primary lg full-width"
                disabled={!displayName.trim()}
              >
                <CheckCircle2 size={16} />
                <span>השלם הגדרה והתחבר למערכת</span>
              </button>
            </form>
          )}
        </div>

        <footer className="modal-footer login-footer">
          <span className="login-footer-note">
            💾 הזיהוי נשמר במחשב זה לצמיתות – בכניסות הבאות המערכת תזהה אותך ישירות.
          </span>
        </footer>
      </div>
    </div>
  );
}

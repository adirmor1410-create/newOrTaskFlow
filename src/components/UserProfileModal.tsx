import { useState } from 'react';
import {
  Laptop,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  X,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { User } from '../api/mock';
import { Avatar } from './ui';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers?: User[];
  onNavigateAdmin?: () => void;
  onSwitchUser?: (user: User) => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  allUsers = [],
  onNavigateAdmin,
  onSwitchUser,
}: UserProfileModalProps) {
  const [showAdminTestingChips, setShowAdminTestingChips] = useState(false);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'ADMIN';
  const osUser = currentUser.computer_username || currentUser.computerUsername || currentUser.computer_name || currentUser.username || 'משתמש מקומי';

  return (
    <div className="modal-backdrop user-profile-modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-container user-profile-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
              <UserIcon size={20} />
            </span>
            <div>
              <h3>כרטיס משתמש</h3>
              <p className="modal-subtitle">פרטי הזיהוי שלך במערכת</p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="סגור"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="modal-body user-profile-modal-body">
          {/* Main User Card */}
          <div className="profile-hero-card">
            <Avatar name={currentUser.name} size={54} showStatus isOnline={currentUser.is_active !== false} />
            <div className="profile-hero-details">
              <div className="profile-hero-name-row">
                <h4>{currentUser.name}</h4>
                <span className={`profile-role-tag ${currentUser.role.toLowerCase()}`}>
                  {isAdmin ? <ShieldCheck size={12} /> : <UserIcon size={12} />}
                  {currentUser.roleLabel || currentUser.role}
                </span>
              </div>
              <span className="profile-username">שם תצוגה: {currentUser.name}</span>
            </div>
          </div>

          {/* Locked OS Username Info */}
          <div className="profile-field-card">
            <div className="field-card-header">
              <span className="field-card-title">
                <Laptop size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                שם משתמש במחשב (Computer / OS Username)
              </span>
              <span className="lock-indicator-badge">
                <Lock size={11} />
                נעול לשינוי
              </span>
            </div>
            <div className="locked-computer-box">
              <span className="locked-computer-code">{osUser}</span>
              <span className="locked-computer-note">זוהה אוטומטית בעת החיבור הראשוני</span>
            </div>
          </div>

          {/* Regular User Policy Banner */}
          {!isAdmin ? (
            <div className="user-locked-policy-banner">
              <span className="policy-icon">
                <Lock size={18} />
              </span>
              <div className="policy-text">
                <span className="policy-title">נעול לעריכה עצמית:</span>
                <p>
                  בתור משתמש רגיל, <strong>לא ניתן לשנות את השם או את שם המשתמש במחשב</strong>. שם המשתמש במחשב נקבע בעת החיבור הראשוני לאתר.
                  במידה ונפלה טעות בשם, יש לפנות ל<strong>מנהל המערכת (Admin)</strong> לצורך עדכון הפרטים.
                </p>
              </div>
            </div>
          ) : (
            <div className="admin-privilege-banner">
              <span className="admin-privilege-icon">
                <ShieldCheck size={20} />
              </span>
              <div className="admin-privilege-text">
                <span className="admin-privilege-title">הרשאות מנהל מערכת (Admin)</span>
                <p>
                  כמנהל מערכת, באפשרותך לערוך שמות משתמשים, שמות מחשב והרשאות דרך מסך הניהול.
                </p>
                {onNavigateAdmin && (
                  <button
                    type="button"
                    className="btn primary sm"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      onClose();
                      onNavigateAdmin();
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>עבור לניהול מערכת (Admin Panel)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* System Admin Testing Tool (Only visible to Admin) */}
          {isAdmin && allUsers.length > 0 && onSwitchUser && (
            <div className="admin-testing-wrapper">
              <button
                type="button"
                className="admin-testing-toggle-btn"
                onClick={() => setShowAdminTestingChips((prev) => !prev)}
              >
                <span>כלי מנהל: תצוגה מקדימה כמשתמש אחר</span>
                {showAdminTestingChips ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAdminTestingChips && (
                <div className="admin-testing-chips-grid">
                  {allUsers
                    .filter((u) => u.id !== currentUser.id && u.is_active !== false)
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="admin-switch-chip"
                        onClick={() => {
                          onSwitchUser(u);
                          onClose();
                        }}
                      >
                        <Avatar name={u.name} size={20} />
                        <span className="admin-switch-name">{u.name}</span>
                        <span className="admin-switch-pc">
                          {u.computer_username || u.computerUsername || u.computer_name || u.username}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
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

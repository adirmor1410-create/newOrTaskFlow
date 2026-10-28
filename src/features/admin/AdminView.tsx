import { useState, useEffect } from 'react';
import {
  Check,
  Crown,
  Database,
  Key,
  Laptop,
  LockOpen,
  Mail,
  Pencil,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
  RotateCcw,
} from 'lucide-react';
import type { User, Team, UserRole } from '../../api/mock';
import { Avatar } from '../../components/ui';

interface AdminViewProps {
  users: User[];
  teams: Team[];
  onUpdateUserRole: (userId: number, role: UserRole) => void;
  onAddUser: (userData: { username: string; display_name: string; computer_username?: string; computer_name?: string; role: UserRole }) => void;
  onUpdateTeamMembers: (teamId: number, memberIds: number[]) => void;
  onUpdateTeamLead: (teamId: number, leadUserId: number) => void;
  onToggleUserActive?: (userId: number) => void;
  onTransferUserTeam?: (userId: number, newTeamId: number | null) => void;
  onUpdateUserDetails?: (userId: number, data: { name: string; display_name: string; computer_username?: string; computer_name?: string; role?: UserRole }) => void;
  onResetData?: () => void;
}

const ROLE_INFO: Record<
  UserRole,
  { label: string; icon: typeof ShieldCheck; color: string; desc: string }
> = {
  ADMIN: {
    label: 'מנהל מערכת',
    icon: ShieldAlert,
    color: '#EF4444',
    desc: 'גישה מלאה לכלל הצוותים, הפרויקטים, הגדרות האבטחה ומחיקת ישויות בארגון.',
  },
  TEAM_LEAD: {
    label: 'ראש צוות',
    icon: Crown,
    color: '#F59E0B',
    desc: 'ניהול עובדי הצוות, שיוך פרויקטים לצוות, יצירת עמודות בלוח והגדרת גרסאות יעד.',
  },
  USER: {
    label: 'משתמש',
    icon: UserCheck,
    color: '#3B82F6',
    desc: 'צפייה ועדכון משימות, גרירה בלוח קנבן, כתיבת תגובות וסגירת תת-משימות.',
  },
};

export function AdminView({
  users,
  teams,
  onUpdateUserRole,
  onAddUser,
  onUpdateTeamMembers,
  onUpdateTeamLead,
  onToggleUserActive,
  onTransferUserTeam,
  onUpdateUserDetails,
  onResetData,
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');

  // SQLite DB Storage info
  const [storageInfo, setStorageInfo] = useState<{
    engine?: string;
    filePath?: string;
    exists?: boolean;
    size?: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/storage-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStorageInfo(data);
      })
      .catch(() => {});
  }, []);

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newComputerName, setNewComputerName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editComputerUsername, setEditComputerUsername] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('USER');

  const handleStartEditUser = (u: User) => {
    setEditingUser(u);
    setEditDisplayName(u.name || u.display_name);
    setEditComputerUsername(u.computer_username || u.computerUsername || u.computer_name || u.computerName || u.username);
    setEditRole(u.role);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editDisplayName.trim()) return;
    const cleanComp = editComputerUsername.trim();
    onUpdateUserDetails?.(editingUser.id, {
      name: editDisplayName.trim(),
      display_name: editDisplayName.trim(),
      computer_username: cleanComp,
      computer_name: cleanComp,
      role: editRole,
    });
    setEditingUser(null);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newDisplayName.trim()) return;
    const cleanComp = (newComputerName.trim() || newUsername.trim());
    onAddUser({
      username: newUsername.trim(),
      display_name: newDisplayName.trim(),
      computer_username: cleanComp,
      computer_name: cleanComp,
      role: newRole,
    });
    setNewUsername('');
    setNewDisplayName('');
    setNewComputerName('');
    setNewRole('USER');
    setIsAddUserOpen(false);
  };

  const handleAddMemberToTeam = (teamId: number, userId: number) => {
    if (onTransferUserTeam) {
      onTransferUserTeam(userId, teamId);
    } else {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;
      if (!team.member_user_ids.includes(userId)) {
        onUpdateTeamMembers(teamId, [...team.member_user_ids, userId]);
      }
    }
  };

  const handleRemoveMemberFromTeam = (teamId: number, userId: number) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    onUpdateTeamMembers(teamId, team.member_user_ids.filter((id) => id !== userId));
  };

  return (
    <div className="admin-view-container">
      {/* Admin Header */}
      <div className="admin-header-banner">
        <div className="admin-header-left">
          <span className="admin-shield-badge">
            <ShieldCheck size={24} />
          </span>
          <div>
            <h2>ניהול מערכת והרשאות (Admin Panel)</h2>
            <p className="meta">ניהול משתמשי המערכת, תפקידים, דרגות הרשאה ושיוך עובדים לצוותים</p>
          </div>
        </div>

        <div className="admin-tabs-nav">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} />
            <span>משתמשים והרשאות</span>
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            <Shield size={16} />
            <span>שיוך עובדים לצוותים</span>
          </button>

          {onResetData && (
            <button
              type="button"
              className="btn sm danger outline"
              style={{ marginInlineStart: 'auto', gap: 6 }}
              onClick={() => {
                if (window.confirm('האם אתה בטוח שברצונך לאפס את כל נתוני המערכת לברירת המחדל? כל המשימות, הגרסאות והמשתמשים החדשים יאותחלו.')) {
                  onResetData();
                }
              }}
              title="איפוס נתוני האפליקציה למצב ברירת מחדל"
            >
              <RotateCcw size={13} />
              <span>איפוס נתונים לברירת מחדל</span>
            </button>
          )}
        </div>
      </div>

      {/* Database & Lock Status Strip */}
      <div className="admin-db-status-strip">
        <div className="admin-db-status-pill">
          <Database size={13} style={{ color: '#10B981' }} />
          <span>מסד נתונים: <strong>SQLite (.db)</strong></span>
        </div>
        <div className="admin-db-status-pill">
          <LockOpen size={13} style={{ color: '#3B82F6' }} />
          <span>מצב נעילה: <strong>קריאה/כתיבה נקודתית וסגירה מיידית (ללא תפיסת קובץ)</strong></span>
        </div>
        {storageInfo?.filePath && (
          <div className="admin-db-status-path" title={storageInfo.filePath}>
            <span>נתיב: <code>{storageInfo.filePath}</code></span>
            {storageInfo.size !== undefined && (
              <span className="admin-db-size">({(storageInfo.size / 1024).toFixed(1)} KB)</span>
            )}
          </div>
        )}
      </div>

      {/* Tab 1: Users & Roles */}
      {activeTab === 'users' && (
        <div className="admin-tab-content">
          {/* Roles Matrix Cards */}
          <div className="roles-overview-grid">
            {(Object.keys(ROLE_INFO) as UserRole[]).map((r) => {
              const info = ROLE_INFO[r];
              const Icon = info.icon;
              const count = users.filter((u) => u.role === r).length;
              return (
                <div key={r} className="role-card" style={{ '--role-color': info.color } as React.CSSProperties}>
                  <div className="role-card-top">
                    <span className="role-icon-box" style={{ backgroundColor: info.color + '22', color: info.color }}>
                      <Icon size={18} />
                    </span>
                    <span className="role-badge-pill" style={{ color: info.color }}>
                      {info.label}
                    </span>
                    <span className="role-count-num">{count} משתמשים</span>
                  </div>
                  <p className="role-desc-text">{info.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Users Table Card */}
          <div className="analytics-panel full-width">
            <div className="panel-header">
              <div>
                <h3>רשימת משתמשי המערכת</h3>
                <span className="meta">עדכון הרשאות ישיר בלחיצה על התפקיד</span>
              </div>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => setIsAddUserOpen(true)}
              >
                <UserPlus size={14} />
                <span>הוסף משתמש מערכת</span>
              </button>
            </div>

            {/* Team Transfer Policy Callout */}
            <div className="admin-team-transfer-callout">
              <span className="callout-icon">💡</span>
              <div className="callout-content">
                <strong>מדיניות שיוך והעברת עובדים בין צוותים:</strong>
                <span>
                  {' '}בעת העברת משתמש לצוות אחר, <strong>כל משימות העבר שלו נשארות שמורות בצוות ובפרויקט המקוריים שבהם נוצרו</strong>. בצוות החדש ניתן להמשיך ולפתוח עבורו משימות חדשות כרגיל.
                </span>
              </div>
            </div>

            <div className="admin-users-table-wrap">
              <table className="list-table admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>משתמש</th>
                    <th>שם מלא לתצוגה</th>
                    <th>שם משתמש (Username)</th>
                    <th style={{ width: 170 }}>שם משתמש במחשב</th>
                    <th style={{ width: 180 }}>שיוך לצוות (Team)</th>
                    <th style={{ width: 170 }}>רמת הרשאה ותפקיד</th>
                    <th style={{ width: 130 }}>סטטוס</th>
                    <th style={{ width: 180 }}>פעולות</th>
                    <th style={{ width: 120 }}>תאריך הצטרפות</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const roleInfo = ROLE_INFO[user.role] || ROLE_INFO.USER;
                    const isActive = user.is_active !== false && user.isActive !== false;
                    const userTeam = teams.find((t) => t.member_user_ids.includes(user.id));
                    return (
                      <tr key={user.id} className={`list-row ${!isActive ? 'admin-user-inactive' : ''}`}>
                        <td>
                          <Avatar name={user.name} size={30} showStatus isOnline={isActive} />
                        </td>
                        <td>
                          <div className="user-name-cell">
                            <span className="user-table-name">{user.name}</span>
                            <button
                              type="button"
                              className="btn-edit-user-inline"
                              onClick={() => handleStartEditUser(user)}
                              title="ערוך שם לתצוגה או שם משתמש במחשב"
                            >
                              <Pencil size={11} />
                            </button>
                            {!isActive && <span className="inactive-badge-tag">עזב</span>}
                          </div>
                        </td>
                        <td>
                          <span className="user-table-username">@{user.username}</span>
                        </td>
                        <td>
                          <span className="user-table-computer-code">
                            <Laptop size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                            {user.computer_username || user.computerUsername || user.computer_name || user.username}
                          </span>
                        </td>
                        <td>
                          <select
                            className="role-select-box team-select-box"
                            value={userTeam?.id || ''}
                            disabled={!isActive}
                            onChange={(e) => {
                              const tid = e.target.value ? Number(e.target.value) : null;
                              onTransferUserTeam?.(user.id, tid);
                            }}
                            title="העבר צוות (המשימות הקיימות יישארו בצוות המקורי, ניתן יהיה לפתוח לו משימות בצוות החדש)"
                          >
                            <option value="">ללא שיוך צוות</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="role-select-box"
                            value={user.role}
                            style={{ color: roleInfo.color }}
                            disabled={!isActive}
                            onChange={(e) => onUpdateUserRole(user.id, e.target.value as UserRole)}
                          >
                            <option value="ADMIN">מנהל מערכת (Admin)</option>
                            <option value="TEAM_LEAD">ראש צוות (Team Lead)</option>
                            <option value="USER">משתמש (User)</option>
                          </select>
                        </td>
                        <td>
                          {isActive ? (
                            <span className="user-status-pill active">
                              <span className="user-status-dot active" />
                              פעיל
                            </span>
                          ) : (
                            <span className="user-status-pill inactive">
                              <span className="user-status-dot inactive" />
                              לא פעיל (עזב)
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="admin-actions-cell">
                            <button
                              type="button"
                              className="btn sm secondary outline"
                              onClick={() => handleStartEditUser(user)}
                              title="ערוך שם לתצוגה, שם מחשב או תפקיד"
                            >
                              <Pencil size={12} />
                              <span>ערוך פרטים</span>
                            </button>
                            {onToggleUserActive && (
                              <button
                                type="button"
                                className={`btn sm ${isActive ? 'danger outline' : 'primary outline'}`}
                                onClick={() => onToggleUserActive(user.id)}
                                title={isActive ? 'סמן כעובד שעזב (Inactive) - משימות קיימות יישארו אך לא ניתן לשייך משימות חדשות' : 'הפעל מחדש את המשתמש'}
                              >
                                {isActive ? (
                                  <>
                                    <UserX size={12} />
                                    <span>הפוך ללא פעיל</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck size={12} />
                                    <span>הפעל מחדש</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="meta">{user.created_at}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Team Memberships */}
      {activeTab === 'teams' && (
        <div className="admin-tab-content">
          <div className="admin-team-transfer-callout" style={{ marginBottom: 16 }}>
            <span className="callout-icon">💡</span>
            <div className="callout-content">
              <strong>העברת עובדים בין צוותים:</strong>
              <span>
                {' '}צירוף או העברת עובד לצוות זה שומרת את כל משימות העבר שלו בצוות הקודם ובפרויקט המקורי. כעת ניתן יהיה לפתוח לו משימות חדשות בצוות זה.
              </span>
            </div>
          </div>
          <div className="team-memberships-grid">
            {teams.map((team) => {
              const teamMembers = users.filter((u) => team.member_user_ids.includes(u.id));
              const availableUsers = users.filter((u) => !team.member_user_ids.includes(u.id) && u.is_active !== false);
              const leadUser = users.find((u) => u.id === team.lead_user_id);

              return (
                <div key={team.id} className="team-membership-card">
                  <div className="team-membership-head">
                    <div className="team-head-left">
                      <span className="team-color-badge" style={{ backgroundColor: team.color }} />
                      <div>
                        <h4>{team.name}</h4>
                        <span className="meta">{team.description}</span>
                      </div>
                    </div>

                    <div className="team-lead-select-wrap">
                      <span className="lead-label">
                        <Crown size={13} color="#F59E0B" /> ראש צוות:
                      </span>
                      <select
                        className="field field-sm"
                        value={team.lead_user_id || ''}
                        onChange={(e) => onUpdateTeamLead(team.id, Number(e.target.value))}
                      >
                        <option value="">בחר ראש צוות...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Members list */}
                  <div className="team-members-section">
                    <span className="members-section-title">חברי הצוות ({teamMembers.length}):</span>
                    <div className="team-members-pills-list">
                      {teamMembers.map((member) => {
                        const isLead = member.id === team.lead_user_id;
                        const isMemberActive = member.is_active !== false && member.isActive !== false;
                        return (
                          <div key={member.id} className={`team-member-pill ${!isMemberActive ? 'inactive-member' : ''}`}>
                            <Avatar name={member.name} size={22} isOnline={isMemberActive} />
                            <span className="member-name">
                              {member.name}
                              {!isMemberActive && <span className="member-left-tag"> (עזב)</span>}
                            </span>
                            {isLead && (
                              <span title="ראש צוות" style={{ display: 'inline-flex' }}>
                                <Crown size={12} color="#F59E0B" />
                              </span>
                            )}
                            <button
                              type="button"
                              className="btn-remove-member"
                              onClick={() => handleRemoveMemberFromTeam(team.id, member.id)}
                              title="הסר מהצוות"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add member dropdown */}
                  {availableUsers.length > 0 && (
                    <div className="add-member-row">
                      <select
                        className="field field-sm"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMemberToTeam(team.id, Number(e.target.value));
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="" disabled>
                          + צרף משתמש מערכת לצוות...
                        </option>
                        {availableUsers.map((u) => {
                          const otherTeam = teams.find((t) => t.id !== team.id && t.member_user_ids.includes(u.id));
                          return (
                            <option key={u.id} value={u.id}>
                              {u.name} {otherTeam ? `(מועבר מ-${otherTeam.name})` : `(${u.roleLabel})`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddUserOpen(false)} role="dialog">
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <header className="modal-header">
              <div className="modal-title-wrap">
                <span className="modal-icon-badge">
                  <UserPlus size={18} />
                </span>
                <div>
                  <h3>הוספת משתמש מערכת חדש</h3>
                  <p className="modal-subtitle">הגדרת פרטי משתמש ורמת הרשאה בארגון</p>
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={() => setIsAddUserOpen(false)}>
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">שם מלא (Display Name)</label>
                  <input
                    autoFocus
                    dir="auto"
                    className="field input-lg"
                    placeholder="לדוגמה: רון שחר"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">שם משתמש (Username באנגלית)</label>
                  <input
                    className="field"
                    placeholder="ron_s"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">
                    <Laptop size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                    שם משתמש במחשב (OS Username)
                  </label>
                  <input
                    dir="ltr"
                    className="field"
                    placeholder="למשל: adir7"
                    value={newComputerName}
                    onChange={(e) => setNewComputerName(e.target.value)}
                    required
                  />
                  <span className="field-hint">המערכת תזהה את המשתמש אוטומטית לפי שם משתמש במחשב זה בהתחברות</span>
                </div>

                <div className="form-group">
                  <label className="form-label required">רמת הרשאה (Role)</label>
                  <select
                    className="field"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                  >
                    <option value="USER">משתמש רגיל (User)</option>
                    <option value="TEAM_LEAD">ראש צוות (Team Lead)</option>
                    <option value="ADMIN">מנהל מערכת (Admin)</option>
                  </select>
                </div>
              </div>

              <footer className="modal-footer">
                <div />
                <div className="modal-actions">
                  <button type="button" className="btn ghost" onClick={() => setIsAddUserOpen(false)}>
                    ביטול
                  </button>
                  <button type="submit" className="btn primary" disabled={!newUsername.trim() || !newDisplayName.trim() || !newComputerName.trim()}>
                    הוסף משתמש
                  </button>
                </div>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal (Name, Computer, Role) */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)} role="dialog">
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <header className="modal-header">
              <div className="modal-title-wrap">
                <span className="modal-icon-badge">
                  <Pencil size={18} />
                </span>
                <div>
                  <h3>עריכת פרטי משתמש במערכת</h3>
                  <p className="modal-subtitle">עדכון שם מלא לתצוגה ושם משתמש במחשב</p>
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditingUser(null)}>
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSaveEditUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">שם מלא לתצוגה (Display Name)</label>
                  <input
                    autoFocus
                    dir="auto"
                    className="field input-lg"
                    placeholder="לדוגמה: אדיר כהן"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    required
                  />
                  <span className="field-hint">
                    שם זה מופיע בכל המשימות, הכרטיסיות, התגובות ופעילויות המערכת
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label required">
                    <Laptop size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                    שם משתמש במחשב לזיהוי (OS Username)
                  </label>
                  <input
                    dir="ltr"
                    className="field"
                    placeholder="למשל: adir7"
                    value={editComputerUsername}
                    onChange={(e) => setEditComputerUsername(e.target.value)}
                    required
                  />
                  <span className="field-hint">
                    המערכת מזהה את המשתמש בכניסה אוטומטית לפי שם משתמש במחשב זה
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label required">רמת הרשאה ותפקיד (Role)</label>
                  <select
                    className="field"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                  >
                    <option value="USER">משתמש רגיל (User)</option>
                    <option value="TEAM_LEAD">ראש צוות (Team Lead)</option>
                    <option value="ADMIN">מנהל מערכת (Admin)</option>
                  </select>
                </div>
              </div>

              <footer className="modal-footer">
                <div />
                <div className="modal-actions">
                  <button type="button" className="btn ghost" onClick={() => setEditingUser(null)}>
                    ביטול
                  </button>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={!editDisplayName.trim() || !editComputerUsername.trim()}
                  >
                    שמור שינויים
                  </button>
                </div>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

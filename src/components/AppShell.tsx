import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Archive,
  BarChart3,
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Layers,
  LayoutGrid,
  Laptop,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { he } from '../i18n/he';
import {
  users,
  ME,
  initialNotifications,
  type AppNotification,
  type Project,
  type Team,
  type User,
} from '../api/mock';
import type { Mode } from '../theme/useColorMode';
import { Avatar } from './ui';

const NEXT_MODE: Record<Mode, Mode> = { light: 'dark', dark: 'system', system: 'light' };
const MODE_ICON = { light: Sun, dark: Moon, system: Monitor };

interface AppShellProps {
  mode: Mode;
  setMode: (m: Mode) => void;
  teams: Team[];
  projects: Project[];
  activeNav: 'global' | 'team' | 'project' | 'admin';
  selectedTeamId: number | null;
  selectedProjectId: number | null;
  onSelectGlobal: () => void;
  onSelectAdmin: () => void;
  onSelectTeam: (teamId: number) => void;
  onSelectProject: (projectId: number) => void;
  onNewTaskClick: () => void;
  onNewTeamClick: () => void;
  onNewProjectClick: (teamId?: number) => void;
  onEditTeamClick: (team: Team) => void;
  onEditProjectClick: (project: Project) => void;
  filterMineOnly: boolean;
  onToggleMineOnly: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser?: User;
  onOpenProfile?: () => void;
  onSwitchUser?: () => void;
  children: ReactNode;
}

export function AppShell({
  mode,
  setMode,
  teams,
  projects,
  activeNav,
  selectedTeamId,
  selectedProjectId,
  onSelectGlobal,
  onSelectAdmin,
  onSelectTeam,
  onSelectProject,
  onNewTaskClick,
  onNewTeamClick,
  onNewProjectClick,
  onEditTeamClick,
  onEditProjectClick,
  filterMineOnly,
  onToggleMineOnly,
  searchQuery,
  onSearchChange,
  currentUser,
  onOpenProfile,
  onSwitchUser,
  children,
}: AppShellProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const notifRef = useRef<HTMLDivElement>(null);

  // Collapsed teams state (set of team IDs that are collapsed)
  const [collapsedTeamIds, setCollapsedTeamIds] = useState<Set<number>>(new Set());

  const toggleTeamCollapse = (teamId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  // Global search shortcut '/' or 'Ctrl+K'
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(el.tagName)) ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const ModeIcon = MODE_ICON[mode];
  const modeLabel = `${he.theme}: ${he.modes[mode]}`;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeUser = currentUser || users.find((u) => u.id === ME) || users[0];

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const currentTeam = teams.find((t) => t.id === selectedTeamId);

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div className="nav-brand-group">
          <div className="brand-logo-badge" onClick={onSelectGlobal} style={{ cursor: 'pointer' }} title="חזרה לתרשים הכללי">
            <Layers size={19} className="logo-icon" />
          </div>
          <div className="brand-names" onClick={onSelectGlobal} style={{ cursor: 'pointer' }}>
            <span className="brand-title">{he.app}</span>
            <span className="brand-badge">PRO</span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="search-bar-wrap">
          <Search size={15} className="search-icon" aria-hidden />
          <input
            ref={searchInputRef}
            dir="auto"
            className="global-search-input"
            placeholder={he.search}
            aria-label={he.search}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="נקה חיפוש"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="search-kbd-hint">/</kbd>
          )}
        </div>

        {/* Actions Group */}
        <div className="nav-actions-group">
          <button
            type="button"
            className="btn btn-create-task"
            onClick={onNewTaskClick}
            title="צור משימה חדשה"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{he.newItem}</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="notifications-wrap" ref={notifRef}>
            <button
              type="button"
              className={`icon-btn topbar-btn ${showNotifications ? 'active' : ''}`}
              aria-label={he.notifications}
              title={he.notifications}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {showNotifications && (
              <div className="notif-dropdown" role="dialog" aria-label={he.notificationsCenter.title}>
                <div className="notif-dropdown-header">
                  <div className="notif-title-row">
                    <h4>{he.notificationsCenter.title}</h4>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="mark-all-read-btn"
                        onClick={markAllNotificationsRead}
                      >
                        <CheckCheck size={14} />
                        <span>{he.notificationsCenter.markAllRead}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="notif-list">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.read ? 'unread' : ''}`}
                        onClick={() =>
                          setNotifications((prev) =>
                            prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
                          )
                        }
                      >
                        <span className={`notif-type-dot ${n.type}`} />
                        <div className="notif-content">
                          <p className="notif-title">{n.title}</p>
                          <p className="notif-subtitle">{n.subtitle}</p>
                          <span className="notif-time">{n.time}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="notif-empty">{he.notificationsCenter.empty}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme switcher */}
          <button
            type="button"
            className="icon-btn topbar-btn"
            aria-label={modeLabel}
            title={modeLabel}
            onClick={() => setMode(NEXT_MODE[mode])}
          >
            <ModeIcon size={18} />
          </button>

          {/* Current User Pill */}
          <div
            className={`topbar-user-pill ${(onOpenProfile || onSwitchUser) ? 'clickable' : ''}`}
            onClick={onOpenProfile || onSwitchUser}
            role={(onOpenProfile || onSwitchUser) ? 'button' : undefined}
            tabIndex={(onOpenProfile || onSwitchUser) ? 0 : undefined}
            title={`מחובר כ: ${activeUser.name} | שם משתמש במחשב: ${activeUser.computer_username || activeUser.computerUsername || activeUser.computer_name || 'מקומי'} (לחץ לצפייה בפרטי משתמש)`}
          >
            <Avatar name={activeUser.name} size={30} showStatus isOnline={activeUser.is_active !== false} />
            <div className="topbar-user-info">
              <span className="user-name">{activeUser.name}</span>
              <span className="user-computer-tag">
                <Laptop size={10} style={{ verticalAlign: 'middle', marginInlineEnd: 3 }} />
                {activeUser.computer_username || activeUser.computerUsername || activeUser.computer_name || 'משתמש מקומי'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="layout-body">
        {/* Modern Sidebar with Teams & Projects */}
        <aside className="app-sidebar" aria-label="תפריט צד ראשי">
          {/* Global Dashboard Navigation Item */}
          <div className="sidebar-section">
            <button
              type="button"
              className={`sidebar-nav-item global-nav-item ${activeNav === 'global' ? 'active' : ''}`}
              onClick={onSelectGlobal}
            >
              <TrendingUp size={17} className="nav-icon" />
              <span className="project-label" style={{ fontWeight: 600 }}>תרשים כללי (ארגוני)</span>
              <span className="brand-badge" style={{ fontSize: 10 }}>HQ</span>
            </button>

            {/* Admin View Navigation Item - ONLY VISIBLE TO SYSTEM ADMINS */}
            {activeUser.role === 'ADMIN' && (
              <button
                type="button"
                className={`sidebar-nav-item admin-nav-item ${activeNav === 'admin' ? 'active' : ''}`}
                onClick={onSelectAdmin}
                style={{ marginTop: 4 }}
              >
                <Shield size={17} className="nav-icon text-warning" />
                <span className="project-label" style={{ fontWeight: 600 }}>ניהול מערכת והרשאות</span>
                <span className="admin-badge" style={{ fontSize: 10 }}>ADMIN</span>
              </button>
            )}
          </div>

          <div className="sidebar-divider" />

          {/* Teams & Projects Section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-title">צוותים ופרויקטים</span>
              <button
                type="button"
                className="btn-sidebar-add"
                onClick={onNewTeamClick}
                title="פתיחת צוות חדש"
              >
                <Plus size={14} />
                <span>צוות חדש</span>
              </button>
            </div>

            <div className="sidebar-teams-tree">
              {teams.map((t) => {
                const isTeamActive = activeNav === 'team' && selectedTeamId === t.id;
                const teamProjects = projects.filter((p) => (p.team_id || p.teamId) === t.id);
                const isCollapsed = collapsedTeamIds.has(t.id);

                return (
                  <div key={t.id} className="team-tree-node">
                    {/* Team Item Header */}
                    <div className={`team-node-header ${isTeamActive ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="team-collapse-toggle-btn"
                        onClick={(e) => toggleTeamCollapse(t.id, e)}
                        title={isCollapsed ? 'פתח צוות' : 'סגור צוות'}
                        aria-label={isCollapsed ? 'פתח צוות' : 'סגור צוות'}
                      >
                        {isCollapsed ? <ChevronLeft size={14} /> : <ChevronDown size={14} />}
                      </button>

                      <button
                        type="button"
                        className="team-node-label-btn"
                        onClick={() => onSelectTeam(t.id)}
                        title={`מעבר לתרשים צוות: ${t.name}`}
                      >
                        <span className="team-accent-dot" style={{ backgroundColor: t.color }} />
                        <span className="team-node-title">{t.name}</span>
                        {isCollapsed && teamProjects.length > 0 && (
                          <span className="team-collapsed-count-pill">{teamProjects.length}</span>
                        )}
                      </button>

                      <div className="team-node-actions">
                        <button
                          type="button"
                          className="team-action-icon-btn"
                          onClick={() => onNewProjectClick(t.id)}
                          title={`הוסף פרויקט ל${t.name}`}
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          type="button"
                          className="team-action-icon-btn"
                          onClick={() => onEditTeamClick(t)}
                          title="ערוך צוות"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Team Projects List (Collapsible) */}
                    {!isCollapsed && (
                      <div className="team-node-projects">
                        {teamProjects.map((p) => {
                          const isProjActive = activeNav === 'project' && selectedProjectId === p.id;
                          return (
                            <div key={p.id} className={`project-nav-row ${isProjActive ? 'active' : ''}`}>
                              <button
                                type="button"
                                className="project-row-btn"
                                onClick={() => onSelectProject(p.id)}
                                title={`${p.name} (${p.description})`}
                              >
                                <span className="project-color-badge" style={{ backgroundColor: p.color }} />
                                <span className="project-label">{p.name}</span>
                                <span className="project-key-tag">{p.key}</span>
                              </button>
                              <button
                                type="button"
                                className="project-edit-hover-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditProjectClick(p);
                                }}
                                title="ערוך פרויקט"
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                          );
                        })}

                        {teamProjects.length === 0 && (
                          <div className="team-no-projects-hint">
                            <span>אין פרויקטים</span>
                            <button
                              type="button"
                              className="btn-add-first-proj"
                              onClick={() => onNewProjectClick(t.id)}
                            >
                              + הוסף
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sidebar-divider" />

          {/* Quick Filters */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">סינון אישי</span>
            <button
              type="button"
              className={`sidebar-nav-item ${filterMineOnly ? 'active' : ''}`}
              onClick={onToggleMineOnly}
            >
              <UserIcon size={16} className="nav-icon" />
              <span className="project-label">{he.nav.mine}</span>
              {filterMineOnly && <span className="active-tag">פעיל</span>}
            </button>
          </div>

          {/* Sidebar bottom card */}
          <div className="sidebar-footer-card">
            {activeNav === 'admin' ? (
              <div className="footer-project-status">
                <span className="status-ping" style={{ backgroundColor: '#EF4444' }} />
                <div className="footer-project-info">
                  <span className="footer-project-title">פאנל ניהול והרשאות</span>
                  <span className="footer-project-desc">{users.length} משתמשי מערכת | 3 רמות הרשאה</span>
                </div>
              </div>
            ) : activeNav === 'project' && currentProject ? (
              <div className="footer-project-status">
                <span className="status-ping" style={{ backgroundColor: currentProject.color }} />
                <div className="footer-project-info">
                  <span className="footer-project-title">{currentProject.name}</span>
                  <span className="footer-project-desc">{currentProject.description}</span>
                </div>
              </div>
            ) : activeNav === 'team' && currentTeam ? (
              <div className="footer-project-status">
                <span className="status-ping" style={{ backgroundColor: currentTeam.color }} />
                <div className="footer-project-info">
                  <span className="footer-project-title">{currentTeam.name}</span>
                  <span className="footer-project-desc">צפייה בתרשים צוות הכולל פרויקטים</span>
                </div>
              </div>
            ) : (
              <div className="footer-project-status">
                <span className="status-ping" style={{ backgroundColor: 'var(--primary)' }} />
                <div className="footer-project-info">
                  <span className="footer-project-title">תרשים ארגוני כללי</span>
                  <span className="footer-project-desc">{teams.length} צוותים | {projects.length} פרויקטים</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <main className="main-content-viewport">{children}</main>
      </div>
    </div>
  );
}

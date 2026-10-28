import { useState, useEffect } from 'react';
import { DirectionProvider, MantineProvider } from '@mantine/core';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  FolderKanban,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Sparkles,
  Paperclip,
} from 'lucide-react';
import { he } from './i18n/he';
import {
  initialTeams,
  initialProjects,
  initialColumns,
  initialTasks,
  users as initialUsers,
  tags,
  initialVersions,
  type Team,
  type Project,
  type Column as ColumnType,
  type Task,
  type User,
  type UserRole,
  type ProjectVersion,
  type Subtask,
  type FileAttachment,
} from './api/mock';
import { useColorMode } from './theme/useColorMode';
import { AppShell } from './components/AppShell';
import { Board } from './features/board/Board';
import { GlobalDashboardView } from './features/charts/GlobalDashboardView';
import { TeamChart } from './features/charts/TeamChart';
import { AdminView } from './features/admin/AdminView';
import { TeamModal } from './components/TeamModal';
import { ProjectModal } from './components/EditProjectModal';
import { NewTaskModal, type NewTaskPayload } from './components/NewTaskModal';
import { VersionManagementModal } from './components/VersionManagementModal';
import { LoginModal } from './components/LoginModal';
import { UserProfileModal } from './components/UserProfileModal';
import { detectLocalComputerUsername, detectLocalComputerName } from './utils/device';
import {
  STORAGE_KEYS,
  loadFromLocalStorage,
  saveToLocalStorage,
  enforceAdminPrivileges,
  isConfiguredAdmin,
  resetApplicationData,
  markDiskHydrated,
} from './api/storage';
import { Milestone } from 'lucide-react';

type NavMode = 'global' | 'team' | 'project' | 'admin';
type ProjectViewMode = 'board' | 'list' | 'analytics' | 'gantt';

export default function App() {
  const { mode, resolved, setMode } = useColorMode();

  // Primary Entities State (Hydrated from persistent localStorage / disk)
  const [users, setUsers] = useState<User[]>(() => {
    const loaded = loadFromLocalStorage<User[]>(STORAGE_KEYS.USERS, initialUsers);
    return enforceAdminPrivileges(loaded);
  });

  const [teams, setTeams] = useState<Team[]>(() =>
    loadFromLocalStorage<Team[]>(STORAGE_KEYS.TEAMS, initialTeams)
  );

  const [projects, setProjects] = useState<Project[]>(() =>
    loadFromLocalStorage<Project[]>(STORAGE_KEYS.PROJECTS, initialProjects)
  );

  const [columns, setColumns] = useState<ColumnType[]>(() =>
    loadFromLocalStorage<ColumnType[]>(STORAGE_KEYS.COLUMNS, initialColumns)
  );

  const [tasks, setTasks] = useState<Task[]>(() =>
    loadFromLocalStorage<Task[]>(STORAGE_KEYS.TASKS, initialTasks)
  );

  const [versions, setVersions] = useState<ProjectVersion[]>(() =>
    loadFromLocalStorage<ProjectVersion[]>(STORAGE_KEYS.VERSIONS, initialVersions)
  );

  // Persistent Auto-Save Effects
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.USERS, users);
  }, [users]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.TEAMS, teams);
  }, [teams]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.PROJECTS, projects);
  }, [projects]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.COLUMNS, columns);
  }, [columns]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.TASKS, tasks);
  }, [tasks]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.VERSIONS, versions);
  }, [versions]);

  // Initial Disk Storage Sync (Checks SQLite storage on server)
  useEffect(() => {
    fetch('/api/storage')
      .then((res) => (res.ok ? res.json() : null))
      .then((diskData) => {
        if (!diskData) {
          markDiskHydrated();
          return;
        }
        if (Array.isArray(diskData.users)) {
          const enforced = enforceAdminPrivileges(diskData.users);
          setUsers(enforced);
        }
        if (Array.isArray(diskData.tasks)) {
          setTasks(diskData.tasks);
        }
        if (Array.isArray(diskData.projects)) {
          setProjects(diskData.projects);
        }
        if (Array.isArray(diskData.teams)) {
          setTeams(diskData.teams);
        }
        if (Array.isArray(diskData.columns)) {
          setColumns(diskData.columns);
        }
        if (Array.isArray(diskData.versions)) {
          setVersions(diskData.versions);
        }
        markDiskHydrated();
      })
      .catch(() => {
        markDiskHydrated();
      });
  }, []);

  // Navigation State with persistence
  const [activeNav, setActiveNav] = useState<NavMode>(() =>
    loadFromLocalStorage<NavMode>(STORAGE_KEYS.ACTIVE_NAV, 'project')
  );
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(() =>
    loadFromLocalStorage<number | null>(STORAGE_KEYS.SELECTED_TEAM_ID, 1)
  );
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() =>
    loadFromLocalStorage<number | null>(STORAGE_KEYS.SELECTED_PROJECT_ID, 1)
  );
  const [activeProjectView, setActiveProjectView] = useState<ProjectViewMode>(() =>
    loadFromLocalStorage<ProjectViewMode>(STORAGE_KEYS.ACTIVE_PROJECT_VIEW, 'board')
  );

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.ACTIVE_NAV, activeNav);
  }, [activeNav]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.SELECTED_TEAM_ID, selectedTeamId);
  }, [selectedTeamId]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.SELECTED_PROJECT_ID, selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.ACTIVE_PROJECT_VIEW, activeProjectView);
  }, [activeProjectView]);

  // Ensure selected team and project exist in current state
  useEffect(() => {
    if (projects.length > 0 && !projects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (teams.length > 0 && !teams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Filters State
  const [filterMineOnly, setFilterMineOnly] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // User Session & Computer Username Identification State
  const [currentUserId, setCurrentUserId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (saved) {
        const id = Number(saved);
        if (!isNaN(id) && id > 0) return id;
      }
      const osUser = detectLocalComputerUsername().trim().toLowerCase();
      const currentLoadedUsers = loadFromLocalStorage<User[]>(STORAGE_KEYS.USERS, initialUsers);
      const matched = currentLoadedUsers.find((u) => {
        const comp = (u.computer_username || u.computerUsername || u.computer_name || u.username || '')
          .trim()
          .toLowerCase();
        return comp === osUser;
      });
      if (matched) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, String(matched.id));
        return matched.id;
      }
    } catch (e) {}
    return initialUsers[0]?.id || 7;
  });

  // Ensure current user is valid and points to active admin/user
  useEffect(() => {
    if (users.length > 0 && !users.some((u) => u.id === currentUserId)) {
      const adminUser = users.find((u) => isConfiguredAdmin(u.computer_username || u.username)) || users[0];
      if (adminUser) {
        setCurrentUserId(adminUser.id);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, String(adminUser.id));
      }
    }
  }, [users, currentUserId]);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (saved) return false;
      const osUser = detectLocalComputerUsername().trim().toLowerCase();
      const currentLoadedUsers = loadFromLocalStorage<User[]>(STORAGE_KEYS.USERS, initialUsers);
      const matched = currentLoadedUsers.find((u) => {
        const comp = (u.computer_username || u.computerUsername || u.computer_name || u.username || '')
          .trim()
          .toLowerCase();
        return comp === osUser;
      });
      if (matched) return false;
    } catch (e) {}
    return true; // First-time connection if computer username is unrecognized
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Modals State
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [defaultTeamIdForProject, setDefaultTeamIdForProject] = useState<number>(1);

  // Current entity lookups
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  // Protect Admin route: strictly redirect non-admin users away from admin panel
  useEffect(() => {
    if (activeNav === 'admin' && currentUser?.role !== 'ADMIN') {
      setActiveNav('project');
    }
  }, [activeNav, currentUser?.role]);

  // -------------------------------------------------------------
  // Navigation Actions
  // -------------------------------------------------------------
  const handleSelectGlobal = () => {
    setActiveNav('global');
  };

  const handleSelectAdmin = () => {
    if (currentUser?.role === 'ADMIN') {
      setActiveNav('admin');
    }
  };

  const handleSelectTeam = (teamId: number) => {
    setSelectedTeamId(teamId);
    setActiveNav('team');
  };

  const handleSelectProject = (projectId: number) => {
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      setSelectedProjectId(projectId);
      setSelectedTeamId(proj.team_id || proj.teamId);
      setActiveNav('project');
    }
  };

  // -------------------------------------------------------------
  // Admin & User Management Actions
  // -------------------------------------------------------------
  const handleSelectUser = (user: User) => {
    setCurrentUserId(user.id);
    const osUser = user.computer_username || user.computerUsername || user.computer_name || user.username || '';
    try {
      localStorage.setItem('jira_current_user_id', String(user.id));
      localStorage.setItem('jira_local_computer_username', osUser);
    } catch (e) {}
    setIsLoginModalOpen(false);
  };

  const handleRegisterUser = (regData: {
    computer_username?: string;
    computer_name?: string;
    display_name: string;
  }) => {
    const nextId = Math.max(0, ...users.map((u) => u.id)) + 1;
    const cleanComp = (regData.computer_username || regData.computer_name || `user_${nextId}`).trim();
    const cleanName = regData.display_name.trim();
    const generatedUsername = cleanName.toLowerCase().replace(/\s+/g, '_') || `user_${nextId}`;

    const isEnvAdmin =
      isConfiguredAdmin(cleanComp) ||
      isConfiguredAdmin(cleanName) ||
      isConfiguredAdmin(generatedUsername);

    const userRole: UserRole = isEnvAdmin ? 'ADMIN' : 'USER';
    const roleLabels: Record<UserRole, string> = {
      ADMIN: 'מנהל מערכת',
      TEAM_LEAD: 'ראש צוות',
      USER: 'משתמש',
    };

    const newUser: User = {
      id: nextId,
      username: generatedUsername,
      display_name: cleanName,
      name: cleanName,
      computer_username: cleanComp,
      computerUsername: cleanComp,
      computer_name: cleanComp,
      computerName: cleanComp,
      role: userRole,
      roleLabel: roleLabels[userRole],
      created_at: new Date().toISOString().slice(0, 10),
      version: 1,
      is_active: true,
      isActive: true,
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUserId(nextId);
    try {
      localStorage.setItem('jira_current_user_id', String(nextId));
      localStorage.setItem('jira_local_computer_username', cleanComp);
    } catch (e) {}
    setIsLoginModalOpen(false);
  };

  const handleUpdateUserDetails = (
    userId: number,
    data: {
      name: string;
      display_name: string;
      computer_username?: string;
      computer_name?: string;
      role?: UserRole;
    }
  ) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const roleLabels: Record<UserRole, string> = {
            ADMIN: 'מנהל מערכת',
            TEAM_LEAD: 'ראש צוות',
            USER: 'משתמש',
          };
          const updatedRole = data.role || u.role;
          const updatedComp = data.computer_username || data.computer_name || u.computer_username || u.computerUsername || u.computer_name || u.username;
          return {
            ...u,
            name: data.name || data.display_name || u.name,
            display_name: data.display_name || data.name || u.display_name,
            computer_username: updatedComp,
            computerUsername: updatedComp,
            computer_name: updatedComp,
            computerName: updatedComp,
            role: updatedRole,
            roleLabel: roleLabels[updatedRole] || u.roleLabel,
            version: (u.version || 1) + 1,
          };
        }
        return u;
      })
    );
  };

  const handleUpdateUserRole = (userId: number, role: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const roleLabels: Record<UserRole, string> = {
            ADMIN: 'מנהל מערכת',
            TEAM_LEAD: 'ראש צוות',
            USER: 'משתמש',
          };
          return { ...u, role, roleLabel: roleLabels[role], version: (u.version || 1) + 1 };
        }
        return u;
      })
    );
  };

  const handleAddUser = (userData: {
    username: string;
    display_name: string;
    computer_username?: string;
    computer_name?: string;
    email?: string;
    role: UserRole;
  }) => {
    const nextId = Math.max(0, ...users.map((u) => u.id)) + 1;
    const roleLabels: Record<UserRole, string> = {
      ADMIN: 'מנהל מערכת',
      TEAM_LEAD: 'ראש צוות',
      USER: 'משתמש',
    };
    const compName = (userData.computer_username || userData.computer_name || userData.username).trim();
    const newUser: User = {
      id: nextId,
      username: userData.username,
      display_name: userData.display_name,
      name: userData.display_name,
      computer_username: compName,
      computerUsername: compName,
      computer_name: compName,
      computerName: compName,
      email: userData.email,
      role: userData.role,
      roleLabel: roleLabels[userData.role],
      created_at: new Date().toISOString().slice(0, 10),
      version: 1,
      is_active: true,
      isActive: true,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const handleUpdateTeamMembers = (teamId: number, memberIds: number[]) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, member_user_ids: memberIds } : t))
    );
  };

  const handleTransferUserTeam = (userId: number, newTeamId: number | null) => {
    setTeams((prev) =>
      prev.map((t) => {
        const withoutUser = t.member_user_ids.filter((id) => id !== userId);
        const isOldTeam = t.member_user_ids.includes(userId) && t.id !== newTeamId;
        const nextLead = isOldTeam && t.lead_user_id === userId ? undefined : t.lead_user_id;

        if (newTeamId !== null && t.id === newTeamId) {
          return {
            ...t,
            member_user_ids: withoutUser.includes(userId) ? withoutUser : [...withoutUser, userId],
          };
        }
        return {
          ...t,
          lead_user_id: nextLead,
          member_user_ids: withoutUser,
        };
      })
    );
    // Crucial requirement: We deliberately DO NOT modify tasks!
    // All existing tasks of this user remain safely in their original projects and teams.
    // The user can now be assigned new tasks in the new team.
  };

  const handleUpdateTeamLead = (teamId: number, leadUserId: number) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, lead_user_id: leadUserId } : t))
    );
  };

  const handleToggleUserActive = (userId: number) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = u.is_active === false ? true : false;
          return { ...u, is_active: newStatus, isActive: newStatus, version: (u.version || 1) + 1 };
        }
        return u;
      })
    );
  };

  const handleResetData = () => {
    resetApplicationData();
    setUsers(initialUsers);
    setTasks(initialTasks);
    setProjects(initialProjects);
    setTeams(initialTeams);
    setColumns(initialColumns);
    setVersions(initialVersions);
    window.location.reload();
  };

  // -------------------------------------------------------------
  // Teams CRUD
  // -------------------------------------------------------------
  const handleOpenNewTeamModal = () => {
    setTeamToEdit(null);
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeamModal = (team: Team) => {
    setTeamToEdit(team);
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = (teamData: { name: string; description: string; color: string }) => {
    if (teamToEdit) {
      setTeams((prev) =>
        prev.map((t) => (t.id === teamToEdit.id ? { ...t, ...teamData } : t))
      );
    } else {
      const nextId = Math.max(0, ...teams.map((t) => t.id)) + 1;
      const newTeam: Team = {
        id: nextId,
        member_user_ids: [1],
        lead_user_id: 1,
        ...teamData,
        created_at: new Date().toISOString().slice(0, 10),
      };
      setTeams((prev) => [...prev, newTeam]);
      setSelectedTeamId(nextId);
      setActiveNav('team');
    }
  };

  const handleDeleteTeam = (teamId: number) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    if (selectedTeamId === teamId) {
      const remaining = teams.filter((t) => t.id !== teamId);
      if (remaining.length > 0) {
        setSelectedTeamId(remaining[0].id);
      } else {
        setActiveNav('global');
      }
    }
  };

  // -------------------------------------------------------------
  // Projects CRUD
  // -------------------------------------------------------------
  const handleOpenNewProjectModal = (teamId?: number) => {
    setProjectToEdit(null);
    setDefaultTeamIdForProject(teamId || selectedTeamId || teams[0]?.id || 1);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProjectModal = (proj: Project) => {
    setProjectToEdit(proj);
    setDefaultTeamIdForProject(proj.team_id || proj.teamId);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (projectData: {
    name: string;
    key: string;
    description: string;
    color: string;
    teamId: number;
    attachments?: FileAttachment[];
  }) => {
    if (projectToEdit) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectToEdit.id
            ? {
                ...p,
                ...projectData,
                attachments: projectData.attachments || p.attachments || [],
                team_id: projectData.teamId,
                teamId: projectData.teamId,
                updated_at: new Date().toISOString().slice(0, 10),
              }
            : p
        )
      );
    } else {
      const nextId = Math.max(0, ...projects.map((p) => p.id)) + 1;
      const today = new Date().toISOString().slice(0, 10);
      const newProj: Project = {
        id: nextId,
        team_id: projectData.teamId,
        teamId: projectData.teamId,
        name: projectData.name,
        key: projectData.key,
        description: projectData.description,
        color: projectData.color,
        attachments: projectData.attachments || [],
        created_by: 1,
        created_at: today,
        updated_at: today,
        is_archived: 0,
        sort_order: projects.length + 1,
        version: 1,
      };
      setProjects((prev) => [...prev, newProj]);

      // Default columns for the new project (6 canonical stages)
      const defaultCols: ColumnType[] = [
        { id: nextId * 100 + 1, project_id: nextId, projectId: nextId, name: 'לביצוע', color: '#64748B', sort_order: 1, version: 1 },
        { id: nextId * 100 + 2, project_id: nextId, projectId: nextId, name: 'בדיקות קוואס', color: '#3B82F6', sort_order: 2, version: 1 },
        { id: nextId * 100 + 3, project_id: nextId, projectId: nextId, name: 'בדיקות שילובים', color: '#8B5CF6', sort_order: 3, version: 1 },
        { id: nextId * 100 + 4, project_id: nextId, projectId: nextId, name: 'הושלם', color: '#10B981', sort_order: 4, version: 1 },
        { id: nextId * 100 + 5, project_id: nextId, projectId: nextId, name: 'תקלה', color: '#EF4444', sort_order: 5, version: 1 },
        { id: nextId * 100 + 6, project_id: nextId, projectId: nextId, name: 'בוטל', color: '#94A3B8', sort_order: 6, version: 1 },
      ];
      setColumns((prev) => [...prev, ...defaultCols]);

      setSelectedProjectId(nextId);
      setSelectedTeamId(projectData.teamId);
      setActiveNav('project');
    }
  };

  const handleDeleteProject = (projectId: number) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setColumns((prev) => prev.filter((c) => (c.project_id || c.projectId) !== projectId));
    setTasks((prev) => prev.filter((t) => (t.project_id || t.projectId) !== projectId));

    if (selectedProjectId === projectId) {
      const remaining = projects.filter((p) => p.id !== projectId);
      if (remaining.length > 0) {
        setSelectedProjectId(remaining[0].id);
      } else {
        setActiveNav('global');
      }
    }
  };

  // -------------------------------------------------------------
  // Columns CRUD (Dynamic per project)
  // -------------------------------------------------------------
  const handleAddColumn = (name: string, color?: string) => {
    if (!currentProject) return;
    const nextId = Math.max(0, ...columns.map((c) => c.id)) + 1;
    const colors = ['#6366F1', '#EC4899', '#06B6D4', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
    const colColor = color || colors[columns.length % colors.length];

    const newCol: ColumnType = {
      id: nextId,
      project_id: currentProject.id,
      projectId: currentProject.id,
      name,
      color: colColor,
      sort_order: columns.filter((c) => (c.project_id || c.projectId) === currentProject.id).length + 1,
      version: 1,
    };
    setColumns((prev) => [...prev, newCol]);
  };

  const handleEditColumn = (columnId: number, name: string, color: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, name, color, version: c.version + 1 } : c))
    );
  };

  const handleDeleteColumn = (columnId: number) => {
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
  };

  // -------------------------------------------------------------
  // Tasks CRUD
  // -------------------------------------------------------------
  const handleUpdateTask = (id: number, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        // Strip manual edits to creation date and actual completion date (these are strictly automatic)
        const {
          created_at: _cAt,
          createdAt: _cAt2,
          completed_at: _compAt,
          completedAt: _compAt2,
          ...cleanPatch
        } = patch as any;

        let completedPatch: Partial<Task> = {};
        const targetColId = patch.column_id !== undefined ? patch.column_id : patch.columnId;
        const currentColId = t.column_id || t.columnId || 1;

        const targetCol = targetColId !== undefined ? columns.find((c) => c.id === targetColId) : undefined;
        const isTargetDoneCol =
          targetCol?.name.includes('הושלם') ||
          targetCol?.name.toLowerCase().includes('done') ||
          (targetColId !== undefined && (targetColId % 100 === 4 || targetColId === 4));

        if (targetColId !== undefined) {
          if (isTargetDoneCol && !t.completed_at) {
            const todayStr = new Date().toISOString().slice(0, 10);
            completedPatch = { completed_at: todayStr, completedAt: todayStr };
          } else if (!isTargetDoneCol && targetColId !== currentColId) {
            // When leaving "הושלם", clear actual completion date automatically
            completedPatch = { completed_at: null, completedAt: null };
          }
        }

        // Subtask environment transition logic:
        let subtasksPatch: Partial<Task> = {};
        if (targetColId !== undefined && targetColId !== currentColId && !patch.subtasks && t.subtasks && t.subtasks.length > 0) {
          // Task moving across columns/environments:
          // 1. Save state of current column before leaving
          // 2. If moving to "הושלם" (Completed): DO NOT reset! Retain verification state from previous column.
          // 3. If moving between testing environments: restore past recorded state if exists, otherwise reset for fresh testing.
          const updatedSubtasks: Subtask[] = t.subtasks.map((s) => {
            const colMap: Record<number, boolean> = { ...(s.doneByColumn || {}) };
            colMap[currentColId] = s.done;

            const hasTargetState = Object.prototype.hasOwnProperty.call(colMap, targetColId);
            let targetDone: boolean;

            if (isTargetDoneCol) {
              // When task reaches Completed ("הושלם"): NO NEED TO RESET!
              targetDone = hasTargetState ? !!colMap[targetColId] : s.done;
            } else {
              targetDone = hasTargetState ? !!colMap[targetColId] : false;
            }

            colMap[targetColId] = targetDone;

            return {
              ...s,
              done: targetDone,
              doneByColumn: colMap,
            };
          });

          const fromCol = columns.find((c) => c.id === currentColId)?.name || `עמודה ${currentColId}`;
          const toCol = targetCol?.name || `עמודה ${targetColId}`;
          const nowIso = new Date().toISOString();
          const transitionMsg = isTargetDoneCol
            ? `הועברה ל-"${toCol}" (משימה הושלמה, תת-המשימות נשמרו ללא איפוס)`
            : `הועברה מ-"${fromCol}" ל-"${toCol}" (צ'קליסט תת-המשימות עודכן לסביבה זו)`;
          const histItem = {
            id: Date.now(),
            text: transitionMsg,
            created_at: nowIso,
          };

          subtasksPatch = {
            subtasks: updatedSubtasks,
            history: [...(t.history || []), histItem as any],
          };
        } else if (patch.subtasks) {
          // Direct subtasks edit/toggle: keep active column's doneByColumn in sync!
          const activeColId = targetColId !== undefined ? targetColId : currentColId;
          const syncedSubtasks: Subtask[] = patch.subtasks.map((s) => {
            const colMap: Record<number, boolean> = { ...(s.doneByColumn || {}) };
            colMap[activeColId] = s.done;
            return {
              ...s,
              doneByColumn: colMap,
            };
          });
          subtasksPatch = { subtasks: syncedSubtasks };
        }

        return { ...t, ...cleanPatch, ...completedPatch, ...subtasksPatch, version: t.version + 1 };
      })
    );
  };

  const handleDeleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // -------------------------------------------------------------
  // Version Management Actions
  // -------------------------------------------------------------
  const handleSaveVersion = (versionData: {
    id?: number;
    name: string;
    release_date?: string | null;
    description?: string;
    status?: 'planned' | 'in_progress' | 'released' | 'archived';
  }) => {
    if (versionData.id) {
      setVersions((prev) =>
        prev.map((v) =>
          v.id === versionData.id
            ? { ...v, ...versionData, releaseDate: versionData.release_date }
            : v
        )
      );
    } else {
      const nextId = Math.max(0, ...versions.map((v) => v.id)) + 1;
      const newVer: ProjectVersion = {
        id: nextId,
        name: versionData.name,
        release_date: versionData.release_date || null,
        releaseDate: versionData.release_date || null,
        description: versionData.description || '',
        status: versionData.status || 'in_progress',
        created_at: new Date().toISOString().slice(0, 10),
      };
      setVersions((prev) => [...prev, newVer]);
    }
  };

  const handleQuickCreateVersion = (name: string, releaseDate?: string): ProjectVersion => {
    const existing = versions.find((v) => v.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const nextId = Math.max(0, ...versions.map((v) => v.id)) + 1;
    const newVer: ProjectVersion = {
      id: nextId,
      name,
      release_date: releaseDate || null,
      releaseDate: releaseDate || null,
      description: '',
      status: 'in_progress',
      created_at: new Date().toISOString().slice(0, 10),
    };
    setVersions((prev) => [...prev, newVer]);
    return newVer;
  };

  const handleDeleteVersion = (versionId: number) => {
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
  };

  const handleAddTask = (columnId: number, title: string, extra?: Partial<Task>) => {
    if (!currentProject) return;
    const nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    const today = new Date().toISOString().slice(0, 10);

    const newTask: Task = {
      id: nextId,
      project_id: currentProject.id,
      projectId: currentProject.id,
      team_id: currentProject.team_id || currentProject.teamId,
      teamId: currentProject.team_id || currentProject.teamId,
      column_id: columnId,
      columnId,
      title,
      description: extra?.description || '',
      priority: extra?.priority || 'MEDIUM',
      assignee_id: extra?.assignee_id !== undefined ? extra.assignee_id : (extra?.assigneeId !== undefined ? extra.assigneeId : 1),
      assigneeId: extra?.assigneeId !== undefined ? extra.assigneeId : 1,
      start_date: extra?.start_date || extra?.startDate || today,
      startDate: extra?.startDate || extra?.start_date || today,
      due_date: extra?.due_date || extra?.dueDate || null,
      dueDate: extra?.dueDate || extra?.due_date || null,
      jira_key: extra?.jira_key || extra?.jiraKey || `${currentProject.key}-${nextId}`,
      jiraKey: extra?.jiraKey || extra?.jira_key || `${currentProject.key}-${nextId}`,
      target_version: extra?.target_version || extra?.targetVersion || 'v2.1.0',
      targetVersion: extra?.targetVersion || extra?.target_version || 'v2.1.0',
      created_by: 1,
      sort_order: tasks.length + 1,
      is_archived: 0,
      version: 1,
      created_at: today,
      updated_at: today,
      tag_ids: extra?.tag_ids || extra?.tagIds || [],
      tagIds: extra?.tagIds || extra?.tag_ids || [],
      subtasks: [],
      comments: [],
      history: [`נוצרה בעמודה`],
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const handleModalCreateTask = (data: NewTaskPayload) => {
    const nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    const today = new Date().toISOString().slice(0, 10);
    const targetProjId = data.projectId || data.project_id || currentProject?.id || projects[0]?.id || 1;
    const targetProj = projects.find((p) => p.id === targetProjId) || currentProject || projects[0];

    const newTask: Task = {
      id: nextId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      created_by: 1,
      sort_order: tasks.length + 1,
      is_archived: 0,
      version: 1,
      created_at: today,
      updated_at: today,
      subtasks: data.subtasks || [],
      tag_ids: data.tagIds || data.tag_ids || [],
      tagIds: data.tagIds || data.tag_ids || [],
      column_id: data.columnId || data.column_id || 1,
      columnId: data.columnId || data.column_id || 1,
      project_id: targetProjId,
      projectId: targetProjId,
      team_id: data.teamId || data.team_id || (targetProj?.team_id || targetProj?.teamId || 1),
      teamId: data.teamId || data.team_id || (targetProj?.team_id || targetProj?.teamId || 1),
      assignee_id: data.assigneeId || data.assignee_id || null,
      assigneeId: data.assigneeId || data.assignee_id || null,
      minion_ids: data.minionIds || data.minion_ids || [],
      minionIds: data.minionIds || data.minion_ids || [],
      start_date: data.startDate || data.start_date || today,
      startDate: data.startDate || data.start_date || today,
      due_date: data.dueDate || data.due_date || null,
      dueDate: data.dueDate || data.due_date || null,
      jira_key: data.jiraKey || data.jira_key || `${targetProj?.key || 'TASK'}-${nextId}`,
      jiraKey: data.jiraKey || data.jira_key || `${targetProj?.key || 'TASK'}-${nextId}`,
      target_version: data.targetVersion || data.target_version || 'v2.1.0',
      targetVersion: data.targetVersion || data.target_version || 'v2.1.0',
      comments: [],
      history: ['נוצרה משימה חדשה'],
    };
    setTasks((prev) => [...prev, newTask]);
    setIsNewTaskModalOpen(false);
  };

  const VIEW_TABS: { id: ProjectViewMode; label: string; icon: any }[] = [
    { id: 'board', label: he.views.board, icon: LayoutGrid },
    { id: 'list', label: he.views.list, icon: List },
    { id: 'gantt', label: 'תרשים גאנט', icon: Calendar },
    { id: 'analytics', label: 'תרשים פרויקט', icon: BarChart3 },
  ];

  return (
    <DirectionProvider initialDirection="rtl">
      <MantineProvider
        forceColorScheme={resolved}
        theme={{
          fontFamily: 'var(--font)',
          defaultRadius: 'md',
        }}
      >
        <AppShell
          mode={mode}
          setMode={setMode}
          currentUser={currentUser}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          teams={teams}
          projects={projects}
          activeNav={activeNav}
          selectedTeamId={selectedTeamId}
          selectedProjectId={selectedProjectId}
          onSelectGlobal={handleSelectGlobal}
          onSelectAdmin={handleSelectAdmin}
          onSelectTeam={handleSelectTeam}
          onSelectProject={handleSelectProject}
          onNewTaskClick={() => setIsNewTaskModalOpen(true)}
          onNewTeamClick={handleOpenNewTeamModal}
          onNewProjectClick={handleOpenNewProjectModal}
          onEditTeamClick={handleOpenEditTeamModal}
          onEditProjectClick={handleOpenEditProjectModal}
          filterMineOnly={filterMineOnly}
          onToggleMineOnly={() => setFilterMineOnly((prev) => !prev)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
        >
          {/* Main Area View Routing */}

          {/* 1. GLOBAL MULTI-VIEW (Chart, Board, List, Gantt) */}
          {activeNav === 'global' && (
            <GlobalDashboardView
              teams={teams}
              projects={projects}
              tasks={tasks}
              columns={columns}
              users={users}
              versions={versions}
              currentUserId={currentUserId}
              onCreateVersion={handleQuickCreateVersion}
              onOpenVersionManager={() => setIsVersionModalOpen(true)}
              onSelectTeam={handleSelectTeam}
              onSelectProject={handleSelectProject}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAddTask={handleAddTask}
            />
          )}

          {/* 2. ADMIN VIEW (Permissions & System Roles) - strictly limited to ADMIN users */}
          {activeNav === 'admin' && currentUser?.role === 'ADMIN' && (
            <AdminView
              users={users}
              teams={teams}
              onUpdateUserRole={handleUpdateUserRole}
              onAddUser={handleAddUser}
              onUpdateTeamMembers={handleUpdateTeamMembers}
              onUpdateTeamLead={handleUpdateTeamLead}
              onToggleUserActive={handleToggleUserActive}
              onTransferUserTeam={handleTransferUserTeam}
              onUpdateUserDetails={handleUpdateUserDetails}
              onResetData={handleResetData}
            />
          )}

          {/* 3. TEAM CHART VIEW */}
          {activeNav === 'team' && currentTeam && (
            <TeamChart
              team={currentTeam}
              projects={projects}
              tasks={tasks}
              columns={columns}
              users={users}
              versions={versions}
              currentUserId={currentUserId}
              onCreateVersion={handleQuickCreateVersion}
              onOpenVersionManager={() => setIsVersionModalOpen(true)}
              onSelectProject={handleSelectProject}
              onEditTeam={handleOpenEditTeamModal}
              onAddProject={handleOpenNewProjectModal}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {/* 4. PROJECT VIEW (Kanban / List / Project Chart) */}
          {activeNav === 'project' && currentProject && (
            <>
              {/* Project Page Header */}
              <div className="page-header-container">
                <div className="page-title-row">
                  <div className="project-badge-title">
                    <span
                      className="project-dot-halo"
                      style={{ backgroundColor: currentProject.color }}
                    />
                    <div>
                      <h1 className="project-heading">
                        {currentProject.name}
                        <span className="project-code-tag">{currentProject.key}</span>
                        <button
                          type="button"
                          className="btn-edit-proj-inline"
                          onClick={() => handleOpenEditProjectModal(currentProject)}
                          title="ערוך פרויקט"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn-version-manager-inline"
                          onClick={() => setIsVersionModalOpen(true)}
                          title="ניהול גרסאות ותאריכי יעד"
                        >
                          <Milestone size={13} />
                          <span>גרסאות ({versions.length})</span>
                        </button>
                        <button
                          type="button"
                          className="btn-project-files-inline"
                          onClick={() => handleOpenEditProjectModal(currentProject)}
                          title="קבצים ומסמכים מצורפים לפרויקט"
                        >
                          <Paperclip size={13} />
                          <span>קבצים ({currentProject.attachments?.length || 0})</span>
                        </button>
                      </h1>
                      <p className="project-desc-subtitle">
                        {currentProject.description}
                        {currentTeam && (
                          <span className="team-belong-chip">
                            שייך ל-{currentTeam.name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* View Switcher Tabs for Project */}
                  <div className="view-mode-tabs" role="tablist" aria-label="תצוגות משימה">
                    {VIEW_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeProjectView === tab.id;
                      return (
                        <button
                          key={tab.id}
                          role="tab"
                          aria-selected={isActive}
                          className={`view-tab-btn ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveProjectView(tab.id)}
                        >
                          <Icon size={15} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Board and Project Views */}
              <Board
                project={currentProject}
                projects={projects}
                teams={teams}
                columns={columns}
                tasks={tasks}
                view={activeProjectView}
                mineOnly={filterMineOnly}
                onToggleMineOnly={() => setFilterMineOnly((prev) => !prev)}
                globalSearch={globalSearch}
                versions={versions}
                currentUserId={currentUserId}
                onCreateVersion={handleQuickCreateVersion}
                onOpenVersionManager={() => setIsVersionModalOpen(true)}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTask}
                onAddColumn={handleAddColumn}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
                onEditProject={handleOpenEditProjectModal}
              />
            </>
          )}

          {/* Empty Project View (When no projects exist or none selected) */}
          {activeNav === 'project' && !currentProject && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center',
                padding: '40px 20px',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'var(--surface-sunken, rgba(59, 130, 246, 0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  color: 'var(--primary, #3B82F6)',
                }}
              >
                <FolderKanban size={40} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
                אין עדיין פרויקטים במערכת
              </h2>
              <p style={{ maxWidth: 440, fontSize: '0.95rem', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>
                המערכת נקייה לחלוטין. צור את הפרויקט הראשון עבור {currentTeam ? `צוות ${currentTeam.name}` : 'הארגון'} כדי להתחיל לנהל משימות, גרסאות ולוחות קנבן.
              </p>
              <button
                type="button"
                className="btn primary"
                style={{ padding: '10px 24px', fontSize: '0.95rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                onClick={() => handleOpenNewProjectModal(selectedTeamId || teams[0]?.id || 1)}
              >
                <Plus size={18} />
                <span>צור פרויקט חדש</span>
              </button>
            </div>
          )}

          {/* New Task Modal (Available across all views: Global, Team, Project, Admin) */}
          <NewTaskModal
            isOpen={isNewTaskModalOpen}
            onClose={() => setIsNewTaskModalOpen(false)}
            onSubmit={handleModalCreateTask}
            columns={columns}
            users={users}
            tags={tags}
            teams={teams}
            projects={projects}
            versions={versions}
            currentUserId={currentUserId}
            onCreateVersion={handleQuickCreateVersion}
            projectId={currentProject?.id || projects[0]?.id || 1}
            teamId={currentTeam?.id || teams[0]?.id || 1}
          />

          {/* Team Modal (Create or Edit Team) */}
          <TeamModal
            isOpen={isTeamModalOpen}
            onClose={() => setIsTeamModalOpen(false)}
            teamToEdit={teamToEdit}
            onSave={handleSaveTeam}
            onDelete={handleDeleteTeam}
          />

          {/* Project Modal (Create or Edit Project) */}
          <ProjectModal
            isOpen={isProjectModalOpen}
            onClose={() => setIsProjectModalOpen(false)}
            projectToEdit={projectToEdit}
            teams={teams}
            defaultTeamId={defaultTeamIdForProject}
            onSave={handleSaveProject}
            onDelete={handleDeleteProject}
          />

          {/* Version Management Modal */}
          <VersionManagementModal
            isOpen={isVersionModalOpen}
            onClose={() => setIsVersionModalOpen(false)}
            versions={versions}
            tasks={tasks}
            onSaveVersion={handleSaveVersion}
            onDeleteVersion={handleDeleteVersion}
          />

          {/* User Profile & Hardware Identity Modal (Strictly Read-only for regular users) */}
          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            currentUser={currentUser}
            allUsers={users}
            onNavigateAdmin={handleSelectAdmin}
            onSwitchUser={currentUser.role === 'ADMIN' ? handleSelectUser : undefined}
          />

          {/* Login / Device Identification Modal (First time on new computer) */}
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            users={users}
            currentUserId={currentUserId}
            onSelectUser={handleSelectUser}
            onRegisterUser={handleRegisterUser}
          />
        </AppShell>
      </MantineProvider>
    </DirectionProvider>
  );
}

import type { User, Task, Project, Team, Column, ProjectVersion } from './mock';

export const STORAGE_KEYS = {
  USERS: 'jira_users',
  TASKS: 'jira_tasks',
  PROJECTS: 'jira_projects',
  TEAMS: 'jira_teams',
  COLUMNS: 'jira_columns',
  VERSIONS: 'jira_versions',
  ACTIVE_NAV: 'jira_active_nav',
  SELECTED_TEAM_ID: 'jira_selected_team_id',
  SELECTED_PROJECT_ID: 'jira_selected_project_id',
  ACTIVE_PROJECT_VIEW: 'jira_active_project_view',
  CURRENT_USER_ID: 'jira_current_user_id',
  LOCAL_COMPUTER_USERNAME: 'jira_local_computer_username',
} as const;

/**
 * Checks whether a given computer username or username matches the configured ADMIN in environment variables
 */
export function isConfiguredAdmin(usernameOrComputerUser?: string): boolean {
  if (!usernameOrComputerUser) return false;
  const envAdmin = (import.meta.env.VITE_ADMIN_USERNAME || 'adir7').toLowerCase();
  const allowed = envAdmin.split(',').map((s: string) => s.trim().toLowerCase());
  const target = usernameOrComputerUser.trim().toLowerCase();
  return allowed.includes(target);
}

/**
 * Generic safe JSON loader from localStorage
 */
export function loadFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch (err) {
    console.warn(`[TaskBoard Storage] Failed loading key "${key}":`, err);
    return fallback;
  }
}

/**
 * Generic safe JSON saver to localStorage
 */
export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    scheduleDiskSync();
  } catch (err) {
    console.error(`[TaskBoard Storage] Failed saving key "${key}":`, err);
  }
}

/**
 * Enforces admin elevation for any user whose computer_username or username matches VITE_ADMIN_USERNAME
 */
export function enforceAdminPrivileges(users: User[]): User[] {
  return users.map((u) => {
    const isTargetAdmin =
      isConfiguredAdmin(u.computer_username) ||
      isConfiguredAdmin(u.computerUsername) ||
      isConfiguredAdmin(u.computer_name) ||
      isConfiguredAdmin(u.computerName) ||
      isConfiguredAdmin(u.username);

    if (isTargetAdmin && u.role !== 'ADMIN') {
      return {
        ...u,
        role: 'ADMIN',
        roleLabel: 'מנהל מערכת',
        version: (u.version || 1) + 1,
      };
    }
    return u;
  });
}

// Debounced background sync to local disk storage via Vite API endpoint
let syncTimeout: any = null;
let hasHydratedFromDisk = false;

export function markDiskHydrated() {
  hasHydratedFromDisk = true;
}

export function isDiskHydrated() {
  return hasHydratedFromDisk;
}

function scheduleDiskSync() {
  // Never overwrite disk database with unhydrated initial state
  if (!hasHydratedFromDisk) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncAllToDisk();
  }, 500);
}

export async function syncAllToDisk() {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      users: loadFromLocalStorage(STORAGE_KEYS.USERS, null),
      tasks: loadFromLocalStorage(STORAGE_KEYS.TASKS, null),
      projects: loadFromLocalStorage(STORAGE_KEYS.PROJECTS, null),
      teams: loadFromLocalStorage(STORAGE_KEYS.TEAMS, null),
      columns: loadFromLocalStorage(STORAGE_KEYS.COLUMNS, null),
      versions: loadFromLocalStorage(STORAGE_KEYS.VERSIONS, null),
      updatedAt: new Date().toISOString(),
    };

    // If no data loaded yet, skip saving empty payload
    if (!payload.tasks && !payload.users) return;

    await fetch('/api/storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload, null, 2),
    }).catch(() => {
      // Quietly ignore if backend /api/storage is unavailable
    });
  } catch (e) {}
}

/**
 * Reset all application data back to default mock state
 */
export function resetApplicationData() {
  try {
    Object.values(STORAGE_KEYS).forEach((k) => {
      if (k !== STORAGE_KEYS.LOCAL_COMPUTER_USERNAME) {
        localStorage.removeItem(k);
      }
    });
  } catch (e) {}
}

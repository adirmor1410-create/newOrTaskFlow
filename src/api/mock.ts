export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type UserRole = 'ADMIN' | 'TEAM_LEAD' | 'USER';

export interface User {
  id: number;
  username: string;
  display_name: string;
  name: string; // alias to display_name
  computer_username?: string; // Computer OS Username (e.g. adir7, dana_c)
  computerUsername?: string; // alias
  computer_name?: string; // backward compatible alias
  computerName?: string; // backward compatible alias
  role: UserRole;
  roleLabel: string;
  email?: string;
  created_at: string;
  is_active?: boolean;
  isActive?: boolean;
  version: number;
}

export interface Team {
  id: number;
  name: string;
  description: string;
  color: string;
  lead_user_id?: number;
  member_user_ids: number[];
  created_at: string;
}

export interface FileAttachment {
  id: string | number;
  name: string;
  size: number;
  type: string;
  url: string; // Base64 data URL
  uploaded_at: string;
  uploaded_by?: number;
}

export interface Project {
  id: number;
  team_id: number;
  teamId: number; // alias
  name: string;
  key: string;
  description: string;
  color: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_archived: number;
  sort_order: number;
  version: number;
  attachments?: FileAttachment[];
}

export interface Column {
  id: number;
  project_id: number;
  projectId: number; // alias
  name: string;
  color: string;
  sort_order: number;
  version: number;
}

export interface Subtask {
  id: number;
  text: string;
  done: boolean;
  doneByColumn?: Record<number, boolean>;
}

export interface Comment {
  id: number;
  task_id?: number;
  user_id?: number;
  userId?: number;
  text: string;
  image_url?: string;
  image_name?: string;
  created_at?: string;
  at?: string;
  updated_at?: string;
  is_edited?: boolean;
  version?: number;
}

export interface TaskHistoryItem {
  id?: number;
  text: string;
  created_at: string;
  user_id?: number;
}

export interface TaskHistory {
  id: number;
  task_id: number;
  user_id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  projectId: number; // alias
  column_id: number;
  columnId: number; // alias
  team_id?: number | null;
  teamId?: number | null; // alias
  jira_key?: string;
  jiraKey?: string; // alias e.g. "JIRA-104"
  target_version?: string;
  targetVersion?: string; // alias e.g. "v1.2.0"
  title: string;
  description: string;
  priority: Priority;
  assignee_id: number | null;
  assigneeId: number | null; // alias
  minion_ids?: number[];
  minionIds?: number[]; // alias for co-assignees / contributors ("מיניונים")
  start_date?: string | null;
  startDate?: string | null; // alias
  due_date: string | null;
  dueDate: string | null; // alias
  completed_at?: string | null;
  completedAt?: string | null; // actual completion date for Done tasks
  created_by: number;
  sort_order: number;
  is_archived: number;
  version: number;
  created_at: string;
  updated_at: string;
  tag_ids: number[];
  tagIds: number[]; // alias
  attachments?: FileAttachment[];
  subtasks: Subtask[];
  comments: Comment[];
  history: (string | TaskHistoryItem)[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface ProjectVersion {
  id: number;
  project_id?: number | null;
  projectId?: number | null;
  name: string;
  release_date?: string | null;
  releaseDate?: string | null;
  description?: string;
  status?: 'planned' | 'in_progress' | 'released' | 'archived';
  created_at?: string;
}

export const initialVersions: ProjectVersion[] = [];

export interface AppNotification {
  id: number;
  title: string;
  subtitle: string;
  time: string;
  read: boolean;
  type: 'mention' | 'overdue' | 'assigned' | 'completed' | 'comment';
}

export const ME = 7;

export const users: User[] = [
  {
    id: 7,
    username: 'adir7',
    display_name: 'אדיר מור',
    name: 'אדיר מור',
    computer_username: 'adir7',
    computerUsername: 'adir7',
    computer_name: 'adir7',
    computerName: 'adir7',
    role: 'ADMIN',
    roleLabel: 'מנהל מערכת',
    email: 'adir7@company.io',
    created_at: '2026-10-28',
    is_active: true,
    isActive: true,
    version: 1,
  },
];

export const initialTeams: Team[] = [
  {
    id: 1,
    name: 'מדור אור',
    description: 'צוות מדור אור',
    color: '#3B82F6',
    lead_user_id: 7,
    member_user_ids: [7],
    created_at: '2026-10-28',
  },
];

export const tags: Tag[] = [
  { id: 1, name: 'ממשק UI', color: '#8B5CF6' },
  { id: 2, name: 'Backend', color: '#0D9488' },
  { id: 3, name: 'QA ובדיקות', color: '#EA580C' },
  { id: 4, name: 'RTL', color: '#2563EB' },
  { id: 5, name: 'אבטחה', color: '#E11D48' },
  { id: 6, name: 'ביצועים', color: '#059669' },
];

export const initialProjects: Project[] = [];

export const initialColumns: Column[] = [];

export const initialTasks: Task[] = [];

export const initialNotifications: AppNotification[] = [];

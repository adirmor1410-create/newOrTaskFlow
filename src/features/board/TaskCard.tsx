import { useMemo, useRef, useEffect, type CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CheckSquare, MessageSquare, MoreHorizontal } from 'lucide-react';
import { Avatar, DueDate, PriorityBadge, ProgressBar, pvar } from '../../components/ui';
import type { Tag, Task, User, Project } from '../../api/mock';

interface CardProps {
  task: Task;
  project?: Project;
  assignee?: User;
  tags?: Tag[];
  minions?: User[];
}

function CardView({ task, project, assignee, minions = [] }: CardProps) {
  const projectKey = project?.key || 'TSK';
  const issueKey = `${projectKey}-${task.id}`;

  const subtasksCount = task.subtasks?.length ?? 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.done).length ?? 0;

  return (
    <div className="card-inner">
      <div className="card-top-row">
        <div className="card-top-badges">
          <span className="issue-badge" title={`מזהה משימה: ${issueKey}`}>
            {issueKey}
          </span>
          {(task.jira_key || task.jiraKey) && (
            <span className="jira-key-badge" title={`מספר Jira: ${task.jira_key || task.jiraKey}`}>
              {task.jira_key || task.jiraKey}
            </span>
          )}
          {(task.target_version || task.targetVersion) && (
            <span className="target-version-badge" title={`גרסת יעד: ${task.target_version || task.targetVersion}`}>
              {task.target_version || task.targetVersion}
            </span>
          )}
        </div>
        <div className="card-top-end">
          <PriorityBadge priority={task.priority} size="sm" showLabel={false} />
        </div>
      </div>

      <div className="card-title" dir="auto" title={task.title}>
        {task.title}
      </div>

      {subtasksCount > 0 && (
        <div className="card-subtasks-summary" title={`${completedSubtasks} מתוך ${subtasksCount} תת-משימות הושלמו`}>
          <div className="subtasks-label">
            <CheckSquare size={13} className="subtasks-icon" />
            <span>{completedSubtasks}/{subtasksCount} תת-משימות</span>
          </div>
          <ProgressBar value={completedSubtasks} max={subtasksCount} height={4} />
        </div>
      )}

      <div className="card-footer">
        <div className="card-meta-group">
          {task.dueDate && <DueDate date={task.dueDate} />}
          {task.comments && task.comments.length > 0 && (
            <span className="card-comments-badge" title={`${task.comments.length} תגובות`}>
              <MessageSquare size={13} aria-hidden />
              <span>{task.comments.length}</span>
            </span>
          )}
        </div>

        <div className="card-assignees-group">
          {minions && minions.length > 0 && (
            <div
              className="card-minions-stack"
              title={`מיניונים (משויכים נוספים): ${minions.map((m) => m.name).join(', ')}`}
            >
              {minions.slice(0, 2).map((m) => (
                <span key={m.id} className="minion-avatar-wrapper">
                  <Avatar name={m.name} size={20} />
                </span>
              ))}
              {minions.length > 2 && (
                <span className="minions-overflow-badge">+{minions.length - 2}</span>
              )}
            </div>
          )}

          {assignee ? (
            <span className="card-assignee" title={`אחראי ראשי: ${assignee.name}`}>
              <Avatar name={assignee.name} size={26} />
            </span>
          ) : (
            <span className="card-unassigned" title="לא משויך" />
          )}
        </div>
      </div>
    </div>
  );
}

export function CardOverlay(props: CardProps) {
  return (
    <div className="task-card card-lifted">
      <CardView {...props} />
    </div>
  );
}

export function TaskCard(props: CardProps & { onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.task.id,
  });
  const wasDraggedRef = useRef(false);

  useEffect(() => {
    if (isDragging) {
      wasDraggedRef.current = true;
    } else if (wasDraggedRef.current) {
      const timer = setTimeout(() => {
        wasDraggedRef.current = false;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isDragging]);

  const handleClick = (e: React.MouseEvent) => {
    if (wasDraggedRef.current) {
      e.stopPropagation();
      wasDraggedRef.current = false;
      return;
    }
    props.onOpen();
  };

  return (
    <div
      ref={setNodeRef}
      className={`task-card ${isDragging ? 'is-dragging' : ''}`}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          props.onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`משימה ${props.task.title}`}
    >
      <CardView {...props} />
    </div>
  );
}

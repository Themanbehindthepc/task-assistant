'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Task } from '@/lib/supabase';
import { advanceDate, createTask, deleteTask, fetchTasks, updateTask } from '@/lib/tasks';
import Auth from './Auth';

const CATEGORIES = ['Work', 'Personal', 'Health', 'Learning', 'Other'];
const PRIORITIES: Array<Task['priority']> = ['low', 'medium', 'high'];
const RECURRENCES: Array<Task['recurrence']> = ['none', 'daily', 'weekly'];
const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };
const CIRCUMFERENCE = 339.292;

type View = 'all' | 'focus' | 'dashboard';
type Filters = { status: string; category: string; priority: string };

export function TaskAssistant() {
  const [ownerName, setOwnerName] = useState<string | null | undefined>(undefined);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ status: 'all', category: 'all', priority: 'all' });
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_at'>('due_date');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const editDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('taskAssistant.ownerName') : null;
    setOwnerName(stored);
  }, []);

  useEffect(() => {
    if (ownerName === undefined) return;
    if (!ownerName) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchTasks(ownerName)
      .then(setTasks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ownerName]);

  useEffect(() => {
    if (editingTask) {
      editDialogRef.current?.showModal();
    } else {
      editDialogRef.current?.close();
    }
  }, [editingTask]);

  function handleStart(name: string) {
    window.localStorage.setItem('taskAssistant.ownerName', name);
    setOwnerName(name);
  }

  function handleSwitchUser() {
    window.localStorage.removeItem('taskAssistant.ownerName');
    setOwnerName(null);
    setTasks([]);
  }

  function todayString() {
    return new Date().toISOString().slice(0, 10);
  }

  function parseDate(dateString: string | null) {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function isOverdue(task: Task) {
    if (task.completed || !task.due_date) return false;
    const due = parseDate(task.due_date);
    if (!due) return false;
    return due.getTime() < new Date(todayString()).getTime();
  }

  function isDueToday(task: Task) {
    if (!task.due_date) return false;
    return task.due_date === todayString();
  }

  function priorityLabel(priority: string) {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  function formatDueDate(dueDate: string | null) {
    if (!dueDate) return '';
    if (dueDate === todayString()) return 'Today';
    const due = parseDate(dueDate);
    if (!due) return dueDate;
    return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const filteredTasks = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    return [...tasks]
      .filter((task) => {
        if (searchLower && !task.title.toLowerCase().includes(searchLower) && !task.note.toLowerCase().includes(searchLower)) {
          return false;
        }
        if (filters.status === 'active' && task.completed) return false;
        if (filters.status === 'completed' && !task.completed) return false;
        if (filters.category !== 'all' && task.category !== filters.category) return false;
        if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
        if (sortBy === 'created_at') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
  }, [tasks, search, filters, sortBy]);

  const focusTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.completed && (isDueToday(task) || isOverdue(task) || task.priority === 'high'))
      .sort((a, b) => {
        const priorityDiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
  }, [tasks]);

  const categories = useMemo(() => Array.from(new Set(tasks.map((t) => t.category))).sort(), [tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const overdue = tasks.filter(isOverdue).length;
    const dueToday = tasks.filter(isDueToday).length;
    const completionRate = total === 0 ? 0 : (completed / total) * 100;
    const categoryCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    tasks.forEach((task) => {
      categoryCounts[task.category] = (categoryCounts[task.category] || 0) + 1;
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
    });
    return { total, completed, overdue, dueToday, completionRate, categoryCounts, priorityCounts };
  }, [tasks]);

  const banner = useMemo(() => {
    const overdue = tasks.filter(isOverdue).length;
    const dueToday = tasks.filter((t) => !t.completed && isDueToday(t)).length;
    const highPriority = tasks.filter((t) => !t.completed && t.priority === 'high').length;

    if (overdue > 0) {
      return { text: `⚠ You have ${overdue} overdue task${overdue === 1 ? '' : 's'}. Tackle the oldest one first.`, type: 'danger' };
    }
    if (dueToday > 0) {
      return { text: `⏰ ${dueToday} task${dueToday === 1 ? '' : 's'} due today. Focus view has your shortlist.`, type: 'warning' };
    }
    if (highPriority > 0) {
      return { text: `🎯 ${highPriority} high-priority task${highPriority === 1 ? '' : 's'} waiting. Start with the biggest win.`, type: 'info' };
    }
    if (tasks.length === 0) {
      return { text: '👋 Add your first task and I’ll keep you on track.', type: 'info' };
    }
    const rate = Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100);
    return { text: `✨ All caught up! ${rate}% complete. Enjoy the calm.`, type: 'info' };
  }, [tasks]);

  async function handleAddTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ownerName || saving) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    if (!title) return;

    setSaving(true);
    setError('');
    try {
      const newTask = await createTask(ownerName, {
        title,
        priority: String(formData.get('priority') || 'medium') as Task['priority'],
        category: String(formData.get('category') || 'Other'),
        due_date: String(formData.get('dueDate') || '') || null,
        note: String(formData.get('note') || ''),
        recurrence: String(formData.get('recurrence') || 'none') as Task['recurrence'],
        completed: false,
      });
      setTasks((prev) => [newTask, ...prev]);
      form.reset();
      setFormOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(task: Task, completed: boolean) {
    if (!ownerName) return;
    setError('');
    try {
      if (completed && task.recurrence !== 'none' && task.due_date) {
        const nextTask = await createTask(ownerName, {
          title: task.title,
          priority: task.priority,
          category: task.category,
          due_date: advanceDate(task.due_date, task.recurrence),
          note: task.note,
          recurrence: task.recurrence,
          completed: false,
        });
        setTasks((prev) => [nextTask, ...prev]);
      }
      const updated = await updateTask(task.id, { completed });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    setError('');
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleEditSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask || saving) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title') || '').trim();
    if (!title) return;

    setSaving(true);
    setError('');
    try {
      const updated = await updateTask(editingTask.id, {
        title,
        priority: String(formData.get('priority') || 'medium') as Task['priority'],
        category: String(formData.get('category') || 'Other'),
        due_date: String(formData.get('dueDate') || '') || null,
        recurrence: String(formData.get('recurrence') || 'none') as Task['recurrence'],
        note: String(formData.get('note') || ''),
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTask(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (ownerName === undefined) {
    return (
      <div className="loading-screen">
        <span>Loading…</span>
      </div>
    );
  }

  if (!ownerName) {
    return <Auth onStart={handleStart} />;
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <span>Loading tasks…</span>
      </div>
    );
  }

  const activeCount = filteredTasks.filter((t) => !t.completed).length;
  const completedCount = filteredTasks.filter((t) => t.completed).length;

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a href="#" className="logo" aria-label="Task Assistant home">
            <span className="logo-mark">✓</span>
            <span>Task Assistant</span>
          </a>
          <div className="user-menu">
            <span className="user-email" title={ownerName}>{ownerName}</span>
            <button type="button" className="btn btn-ghost" onClick={handleSwitchUser}>
              Switch user
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <section className={`assistant-banner ${banner.type === 'danger' ? 'danger' : banner.type === 'warning' ? 'warning' : ''}`}>
          <p className="banner-text">{banner.text}</p>
        </section>

        {error && (
          <section className="assistant-banner danger">
            <p className="banner-text">Error: {error}</p>
          </section>
        )}

        <section className="task-form-section">
          <button
            type="button"
            className="btn btn-secondary btn-toggle-form"
            aria-expanded={formOpen}
            onClick={() => setFormOpen((v) => !v)}
          >
            {formOpen ? 'Hide form' : '+ New Task'}
          </button>

          <form
            ref={formRef}
            onSubmit={handleAddTask}
            className={`task-form ${formOpen ? '' : 'collapsed'}`}
            noValidate
          >
            <div className="form-row">
              <div className="form-field field-title">
                <label htmlFor="taskTitle">
                  Task title <span aria-label="required">*</span>
                </label>
                <input type="text" id="taskTitle" name="title" required placeholder="What do you need to do?" autoComplete="off" />
              </div>

              <div className="form-field field-priority">
                <label htmlFor="taskPriority">Priority</label>
                <select id="taskPriority" name="priority" defaultValue="medium">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{priorityLabel(p)}</option>
                  ))}
                </select>
              </div>

              <div className="form-field field-category">
                <label htmlFor="taskCategory">Category</label>
                <select id="taskCategory" name="category" defaultValue="Work">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-field field-due">
                <label htmlFor="taskDueDate">Due date</label>
                <input type="date" id="taskDueDate" name="dueDate" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field field-note">
                <label htmlFor="taskNote">Note</label>
                <textarea id="taskNote" name="note" rows={2} placeholder="Any extra details…"></textarea>
              </div>

              <div className="form-field field-recurrence">
                <label htmlFor="taskRecurrence">Repeat</label>
                <select id="taskRecurrence" name="recurrence" defaultValue="none">
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Add Task'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </section>

        <section className="toolbar" id="toolbar">
          <div className="search-field">
            <label htmlFor="searchInput" className="visually-hidden">Search tasks</label>
            <input
              type="search"
              id="searchInput"
              placeholder="Search tasks…"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filters">
            <div className={`filter-group filter-group-status ${view === 'focus' ? 'hidden' : ''}`}>
              <label htmlFor="filterStatus" className="visually-hidden">Filter by status</label>
              <select
                id="filterStatus"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                disabled={view === 'focus'}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="filter-group filter-group-category">
              <label htmlFor="filterCategory" className="visually-hidden">Filter by category</label>
              <select
                id="filterCategory"
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className={`filter-group filter-group-priority ${view === 'focus' ? 'hidden' : ''}`}>
              <label htmlFor="filterPriority" className="visually-hidden">Filter by priority</label>
              <select
                id="filterPriority"
                value={filters.priority}
                onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
                disabled={view === 'focus'}
              >
                <option value="all">All priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{priorityLabel(p)}</option>
                ))}
              </select>
            </div>

            <div className={`filter-group filter-group-sort ${view === 'focus' ? 'hidden' : ''}`}>
              <label htmlFor="sortBy" className="visually-hidden">Sort by</label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                disabled={view === 'focus'}
              >
                <option value="due_date">Due date</option>
                <option value="priority">Priority</option>
                <option value="created_at">Created</option>
              </select>
            </div>
          </div>
        </section>

        <section id="view-all" className={`view ${view === 'all' ? 'active' : ''}`} role="tabpanel" aria-labelledby="tab-all" hidden={view !== 'all'}>
          <div className="section-header">
            <h1>All Tasks</h1>
            <p className="section-subtitle">
              {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'} • {activeCount} active • {completedCount} completed
            </p>
          </div>
          <ul className="task-list" role="list">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={setEditingTask} />
            ))}
          </ul>
          {filteredTasks.length === 0 && (
            <div className="empty-state visible">
              <p>No tasks found. Add your first task above.</p>
            </div>
          )}
        </section>

        <section id="view-focus" className={`view ${view === 'focus' ? 'active' : ''}`} role="tabpanel" aria-labelledby="tab-focus" hidden={view !== 'focus'}>
          <div className="section-header">
            <h1>Focus Today</h1>
            <p className="section-subtitle">{focusTasks.length} task{focusTasks.length === 1 ? '' : 's'} need your attention</p>
          </div>
          <ul className="task-list" role="list">
            {focusTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={setEditingTask} />
            ))}
          </ul>
          {focusTasks.length === 0 && (
            <div className="empty-state visible">
              <p>Nothing urgent today. Great job!</p>
            </div>
          )}
        </section>

        <section id="view-dashboard" className={`view ${view === 'dashboard' ? 'active' : ''}`} role="tabpanel" aria-labelledby="tab-dashboard" hidden={view !== 'dashboard'}>
          <div className="section-header">
            <h1>Dashboard</h1>
            <p className="section-subtitle">Your productivity at a glance</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total</span>
              <strong className="stat-value">{stats.total}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Completed</span>
              <strong className="stat-value">{stats.completed}</strong>
            </div>
            <div className="stat-card highlight">
              <span className="stat-label">Overdue</span>
              <strong className="stat-value">{stats.overdue}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Due today</span>
              <strong className="stat-value">{stats.dueToday}</strong>
            </div>
          </div>

          <div className="dashboard-charts">
            <div className="chart-card">
              <h2>Completion rate</h2>
              <div className="progress-ring">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle className="progress-track" cx="60" cy="60" r="54"></circle>
                  <circle
                    className="progress-fill"
                    cx="60"
                    cy="60"
                    r="54"
                    style={{ strokeDashoffset: CIRCUMFERENCE - (CIRCUMFERENCE * stats.completionRate) / 100 }}
                  ></circle>
                </svg>
                <div className="progress-text">
                  <strong>{Math.round(stats.completionRate)}%</strong>
                  <span>done</span>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <h2>By category</h2>
              <ul className="category-list" role="list">
                {stats.total === 0 ? (
                  <li className="stat-row">
                    <span className="stat-name">No data yet</span>
                    <span className="stat-count">—</span>
                  </li>
                ) : (
                  Object.entries(stats.categoryCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => (
                      <li key={category} className="stat-row">
                        <span className="stat-name">{category}</span>
                        <span className="stat-count">{count}</span>
                      </li>
                    ))
                )}
              </ul>
            </div>

            <div className="chart-card">
              <h2>By priority</h2>
              <ul className="priority-list" role="list">
                {stats.total === 0 ? (
                  <li className="stat-row">
                    <span className="stat-name">No data yet</span>
                    <span className="stat-count">—</span>
                  </li>
                ) : (
                  PRIORITIES.map((priority) => {
                    const count = stats.priorityCounts[priority] || 0;
                    return (
                      <li key={priority} className="stat-row">
                        <span className="stat-name">{priorityLabel(priority)}</span>
                        <span className="stat-count">{count}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>Task Assistant — your data lives securely in Supabase.</p>
      </footer>

      <nav className="container" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }} aria-label="Main views">
        <ul className="view-tabs" role="tablist">
          <li>
            <button
              id="tab-all"
              className={`tab-btn ${view === 'all' ? 'active' : ''}`}
              role="tab"
              aria-selected={view === 'all'}
              onClick={() => setView('all')}
            >
              All Tasks
            </button>
          </li>
          <li>
            <button
              id="tab-focus"
              className={`tab-btn ${view === 'focus' ? 'active' : ''}`}
              role="tab"
              aria-selected={view === 'focus'}
              onClick={() => setView('focus')}
            >
              Focus Today
            </button>
          </li>
          <li>
            <button
              id="tab-dashboard"
              className={`tab-btn ${view === 'dashboard' ? 'active' : ''}`}
              role="tab"
              aria-selected={view === 'dashboard'}
              onClick={() => setView('dashboard')}
            >
              Dashboard
            </button>
          </li>
        </ul>
      </nav>

      {editingTask && (
        <dialog ref={editDialogRef} className="edit-dialog" aria-labelledby="editDialogTitle">
          <form onSubmit={handleEditSave} className="task-form" noValidate>
            <h2 id="editDialogTitle">Edit task</h2>

            <div className="form-row">
              <div className="form-field field-title">
                <label htmlFor="editTaskTitle">
                  Task title <span aria-label="required">*</span>
                </label>
                <input
                  type="text"
                  id="editTaskTitle"
                  name="title"
                  required
                  defaultValue={editingTask.title}
                  placeholder="What do you need to do?"
                  autoComplete="off"
                />
              </div>

              <div className="form-field field-priority">
                <label htmlFor="editTaskPriority">Priority</label>
                <select id="editTaskPriority" name="priority" defaultValue={editingTask.priority}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{priorityLabel(p)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field field-category">
                <label htmlFor="editTaskCategory">Category</label>
                <select id="editTaskCategory" name="category" defaultValue={editingTask.category}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-field field-due">
                <label htmlFor="editTaskDueDate">Due date</label>
                <input type="date" id="editTaskDueDate" name="dueDate" defaultValue={editingTask.due_date || ''} />
              </div>

              <div className="form-field field-recurrence">
                <label htmlFor="editTaskRecurrence">Repeat</label>
                <select id="editTaskRecurrence" name="recurrence" defaultValue={editingTask.recurrence}>
                  {RECURRENCES.map((r) => (
                    <option key={r} value={r}>{r === 'none' ? 'None' : r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field field-note">
              <label htmlFor="editTaskNote">Note</label>
              <textarea id="editTaskNote" name="note" rows={3} defaultValue={editingTask.note} placeholder="Any extra details…"></textarea>
            </div>

            <div className="dialog-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingTask(null)}>
                Cancel
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

function TaskCard({
  task,
  onComplete,
  onDelete,
  onEdit,
}: {
  task: Task;
  onComplete: (task: Task, completed: boolean) => void;
  onDelete: (id: string, title: string) => void;
  onEdit: (task: Task) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = !task.completed && task.due_date && task.due_date < today;
  const dueToday = task.due_date === today;
  const cardClass = ['task-card', task.completed ? 'completed' : '', overdue ? 'overdue' : dueToday ? 'due-today' : ''].filter(Boolean).join(' ');

  return (
    <li className={cardClass}>
      <input
        type="checkbox"
        className="task-checkbox"
        checked={task.completed}
        onChange={(e) => onComplete(task, e.target.checked)}
        aria-label={`Mark ${task.title} as ${task.completed ? 'active' : 'complete'}`}
      />
      <div className="task-main">
        <p className="task-title">{task.title}</p>
        <div className="task-meta">
          <span className={`badge badge-priority-${task.priority}`}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
          <span className="badge badge-category">{task.category}</span>
          {task.due_date && (
            <span style={{ color: overdue ? 'var(--red-500)' : undefined, fontWeight: dueToday ? 700 : undefined }}>
              Due {formatDate(task.due_date)}
            </span>
          )}
          {task.recurrence !== 'none' && <span>↻ {task.recurrence}</span>}
        </div>
        {task.note && <p className="task-note">{task.note}</p>}
      </div>
      <div className="task-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}>
          Edit
        </button>
        <button type="button" className="btn btn-danger" onClick={() => onDelete(task.id, task.title)} aria-label={`Delete ${task.title}`}>
          Delete
        </button>
      </div>
    </li>
  );
}

function formatDate(dateString: string | null) {
  if (!dateString) return '';
  const today = new Date().toISOString().slice(0, 10);
  if (dateString === today) return 'Today';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

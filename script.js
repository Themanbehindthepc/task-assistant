(function () {
    'use strict';

    const storage = window.TaskStorage;

    const state = {
        view: 'all',
        search: '',
        filters: {
            status: 'all',
            category: 'all',
            priority: 'all',
        },
        sort: 'dueDate',
    };

    const elements = {
        tabAll: document.getElementById('tab-all'),
        tabFocus: document.getElementById('tab-focus'),
        tabDashboard: document.getElementById('tab-dashboard'),
        viewAll: document.getElementById('view-all'),
        viewFocus: document.getElementById('view-focus'),
        viewDashboard: document.getElementById('view-dashboard'),
        addTaskForm: document.getElementById('addTaskForm'),
        toggleFormBtn: document.getElementById('toggleFormBtn'),
        cancelFormBtn: document.getElementById('cancelFormBtn'),
        searchInput: document.getElementById('searchInput'),
        filterStatus: document.getElementById('filterStatus'),
        filterCategory: document.getElementById('filterCategory'),
        filterPriority: document.getElementById('filterPriority'),
        sortBy: document.getElementById('sortBy'),
        taskList: document.getElementById('taskList'),
        focusTaskList: document.getElementById('focusTaskList'),
        emptyStateAll: document.getElementById('emptyStateAll'),
        emptyStateFocus: document.getElementById('emptyStateFocus'),
        allSubtitle: document.getElementById('allSubtitle'),
        focusSubtitle: document.getElementById('focusSubtitle'),
        assistantBanner: document.getElementById('assistantBanner'),
        bannerText: document.getElementById('bannerText'),
        editDialog: document.getElementById('editDialog'),
        editTaskForm: document.getElementById('editTaskForm'),
        closeEditDialog: document.getElementById('closeEditDialog'),
        editTaskId: document.getElementById('editTaskId'),
        editTaskTitle: document.getElementById('editTaskTitle'),
        editTaskPriority: document.getElementById('editTaskPriority'),
        editTaskCategory: document.getElementById('editTaskCategory'),
        editTaskDueDate: document.getElementById('editTaskDueDate'),
        editTaskRecurrence: document.getElementById('editTaskRecurrence'),
        editTaskNote: document.getElementById('editTaskNote'),
        statTotal: document.getElementById('statTotal'),
        statCompleted: document.getElementById('statCompleted'),
        statOverdue: document.getElementById('statOverdue'),
        statDueToday: document.getElementById('statDueToday'),
        progressFill: document.getElementById('progressFill'),
        progressPercent: document.getElementById('progressPercent'),
        categoryStats: document.getElementById('categoryStats'),
        priorityStats: document.getElementById('priorityStats'),
    };

    const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };
    const CIRCUMFERENCE = 339.292;

    function todayString() {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date.toISOString().slice(0, 10);
    }

    function parseDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function isOverdue(task) {
        if (task.completed || !task.dueDate) return false;
        const due = parseDate(task.dueDate);
        if (!due) return false;
        return due.getTime() < new Date(todayString()).getTime();
    }

    function isDueToday(task) {
        if (!task.dueDate) return false;
        return task.dueDate === todayString();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function priorityLabel(priority) {
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    }

    function formatDueDate(dueDate) {
        if (!dueDate) return '';
        if (dueDate === todayString()) return 'Today';
        const due = parseDate(dueDate);
        if (!due) return dueDate;
        return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    function getFilteredTasks(tasks) {
        const search = state.search.toLowerCase().trim();
        return tasks.filter((task) => {
            if (search && !task.title.toLowerCase().includes(search) && !task.note.toLowerCase().includes(search)) {
                return false;
            }
            if (state.filters.status === 'active' && task.completed) return false;
            if (state.filters.status === 'completed' && !task.completed) return false;
            if (state.filters.category !== 'all' && task.category !== state.filters.category) return false;
            if (state.filters.priority !== 'all' && task.priority !== state.filters.priority) return false;
            return true;
        }).sort((a, b) => {
            if (state.sort === 'priority') {
                return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
            }
            if (state.sort === 'createdAt') {
                return new Date(b.createdAt) - new Date(a.createdAt);
            }
            // dueDate: tasks with due date first, ascending; null dates last
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        });
    }

    function getFocusTasks(tasks) {
        return tasks
            .filter((task) => !task.completed && (isDueToday(task) || isOverdue(task) || task.priority === 'high'))
            .sort((a, b) => {
                const priorityDiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
                if (priorityDiff !== 0) return priorityDiff;
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.localeCompare(b.dueDate);
            });
    }

    function createTaskCard(task) {
        const li = document.createElement('li');
        li.className = 'task-card';
        if (task.completed) li.classList.add('completed');
        if (isOverdue(task)) li.classList.add('overdue');
        else if (isDueToday(task)) li.classList.add('due-today');
        li.dataset.id = task.id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.setAttribute('aria-label', `Mark ${task.title} as ${task.completed ? 'active' : 'complete'}`);
        checkbox.addEventListener('change', () => handleComplete(task.id, checkbox.checked));

        const main = document.createElement('div');
        main.className = 'task-main';

        const title = document.createElement('p');
        title.className = 'task-title';
        title.textContent = task.title;

        const meta = document.createElement('div');
        meta.className = 'task-meta';

        const priorityBadge = document.createElement('span');
        priorityBadge.className = `badge badge-priority-${task.priority}`;
        priorityBadge.textContent = priorityLabel(task.priority);

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'badge badge-category';
        categoryBadge.textContent = task.category;

        meta.appendChild(priorityBadge);
        meta.appendChild(categoryBadge);

        if (task.dueDate) {
            const due = document.createElement('span');
            due.textContent = `Due ${formatDueDate(task.dueDate)}`;
            if (isOverdue(task)) due.style.color = 'var(--red-500)';
            if (isDueToday(task)) due.style.fontWeight = '700';
            meta.appendChild(due);
        }

        if (task.recurrence !== 'none') {
            const recurrence = document.createElement('span');
            recurrence.textContent = `↻ ${task.recurrence}`;
            meta.appendChild(recurrence);
        }

        main.appendChild(title);
        main.appendChild(meta);

        if (task.note) {
            const note = document.createElement('p');
            note.className = 'task-note';
            note.textContent = task.note;
            main.appendChild(note);
        }

        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn-ghost';
        editBtn.textContent = 'Edit';
        editBtn.setAttribute('aria-label', `Edit ${task.title}`);
        editBtn.addEventListener('click', () => openEditDialog(task.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', `Delete ${task.title}`);
        deleteBtn.addEventListener('click', () => handleDelete(task.id));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(checkbox);
        li.appendChild(main);
        li.appendChild(actions);

        return li;
    }

    function renderTaskList(container, tasks, emptyElement) {
        container.innerHTML = '';
        if (tasks.length === 0) {
            emptyElement.classList.add('visible');
            return;
        }
        emptyElement.classList.remove('visible');
        const fragment = document.createDocumentFragment();
        tasks.forEach((task) => {
            fragment.appendChild(createTaskCard(task));
        });
        container.appendChild(fragment);
    }

    function updateCategoryFilterOptions() {
        const tasks = storage.readTasks();
        const categories = Array.from(new Set(tasks.map((task) => task.category))).sort();
        const currentValue = elements.filterCategory.value;

        elements.filterCategory.innerHTML = '<option value="all">All categories</option>';
        categories.forEach((category) => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            elements.filterCategory.appendChild(option);
        });
        elements.filterCategory.value = categories.includes(currentValue) ? currentValue : 'all';
    }

    function updateProgressRing(percent) {
        const offset = CIRCUMFERENCE - (CIRCUMFERENCE * percent) / 100;
        elements.progressFill.style.strokeDashoffset = offset;
        elements.progressPercent.textContent = `${Math.round(percent)}%`;
    }

    function renderDashboard() {
        const tasks = storage.readTasks();
        const total = tasks.length;
        const completed = tasks.filter((task) => task.completed).length;
        const overdue = tasks.filter(isOverdue).length;
        const dueToday = tasks.filter(isDueToday).length;
        const completionRate = total === 0 ? 0 : (completed / total) * 100;

        elements.statTotal.textContent = total;
        elements.statCompleted.textContent = completed;
        elements.statOverdue.textContent = overdue;
        elements.statDueToday.textContent = dueToday;
        updateProgressRing(completionRate);

        const categoryCounts = {};
        const priorityCounts = {};
        tasks.forEach((task) => {
            categoryCounts[task.category] = (categoryCounts[task.category] || 0) + 1;
            priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
        });

        elements.categoryStats.innerHTML = '';
        if (total === 0) {
            const empty = document.createElement('li');
            empty.className = 'stat-row';
            empty.innerHTML = '<span class="stat-name">No data yet</span><span class="stat-count">—</span>';
            elements.categoryStats.appendChild(empty);
        } else {
            Object.entries(categoryCounts)
                .sort((a, b) => b[1] - a[1])
                .forEach(([category, count]) => {
                    const li = document.createElement('li');
                    li.className = 'stat-row';
                    li.innerHTML = `<span class="stat-name">${escapeHtml(category)}</span>
                                    <span class="stat-count">${count}</span>`;
                    elements.categoryStats.appendChild(li);
                });
        }

        elements.priorityStats.innerHTML = '';
        if (total === 0) {
            const empty = document.createElement('li');
            empty.className = 'stat-row';
            empty.innerHTML = '<span class="stat-name">No data yet</span><span class="stat-count">—</span>';
            elements.priorityStats.appendChild(empty);
        } else {
            ['high', 'medium', 'low'].forEach((priority) => {
                const count = priorityCounts[priority] || 0;
                const li = document.createElement('li');
                li.className = 'stat-row';
                li.innerHTML = `<span class="stat-name">${priorityLabel(priority)}</span>
                                <span class="stat-count">${count}</span>`;
                elements.priorityStats.appendChild(li);
            });
        }
    }

    function renderAssistantBanner() {
        const tasks = storage.readTasks();
        const overdue = tasks.filter(isOverdue).length;
        const dueToday = tasks.filter((task) => !task.completed && isDueToday(task)).length;
        const highPriority = tasks.filter((task) => !task.completed && task.priority === 'high').length;

        elements.assistantBanner.className = 'assistant-banner';

        if (overdue > 0) {
            elements.assistantBanner.classList.add('danger');
            elements.bannerText.textContent = `⚠ You have ${overdue} overdue task${overdue === 1 ? '' : 's'}. Tackle the oldest one first.`;
        } else if (dueToday > 0) {
            elements.assistantBanner.classList.add('warning');
            elements.bannerText.textContent = `⏰ ${dueToday} task${dueToday === 1 ? '' : 's'} due today. Focus view has your shortlist.`;
        } else if (highPriority > 0) {
            elements.bannerText.textContent = `🎯 ${highPriority} high-priority task${highPriority === 1 ? '' : 's'} waiting. Start with the biggest win.`;
        } else if (tasks.length === 0) {
            elements.bannerText.textContent = '👋 Add your first task and I’ll keep you on track.';
        } else {
            const completionRate = Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
            elements.bannerText.textContent = `✨ All caught up! ${completionRate}% complete. Enjoy the calm.`;
        }
    }

    function render() {
        const tasks = storage.readTasks();
        const filtered = getFilteredTasks(tasks);
        const focusTasks = getFocusTasks(tasks);

        renderTaskList(elements.taskList, filtered, elements.emptyStateAll);
        renderTaskList(elements.focusTaskList, focusTasks, elements.emptyStateFocus);

        const activeCount = filtered.filter((task) => !task.completed).length;
        const completedCount = filtered.filter((task) => task.completed).length;
        elements.allSubtitle.textContent = `${filtered.length} task${filtered.length === 1 ? '' : 's'} • ${activeCount} active • ${completedCount} completed`;
        elements.focusSubtitle.textContent = `${focusTasks.length} task${focusTasks.length === 1 ? '' : 's'} need your attention`;

        updateCategoryFilterOptions();
        renderDashboard();
        renderAssistantBanner();
    }

    function setView(view) {
        state.view = view;

        [elements.tabAll, elements.tabFocus, elements.tabDashboard].forEach((tab) => {
            const isActive = tab.dataset.view === view;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        [elements.viewAll, elements.viewFocus, elements.viewDashboard].forEach((panel) => {
            const isActive = panel.id === `view-${view}`;
            panel.classList.toggle('active', isActive);
            panel.hidden = !isActive;
        });

        const showToolbar = view === 'all' || view === 'focus';
        elements.toolbar.style.display = showToolbar ? 'flex' : 'none';
        elements.taskFormSection.style.display = showToolbar ? 'block' : 'none';

        const statusGroup = elements.toolbar.querySelector('.filter-group-status');
        const priorityGroup = elements.toolbar.querySelector('.filter-group-priority');
        const sortGroup = elements.toolbar.querySelector('.filter-group-sort');

        if (view === 'all') {
            statusGroup.style.display = '';
            priorityGroup.style.display = '';
            sortGroup.style.display = '';
            elements.filterCategory.disabled = false;
            elements.filterPriority.disabled = false;
            elements.filterStatus.disabled = false;
            elements.sortBy.disabled = false;
        } else if (view === 'focus') {
            statusGroup.style.display = 'none';
            priorityGroup.style.display = 'none';
            sortGroup.style.display = 'none';
            elements.filterCategory.disabled = false;
            elements.filterPriority.disabled = true;
            elements.filterStatus.disabled = true;
            elements.sortBy.disabled = true;
        }

        render();
    }

    function resetAddForm() {
        elements.addTaskForm.reset();
        elements.addTaskForm.classList.add('collapsed');
        elements.toggleFormBtn.setAttribute('aria-expanded', 'false');
        elements.toggleFormBtn.textContent = '+ New Task';
        document.getElementById('taskPriority').value = 'medium';
        document.getElementById('taskCategory').value = 'Work';
    }

    function handleAddTask(event) {
        event.preventDefault();
        const title = document.getElementById('taskTitle').value.trim();
        if (!title) return;

        storage.createTask({
            title,
            priority: document.getElementById('taskPriority').value,
            category: document.getElementById('taskCategory').value,
            dueDate: document.getElementById('taskDueDate').value,
            note: document.getElementById('taskNote').value,
            recurrence: document.getElementById('taskRecurrence').value,
        });

        resetAddForm();
        setView('all');
        render();
    }

    function openEditDialog(id) {
        const task = storage.getTask(id);
        if (!task) return;

        elements.editTaskId.value = task.id;
        elements.editTaskTitle.value = task.title;
        elements.editTaskPriority.value = task.priority;
        elements.editTaskCategory.value = task.category;
        elements.editTaskDueDate.value = task.dueDate;
        elements.editTaskRecurrence.value = task.recurrence;
        elements.editTaskNote.value = task.note;

        elements.editDialog.showModal();
    }

    function closeEditDialogFn() {
        elements.editDialog.close();
        elements.editTaskForm.reset();
    }

    function handleEditTask(event) {
        event.preventDefault();
        const id = elements.editTaskId.value;
        if (!id) return;

        const title = elements.editTaskTitle.value.trim();
        if (!title) return;

        storage.updateTask(id, {
            title,
            priority: elements.editTaskPriority.value,
            category: elements.editTaskCategory.value,
            dueDate: elements.editTaskDueDate.value,
            recurrence: elements.editTaskRecurrence.value,
            note: elements.editTaskNote.value,
        });

        closeEditDialogFn();
        render();
    }

    function handleComplete(id, completed) {
        storage.completeTask(id, completed);
        render();
    }

    function handleDelete(id) {
        const task = storage.getTask(id);
        if (!task) return;
        if (!confirm(`Delete "${task.title}"?`)) return;
        storage.deleteTask(id);
        render();
    }

    function init() {
        if (!elements.tabAll || !elements.addTaskForm) {
            console.error('Required DOM elements not found');
            return;
        }

        elements.tabAll.addEventListener('click', () => setView('all'));
        elements.tabFocus.addEventListener('click', () => setView('focus'));
        elements.tabDashboard.addEventListener('click', () => setView('dashboard'));

        elements.toggleFormBtn.addEventListener('click', () => {
            const isCollapsed = elements.addTaskForm.classList.toggle('collapsed');
            elements.toggleFormBtn.setAttribute('aria-expanded', (!isCollapsed).toString());
            elements.toggleFormBtn.textContent = isCollapsed ? '+ New Task' : 'Hide form';
        });

        elements.cancelFormBtn.addEventListener('click', resetAddForm);
        elements.addTaskForm.addEventListener('submit', handleAddTask);

        elements.searchInput.addEventListener('input', (event) => {
            state.search = event.target.value;
            render();
        });

        elements.filterStatus.addEventListener('change', (event) => {
            state.filters.status = event.target.value;
            render();
        });

        elements.filterCategory.addEventListener('change', (event) => {
            state.filters.category = event.target.value;
            render();
        });

        elements.filterPriority.addEventListener('change', (event) => {
            state.filters.priority = event.target.value;
            render();
        });

        elements.sortBy.addEventListener('change', (event) => {
            state.sort = event.target.value;
            render();
        });

        elements.editTaskForm.addEventListener('submit', handleEditTask);
        elements.closeEditDialog.addEventListener('click', closeEditDialogFn);
        elements.editDialog.addEventListener('click', (event) => {
            if (event.target === elements.editDialog) {
                closeEditDialogFn();
            }
        });

        setView('all');
    }

    init();
})();

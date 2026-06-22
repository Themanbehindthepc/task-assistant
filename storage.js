(function () {
    'use strict';

    const STORAGE_KEY = 'taskAssistant.tasks.v1';

    const CATEGORIES = ['Work', 'Personal', 'Health', 'Learning', 'Other'];
    const PRIORITIES = ['low', 'medium', 'high'];

    function generateId() {
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    }

    function now() {
        return new Date().toISOString();
    }

    function readTasks() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Failed to load tasks from storage:', error);
            return [];
        }
    }

    function writeTasks(tasks) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (error) {
            console.error('Failed to save tasks to storage:', error);
        }
    }

    function validateTask(data) {
        if (!data || typeof data.title !== 'string' || data.title.trim() === '') {
            throw new Error('Task title is required');
        }
        return {
            title: data.title.trim(),
            priority: PRIORITIES.includes(data.priority) ? data.priority : 'medium',
            category: CATEGORIES.includes(data.category) ? data.category : 'Other',
            dueDate: data.dueDate || '',
            note: typeof data.note === 'string' ? data.note.trim() : '',
            recurrence: ['none', 'daily', 'weekly'].includes(data.recurrence) ? data.recurrence : 'none',
            completed: Boolean(data.completed),
            createdAt: data.createdAt || now(),
            updatedAt: now(),
        };
    }

    function createTask(data) {
        const tasks = readTasks();
        const validated = validateTask(data);
        const newTask = { id: generateId(), ...validated };
        tasks.unshift(newTask);
        writeTasks(tasks);
        return newTask;
    }

    function updateTask(id, updates) {
        const tasks = readTasks();
        const index = tasks.findIndex((task) => task.id === id);
        if (index === -1) return null;

        const existing = tasks[index];
        const merged = validateTask({ ...existing, ...updates, createdAt: existing.createdAt });
        tasks[index] = { id, ...merged };
        writeTasks(tasks);
        return tasks[index];
    }

    function deleteTask(id) {
        const tasks = readTasks();
        const filtered = tasks.filter((task) => task.id !== id);
        if (filtered.length === tasks.length) return false;
        writeTasks(filtered);
        return true;
    }

    function advanceDate(dateString, recurrence) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '';
        if (recurrence === 'daily') {
            date.setDate(date.getDate() + 1);
        } else if (recurrence === 'weekly') {
            date.setDate(date.getDate() + 7);
        } else {
            return dateString;
        }
        return date.toISOString().slice(0, 10);
    }

    function completeTask(id, completed) {
        const tasks = readTasks();
        const index = tasks.findIndex((task) => task.id === id);
        if (index === -1) return null;

        const task = tasks[index];
        if (Boolean(completed) === Boolean(task.completed)) {
            return task;
        }

        if (completed && task.recurrence !== 'none' && task.dueDate) {
            const nextDueDate = advanceDate(task.dueDate, task.recurrence);
            const nextTask = validateTask({
                title: task.title,
                priority: task.priority,
                category: task.category,
                dueDate: nextDueDate,
                note: task.note,
                recurrence: task.recurrence,
                completed: false,
            });
            tasks.unshift({ id: generateId(), ...nextTask });
        }

        task.completed = Boolean(completed);
        task.updatedAt = now();
        writeTasks(tasks);
        return task;
    }

    function getTask(id) {
        return readTasks().find((task) => task.id === id) || null;
    }

    function clearAll() {
        writeTasks([]);
    }

    window.TaskStorage = {
        CATEGORIES,
        PRIORITIES,
        readTasks,
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        getTask,
        clearAll,
    };
})();

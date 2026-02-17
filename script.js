
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const categorySelect = document.getElementById('categorySelect');
const prioritySelect = document.getElementById('prioritySelect');
const dueDate = document.getElementById('dueDate');
const taskNotes = document.getElementById('taskNotes');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const exportBtn = document.getElementById('exportBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const themeSelect = document.getElementById('themeSelect');
const totalTasksSpan = document.getElementById('totalTasks');
const completedTasksSpan = document.getElementById('completedTasks');
const remainingTasksSpan = document.getElementById('remainingTasks');
const completionRateSpan = document.getElementById('completionRate');
const currentStreakSpan = document.getElementById('currentStreak');
const totalTimeSpan = document.getElementById('totalTime');

const STORAGE_KEY = 'taskManagerTasks';
const THEME_KEY = 'taskManagerTheme';
const DARK_MODE_KEY = 'taskManagerDarkMode';
const LAST_COMPLETION_KEY = 'taskManagerLastCompletion';

let currentFilter = 'all';
let currentSearchTerm = '';

class Task {
    constructor(
        id,
        text,
        completed = false,
        createdAt = new Date(),
        category = 'other',
        priority = 'medium',
        dueDate = null,
        notes = '',
        timeTracked = 0
    ) {
        this.id = id;
        this.text = text;
        this.completed = completed;
        this.createdAt = createdAt;
        this.completedAt = null;
        this.category = category;
        this.priority = priority;
        this.dueDate = dueDate;
        this.notes = notes;
        this.timeTracked = timeTracked; 
        this.timerStarted = null; 
    }

    toggle() {
        this.completed = !this.completed;
        if (this.completed) {
            this.completedAt = new Date();
        } else {
            this.completedAt = null;
        }
    }

    startTimer() {
        this.timerStarted = Date.now();
    }

    stopTimer() {
        if (this.timerStarted) {
            this.timeTracked += Date.now() - this.timerStarted;
            this.timerStarted = null;
        }
    }

    isTimerRunning() {
        return this.timerStarted !== null;
    }

    getFormattedTime() {
        const totalMs = this.timeTracked + (this.timerStarted ? Date.now() - this.timerStarted : 0);
        const hours = Math.floor(totalMs / (1000 * 60 * 60));
        const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }
}

class TaskManager {
    constructor() {
        this.tasks = this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return [];

            return JSON.parse(stored).map(task =>
                new Task(
                    task.id,
                    task.text,
                    task.completed,
                    new Date(task.createdAt),
                    task.category || 'other',
                    task.priority || 'medium',
                    task.dueDate || null,
                    task.notes || '',
                    task.timeTracked || 0
                )
            );
        } catch (error) {
            console.error('Error loading tasks from storage:', error);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving tasks to storage:', error);
        }
    }

    addTask(text, category = 'other', priority = 'medium', dueDate = null, notes = '') {
        if (!text || text.trim() === '') {
            return null;
        }

        const id = Date.now();
        const task = new Task(id, text.trim(), false, new Date(), category, priority, dueDate, notes);
        this.tasks.unshift(task);
        this.saveToStorage();
        return task;
    }

    deleteTask(id) {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index > -1) {
            this.tasks.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.toggle();
            this.saveToStorage();
            return true;
        }
        return false;
    }

    clearCompleted() {
        const initialLength = this.tasks.length;
        this.tasks = this.tasks.filter(task => !task.completed);
        if (this.tasks.length < initialLength) {
            this.saveToStorage();
            return true;
        }
        return false;
    }

    getAllTasks() {
        return [...this.tasks];
    }

    searchTasks(searchTerm) {
        if (!searchTerm.trim()) return this.tasks;
        const term = searchTerm.toLowerCase();
        return this.tasks.filter(task =>
            task.text.toLowerCase().includes(term) ||
            task.notes.toLowerCase().includes(term)
        );
    }

    filterTasks(filter) {
        const today = new Date().toDateString();
        
        switch (filter) {
            case 'active':
                return this.tasks.filter(t => !t.completed);
            case 'completed':
                return this.tasks.filter(t => t.completed);
            case 'high':
                return this.tasks.filter(t => t.priority === 'high');
            case 'today':
                return this.tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === today);
            default:
                return this.tasks;
        }
    }

    getStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const remaining = total - completed;
        const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        const lastCompletion = localStorage.getItem(LAST_COMPLETION_KEY);
        const today = new Date().toDateString();
        let streak = 0;
        
        if (lastCompletion === today) {
            streak = parseInt(localStorage.getItem('taskManagerStreak') || '0') + 1;
        } else {
            streak = 1;
        }

        const totalTime = this.tasks.reduce((sum, task) => sum + task.timeTracked, 0);
        const hours = Math.floor(totalTime / (1000 * 60 * 60));
        const minutes = Math.floor((totalTime % (1000 * 60 * 60)) / (1000 * 60));

        return { total, completed, remaining, completionRate, streak, hours, minutes };
    }
}

const taskManager = new TaskManager();

function getCategoryEmoji(category) {
    const emojis = {
        work: '📊',
        personal: '👤',
        shopping: '🛒',
        health: '💪',
        learning: '📚',
        other: '📌'
    };
    return emojis[category] || '📌';
}

function getCategoryLabel(category) {
    const labels = {
        work: 'Work',
        personal: 'Personal',
        shopping: 'Shopping',
        health: 'Health',
        learning: 'Learning',
        other: 'Other'
    };
    return labels[category] || 'Other';
}

function getPriorityEmoji(priority) {
    const emojis = { high: '🔴', medium: '🟡', low: '🟢' };
    return emojis[priority] || '🟡';
}

function renderTasks() {
    let tasks = taskManager.getAllTasks();

    if (currentSearchTerm) {
        tasks = taskManager.searchTasks(currentSearchTerm);
    }

    tasks = taskManager.filterTasks(currentFilter);

    if (currentSearchTerm) {
        tasks = tasks.filter(task =>
            task.text.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
            task.notes.toLowerCase().includes(currentSearchTerm.toLowerCase())
        );
    }

    taskList.innerHTML = '';

    if (tasks.length === 0) {
        emptyState.style.display = 'block';
        taskList.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        taskList.style.display = 'flex';

        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            taskList.appendChild(taskElement);
        });
    }

    updateStats();
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.setAttribute('role', 'listitem');
    li.setAttribute('data-task-id', task.id);

    const dateStr = formatDate(task.createdAt);
    const dueDateStr = task.dueDate ? formatDueDate(task.dueDate) : null;
    const categoryBadge = `<span class="category-badge badge-${task.category}">${getCategoryEmoji(task.category)} ${getCategoryLabel(task.category)}</span>`;
    const priorityBadge = `<span class="priority-badge priority-${task.priority}">${getPriorityEmoji(task.priority)} ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>`;
    const dueDateDisplay = dueDateStr ? `<span class="task-date" title="Due: ${dueDateStr}">📅 ${dueDateStr}</span>` : '';
    const notesDisplay = task.notes ? `<div class="task-notes-display">📝 ${escapeHtml(task.notes)}</div>` : '';
    const timerDisplay = `<button class="btn-timer ${task.isTimerRunning() ? 'active' : ''}" title="Toggle timer">⏱️ ${task.getFormattedTime()}</button>`;

    li.innerHTML = `
        <div class="task-header">
            <input 
                type="checkbox" 
                class="task-checkbox" 
                ${task.completed ? 'checked' : ''}
                aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}"
            >
            <div class="task-content">
                <div class="task-top">
                    <span class="task-text">${escapeHtml(task.text)}</span>
                    ${priorityBadge}
                    ${categoryBadge}
                </div>
                <div class="task-meta">
                    <span class="task-date">⏰ ${dateStr}</span>
                    ${dueDateDisplay}
                    ${timerDisplay}
                </div>
                ${notesDisplay}
            </div>
        </div>
        <div class="task-actions">
            <button 
                class="btn btn-danger" 
                aria-label="Delete task: ${escapeHtml(task.text)}"
                title="Delete task"
            >
                Delete
            </button>
        </div>
    `;

    const checkbox = li.querySelector('.task-checkbox');
    const deleteBtn = li.querySelector('.btn-danger');
    const timerBtn = li.querySelector('.btn-timer');

    checkbox.addEventListener('change', () => {
        taskManager.toggleTask(task.id);
        renderTasks();
    });

    deleteBtn.addEventListener('click', () => {
        taskManager.deleteTask(task.id);
        li.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            renderTasks();
        }, 300);
    });

    timerBtn.addEventListener('click', () => {
        task.isTimerRunning() ? task.stopTimer() : task.startTimer();
        taskManager.saveToStorage();
        renderTasks();
    });

    return li;
}

function updateStats() {
    const stats = taskManager.getStats();
    totalTasksSpan.textContent = stats.total;
    completedTasksSpan.textContent = stats.completed;
    remainingTasksSpan.textContent = stats.remaining;
    completionRateSpan.textContent = stats.completionRate + '%';
    currentStreakSpan.textContent = stats.streak + ' 🔥';
    totalTimeSpan.textContent = `${stats.hours}h ${stats.minutes}m`;

    clearCompletedBtn.disabled = stats.completed === 0;
}

function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateObj = new Date(date);
    const dateString = dateObj.toLocaleDateString();
    const todayString = today.toLocaleDateString();
    const yesterdayString = yesterday.toLocaleDateString();

    if (dateString === todayString) {
        return `Today at ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (dateString === yesterdayString) {
        return `Yesterday at ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return dateObj.toLocaleDateString([], { year: '2-digit', month: 'short', day: 'numeric' });
    }
}

function formatDueDate(dueDateStr) {
    if (!dueDateStr) return null;
    const date = new Date(dueDateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function applyTheme(theme) {
    const root = document.documentElement;
    root.className = root.className.replace(/theme-\w+/, '');
    if (theme !== 'indigo') {
        root.classList.add(`theme-${theme}`);
    }
    localStorage.setItem(THEME_KEY, theme);
    themeSelect.value = theme;
}

function toggleDarkMode() {
    const root = document.documentElement;
    const isDarkMode = root.classList.toggle('dark-mode');
    localStorage.setItem(DARK_MODE_KEY, isDarkMode);
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
}

function loadTheme() {
    const theme = localStorage.getItem(THEME_KEY) || 'indigo';
    const isDarkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
    
    applyTheme(theme);
    
    if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    }
}

function exportTasks() {
    const tasks = taskManager.getAllTasks();
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showFeedback('Tasks exported successfully!', 'success');
}

function showFeedback(message, type = 'info') {
    const feedback = document.createElement('div');
    feedback.className = `feedback feedback-${type}`;
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.textContent = message;

    document.body.appendChild(feedback);

    requestAnimationFrame(() => {
        feedback.style.opacity = '1';
    });

    setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
            feedback.remove();
        }, 300);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    .feedback {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease-out;
        max-width: 300px;
        box-shadow: var(--shadow-lg);
    }

    .feedback-success {
        background-color: var(--success-color);
        color: white;
    }

    .feedback-error {
        background-color: var(--danger-color);
        color: white;
    }

    .feedback-info {
        background-color: var(--primary-color);
        color: white;
    }

    @media (max-width: 480px) {
        .feedback {
            bottom: 16px;
            right: 16px;
            left: 16px;
            max-width: none;
        }
    }
`;
document.head.appendChild(style);
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const text = taskInput.value.trim();
    const category = categorySelect.value;
    const priority = prioritySelect.value;
    const dueDateValue = dueDate.value || null;
    const notesValue = taskNotes.value.trim();

    if (!text) {
        taskInput.setAttribute('aria-invalid', 'true');
        taskInput.focus();
        return;
    }

    taskInput.setAttribute('aria-invalid', 'false');

    const task = taskManager.addTask(text, category, priority, dueDateValue, notesValue);

    if (task) {
        taskInput.value = '';
        categorySelect.value = 'other';
        prioritySelect.value = 'medium';
        dueDate.value = '';
        taskNotes.value = '';
        taskInput.focus();

        renderTasks();
        showFeedback('Task added successfully!', 'success');
    }
});

taskInput.addEventListener('focus', () => {
    taskInput.setAttribute('aria-invalid', 'false');
});

clearCompletedBtn.addEventListener('click', () => {
    const count = taskManager.getStats().completed;

    if (count === 0) return;

    if (confirm(`Are you sure you want to delete ${count} completed task${count !== 1 ? 's' : ''}?`)) {
        taskManager.clearCompleted();
        renderTasks();
        showFeedback('Completed tasks cleared!', 'success');
    }
});

searchInput.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value;
    renderTasks();
});

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        renderTasks();
    });
});

exportBtn.addEventListener('click', exportTasks);

darkModeToggle.addEventListener('click', toggleDarkMode);

themeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
});

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        taskInput.focus();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    renderTasks();
    taskInput.focus();
});

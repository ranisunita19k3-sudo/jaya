// Initialize variables
const taskInput = document.getElementById('taskInput');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const tasksList = document.getElementById('tasksList');
const prioritySelect = document.getElementById('prioritySelect');
const categorySelect = document.getElementById('categorySelect');
const searchInput = document.getElementById('searchInput');
const clearCompleted = document.getElementById('clearCompleted');
const deleteAll = document.getElementById('deleteAll');
const exportTasks = document.getElementById('exportTasks');
const importTasks = document.getElementById('importTasks');
const importInput = document.getElementById('importInput');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.querySelector('.close-modal');
const toast = document.getElementById('toast');

let tasks = [];
let currentFilter = 'all';
let currentCategoryFilter = 'all';
let currentSearchTerm = '';
let currentSort = 'none';
let editingTaskId = null;

// Load tasks from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderTasks();
    updateStats();
    checkOverdueTasks();
});

// Add task event listener
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

// Category filter buttons
document.querySelectorAll('.category-tag').forEach(tag => {
    tag.addEventListener('click', () => {
        document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        currentCategoryFilter = tag.dataset.category;
        renderTasks();
    });
});

// Search functionality
searchInput.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value.toLowerCase();
    renderTasks();
});

// Sort buttons
document.getElementById('sortPriority').addEventListener('click', () => {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    currentSort = 'priority';
    saveTasks();
    renderTasks();
    showToast('Sorted by priority', 'info');
});

document.getElementById('sortDate').addEventListener('click', () => {
    tasks.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
        return dateA - dateB;
    });
    currentSort = 'date';
    saveTasks();
    renderTasks();
    showToast('Sorted by due date', 'info');
});

document.getElementById('sortRecent').addEventListener('click', () => {
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    currentSort = 'recent';
    saveTasks();
    renderTasks();
    showToast('Sorted by most recent', 'info');
});

// Clear completed and delete all
clearCompleted.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all completed tasks?')) {
        const initialCount = tasks.length;
        tasks = tasks.filter(task => !task.completed);
        if (tasks.length < initialCount) {
            saveTasks();
            renderTasks();
            updateStats();
            showToast('Completed tasks cleared', 'success');
        } else {
            showToast('No completed tasks to clear', 'info');
        }
    }
});

deleteAll.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL tasks? This cannot be undone!')) {
        tasks = [];
        saveTasks();
        renderTasks();
        updateStats();
        showToast('All tasks deleted', 'success');
    }
});

// Export tasks
exportTasks.addEventListener('click', () => {
    if (tasks.length === 0) {
        showToast('No tasks to export', 'info');
        return;
    }
    
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Tasks exported successfully', 'success');
});

// Import tasks
importTasks.addEventListener('click', () => {
    importInput.click();
});

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedTasks = JSON.parse(event.target.result);
            if (Array.isArray(importedTasks)) {
                if (confirm(`Import ${importedTasks.length} tasks? Existing tasks will be kept.`)) {
                    tasks = [...tasks, ...importedTasks];
                    saveTasks();
                    renderTasks();
                    updateStats();
                    showToast(`Imported ${importedTasks.length} tasks successfully`, 'success');
                }
            } else {
                showToast('Invalid file format', 'error');
            }
        } catch (error) {
            showToast('Error importing tasks', 'error');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    importInput.value = '';
});

// Modal handlers
closeModal.addEventListener('click', closeEditModal);
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeEditModal();
    }
});

document.querySelector('.btn-cancel').addEventListener('click', closeEditModal);

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEditedTask();
});

// Auto-check for overdue tasks periodically
setInterval(checkOverdueTasks, 60000); // Check every minute

// Add task function
function addTask() {
    const taskText = taskInput.value.trim();
    
    if (taskText === '') {
        showToast('Please enter a task', 'error');
        taskInput.focus();
        return;
    }
    
    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        priority: prioritySelect.value,
        category: categorySelect.value,
        dueDate: dueDateInput.value || null,
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    tasks.unshift(task);
    saveTasks();
    renderTasks();
    updateStats();
    checkOverdueTasks();
    
    // Clear input
    taskInput.value = '';
    dueDateInput.value = '';
    taskInput.focus();
    
    showToast('Task added successfully', 'success');
}

// Toggle task completion
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.updatedAt = new Date().toISOString();
        saveTasks();
        renderTasks();
        updateStats();
        const message = task.completed ? 'Task completed' : 'Task marked as active';
        showToast(message, 'success');
    }
}

// Edit task function
function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        editingTaskId = id;
        document.getElementById('editTaskInput').value = task.text;
        document.getElementById('editDueDate').value = task.dueDate || '';
        document.getElementById('editPriority').value = task.priority;
        document.getElementById('editCategory').value = task.category;
        document.getElementById('editNotes').value = task.notes || '';
        editModal.classList.add('show');
    }
}

// Save edited task
function saveEditedTask() {
    const task = tasks.find(t => t.id === editingTaskId);
    if (task) {
        task.text = document.getElementById('editTaskInput').value.trim();
        task.dueDate = document.getElementById('editDueDate').value || null;
        task.priority = document.getElementById('editPriority').value;
        task.category = document.getElementById('editCategory').value;
        task.notes = document.getElementById('editNotes').value.trim();
        task.updatedAt = new Date().toISOString();
        saveTasks();
        renderTasks();
        updateStats();
        checkOverdueTasks();
        closeEditModal();
        showToast('Task updated successfully', 'success');
    }
}

// Close edit modal
function closeEditModal() {
    editModal.classList.remove('show');
    editingTaskId = null;
}

// Delete task function
function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        updateStats();
        showToast('Task deleted', 'success');
    }
}

// Check if task is overdue
function isOverdue(dueDate, completed) {
    if (!dueDate || completed) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
}

// Check overdue tasks
function checkOverdueTasks() {
    const overdueTasks = tasks.filter(t => isOverdue(t.dueDate, t.completed));
    if (overdueTasks.length > 0 && currentFilter !== 'overdue') {
        // Optionally show notification
    }
}

// Render tasks
function renderTasks() {
    let filteredTasks = [...tasks];
    
    // Apply status filter
    if (currentFilter === 'active') {
        filteredTasks = filteredTasks.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.completed);
    } else if (currentFilter === 'overdue') {
        filteredTasks = filteredTasks.filter(t => isOverdue(t.dueDate, t.completed));
    }
    
    // Apply category filter
    if (currentCategoryFilter !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.category === currentCategoryFilter);
    }
    
    // Apply search filter
    if (currentSearchTerm) {
        filteredTasks = filteredTasks.filter(t => 
            t.text.toLowerCase().includes(currentSearchTerm) ||
            (t.notes && t.notes.toLowerCase().includes(currentSearchTerm))
        );
    }
    
    // Render
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No tasks found</h3>
                <p>${currentSearchTerm ? 'Try adjusting your search' : 'Add a new task to get started!'}</p>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = filteredTasks.map(task => {
        const isTaskOverdue = isOverdue(task.dueDate, task.completed);
        const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${isTaskOverdue ? 'overdue' : ''}">
                <div class="task-priority ${task.priority}"></div>
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    ${task.completed ? 'checked' : ''}
                    onchange="toggleTask(${task.id})"
                >
                <div class="task-content">
                    <div class="task-text">${escapeHtml(task.text)}</div>
                    <div class="task-meta">
                        <span class="task-category">
                            <i class="fas fa-tag"></i>
                            ${getCategoryLabel(task.category)}
                        </span>
                        ${task.dueDate ? `
                            <span class="task-date ${isTaskOverdue ? 'overdue' : ''}">
                                <i class="fas fa-calendar-alt"></i>
                                ${formattedDate}
                                ${isTaskOverdue ? '<span style="margin-left: 4px; font-weight: bold;">⚠️ Overdue</span>' : ''}
                            </span>
                        ` : ''}
                    </div>
                    ${task.notes ? `<div class="task-notes"><strong>Notes:</strong> ${escapeHtml(task.notes)}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button class="task-btn edit" onclick="editTask(${task.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-btn delete" onclick="deleteTask(${task.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Update statistics
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const remaining = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('remainingTasks').textContent = remaining;
    document.getElementById('completionPercentage').textContent = percentage + '%';
    
    // Update progress circle
    const circumference = 2 * Math.PI * 27;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const progressCircle = document.getElementById('progressCircle');
    if (progressCircle) {
        progressCircle.style.strokeDashoffset = strokeDashoffset;
    }
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Load tasks from localStorage
function loadTasks() {
    const saved = localStorage.getItem('tasks');
    if (saved) {
        try {
            tasks = JSON.parse(saved);
        } catch (e) {
            tasks = [];
            console.error('Error loading tasks:', e);
        }
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Get category label
function getCategoryLabel(category) {
    const labels = {
        work: 'Work',
        personal: 'Personal',
        shopping: 'Shopping',
        health: 'Health',
        other: 'Other'
    };
    return labels[category] || category;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
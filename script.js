// ===== Application State =====
let todos = [];
let notes = [];
let timerState = {
    isRunning: false,
    isPaused: false,
    currentTime: 25 * 60,
    isBreak: false,
    sessionsCompleted: 0,
    focusMinutes: 0
};

const buzzerAudio = new Audio('buzzer.mp3');
buzzerAudio.preload = 'auto';

let timerInterval;
let currentFilter = 'all';
let currentNoteId = null;
let currentTaskType = 'daily';
let currentUser = null;

// ===== Authentication State =====
const users = JSON.parse(localStorage.getItem('productivepro_users')) || {};

// ===== DOM Elements =====
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const userBtn = document.getElementById('user-btn');
const userDropdown = document.getElementById('user-dropdown');
const userNameSpan = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');
const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const importFile = document.getElementById('import-file');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const todoInput = document.getElementById('todo-input');
const todoDescription = document.getElementById('todo-description');
const todoPriority = document.getElementById('todo-priority');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const totalTasksSpan = document.getElementById('total-tasks');
const completedTasksSpan = document.getElementById('completed-tasks');
const dailyTasksSpan = document.getElementById('daily-tasks');
const progressTasksSpan = document.getElementById('progress-tasks');
const taskTypeBtns = document.querySelectorAll('.task-type-btn');
const progressInput = document.getElementById('progress-input');
const totalStepsInput = document.getElementById('total-steps');

const addNoteBtn = document.getElementById('add-note-btn');
const notesGrid = document.getElementById('notes-grid');
const noteModal = document.getElementById('note-modal');
const modalClose = document.getElementById('modal-close');
const noteTitle = document.getElementById('note-title');
const noteContent = document.getElementById('note-content');
const saveNoteBtn = document.getElementById('save-note');
const deleteNoteBtn = document.getElementById('delete-note');

const timerDisplay = document.getElementById('timer-display');
const timerMode = document.getElementById('timer-mode');
const timerStartBtn = document.getElementById('timer-start');
const timerPauseBtn = document.getElementById('timer-pause');
const timerResetBtn = document.getElementById('timer-reset');
const focusTimeInput = document.getElementById('focus-time');
const breakTimeInput = document.getElementById('break-time');
const sessionsCompletedSpan = document.getElementById('sessions-completed');
const focusMinutesSpan = document.getElementById('focus-minutes');
const progressRing = document.querySelector('.progress-ring-progress');

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('ProductivePro initialized');
    checkAuthStatus();
    setupAuthEventListeners();
});

function checkAuthStatus() {
    const savedUser = localStorage.getItem('productivepro_current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        loadUserData();
        showMainApp();
    } else {
        showAuthScreen();
    }
}

function showAuthScreen() {
    authScreen.style.display = 'flex';
    mainApp.style.display = 'none';
    setupAuthEventListeners();
}

function showMainApp() {
    authScreen.style.display = 'none';
    mainApp.style.display = 'block';
    userNameSpan.textContent = currentUser.name;
    initializeApp();
}

function initializeApp() {
    setupEventListeners();
    resetDailyTasks();
    renderTodos();
    renderNotes();
    updateTimerDisplay();
    updateStats();
    setupProgressRing();
    selectTaskType('daily');
}

// ===== Authentication Functions =====
function setupAuthEventListeners() {
    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showSignup();
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });

    loginForm.querySelector('form').addEventListener('submit', handleLogin);
    signupForm.querySelector('form').addEventListener('submit', handleSignup);

    userBtn.addEventListener('click', toggleUserDropdown);
    logoutBtn.addEventListener('click', handleLogout);
    exportDataBtn.addEventListener('click', exportUserData);
    importDataBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importUserData);

    document.addEventListener('click', (e) => {
        if (!userBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });
}

function showSignup() {
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
}

function showLogin() {
    signupForm.classList.remove('active');
    loginForm.classList.add('active');
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    const user = users[email];
    if (!user || user.password !== password) {
        showNotification('Invalid email or password', 'error');
        return;
    }

    currentUser = { email: user.email, name: user.name };
    localStorage.setItem('productivepro_current_user', JSON.stringify(currentUser));
    loadUserData();
    showMainApp();
    showNotification(`Welcome back, ${user.name}!`, 'success');
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (!name || !email || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    if (users[email]) {
        showNotification('Email already exists', 'error');
        return;
    }

    users[email] = {
        name: name,
        email: email,
        password: password,
        createdAt: new Date().toISOString(),
        data: {
            todos: [],
            notes: [],
            timerState: {
                sessionsCompleted: 0,
                focusMinutes: 0
            }
        }
    };

    localStorage.setItem('productivepro_users', JSON.stringify(users));
    
    currentUser = { email: email, name: name };
    localStorage.setItem('productivepro_current_user', JSON.stringify(currentUser));
    
    loadUserData();
    showMainApp();
    showNotification(`Account created successfully! Welcome, ${name}!`, 'success');
}

function handleLogout() {
    saveUserData();
    currentUser = null;
    localStorage.removeItem('productivepro_current_user');
    showAuthScreen();
    showNotification('Logged out successfully', 'success');
    
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('signup-name').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-confirm-password').value = '';
    
    showLogin();
}

function toggleUserDropdown() {
    userDropdown.classList.toggle('show');
}

// ===== Data Management =====
function loadUserData() {
    if (!currentUser) return;
    
    const user = users[currentUser.email];
    if (user && user.data) {
        todos = user.data.todos || [];
        notes = user.data.notes || [];
        timerState.sessionsCompleted = user.data.timerState?.sessionsCompleted || 0;
        timerState.focusMinutes = user.data.timerState?.focusMinutes || 0;
    } else {
        todos = [];
        notes = [];
        timerState.sessionsCompleted = 0;
        timerState.focusMinutes = 0;
    }
}

function saveUserData() {
    if (!currentUser || !users[currentUser.email]) return;
    
    users[currentUser.email].data = {
        todos: todos,
        notes: notes,
        timerState: {
            sessionsCompleted: timerState.sessionsCompleted,
            focusMinutes: timerState.focusMinutes
        }
    };
    
    localStorage.setItem('productivepro_users', JSON.stringify(users));
}

function exportUserData() {
    if (!currentUser) return;
    
    const data = {
        user: currentUser,
        todos: todos,
        notes: notes,
        timerState: {
            sessionsCompleted: timerState.sessionsCompleted,
            focusMinutes: timerState.focusMinutes
        },
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `productivepro-${currentUser.name}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully!', 'success');
}

function importUserData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('This will replace all your current data. Are you sure?')) {
                todos = data.todos || [];
                notes = data.notes || [];
                timerState.sessionsCompleted = data.timerState?.sessionsCompleted || 0;
                timerState.focusMinutes = data.timerState?.focusMinutes || 0;
                
                saveUserData();
                renderTodos();
                renderNotes();
                updateStats();
                
                showNotification('Data imported successfully!', 'success');
            }
        } catch (error) {
            showNotification('Error importing data. Please check the file format.', 'error');
        }
    };
    reader.readAsText(file);
    
    event.target.value = '';
}

// ===== Event Listeners =====
function setupEventListeners() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    taskTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => selectTaskType(btn.dataset.type));
    });

    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    addNoteBtn.addEventListener('click', () => openNoteModal());
    modalClose.addEventListener('click', closeNoteModal);
    saveNoteBtn.addEventListener('click', saveNote);
    deleteNoteBtn.addEventListener('click', deleteNote);

    noteModal.addEventListener('click', (e) => {
        if (e.target === noteModal) closeNoteModal();
    });

    timerStartBtn.addEventListener('click', startTimer);
    timerPauseBtn.addEventListener('click', pauseTimer);
    timerResetBtn.addEventListener('click', resetTimer);
    focusTimeInput.addEventListener('change', updateTimerSettings);
    breakTimeInput.addEventListener('change', updateTimerSettings);
}

// ===== Tab Navigation =====
function switchTab(tabName) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
}

// ===== Task Type Selection =====
function selectTaskType(type) {
    currentTaskType = type;
    taskTypeBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    if (type === 'descriptive') {
        todoDescription.style.display = 'block';
        progressInput.style.display = 'block';
        todoDescription.placeholder = 'Describe the task steps...';
    } else {
        todoDescription.style.display = 'none';
        progressInput.style.display = 'none';
    }
    
    switch(type) {
        case 'daily':
            todoInput.placeholder = 'Add a daily task (resets every day)...';
            break;
        case 'onetime':
            todoInput.placeholder = 'Add a one-time task...';
            break;
        case 'descriptive':
            todoInput.placeholder = 'Add a progress-based task...';
            break;
    }
}

// ===== Todo Functions =====
function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    const todo = {
        id: Date.now(),
        text: text,
        description: todoDescription.value.trim() || '',
        completed: false,
        priority: todoPriority.value,
        type: currentTaskType,
        createdAt: new Date().toLocaleString(),
        lastReset: currentTaskType === 'daily' ? new Date().toDateString() : null,
        currentStep: 0,
        totalSteps: currentTaskType === 'descriptive' ? (parseInt(totalStepsInput.value) || 5) : 1
    };

    todos.unshift(todo);
    saveUserData();
    todoInput.value = '';
    todoDescription.value = '';
    totalStepsInput.value = '5';
    renderTodos();
    updateStats();

    setTimeout(() => {
        const newTodoElement = document.querySelector('.todo-item');
        if (newTodoElement) {
            newTodoElement.classList.add('bounce');
        }
    }, 100);
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo && todo.type !== 'descriptive') {
        todo.completed = !todo.completed;
        saveUserData();
        renderTodos();
        updateStats();
        showNotification(todo.completed ? 'Task completed! 🎉' : 'Task marked as pending', 'success');
    }
}

function incrementProgress(id) {
    const todo = todos.find(t => t.id === id);
    if (todo && todo.type === 'descriptive' && todo.currentStep < todo.totalSteps) {
        todo.currentStep++;
        if (todo.currentStep === todo.totalSteps) {
            todo.completed = true;
            showNotification('Task completed! 🎉', 'success');
        } else {
            showNotification(`Progress: ${todo.currentStep}/${todo.totalSteps} steps`, 'info');
        }
        saveUserData();
        renderTodos();
        updateStats();
    }
}

function decrementProgress(id) {
    const todo = todos.find(t => t.id === id);
    if (todo && todo.type === 'descriptive' && todo.currentStep > 0) {
        todo.currentStep--;
        todo.completed = false;
        saveUserData();
        renderTodos();
        updateStats();
        showNotification(`Progress: ${todo.currentStep}/${todo.totalSteps} steps`, 'info');
    }
}

function deleteTodo(id) {
    console.log('deleteTodo function executing with ID:', id);
    const todo = todos.find(t => t.id === id);
    console.log('Found todo:', todo);
    
    if (todo) {
        if (confirm(`Are you sure you want to delete "${todo.text}"?`)) {
            console.log('User confirmed deletion');
            todos = todos.filter(t => t.id !== id);
            saveUserData();
            renderTodos();
            updateStats();
            showNotification('Task deleted successfully', 'success');
            console.log('Task deleted successfully');
        } else {
            console.log('User cancelled deletion');
        }
    } else {
        console.error('Todo not found with ID:', id);
    }
}

function editTodo(id) {
    console.log('editTodo function executing with ID:', id);
    const todo = todos.find(t => t.id === id);
    console.log('Found todo:', todo);
    
    if (todo) {
        const newText = prompt('Edit task:', todo.text);
        console.log('New text from prompt:', newText);
        
        if (newText && newText.trim() !== '' && newText.trim() !== todo.text) {
            todo.text = newText.trim();
            
            // Allow editing description for descriptive tasks
            if (todo.type === 'descriptive') {
                const newDescription = prompt('Edit description (optional):', todo.description || '');
                if (newDescription !== null) {
                    todo.description = newDescription.trim();
                }
            }
            
            saveUserData();
            renderTodos();
            showNotification('Task updated successfully', 'success');
            console.log('Task updated successfully');
        } else {
            console.log('No changes made to task');
        }
    } else {
        console.error('Todo not found with ID:', id);
    }
    
}

function resetDailyTasks() {
    const today = new Date().toDateString();
    let hasChanges = false;
    
    todos.forEach(todo => {
        if (todo.type === 'daily' && todo.lastReset !== today) {
            todo.completed = false;
            todo.lastReset = today;
            hasChanges = true;
        }
    });
    
    if (hasChanges) {
        saveUserData();
        renderTodos();
        updateStats();
    }
}

function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    renderTodos();
}

function renderTodos() {
    let filteredTodos = todos;

    switch(currentFilter) {
        case 'completed':
            filteredTodos = todos.filter(t => t.completed);
            break;
        case 'pending':
            filteredTodos = todos.filter(t => !t.completed);
            break;
        case 'daily':
            filteredTodos = todos.filter(t => t.type === 'daily');
            break;
        case 'onetime':
            filteredTodos = todos.filter(t => t.type === 'onetime');
            break;
        case 'descriptive':
            filteredTodos = todos.filter(t => t.type === 'descriptive');
            break;
    }

    todoList.innerHTML = '';

    if (filteredTodos.length === 0) {
        todoList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <h3>No tasks found</h3>
                <p>Add a new task to get started!</p>
            </div>
        `;
        return;
    }

    filteredTodos.forEach(todo => {
        const todoElement = document.createElement('div');
        const typeClass = todo.type ? `${todo.type}-task` : '';
        todoElement.className = `todo-item ${todo.completed ? 'completed' : ''} ${todo.priority}-priority ${typeClass}`;
        
        let progressHTML = '';
        let checkboxHTML = '';
        
        // Checkbox for non-descriptive tasks
        if (todo.type !== 'descriptive') {
            checkboxHTML = `<input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="handleToggleTodo(${todo.id})">`;
        }
        
        // Progress bar for descriptive tasks
        if (todo.type === 'descriptive') {
            const progressPercent = (todo.currentStep / todo.totalSteps) * 100;
            progressHTML = `
                <div class="todo-progress">
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-controls">
                            <button class="progress-btn" onclick="handleDecrementProgress(${todo.id})" title="Previous step" ${todo.currentStep === 0 ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="progress-text">${todo.currentStep}/${todo.totalSteps}</span>
                            <button class="progress-btn" onclick="handleIncrementProgress(${todo.id})" title="Next step" ${todo.currentStep === todo.totalSteps ? 'disabled' : ''}>
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        todoElement.innerHTML = `
            ${checkboxHTML}
            <div class="todo-content">
                <div class="todo-text">${todo.text}</div>
                ${todo.description ? `<div class="todo-description">${todo.description}</div>` : ''}
                ${progressHTML}
            </div>
            <div class="todo-meta">
                <div class="todo-type ${todo.type}">${todo.type.charAt(0).toUpperCase() + todo.type.slice(1)}</div>
                <div class="todo-priority ${todo.priority}">${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}</div>
            </div>
            <div class="todo-actions">
                <button class="edit-btn" onclick="handleEditTodo(${todo.id})" title="Edit task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="handleDeleteTodo(${todo.id})" title="Delete task">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        todoList.appendChild(todoElement);
    });
}

// Add these wrapper functions right after your renderTodos function
function handleToggleTodo(id) {
    console.log('Toggle todo called with ID:', id);
    toggleTodo(id);
}

function handleEditTodo(id) {
    console.log('Edit todo called with ID:', id);
    editTodo(id);
}

function handleDeleteTodo(id) {
    console.log('Delete todo called with ID:', id);
    deleteTodo(id);
}

function handleIncrementProgress(id) {
    console.log('Increment progress called with ID:', id);
    incrementProgress(id);
}

function handleDecrementProgress(id) {
    console.log('Decrement progress called with ID:', id);
    decrementProgress(id);
}

function updateStats() {
    totalTasksSpan.textContent = todos.length;
    completedTasksSpan.textContent = todos.filter(t => t.completed).length;
    dailyTasksSpan.textContent = todos.filter(t => t.type === 'daily').length;
    progressTasksSpan.textContent = todos.filter(t => t.type === 'descriptive' && !t.completed).length;
    sessionsCompletedSpan.textContent = timerState.sessionsCompleted;
    focusMinutesSpan.textContent = timerState.focusMinutes;
}

// ===== Notes Functionality =====
function openNoteModal(noteId = null) {
    currentNoteId = noteId;
    
    if (noteId) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
            noteTitle.value = note.title;
            noteContent.value = note.content;
        }
    } else {
        noteTitle.value = '';
        noteContent.value = '';
    }

    noteModal.style.display = 'block';
    noteTitle.focus();
}

function closeNoteModal() {
    noteModal.style.display = 'none';
    currentNoteId = null;
}

function saveNote() {
    const title = noteTitle.value.trim() || 'Untitled Note';
    const content = noteContent.value.trim();

    if (!content) {
        showNotification('Please enter some content for the note.', 'error');
        return;
    }

    if (currentNoteId) {
        const note = notes.find(n => n.id === currentNoteId);
        if (note) {
            note.title = title;
            note.content = content;
            note.updatedAt = new Date().toLocaleString();
        }
    } else {
        const note = {
            id: Date.now(),
            title: title,
            content: content,
            createdAt: new Date().toLocaleString(),
            updatedAt: new Date().toLocaleString()
        };
        notes.unshift(note);
    }

    saveUserData();
    renderNotes();
    closeNoteModal();
}

function deleteNote() {
    if (currentNoteId && confirm('Are you sure you want to delete this note?')) {
        notes = notes.filter(n => n.id !== currentNoteId);
        saveUserData();
        renderNotes();
        closeNoteModal();
    }
}

function renderNotes() {
    notesGrid.innerHTML = '';

    if (notes.length === 0) {
        notesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #999;">
                <i class="fas fa-sticky-note" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h3>No notes yet</h3>
                <p>Create your first note to get started!</p>
            </div>
        `;
        return;
    }

    notes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.onclick = () => openNoteModal(note.id);

        noteElement.innerHTML = `
            <div class="note-title">${note.title}</div>
            <div class="note-content">${note.content}</div>
            <div class="note-date">${note.updatedAt}</div>
        `;

        notesGrid.appendChild(noteElement);
    });
}

// ===== Timer Functionality =====
function setupProgressRing() {
    const radius = progressRing.getAttribute('r');
    const circumference = 2 * Math.PI * radius;
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRing.style.strokeDashoffset = circumference;
}

function updateProgressRing(progress) {
    const radius = progressRing.getAttribute('r');
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress * circumference);
    progressRing.style.strokeDashoffset = offset;
}

function startTimer() {
    if (!timerState.isRunning) {
        timerState.isRunning = true;
        timerState.isPaused = false;
        
        timerStartBtn.style.display = 'none';
        timerPauseBtn.style.display = 'inline-flex';

        timerInterval = setInterval(() => {
            timerState.currentTime--;
            updateTimerDisplay();

            if (timerState.currentTime <= 0) {
                completeTimerSession();
            }
        }, 1000);

        document.querySelector('.timer-circle').classList.add('pulse');
    }
}

function pauseTimer() {
    if (timerState.isRunning) {
        timerState.isRunning = false;
        timerState.isPaused = true;
        
        clearInterval(timerInterval);
        
        timerStartBtn.style.display = 'inline-flex';
        timerPauseBtn.style.display = 'none';

        document.querySelector('.timer-circle').classList.remove('pulse');
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timerState.isRunning = false;
    timerState.isPaused = false;
    
    const focusTime = parseInt(focusTimeInput.value) || 25;
    const breakTime = parseInt(breakTimeInput.value) || 5;
    
    timerState.currentTime = timerState.isBreak ? (breakTime * 60) : (focusTime * 60);
    
    timerStartBtn.style.display = 'inline-flex';
    timerPauseBtn.style.display = 'none';
    
    updateTimerDisplay();
    document.querySelector('.timer-circle').classList.remove('pulse');
}

function completeTimerSession() {
    clearInterval(timerInterval);
    timerState.isRunning = false;
    
    // Play buzzer sound
    buzzerAudio.play().catch(error => {
        console.error('Error playing buzzer sound:', error);
    });

    // Show notification with visual feedback
    const message = timerState.isBreak ? 'Break time over! Ready to focus?' : 'Great work! Time for a break.';
    showNotification(message, 'success');

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ProductivePro Timer', { body: message });
    }

    if (!timerState.isBreak) {
        timerState.sessionsCompleted++;
        timerState.focusMinutes += parseInt(focusTimeInput.value) || 25;
        saveUserData();
        
        timerState.isBreak = true;
        timerState.currentTime = (parseInt(breakTimeInput.value) || 5) * 60;
        timerMode.textContent = 'Break Time';
        progressRing.style.stroke = '#FF9800';
    } else {
        timerState.isBreak = false;
        timerState.currentTime = (parseInt(focusTimeInput.value) || 25) * 60;
        timerMode.textContent = 'Focus Time';
        progressRing.style.stroke = '#4CAF50';
    }

    updateTimerDisplay();
    updateStats();
    
    timerStartBtn.style.display = 'inline-flex';
    timerPauseBtn.style.display = 'none';
    document.querySelector('.timer-circle').classList.remove('pulse');
}

function updateTimerSettings() {
    if (!timerState.isRunning) {
        resetTimer();
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerState.currentTime / 60);
    const seconds = timerState.currentTime % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const totalTime = timerState.isBreak 
        ? (parseInt(breakTimeInput.value) || 5) * 60 
        : (parseInt(focusTimeInput.value) || 25) * 60;
    const progress = 1 - (timerState.currentTime / totalTime);
    updateProgressRing(progress);

    if (timerState.isBreak) {
        progressRing.style.stroke = '#FF9800';
        timerMode.textContent = 'Break Time';
    } else {
        progressRing.style.stroke = '#4CAF50';
        timerMode.textContent = 'Focus Time';
    }
}

// ===== Notification System =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ===== Auto-save functionality =====
setInterval(() => {
    if (currentUser) {
        saveUserData();
    }
}, 30000);

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', function(e) {
    if (!currentUser) return;
    
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                switchTab('todo');
                break;
            case '2':
                e.preventDefault();
                switchTab('notes');
                break;
            case '3':
                e.preventDefault();
                switchTab('timer');
                break;
        }
    }
    
    if (e.key === 'Escape' && noteModal.style.display === 'block') {
        closeNoteModal();
    }
});

// ===== Request Notification Permission =====
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ===== Service Worker Registration =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed');
            });
    });
}

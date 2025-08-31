// Enhanced course data structure
let courses = [
    "IELTS", "Math 2", "MikroTik", "CCNA", "CS50",
    "Python for Network Engineers", "Google Cybersecurity", "DSA", "Gym"
];

const localStorageKey = 'courseProgressData';
const deadline = new Date("2025-12-31T23:59:59").getTime();

// DOM Elements
const dashboardView = document.getElementById('dashboard-view');
const detailsView = document.getElementById('details-view');
const courseList = document.getElementById('course-list');
const detailsTitle = document.getElementById('details-title');
const detailsProgressFill = document.getElementById('details-progress-fill');
const detailsProgressText = document.getElementById('details-progress-text');
const totalItemsInput = document.getElementById('total-items-input');
const completedItemsInput = document.getElementById('completed-items-input');
const linkForm = document.getElementById('link-form');
const linkNameInput = document.getElementById('link-name-input');
const linkUrlInput = document.getElementById('link-url-input');
const linkDisplay = document.getElementById('link-display');
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const countdownElement = document.getElementById('countdown');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const fileInput = document.getElementById('file-input');
const addCourseForm = document.getElementById('add-course-form');
const newCourseInput = document.getElementById('new-course-input');
const categoryFilter = document.getElementById('category-filter');
const sortBy = document.getElementById('sort-by');

let courseData = {};
let currentCourse = null;
let draggedItem = null;
let currentViewMode = 'grid';
let studyTimer = null;
let studyStartTime = null;
let studyElapsedTime = 0;
let achievements = [];
let currentTheme = 'dark'; // Default theme

// Enhanced course data structure
function getDefaultCourseData() {
    return {
        progress: 0,
        totalItems: 0,
        completedItems: 0,
        link: { name: '', url: '' },
        tasks: [],
        category: 'Other',
        priority: 'medium',
        studyTimeGoal: 5, // hours per week
        totalStudyTime: 0, // in minutes
        studyStreak: 0,
        lastStudyDate: null,
        notes: '',
        createdDate: new Date().toISOString(),
        completedDate: null
    };
}

// Load data from localStorage (updated for new structure)
function loadData() {
    const savedData = localStorage.getItem(localStorageKey);
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            courseData = parsedData.courseData || {};
            if (parsedData.courses) {
                courses = parsedData.courses;
            }
            if (parsedData.achievements) {
                achievements = parsedData.achievements;
            }
            if (parsedData.theme) {
                currentTheme = parsedData.theme;
            }
        } catch (e) {
            console.error("Failed to parse course data from localStorage. Starting fresh.", e);
            courseData = {};
        }
    }

    // Apply saved theme
    applyTheme(currentTheme);

    // Ensure all courses have complete data structure
    courses.forEach(course => {
        if (!courseData[course]) {
            courseData[course] = getDefaultCourseData();
        } else {
            // Merge with default data to ensure all properties exist
            courseData[course] = { ...getDefaultCourseData(), ...courseData[course] };
        }
    });

    renderCourses();
    updateStats();
    checkAchievements();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem(localStorageKey, JSON.stringify({
        courseData,
        courses,
        achievements,
        theme: currentTheme,
        lastSaved: new Date().toISOString()
    }));
    showMessage('Progress saved!');
}

// Export enhanced data
function exportData() {
    const dataToExport = {
        courseData,
        courses,
        achievements,
        theme: currentTheme,
        exportDate: new Date().toISOString(),
        version: "2.0"
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `course-progress-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showMessage('Backup downloaded successfully!');
}

// Import enhanced data
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        showMessage('Please select a valid JSON file', true);
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            if (!importedData.courseData || !importedData.courses) {
                throw new Error('Invalid backup file format');
            }

            if (confirm('This will replace all your current progress. Are you sure you want to continue?')) {
                courseData = importedData.courseData;
                courses = importedData.courses;
                achievements = importedData.achievements || [];

                // Import theme if available
                if (importedData.theme) {
                    currentTheme = importedData.theme;
                    applyTheme(currentTheme);
                }

                // Ensure all courses have complete data structure
                courses.forEach(course => {
                    if (courseData[course]) {
                        courseData[course] = { ...getDefaultCourseData(), ...courseData[course] };
                    }
                });

                localStorage.setItem(localStorageKey, JSON.stringify({
                    courseData,
                    courses,
                    achievements,
                    theme: currentTheme
                }));

                if (currentCourse && !courseData[currentCourse]) {
                    showDashboard();
                } else {
                    renderCourses();
                    updateStats();
                    if (currentCourse) {
                        renderDetailsView();
                    }
                }

                showMessage('Backup restored successfully!');
            }
        } catch (error) {
            console.error('Import error:', error);
            showMessage('Failed to import backup file. Please check the file format.', true);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Display messages with enhanced styling
function showMessage(message, isError = false) {
    messageText.textContent = message;
    messageBox.style.background = isError ?
        'linear-gradient(135deg, var(--secondary-500), #dc2626)' :
        'linear-gradient(135deg, var(--success-500), var(--primary-500))';
    messageBox.classList.remove('hidden', 'translate-x-full');
    messageBox.classList.add('translate-x-0');
    setTimeout(() => {
        messageBox.classList.remove('translate-x-0');
        messageBox.classList.add('translate-x-full');
        setTimeout(() => messageBox.classList.add('hidden'), 500);
    }, 3000);
}

// Update statistics
function updateStats() {
    const totalCourses = courses.length;
    const completedCourses = courses.filter(course => courseData[course].progress >= 100).length;
    const totalStudyTime = courses.reduce((total, course) => total + (courseData[course].totalStudyTime || 0), 0);
    const currentStreak = calculateStreak();

    document.getElementById('total-courses').textContent = totalCourses;
    document.getElementById('completed-courses').textContent = completedCourses;
    document.getElementById('total-study-time').textContent = Math.floor(totalStudyTime / 60) + 'h';
    document.getElementById('current-streak').textContent = currentStreak;
}

// Calculate study streak
function calculateStreak() {
    const today = new Date().toDateString();
    let streak = 0;
    let checkDate = new Date();

    while (true) {
        const dateStr = checkDate.toDateString();
        const hasStudied = courses.some(course => {
            const lastStudy = courseData[course].lastStudyDate;
            return lastStudy && new Date(lastStudy).toDateString() === dateStr;
        });

        if (hasStudied) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else if (dateStr === today) {
            // Today doesn't count against streak if no study yet
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

// Theme management functions
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    saveData();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('theme-icon');
    if (theme === 'light') {
        // Moon icon for dark mode toggle
        themeIcon.innerHTML = `
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
        `;
    } else {
        // Sun icon for light mode toggle
        themeIcon.innerHTML = `
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
        `;
    }
}

// Set view mode
function setViewMode(mode) {
    currentViewMode = mode;
    document.getElementById('grid-view').className = mode === 'grid' ?
        'p-2 rounded bg-[--primary-500] text-white' :
        'p-2 rounded bg-[--background-800] text-[--text-950]';
    document.getElementById('list-view').className = mode === 'list' ?
        'p-2 rounded bg-[--primary-500] text-white' :
        'p-2 rounded bg-[--background-800] text-[--text-950]';
    renderCourses();
}

// Filter and sort courses
function getFilteredAndSortedCourses() {
    let filteredCourses = [...courses];

    // Apply category filter
    const categoryFilterValue = categoryFilter.value;
    if (categoryFilterValue) {
        filteredCourses = filteredCourses.filter(course =>
            courseData[course].category === categoryFilterValue
        );
    }

    // Apply sorting
    const sortValue = sortBy.value;
    if (sortValue !== 'custom') {
        filteredCourses.sort((a, b) => {
            switch (sortValue) {
                case 'progress':
                    return courseData[b].progress - courseData[a].progress;
                case 'name':
                    return a.localeCompare(b);
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[courseData[b].priority] - priorityOrder[courseData[a].priority];
                default:
                    return 0;
            }
        });
    }

    return filteredCourses;
}

// Enhanced course rendering
function renderCourses() {
    courseList.innerHTML = '';
    const filteredCourses = getFilteredAndSortedCourses();

    if (currentViewMode === 'grid') {
        courseList.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
    } else {
        courseList.className = "space-y-4";
    }

    filteredCourses.forEach(course => {
        const data = courseData[course];
        const progress = data.progress;
        const totalItems = data.totalItems;
        const completedItems = data.completedItems;
        const hasTotal = totalItems > 0;
        const isCompleted = progress >= 100;

        const card = document.createElement('div');
        card.className = currentViewMode === 'grid' ?
            `glass-effect p-6 rounded-2xl shadow-xl transition-all hover:scale-105 duration-300 ${getPriorityClass(data.priority)}` :
            `glass-effect p-4 rounded-xl shadow-lg transition-all hover:shadow-xl duration-300 ${getPriorityClass(data.priority)}`;

        const progressText = hasTotal ? `${progress.toFixed(0)}% complete (${completedItems}/${totalItems})` : `${completedItems} done`;
        const studyTimeText = data.totalStudyTime ? `${Math.floor(data.totalStudyTime / 60)}h ${data.totalStudyTime % 60}m` : '0m';

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                        <h2 class="text-xl font-semibold" ondblclick="startRenaming('${course}', this)">
                            ${course}
                        </h2>
                        ${isCompleted ? '<span class="achievement-badge">✅ Complete</span>' : ''}
                        <button onclick="startRenaming('${course}', event.currentTarget.parentElement.firstElementChild)" class="text-[--text-950] opacity-70 hover:opacity-100 transition-opacity duration-200" title="Rename Course">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                    </div>
                    <div class="flex items-center space-x-2 mb-2">
                        <span class="category-tag">${data.category}</span>
                        <span class="text-xs text-[--text-950] opacity-70">Study: ${studyTimeText}</span>
                        ${data.studyStreak > 0 ? `<span class="streak-counter">🔥 ${data.studyStreak}</span>` : ''}
                    </div>
                </div>
                <button onclick="deleteCourse('${course}')" class="text-[--secondary-500] hover:text-[--accent-500] transition-colors duration-200" title="Delete Course">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                    </svg>
                </button>
            </div>

            <div onclick="showCourseDetails('${course}')" class="cursor-pointer mb-4">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%;"></div>
                </div>
                <div class="text-sm text-[--text-950] mt-2">${progressText}</div>
            </div>

            <div class="border-t border-[--background-800] pt-4 space-y-3" onclick="event.stopPropagation()">
                <div class="flex justify-between items-center">
                    <div class="text-sm font-medium text-[--primary-500]">Quick Update</div>
                    <button onclick="startQuickStudy('${course}')" class="text-xs px-2 py-1 bg-[--success-500] text-white rounded hover:bg-[--info-500] transition-colors">
                        📚 Study
                    </button>
                </div>
                ${hasTotal ? `
                <div class="flex items-center space-x-2">
                    <button onclick="decrementProgress('${course}')" class="w-8 h-8 rounded-full bg-[--background-800] text-[--primary-500] flex items-center justify-center hover:bg-[--secondary-500] hover:text-white transition-all duration-200 shadow-md transform hover:scale-110">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                        </svg>
                    </button>
                    <input type="number"
                           value="${completedItems}"
                           min="0"
                           max="${totalItems}"
                           placeholder="Done"
                           class="flex-1 px-2 py-1 text-sm rounded bg-[--background-950] text-[--text-950] text-center focus:outline-none focus:ring-1 focus:ring-[--accent-500] shadow-md"
                           onchange="updateQuickProgress('${course}', this.value)">
                    <button onclick="incrementProgress('${course}')" class="w-8 h-8 rounded-full bg-[--background-800] text-[--primary-500] flex items-center justify-center hover:bg-[--secondary-500] hover:text-white transition-all duration-200 shadow-md transform hover:scale-110">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
                <p class="text-xs text-[--text-950] text-center opacity-70">Completed: ${completedItems}/${totalItems}</p>
                ` : `
                <p class="text-xs text-[--text-950] text-center opacity-70">Set total items in course details to use the counter.</p>
                `}
            </div>
        `;

        card.setAttribute('draggable', true);
        card.dataset.courseName = course;

        // Drag and Drop event listeners
        setupDragAndDrop(card, course);

        courseList.appendChild(card);
    });
}

// Setup drag and drop for course cards
function setupDragAndDrop(card, course) {
    card.addEventListener('dragstart', (e) => {
        draggedItem = e.target;
        e.target.classList.add('dragging');
    });

    card.addEventListener('dragover', (e) => {
        e.preventDefault();
        const bounding = card.getBoundingClientRect();
        const offset = bounding.y + bounding.height / 2;
        if (e.clientY < offset) {
            card.classList.remove('drop-target-after');
            card.classList.add('drop-target-before');
        } else {
            card.classList.remove('drop-target-before');
            card.classList.add('drop-target-after');
        }
    });

    card.addEventListener('dragleave', (e) => {
        card.classList.remove('drop-target-before', 'drop-target-after');
    });

    card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drop-target-before', 'drop-target-after');
        const droppedOnCourse = e.target.closest('div[data-course-name]').dataset.courseName;
        const draggedCourse = draggedItem.dataset.courseName;

        if (draggedCourse !== droppedOnCourse) {
            const droppedOnIndex = courses.indexOf(droppedOnCourse);
            const draggedIndex = courses.indexOf(draggedCourse);

            courses.splice(draggedIndex, 1);
            courses.splice(droppedOnIndex, 0, draggedCourse);

            renderCourses();
            saveData();
        }
    });

    card.addEventListener('dragend', (e) => {
        draggedItem.classList.remove('dragging');
        document.querySelectorAll('.drop-target-before, .drop-target-after').forEach(el => {
            el.classList.remove('drop-target-before', 'drop-target-after');
        });
    });
}

// Get priority CSS class
function getPriorityClass(priority) {
    switch (priority) {
        case 'high': return 'priority-high';
        case 'medium': return 'priority-medium';
        case 'low': return 'priority-low';
        default: return 'priority-medium';
    }
}

// Show dashboard
function showDashboard() {
    dashboardView.classList.remove('hidden');
    detailsView.classList.add('hidden');
    currentCourse = null;
    stopTimer();
    renderCourses();
    updateStats();
    renderAchievements();
}

// Show course details
function showCourseDetails(course) {
    currentCourse = course;
    dashboardView.classList.add('hidden');
    detailsView.classList.remove('hidden');
    detailsTitle.textContent = course;
    renderDetailsView();
    renderCharts();
}

// Enhanced details view rendering
function renderDetailsView() {
    const course = currentCourse;
    const data = courseData[course];

    // Update course settings
    document.getElementById('course-category').value = data.category;
    document.getElementById('course-priority').value = data.priority;
    document.getElementById('study-goal').value = data.studyTimeGoal;

    // Render Progress Counter
    totalItemsInput.value = data.totalItems;
    completedItemsInput.value = data.completedItems;
    detailsProgressFill.style.width = `${data.progress}%`;
    detailsProgressText.textContent = `${data.progress.toFixed(0)}% complete (${data.completedItems}/${data.totalItems})`;

    // Render Link
    linkDisplay.innerHTML = '';
    if (data.link.url) {
        const linkCard = document.createElement('div');
        linkCard.className = "link-card p-4 rounded-lg shadow-lg flex justify-between items-center";
        linkCard.innerHTML = `
            <a href="${data.link.url}" target="_blank" class="block text-[--primary-500] hover:underline">
                <h4 class="text-lg font-semibold">${data.link.name || data.link.url}</h4>
                <p class="text-sm text-[--text-950] truncate">${data.link.url}</p>
            </a>
            <button onclick="removeLink('${course}')" class="text-[--primary-500] hover:text-[--secondary-500] transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"/>
                </svg>
            </button>
        `;
        linkDisplay.appendChild(linkCard);
    }

    // Render Notes
    document.getElementById('course-notes').value = data.notes || '';

    // Enhanced To-Do List rendering
    todoList.innerHTML = '';
    data.tasks.forEach((task, index) => {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${getPriorityClass(task.priority || 'medium')}`;
        taskItem.innerHTML = `
            <div class="flex items-center space-x-3 flex-1">
                <input type="checkbox" ${task.completed ? 'checked' : ''}
                       onchange="toggleTaskCompletion('${course}', ${index})"
                       class="w-4 h-4 text-[--primary-500] bg-[--background-950] border-[--primary-500] rounded focus:ring-[--accent-500]">
                <span class="flex-1 ${task.completed ? 'line-through opacity-50' : ''}">${task.text}</span>
                <span class="text-xs px-2 py-1 rounded ${getPriorityBadgeClass(task.priority || 'medium')}">${task.priority || 'medium'}</span>
            </div>
            <button onclick="deleteTodo('${course}', ${index})" class="text-[--primary-500] hover:text-[--secondary-500] transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" />
                </svg>
            </button>
        `;
        todoList.appendChild(taskItem);
    });
}

// Get priority badge class
function getPriorityBadgeClass(priority) {
    switch (priority) {
        case 'high': return 'bg-[--secondary-500] text-white';
        case 'medium': return 'bg-[--accent-500] text-white';
        case 'low': return 'bg-[--success-500] text-white';
        default: return 'bg-[--accent-500] text-white';
    }
}

// Study timer functions
function toggleTimer() {
    if (studyTimer) {
        stopTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    studyStartTime = Date.now() - studyElapsedTime;
    studyTimer = setInterval(updateTimerDisplay, 1000);
    document.getElementById('timer-btn').textContent = 'Stop';
    document.getElementById('timer-btn').className = 'ml-2 px-3 py-1 bg-white text-[--secondary-500] rounded text-sm';
}

function stopTimer() {
    if (studyTimer) {
        clearInterval(studyTimer);
        studyTimer = null;

        // Save study time
        if (studyElapsedTime > 0) {
            const studyMinutes = Math.floor(studyElapsedTime / (1000 * 60));
            courseData[currentCourse].totalStudyTime += studyMinutes;
            courseData[currentCourse].lastStudyDate = new Date().toISOString();
            updateStudyStreak(currentCourse);
            checkAchievements();
            saveData();
            updateStats();
        }

        studyElapsedTime = 0;
        document.getElementById('timer-display').textContent = '00:00:00';
        document.getElementById('timer-btn').textContent = 'Start';
        document.getElementById('timer-btn').className = 'ml-2 px-3 py-1 bg-white text-[--success-500] rounded text-sm';
    }
}

function updateTimerDisplay() {
    studyElapsedTime = Date.now() - studyStartTime;
    const hours = Math.floor(studyElapsedTime / (1000 * 60 * 60));
    const minutes = Math.floor((studyElapsedTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((studyElapsedTime % (1000 * 60)) / 1000);

    document.getElementById('timer-display').textContent =
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Start quick study session
function startQuickStudy(course) {
    if (currentCourse !== course) {
        showCourseDetails(course);
    }
    setTimeout(() => {
        if (!studyTimer) {
            startTimer();
            showMessage(`Started study session for ${course}!`);
        }
    }, 100);
}

// Update study streak
function updateStudyStreak(course) {
    const today = new Date().toDateString();
    const lastStudy = courseData[course].lastStudyDate;
    const lastStudyDate = lastStudy ? new Date(lastStudy).toDateString() : null;

    if (lastStudyDate === today) {
        // Already studied today, don't increment
        return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastStudyDate === yesterdayStr) {
        courseData[course].studyStreak += 1;
    } else if (lastStudyDate !== today) {
        courseData[course].studyStreak = 1;
    }
}

// Enhanced form handlers
addCourseForm.onsubmit = (e) => {
    e.preventDefault();
    const courseName = newCourseInput.value.trim();
    const category = document.getElementById('new-course-category').value;
    const priority = document.getElementById('new-course-priority').value;

    if (courseName && !courses.includes(courseName)) {
        courses.push(courseName);
        courseData[courseName] = {
            ...getDefaultCourseData(),
            category: category,
            priority: priority
        };
        saveData();
        renderCourses();
        updateStats();
        newCourseInput.value = '';
        showMessage(`Course "${courseName}" added successfully!`);
    } else if (courses.includes(courseName)) {
        showMessage('Course already exists!', true);
    }
};

linkForm.onsubmit = (e) => {
    e.preventDefault();
    const name = linkNameInput.value.trim();
    const url = linkUrlInput.value.trim();
    if (url) {
        courseData[currentCourse].link = { name: name, url: url };
        saveData();
        renderDetailsView();
        linkNameInput.value = '';
        linkUrlInput.value = '';
        showMessage('Course link saved!');
    }
};

todoForm.onsubmit = (e) => {
    e.preventDefault();
    const taskText = todoInput.value.trim();
    const priority = document.getElementById('todo-priority').value;
    if (taskText) {
        courseData[currentCourse].tasks.push({
            text: taskText,
            priority: priority,
            completed: false,
            createdDate: new Date().toISOString()
        });
        saveData();
        renderDetailsView();
        todoInput.value = '';
        showMessage('Task added!');
    }
};

// Filter and sort event listeners
categoryFilter.addEventListener('change', renderCourses);
sortBy.addEventListener('change', renderCourses);

// Update course settings
function updateCourseSettings() {
    const course = currentCourse;
    const category = document.getElementById('course-category').value;
    const priority = document.getElementById('course-priority').value;
    const studyGoal = parseFloat(document.getElementById('study-goal').value) || 5;

    courseData[course].category = category;
    courseData[course].priority = priority;
    courseData[course].studyTimeGoal = studyGoal;

    saveData();
    renderCourses();
    showMessage('Course settings updated!');
}

// Update course notes
function updateCourseNotes() {
    const notes = document.getElementById('course-notes').value;
    courseData[currentCourse].notes = notes;
    saveData();
}

// Toggle task completion
function toggleTaskCompletion(course, taskIndex) {
    const task = courseData[course].tasks[taskIndex];
    task.completed = !task.completed;
    if (task.completed) {
        task.completedDate = new Date().toISOString();
        showMessage('Task completed! 🎉');
        checkAchievements();
    } else {
        delete task.completedDate;
    }
    saveData();
    renderDetailsView();
}

// Achievement system
function checkAchievements() {
    const newAchievements = [];

    // First course completion
    const completedCourses = courses.filter(course => courseData[course].progress >= 100);
    if (completedCourses.length >= 1 && !achievements.includes('first_completion')) {
        newAchievements.push({
            id: 'first_completion',
            title: 'First Victory! 🏆',
            description: 'Completed your first course',
            date: new Date().toISOString()
        });
    }

    // Study streak achievements
    const currentStreak = calculateStreak();
    if (currentStreak >= 7 && !achievements.some(a => a.id === 'week_streak')) {
        newAchievements.push({
            id: 'week_streak',
            title: 'Week Warrior! 🔥',
            description: 'Studied for 7 days in a row',
            date: new Date().toISOString()
        });
    }

    // Total study time achievements
    const totalStudyTime = courses.reduce((total, course) => total + (courseData[course].totalStudyTime || 0), 0);
    if (totalStudyTime >= 600 && !achievements.some(a => a.id === 'study_master')) { // 10 hours
        newAchievements.push({
            id: 'study_master',
            title: 'Study Master! 📚',
            description: 'Accumulated 10+ hours of study time',
            date: new Date().toISOString()
        });
    }

    // Task completion achievements
    const totalTasks = courses.reduce((total, course) =>
        total + (courseData[course].tasks?.filter(task => task.completed).length || 0), 0);
    if (totalTasks >= 25 && !achievements.some(a => a.id === 'task_crusher')) {
        newAchievements.push({
            id: 'task_crusher',
            title: 'Task Crusher! ⚡',
            description: 'Completed 25+ tasks',
            date: new Date().toISOString()
        });
    }

    // Course variety achievement
    const categories = new Set(courses.map(course => courseData[course].category));
    if (categories.size >= 3 && !achievements.some(a => a.id === 'well_rounded')) {
        newAchievements.push({
            id: 'well_rounded',
            title: 'Well-Rounded! 🌟',
            description: 'Learning across multiple categories',
            date: new Date().toISOString()
        });
    }

    // Show new achievements
    newAchievements.forEach(achievement => {
        achievements.push(achievement);
        showMessage(`New Achievement: ${achievement.title}`);
    });

    if (newAchievements.length > 0) {
        saveData();
        renderAchievements();
    }
}

// Render achievements
function renderAchievements() {
    const achievementsSection = document.getElementById('achievements-section');
    if (achievements.length === 0) {
        achievementsSection.style.display = 'none';
        return;
    }

    achievementsSection.style.display = 'block';
    achievementsSection.innerHTML = `
        <h3 class="text-2xl font-semibold mb-4 text-[--primary-500]">🏆 Achievements</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${achievements.map(achievement => `
                <div class="stat-card p-4 rounded-xl text-center">
                    <div class="text-2xl mb-2">${achievement.title}</div>
                    <div class="text-sm text-[--text-950] opacity-70">${achievement.description}</div>
                    <div class="text-xs text-[--accent-500] mt-2">${new Date(achievement.date).toLocaleDateString()}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Render progress charts
function renderCharts() {
    // Progress Chart
    const progressCtx = document.getElementById('progress-chart').getContext('2d');
    new Chart(progressCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [courseData[currentCourse].progress, 100 - courseData[currentCourse].progress],
                backgroundColor: ['#7111ee', '#27085e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: '#efe7fd' }
                }
            }
        }
    });

    // Study Time Chart (last 7 days)
    const studyTimeCtx = document.getElementById('study-time-chart').getContext('2d');
    const last7Days = [];
    const studyData = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        studyData.push(Math.floor(Math.random() * 120)); // Placeholder data
    }

    new Chart(studyTimeCtx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Study Minutes',
                data: studyData,
                borderColor: '#ee8e11',
                backgroundColor: 'rgba(238, 142, 17, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    ticks: { color: '#efe7fd' },
                    grid: { color: 'rgba(239, 231, 253, 0.1)' }
                },
                x: {
                    ticks: { color: '#efe7fd' },
                    grid: { color: 'rgba(239, 231, 253, 0.1)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#efe7fd' }
                }
            }
        }
    });
}

// Quick add modal functions
function showQuickAdd() {
    const modal = document.getElementById('quick-add-modal');
    const select = document.getElementById('quick-course-select');

    // Populate course options
    select.innerHTML = courses.map(course =>
        `<option value="${course}">${course}</option>`
    ).join('');

    modal.classList.remove('hidden');
    document.getElementById('quick-task-input').focus();
}

function hideQuickAdd() {
    document.getElementById('quick-add-modal').classList.add('hidden');
    document.getElementById('quick-task-input').value = '';
}

document.getElementById('quick-add-form').onsubmit = (e) => {
    e.preventDefault();
    const course = document.getElementById('quick-course-select').value;
    const taskText = document.getElementById('quick-task-input').value.trim();

    if (taskText && course) {
        courseData[course].tasks.push({
            text: taskText,
            priority: 'medium',
            completed: false,
            createdDate: new Date().toISOString()
        });
        saveData();
        hideQuickAdd();
        showMessage(`Task added to ${course}!`);

        if (currentCourse === course) {
            renderDetailsView();
        }
    }
};

// Update progress functions
function updateProgress() {
    const course = currentCourse;
    const total = parseInt(totalItemsInput.value) || 0;
    const completed = parseInt(completedItemsInput.value) || 0;

    courseData[course].totalItems = total;
    courseData[course].completedItems = completed;

    let progress = 0;
    if (total > 0) {
        progress = Math.min(100, Math.max(0, (completed / total) * 100));
    }

    const wasCompleted = courseData[course].progress >= 100;
    courseData[course].progress = progress;

    // Check if course just got completed
    if (progress >= 100 && !wasCompleted) {
        courseData[course].completedDate = new Date().toISOString();
        showMessage(`Congratulations! You completed ${course}! 🎉`);
        checkAchievements();
    } else if (progress < 100 && wasCompleted) {
        courseData[course].completedDate = null;
    }

    renderDetailsView();
    renderCourses();
    updateStats();
    saveData();
}

function updateItemProgress() {
    updateProgress();
}

function updateQuickProgress(course, value) {
    const numValue = parseInt(value) || 0;
    const total = courseData[course].totalItems;
    const newCompleted = Math.max(0, Math.min(numValue, total));

    courseData[course].completedItems = newCompleted;

    let progress = 0;
    if (total > 0) {
        progress = Math.min(100, (newCompleted / total) * 100);
    }

    const wasCompleted = courseData[course].progress >= 100;
    courseData[course].progress = progress;

    if (progress >= 100 && !wasCompleted) {
        courseData[course].completedDate = new Date().toISOString();
        showMessage(`Congratulations! You completed ${course}! 🎉`);
        checkAchievements();
    } else if (progress < 100 && wasCompleted) {
        courseData[course].completedDate = null;
    }

    saveData();
    renderCourses();
    updateStats();

    if (currentCourse === course) {
        renderDetailsView();
    }
}

function incrementProgress(course) {
    const current = courseData[course].completedItems;
    const total = courseData[course].totalItems;
    if (current < total) {
        updateQuickProgress(course, current + 1);
    }
}

function decrementProgress(course) {
    const current = courseData[course].completedItems;
    if (current > 0) {
        updateQuickProgress(course, current - 1);
    }
}

// Course management functions
function startRenaming(oldName, titleElement) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.className = 'text-xl font-semibold bg-[--background-950] text-[--text-950] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[--accent-500] w-full shadow-md';

    titleElement.parentNode.replaceChild(input, titleElement);
    input.focus();
    input.select();

    function finishRenaming() {
        const newName = input.value.trim();

        if (newName && newName !== oldName && !courses.includes(newName)) {
            const oldIndex = courses.indexOf(oldName);
            if (oldIndex !== -1) {
                courses[oldIndex] = newName;
            }

            courseData[newName] = courseData[oldName];
            delete courseData[oldName];

            if (currentCourse === oldName) {
                currentCourse = newName;
                detailsTitle.textContent = newName;
            }

            saveData();
            renderCourses();
            showMessage(`Course renamed to "${newName}"`);
        } else if (newName === oldName) {
            renderCourses();
        } else if (courses.includes(newName)) {
            showMessage('Course name already exists!', true);
            renderCourses();
        } else {
            renderCourses();
        }
    }

    input.addEventListener('blur', finishRenaming);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            finishRenaming();
        } else if (e.key === 'Escape') {
            renderCourses();
        }
    });
}

function deleteCourse(course) {
    if (confirm(`Are you sure you want to delete "${course}"? This action cannot be undone.`)) {
        const index = courses.indexOf(course);
        courses.splice(index, 1);
        delete courseData[course];

        if (currentCourse === course) {
            showDashboard();
        }

        saveData();
        renderCourses();
        updateStats();
        showMessage(`Course "${course}" deleted`);
    }
}

function deleteTodo(course, index) {
    courseData[course].tasks.splice(index, 1);
    saveData();
    renderDetailsView();
    showMessage('Task deleted');
}

function removeLink(course) {
    courseData[course].link = { name: '', url: '' };
    saveData();
    renderDetailsView();
    showMessage('Course link removed');
}

// Countdown timer
function updateCountdown() {
    const now = new Date().getTime();
    const distance = deadline - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    if (distance < 0) {
        countdownElement.innerHTML = '<span class="text-[--secondary-500]">⏰ Deadline passed!</span>';
    } else {
        countdownElement.innerHTML = `
            <span class="text-[--accent-500]">⏱️ Time Remaining: </span>
            <span class="text-[--primary-500] font-bold">${days}d ${hours}h ${minutes}m</span>
        `;
    }
}

// Setup file drag and drop
function setupDragAndDrop() {
    const dropZone = document.querySelector('.file-drop-zone');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                const fakeEvent = { target: { files: [file] } };
                importData(fakeEvent);
            } else {
                showMessage('Please drop a valid JSON file', true);
            }
        }
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 's':
                e.preventDefault();
                saveData();
                break;
            case 'n':
                e.preventDefault();
                if (currentCourse) {
                    document.getElementById('todo-input').focus();
                } else {
                    document.getElementById('new-course-input').focus();
                }
                break;
            case 'b':
                e.preventDefault();
                if (currentCourse) {
                    showDashboard();
                }
                break;
        }
    }

    if (e.key === 'Escape') {
        hideQuickAdd();
        if (currentCourse) {
            showDashboard();
        }
    }
});

// Initialize default categories for existing courses
function initializeDefaultCategories() {
    const categoryMap = {
        'IELTS': 'Language',
        'Math 2': 'Math',
        'MikroTik': 'Networking',
        'CCNA': 'Networking',
        'CS50': 'Programming',
        'Python for Network Engineers': 'Programming',
        'Google Cybersecurity': 'Networking',
        'DSA': 'Programming',
        'Gym': 'Fitness'
    };

    courses.forEach(course => {
        if (courseData[course] && !courseData[course].category) {
            courseData[course].category = categoryMap[course] || 'Other';
        }
    });
}

// Auto-save notes with debouncing
let notesTimeout;
document.addEventListener('DOMContentLoaded', () => {
    const notesTextarea = document.getElementById('course-notes');
    if (notesTextarea) {
        notesTextarea.addEventListener('input', () => {
            clearTimeout(notesTimeout);
            notesTimeout = setTimeout(() => {
                updateCourseNotes();
            }, 1000);
        });
    }
});

// Initialize application
window.onload = function() {
    loadData();
    initializeDefaultCategories();
    updateCountdown();
    updateStats();
    renderAchievements();
    setInterval(updateCountdown, 60000); // Update every minute
    setupDragAndDrop();

    // Add auto-save every 30 seconds
    setInterval(() => {
        if (Object.keys(courseData).length > 0) {
            localStorage.setItem(localStorageKey, JSON.stringify({
                courseData,
                courses,
                achievements,
                lastSaved: new Date().toISOString()
            }));
        }
    }, 30000);

    // Initialize with some sample achievements for demo
    if (achievements.length === 0) {
        setTimeout(checkAchievements, 1000);
    }
};

// Cleanup timer on page unload
window.addEventListener('beforeunload', () => {
    if (studyTimer) {
        stopTimer();
    }
});
// Chart Configuration
const ctx = document.getElementById('analyticsChart').getContext('2d');
const analyticsChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], // Task names will go here (e.g., Eng, Hindi, Maths, Sci, S.st)
        datasets: [{
            label: 'Time Spent (min)',
            data: [], // Time spent on each task will go here
            borderColor: '#917FB3',
            tension: 0.1
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Time Spent (min)'
                },
                ticks: {
                    color: '#2A2F4F'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Task Name'
                },
                ticks: {
                    color: '#2A2F4F'
                }
            }
        }
    }
});

// Application State
let metrics = {
    completedTasks: 0,
    timeSpent: 0,
    taskStats: {} // This will store time spent per task
};

// Dark Mode Toggle (unchanged)
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    analyticsChart.options.scales.y.ticks.color = document.body.classList.contains('dark-mode') ? '#FDE2F3' : '#2A2F4F';
    analyticsChart.options.scales.x.ticks.color = document.body.classList.contains('dark-mode') ? '#FDE2F3' : '#2A2F4F';
    analyticsChart.update();
}

// Share Snapshot (unchanged)
async function shareSnapshot() {
    const stamp = document.getElementById('snapshot-stamp');
    stamp.textContent = new Date().toLocaleString();
    stamp.style.display = 'block';
    
    html2canvas(document.body).then(canvas => {
        stamp.style.display = 'none';
        const link = document.createElement('a');
        link.href = canvas.toDataURL();
        link.download = `task-snapshot-${Date.now()}.png`;
        link.click();
    });
}

// Task Management (unchanged)
function createTaskElement(text, priorityColor, dueDate) {
    const task = document.createElement('div');
    task.className = 'task';
    task.id = `task-${Date.now()}`;
    task.draggable = true;
    task.innerHTML = `
        <div class="priority-dot" style="background: ${priorityColor}"></div>
        <div class="task-content">
            <p>${text}</p>
            ${dueDate ? `<small>Due: ${new Date(dueDate).toLocaleString()}</small>` : ''}
            <div class="task-timer">00:00</div>
            <div class="task-controls">
                <button onclick="startTimer(this)">▶️ Play</button>
                <button onclick="pauseTimer(this)">⏸️ Pause</button>
                <button onclick="resetTimer(this)">🔄 Reset</button>
            </div>
        </div>
        <div class="task-actions">
            <button class="action-btn" onclick="editTask(this)">✏️</button>
            <button class="action-btn" onclick="deleteTask(this)">✖️</button>
        </div>
        <button class="move-btn" onclick="moveTask(this)">➡️</button>
    `;
    return task;
}

function addTask() {
    const taskText = document.getElementById('task-input').value.trim();
    const priorityColor = document.getElementById('priority-input').value;
    if (!taskText) return alert('Please enter a task!');
    const task = createTaskElement(taskText, priorityColor);
    document.getElementById('todo').appendChild(task);
    document.getElementById('task-input').value = '';
    saveTasks();
    trackMetrics('add');
}

function addScheduledTask() {
    const taskText = document.getElementById('task-for-date').value.trim();
    const dueDateTime = document.getElementById('task-datetime').value;
    if (!taskText || !dueDateTime) return alert('Please fill all fields!');
    const task = createTaskElement(taskText, document.getElementById('priority-input').value, dueDateTime);
    document.getElementById('todo').appendChild(task);
    closeCalendar();
    saveTasks();
    trackMetrics('add');
}

function moveTask(button) {
    const task = button.closest('.task');
    const currentColumn = task.parentElement.id;
    const columns = ['todo', 'in-progress', 'done'];
    const nextColumn = columns[(columns.indexOf(currentColumn) + 1) % columns.length];
    document.getElementById(nextColumn).appendChild(task);
    if (nextColumn === 'done') {
        trackMetrics('complete', task);
        celebrateTask(task);
    }
    saveTasks();
}

function celebrateTask(task) {
    const emojis = ['🎆', '🎊', '🎉'];
    emojis.forEach((emoji, index) => {
        setTimeout(() => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.className = 'celebrate';
            span.style.position = 'absolute';
            span.style.left = `${Math.random() * 100}%`;
            span.style.top = `${Math.random() * 100}%`;
            task.appendChild(span);
            setTimeout(() => span.remove(), 2000); // 2 seconds
        }, index * 300);
    });
}

function editTask(button) {
    const task = button.closest('.task');
    const currentText = task.querySelector('p').textContent;
    const newText = prompt('Edit task:', currentText);
    if (newText !== null) {
        task.querySelector('p').textContent = newText;
        saveTasks();
    }
}

function deleteTask(button) {
    const task = button.closest('.task');
    task.remove();
    saveTasks();
    trackMetrics('delete');
}

// Timer Functionality (unchanged)
let timers = {};
function startTimer(button) {
    const timerDisplay = button.parentElement.previousElementSibling;
    const taskId = button.closest('.task').id;
    if (timers[taskId]) clearInterval(timers[taskId]);
    let [minutes, seconds] = timerDisplay.textContent.split(':').map(Number);
    timers[taskId] = setInterval(() => {
        seconds++;
        if (seconds === 60) {
            seconds = 0;
            minutes++;
        }
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function pauseTimer(button) {
    const taskId = button.closest('.task').id;
    clearInterval(timers[taskId]);
}

function resetTimer(button) {
    const timerDisplay = button.parentElement.previousElementSibling;
    const taskId = button.closest('.task').id;
    timerDisplay.textContent = '00:00';
    clearInterval(timers[taskId]);
}

// Metrics Tracking
function trackMetrics(action, task) {
    const taskName = task ? task.querySelector('p').textContent : null;
    switch (action) {
        case 'add':
            break;
        case 'complete':
            metrics.completedTasks++;
            const timerText = task.querySelector('.task-timer').textContent;
            const [mins, secs] = timerText.split(':').map(Number);
            const timeSpent = mins + (secs / 60);
            metrics.timeSpent += timeSpent;
            metrics.taskStats[taskName] = (metrics.taskStats[taskName] || 0) + timeSpent;
            break;
        case 'delete':
            break;
    }
    updateMetrics();
    saveMetrics();
}

function updateMetrics() {
    console.log('Updating metrics...');
    console.log('Total Tasks:', metrics.totalTasks);
    console.log('Completed Tasks:', metrics.completedTasks);
    console.log('Time Spent:', metrics.timeSpent);

    function updateDayAndDate() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
        const now = new Date();
        const day = days[now.getDay()];
        const date = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    
        const currentDayElement = document.getElementById('current-day');
        const currentDateElement = document.getElementById('current-date');
    
        if (currentDayElement && currentDateElement) {
            currentDayElement.textContent = day;
            currentDateElement.textContent = date;
        } else {
            console.error('Elements for day and date not found.');
        }
    }
    
    // Call the function to update the day and date when the page loads
    updateDayAndDate();

    const completedTasksElement = document.getElementById('completed-tasks');
    if (completedTasksElement) {
        completedTasksElement.querySelector('p').textContent = metrics.completedTasks;
    } else {
        console.error('Element with ID "completed-tasks" not found.');
    }

    const avgTimeElement = document.getElementById('avg-time');
    if (avgTimeElement) {
        avgTimeElement.querySelector('p').textContent = `${Math.round(metrics.timeSpent)}m`;
    } else {
        console.error('Element with ID "avg-time" not found.');
    }

    // Update the chart with task names and time spent
    const taskNames = Object.keys(metrics.taskStats);
    analyticsChart.data.labels = taskNames;
    analyticsChart.data.datasets[0].data = taskNames.map(task => metrics.taskStats[task]);
    analyticsChart.update();
}

// Save/Load Metrics
function saveMetrics() {
    localStorage.setItem('taskMetrics', JSON.stringify(metrics));
}

function loadMetrics() {
    const saved = localStorage.getItem('taskMetrics');
    if (saved) metrics = JSON.parse(saved);
    updateMetrics();
}

// Save/Load Tasks (unchanged)
function saveTasks() {
    const tasks = {
        todo: Array.from(document.getElementById('todo').children).map(task => ({
            text: task.querySelector('p').textContent,
            priority: task.querySelector('.priority-dot').style.backgroundColor,
            timer: task.querySelector('.task-timer').textContent,
            dueDate: task.querySelector('small')?.textContent.replace('Due: ', '')
        })),
        'in-progress': Array.from(document.getElementById('in-progress').children).map(task => ({
            text: task.querySelector('p').textContent,
            priority: task.querySelector('.priority-dot').style.backgroundColor,
            timer: task.querySelector('.task-timer').textContent,
            dueDate: task.querySelector('small')?.textContent.replace('Due: ', '')
        })),
        done: Array.from(document.getElementById('done').children).map(task => ({
            text: task.querySelector('p').textContent,
            priority: task.querySelector('.priority-dot').style.backgroundColor,
            timer: task.querySelector('.task-timer').textContent,
            dueDate: task.querySelector('small')?.textContent.replace('Due: ', '')
        }))
    };
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const saved = JSON.parse(localStorage.getItem('tasks')) || {};
    
    for (const [column, tasks] of Object.entries(saved)) {
        const container = document.getElementById(column);
        tasks.forEach(taskData => {
            const task = createTaskElement(
                taskData.text,
                taskData.priority,
                taskData.dueDate ? new Date(taskData.dueDate) : null
            );
            task.querySelector('.task-timer').textContent = taskData.timer;
            container.appendChild(task);
        });
    }
}

// Calendar Functions (unchanged)
function openCalendar() {
    document.querySelector('.calendar-modal').style.display = 'block';
    document.querySelector('.overlay').style.display = 'block';
}

function closeCalendar() {
    document.querySelector('.calendar-modal').style.display = 'none';
    document.querySelector('.overlay').style.display = 'none';
}

// Drag & Drop (unchanged)
let draggedTask = null;
document.querySelectorAll('.column').forEach(column => {
    column.addEventListener('dragover', e => {
        e.preventDefault();
        column.style.backgroundColor = 'rgba(0,0,0,0.05)';
    });
    column.addEventListener('dragleave', () => {
        column.style.backgroundColor = '';
    });
    column.addEventListener('drop', () => {
        column.style.backgroundColor = '';
        if (draggedTask) {
            column.appendChild(draggedTask);
            saveTasks();
        }
    });
});

document.addEventListener('dragstart', e => {
    if (e.target.classList.contains('task')) {
        draggedTask = e.target;
        setTimeout(() => e.target.style.opacity = '0.5', 0);
    }
});

document.addEventListener('dragend', e => {
    if (e.target.classList.contains('task')) {
        e.target.style.opacity = '1';
        draggedTask = null;
    }
});

// Initialize (unchanged)
if(localStorage.getItem('darkMode') === 'true') toggleDarkMode();
loadMetrics();
loadTasks();
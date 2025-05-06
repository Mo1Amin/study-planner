document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS animation
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    // Hide loading screen after 2 seconds
    setTimeout(function() {
        document.querySelector('.loading-screen').classList.add('hidden');
    }, 2000);

    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            document.querySelector('.navbar').classList.add('scrolled');
        } else {
            document.querySelector('.navbar').classList.remove('scrolled');
        }
    });

    // Back to top button
    const backToTopButton = document.querySelector('.back-to-top');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
    });

    backToTopButton.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Initialize calendar
    initializeCalendar();

    // Initialize charts
    initializeCharts();

    // Load sample data
    loadSampleData();

    // Form submissions
    document.getElementById('appointmentForm').addEventListener('submit', addAppointment);
    document.getElementById('taskForm').addEventListener('submit', addTask);
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);

    // Event listeners for task filtering
    document.querySelectorAll('.filter-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const filter = this.getAttribute('data-filter');
            filterTasks(filter);
        });
    });

    // Modal buttons
    document.getElementById('deleteEventBtn').addEventListener('click', deleteEvent);
    document.getElementById('completeTaskBtn').addEventListener('click', completeTask);
    document.getElementById('deleteTaskBtn').addEventListener('click', deleteTask);
});

// Calendar functions
let currentMonth = moment();
let events = [];

function initializeCalendar() {
    updateCalendar();
    
    // Month navigation buttons
    document.getElementById('prevMonth').addEventListener('click', function() {
        currentMonth.subtract(1, 'month');
        updateCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', function() {
        currentMonth.add(1, 'month');
        updateCalendar();
    });
}

function updateCalendar() {
    // Update month/year display
    document.getElementById('currentMonth').textContent = currentMonth.format('MMMM YYYY');
    
    // Generate calendar days
    const calendarElement = document.getElementById('calendar');
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    const startDay = startOfMonth.day();
    const daysInMonth = currentMonth.daysInMonth();
    
    // Create weekdays header
    let calendarHTML = '<div class="calendar-weekdays">';
    const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    weekdays.forEach(day => {
        calendarHTML += `<div>${day}</div>`;
    });
    
    calendarHTML += '</div><div class="calendar-days">';
    
    // Add empty cells for days before the start of the month
    for (let i = 0; i < startDay; i++) {
        calendarHTML += '<div class="calendar-day other-month"></div>';
    }
    
    // Add days of the month
    const today = moment().format('YYYY-MM-DD');
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = currentMonth.clone().date(day);
        const dateString = date.format('YYYY-MM-DD');
        const isToday = dateString === today;
        const hasEvent = events.some(event => event.date === dateString);
        
        let dayClass = 'calendar-day';
        if (isToday) dayClass += ' today';
        if (hasEvent) dayClass += ' event-day';
        
        calendarHTML += `
            <div class="${dayClass}" data-date="${dateString}">
                ${day}
            </div>
        `;
    }
    
    // Add empty cells to complete the last row
    const totalCells = startDay + daysInMonth;
    const remainingCells = 7 - (totalCells % 7);
    
    if (remainingCells < 7) {
        for (let i = 0; i < remainingCells; i++) {
            calendarHTML += '<div class="calendar-day other-month"></div>';
        }
    }
    
    calendarHTML += '</div>';
    calendarElement.innerHTML = calendarHTML;
    
    // Add click event to calendar days
    document.querySelectorAll('.calendar-day:not(.other-month)').forEach(day => {
        day.addEventListener('click', function() {
            const date = this.getAttribute('data-date');
            showEventsForDate(date);
        });
    });
}

function showEventsForDate(date) {
    const dateEvents = events.filter(event => event.date === date);
    const modalTitle = document.getElementById('eventModalTitle');
    const modalBody = document.getElementById('eventModalBody');
    
    modalTitle.textContent = `مواعيد ${moment(date).format('DD MMMM YYYY')}`;
    
    if (dateEvents.length === 0) {
        modalBody.innerHTML = '<p>لا توجد مواعيد في هذا اليوم.</p>';
    } else {
        let eventsHTML = '<div class="list-group">';
        
        dateEvents.forEach((event, index) => {
            eventsHTML += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${event.title}</h6>
                            <small class="text-muted">${event.time} - ${event.type}</small>
                        </div>
                        <button class="btn btn-sm btn-outline-primary view-event" data-index="${index}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        eventsHTML += '</div>';
        modalBody.innerHTML = eventsHTML;
        
        // Add event listeners to view buttons
        document.querySelectorAll('.view-event').forEach(button => {
            button.addEventListener('click', function() {
                const index = this.getAttribute('data-index');
                showEventDetails(dateEvents[index], index);
            });
        });
    }
    
    // Show the modal
    const eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
    eventModal.show();
}

function showEventDetails(event, index) {
    const modalTitle = document.getElementById('eventModalTitle');
    const modalBody = document.getElementById('eventModalBody');
    
    modalTitle.textContent = event.title;
    
    modalBody.innerHTML = `
        <div class="mb-3">
            <h6>التاريخ والوقت</h6>
            <p>${moment(event.date).format('dddd، DD MMMM YYYY')} في ${event.time}</p>
        </div>
        <div class="mb-3">
            <h6>نوع الموعد</h6>
            <p>${event.type}</p>
        </div>
        <div class="mb-3">
            <h6>ملاحظات</h6>
            <p>${event.notes || 'لا توجد ملاحظات'}</p>
        </div>
    `;
    
    // Store the event index for deletion
    document.getElementById('deleteEventBtn').setAttribute('data-index', index);
}

function addAppointment(e) {
    e.preventDefault();
    
    const title = document.getElementById('eventTitle').value;
    const date = document.getElementById('eventDate').value;
    const time = document.getElementById('eventTime').value;
    const type = document.getElementById('eventType').value;
    const notes = document.getElementById('eventNotes').value;
    
    const newEvent = {
        title,
        date,
        time,
        type,
        notes
    };
    
    events.push(newEvent);
    updateCalendar();
    updateUpcomingEvents();
    updateStatistics();
    
    // Reset form
    e.target.reset();
    
    // Show success message
    Swal.fire({
        icon: 'success',
        title: 'تمت الإضافة!',
        text: 'تم إضافة الموعد بنجاح',
        confirmButtonText: 'حسناً'
    });
}

function deleteEvent() {
    const index = this.getAttribute('data-index');
    
    Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "لن تتمكن من استعادة هذا الموعد!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'نعم، احذفه!',
        cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) {
            events.splice(index, 1);
            updateCalendar();
            updateUpcomingEvents();
            updateStatistics();
            
            const eventModal = bootstrap.Modal.getInstance(document.getElementById('eventModal'));
            eventModal.hide();
            
            Swal.fire(
                'تم الحذف!',
                'تم حذف الموعد بنجاح.',
                'success'
            );
        }
    });
}

// Task functions
let tasks = [];

function addTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value;
    const subject = document.getElementById('taskSubject').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const priority = document.getElementById('taskPriority').value;
    const notes = document.getElementById('taskNotes').value;
    
    const newTask = {
        id: Date.now(),
        title,
        subject,
        dueDate,
        priority,
        notes,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    updateTaskList();
    updateStatistics();
    
    // Reset form
    e.target.reset();
    
    // Show success message
    Swal.fire({
        icon: 'success',
        title: 'تمت الإضافة!',
        text: 'تم إضافة المهمة بنجاح',
        confirmButtonText: 'حسناً'
    });
}

function updateTaskList(filter = 'all') {
    const taskListElement = document.getElementById('taskList');
    
    let filteredTasks = [...tasks];
    
    if (filter === 'high') {
        filteredTasks = tasks.filter(task => task.priority === 'high' && !task.completed);
    } else if (filter === 'medium') {
        filteredTasks = tasks.filter(task => task.priority === 'medium' && !task.completed);
    } else if (filter === 'low') {
        filteredTasks = tasks.filter(task => task.priority === 'low' && !task.completed);
    } else if (filter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    } else if (filter === 'pending') {
        filteredTasks = tasks.filter(task => !task.completed);
    }
    
    if (filteredTasks.length === 0) {
        taskListElement.innerHTML = '<p class="text-center py-3 text-muted">لا توجد مهام لعرضها</p>';
        return;
    }
    
    let tasksHTML = '';
    
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return new Date(a.dueDate) - new Date(b.dueDate);
    }).forEach(task => {
        const dueDate = moment(task.dueDate).format('DD/MM/YYYY');
        const isOverdue = !task.completed && new Date(task.dueDate) < new Date();
        
        tasksHTML += `
            <div class="task-item ${task.priority}-priority ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <div class="task-actions">
                    <button class="btn btn-sm btn-outline-secondary view-task me-1">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="task-title">${task.title}</div>
                <div class="task-subject">${task.subject}</div>
                <div class="task-due ${isOverdue ? 'text-danger' : ''}">
                    <i class="far fa-calendar-alt me-1"></i>
                    ${dueDate} ${isOverdue ? '(متأخرة)' : ''}
                </div>
                <div class="task-priority">
                    ${getPriorityText(task.priority)}
                </div>
            </div>
        `;
    });
    
    taskListElement.innerHTML = tasksHTML;
    
    // Add event listeners to task items
    document.querySelectorAll('.task-item').forEach(task => {
        task.addEventListener('click', function() {
            const taskId = parseInt(this.getAttribute('data-id'));
            showTaskDetails(taskId);
        });
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-task').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const taskId = parseInt(this.closest('.task-item').getAttribute('data-id'));
            showTaskDetails(taskId);
        });
    });
}

function filterTasks(filter) {
    updateTaskList(filter);
    
    // Update dropdown text
    document.getElementById('filterTasks').textContent = 
        filter === 'all' ? 'تصفية المهام' :
        filter === 'high' ? 'عالية الأولوية' :
        filter === 'medium' ? 'متوسطة الأولوية' :
        filter === 'low' ? 'منخفضة الأولوية' :
        filter === 'completed' ? 'مكتملة' : 'قيد الانتظار';
}

function getPriorityText(priority) {
    return priority === 'high' ? 'عالية' :
           priority === 'medium' ? 'متوسطة' : 'منخفضة';
}

function showTaskDetails(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const modalTitle = document.getElementById('taskModalTitle');
    const modalBody = document.getElementById('taskModalBody');
    
    modalTitle.textContent = task.title;
    
    const dueDate = moment(task.dueDate).format('dddd، DD MMMM YYYY');
    const isOverdue = !task.completed && new Date(task.dueDate) < new Date();
    
    modalBody.innerHTML = `
        <div class="mb-3">
            <h6>المادة الدراسية</h6>
            <p>${task.subject}</p>
        </div>
        <div class="mb-3">
            <h6>موعد التسليم</h6>
            <p class="${isOverdue ? 'text-danger' : ''}">${dueDate} ${isOverdue ? '(متأخرة)' : ''}</p>
        </div>
        <div class="mb-3">
            <h6>الأولوية</h6>
            <p>${getPriorityText(task.priority)}</p>
        </div>
        <div class="mb-3">
            <h6>حالة المهمة</h6>
            <p>${task.completed ? 'مكتملة' : 'قيد الانتظار'}</p>
        </div>
        <div class="mb-3">
            <h6>تفاصيل المهمة</h6>
            <p>${task.notes || 'لا توجد تفاصيل إضافية'}</p>
        </div>
    `;
    
    // Update buttons based on task status
    const completeBtn = document.getElementById('completeTaskBtn');
    
    if (task.completed) {
        completeBtn.classList.add('d-none');
    } else {
        completeBtn.classList.remove('d-none');
        completeBtn.textContent = 'تم الإنجاز';
    }
    
    // Store the task ID for actions
    document.getElementById('completeTaskBtn').setAttribute('data-id', taskId);
    document.getElementById('deleteTaskBtn').setAttribute('data-id', taskId);
    
    // Show the modal
    const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
    taskModal.show();
}

function completeTask() {
    const taskId = parseInt(this.getAttribute('data-id'));
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = true;
        updateTaskList();
        updateStatistics();
        
        const taskModal = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
        taskModal.hide();
        
        Swal.fire(
            'تم الإنجاز!',
            'تم تحديث حالة المهمة إلى مكتملة.',
            'success'
        );
    }
}

function deleteTask() {
    const taskId = parseInt(this.getAttribute('data-id'));
    
    Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "لن تتمكن من استعادة هذه المهمة!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'نعم، احذفها!',
        cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) {
            tasks = tasks.filter(t => t.id !== taskId);
            updateTaskList();
            updateStatistics();
            
            const taskModal = bootstrap.Modal.getInstance(document.getElementById('taskModal'));
            taskModal.hide();
            
            Swal.fire(
                'تم الحذف!',
                'تم حذف المهمة بنجاح.',
                'success'
            );
        }
    });
}

// Statistics functions
function updateStatistics() {
    // Calculate total study hours
    const studyEvents = events.filter(event => event.type === 'study');
    let totalHours = 0;
    
    studyEvents.forEach(event => {
        // Simple calculation - assuming each study event is 1 hour
        totalHours += 1;
    });
    
    document.getElementById('totalStudyHours').textContent = totalHours;
    
    // Calculate completed and pending tasks
    const completedTasksCount = tasks.filter(task => task.completed).length;
    const pendingTasksCount = tasks.filter(task => !task.completed).length;
    
    document.getElementById('completedTasks').textContent = completedTasksCount;
    document.getElementById('pendingTasks').textContent = pendingTasksCount;
    
    // Calculate productivity score
    const totalTasks = tasks.length;
    const productivityScore = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;
    document.getElementById('productivityScore').textContent = `${productivityScore}%`;
    
    // Update charts
    updateCharts();
}

function initializeCharts() {
    // Study hours chart
    const studyHoursCtx = document.getElementById('studyHoursChart').getContext('2d');
    window.studyHoursChart = new Chart(studyHoursCtx, {
        type: 'bar',
        data: {
            labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
            datasets: [{
                label: 'ساعات الدراسة',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'عدد الساعات'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'أيام الأسبوع'
                    }
                }
            }
        }
    });
    
    // Tasks priority chart
    const tasksPriorityCtx = document.getElementById('tasksPriorityChart').getContext('2d');
    window.tasksPriorityChart = new Chart(tasksPriorityCtx, {
        type: 'doughnut',
        data: {
            labels: ['عالية', 'متوسطة', 'منخفضة'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(54, 162, 235, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'توزيع المهام حسب الأولوية'
                }
            }
        }
    });
}

function updateCharts() {
    // Update study hours chart
    const daysOfWeek = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const studyHoursData = [0, 0, 0, 0, 0, 0, 0];
    
    events.filter(event => event.type === 'study').forEach(event => {
        const day = moment(event.date).day();
        studyHoursData[day] += 1; // Assuming each study event is 1 hour
    });
    
    window.studyHoursChart.data.datasets[0].data = studyHoursData;
    window.studyHoursChart.update();
    
    // Update tasks priority chart
    const highPriorityTasks = tasks.filter(task => task.priority === 'high').length;
    const mediumPriorityTasks = tasks.filter(task => task.priority === 'medium').length;
    const lowPriorityTasks = tasks.filter(task => task.priority === 'low').length;
    
    window.tasksPriorityChart.data.datasets[0].data = [highPriorityTasks, mediumPriorityTasks, lowPriorityTasks];
    window.tasksPriorityChart.update();
}

// Settings functions
function saveSettings(e) {
    e.preventDefault();
    
    const themeColor = document.getElementById('themeColor').value;
    const darkMode = document.getElementById('darkMode').value;
    const reminderTime = document.getElementById('reminderTime').value;
    const notificationSound = document.getElementById('notificationSound').value;
    const studySessionLength = document.getElementById('studySessionLength').value;
    const breakLength = document.getElementById('breakLength').value;
    
    // In a real app, you would save these settings to localStorage or a database
    console.log('Settings saved:', {
        themeColor,
        darkMode,
        reminderTime,
        notificationSound,
        studySessionLength,
        breakLength
    });
    
    Swal.fire({
        icon: 'success',
        title: 'تم الحفظ!',
        text: 'تم حفظ الإعدادات بنجاح',
        confirmButtonText: 'حسناً'
    });
}

// Sample data loading
function loadSampleData() {
    // Sample events
    const sampleEvents = [
        {
            title: 'مراجعة الرياضيات',
            date: moment().format('YYYY-MM-DD'),
            time: '09:00',
            type: 'study',
            notes: 'مراجعة الفصل الثالث - التفاضل والتكامل'
        },
        {
            title: 'محاضرة الفيزياء',
            date: moment().add(1, 'days').format('YYYY-MM-DD'),
            time: '11:00',
            type: 'study',
            notes: 'المحاضرة الثالثة - الديناميكا الحرارية'
        },
        {
            title: 'اجتماع مع المشرف',
            date: moment().add(2, 'days').format('YYYY-MM-DD'),
            time: '14:00',
            type: 'work',
            notes: 'مناقشة تقدم البحث'
        },
        {
            title: 'تسليم التقرير',
            date: moment().add(3, 'days').format('YYYY-MM-DD'),
            time: '23:59',
            type: 'work',
            notes: 'تسليم التقرير النهائي لمادة الإحصاء'
        }
    ];
    
    events = [...sampleEvents];
    updateCalendar();
    
    // Sample tasks
    const sampleTasks = [
        {
            id: 1,
            title: 'حل تمارين الرياضيات',
            subject: 'الرياضيات',
            dueDate: moment().add(1, 'days').format('YYYY-MM-DD'),
            priority: 'high',
            notes: 'حل التمارين من الصفحة 45 إلى 50',
            completed: false,
            createdAt: moment().subtract(2, 'days').toISOString()
        },
        {
            id: 2,
            title: 'قراءة البحث',
            subject: 'الفيزياء',
            dueDate: moment().add(2, 'days').format('YYYY-MM-DD'),
            priority: 'medium',
            notes: 'قراءة البحث حول الديناميكا الحرارية',
            completed: false,
            createdAt: moment().subtract(1, 'days').toISOString()
        },
        {
            id: 3,
            title: 'كتابة الملخص',
            subject: 'الأحياء',
            dueDate: moment().subtract(1, 'days').format('YYYY-MM-DD'),
            priority: 'low',
            notes: 'تلخيص الفصل الثاني حول الخلية',
            completed: true,
            createdAt: moment().subtract(5, 'days').toISOString()
        }
    ];
    
    tasks = [...sampleTasks];
    updateTaskList();
    
    // Update statistics and upcoming events
    updateStatistics();
    updateUpcomingEvents();
}

function updateUpcomingEvents() {
    const upcomingEventsElement = document.getElementById('upcomingEvents');
    
    // Sort events by date and time
    const sortedEvents = [...events].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });
    
    // Get upcoming events (next 7 days)
    const today = moment().startOf('day');
    const nextWeek = moment().add(7, 'days').endOf('day');
    
    const upcomingEvents = sortedEvents.filter(event => {
        const eventDate = moment(`${event.date}T${event.time}`);
        return eventDate.isBetween(today, nextWeek);
    });
    
    if (upcomingEvents.length === 0) {
        upcomingEventsElement.innerHTML = '<p class="text-center py-3 text-muted">لا توجد مواعيد قريبة</p>';
        return;
    }
    
    let eventsHTML = '';
    
    upcomingEvents.forEach(event => {
        const eventDate = moment(`${event.date}T${event.time}`);
        const formattedDate = eventDate.format('dddd، DD MMMM');
        const formattedTime = eventDate.format('h:mm a');
        
        eventsHTML += `
            <div class="event-item ${event.type}-event">
                <div class="event-time">
                    <i class="far fa-clock me-1"></i>
                    ${formattedDate} في ${formattedTime}
                </div>
                <div class="event-title">${event.title}</div>
                <div class="event-type">${event.type === 'study' ? 'دراسة' : event.type === 'work' ? 'عمل' : 'شخصي'}</div>
            </div>
        `;
    });
    
    upcomingEventsElement.innerHTML = eventsHTML;
}

// Apply theme settings
function applyThemeSettings() {
    const darkMode = localStorage.getItem('darkMode') || 'auto';
    setDarkMode(darkMode);
    
    const themeColor = localStorage.getItem('themeColor') || 'blue';
    setThemeColor(themeColor);
}

// Set dark mode
function setDarkMode(mode) {
    document.body.classList.remove('dark-mode', 'light-mode');
    
    if (mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    } else if (mode === 'light') {
        document.body.classList.add('light-mode');
    }
    
    localStorage.setItem('darkMode', mode);
    document.getElementById('darkMode').value = mode;
}

// Set theme color
function setThemeColor(color) {
    const colors = {
        blue: '#0d6efd',
        green: '#198754',
        purple: '#6f42c1',
        red: '#dc3545'
    };
    
    document.documentElement.style.setProperty('--primary-color', colors[color]);
    localStorage.setItem('themeColor', color);
    document.getElementById('themeColor').value = color;
}

// Update saveSettings function
function saveSettings(e) {
    e.preventDefault();
    
    const themeColor = document.getElementById('themeColor').value;
    const darkMode = document.getElementById('darkMode').value;
    const reminderTime = document.getElementById('reminderTime').value;
    const notificationSound = document.getElementById('notificationSound').value;
    const studySessionLength = document.getElementById('studySessionLength').value;
    const breakLength = document.getElementById('breakLength').value;
    
    // Save settings to localStorage
    localStorage.setItem('themeColor', themeColor);
    localStorage.setItem('darkMode', darkMode);
    localStorage.setItem('reminderTime', reminderTime);
    localStorage.setItem('notificationSound', notificationSound);
    localStorage.setItem('studySessionLength', studySessionLength);
    localStorage.setItem('breakLength', breakLength);
    
    // Apply settings
    setThemeColor(themeColor);
    setDarkMode(darkMode);
    
    Swal.fire({
        icon: 'success',
        title: 'تم الحفظ!',
        text: 'تم حفظ الإعدادات بنجاح',
        confirmButtonText: 'حسناً'
    });
}

// Add to DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Load and apply settings
    applyThemeSettings();
    
    // Watch for system color scheme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('darkMode') === 'auto') {
            setDarkMode('auto');
        }
    });
});

// Add class to body when in settings section
window.addEventListener('scroll', function() {
    const settingsSection = document.getElementById('settings');
    const tasksSection = document.getElementById('tasks');
    const scrollPosition = window.scrollY;
    
    if (isElementInViewport(settingsSection) || isElementInViewport(tasksSection)) {
        document.body.classList.add('dark-mode-check');
    } else {
        document.body.classList.remove('dark-mode-check');
    }
});

function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.bottom >= 0
    );
}

/*000000000000000000000000000000000 */


// ==========================================
// رؤية - ملف JavaScript الرئيسي
// ==========================================

const API_BASE_URL = 'https://ruaya-backend-production.up.railway.app/api';

const PATH_NAMES = {
    medicine: 'طب وعلوم حياة',
    engineering: 'هندسة وعلوم حاسب',
    arts: 'آداب وفنون',
    business: 'إدارة أعمال'
};

const PROTECTED_PAGES = [
    'dashboard.html', 'plan.html', 'week.html', 'subjects.html',
    'exams.html', 'leaderboard.html', 'profile.html', 'onboarding.html'
];

// ========== دوال مساعدة للـ API ==========
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
    const token = localStorage.getItem('ruaya_token');
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (data) options.body = JSON.stringify(data);
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'خطأ في السيرفر');
        return result;
    } catch (error) {
        console.error('❌ خطأ في الـ API:', error.message);
        throw error;
    }
}

// ========== دوال localStorage ==========
function getLocalUser() {
    const data = localStorage.getItem('ruaya_user');
    return data ? JSON.parse(data) : null;
}

function saveLocalUser(user) {
    localStorage.setItem('ruaya_user', JSON.stringify(user));
}

function saveAuthToken(token) {
    if (token) localStorage.setItem('ruaya_token', token);
}

function logoutUser() {
    localStorage.removeItem('ruaya_user');
    localStorage.removeItem('ruaya_token');
}

function requireAuth() {
    const page = window.location.pathname.split('/').pop();
    if (!PROTECTED_PAGES.includes(page)) return;
    if (!getLocalUser()) window.location.href = 'login.html';
}

function updateSidebarUser(user) {
    if (!user || !user.name) return;
    const pathLabel = `${PATH_NAMES[user.path] || 'مسار'} • ${user.year === '2' ? 'السنة التانية' : 'السنة التالتة'}`;
    document.querySelectorAll('.user-avatar').forEach(el => { el.textContent = user.name.charAt(0); });
    document.querySelectorAll('.user-info h4, #sidebarName').forEach(el => { el.textContent = user.name; });
    document.querySelectorAll('.user-info span, #sidebarPath').forEach(el => { el.textContent = pathLabel; });
}

async function syncUserProgress(user) {
    if (!user || !user.id) return;
    const stats = calculateStats(user.completedTasks || {});
    const payload = {
        completedTasks: user.completedTasks || {},
        points: stats.points,
        streak: stats.streak,
        progress: stats.progress
    };
    try {
        await apiRequest(`/users/${user.id}`, 'PUT', payload);
    } catch (e) {
        console.warn('⚠️ فشل مزامنة التقدم مع السيرفر');
    }
}

// ========== دالة getUser ==========
async function getUser() {
    const localUser = getLocalUser();
    if (!localUser) return null;
    if (localUser.id) {
        try {
            const freshUser = await apiRequest(`/users/${localUser.id}`, 'GET');
            saveLocalUser(freshUser);
            return freshUser;
        } catch (error) {
            console.warn('⚠️ السيرفر مش شغال، نستخدم localStorage');
            return localUser;
        }
    }
    return localUser;
}

// ========== دوال Onboarding ==========
async function saveOnboardingData(formData) {
    try {
        let user = getLocalUser();
        if (!user) {
            alert('يرجى تسجيل الدخول أولاً');
            window.location.href = 'login.html';
            return;
        }

        user.name = formData.name || user.name;
        if (!user.name) {
            alert('الاسم مطلوب');
            return;
        }
        user.path = formData.path;
        user.year = formData.year;
        user.specialization = formData.specialization || '';
        user.weakSubjects = formData.weakSubjects || [];
        user.preferredTime = formData.preferredTime;
        user.goalScore = formData.goalScore || 500;
        user.onboardingDone = true;
        
        saveLocalUser(user);

        if (user.id) {
            try {
                await apiRequest(`/users/${user.id}`, 'PUT', {
                    name: user.name,
                    path: user.path,
                    year: user.year,
                    specialization: user.specialization,
                    weakSubjects: user.weakSubjects,
                    preferredTime: user.preferredTime,
                    goalScore: user.goalScore,
                    onboardingDone: true
                });
                console.log('✅ تم حفظ التهيئة على السيرفر');
            } catch (e) {
                console.warn('⚠️ فشل حفظ على السيرفر، البيانات محفوظة محلياً');
            }
        }

        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('❌ خطأ في حفظ التهيئة:', error);
        window.location.href = 'dashboard.html';
    }
}

// ========== دوال تسجيل الدخول ==========
window.loginUser = async function(email, password) {
    try {
        const result = await apiRequest('/users/login', 'POST', { email, password });
        if (result && result.user) {
            const userData = {
                ...result.user,
                onboardingDone: result.user.onboardingDone === 1 || result.user.onboardingDone === true
            };
            saveLocalUser(userData);
            if (result.token) saveAuthToken(result.token);
            return { user: userData };
        }
        throw new Error('بيانات غير صحيحة');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        throw error;
    }
};

// ========== دوال التسجيل ==========
window.registerUser = async function(name, email, password, path = 'medicine', year = '2', extra = {}) {
    try {
        const result = await apiRequest('/users/register', 'POST', {
            name, email, password, path, year,
            studentId: extra.studentId || '',
            parentPhone: extra.parentPhone || ''
        });
        if (result && result.id) {
            const userData = {
                id: result.id,
                name: name,
                email: email,
                studentId: extra.studentId || '',
                parentPhone: extra.parentPhone || '',
                path: path,
                year: year,
                specialization: '',
                weakSubjects: [],
                preferredTime: 'morning',
                goalScore: 500,
                onboardingDone: false,
                points: 0,
                streak: 0,
                progress: 0,
                completedTasks: {},
                badges: {},
                weeklyProgress: {},
                lastPathChange: null,
                avatarUrl: '',
                createdAt: new Date().toISOString()
            };
            saveLocalUser(userData);
            if (result.token) saveAuthToken(result.token);
            return { user: userData };
        }
        throw new Error('فشل التسجيل');
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        throw error;
    }
};

// ========== بيانات الأيام والمهام ==========
const weekDays = [
    { name: 'السبت' },
    { name: 'الأحد' },
    { name: 'الإثنين' },
    { name: 'الثلاثاء' },
    { name: 'الأربعاء' },
    { name: 'الخميس' },
    { name: 'الجمعة' }
];

const dayTasks = {
    0: [
        { id: 'sat_fajr', title: 'صلاة الفجر + أذكار', desc: 'إلزامي', time: '٤:٣٠' },
        { id: 'sat_morning', title: 'روتين الصباح', desc: 'استحمام • سنان • أذكار', time: '٧:٠٠' },
        { id: 'sat_study1', title: 'جلسة مذاكرة ١ • أحياء', desc: 'ساعة واحدة', time: '٨:٣٠' },
        { id: 'sat_break1', title: 'استراحة ١٥ دقيقة', desc: 'راحة قصيرة', time: '٩:٤٥' },
        { id: 'sat_study2', title: 'جلسة مذاكرة ٢ • كيمياء', desc: 'ساعة واحدة', time: '١٠:٠٠' },
        { id: 'sat_dhuhr', title: 'صلاة الظهر', desc: 'إلزامي + تذكير', time: '١:٠١' },
        { id: 'sat_exercise', title: 'تمارين رياضية', desc: '١٥ دقيقة', time: '٤:٠٠' },
        { id: 'sat_maghrib', title: 'صلاة المغرب', desc: 'إلزامي + تذكير', time: '٧:٥٣' },
        { id: 'sat_study3', title: 'مذاكرة مسائية • رياضيات', desc: 'ساعة واحدة', time: '٨:٣٠' }
    ],
    1: [
        { id: 'sun_fajr', title: 'صلاة الفجر + أذكار', desc: 'إلزامي', time: '٤:٣٠' },
        { id: 'sun_morning', title: 'روتين الصباح', desc: 'استحمام • سنان • أذكار', time: '٧:٠٠' },
        { id: 'sun_study1', title: 'جلسة مذاكرة ١ • رياضيات', desc: 'ساعة واحدة', time: '٨:٣٠' },
        { id: 'sun_break1', title: 'استراحة ١٥ دقيقة', desc: 'راحة قصيرة', time: '٩:٤٥' },
        { id: 'sun_study2', title: 'جلسة مذاكرة ٢ • فيزياء', desc: 'ساعة واحدة', time: '١٠:٠٠' },
        { id: 'sun_dhuhr', title: 'صلاة الظهر', desc: 'إلزامي + تذكير', time: '١:٠١' },
        { id: 'sun_exercise', title: 'تمارين رياضية', desc: '١٥ دقيقة', time: '٤:٠٠' },
        { id: 'sun_maghrib', title: 'صلاة المغرب', desc: 'إلزامي + تذكير', time: '٧:٥٣' },
        { id: 'sun_study3', title: 'مذاكرة مسائية • أحياء', desc: 'ساعة واحدة', time: '٨:٣٠' }
    ],
    2: [
        { id: 'mon_fajr', title: 'صلاة الفجر + أذكار', desc: 'إلزامي', time: '٤:٣٠' },
        { id: 'mon_morning', title: 'روتين الصباح', desc: 'استحمام • سنان • أذكار', time: '٧:٠٠' },
        { id: 'mon_study1', title: 'جلسة مذاكرة ١ • عربي', desc: 'ساعة واحدة', time: '٨:٣٠' },
        { id: 'mon_break1', title: 'استراحة ١٥ دقيقة', desc: 'راحة قصيرة', time: '٩:٤٥' },
        { id: 'mon_study2', title: 'جلسة مذاكرة ٢ • إنجليزي', desc: 'ساعة واحدة', time: '١٠:٠٠' },
        { id: 'mon_dhuhr', title: 'صلاة الظهر', desc: 'إلزامي + تذكير', time: '١:٠١' },
        { id: 'mon_exercise', title: 'تمارين رياضية', desc: '١٥ دقيقة', time: '٤:٠٠' },
        { id: 'mon_maghrib', title: 'صلاة المغرب', desc: 'إلزامي + تذكير', time: '٧:٥٣' },
        { id: 'mon_study3', title: 'مذاكرة مسائية • تاريخ', desc: 'ساعة واحدة', time: '٨:٣٠' }
    ],
    3: [
        { id: 'tue_fajr', title: 'صلاة الفجر + أذكار', desc: 'إلزامي', time: '٤:٣٠' },
        { id: 'tue_morning', title: 'روتين الصباح', desc: 'استحمام • سنان • أذكار', time: '٧:٠٠' },
        { id: 'tue_study1', title: 'جلسة مذاكرة ١ • أحياء', desc: 'ساعة واحدة', time: '٨:٣٠' },
        { id: 'tue_break1', title: 'استراحة ١٥ دقيقة', desc: 'راحة قصيرة', time: '٩:٤٥' },
        { id: 'tue_study2', title: 'جلسة مذاكرة ٢ • تاريخ', desc: 'ساعة واحدة', time: '١٠:٠٠' },
        { id: 'tue_dhuhr', title: 'صلاة الظهر', desc: 'إلزامي + تذكير', time: '١:٠١' },
        { id: 'tue_exercise', title: 'تمارين رياضية', desc: '١٥ دقيقة', time: '٤:٠٠' },
        { id: 'tue_maghrib', title: 'صلاة المغرب', desc: 'إلزامي + تذكير', time: '٧:٥٣' },
        { id: 'tue_study3', title: 'مذاكرة مسائية • كيمياء', desc: 'ساعة واحدة', time: '٨:٣٠' }
    ],
    4: [
        { id: 'wed_fajr', title: 'صلاة الفجر + أذكار', desc: 'إلزامي', time: '٤:٣٠' },
        { id: 'wed_morning', title: 'روتين الصباح', desc: 'استحمام • سنان • أذكار', time: '٧:٠٠' },
        { id: 'wed_study1', title: 'جلسة مذاكرة ١ • كيمياء', desc: 'ساعة واحدة', time: '٨:٣٠' },
        { id: 'wed_break1', title: 'استراحة ١٥ دقيقة', desc: 'راحة قصيرة', time: '٩:٤٥' },
        { id: 'wed_study2', title: 'جلسة مذاكرة ٢ • رياضيات', desc: 'ساعة واحدة', time: '١٠:٠٠' },
        { id: 'wed_dhuhr', title: 'صلاة الظهر', desc: 'إلزامي + تذكير', time: '١:٠١' },
        { id: 'wed_exercise', title: 'تمارين رياضية', desc: '١٥ دقيقة', time: '٤:٠٠' },
        { id: 'wed_maghrib', title: 'صلاة المغرب', desc: 'إلزامي + تذكير', time: '٧:٥٣' },
        { id: 'wed_study3', title: 'مذاكرة مسائية • فيزياء', desc: 'ساعة واحدة', time: '٨:٣٠' }
    ],
    5: [
        { id: 'thu_fajr', title: 'صلاة الفجر + أذكار', desc: 'إلزامي', time: '٤:٣٠' },
        { id: 'thu_morning', title: 'روتين الصباح', desc: 'استحمام • سنان • أذكار', time: '٧:٠٠' },
        { id: 'thu_study1', title: 'مراجعة شاملة', desc: 'ساعتان', time: '٨:٣٠' },
        { id: 'thu_break1', title: 'استراحة ١٥ دقيقة', desc: 'راحة قصيرة', time: '١٠:٣٠' },
        { id: 'thu_study2', title: 'اختبار تجريبي', desc: 'ساعة واحدة', time: '١٠:٤٥' },
        { id: 'thu_dhuhr', title: 'صلاة الظهر', desc: 'إلزامي + تذكير', time: '١:٠١' },
        { id: 'thu_exercise', title: 'تمارين رياضية', desc: '١٥ دقيقة', time: '٤:٠٠' },
        { id: 'thu_maghrib', title: 'صلاة المغرب', desc: 'إلزامي + تذكير', time: '٧:٥٣' },
        { id: 'thu_study3', title: 'راحة', desc: 'استعداد للجمعة', time: '٨:٣٠' }
    ],
    6: [
        { id: 'fri_fajr', title: 'صلاة الفجر + أذكار', desc: 'إلزامي', time: '٤:٣٠' },
        { id: 'fri_morning', title: 'روتين الصباح', desc: 'استحمام • سنان • أذكار', time: '٧:٠٠' },
        { id: 'fri_rest', title: 'راحة / هوايات', desc: 'يوم الجمعة راحة', time: '١٠:٠٠' },
        { id: 'fri_dhuhr', title: 'صلاة الظهر', desc: 'إلزامي + تذكير', time: '١:٠١' },
        { id: 'fri_maghrib', title: 'صلاة المغرب', desc: 'إلزامي + تذكير', time: '٧:٥٣' },
        { id: 'fri_isha', title: 'عشاء + أذكار', desc: 'إلزامي', time: '٩:٢١' }
    ]
};

// ========== دوال حساب النقاط والتقدم ==========
function calculateStats(completedTasks) {
    let totalTasks = 0;
    let completed = 0;
    for (let i = 0; i < 7; i++) {
        const tasks = dayTasks[i] || [];
        totalTasks += tasks.length;
        tasks.forEach(task => {
            if (completedTasks && completedTasks[task.id]) completed++;
        });
    }
    const points = completed * 10;
    const progress = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
    const streak = completed;
    return { completed, points, progress, streak, totalTasks };
}

function getTodayTasks(completedTasks) {
    const todayIndex = getCurrentDayIndex();
    const tasks = dayTasks[todayIndex] || [];
    let total = tasks.length;
    let done = 0;
    tasks.forEach(task => {
        if (completedTasks && completedTasks[task.id]) done++;
    });
    return { total, done, remaining: total - done };
}

function getCurrentDayIndex() {
    const user = getLocalUser();
    if (!user) return 0;
    const now = new Date();
    const day = now.getDay(); // 0=الأحد, 1=الإثنين, ..., 6=السبت
    // نرتب الأيام بحيث السبت = 0
    const saturdayIndex = 6;
    if (day === saturdayIndex) return 0;
    return day + 1;
}

function updateStatsInUI(user) {
    const completedTasks = user.completedTasks || {};
    const stats = calculateStats(completedTasks);
    const todayStats = getTodayTasks(completedTasks);

    const progressEl = document.getElementById('progressValue');
    const streakEl = document.getElementById('streakValue');
    const streakTextEl = document.getElementById('streakText');
    const scoreEl = document.getElementById('scoreValue');
    const tasksEl = document.getElementById('tasksValue');

    if (progressEl) progressEl.textContent = stats.progress + '%';
    if (streakEl) streakEl.textContent = stats.streak;
    if (streakTextEl) streakTextEl.textContent = stats.streak;
    if (scoreEl) scoreEl.textContent = stats.points;
    if (tasksEl) tasksEl.textContent = todayStats.remaining;
}

// ========== دوال Dashboard ==========
async function loadDashboard() {
    try {
        const user = await getUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = user.name.split(' ')[0];
        updateStatsInUI(user);
        updateSidebarUser(user);

        const stats = calculateStats(user.completedTasks || {});
        renderPathNodes(stats.progress);

        setInterval(async () => {
            try {
                const freshUser = await getUser();
                if (freshUser) {
                    updateStatsInUI(freshUser);
                    const freshStats = calculateStats(freshUser.completedTasks || {});
                    renderPathNodes(freshStats.progress);
                }
            } catch (e) {}
        }, 10000);

    } catch (error) {
        console.error('❌ خطأ في تحميل Dashboard:', error);
    }
}

function renderPathNodes(progressPercent) {
    const container = document.getElementById('pathNodes');
    if (!container) return;

    let currentWeek = 1;
    if (progressPercent >= 75) currentWeek = 4;
    else if (progressPercent >= 50) currentWeek = 3;
    else if (progressPercent >= 25) currentWeek = 2;

    const weeks = [
        { num: 1, title: 'الأسبوع الأول' },
        { num: 2, title: 'الأسبوع الثاني' },
        { num: 3, title: 'الأسبوع الثالث' },
        { num: 4, title: 'الأسبوع الرابع' },
        { num: 5, title: 'نهاية الشهر', isFinal: true }
    ];

    let html = '';
    weeks.forEach((w, index) => {
        const weekNum = index + 1;
        let circleClass = 'locked';
        let circleContent = w.isFinal ? '🏆' : w.num;
        let badgeText = 'مقفل';
        let badgeStyle = 'background:#f1f5f9;color:#94a3b8;';
        let infoText = 'مقفل • يبدأ قريباً';

        if (weekNum < currentWeek) {
            circleClass = 'completed';
            circleContent = '✓';
            badgeText = 'مكتمل';
            badgeStyle = 'background:#dcfce7;color:#16a34a;';
            infoText = 'تم بنجاح • 100%';
        } else if (weekNum === currentWeek && !w.isFinal) {
            circleClass = 'current';
            circleContent = w.num;
            badgeText = 'الحالي';
            badgeStyle = 'background:#ede9fe;color:#6d28d9;';
            const weekProgress = Math.min(Math.max(progressPercent - ((currentWeek - 1) * 25), 0), 25);
            infoText = `جاري الآن • ${Math.round(weekProgress)}%`;
        } else if (w.isFinal && progressPercent >= 100) {
            circleClass = 'completed';
            circleContent = '🏆';
            badgeText = 'مكتمل';
            badgeStyle = 'background:#dcfce7;color:#16a34a;';
            infoText = 'أحسنت! خلصت الشهر';
        }

        html += `
            <div class="path-node" onclick="window.location.href='week.html'">
                <div class="node-circle ${circleClass}">${circleContent}</div>
                <div class="node-info">
                    <h4>${w.title}</h4>
                    <span>${infoText}</span>
                </div>
                <span class="node-badge" style="${badgeStyle}">${badgeText}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateWeeklyProgress(user) {
    const completedTasks = user.completedTasks || {};
    const stats = calculateStats(completedTasks);
    const progress = stats.progress;

    let currentWeek = 1;
    if (progress >= 75) currentWeek = 4;
    else if (progress >= 50) currentWeek = 3;
    else if (progress >= 25) currentWeek = 2;
    else currentWeek = 1;

    const weekNodes = document.querySelectorAll('.path-node');
    weekNodes.forEach((node, index) => {
        const weekNum = index + 1;
        const circle = node.querySelector('.node-circle');
        const badge = node.querySelector('.node-badge');
        const infoSpan = node.querySelector('.node-info span');

        if (!circle) return;

        circle.classList.remove('completed', 'current', 'locked');

        if (weekNum < currentWeek) {
            circle.classList.add('completed');
            circle.textContent = '✓';
            if (badge) {
                badge.textContent = 'مكتمل';
                badge.style.background = '#dcfce7';
                badge.style.color = '#16a34a';
            }
            if (infoSpan) infoSpan.textContent = 'تم بنجاح • 100%';
        } else if (weekNum === currentWeek) {
            circle.classList.add('current');
            circle.textContent = weekNum;
            if (badge) {
                badge.textContent = 'الحالي';
                badge.style.background = '#ede9fe';
                badge.style.color = '#6d28d9';
            }
            if (infoSpan) {
                const weekProgress = Math.min(progress - ((currentWeek - 1) * 25), 25);
                infoSpan.textContent = `جاري الآن • ${Math.round(weekProgress)}%`;
            }
        } else {
            circle.classList.add('locked');
            circle.textContent = weekNum;
            if (badge) {
                badge.textContent = 'مقفل';
                badge.style.background = '#f1f5f9';
                badge.style.color = '#94a3b8';
            }
            if (infoSpan) infoSpan.textContent = 'مقفل • يبدأ قريباً';
        }
    });
}

// ========== دوال Profile ==========
async function loadProfile() {
    try {
        const user = await getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        updateSidebarUser(user);

        const profileName = document.getElementById('profileName');
        if (profileName) profileName.textContent = user.name;
        const yearText = user.year === '2' ? 'السنة التانية' : 'السنة التالتة';
        const profilePathYear = document.getElementById('profilePathYear');
        if (profilePathYear) profilePathYear.textContent = `${PATH_NAMES[user.path] || 'مسار'} • ${yearText}`;

        const stats = calculateStats(user.completedTasks || {});
        const profilePoints = document.getElementById('profilePoints');
        if (profilePoints) profilePoints.textContent = stats.points;
        const profileStreak = document.getElementById('profileStreak');
        if (profileStreak) profileStreak.textContent = stats.streak;
        const profileProgress = document.getElementById('profileProgress');
        if (profileProgress) profileProgress.textContent = stats.progress + '%';

        const editName = document.getElementById('editName');
        if (editName) editName.value = user.name;
        const editPath = document.getElementById('editPath');
        if (editPath) editPath.value = user.path;
        const editYear = document.getElementById('editYear');
        if (editYear) editYear.value = user.year;

        const detailPath = document.getElementById('detailPath');
        if (detailPath) detailPath.textContent = PATH_NAMES[user.path] || 'لم يحدد';
        const detailSpecialization = document.getElementById('detailSpecialization');
        if (detailSpecialization) detailSpecialization.textContent = user.specialization || 'لم يحدد';
        const detailYear = document.getElementById('detailYear');
        if (detailYear) detailYear.textContent = yearText;
        const detailGoal = document.getElementById('detailGoal');
        if (detailGoal) detailGoal.textContent = user.goalScore || '500';
        const timeMap = { morning: 'الصباح', afternoon: 'بعد الظهر', evening: 'بالليل' };
        const detailTime = document.getElementById('detailTime');
        if (detailTime) detailTime.textContent = timeMap[user.preferredTime] || 'لم يحدد';
        const detailSubjects = document.getElementById('detailSubjects');
        if (detailSubjects) {
            const subjects = getUserSubjects(user);
            detailSubjects.textContent = subjects.length > 0 ? subjects.join(' - ') : 'لم تحدد';
        }

        renderBadges(user.badges || {});
    } catch (error) {
        console.error('❌ خطأ في تحميل البروفايل:', error);
    }
}

function renderBadges(userBadges) {
    const allBadges = [
        { id: 'first_day', icon: '🌟', name: 'البداية', desc: 'أول يوم في الموقع' },
        { id: 'streak_7', icon: '🔥', name: 'المثابر', desc: '7 أيام متواصلة' },
        { id: 'streak_30', icon: '⚡', name: 'الأسطورة', desc: '30 يوم متواصلة' },
        { id: 'week_complete', icon: '🏆', name: 'الأسبوع المثالي', desc: 'أسبوع كامل مكتمل' },
        { id: 'month_complete', icon: '👑', name: 'الملك', desc: 'شهر كامل مكتمل' },
        { id: 'points_100', icon: '⭐', name: 'النجم الصاعد', desc: '100 نقطة' },
        { id: 'points_1000', icon: '💎', name: 'الأسطورة', desc: '1000 نقطة' }
    ];

    const grid = document.getElementById('badgesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    allBadges.forEach(badge => {
        const unlocked = userBadges[badge.id] === true;
        const card = document.createElement('div');
        card.className = `badge-card ${unlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
            <span class="badge-icon">${unlocked ? badge.icon : '🔒'}</span>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-desc">${badge.desc}</div>
        `;
        grid.appendChild(card);
    });
}

async function saveProfile() {
    try {
        const user = await getUser();
        if (!user) return;

        const name = document.getElementById('editName').value.trim();
        const path = document.getElementById('editPath').value;
        const year = document.getElementById('editYear').value;

        if (!name) {
            document.getElementById('editMessage').textContent = '⚠️ الاسم مطلوب';
            return;
        }

        const lastChange = user.lastPathChange ? new Date(user.lastPathChange) : null;
        const now = new Date();
        if (lastChange && (now - lastChange) < 24 * 60 * 60 * 1000) {
            const remaining = 24 * 60 * 60 * 1000 - (now - lastChange);
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            document.getElementById('editMessage').textContent = `⚠️ انتظر ${hours} ساعة و ${minutes} دقيقة`;
            return;
        }

        const updatedUser = {
            name: name,
            path: path,
            year: year,
            lastPathChange: now.toISOString()
        };

        if (user.id) {
            try {
                await apiRequest(`/users/${user.id}`, 'PUT', updatedUser);
                const freshUser = await apiRequest(`/users/${user.id}`, 'GET');
                saveLocalUser(freshUser);
            } catch (e) {
                console.warn('⚠️ فشل تحديث السيرفر، نستخدم localStorage');
                saveLocalUser({ ...user, ...updatedUser });
            }
        } else {
            saveLocalUser({ ...user, ...updatedUser });
        }

        document.getElementById('editMessage').textContent = '✅ تم الحفظ!';
        document.getElementById('editMessage').style.color = 'var(--success)';
        setTimeout(() => loadProfile(), 500);
    } catch (error) {
        console.error('❌ خطأ في حفظ البروفايل:', error);
        document.getElementById('editMessage').textContent = '❌ حدث خطأ';
    }
}

// ========== الأوائل ==========
async function loadLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;
    container.innerHTML = '<div class="loading">⏳ جاري التحميل...</div>';

    try {
        const url = `${API_BASE_URL}/users`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('فشل في جلب البيانات');
        let users = await response.json();

        if (!users || users.length === 0) {
            const localUser = getLocalUser();
            if (localUser) {
                users = [localUser];
            } else {
                container.innerHTML = '<div class="loading">📭 لا يوجد مستخدمين</div>';
                return;
            }
        }

        users.forEach(user => {
            const stats = calculateStats(user.completedTasks || {});
            user._points = stats.points;
            user._streak = stats.streak;
            user._progress = stats.progress;
            user._badgesCount = user.badges ? Object.values(user.badges).filter(v => v === true).length : 0;
        });

        users.sort((a, b) => (b._points || 0) - (a._points || 0));

        let html = '';
        users.forEach((user, index) => {
            const rank = index + 1;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            html += `
                <div class="leaderboard-item">
                    <div class="rank">${rankEmoji}</div>
                    <div class="avatar">${user.name ? user.name.charAt(0) : 'م'}</div>
                    <div class="info">
                        <div class="name">${user.name || 'مستخدم'}</div>
                        <div class="path">${user.path || 'مسار'}</div>
                    </div>
                    <div class="stats">
                        <div class="stat"><div class="value">⭐ ${user._points || 0}</div><div class="label">نقاط</div></div>
                        <div class="stat"><div class="value">🔥 ${user._streak || 0}</div><div class="label">توالي</div></div>
                        <div class="stat"><div class="value">📈 ${user._progress || 0}%</div><div class="label">تقدم</div></div>
                        <div class="badges-mini">${'🏅'.repeat(Math.min(user._badgesCount || 0, 5))}</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        console.error('❌ خطأ في جلب الأوائل:', error);
        container.innerHTML = '<div class="loading">❌ حدث خطأ</div>';
    }
}

// ========== دوال Subjects ==========
function loadSubjects() {
    const user = getLocalUser();
    if (!user) return;

    const subjectsByYear = {
        '2': {
            'medicine': ['عربي', 'إنجليزي', 'تاريخ وطني', 'رياضيات', 'فيزياء'],
            'engineering': ['عربي', 'إنجليزي', 'تاريخ وطني', 'برمجة', 'كيمياء'],
            'arts': ['عربي', 'إنجليزي', 'تاريخ وطني', 'علم النفس', 'لغة أجنبية ثانية'],
            'business': ['عربي', 'إنجليزي', 'تاريخ وطني', 'محاسبة', 'إدارة أعمال']
        },
        '3': {
            'medicine': ['أحياء', 'كيمياء'],
            'engineering': ['رياضيات', 'فيزياء'],
            'arts': ['جغرافيا', 'إحصاء'],
            'business': ['اقتصاد', 'رياضيات']
        }
    };

    let subjects = subjectsByYear[user.year]?.[user.path] || [];

    if (user.year === '2' && user.specialization) {
        const baseSubjects = ['عربي', 'إنجليزي', 'تاريخ وطني'];
        subjects = [...baseSubjects, user.specialization];
    }

    subjects = [...new Set(subjects)];

    const container = document.getElementById('subjectsGrid');
    if (!container) return;

    if (subjects.length === 0) {
        container.innerHTML = '<div class="loading">📭 لا توجد مواد</div>';
        return;
    }

    const icons = {
        'عربي': '📖', 'إنجليزي': '🇬🇧', 'تاريخ وطني': '📜', 'رياضيات': '📐',
        'فيزياء': '⚡', 'برمجة': '💻', 'كيمياء': '🧪', 'علم النفس': '🧠',
        'لغة أجنبية ثانية': '🗣️', 'محاسبة': '📊', 'إدارة أعمال': '📈',
        'أحياء': '🧬', 'جغرافيا': '🌍', 'إحصاء': '📉', 'اقتصاد': '💰'
    };

    let html = '';
    subjects.forEach(subject => {
        const icon = icons[subject] || '📚';
        const isElective = subject === user.specialization && user.year === '2';
        const type = isElective ? 'اختياري' : (user.year === '2' ? 'أساسي' : 'تخصص');
        html += `
            <div class="subject-card" onclick="alert('📖 ${subject}\nقريباً سيتم إضافة المحتوى')">
                <span class="subject-icon">${icon}</span>
                <div class="subject-name">${subject}</div>
                <div class="subject-type">${type}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function getSpecializationOptions(path) {
    const map = {
        medicine: ['رياضيات', 'فيزياء'],
        engineering: ['برمجة', 'كيمياء'],
        arts: ['علم النفس', 'اللغة الأجنبية الثانية'],
        business: ['محاسبة', 'إدارة أعمال']
    };
    return map[path] || [];
}

document.addEventListener('DOMContentLoaded', function() {
    requireAuth();
    applyDarkMode();
    const path = window.location.pathname.split('/').pop();
    if (path === 'dashboard.html' || path === '') loadDashboard();
    else if (path === 'profile.html') loadProfile();
    else if (path === 'leaderboard.html') loadLeaderboard();
    else if (path === 'subjects.html') loadSubjects();
});

// ========== تصدير الدوال ==========
window.renderPathNodes = renderPathNodes;
window.syncUserProgress = syncUserProgress;
window.updateSidebarUser = updateSidebarUser;
window.logoutUser = logoutUser;
window.saveOnboardingData = saveOnboardingData;
window.getSpecializationOptions = getSpecializationOptions;
window.saveProfile = saveProfile;
window.loadLeaderboard = loadLeaderboard;
window.loadSubjects = loadSubjects;
window.getUser = getUser;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.loadDashboard = loadDashboard;
window.updateStatsInUI = updateStatsInUI;
window.calculateStats = calculateStats;
window.getCurrentDayIndex = getCurrentDayIndex;
window.getTodayTasks = getTodayTasks;
window.dayTasks = dayTasks;
window.weekDays = weekDays;

// ========== Dark Mode ==========
function applyDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        toggleBtn.textContent = isDark ? '☀️' : '🌙';
    }
}

function toggleDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    localStorage.setItem('darkMode', isDark ? 'false' : 'true');
    applyDarkMode();
}

document.addEventListener('DOMContentLoaded', function() {
    applyDarkMode();
});

window.toggleDarkMode = toggleDarkMode;
window.applyDarkMode = applyDarkMode;

function getUserSubjects(user) {
    if (!user) return [];
    const year = user.year || '2';
    const path = user.path || 'medicine';
    const specialization = user.specialization || '';

    const core = ['عربي', 'إنجليزي', 'تاريخ وطني'];
    if (year === '2') {
        if (specialization) {
            return [...core, specialization];
        }
        return core;
    } else {
        const map = {
            'medicine': ['أحياء', 'كيمياء'],
            'engineering': ['رياضيات', 'فيزياء'],
            'arts': ['جغرافيا', 'إحصاء'],
            'business': ['اقتصاد', 'رياضيات']
        };
        return map[path] || [];
    }
}

window.getUserSubjects = getUserSubjects;

console.log('🚀 رؤية شغالة');
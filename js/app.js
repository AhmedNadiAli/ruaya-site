// ==========================================
// رؤية - ملف JavaScript الرئيسي
// ==========================================

const API_BASE_URL = 'https://ruaya-backend-production.up.railway.app/api';

// ========== دوال مساعدة للـ API ==========
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
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

// ========== ثوابت وبيانات مشتركة (بدل التكرار في كل صفحة) ==========
const PATH_NAMES = {
    medicine: 'طب وعلوم حياة',
    engineering: 'هندسة وعلوم حاسب',
    arts: 'آداب وفنون',
    business: 'إدارة أعمال'
};

function getPathName(path) {
    return PATH_NAMES[path] || 'مسار';
}

function getYearText(year) {
    return year === '2' ? 'السنة التانية' : 'السنة التالتة';
}

// تحديث الشريط الجانبي (اسم + مسار/سنة + أفاتار) — نفس المنطق كان متكرر في كل صفحة
function updateSidebar(user) {
    if (!user || !user.name) return;
    const nameEl = document.getElementById('sidebarName');
    const pathEl = document.getElementById('sidebarPath');
    const avatarEl = document.querySelector('.user-avatar');
    if (nameEl) nameEl.textContent = user.name;
    if (pathEl) pathEl.textContent = `${getPathName(user.path)} • ${getYearText(user.year)}`;
    if (avatarEl) avatarEl.textContent = user.name.charAt(0);
}
window.updateSidebar = updateSidebar;
window.getPathName = getPathName;
window.getYearText = getYearText;

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

        user.name = formData.name || user.name || 'أحمد نادي';
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
            return { user: userData };
        }
        throw new Error('بيانات غير صحيحة');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        throw error;
    }
};

// ========== دوال التسجيل ==========
window.registerUser = async function(name, email, password, path = 'medicine', year = '2', parentPhone = '') {
    try {
        // ملحوظة: parentPhone بتتبعت للسيرفر لو الباك اند بيدعمها؛ لو الحقل مش موجود
        // في السيرفر لسه، هيتجاهله السيرفر عادي من غير ما يكسر التسجيل
        const result = await apiRequest('/users/register', 'POST', { name, email, password, path, year, parentPhone });
        if (result && result.id) {
            const userData = {
                id: result.id,
                name: name,
                email: email,
                parentPhone: parentPhone || '',
                path: path,
                year: year,
                specialization: '',
                weakSubjects: [],
                preferredTime: 'morning',
                goalScore: 500,
                onboardingDone: false,
                points: 0,
                streak: 0,
                lastActiveDate: null,
                progress: 0,
                completedTasks: {},
                badges: {},
                weeklyProgress: {},
                lastPathChange: null,
                avatarUrl: '',
                createdAt: new Date().toISOString()
            };
            saveLocalUser(userData);
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
// ملحوظة: الستريك بقى محسوب من تاريخ فعلي (آخر يوم كان فيه المستخدم نشط)
// مش من مجموع المهام المنجزة زي الأول (كان بيدي رقم غلط تمامًا)
function calculateStats(completedTasks, user) {
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
    const streak = (user && typeof user.streak === 'number') ? user.streak : 0;
    return { completed, points, progress, streak, totalTasks };
}

// ========== الستريك الحقيقي (أيام متتالية) ==========
// بتتنادى كل ما المستخدم يخلّص مهمة، وبتقارن آخر يوم نشط بالنهاردة
function updateStreakOnActivity(user) {
    const todayKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastKey = user.lastActiveDate ? user.lastActiveDate.split('T')[0] : null;

    if (lastKey === todayKey) {
        // اتحسب النهاردة قبل كدا، متزودش تاني
        return user;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    if (lastKey === yesterdayKey) {
        user.streak = (user.streak || 0) + 1; // استمرارية
    } else {
        user.streak = 1; // انقطع الاستمرار أو أول مرة
    }
    user.lastActiveDate = new Date().toISOString();
    return user;
}

// ========== الأسبوع الحالي من الشهر (حسب التاريخ الفعلي مش نسبة الإنجاز) ==========
function getCurrentMonthWeek() {
    const dayOfMonth = new Date().getDate();
    const week = Math.ceil(dayOfMonth / 7);
    return Math.min(week, 4); // أسابيع 1-4، والعقدة الخامسة "نهاية الشهر" بتتحدد لوحدها في العرض
}

// نسبة تقدم الشهر ككل = مبنية على الأسبوع الحالي (حسب التاريخ) + تقدم مهام الأسبوع الحالي
function getMonthProgress(weekTaskProgress) {
    const currentWeek = getCurrentMonthWeek();
    const base = (currentWeek - 1) * 25;
    const extra = (weekTaskProgress || 0) * 0.25;
    return Math.min(100, Math.round(base + extra));
}

window.updateStreakOnActivity = updateStreakOnActivity;
window.getCurrentMonthWeek = getCurrentMonthWeek;
window.getMonthProgress = getMonthProgress;

// ========== نظام الشارات — دلوقتي بيتفعّل فعليًا ==========
function checkAndAwardBadges(user, stats) {
    if (!user.badges) user.badges = {};
    const b = user.badges;
    let changed = false;

    const award = (id, condition) => {
        if (condition && !b[id]) { b[id] = true; changed = true; }
    };

    award('first_day', stats.completed >= 1);
    award('streak_7', (user.streak || 0) >= 7);
    award('streak_30', (user.streak || 0) >= 30);
    award('week_complete', stats.totalTasks > 0 && stats.completed === stats.totalTasks);
    award('points_100', stats.points >= 100);
    award('points_1000', stats.points >= 1000);
    // "الملك" (شهر كامل) هتتفعل لما محتوى الأسابيع الأربعة الفعلي يتحدد مع الباك اند

    return changed;
}
window.checkAndAwardBadges = checkAndAwardBadges;

// ========== تبديل حالة مهمة (نقطة واحدة موحّدة بدل تكرار المنطق في كل صفحة) ==========
// بتحدث كل حاجة محليًا فورًا، وبتحاول تبعت للسيرفر في الخلفية عشان البيانات متضيعش
// لما تتزامن من جديد (getUser بتجيب من السيرفر وتكتب فوق الـ localStorage)
async function toggleTaskCompletion(taskId) {
    const user = getLocalUser();
    if (!user) return null;

    if (!user.completedTasks) user.completedTasks = {};
    const isNowDone = !user.completedTasks[taskId];
    user.completedTasks[taskId] = isNowDone;

    if (isNowDone) {
        updateStreakOnActivity(user);
    }

    const stats = calculateStats(user.completedTasks, user);
    checkAndAwardBadges(user, stats);

    saveLocalUser(user);

    // نبعت للسيرفر في الخلفية (best-effort) عشان أي مزامنة لاحقة متمسحش التقدم
    if (user.id) {
        try {
            await apiRequest(`/users/${user.id}`, 'PUT', {
                completedTasks: user.completedTasks,
                streak: user.streak || 0,
                lastActiveDate: user.lastActiveDate || null,
                badges: user.badges || {}
            });
        } catch (e) {
            console.warn('⚠️ فشل مزامنة المهمة مع السيرفر، هتتحاول تاني لاحقًا');
        }
    }

    return user;
}
window.toggleTaskCompletion = toggleTaskCompletion;

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
    const stats = calculateStats(completedTasks, user);
    const todayStats = getTodayTasks(completedTasks);
    const monthProgress = getMonthProgress(stats.progress);

    const progressEl = document.getElementById('progressValue');
    const streakEl = document.getElementById('streakValue');
    const streakTextEl = document.getElementById('streakText');
    const scoreEl = document.getElementById('scoreValue');
    const tasksEl = document.getElementById('tasksValue');

    if (progressEl) progressEl.textContent = monthProgress + '%';
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

        document.getElementById('userName').textContent = user.name.split(' ')[0];
        updateStatsInUI(user);
        updateSidebar(user);

        // نبني عقد رحلة الشهر أولاً (كانت بتتبنى بس في مسار احتياطي مستحيل يتنفذ عمليًا)
        if (typeof window.renderPathNodes === 'function') {
            window.renderPathNodes(getCurrentMonthWeek());
        }
        updateWeeklyProgress(user);

        setInterval(async () => {
            try {
                const freshUser = await getUser();
                if (freshUser) {
                    updateStatsInUI(freshUser);
                    updateWeeklyProgress(freshUser);
                }
            } catch (e) {}
        }, 10000);

    } catch (error) {
        console.error('❌ خطأ في تحميل Dashboard:', error);
    }
}

function updateWeeklyProgress(user) {
    const completedTasks = user.completedTasks || {};
    const stats = calculateStats(completedTasks, user);
    // الأسبوع الحالي بقى محسوب من التاريخ الفعلي، مش من نسبة إنجاز أسبوع واحد
    // (كان بيدي انطباع إن الشهر خلص بمجرد ما تخلص أسبوع واحد من المهام)
    const currentWeek = getCurrentMonthWeek();
    const weekTaskProgress = stats.progress; // تقدم مهام الأسبوع الحالي (نفس القالب بيتكرر أسبوعيًا لحد ما محتوى 4 أسابيع مستقل يتضاف)

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
                infoSpan.textContent = `جاري الآن • ${Math.round(weekTaskProgress)}%`;
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
// (دالة تحميل صفحة البروفايل الكاملة موجودة في profile.html نفسها، لأنها بتعرض
// تفاصيل إضافية زي الهدف ووقت المذاكرة؛ هنا بنسيب بس الدوال المشتركة زي الشارات والحفظ)

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

// ملحوظة: دالة حفظ البروفايل الكاملة موجودة في profile.html (بتحدث تفاصيل إضافية)

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
            const stats = calculateStats(user.completedTasks || {}, user);
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

// ملحوظة: تم حذف الراوتر التلقائي اللي كان هنا (كان بينادي loadDashboard/loadProfile/...
// حسب اسم الصفحة) لأن كل صفحة أصلاً عندها استدعاء صريح لدالتها في السكريبت بتاعها،
// وده كان بيسبب نداء كل دالة تحميل مرتين (طلبات API مضاعفة + setInterval مضاعف في الداشبورد)

// ========== تصدير الدوال ==========
window.saveOnboardingData = saveOnboardingData;
window.getSpecializationOptions = getSpecializationOptions;
window.loadLeaderboard = loadLeaderboard;
window.loadSubjects = loadSubjects;
window.getUser = getUser;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.loadDashboard = loadDashboard;
window.updateStatsInUI = updateStatsInUI;
window.renderBadges = renderBadges;
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
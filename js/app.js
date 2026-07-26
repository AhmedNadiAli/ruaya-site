// ==========================================
// رؤية - ملف JavaScript الرئيسي (نسخة بسيطة)
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

// ========== بيانات المهام ==========
const dayTasks = {
    0: [
        { id: 'sat_fajr', title: 'صلاة الفجر + أذكار' },
        { id: 'sat_morning', title: 'روتين الصباح' },
        { id: 'sat_study1', title: 'جلسة مذاكرة ١ • أحياء' },
        { id: 'sat_break1', title: 'استراحة ١٥ دقيقة' },
        { id: 'sat_study2', title: 'جلسة مذاكرة ٢ • كيمياء' },
        { id: 'sat_dhuhr', title: 'صلاة الظهر' },
        { id: 'sat_exercise', title: 'تمارين رياضية' },
        { id: 'sat_maghrib', title: 'صلاة المغرب' },
        { id: 'sat_study3', title: 'مذاكرة مسائية • رياضيات' }
    ],
    1: [
        { id: 'sun_fajr', title: 'صلاة الفجر + أذكار' },
        { id: 'sun_morning', title: 'روتين الصباح' },
        { id: 'sun_study1', title: 'جلسة مذاكرة ١ • رياضيات' },
        { id: 'sun_break1', title: 'استراحة ١٥ دقيقة' },
        { id: 'sun_study2', title: 'جلسة مذاكرة ٢ • فيزياء' },
        { id: 'sun_dhuhr', title: 'صلاة الظهر' },
        { id: 'sun_exercise', title: 'تمارين رياضية' },
        { id: 'sun_maghrib', title: 'صلاة المغرب' },
        { id: 'sun_study3', title: 'مذاكرة مسائية • أحياء' }
    ],
    2: [
        { id: 'mon_fajr', title: 'صلاة الفجر + أذكار' },
        { id: 'mon_morning', title: 'روتين الصباح' },
        { id: 'mon_study1', title: 'جلسة مذاكرة ١ • عربي' },
        { id: 'mon_break1', title: 'استراحة ١٥ دقيقة' },
        { id: 'mon_study2', title: 'جلسة مذاكرة ٢ • إنجليزي' },
        { id: 'mon_dhuhr', title: 'صلاة الظهر' },
        { id: 'mon_exercise', title: 'تمارين رياضية' },
        { id: 'mon_maghrib', title: 'صلاة المغرب' },
        { id: 'mon_study3', title: 'مذاكرة مسائية • تاريخ' }
    ],
    3: [
        { id: 'tue_fajr', title: 'صلاة الفجر + أذكار' },
        { id: 'tue_morning', title: 'روتين الصباح' },
        { id: 'tue_study1', title: 'جلسة مذاكرة ١ • أحياء' },
        { id: 'tue_break1', title: 'استراحة ١٥ دقيقة' },
        { id: 'tue_study2', title: 'جلسة مذاكرة ٢ • تاريخ' },
        { id: 'tue_dhuhr', title: 'صلاة الظهر' },
        { id: 'tue_exercise', title: 'تمارين رياضية' },
        { id: 'tue_maghrib', title: 'صلاة المغرب' },
        { id: 'tue_study3', title: 'مذاكرة مسائية • كيمياء' }
    ],
    4: [
        { id: 'wed_fajr', title: 'صلاة الفجر + أذكار' },
        { id: 'wed_morning', title: 'روتين الصباح' },
        { id: 'wed_study1', title: 'جلسة مذاكرة ١ • كيمياء' },
        { id: 'wed_break1', title: 'استراحة ١٥ دقيقة' },
        { id: 'wed_study2', title: 'جلسة مذاكرة ٢ • رياضيات' },
        { id: 'wed_dhuhr', title: 'صلاة الظهر' },
        { id: 'wed_exercise', title: 'تمارين رياضية' },
        { id: 'wed_maghrib', title: 'صلاة المغرب' },
        { id: 'wed_study3', title: 'مذاكرة مسائية • فيزياء' }
    ],
    5: [
        { id: 'thu_fajr', title: 'صلاة الفجر + أذكار' },
        { id: 'thu_morning', title: 'روتين الصباح' },
        { id: 'thu_study1', title: 'مراجعة شاملة' },
        { id: 'thu_break1', title: 'استراحة ١٥ دقيقة' },
        { id: 'thu_study2', title: 'اختبار تجريبي' },
        { id: 'thu_dhuhr', title: 'صلاة الظهر' },
        { id: 'thu_exercise', title: 'تمارين رياضية' },
        { id: 'thu_maghrib', title: 'صلاة المغرب' },
        { id: 'thu_study3', title: 'راحة' }
    ],
    6: [
        { id: 'fri_fajr', title: 'صلاة الفجر + أذكار' },
        { id: 'fri_morning', title: 'روتين الصباح' },
        { id: 'fri_rest', title: 'راحة / هوايات' },
        { id: 'fri_dhuhr', title: 'صلاة الظهر' },
        { id: 'fri_maghrib', title: 'صلاة المغرب' },
        { id: 'fri_isha', title: 'عشاء + أذكار' }
    ]
};

const weekDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

// ========== حساب النقاط ==========
function calculatePoints(completedTasks) {
    if (!completedTasks) return 0;
    let completed = 0;
    for (let i = 0; i < 7; i++) {
        const tasks = dayTasks[i] || [];
        tasks.forEach(task => {
            if (completedTasks[task.id]) completed++;
        });
    }
    return completed * 10;
}

// ========== دوال Dashboard ==========
async function loadDashboard() {
    try {
        const user = await getUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('userName').textContent = user.name.split(' ')[0] || 'أحمد';

        // حساب النقاط
        const points = calculatePoints(user.completedTasks || {});
        document.getElementById('scoreValue').textContent = points;

        // تحديث باقي الإحصائيات (مؤقت)
        document.getElementById('progressValue').textContent = '0%';
        document.getElementById('streakValue').textContent = '0';
        document.getElementById('streakText').textContent = '0';
        document.getElementById('tasksValue').textContent = '0';

        // تحديث الـ Sidebar
        const avatar = document.querySelector('.user-avatar');
        const nameEl = document.querySelector('.user-info h4');
        const pathEl = document.querySelector('.user-info span');
        if (avatar) avatar.textContent = user.name.charAt(0) || 'أ';
        if (nameEl) nameEl.textContent = user.name || 'أحمد نادي';
        if (pathEl) {
            const pathNames = {
                'medicine': 'طب وعلوم حياة',
                'engineering': 'هندسة وعلوم حاسب',
                'arts': 'آداب وفنون',
                'business': 'إدارة أعمال'
            };
            const yearText = user.year === '2' ? 'السنة التانية' : 'السنة التالتة';
            pathEl.textContent = `${pathNames[user.path] || 'مسار'} • ${yearText}`;
        }

        // تحديث كل 10 ثواني
        setInterval(async () => {
            const freshUser = await getUser();
            if (freshUser) {
                const newPoints = calculatePoints(freshUser.completedTasks || {});
                document.getElementById('scoreValue').textContent = newPoints;
            }
        }, 10000);

    } catch (error) {
        console.error('❌ خطأ في تحميل Dashboard:', error);
    }
}

// ========== الأوائل ==========
async function loadLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;
    container.innerHTML = '<div class="loading">⏳ جاري التحميل...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/users`);
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
            const points = calculatePoints(user.completedTasks || {});
            user._points = points;
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
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        container.innerHTML = '<div class="loading">❌ السيرفر مش شغال</div>';
    }
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
            } catch (e) {
                console.warn('⚠️ فشل حفظ على السيرفر');
            }
        }

        window.location.href = 'dashboard.html';
    } catch (error) {
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
        throw error;
    }
};

// ========== دوال التسجيل ==========
window.registerUser = async function(name, email, password, path = 'medicine', year = '2') {
    try {
        const result = await apiRequest('/users/register', 'POST', { name, email, password, path, year });
        if (result && result.id) {
            const userData = {
                id: result.id,
                name: name,
                email: email,
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
            return { user: userData };
        }
        throw new Error('فشل التسجيل');
    } catch (error) {
        throw error;
    }
};

// ========== دوال التصدير ==========
window.saveOnboardingData = saveOnboardingData;
window.getSpecializationOptions = function(path) {
    const map = {
        medicine: ['رياضيات', 'فيزياء'],
        engineering: ['برمجة', 'كيمياء'],
        arts: ['علم النفس', 'اللغة الأجنبية الثانية'],
        business: ['محاسبة', 'إدارة أعمال']
    };
    return map[path] || [];
};
window.loadLeaderboard = loadLeaderboard;
window.getUser = getUser;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.loadDashboard = loadDashboard;
window.calculatePoints = calculatePoints;
window.dayTasks = dayTasks;
window.weekDays = weekDays;

// ==========================================
// ========== Dark Mode ==========
// ==========================================
function applyDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDark);
    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) toggleBtn.textContent = isDark ? '☀️' : '🌙';
}

function toggleDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    localStorage.setItem('darkMode', isDark ? 'false' : 'true');
    applyDarkMode();
}

document.addEventListener('DOMContentLoaded', function() {
    applyDarkMode();
    const path = window.location.pathname.split('/').pop();
    if (path === 'dashboard.html' || path === '') loadDashboard();
    else if (path === 'leaderboard.html') loadLeaderboard();
});

window.toggleDarkMode = toggleDarkMode;
window.applyDarkMode = applyDarkMode;

console.log('🚀 رؤية شغالة (نسخة مبسطة)');
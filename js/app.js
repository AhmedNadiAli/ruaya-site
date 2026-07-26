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

// ========== دوال Onboarding (مبسطة - من غير سيرفر) ==========
async function saveOnboardingData(formData) {
    try {
        // جلب المستخدم من localStorage
        let user = getLocalUser();
        if (!user) {
            alert('يرجى تسجيل الدخول أولاً');
            window.location.href = 'login.html';
            return;
        }

        // تحديث بيانات المستخدم محلياً
        user.name = formData.name || user.name || 'أحمد نادي';
        user.path = formData.path;
        user.year = formData.year;
        user.specialization = formData.specialization;
        user.weakSubjects = formData.weakSubjects || [];
        user.preferredTime = formData.preferredTime;
        user.goalScore = formData.goalScore || 500;
        user.onboardingDone = true;
        
        // حفظ في localStorage
        saveLocalUser(user);

        // محاولة تحديث السيرفر (لو فيه id)
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

        // التحويل للـ Dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('❌ خطأ في حفظ التهيئة:', error);
        alert('حدث خطأ، حاول مرة أخرى');
    }
}

// ========== مهام كل يوم ==========
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
        { id: 'sat_fajr' }, { id: 'sat_morning' }, { id: 'sat_study1' },
        { id: 'sat_break1' }, { id: 'sat_study2' }, { id: 'sat_dhuhr' },
        { id: 'sat_exercise' }, { id: 'sat_maghrib' }, { id: 'sat_study3' }
    ],
    1: [
        { id: 'sun_fajr' }, { id: 'sun_morning' }, { id: 'sun_study1' },
        { id: 'sun_break1' }, { id: 'sun_study2' }, { id: 'sun_dhuhr' },
        { id: 'sun_exercise' }, { id: 'sun_maghrib' }, { id: 'sun_study3' }
    ],
    2: [
        { id: 'mon_fajr' }, { id: 'mon_morning' }, { id: 'mon_study1' },
        { id: 'mon_break1' }, { id: 'mon_study2' }, { id: 'mon_dhuhr' },
        { id: 'mon_exercise' }, { id: 'mon_maghrib' }, { id: 'mon_study3' }
    ],
    3: [
        { id: 'tue_fajr' }, { id: 'tue_morning' }, { id: 'tue_study1' },
        { id: 'tue_break1' }, { id: 'tue_study2' }, { id: 'tue_dhuhr' },
        { id: 'tue_exercise' }, { id: 'tue_maghrib' }, { id: 'tue_study3' }
    ],
    4: [
        { id: 'wed_fajr' }, { id: 'wed_morning' }, { id: 'wed_study1' },
        { id: 'wed_break1' }, { id: 'wed_study2' }, { id: 'wed_dhuhr' },
        { id: 'wed_exercise' }, { id: 'wed_maghrib' }, { id: 'wed_study3' }
    ],
    5: [
        { id: 'thu_fajr' }, { id: 'thu_morning' }, { id: 'thu_study1' },
        { id: 'thu_break1' }, { id: 'thu_study2' }, { id: 'thu_dhuhr' },
        { id: 'thu_exercise' }, { id: 'thu_maghrib' }, { id: 'thu_study3' }
    ],
    6: [
        { id: 'fri_fajr' }, { id: 'fri_morning' }, { id: 'fri_rest' },
        { id: 'fri_dhuhr' }, { id: 'fri_maghrib' }, { id: 'fri_isha' }
    ]
};

// ========== حساب اليوم الحالي ==========
function getCurrentDayIndex() {
    const user = getLocalUser();
    if (!user) return 0;
    const weekStart = user.weekStartDate ? new Date(user.weekStartDate) : new Date();
    const now = new Date();
    const diffDays = Math.floor((now - weekStart) / (24 * 60 * 60 * 1000));
    return Math.min(Math.max(diffDays, 0), 6);
}

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

        document.getElementById('userName').textContent = user.name.split(' ')[0];
        updateStatsInUI(user);

        document.querySelector('.user-avatar').textContent = user.name.charAt(0);
        document.querySelector('.user-info h4').textContent = user.name;
        const pathNames = {
            'medicine': 'طب وعلوم حياة',
            'engineering': 'هندسة وعلوم حاسب',
            'arts': 'آداب وفنون',
            'business': 'إدارة أعمال'
        };
        const yearText = user.year === '2' ? 'السنة التانية' : 'السنة التالتة';
        document.querySelector('.user-info span').textContent = `${pathNames[user.path] || 'مسار'} • ${yearText}`;

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

// ========== تحديث رحلة الشهر ==========
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
        if (!user) return;

        document.getElementById('profileName').textContent = user.name;
        const pathNames = {
            'medicine': 'طب وعلوم حياة',
            'engineering': 'هندسة وعلوم حاسب',
            'arts': 'آداب وفنون',
            'business': 'إدارة أعمال'
        };
        const yearText = user.year === '2' ? 'السنة التانية' : 'السنة التالتة';
        document.getElementById('profilePathYear').textContent = `${pathNames[user.path]} • ${yearText}`;
        
        const stats = calculateStats(user.completedTasks || {});
        document.getElementById('profilePoints').textContent = stats.points;
        document.getElementById('profileStreak').textContent = stats.streak;
        document.getElementById('profileProgress').textContent = stats.progress + '%';

        document.getElementById('editName').value = user.name;
        document.getElementById('editPath').value = user.path;
        document.getElementById('editYear').value = user.year;

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

// ========== الأوائل (Leaderboard) ==========
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
                container.innerHTML = '<div class="loading">📭 لا يوجد مستخدمين حتى الآن</div>';
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
        container.innerHTML = `
            <div class="loading">
                ❌ السيرفر مش شغال<br>
                <span style="font-size:0.8rem;color:var(--text-muted);">
                    تأكد من تشغيل السيرفر (npx nodemon server.js)
                </span>
            </div>
        `;
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

// ========== دوال Onboarding UI ==========
function getSpecializationOptions(path) {
    const map = {
        medicine: ['رياضيات', 'فيزياء'],
        engineering: ['برمجة', 'كيمياء'],
        arts: ['علم النفس', 'اللغة الأجنبية الثانية'],
        business: ['محاسبة', 'إدارة أعمال']
    };
    return map[path] || [];
}

// ========== دوال تسجيل الدخول والتسجيل ==========
window.registerUser = async function(name, email, password, path = 'medicine', year = '2') {
    try {
        const result = await apiRequest('/users/register', 'POST', { name, email, password, path, year });
        if (result.user) {
            saveLocalUser(result.user);
        }
        return result;
    } catch (error) {
        console.error('❌ خطأ في التسجيل:', error);
        throw error;
    }
};

window.loginUser = async function(email, password) {
    try {
        const result = await apiRequest('/users/login', 'POST', { email, password });
        if (result.user) {
            saveLocalUser(result.user);
        }
        return result;
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        throw error;
    }
};

// ========== تشغيل الصفحات ==========
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname.split('/').pop();
    if (path === 'dashboard.html' || path === '') loadDashboard();
    else if (path === 'profile.html') loadProfile();
    else if (path === 'leaderboard.html') loadLeaderboard();
    else if (path === 'subjects.html') loadSubjects();
});

// ========== تصدير الدوال ==========
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

// ==========================================
// ========== Dark Mode ==========
// ==========================================

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

// ==========================================
// دوال المواد حسب المسار والسنة
// ==========================================
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

console.log('🚀 رؤية شغالة (السيرفر هو الأساسي، localStorage احتياطي)');
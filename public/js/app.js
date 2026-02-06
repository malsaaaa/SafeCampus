// Initialize Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyAEWef4jRSIJuLmnwQ_ajov_g9ykwRm22E",
    authDomain: "safecampus-f4fb8.firebaseapp.com",
    projectId: "safecampus-f4fb8",
    storageBucket: "safecampus-f4fb8.firebasestorage.app",
    messagingSenderId: "782157326369",
    appId: "1:782157326369:web:bf3ff2fda3494489d59b60",
    measurementId: "G-CWN5EXW3ZR"
};

let authInitialized = false;  // Flag to track if auth check is complete

// Initialize Firebase (wait for DOM to be ready)
document.addEventListener('DOMContentLoaded', function() {
    const app = document.getElementById('app');
    
    console.log('DOMContentLoaded - Starting Firebase init');
    
    if (typeof firebase !== 'undefined') {
        console.log('Firebase compat SDK available');
        
        firebase.initializeApp(firebaseConfig);
        window.auth = firebase.auth();
        window.db = firebase.database();
        
        console.log('Firebase initialized successfully');
        
        // Set up auth state listener
        let firstCheck = true;
        const unsubscribe = window.auth.onAuthStateChanged(async (user) => {
            console.log('onAuthStateChanged fired, user:', user ? user.email : 'null');
            
            if (firstCheck) {
                firstCheck = false;
                authInitialized = true;
                // Mark app as ready to show
                if (app) {
                    app.classList.add('auth-ready');
                    console.log('Auth ready - app will now show');
                }
            }
            
            if (user) {
                console.log('User logged in:', user.email);
                currentUser = user;
                // Auto-create user profile if it doesn't exist
                ensureUserExists(user);
                // Enforce role-based access control
                await enforceRBAC(user);
                // Log login activity
                logActivity('login', window.currentUserRole || 'user', { email: user.email });
                showLoginSection(false);
                loadDashboard();
            } else {
                console.log('User logged out or no session');
                currentUser = null;
                showLoginSection(true);
            }
        });
        
        // User Menu Dropdown Toggle
        const userMenuTrigger = document.getElementById('user-menu-trigger');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenuTrigger && userDropdown) {
            userMenuTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('active');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenuTrigger.contains(e.target)) {
                    userDropdown.classList.remove('active');
                }
            });
        }

        // Dropdown Logout
        const dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');
        if (dropdownLogoutBtn) {
            dropdownLogoutBtn.addEventListener('click', async () => {
                // Trigger the existing logout button click logic
                if (logoutBtn) logoutBtn.click();
            });
        }

        console.log('Auth state listener set up');
    } else {
        console.log('Firebase SDK not loaded');
        // Show app anyway
        if (app) {
            app.classList.add('auth-ready');
        }
        showLoginSection(true);
        authInitialized = true;
    }
});

// App State
let currentUser = null;
let allUsers = [];
let isExplicitLogout = false;  // Track if user manually logged out

// DOM Elements
const app = document.getElementById('app');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const sidebar = document.querySelector('.sidebar');
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const toast = document.getElementById('toast');

// ================================================================
// Authentication Functions
// ================================================================

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (typeof firebase === 'undefined' || !window.auth) {
        // Demo mode
        showToast('Demo Mode: Logging in...', 'success');
        currentUser = { email: email, getIdToken: () => Promise.resolve('demo-token') };
        showLoginSection(false);
        loadDashboard();
        return;
    }

    try {
        const result = await window.auth.signInWithEmailAndPassword(email, password);
        currentUser = result.user;
        showLoginSection(false);
        loadDashboard();
    } catch (error) {
        showToast('Login failed: ' + error.message, 'error');
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        console.log('Logout button clicked');
        
        // Log the logout action
        if (currentUser) {
            await logActivity('logout', window.currentUserRole || 'user', { email: currentUser.email });
        }
        
        if (typeof firebase !== 'undefined' && window.auth) {
            await window.auth.signOut();
            console.log('Firebase signOut successful');
        }
        currentUser = null;
        showLoginSection(true);
        // Clear form fields
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.log('Logout error:', error);
        showToast('Logout failed: ' + error.message, 'error');
    }
});

// ================================================================
// Navigation Functions
// ================================================================

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        
        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Show corresponding view
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(section + '-view').classList.add('active');
        
        // Update breadcrumb
        document.getElementById('breadcrumb-text').textContent = 
            section.charAt(0).toUpperCase() + section.slice(1);
        
        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            sidebar.classList.remove('active');
        }
        
        // Load section-specific data
        loadSectionData(section);
    });
});

toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !toggleSidebarBtn.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// ================================================================
// User Management
// ================================================================

async function ensureUserExists(firebaseUser) {
    try {
        if (!firebaseUser || !firebaseUser.email) {
            console.log('No user email available');
            return;
        }
        
        if (typeof firebase === 'undefined') {
            console.log('Firebase not available');
            return;
        }
        
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(firebaseUser.uid);
        
        // Check if user document exists
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            // Create new user profile
            console.log('Creating new user profile for:', firebaseUser.email);
            await userRef.set({
                email: firebaseUser.email,
                fullName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                role: 'user',  // Default role
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
                phone: '',
                avatar: firebaseUser.photoURL || ''
            });
            console.log('User profile created successfully');
        } else {
            console.log('User profile already exists');
        }
    } catch (error) {
        console.log('Error creating user profile:', error.message);
        // Don't block login even if profile creation fails
    }
}

// ================================================================
// Role-Based Access Control (RBAC)
// ================================================================

async function enforceRBAC(user) {
    try {
        if (typeof firebase === 'undefined') return;
        
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const userRole = userData.role || 'user';
            
            // Store role globally
            window.currentUserRole = userRole;
            
            // Show/hide admin-only menu items
            const adminOnlyItems = document.querySelectorAll('[data-admin-only="true"]');
            adminOnlyItems.forEach(item => {
                item.style.display = userRole === 'admin' ? 'flex' : 'none';
            });
            
            // Disable admin-only buttons for non-admins
            const addUserBtn = document.getElementById('add-user-btn');
            const notificationForm = document.getElementById('notification-form');
            
            if (addUserBtn) {
                addUserBtn.style.display = userRole === 'admin' ? 'block' : 'none';
            }
            if (notificationForm) {
                notificationForm.style.display = userRole === 'admin' ? 'block' : 'none';
            }
            
            // Update Dropdown Content
            const dropdownName = document.getElementById('dropdown-user-name');
            const dropdownRole = document.getElementById('dropdown-user-role');
            if (dropdownName) dropdownName.textContent = userData.fullName || user.email.split('@')[0];
            if (dropdownRole) {
                dropdownRole.textContent = userRole;
                dropdownRole.className = `badge badge-${userRole === 'admin' ? 'purple' : 'info'}`;
            }
            
            console.log('RBAC enforced for role:', userRole);
        }
    } catch (error) {
        console.log('Error enforcing RBAC:', error.message);
    }
}

// ================================================================
// Activity Logging
// ================================================================

async function logActivity(action, target, details = {}) {
    try {
        if (typeof firebase === 'undefined' || !currentUser) return;
        
        const db = firebase.firestore();
        
        await db.collection('activityLog').add({
            action: action,
            target: target,
            user: currentUser.email,
            userUid: currentUser.uid,
            details: details,
            timestamp: new Date(),
            status: 'success'
        });
        
        console.log('Activity logged:', action, target);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// ================================================================
// Dashboard Data Loading
// ================================================================

async function loadDashboard() {
    try {
        // Run all dashboard data loads in parallel for faster loading
        await Promise.all([
            loadUsers(),
            loadStatistics(),
            loadActivity(),
            loadNotifications(),
            loadLocations()
        ]);
        loadIncidents();  // Load incidents (non-blocking real-time listener)
    } catch (error) {
        showToast('Error loading dashboard: ' + error.message, 'error');
    }
}

async function loadUsers() {
    try {
        if (typeof firebase === 'undefined') {
            console.log('Firebase not available');
            allUsers = [];
            renderUsersTable([]);
            return;
        }
        
        const db = firebase.firestore();
        
        // Get all users from Firestore
        const snapshot = await db.collection('users').orderBy('email').get();
        
        allUsers = [];
        snapshot.forEach((doc) => {
            const user = doc.data();
            user.id = doc.id;
            allUsers.push(user);
        });
        
        console.log('Loaded ' + allUsers.length + ' users from Firestore');
        renderUsersTable(allUsers);
    } catch (error) {
        console.log('Error loading users from Firestore:', error.message);
        allUsers = [];
        renderUsersTable([]);
    }
}

async function loadStatistics() {
    try {
        if (typeof firebase === 'undefined') {
            console.log('Firebase not available');
            updateStatistics({ total_users: 0, active_users: 0, total_incidents: 0 });
            return;
        }
        
        const db = firebase.firestore();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Run all queries in parallel for faster loading
        const [usersSnapshot, locationsSnapshot, reportsSnapshot] = await Promise.all([
            db.collection('users').get(),
            db.collection('locations').get(),
            db.collection('reports').get()
        ]);
        
        const totalUsers = usersSnapshot.size;
        const totalLocations = locationsSnapshot.size;
        
        let reportsToday = 0;
        let unresolved = 0;
        
        reportsSnapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp ? new Date(data.timestamp.seconds * 1000) : null;
            
            if (timestamp && timestamp >= today) {
                reportsToday++;
            }
            
            if (data.status !== 'resolved') {
                unresolved++;
            }
        });
        
        console.log('Statistics loaded from Firestore');
        updateStatistics({
            total_users: totalUsers,
            total_locations: totalLocations,
            reports_today: reportsToday,
            unresolved_incidents: unresolved
        });
    } catch (error) {
        console.log('Error loading statistics from Firestore:', error.message);
        updateStatistics({ total_users: 0, active_users: 0, total_incidents: 0 });
    }
}

async function loadActivity() {
    try {
        if (typeof firebase === 'undefined') return;
        
        const db = firebase.firestore();
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Listen for activityLog and reports in parallel
        db.collection('activityLog')
            .where('timestamp', '>=', oneDayAgo)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .onSnapshot((activitySnapshot) => {
                db.collection('reports')
                    .where('timestamp', '>=', oneDayAgo)
                    .orderBy('timestamp', 'desc')
                    .limit(10)
                    .onSnapshot((reportsSnapshot) => {
                        const activities = [];
                        
                        // Process Activity Log entries
                        activitySnapshot.forEach(doc => {
                            const data = doc.data();
                            let actionText = '';
                            let icon = '';
                            
                            if (data.action === 'incident_status_updated') {
                                const type = data.details.incidentType || 'Incident';
                                const status = data.details.newStatus.charAt(0).toUpperCase() + data.details.newStatus.slice(1);
                                actionText = `${type} marked as ${status}`;
                                icon = '🔄';
                            } else if (data.action === 'news_published' && data.details.type === 'emergency') {
                                actionText = `🚨 Emergency Alert: '${data.target}' published by Admin`;
                                icon = '🚨';
                            }

                            if (actionText) {
                                activities.push({
                                    id: doc.id,
                                    type: 'log',
                                    action: actionText,
                                    icon: icon,
                                    time: formatTimeAgo(data.timestamp),
                                    timestamp: data.timestamp
                                });
                            }
                        });

                        // Process New Reports
                        reportsSnapshot.forEach(doc => {
                            const data = doc.data();
                            activities.push({
                                id: doc.id,
                                type: 'report',
                                action: `New ${data.type} reported at ${data.latitude ? 'Location' : 'Campus'}`,
                                icon: '🚨',
                                time: formatTimeAgo(data.timestamp),
                                timestamp: data.timestamp
                            });
                        });

                        // Sort and Display
                        activities.sort((a, b) => {
                            const tA = a.timestamp.toDate ? a.timestamp.toDate().getTime() : a.timestamp;
                            const tB = b.timestamp.toDate ? b.timestamp.toDate().getTime() : b.timestamp;
                            return tB - tA;
                        });

                        const topActivities = activities.slice(0, 15);
                        
                        activityList.innerHTML = topActivities.map(activity => `
                            <div class="activity-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #f3f4f6;">
                                <input type="checkbox" class="activity-checkbox" value="${activity.id}" data-type="${activity.type}" onchange="updateActivityDeleteButtonVisibility()">
                                <span style="font-size: 1.2rem;">${activity.icon}</span>
                                <div style="flex: 1;">
                                    <div style="font-weight: 500; font-size: 0.9rem;">${activity.action}</div>
                                    <div style="font-size: 0.75rem; color: #6b7280;">${activity.time}</div>
                                </div>
                            </div>
                        `).join('');

                        if (topActivities.length === 0) {
                            activityList.innerHTML = '<div style="padding: 20px; text-align: center; color: #9ca3af;">No recent activity</div>';
                        }
                    });
            });
    } catch (error) {
        console.error('Activity load error:', error);
    }
}

function toggleAllActivities(source) {
    const checkboxes = document.querySelectorAll('.activity-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateActivityDeleteButtonVisibility();
}

function updateActivityDeleteButtonVisibility() {
    const btnContainer = document.getElementById('activity-bulk-actions');
    const selectedCount = document.querySelectorAll('.activity-checkbox:checked').length;
    if (btnContainer) {
        btnContainer.style.display = selectedCount > 0 ? 'block' : 'none';
    }
}

async function deleteSelectedActivities() {
    const selected = document.querySelectorAll('.activity-checkbox:checked');
    if (!confirm(`Are you sure you want to delete ${selected.length} activity logs?`)) return;

    try {
        const db = firebase.firestore();
        const batch = db.batch();
        
        selected.forEach(cb => {
            const id = cb.value;
            const type = cb.dataset.type;
            // Only delete if it's a log entry, we don't want to accidentally delete actual reports from activity list
            if (type === 'log') {
                batch.delete(db.collection('activityLog').doc(id));
            }
        });

        await batch.commit();
        showToast('Activity logs deleted', 'success');
        document.getElementById('select-all-activities').checked = false;
        loadActivity();
    } catch (error) {
        showToast('Delete failed: ' + error.message, 'error');
    }
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'unknown';
    
    let date = timestamp;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (typeof timestamp === 'number') {
        date = new Date(timestamp * 1000);
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

function updateStatistics(stats) {
    if (document.getElementById('stat-users')) document.getElementById('stat-users').textContent = stats.total_users || 0;
    if (document.getElementById('stat-locations')) document.getElementById('stat-locations').textContent = stats.total_locations || 0;
    if (document.getElementById('stat-reports-today')) document.getElementById('stat-reports-today').textContent = stats.reports_today || 0;
    if (document.getElementById('stat-unresolved')) document.getElementById('stat-unresolved').textContent = stats.unresolved_incidents || 0;
}

// ================================================================
// News/Notifications Management
// ================================================================

async function sendNotification(event) {
    event.preventDefault();
    
    if (typeof firebase === 'undefined') {
        showToast('Firebase not available', 'error');
        return;
    }
    
    const title = document.getElementById('notification-title').value;
    const message = document.getElementById('notification-message').value;
    const type = document.getElementById('notification-type').value;
    
    try {
        const db = firebase.firestore();
        
        await db.collection('notifications').add({
            title: title,
            message: message,
            type: type,
            createdAt: new Date(),
            createdBy: currentUser.email,
            status: 'published'
        });
        
        await logActivity('news_published', title, { type, messageLength: message.length });
        
        showToast('News published successfully!', 'success');
        document.getElementById('notification-form').reset();
        loadNotifications();
        
    } catch (error) {
        console.error('Error publishing news:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

async function loadNotifications() {
    try {
        if (typeof firebase === 'undefined') {
            console.log('Firebase not available');
            return;
        }
        
        const db = firebase.firestore();
        const notificationsList = document.getElementById('notifications-list');
        
        if (!notificationsList) return;
        
        const snapshot = await db.collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        const notifications = [];
        snapshot.forEach((doc) => {
            const notif = doc.data();
            notif.id = doc.id;
            notifications.push(notif);
        });
        
        if (notifications.length === 0) {
            notificationsList.innerHTML = '<p style="text-align: center; color: #999;">No news published yet</p>';
            return;
        }
        
        notificationsList.innerHTML = notifications.map(notif => `
            <div class="notification-item notification-${notif.type}">
                <div class="notification-header">
                    <div>
                        <h3>${notif.title}</h3>
                    </div>
                    <span class="notification-badge">${notif.type}</span>
                </div>
                <div class="notification-content">
                    <p>${notif.message}</p>
                </div>
                <div class="notification-footer">
                    <button class="btn btn-sm btn-danger" onclick="deleteNotification('${notif.id}')">Delete</button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.log('Error loading notifications:', error.message);
    }
}

async function deleteNotification(notificationId) {
    if (!confirm('Are you sure you want to delete this news?')) return;
    
    try {
        if (typeof firebase === 'undefined') {
            showToast('Firebase not available', 'error');
            return;
        }
        
        const db = firebase.firestore();
        await db.collection('notifications').doc(notificationId).delete();
        
        showToast('News deleted successfully!', 'success');
        loadNotifications();
        
    } catch (error) {
        console.error('Error deleting notification:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

// ================================================================
// Users Management
// ================================================================

const usersTableBody = document.getElementById('users-table-body');
const searchUsersInput = document.getElementById('search-users');
const filterRoleSelect = document.getElementById('filter-role');
const addUserBtn = document.getElementById('add-user-btn');
const userModal = document.getElementById('user-modal');
const userForm = document.getElementById('user-form');

if (addUserBtn) {
    console.log('Setting up Add User button listener');
    addUserBtn.addEventListener('click', () => {
        console.log('Add User button clicked');
        document.getElementById('modal-title').textContent = 'Add User';
        userForm.reset();
        userForm.dataset.mode = 'create';
        delete userForm.dataset.userId;
        openModal('user-modal');
    });
} else {
    console.warn('Add User button not found');
}

if (userForm) {
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mode = userForm.dataset.mode;
        const userId = userForm.dataset.userId;
        
        const fullName = document.getElementById('modal-name').value;
        const email = document.getElementById('modal-email').value;
        const role = document.getElementById('modal-role').value;
        
        if (!fullName || !email || !role) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        try {
            if (typeof firebase === 'undefined') {
                showToast('Firebase not available', 'error');
                return;
            }
            
            const db = firebase.firestore();
            
            if (mode === 'edit' && userId) {
                // Update existing user
                await db.collection('users').doc(userId).update({
                    fullName: fullName,
                    email: email,
                    role: role,
                    updatedAt: new Date()
                });
                await logActivity('user_updated', userId, { fullName, email, role });
                showToast('User updated successfully', 'success');
            } else {
                // Create new user
                await db.collection('users').add({
                    fullName: fullName,
                    email: email,
                    role: role,
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    phone: '',
                    avatar: ''
                });
                await logActivity('user_created', email, { fullName, role });
                showToast('User created successfully', 'success');
            }
            
            closeModal('user-modal');
            await loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            showToast('Error: ' + error.message, 'error');
        }
    });
}

if (searchUsersInput) {
    searchUsersInput.addEventListener('input', filterUsers);
}
if (filterRoleSelect) {
    filterRoleSelect.addEventListener('change', filterUsers);
}

function renderUsersTable(users) {
    if (users.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">No users found</td>
            </tr>
        `;
        return;
    }
    
    usersTableBody.innerHTML = users.map(user => {
        const role = user.role || 'user';
        const roleBadgeClass = role === 'admin' ? 'badge-purple' : 'badge-info';
        
        return `
            <tr>
                <td>${user.fullName || 'N/A'}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${roleBadgeClass}">${role}</span>
                </td>
                <td>
                    <button onclick="editUser('${user.id}', ${JSON.stringify(user).replace(/"/g, '&quot;')})" 
                        class="btn" style="padding: 0.5rem; font-size: 0.85rem; background-color: #fef08a; color: #854d0e; border: none;">Edit</button>
                    <button onclick="deleteUser('${user.id}')" 
                        class="btn" style="padding: 0.5rem; font-size: 0.85rem; background-color: #ef4444; color: white;">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterUsers() {
    const searchQuery = searchUsersInput.value.toLowerCase();
    const roleFilter = filterRoleSelect.value;
    
    const filtered = allUsers.filter(user => {
        const matchSearch = !searchQuery || 
            (user.fullName && user.fullName.toLowerCase().includes(searchQuery)) ||
            (user.email && user.email.toLowerCase().includes(searchQuery));
        const matchRole = !roleFilter || user.role === roleFilter;
        
        return matchSearch && matchRole;
    });
    
    renderUsersTable(filtered);
}

function editUser(userId, user) {
    console.log('Edit User clicked:', userId, user);
    document.getElementById('modal-title').textContent = 'Edit User';
    document.getElementById('modal-name').value = user.fullName;
    document.getElementById('modal-email').value = user.email;
    document.getElementById('modal-role').value = user.role;
    userForm.dataset.mode = 'edit';
    userForm.dataset.userId = userId;
    console.log('Opening edit modal with userId:', userId);
    openModal('user-modal');
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        if (typeof firebase === 'undefined') {
            showToast('Firebase not available', 'error');
            return;
        }
        
        const db = firebase.firestore();
        
        // Get user email before deletion for logging
        const userDoc = await db.collection('users').doc(userId).get();
        const userEmail = userDoc.data().email;
        
        await db.collection('users').doc(userId).delete();
        await logActivity('user_deleted', userEmail, { userId });
        
        showToast('User deleted successfully', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error deleting user: ' + error.message, 'error');
    }
}

// ================================================================
// Section Data Loading
// ================================================================

function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'reports':
            loadReports();
            break;
        case 'audit':
            loadAuditLog();
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

async function loadReports() {
    const userStats = document.getElementById('user-stats');
    userStats.innerHTML = `
        <p>Total Users: ${allUsers.length}</p>
        <p>Active Users: ${Math.floor(allUsers.length * 0.8)}</p>
        <p>New Users This Month: ${Math.floor(allUsers.length * 0.15)}</p>
    `;
}



// ================================================================
// Audit Log
// ================================================================

// ================================================================
// Audit Log
// ================================================================

async function loadAuditLog() {
    try {
        if (typeof firebase === 'undefined') return;
        
        const db = firebase.firestore();
        const auditBody = document.getElementById('audit-log-body');
        
        if (!auditBody) return;
        
        // Reset select all checkbox
        const selectAllOpt = document.getElementById('select-all-logs');
        if (selectAllOpt) selectAllOpt.checked = false;
        
        const snapshot = await db.collection('activityLog')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        const logs = [];
        snapshot.forEach(doc => {
            logs.push({ ...doc.data(), id: doc.id });
        });
        
        if (logs.length === 0) {
            auditBody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #999;">No activity logged yet</td></tr>';
            return;
        }
        
        auditBody.innerHTML = logs.map(log => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px; text-align: center;"><input type="checkbox" class="log-checkbox" value="${log.id}" onchange="updateDeleteButtonVisibility()"></td>
                <td style="padding: 12px;"><strong>${log.action}</strong></td>
                <td style="padding: 12px;">${log.user}</td>
                <td style="padding: 12px;">${formatTimeAgo(log.timestamp)}</td>
            </tr>
        `).join('');
        
        updateDeleteButtonVisibility();
        console.log('Audit log loaded');
    } catch (error) {
        console.error('Error loading audit log:', error);
    }
}

function updateDeleteButtonVisibility() {
    const btn = document.getElementById('btn-delete-logs');
    if (!btn) return;
    const selectedCount = document.querySelectorAll('.log-checkbox:checked').length;
    btn.style.display = selectedCount > 0 ? 'inline-flex' : 'none';
}

function toggleAllLogs(source) {
    const checkboxes = document.querySelectorAll('.log-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateDeleteButtonVisibility();
}

async function deleteSelectedLogs() {
    const selected = Array.from(document.querySelectorAll('.log-checkbox:checked')).map(cb => cb.value);
    
    if (selected.length === 0) {
        showToast('Please select logs to delete', 'warning');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selected.length} selected logs?`)) return;
    
    try {
        const db = firebase.firestore();
        const batch = db.batch();
        
        selected.forEach(id => {
            const ref = db.collection('activityLog').doc(id);
            batch.delete(ref);
        });
        
        await batch.commit();
        showToast(`${selected.length} logs deleted successfully`, 'success');
        loadAuditLog();
    } catch (error) {
        console.error('Error deleting logs:', error);
        showToast('Error deleting logs: ' + error.message, 'error');
    }
}

async function exportAuditLogToCSV() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('activityLog').orderBy('timestamp', 'desc').get();
        
        if (snapshot.empty) {
            showToast('No logs to export', 'warning');
            return;
        }
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Action,Action By,Timestamp\n";
        
        snapshot.forEach(doc => {
            const log = doc.data();
            const timestamp = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A';
            const row = [
                `"${log.action || ''}"`,
                `"${log.user || ''}"`,
                `"${timestamp}"`
            ].join(",");
            csvContent += row + "\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `SafeCampus_AuditLog_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('CSV Exported Successfully', 'success');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showToast('Export failed: ' + error.message, 'error');
    }
}

// ================================================================
// UI Utilities
// ================================================================

function showLoginSection(show) {
    loginSection.style.display = show ? 'flex' : 'none';
    dashboardSection.style.display = show ? 'none' : 'flex';
}

function openModal(modalId) {
    console.log('Opening modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        console.log('Modal opened successfully');
    } else {
        console.warn('Modal not found:', modalId);
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast active ' + type;
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function formatDate(date) {
    if (!date) return 'N/A';
    
    // Handle Firestore Timestamp objects
    if (date.toDate && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
    }
    
    if (typeof date === 'string') {
        return new Date(date).toLocaleDateString();
    }
    
    return date.toLocaleDateString ? date.toLocaleDateString() : 'N/A';
}

// ================================================================
// Incidents Functions
// ================================================================

let allIncidents = [];

function loadIncidents() {
    try {
        const container = document.getElementById('incidents-table-body');
        if (!container) {
            console.log('Incidents table body not found');
            return;
        }

        console.log('Loading incidents from Firestore...');
        
        // Try to load from Firebase Firestore (where mobile app writes)
        if (typeof firebase !== 'undefined') {
            try {
                // Get Firestore instance
                const db = firebase.firestore();
                
                // Query the reports collection, ordered by timestamp descending
                db.collection('reports')
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .onSnapshot((snapshot) => {
                        if (snapshot.docs && snapshot.docs.length > 0) {
                            const incidents = [];
                            snapshot.forEach((doc) => {
                                const incident = doc.data();
                                incident.id = doc.id;
                                // Convert Firestore Timestamp to Unix timestamp if needed
                                if (incident.timestamp && incident.timestamp.toDate) {
                                    incident.timestamp = Math.floor(incident.timestamp.toDate().getTime() / 1000);
                                }
                                incidents.push(incident);
                            });
                            allIncidents = incidents;
                            renderIncidents(allIncidents);
                            console.log('Loaded ' + incidents.length + ' incidents from Firestore');
                        } else {
                            console.log('No incidents in Firestore');
                            allIncidents = [];
                            renderIncidents([]);
                        }
                    }, (error) => {
                        console.log('Firestore error:', error.message);
                        allIncidents = [];
                        renderIncidents([]);
                    });
            } catch (error) {
                console.log('Firebase initialization error:', error.message);
                allIncidents = [];
                renderIncidents([]);
            }
        } else {
            console.log('Firebase not available');
            allIncidents = [];
            renderIncidents([]);
        }
    } catch (error) {
        console.log('Error in loadIncidents:', error);
        allIncidents = [];
        renderIncidents([]);
    }
}

function renderIncidents(incidents) {
    const tableBody = document.getElementById('incidents-table-body');
    if (!tableBody) return;
    
    if (!incidents || incidents.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No incidents found</td></tr>';
        return;
    }

    const getBadgeClass = (type) => {
        if (!type) return 'badge-secondary';
        const t = type.toLowerCase();
        if (t.includes('accident')) return 'badge-danger';
        if (t.includes('crime')) return 'badge-dark';
        if (t.includes('facility')) return 'badge-warning';
        if (t.includes('suspicious')) return 'badge-info';
        if (t.includes('fire')) return 'badge-warning';
        return 'badge-secondary';
    };

    tableBody.innerHTML = incidents.map(incident => {
        const timestamp = incident.timestamp 
            ? (typeof incident.timestamp === 'number' 
                ? new Date(incident.timestamp * 1000).toLocaleString() 
                : (incident.timestamp.seconds 
                    ? new Date(incident.timestamp.seconds * 1000).toLocaleString() 
                    : new Date(incident.timestamp).toLocaleString()))
            : 'Just now';
        
        const status = (incident.status || 'pending').toLowerCase();
        let statusDisplay = '📝 Pending';
        if (status === 'resolved') statusDisplay = '✅ Resolved';
        if (status === 'ongoing') statusDisplay = '🔴 Ongoing';
        
        const isAdmin = window.currentUserRole === 'admin';
        const type = incident.type || 'Others';
        
        return `
            <tr>
                <td>${incident.reporter_email || 'Anonymous'}</td>
                <td>${timestamp}</td>
                <td><span class="badge ${getBadgeClass(type)}">${type}</span></td>
                <td><div style="min-width: 200px; white-space: normal; word-break: break-word;">${incident.description || 'No description'}</div></td>
                <td>${incident.latitude && incident.longitude ? `${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}` : 'N/A'}</td>
                <td>
                    ${incident.latitude && incident.longitude 
                        ? `<a href="https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}" target="_blank" class="btn btn-sm" style="background-color: #4285F4; color: white; text-decoration: none;">📍 View Map</a>` 
                        : 'N/A'}
                </td>
                <td>
                    <button class="btn btn-sm" 
                        style="opacity: ${isAdmin ? '1' : '0.7'}"
                        ${isAdmin ? `onclick="openIncidentStatusModal('${incident.id}')"` : 'disabled'}>
                        ${statusDisplay}
                    </button>
                </td>
                <td>
                    <button onclick='viewReportDetails(${JSON.stringify(incident)})' class="btn btn-sm">View</button>
                    ${isAdmin ? `<button onclick="deleteIncident('${incident.id}')" class="btn btn-sm btn-danger">Delete</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteIncident(incidentId) {
    if (!confirm('Are you sure you want to delete this incident report?')) return;
    
    try {
        if (typeof firebase === 'undefined') {
            showToast('Firebase not available', 'error');
            return;
        }
        
        const db = firebase.firestore();
        
        // Get incident details for logging before deletion
        const incidentDoc = await db.collection('reports').doc(incidentId).get();
        if (!incidentDoc.exists) {
            showToast('Incident not found', 'error');
            return;
        }
        const incidentData = incidentDoc.data();
        
        await db.collection('reports').doc(incidentId).delete();
        
        await logActivity('incident_deleted', incidentId, {
            type: incidentData.type,
            reporter: incidentData.reporter_email
        });
        
        showToast('Incident deleted successfully', 'success');
        // The real-time listener will update the list
    } catch (error) {
        console.error('Error deleting incident:', error);
        showToast('Error: ' + error.message, 'error');
    }
}

function viewReportDetails(incident) {
    const content = document.getElementById('report-detail-content');
    if (!content) return;
    
    const timestamp = incident.timestamp 
        ? (typeof incident.timestamp === 'number' 
            ? new Date(incident.timestamp * 1000).toLocaleString() 
            : (incident.timestamp.seconds 
                ? new Date(incident.timestamp.seconds * 1000).toLocaleString() 
                : new Date(incident.timestamp).toLocaleString()))
        : 'N/A';
        
    content.innerHTML = `
        <div class="detail-group" style="margin-bottom: 15px;">
            <p><strong>Reporter:</strong> ${incident.reporter_email || 'Anonymous'}</p>
            <p><strong>Date/Time:</strong> ${timestamp}</p>
            <p><strong>Type:</strong> ${incident.type || 'Other'}</p>
            <p><strong>Status:</strong> ${incident.status || 'ongoing'}</p>
        </div>
        <div class="detail-group" style="margin-bottom: 15px; background: #f9fafb; padding: 10px; border-radius: 4px;">
            <p><strong>Full Description:</strong></p>
            <p style="white-space: pre-wrap;">${incident.description || 'No description provided'}</p>
        </div>
        <div class="detail-group" style="margin-bottom: 15px;">
            <p><strong>Location:</strong> ${incident.latitude ? `${incident.latitude}, ${incident.longitude}` : 'N/A'}</p>
        </div>
    `;
    
    openModal('report-detail-modal');
}

// Global variable to track current incident being edited
let currentIncidentId = null;

function openIncidentStatusModal(incidentId) {
    currentIncidentId = incidentId;
    const incident = allIncidents.find(i => i.id === incidentId);
    if (incident) {
        const statusSelect = document.getElementById('incident-status-select');
        if (statusSelect) {
            statusSelect.value = incident.status || 'ongoing';
        }
        openModal('incident-status-modal');
    }
}

async function saveIncidentStatus() {
    if (!currentIncidentId) {
        showToast('No incident selected', 'error');
        return;
    }
    
    try {
        if (typeof firebase === 'undefined') {
            showToast('Firebase not available', 'error');
            return;
        }
        
        const statusSelect = document.getElementById('incident-status-select');
        const newStatus = statusSelect.value;
        const db = firebase.firestore();
        
        // Get incident details for logging
        const incidentDoc = await db.collection('reports').doc(currentIncidentId).get();
        const incidentData = incidentDoc.data();
        
        // Update the incident status
        await db.collection('reports').doc(currentIncidentId).update({
            status: newStatus,
            updatedAt: new Date()
        });
        
        // Log the activity
        await logActivity('incident_status_updated', currentIncidentId, {
            incidentType: incidentData.type,
            newStatus: newStatus,
            description: incidentData.description ? incidentData.description.substring(0, 50) : ''
        });
        
        showToast(`Incident marked as ${newStatus}`, 'success');
        closeModal('incident-status-modal');
        // The real-time listener in loadIncidents() will automatically refresh the view
    } catch (error) {
        console.error('Error updating incident status:', error);
        showToast('Error updating status: ' + error.message, 'error');
    }
}

function filterIncidents() {
    const typeSelect = document.getElementById('incident-type-filter');
    
    if (!typeSelect) return;
    
    const typeFilter = typeSelect.value;
    
    let filtered = allIncidents;
    
    if (typeFilter) {
        filtered = filtered.filter(incident => incident.type === typeFilter);
    }
    
    renderIncidents(filtered);
}

// ================================================================
// Close modal when clicking outside
// ================================================================

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Set up incident filter event listeners
const typeFilter = document.getElementById('incident-type-filter');

if (typeFilter) {
    typeFilter.addEventListener('change', filterIncidents);
}

// Set up notification form event listener
const notificationForm = document.getElementById('notification-form');
if (notificationForm) {
    notificationForm.addEventListener('submit', sendNotification);
}

// ================================================================
// Locations Management Functions
// ================================================================

let allLocations = [];

async function loadLocations() {
    try {
        if (typeof firebase === 'undefined') return;
        
        const db = firebase.firestore();
        const snapshot = await db.collection('locations').orderBy('name').get();
        
        allLocations = [];
        snapshot.forEach((doc) => {
            const location = doc.data();
            location.id = doc.id;
            allLocations.push(location);
        });
        
        console.log('Loaded ' + allLocations.length + ' locations');
        renderLocationsTable(allLocations);
    } catch (error) {
        console.log('Error loading locations:', error);
        allLocations = [];
        renderLocationsTable([]);
    }
}

function renderLocationsTable(locations) {
    const tableBody = document.getElementById('locations-table-body');
    if (!tableBody) return;
    
    if (locations.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No locations found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = locations.map(loc => `
        <tr>
            <td>${loc.name}</td>
            <td><span class="badge badge-info">${loc.type}</span></td>
            <td>${typeof loc.lat === 'number' ? loc.lat.toFixed(5) : parseFloat(loc.lat).toFixed(5)}</td>
            <td>${typeof loc.long === 'number' ? loc.long.toFixed(5) : parseFloat(loc.long).toFixed(5)}</td>
            <td>
                <a href="https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.long}" target="_blank" class="btn btn-sm" style="background-color: #4285F4; color: white; text-decoration: none;">📍 View Map</a>
            </td>
            <td>
                <button onclick='editLocation("${loc.id}", ${JSON.stringify(loc)})' 
                    class="btn btn-sm" style="background-color: #fef08a; color: #854d0e; border: none;">Edit</button>
                <button onclick='deleteLocation("${loc.id}")' class="btn btn-sm btn-danger">Delete</button>
            </td>
        </tr>
    `).join('');
}

function filterLocations() {
    const searchQuery = document.getElementById('search-locations').value.toLowerCase();
    const typeFilter = document.getElementById('filter-location-type').value;
    
    const filtered = allLocations.filter(loc => {
        const matchSearch = loc.name.toLowerCase().includes(searchQuery);
        const matchType = !typeFilter || loc.type === typeFilter;
        return matchSearch && matchType;
    });
    
    renderLocationsTable(filtered);
}

function editLocation(id, loc) {
    document.getElementById('location-modal-title').textContent = 'Edit Location';
    document.getElementById('location-name').value = loc.name;
    document.getElementById('location-type').value = loc.type;
    document.getElementById('location-lat').value = loc.lat;
    document.getElementById('location-long').value = loc.long;
    
    const form = document.getElementById('location-form');
    form.dataset.mode = 'edit';
    form.dataset.locationId = id;
    
    openModal('location-modal');
}

async function deleteLocation(id) {
    if (!confirm('Are you sure you want to delete this location?')) return;
    
    try {
        const db = firebase.firestore();
        await db.collection('locations').doc(id).delete();
        showToast('Location deleted successfully', 'success');
        loadLocations();
        loadStatistics();
    } catch (error) {
        showToast('Error deleting location: ' + error.message, 'error');
    }
}

// Event Listeners for Locations
const addLocationBtn = document.getElementById('add-location-btn');
if (addLocationBtn) {
    addLocationBtn.addEventListener('click', () => {
        document.getElementById('location-modal-title').textContent = 'Add Location';
        document.getElementById('location-form').reset();
        document.getElementById('location-form').dataset.mode = 'create';
        openModal('location-modal');
    });
}

const locationForm = document.getElementById('location-form');
if (locationForm) {
    locationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mode = locationForm.dataset.mode;
        const id = locationForm.dataset.locationId;
        
        const data = {
            name: document.getElementById('location-name').value,
            type: document.getElementById('location-type').value,
            lat: parseFloat(document.getElementById('location-lat').value),
            long: parseFloat(document.getElementById('location-long').value),
            updatedAt: new Date()
        };
        
        try {
            const db = firebase.firestore();
            if (mode === 'edit') {
                await db.collection('locations').doc(id).update(data);
                showToast('Location updated', 'success');
            } else {
                data.createdAt = new Date();
                await db.collection('locations').add(data);
                showToast('Location added', 'success');
            }
            closeModal('location-modal');
            loadLocations();
            loadStatistics();
        } catch (error) {
            showToast('Error saving location: ' + error.message, 'error');
        }
    });
}

const searchLocationsInput = document.getElementById('search-locations');
if (searchLocationsInput) {
    searchLocationsInput.addEventListener('input', filterLocations);
}

const filterLocationType = document.getElementById('filter-location-type');
if (filterLocationType) {
    filterLocationType.addEventListener('change', filterLocations);
}

// ================================================================
// Initialize App (Auth listener is now in DOMContentLoaded)
// ================================================================

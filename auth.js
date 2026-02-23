// Authentication state observer
auth.onAuthStateChanged(async (user) => {
    const navLinks = document.querySelector('.nav-links');
    const navIcons = document.querySelector('.nav-icons');
    
    if (user) {
        // User is signed in
        console.log('User logged in:', user.email);
        
        // Update navigation - remove login button, add user icon and logout
        updateNavigationForLoggedInUser(user);
        
        // Check if user is admin
        const isAdmin = await checkIfUserIsAdmin(user.uid);
        
        // Load user profile data
        loadUserProfile(user.uid);
        
        // Load user's cart count
        loadUserCartCount(user.uid);
    } else {
        // User is signed out
        console.log('User logged out');
        updateNavigationForLoggedOutUser();
    }
});

// Update navigation for logged in user
function updateNavigationForLoggedInUser(user) {
    const navIcons = document.querySelector('.nav-icons');
    if (!navIcons) return;
    
    // Clear existing icons
    navIcons.innerHTML = '';
    
    // Add wishlist
    const wishlistIcon = document.createElement('i');
    wishlistIcon.className = 'fa-regular fa-heart';
    wishlistIcon.onclick = () => window.location.href = 'wishlist.html';
    navIcons.appendChild(wishlistIcon);
    
    // Add profile icon with user's initial or default
    const profileIcon = document.createElement('i');
    profileIcon.className = 'fa-regular fa-circle-user';
    profileIcon.onclick = () => window.location.href = 'profile.html';
    navIcons.appendChild(profileIcon);
    
    // Add logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'logout-btn';
    logoutBtn.innerHTML = '<i class="fa-regular fa-right-from-bracket"></i> Logout';
    logoutBtn.onclick = logoutUser;
    navIcons.appendChild(logoutBtn);
    
    // Add cart with badge
    const cartDiv = document.createElement('div');
    cartDiv.className = 'cart-badge';
    cartDiv.onclick = () => window.location.href = 'cart.html';
    cartDiv.innerHTML = `
        <i class="fa-regular fa-cart-shopping"></i>
        <span>0</span>
    `;
    navIcons.appendChild(cartDiv);
}

// Update navigation for logged out user
function updateNavigationForLoggedOutUser() {
    const navIcons = document.querySelector('.nav-icons');
    if (!navIcons) return;
    
    navIcons.innerHTML = '';
    
    // Add login button
    const loginLink = document.createElement('a');
    loginLink.href = 'login.html';
    loginLink.style.color = 'inherit';
    loginLink.style.textDecoration = 'none';
    loginLink.innerHTML = '<i class="fa-regular fa-right-to-bracket"></i> Login';
    navIcons.appendChild(loginLink);
    
    // Add cart
    const cartDiv = document.createElement('div');
    cartDiv.className = 'cart-badge';
    cartDiv.onclick = () => window.location.href = 'cart.html';
    cartDiv.innerHTML = `
        <i class="fa-regular fa-cart-shopping"></i>
        <span>0</span>
    `;
    navIcons.appendChild(cartDiv);
}

// Check if user is admin
async function checkIfUserIsAdmin(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists && userDoc.data().role === 'admin') {
            // Show admin panel link
            showAdminLink();
            
            // Store admin status in session
            sessionStorage.setItem('isAdmin', 'true');
            return true;
        } else {
            sessionStorage.setItem('isAdmin', 'false');
            return false;
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Show admin link in navigation
function showAdminLink() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && !document.getElementById('adminLink')) {
        const adminLink = document.createElement('a');
        adminLink.id = 'adminLink';
        adminLink.href = 'admin.html';
        adminLink.innerHTML = 'Admin';
        adminLink.className = 'admin-link';
        navLinks.appendChild(adminLink);
    }
}

// Load user profile data
async function loadUserProfile(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Store user data in session for profile page
            sessionStorage.setItem('userData', JSON.stringify(userData));
            
            // Update profile page if it exists
            updateProfilePage(userData);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Update profile page with user data
function updateProfilePage(userData) {
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    const profileAvatar = document.querySelector('.avatar-image i');
    
    if (profileName) {
        profileName.textContent = userData.displayName || 'User';
    }
    if (profileEmail) {
        profileEmail.textContent = userData.email || '';
    }
    if (profilePhone) {
        profilePhone.textContent = userData.phone || 'Not provided';
    }
    if (profileAvatar && userData.displayName) {
        // Could add first letter of name as avatar
        profileAvatar.style.fontSize = '2rem';
    }
}

// Load user's cart count
async function loadUserCartCount(uid) {
    try {
        const cartSnapshot = await db.collection('carts').doc(uid).collection('items').get();
        const cartCount = cartSnapshot.size;
        
        const cartBadge = document.querySelector('.cart-badge span');
        if (cartBadge) {
            cartBadge.textContent = cartCount;
        }
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

// Login function
async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Show success message
        showNotification('Login successful! Redirecting...', 'success');
        
        // Redirect after 2 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
        return userCredential.user;
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Signup function
async function signupUser(userData) {
    try {
        const { email, password, firstName, lastName, phone } = userData;
        
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile
        await user.updateProfile({
            displayName: `${firstName} ${lastName}`
        });
        
        // Save user data to Firestore
        await db.collection('users').doc(user.uid).set({
            firstName,
            lastName,
            email,
            phone: phone || '',
            displayName: `${firstName} ${lastName}`,
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: user.emailVerified
        });
        
        // Send email verification
        await user.sendEmailVerification({
            url: window.location.origin + '/login.html',
            handleCodeInApp: true
        });
        
        showNotification('Account created successfully! Please check your email to verify your account.', 'success');
        
        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        
        return user;
    } catch (error) {
        console.error('Signup error:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Admin Login function
async function adminLogin(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Check if user is admin
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            // Not an admin, sign out
            await auth.signOut();
            showNotification('Access denied. Admin privileges required.', 'error');
            return false;
        }
        
        showNotification('Admin login successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 2000);
        
        return true;
    } catch (error) {
        console.error('Admin login error:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Logout function
async function logoutUser() {
    try {
        await auth.signOut();
        sessionStorage.clear();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification(error.message, 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(notification);
    }
    
    // Set color based on type
    if (type === 'success') {
        notification.style.backgroundColor = '#10b981';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#ef4444';
    } else {
        notification.style.backgroundColor = '#3b82f6';
    }
    
    notification.textContent = message;
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .logout-btn {
        padding: 0.5rem 1rem;
        background: var(--gray-100);
        color: var(--gray-700);
        border: none;
        border-radius: var(--radius);
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Inter', sans-serif;
        font-size: 0.95rem;
    }
    
    .logout-btn:hover {
        background: var(--danger);
        color: var(--white);
    }
    
    .admin-link {
        color: var(--primary) !important;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

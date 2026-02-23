// Authentication state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        console.log('User logged in:', user.email);
        
        // Check if user is admin
        checkIfUserIsAdmin(user.uid);
        
        // Update UI for logged in user
        updateUIForLoggedInUser(user);
        
        // Load user profile data
        loadUserProfile(user.uid);
    } else {
        // User is signed out
        console.log('User logged out');
        updateUIForLoggedOutUser();
    }
});

// Check if user is admin
async function checkIfUserIsAdmin(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists && userDoc.data().role === 'admin') {
            // Show admin panel link
            showAdminLink();
            
            // Store admin status in session
            sessionStorage.setItem('isAdmin', 'true');
        } else {
            sessionStorage.setItem('isAdmin', 'false');
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser(user) {
    // Update navigation icons
    const userIcon = document.querySelector('.fa-user');
    if (userIcon) {
        userIcon.classList.remove('fa-regular');
        userIcon.classList.add('fa-solid');
    }
    
    // Hide login link, show profile
    const loginLink = document.querySelector('a[href="login.html"]');
    if (loginLink) {
        loginLink.style.display = 'none';
    }
    
    // Update cart badge with user's cart count
    loadUserCartCount(user.uid);
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    const userIcon = document.querySelector('.fa-user');
    if (userIcon) {
        userIcon.classList.remove('fa-solid');
        userIcon.classList.add('fa-regular');
    }
    
    const loginLink = document.querySelector('a[href="login.html"]');
    if (loginLink) {
        loginLink.style.display = 'block';
    }
    
    // Hide admin link
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
        adminLink.style.display = 'none';
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
        navLinks.appendChild(adminLink);
    }
}

// Load user profile data
async function loadUserProfile(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Update profile page if it exists
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            const profilePhone = document.getElementById('profilePhone');
            
            if (profileName) {
                profileName.textContent = userData.displayName || 'User';
            }
            if (profileEmail) {
                profileEmail.textContent = userData.email || '';
            }
            if (profilePhone) {
                profilePhone.textContent = userData.phone || 'Not provided';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
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
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Show success message
        showNotification('Account created successfully! Redirecting...', 'success');
        
        // Redirect after 2 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        
        return user;
    } catch (error) {
        console.error('Signup error:', error);
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
    // Create notification element if it doesn't exist
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
        notification.remove();
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
`;
document.head.appendChild(style);
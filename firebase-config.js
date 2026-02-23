// Firebase configuration
// Replace with your own Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDEwOyzI3NrIYu3pl1excnSScK7kCtBF5s",
  authDomain: "bible-faith-a6568.firebaseapp.com",
  projectId: "bible-faith-a6568",
  storageBucket: "bible-faith-a6568.firebasestorage.app",
  messagingSenderId: "830045110816",
  appId: "1:830045110816:web:7d0554853f1e9bd9763245",
  measurementId: "G-SZDX8KYEG5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.log('The current browser does not support persistence.');
        }
    });

// Create admin user function (run this once)
async function createAdminUser() {
    try {
        // Create admin user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(
            'admin@electrotech.com', 
            'Admin@123'
        );
        
        // Add admin claim in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            email: 'admin@electrotech.com',
            role: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Admin user created successfully');
    } catch (error) {
        console.error('Error creating admin:', error);
    }
}

// Uncomment to create admin user (run once, then comment again)
// createAdminUser();
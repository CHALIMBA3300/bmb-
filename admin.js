// Admin panel functions

// Check if current user is admin
async function requireAdmin() {
    const user = auth.currentUser;
    
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error checking admin:', error);
        window.location.href = 'index.html';
        return false;
    }
}

// Upload product
async function uploadProduct(productData, imageFile) {
    const isAdmin = await requireAdmin();
    if (!isAdmin) return;
    
    try {
        let imageUrl = '';
        
        // Upload image if provided
        if (imageFile) {
            const storageRef = storage.ref();
            const imageRef = storageRef.child(`products/${Date.now()}_${imageFile.name}`);
            const snapshot = await imageRef.put(imageFile);
            imageUrl = await snapshot.ref.getDownloadURL();
        }
        
        // Save product to Firestore
        const productRef = await db.collection('products').add({
            ...productData,
            imageUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Product uploaded successfully!', 'success');
        return productRef.id;
    } catch (error) {
        console.error('Error uploading product:', error);
        showNotification('Error uploading product', 'error');
        throw error;
    }
}

// Update product
async function updateProduct(productId, productData, imageFile = null) {
    const isAdmin = await requireAdmin();
    if (!isAdmin) return;
    
    try {
        let updateData = {
            ...productData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Upload new image if provided
        if (imageFile) {
            const storageRef = storage.ref();
            const imageRef = storageRef.child(`products/${Date.now()}_${imageFile.name}`);
            const snapshot = await imageRef.put(imageFile);
            updateData.imageUrl = await snapshot.ref.getDownloadURL();
        }
        
        // Update product in Firestore
        await db.collection('products').doc(productId).update(updateData);
        
        showNotification('Product updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating product:', error);
        showNotification('Error updating product', 'error');
        throw error;
    }
}

// Delete product
async function deleteProduct(productId) {
    const isAdmin = await requireAdmin();
    if (!isAdmin) return;
    
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        // Get product to delete image
        const product = await db.collection('products').doc(productId).get();
        
        // Delete image from storage if exists
        if (product.exists && product.data().imageUrl) {
            const imageRef = storage.refFromURL(product.data().imageUrl);
            await imageRef.delete().catch(console.error);
        }
        
        // Delete product from Firestore
        await db.collection('products').doc(productId).delete();
        
        showNotification('Product deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Error deleting product', 'error');
    }
}

// Load all products for admin
async function loadAllProducts() {
    const isAdmin = await requireAdmin();
    if (!isAdmin) return [];
    
    try {
        const snapshot = await db.collection('products')
            .orderBy('createdAt', 'desc')
            .get();
        
        const products = [];
        snapshot.forEach(doc => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return products;
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

// Load orders for admin
async function loadAllOrders() {
    const isAdmin = await requireAdmin();
    if (!isAdmin) return [];
    
    try {
        const snapshot = await db.collection('orders')
            .orderBy('createdAt', 'desc')
            .get();
        
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return orders;
    } catch (error) {
        console.error('Error loading orders:', error);
        return [];
    }
}

// Update order status
async function updateOrderStatus(orderId, status) {
    const isAdmin = await requireAdmin();
    if (!isAdmin) return;
    
    try {
        await db.collection('orders').doc(orderId).update({
            status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Order status updated!', 'success');
    } catch (error) {
        console.error('Error updating order:', error);
        showNotification('Error updating order', 'error');
    }
}

// Get dashboard stats
async function getDashboardStats() {
    const isAdmin = await requireAdmin();
    if (!isAdmin) return {};
    
    try {
        // Get total products
        const productsSnapshot = await db.collection('products').get();
        const totalProducts = productsSnapshot.size;
        
        // Get total orders
        const ordersSnapshot = await db.collection('orders').get();
        const totalOrders = ordersSnapshot.size;
        
        // Get total users
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;
        
        // Calculate total revenue
        let totalRevenue = 0;
        ordersSnapshot.forEach(doc => {
            totalRevenue += doc.data().total || 0;
        });
        
        return {
            totalProducts,
            totalOrders,
            totalUsers,
            totalRevenue
        };
    } catch (error) {
        console.error('Error getting stats:', error);
        return {};
    }
}
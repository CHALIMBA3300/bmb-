// Product management functions

// Load products from Firestore
async function loadProducts(filters = {}) {
    try {
        let query = db.collection('products');
        
        // Apply filters
        if (filters.category) {
            query = query.where('category', '==', filters.category);
        }
        
        if (filters.minPrice) {
            query = query.where('price', '>=', parseFloat(filters.minPrice));
        }
        
        if (filters.maxPrice) {
            query = query.where('price', '<=', parseFloat(filters.maxPrice));
        }
        
        // Get products
        const snapshot = await query.get();
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
        showNotification('Error loading products', 'error');
        return [];
    }
}

// Display products in grid
async function displayProducts(products, containerId = 'productGrid') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<div class="no-products">No products found</div>';
        return;
    }
    
    let html = '';
    products.forEach(product => {
        html += `
            <div class="product-card" data-id="${product.id}">
                ${product.discount ? `<span class="product-badge">-${product.discount}%</span>` : ''}
                ${product.isNew ? `<span class="product-badge" style="background: var(--primary);">New</span>` : ''}
                <img src="${product.imageUrl || 'https://via.placeholder.com/300'}" alt="${product.name}">
                <h4>${product.name}</h4>
                <div class="product-rating">
                    ${generateStarRating(product.rating || 0)}
                    <span>(${product.reviews || 0})</span>
                </div>
                <div class="price">
                    K${product.price.toLocaleString()}
                    ${product.oldPrice ? `<del>K${product.oldPrice.toLocaleString()}</del>` : ''}
                </div>
                <button class="btn btn-primary" onclick="addToCart('${product.id}')">
                    <i class="fa-regular fa-cart-plus"></i> Add to Cart
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Generate star rating HTML
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - Math.ceil(rating);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fa-solid fa-star"></i>';
    }
    
    if (halfStar) {
        stars += '<i class="fa-solid fa-star-half-alt"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="fa-regular fa-star"></i>';
    }
    
    return stars;
}

// Add to cart function
async function addToCart(productId) {
    const user = auth.currentUser;
    
    if (!user) {
        showNotification('Please login to add items to cart', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    try {
        const cartRef = db.collection('carts').doc(user.uid).collection('items').doc(productId);
        const cartItem = await cartRef.get();
        
        if (cartItem.exists) {
            // Update quantity
            await cartRef.update({
                quantity: firebase.firestore.FieldValue.increment(1),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Add new item
            const product = await db.collection('products').doc(productId).get();
            await cartRef.set({
                productId,
                name: product.data().name,
                price: product.data().price,
                quantity: 1,
                imageUrl: product.data().imageUrl,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Update cart badge
        loadUserCartCount(user.uid);
        
        showNotification('Product added to cart!', 'success');
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding to cart', 'error');
    }
}

// Get single product
async function getProduct(productId) {
    try {
        const doc = await db.collection('products').doc(productId).get();
        if (doc.exists) {
            return {
                id: doc.id,
                ...doc.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting product:', error);
        return null;
    }
}

// Load categories
async function loadCategories() {
    try {
        const snapshot = await db.collection('categories').get();
        const categories = [];
        
        snapshot.forEach(doc => {
            categories.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return categories;
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

// Search products
async function searchProducts(searchTerm) {
    try {
        // Note: For production, use Algolia or similar for better search
        const snapshot = await db.collection('products')
            .orderBy('name')
            .startAt(searchTerm)
            .endAt(searchTerm + '\uf8ff')
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
        console.error('Error searching products:', error);
        return [];
    }
}
// ============================================
// DOLLARCHIC'S STORE - CART WITH SUPABASE
// REQUIRES USER TO BE SIGNED IN
// ============================================

let cart = [];
let currentUserId = null;
let currentUserEmail = null;
let isLoading = false;

// ============================================
// CHECK IF USER IS SIGNED IN
// ============================================

async function isUserSignedIn() {
    console.log('Checking if user is signed in...');
    
    if (typeof window.dollarchicAuth === 'undefined') {
        console.log('dollarchicAuth not available');
        return false;
    }
    
    try {
        const result = await window.dollarchicAuth.getCurrentUser();
        console.log('Auth result:', result);
        
        // FIXED: Your structure has result.user directly (no nesting)
        if (result.success && result.isAuthenticated && result.user && result.user.id) {
            currentUserId = result.user.id;
            currentUserEmail = result.user.email;
            console.log('User is signed in:', currentUserEmail, 'ID:', currentUserId);
            return true;
        }
        console.log('User is NOT signed in');
        return false;
    } catch (error) {
        console.error('Error checking auth:', error);
        return false;
    }
}

// In cart.js - REPLACE the getCurrentUserId function with this:

async function getCurrentUserId() {
    // Return cached value if available
    if (currentUserId) return currentUserId;
    
    // Check if user is signed in and cache the result
    const isLoggedIn = await isUserSignedIn();
    if (isLoggedIn && currentUserId) {
        return currentUserId;
    }
    return null;
}

// Also make sure isUserSignedIn doesn't call getCurrentUserId
async function isUserSignedIn() {
    console.log('Checking if user is signed in...');
    
    if (typeof window.dollarchicAuth === 'undefined') {
        console.log('dollarchicAuth not available');
        return false;
    }
    
    try {
        const result = await window.dollarchicAuth.getCurrentUser();
        console.log('Auth result:', result);
        
        if (result.success && result.isAuthenticated && result.user && result.user.id) {
            // Cache the user ID
            currentUserId = result.user.id;
            currentUserEmail = result.user.email;
            console.log('User is signed in:', currentUserEmail, 'ID:', currentUserId);
            return true;
        }
        console.log('User is NOT signed in');
        currentUserId = null;
        currentUserEmail = null;
        return false;
    } catch (error) {
        console.error('Error checking auth:', error);
        return false;
    }
}
// ============================================
// SHOW LOGIN REQUIRED MESSAGE
// ============================================

function showLoginRequiredMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed; bottom: 30px; right: 30px; background: #0d1a1f;
        color: white; padding: 1rem 1.5rem; border-radius: 12px;
        display: flex; align-items: center; gap: 12px; z-index: 10000;
        transform: translateX(400px); transition: transform 0.3s ease;
        border-left: 3px solid #d4a830; box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        cursor: pointer;
    `;
    message.innerHTML = `
        <i class="fas fa-exclamation-circle" style="color: #d4a830;"></i>
        <span>Please sign in to add items to your bag</span>
    `;
    document.body.appendChild(message);
    setTimeout(() => message.style.transform = 'translateX(0)', 10);
    
    message.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
    
    setTimeout(() => {
        message.style.transform = 'translateX(400px)';
        setTimeout(() => message.remove(), 300);
    }, 4000);
}

// ============================================
// LOAD CART FROM SUPABASE
// ============================================

async function loadCart() {
    console.log('loadCart() called');
    
    const isLoggedIn = await isUserSignedIn();
    console.log('Is logged in?', isLoggedIn);
    
    if (!isLoggedIn) {
        cart = [];
        updateCartUI();
        return;
    }
    
    try {
        const userId = await getCurrentUserId();
        console.log('User ID:', userId);
        
        if (!userId) {
            cart = [];
            updateCartUI();
            return;
        }
        
        const { data, error } = await window.dollarchicSupabase
            .from('carts')
            .select(`
                id,
                product_id,
                quantity,
                products:product_id (
                    id,
                    name,
                    price,
                    image_url,
                    badge,
                    family
                )
            `)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        console.log('Cart data from Supabase:', data);
        
        if (data && data.length > 0) {
            cart = data.map(item => ({
                id: item.product_id,
                name: item.products.name,
                price: parseFloat(item.products.price),
                image: item.products.image_url,
                badge: item.products.badge,
                category: item.products.family || 'floral',
                quantity: item.quantity,
                cart_item_id: item.id
            }));
        } else {
            cart = [];
        }
        
        console.log('Cart loaded:', cart);
        updateCartUI();
    } catch (error) {
        console.error('Error loading cart from Supabase:', error);
        cart = [];
        updateCartUI();
    }
}

// ============================================
// SAVE CART TO SUPABASE
// ============================================

async function saveCart() {
    console.log('saveCart() called');
    
    const isLoggedIn = await isUserSignedIn();
    console.log('Is logged in for save?', isLoggedIn);
    
    if (!isLoggedIn) {
        console.log('Not logged in, cannot save cart');
        updateCartUI();
        return;
    }
    
    if (isLoading) return;
    isLoading = true;
    
    try {
        const userId = await getCurrentUserId();
        console.log('User ID for save:', userId);
        
        if (!userId) {
            isLoading = false;
            return;
        }
        
        // Delete existing cart items for this user
        const { error: deleteError } = await window.dollarchicSupabase
            .from('carts')
            .delete()
            .eq('user_id', userId);
        
        if (deleteError) throw deleteError;
        
        // Insert new cart items
        if (cart.length > 0) {
            const cartItems = cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                user_id: userId,
                updated_at: new Date()
            }));
            
            const { error: insertError } = await window.dollarchicSupabase
                .from('carts')
                .insert(cartItems);
            
            if (insertError) throw insertError;
            console.log('Cart saved successfully');
        }
        
    } catch (error) {
        console.error('Error saving cart to Supabase:', error);
    } finally {
        isLoading = false;
    }
    
    updateCartUI();
}

// ============================================
// CART OPERATIONS WITH LOGIN CHECK
// ============================================

async function addToCart(product) {
    console.log('addToCart called with:', product);
    
    const isLoggedIn = await isUserSignedIn();
    console.log('Is logged in for add?', isLoggedIn);
    
    if (!isLoggedIn) {
        showLoginRequiredMessage();
        return;
    }
    
    if (!product || !product.id) {
        console.error('Invalid product data:', product);
        return;
    }
    
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    await saveCart();
    
    if (typeof window.showNotification === 'function') {
        window.showNotification(`${product.name} added to bag`);
    } else {
        showToastMessage(`${product.name} added to bag`);
    }
    
    animateCartIcon();
}

async function removeFromCart(productId) {
    const isLoggedIn = await isUserSignedIn();
    
    if (!isLoggedIn) {
        showLoginRequiredMessage();
        return;
    }
    
    setCartItemLoading(productId, true);
    
    cart = cart.filter(item => item.id !== productId);
    await saveCart();
    
    setCartItemLoading(productId, false);
    showToastMessage('Item removed from bag');
}

async function updateQuantity(productId, change) {
    const isLoggedIn = await isUserSignedIn();
    
    if (!isLoggedIn) {
        showLoginRequiredMessage();
        return;
    }
    
    const item = cart.find(item => item.id === productId);
    if (item) {
        const newQuantity = item.quantity + change;
        
        setCartItemLoading(productId, true);
        
        if (newQuantity <= 0) {
            await removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
            await saveCart();
        }
        
        setCartItemLoading(productId, false);
    }
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// ============================================
// SET CART ITEM LOADING STATE
// ============================================

function setCartItemLoading(productId, isLoadingState) {
    const cartItem = document.querySelector(`.cart-item-${productId}`);
    if (!cartItem) return;
    
    const qtyButtons = cartItem.querySelectorAll('.cart-qty-btn');
    const removeBtn = cartItem.querySelector('.cart-remove-btn');
    const qtySpan = cartItem.querySelector('.cart-qty-span');
    
    if (isLoadingState) {
        qtyButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'wait';
        });
        if (removeBtn) {
            removeBtn.disabled = true;
            removeBtn.style.opacity = '0.5';
            removeBtn.style.cursor = 'wait';
        }
        if (qtySpan) {
            qtySpan.innerHTML = '<span style="display: inline-block; width: 24px; text-align: center;">...</span>';
        }
    } else {
        qtyButtons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = '';
        });
        if (removeBtn) {
            removeBtn.disabled = false;
            removeBtn.style.opacity = '';
            removeBtn.style.cursor = '';
        }
        if (qtySpan) {
            const item = cart.find(item => item.id === productId);
            qtySpan.textContent = item?.quantity || '';
        }
    }
}

// ============================================
// UPDATE CART UI
// ============================================

async function updateCartUI() {
    console.log('updateCartUI() called');
    
    const isLoggedIn = await isUserSignedIn();
    console.log('Is logged in for UI?', isLoggedIn);
    
    // Update cart count badge
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) cartCountEl.textContent = getCartCount();
    
    // Update cart sidebar items
    const cartItemsEl = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotal');
    
    if (cartItemsEl && cartTotalEl) {
        if (!isLoggedIn) {
            console.log('Showing login required in cart');
            cartItemsEl.innerHTML = `
                <div class="empty-cart" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-lock" style="font-size: 2.5rem; color: #d4a830; margin-bottom: 1rem; display: block;"></i>
                    <p style="margin-bottom: 0.5rem;">Please sign in to view your bag</p>
                    <button onclick="window.location.href='login.html'" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: #d4a830; border: none; border-radius: 30px; cursor: pointer; color: #0d1a1f; font-weight: 500;">Sign In</button>
                </div>
            `;
            cartTotalEl.textContent = `₦0.00`;
            return;
        }
        
        if (cart.length === 0) {
            cartItemsEl.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-bag"></i><p>Your bag is empty</p></div>';
        } else {
            cartItemsEl.innerHTML = cart.map(item => `
                <div class="cart-item-${item.id}" style="display: flex; gap: 1rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #eee; position: relative;">
                    <img src="${item.image}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 12px;">
                    <div style="flex: 1;">
                        <h4 style="margin-bottom: 0.25rem;">${escapeHtml(item.name)}</h4>
                        <p style="color: var(--gold-pure); font-weight: 600;">₦${item.price.toFixed(2)}</p>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                            <button class="cart-qty-btn" onclick="window.updateQuantity(${item.id}, -1)" style="width: 28px; height: 28px; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer; transition: all 0.2s;">-</button>
                            <span class="cart-qty-span" style="min-width: 24px; text-align: center;">${item.quantity}</span>
                            <button class="cart-qty-btn" onclick="window.updateQuantity(${item.id}, 1)" style="width: 28px; height: 28px; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer; transition: all 0.2s;">+</button>
                            <button class="cart-remove-btn" onclick="window.removeFromCart(${item.id})" style="margin-left: auto; background: none; border: none; color: #999; cursor: pointer; transition: color 0.2s;"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        cartTotalEl.textContent = `₦${getCartTotal().toFixed(2)}`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToastMessage(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 30px; right: 30px; background: #0d1a1f;
        color: white; padding: 1rem 1.5rem; border-radius: 12px;
        display: flex; align-items: center; gap: 12px; z-index: 10000;
        transform: translateX(400px); transition: transform 0.3s ease;
        border-left: 3px solid #d4a830; box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    `;
    toast.innerHTML = `<i class="fas fa-check-circle" style="color: #d4a830;"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 10);
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function animateCartIcon() {
    const icon = document.querySelector('.cart-btn');
    if (icon) {
        icon.style.transform = 'scale(1.1)';
        setTimeout(() => icon.style.transform = '', 200);
    }
}

// Add styles
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .cart-qty-btn:active {
        transform: scale(0.95);
    }
    
    .cart-remove-btn:hover {
        color: #e74c3c !important;
    }
`;
document.head.appendChild(spinStyle);

// ============================================
// INITIALIZE
// ============================================

// Make functions global
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;

// Load cart on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing cart...');
    // Small delay to ensure auth is ready
    setTimeout(async () => {
        await loadCart();
    }, 500);
});

// Listen for auth state changes
if (typeof window.dollarchicAuth !== 'undefined' && window.dollarchicAuth.onAuthStateChange) {
    window.dollarchicAuth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        if (event === 'SIGNED_IN') {
            await loadCart();
            showToastMessage('Welcome back! Your cart is ready.');
        } else if (event === 'SIGNED_OUT') {
            cart = [];
            updateCartUI();
            showToastMessage('You have been signed out.');
        }
    });
}

// Add this function to your cart.js (at the end, before the closing braces)

// Clear cart completely
async function clearCart() {
    console.log('Clearing cart...');
    cart = [];
    await saveCart();
    updateCartUI();
    showToastMessage('Cart cleared');
}

// Make it global
window.clearCart = clearCart;
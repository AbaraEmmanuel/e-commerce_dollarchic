// ============================================
// DOLLARCHIC'S STORE - CART WITH SUPABASE
// ============================================

let cart = [];
let currentSessionId = null;

// Generate or retrieve session ID
function getSessionId() {
    let sessionId = localStorage.getItem('dollarchic_session_id');
    if (!sessionId) {
        sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('dollarchic_session_id', sessionId);
    }
    return sessionId;
}

// ============================================
// LOAD CART FROM SUPABASE
// ============================================

async function loadCart() {
    try {
        const currentUser = await getCurrentUserFromSupabase();
        
        let query = window.dollarchicSupabase
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
            `);
        
        if (currentUser) {
            // Logged in user - get cart by user_id
            query = query.eq('user_id', currentUser.id);
        } else {
            // Guest user - get cart by session_id
            currentSessionId = getSessionId();
            query = query.eq('session_id', currentSessionId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
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
        
        updateCartUI();
    } catch (error) {
        console.error('Error loading cart from Supabase:', error);
        // Fallback to localStorage if Supabase fails
        loadCartFromLocalStorage();
    }
}

// Fallback: Load from localStorage
function loadCartFromLocalStorage() {
    const saved = localStorage.getItem('dollarchic_cart_backup');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartUI();
        // Sync to Supabase if possible
        syncCartToSupabase();
    }
}

// ============================================
// SAVE CART TO SUPABASE
// ============================================

async function saveCart() {
    try {
        const currentUser = await getCurrentUserFromSupabase();
        
        for (const item of cart) {
            const cartItem = {
                product_id: item.id,
                quantity: item.quantity
            };
            
            if (currentUser) {
                cartItem.user_id = currentUser.id;
            } else {
                currentSessionId = getSessionId();
                cartItem.session_id = currentSessionId;
            }
            
            // Check if item already exists in cart
            let existingQuery = window.dollarchicSupabase
                .from('carts')
                .select('id')
                .eq('product_id', item.id);
            
            if (currentUser) {
                existingQuery = existingQuery.eq('user_id', currentUser.id);
            } else {
                existingQuery = existingQuery.eq('session_id', currentSessionId);
            }
            
            const { data: existing } = await existingQuery;
            
            if (existing && existing.length > 0) {
                // Update existing item
                await window.dollarchicSupabase
                    .from('carts')
                    .update({ quantity: item.quantity, updated_at: new Date() })
                    .eq('id', existing[0].id);
            } else {
                // Insert new item
                await window.dollarchicSupabase
                    .from('carts')
                    .insert([cartItem]);
            }
        }
        
        // Remove items that are no longer in cart
        const productIds = cart.map(item => item.id);
        let deleteQuery = window.dollarchicSupabase
            .from('carts')
            .delete()
            .not('product_id', 'in', `(${productIds.join(',')})`);
        
        if (currentUser) {
            deleteQuery = deleteQuery.eq('user_id', currentUser.id);
        } else {
            deleteQuery = deleteQuery.eq('session_id', currentSessionId);
        }
        
        await deleteQuery;
        
        // Backup to localStorage as fallback
        localStorage.setItem('dollarchic_cart_backup', JSON.stringify(cart));
        
    } catch (error) {
        console.error('Error saving cart to Supabase:', error);
        // Fallback to localStorage
        localStorage.setItem('dollarchic_cart_backup', JSON.stringify(cart));
    }
    
    updateCartUI();
}

// ============================================
// SYNC LOCALSTORAGE CART TO SUPABASE
// ============================================

async function syncCartToSupabase() {
    if (cart.length === 0) return;
    
    try {
        const currentUser = await getCurrentUserFromSupabase();
        
        for (const item of cart) {
            const cartItem = {
                product_id: item.id,
                quantity: item.quantity
            };
            
            if (currentUser) {
                cartItem.user_id = currentUser.id;
            } else {
                cartItem.session_id = getSessionId();
            }
            
            await window.dollarchicSupabase
                .from('carts')
                .upsert([cartItem], { onConflict: 'user_id, product_id' });
        }
        
        console.log('Cart synced to Supabase');
    } catch (error) {
        console.error('Error syncing cart:', error);
    }
}

// ============================================
// GET CURRENT USER HELPER
// ============================================

async function getCurrentUserFromSupabase() {
    if (typeof window.dollarchicAuth !== 'undefined') {
        const result = await window.dollarchicAuth.getCurrentUser();
        if (result.success && result.isAuthenticated) {
            return result.user.user;
        }
    }
    return null;
}

// ============================================
// CART OPERATIONS
// ============================================

async function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    await saveCart();
    showNotification(`${product.name} added to bag`);
    animateCartIcon();
}

async function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    await saveCart();
}

async function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            await removeFromCart(productId);
        } else {
            await saveCart();
        }
    }
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartUI() {
    const cartCountEl = document.getElementById('cartCount');
    if (cartCountEl) cartCountEl.textContent = getCartCount();
    
    const cartItemsEl = document.getElementById('cartItems');
    const cartTotalEl = document.getElementById('cartTotal');
    
    if (cartItemsEl && cartTotalEl) {
        if (cart.length === 0) {
            cartItemsEl.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-bag"></i><p>Your bag is empty</p></div>';
        } else {
            cartItemsEl.innerHTML = cart.map(item => `
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #eee;">
                    <img src="${item.image}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 12px;">
                    <div style="flex: 1;">
                        <h4 style="margin-bottom: 0.25rem;">${item.name}</h4>
                        <p style="color: var(--gold-pure); font-weight: 600;">₦${item.price}</p>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                            <button onclick="updateQuantity(${item.id}, -1)" style="width: 28px; height: 28px; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer;">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateQuantity(${item.id}, 1)" style="width: 28px; height: 28px; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer;">+</button>
                            <button onclick="removeFromCart(${item.id})" style="margin-left: auto; background: none; border: none; color: #999; cursor: pointer;"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        cartTotalEl.textContent = `₦${getCartTotal().toFixed(2)}`;
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function animateCartIcon() {
    const icon = document.querySelector('.cart-btn');
    if (icon) {
        icon.style.transform = 'scale(1.1)';
        setTimeout(() => icon.style.transform = '', 200);
    }
}

// ============================================
// MERGE GUEST CART WHEN USER LOGS IN
// ============================================

async function mergeGuestCartWithUser() {
    const guestCart = [...cart];
    if (guestCart.length === 0) return;
    
    try {
        const currentUser = await getCurrentUserFromSupabase();
        if (!currentUser) return;
        
        // Get user's existing cart from Supabase
        const { data: userCart } = await window.dollarchicSupabase
            .from('carts')
            .select('product_id, quantity')
            .eq('user_id', currentUser.id);
        
        // Merge guest cart with user cart
        for (const guestItem of guestCart) {
            const existingUserItem = userCart?.find(item => item.product_id === guestItem.id);
            
            if (existingUserItem) {
                // Update quantity
                await window.dollarchicSupabase
                    .from('carts')
                    .update({ quantity: existingUserItem.quantity + guestItem.quantity })
                    .eq('user_id', currentUser.id)
                    .eq('product_id', guestItem.id);
            } else {
                // Add new item
                await window.dollarchicSupabase
                    .from('carts')
                    .insert([{
                        user_id: currentUser.id,
                        product_id: guestItem.id,
                        quantity: guestItem.quantity
                    }]);
            }
        }
        
        // Clear guest session cart
        await window.dollarchicSupabase
            .from('carts')
            .delete()
            .eq('session_id', getSessionId());
        
        // Reload cart
        await loadCart();
        
        showNotification('Cart synced with your account');
    } catch (error) {
        console.error('Error merging cart:', error);
    }
}

// ============================================
// INITIALIZE
// ============================================

// Make functions global
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;

// Load cart on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadCart();
});

// Listen for auth state changes to merge cart
if (typeof window.dollarchicAuth !== 'undefined') {
    window.dollarchicAuth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            await mergeGuestCartWithUser();
        } else if (event === 'SIGNED_OUT') {
            // Clear cart and load guest cart
            await loadCart();
        }
    });
}
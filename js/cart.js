// ============================================
// DOLLARCHIC'S STORE - CART WITH SUPABASE
// ============================================

let cart = [];
let currentSessionId = null;
let isLoading = false; // Global loading state for cart operations

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
// LOADING INDICATORS
// ============================================

function showCartLoading() {
    const cartItemsEl = document.getElementById('cartItems');
    if (cartItemsEl && cartItemsEl.innerHTML !== '<div class="empty-cart"><i class="fas fa-shopping-bag"></i><p>Your bag is empty</p></div>') {
        cartItemsEl.innerHTML = `
            <div class="cart-loading-state" style="text-align: center; padding: 3rem;">
                <div class="loading-spinner-small" style="width: 30px; height: 30px; border: 2px solid rgba(210, 170, 50, 0.2); border-top-color: var(--gold-pure); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem;"></div>
                <p style="color: var(--ash); font-size: 0.8rem;">Updating your bag...</p>
            </div>
        `;
    }
}

function hideCartLoading() {
    // The actual cart content will be restored by updateCartUI
}

// ============================================
// LOAD CART FROM SUPABASE
// ============================================

async function loadCart() {
    // Show loading indicator in cart if cart is open
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar && cartSidebar.classList.contains('open')) {
        showCartLoading();
    }
    
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
            query = query.eq('user_id', currentUser.id);
        } else {
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
        loadCartFromLocalStorage();
    }
}

// Fallback: Load from localStorage
function loadCartFromLocalStorage() {
    const saved = localStorage.getItem('dollarchic_cart_backup');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartUI();
        syncCartToSupabase();
    }
}

// ============================================
// SAVE CART TO SUPABASE
// ============================================

async function saveCart(showLoadingIndicator = true) {
    if (isLoading) return;
    isLoading = true;
    
    // Show loading in cart sidebar if it's open
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartWasOpen = cartSidebar && cartSidebar.classList.contains('open');
    
    if (showLoadingIndicator && cartWasOpen) {
        showCartLoading();
    }
    
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
                await window.dollarchicSupabase
                    .from('carts')
                    .update({ quantity: item.quantity, updated_at: new Date() })
                    .eq('id', existing[0].id);
            } else {
                await window.dollarchicSupabase
                    .from('carts')
                    .insert([cartItem]);
            }
        }
        
        const productIds = cart.map(item => item.id);
        if (productIds.length > 0) {
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
        }
        
        localStorage.setItem('dollarchic_cart_backup', JSON.stringify(cart));
        
    } catch (error) {
        console.error('Error saving cart to Supabase:', error);
        localStorage.setItem('dollarchic_cart_backup', JSON.stringify(cart));
    } finally {
        isLoading = false;
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
// CART OPERATIONS (with loading states)
// ============================================

// Main function that accepts a product object
async function addToCart(product) {
    // Validate product
    if (!product || !product.id) {
        console.error('Invalid product data:', product);
        showNotification('Unable to add item. Please try again.', 'error');
        return;
    }
    
    // Show loading on the product button (handled by the page)
    // The page's button will show its own loading spinner
    
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    await saveCart(true);
    updateCartBadge();
    showNotification(`${product.name} added to bag`, 'success');
    animateCartIcon();
}

async function removeFromCart(productId) {
    // Show loading in cart
    showCartLoading();
    
    cart = cart.filter(item => item.id !== productId);
    await saveCart(true);
    
    const productName = cart.find(item => item.id === productId)?.name || 'Item';
    showNotification(`Removed from bag`, 'info');
}

async function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        const newQuantity = item.quantity + change;
        
        if (newQuantity <= 0) {
            await removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
            await saveCart(true);
        }
    }
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartBadge() {
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = getCartCount();
        // Animate badge when count changes
        cartCountEl.style.transform = 'scale(1.2)';
        setTimeout(() => {
            if (cartCountEl) cartCountEl.style.transform = '';
        }, 200);
    }
}

function updateCartUI() {
    updateCartBadge();
    
    const cartItemsEl = document.getElementById('cart-body');
    const cartTotalEl = document.getElementById('cart-total');
    
    if (cartItemsEl && cartTotalEl) {
        if (cart.length === 0) {
            cartItemsEl.innerHTML = `
                <div class="cart-empty" style="text-align: center; padding: 4rem 2rem;">
                    <i class="fas fa-shopping-bag" style="font-size: 3rem; color: rgba(212,168,48,0.2); margin-bottom: 1rem; display: block;"></i>
                    <p style="font-family: var(--serif); font-style: italic; color: rgba(248,244,237,0.3); font-size: 1.1rem;">Your bag awaits</p>
                    <p style="font-size: 0.7rem; color: rgba(248,244,237,0.2); margin-top: 0.5rem;">Add something exquisite</p>
                </div>
            `;
        } else {
            cartItemsEl.innerHTML = cart.map(item => `
                <div style="display: flex; gap: 1rem; margin-bottom: 1.25rem; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.04);" class="cart-item-${item.id}">
                    <img src="${item.image}" style="width: 72px; height: 90px; object-fit: cover; border-radius: 12px; flex-shrink: 0;">
                    <div style="flex: 1;">
                        <div style="font-family: var(--serif); font-size: 1rem; font-weight: 300; color: var(--bone); margin-bottom: 0.25rem;">${escapeHtml(item.name)}</div>
                        <div style="font-family: var(--display); font-size: 0.55rem; letter-spacing: 0.15em; color: var(--gold-2); margin-bottom: 0.75rem;">${item.category || 'Luxury Item'}</div>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <button onclick="window.updateQuantity(${item.id}, -1)" class="cart-qty-btn" style="width: 28px; height: 28px; border: 1px solid rgba(255,255,255,0.08); background: none; color: var(--bone); cursor: pointer; font-size: 1rem; border-radius: 8px; transition: all 0.2s;">−</button>
                                <span style="font-family: var(--display); font-size: 0.7rem; color: var(--bone); min-width: 24px; text-align: center;">${item.quantity}</span>
                                <button onclick="window.updateQuantity(${item.id}, 1)" class="cart-qty-btn" style="width: 28px; height: 28px; border: 1px solid rgba(255,255,255,0.08); background: none; color: var(--bone); cursor: pointer; font-size: 1rem; border-radius: 8px; transition: all 0.2s;">+</button>
                            </div>
                            <button onclick="window.removeFromCart(${item.id})" class="cart-remove-btn" style="margin-left: auto; background: none; border: none; color: rgba(248,244,237,0.25); cursor: pointer; font-size: 0.85rem; transition: color 0.3s; padding: 0.25rem;">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                            <span style="font-family: var(--display); font-size: 0.7rem; color: var(--gold-2); letter-spacing: 0.06em;">₦${(item.price * item.quantity).toFixed(2)}</span>
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

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'info') icon = 'fa-info-circle';
    
    notification.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    
    // Style based on type
    if (type === 'error') {
        notification.style.borderLeftColor = '#c44a2c';
        notification.querySelector('i').style.color = '#c44a2c';
    } else if (type === 'info') {
        notification.style.borderLeftColor = '#f0c842';
        notification.querySelector('i').style.color = '#f0c842';
    }
    
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function animateCartIcon() {
    const icon = document.getElementById('cart-open-btn');
    if (icon) {
        icon.style.transform = 'scale(1.15)';
        setTimeout(() => icon.style.transform = '', 200);
    }
}

// ============================================
// MERGE GUEST CART WHEN USER LOGS IN
// ============================================

async function mergeGuestCartWithUser() {
    const guestCart = [...cart];
    if (guestCart.length === 0) return;
    
    showNotification('Syncing your cart...', 'info');
    
    try {
        const currentUser = await getCurrentUserFromSupabase();
        if (!currentUser) return;
        
        const { data: userCart } = await window.dollarchicSupabase
            .from('carts')
            .select('product_id, quantity')
            .eq('user_id', currentUser.id);
        
        for (const guestItem of guestCart) {
            const existingUserItem = userCart?.find(item => item.product_id === guestItem.id);
            
            if (existingUserItem) {
                await window.dollarchicSupabase
                    .from('carts')
                    .update({ quantity: existingUserItem.quantity + guestItem.quantity })
                    .eq('user_id', currentUser.id)
                    .eq('product_id', guestItem.id);
            } else {
                await window.dollarchicSupabase
                    .from('carts')
                    .insert([{
                        user_id: currentUser.id,
                        product_id: guestItem.id,
                        quantity: guestItem.quantity
                    }]);
            }
        }
        
        await window.dollarchicSupabase
            .from('carts')
            .delete()
            .eq('session_id', getSessionId());
        
        await loadCart();
        
        showNotification('Cart synced with your account', 'success');
    } catch (error) {
        console.error('Error merging cart:', error);
        showNotification('Failed to sync cart', 'error');
    }
}

// ============================================
// INITIALIZE
// ============================================

// Make functions global
window.addToCart = addToCart;
window.addToCartById = addToCartById;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.getCartCount = getCartCount;

// Add loading animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .cart-qty-btn:hover {
        border-color: var(--gold-2) !important;
        color: var(--gold-3) !important;
        background: rgba(212,168,48,0.1) !important;
    }
    
    .cart-remove-btn:hover {
        color: var(--gold-2) !important;
    }
    
    .cart-loading-state .loading-spinner-small {
        border: 2px solid rgba(210, 170, 50, 0.2);
        border-top-color: var(--gold-pure);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
`;
document.head.appendChild(style);

// Load cart on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadCart();
});

// Listen for auth state changes to merge cart
if (typeof window.dollarchicAuth !== 'undefined' && window.dollarchicAuth.onAuthStateChange) {
    window.dollarchicAuth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            await mergeGuestCartWithUser();
        } else if (event === 'SIGNED_OUT') {
            await loadCart();
        }
    });
}
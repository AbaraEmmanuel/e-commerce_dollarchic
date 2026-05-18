// Cart Management System
class ShoppingCart {
    constructor() {
        this.cart = this.loadCart();
        this.init();
    }
    
    loadCart() {
        const saved = localStorage.getItem('elevate_cart');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveCart() {
        localStorage.setItem('elevate_cart', JSON.stringify(this.cart));
        this.updateUI();
    }
    
    addItem(product) {
        const existing = this.cart.find(item => item.id === product.id);
        
        if (existing) {
            existing.quantity += 1;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image_url,
                quantity: 1
            });
        }
        
        this.saveCart();
        this.showNotification(`${product.name} added to bag`);
        this.animateCartIcon();
    }
    
    removeItem(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.showNotification('Item removed');
    }
    
    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                item.quantity = quantity;
                this.saveCart();
            }
        }
    }
    
    getTotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    
    getItemCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0);
    }
    
    updateUI() {
        // Update cart count badge
        const cartCounts = document.querySelectorAll('.cart-count');
        const count = this.getItemCount();
        cartCounts.forEach(el => {
            el.textContent = count;
            if (count === 0) el.style.display = 'none';
            else el.style.display = 'inline-block';
        });
        
        // Update sidebar cart
        this.renderSidebarCart();
        
        // Update cart page if it exists
        if (document.getElementById('cart-items-container')) {
            this.renderCartPage();
        }
    }
    
    renderSidebarCart() {
        const container = document.getElementById('cart-sidebar-items');
        if (!container) return;
        
        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Your bag is empty</p>
                </div>
            `;
            document.getElementById('cart-sidebar-total').textContent = '$0.00';
            return;
        }
        
        container.innerHTML = this.cart.map(item => `
            <div class="cart-sidebar-item">
                <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>$${item.price.toFixed(2)}</p>
                    <div class="quantity-controls">
                        <button onclick="cart.decrementQuantity(${item.id})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="cart.incrementQuantity(${item.id})">+</button>
                    </div>
                </div>
                <button class="remove-item" onclick="cart.removeItem(${item.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        document.getElementById('cart-sidebar-total').textContent = `$${this.getTotal().toFixed(2)}`;
    }
    
    renderCartPage() {
        const container = document.getElementById('cart-items-container');
        if (!container) return;
        
        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart-page">
                    <i class="fas fa-shopping-bag"></i>
                    <h3>Your bag is empty</h3>
                    <a href="shop.html" class="btn-primary">Continue Shopping</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.cart.map(item => `
            <div class="cart-page-item">
                <img src="${item.image || 'https://via.placeholder.com/120'}" alt="${item.name}">
                <div class="cart-item-info">
                    <h3>${item.name}</h3>
                    <p>$${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-item-quantity">
                    <button onclick="cart.decrementQuantity(${item.id})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="cart.incrementQuantity(${item.id})">+</button>
                </div>
                <div class="cart-item-total">
                    $${(item.price * item.quantity).toFixed(2)}
                </div>
                <button class="remove-item" onclick="cart.removeItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        document.getElementById('cart-total-amount').textContent = `$${this.getTotal().toFixed(2)}`;
    }
    
    incrementQuantity(productId) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity++;
            this.saveCart();
        }
    }
    
    decrementQuantity(productId) {
        const item = this.cart.find(item => item.id === productId);
        if (item && item.quantity > 1) {
            item.quantity--;
            this.saveCart();
        } else if (item && item.quantity === 1) {
            this.removeItem(productId);
        }
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification-toast';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    animateCartIcon() {
        const cartIcon = document.querySelector('.cart-btn');
        if (cartIcon) {
            cartIcon.classList.add('cart-bump');
            setTimeout(() => cartIcon.classList.remove('cart-bump'), 300);
        }
    }
    
    clearCart() {
        this.cart = [];
        this.saveCart();
    }
    
    init() {
        this.updateUI();
        
        // Add CSS for notifications
        const style = document.createElement('style');
        style.textContent = `
            .notification-toast {
                position: fixed;
                bottom: 30px;
                right: 30px;
                background: var(--primary-dark);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                z-index: 10000;
                transform: translateX(400px);
                transition: transform 0.3s ease;
                box-shadow: var(--shadow-lg);
            }
            
            .notification-toast.show {
                transform: translateX(0);
            }
            
            .notification-toast i {
                color: var(--primary-accent);
                font-size: 1.2rem;
            }
            
            .cart-bump {
                animation: bump 0.3s ease;
            }
            
            @keyframes bump {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }
            
            .cart-sidebar-item {
                display: flex;
                gap: 15px;
                padding: 15px 0;
                border-bottom: 1px solid var(--gray-200);
                position: relative;
            }
            
            .cart-sidebar-item img {
                width: 80px;
                height: 80px;
                object-fit: cover;
                border-radius: 8px;
            }
            
            .cart-item-details {
                flex: 1;
            }
            
            .cart-item-details h4 {
                font-size: 0.9rem;
                margin-bottom: 5px;
            }
            
            .quantity-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-top: 8px;
            }
            
            .quantity-controls button {
                width: 25px;
                height: 25px;
                background: var(--gray-200);
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: var(--transition-fast);
            }
            
            .quantity-controls button:hover {
                background: var(--primary-accent);
                color: white;
            }
            
            .remove-item {
                background: none;
                border: none;
                color: var(--gray-400);
                cursor: pointer;
                transition: var(--transition-fast);
            }
            
            .remove-item:hover {
                color: #e74c3c;
            }
            
            .cart-page-item {
                display: grid;
                grid-template-columns: 120px 2fr 1fr 1fr auto;
                gap: 20px;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--gray-200);
            }
            
            .cart-page-item img {
                width: 100px;
                height: 100px;
                object-fit: cover;
                border-radius: 8px;
            }
            
            .cart-item-quantity {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .cart-item-quantity button {
                width: 30px;
                height: 30px;
                background: var(--gray-200);
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .empty-cart-page {
                text-align: center;
                padding: 60px 20px;
            }
            
            .empty-cart-page i {
                font-size: 4rem;
                color: var(--gray-300);
                margin-bottom: 20px;
            }
            
            @media (max-width: 768px) {
                .cart-page-item {
                    grid-template-columns: 1fr;
                    text-align: center;
                    gap: 15px;
                }
                
                .cart-item-quantity {
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize cart globally
const cart = new ShoppingCart();
window.cart = cart;
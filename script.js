// Initialize Supabase
const SUPABASE_URL = 'https://hjrpltgfegnylcfwhwxh.supabase.co'; // from project settings
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcnBsdGdmZW55bGNmd2h3eGgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3OTA2MzE0OSwiZXhwIjoyMDk0NjM5MTQ5fQ.VbJ5oMVUOecRUwWH-QI6ExMh3oxs6Cym-0N7GV10mcU';    // from project settings
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Cart functions using localStorage
function getCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(productId, name, price) {
    const cart = getCart();
    const existing = cart.find(item => item.id === productId);
    
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id: productId, name, price, quantity: 1 });
    }
    
    saveCart(cart);
    alert(`${name} added to cart!`);
}

function updateCartCount() {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.getElementById('cart-count');
    if (counter) counter.innerText = total;
}

// Load products from Supabase
async function loadProducts() {
    const { data: products, error } = await supabase
        .from('products')
        .select('*');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    const container = document.getElementById('products-container');
    if (!container) return;
    
    container.innerHTML = products.map(product => `
        <div class="product-card">
            ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}">` : '<div class="no-image">No image</div>'}
            <h3>${product.name}</h3>
            <p>$${product.price}</p>
            <button onclick="addToCart(${product.id}, '${product.name}', ${product.price})">
                Add to Cart
            </button>
        </div>
    `).join('');
    
    updateCartCount();
}

// Cart page functionality
function displayCart() {
    const cart = getCart();
    const container = document.getElementById('cart-items');
    const totalSpan = document.getElementById('cart-total');
    
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<p>Your cart is empty</p>';
        return;
    }
    
    let total = 0;
    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price} x ${item.quantity}</span>
                <span>$${itemTotal}</span>
                <button onclick="removeItem(${item.id})">Remove</button>
            </div>
        `;
    }).join('');
    
    if (totalSpan) totalSpan.innerText = total.toFixed(2);
}

function removeItem(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    displayCart();
    updateCartCount();
}

// Checkout - save order to Supabase
async function submitOrder(event) {
    event.preventDefault();
    
    const cart = getCart();
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }
    
    const customerName = document.getElementById('name').value;
    const customerEmail = document.getElementById('email').value;
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Insert order
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
            customer_name: customerName,
            customer_email: customerEmail,
            total_amount: totalAmount,
            status: 'pending'
        }])
        .select()
        .single();
    
    if (orderError) {
        alert('Error creating order: ' + orderError.message);
        return;
    }
    
    // Insert order items
    const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price
    }));
    
    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
    
    if (itemsError) {
        alert('Error saving items: ' + itemsError.message);
        return;
    }
    
    // Clear cart and redirect
    localStorage.removeItem('cart');
    window.location.href = 'success.html?order=' + order.id;
}

// Run based on current page
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    loadProducts();
} else if (window.location.pathname.includes('cart.html')) {
    displayCart();
}
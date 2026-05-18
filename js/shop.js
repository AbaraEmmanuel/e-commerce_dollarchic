// Shop Page Functionality
class ShopManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentCategory = 'all';
        this.currentSort = 'featured';
        this.init();
    }
    
    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.renderProducts();
    }
    
    async loadProducts() {
        const container = document.getElementById('products-grid');
        if (container) {
            container.innerHTML = '<div class="loading-spinner"></div>';
        }
        
        const { data: products, error } = await window.supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading products:', error);
            if (container) {
                container.innerHTML = '<div class="error-message">Failed to load products. Please refresh.</div>';
            }
            return;
        }
        
        this.products = products;
        this.filteredProducts = [...products];
        this.renderProducts();
    }
    
    filterByCategory(category) {
        this.currentCategory = category;
        
        if (category === 'all') {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(p => p.category === category);
        }
        
        this.sortProducts();
        this.renderProducts();
        this.updateActiveFilter(category);
    }
    
    sortProducts() {
        switch (this.currentSort) {
            case 'price-low':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                // Keep original order for featured
                break;
        }
    }
    
    updateActiveFilter(category) {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    renderProducts() {
        const container = document.getElementById('products-grid');
        if (!container) return;
        
        if (this.filteredProducts.length === 0) {
            container.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i>
                    <h3>No products found</h3>
                    <p>Try adjusting your filters</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.filteredProducts.map(product => `
            <div class="product-card reveal">
                <div class="product-image">
                    <img src="${product.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600'}" alt="${product.name}">
                    ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
                    <div class="product-actions">
                        <button class="product-action-btn quick-view" data-id="${product.id}">
                            Quick View
                        </button>
                        <button class="product-action-btn add-to-cart" data-id="${product.id}">
                            Add to Bag
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category || 'Essentials'}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">$${product.price.toFixed(2)}</p>
                </div>
            </div>
        `).join('');
        
        // Attach event listeners to new buttons
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const product = this.products.find(p => p.id == btn.dataset.id);
                if (product) cart.addItem(product);
            });
        });
        
        // Reveal animations
        const reveals = document.querySelectorAll('.reveal');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.1 });
        
        reveals.forEach(reveal => observer.observe(reveal));
    }
    
    setupEventListeners() {
        // Filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterByCategory(btn.dataset.category);
            });
        });
        
        // Sort select
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.sortProducts();
                this.renderProducts();
            });
        }
    }
}

// Initialize shop when page loads
if (document.getElementById('products-grid')) {
    document.addEventListener('DOMContentLoaded', () => {
        window.shopManager = new ShopManager();
    });
}
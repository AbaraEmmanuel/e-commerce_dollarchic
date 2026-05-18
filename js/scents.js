// Scents Collection Manager
class ScentsManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentFamily = 'all';
        this.currentSort = 'featured';
        this.init();
    }
    
    async init() {
        await this.loadProducts();
        this.setupEventListeners();
    }
    
    async loadProducts() {
        const grid = document.getElementById('scents-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <p>Curating fragrances...</p>
                </div>
            `;
        }
        
        const { data: products, error } = await window.supabase
            .from('products')
            .select('*')
            .eq('category', 'scent')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading scents:', error);
            // Fallback sample data
            this.products = this.getSampleScents();
        } else if (products.length === 0) {
            this.products = this.getSampleScents();
            await this.insertSampleScents();
        } else {
            this.products = products;
        }
        
        this.filteredProducts = [...this.products];
        this.renderProducts();
    }
    
    getSampleScents() {
        return [
            { id: 1, name: 'Midnight Rose', price: 189, description: 'A mysterious blend of dark rose, oud, and amber', image_url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600', category: 'scent', family: 'floral', notes: 'Rose, Oud, Amber', in_stock: true },
            { id: 2, name: 'Santal Royale', price: 245, description: 'Creamy sandalwood, cashmeran, and vanilla', image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600', category: 'scent', family: 'woody', notes: 'Sandalwood, Cashmeran, Vanilla', in_stock: true },
            { id: 3, name: 'Oud Essence', price: 325, description: 'Rare Cambodian oud with saffron and leather', image_url: 'https://images.unsplash.com/photo-1590736961867-0c34c1ba254c?w=600', category: 'scent', family: 'oriental', notes: 'Oud, Saffron, Leather', in_stock: true },
            { id: 4, name: 'Mediterranean Breeze', price: 159, description: 'Fresh citrus, sea salt, and white musk', image_url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=600', category: 'scent', family: 'fresh', notes: 'Citrus, Sea Salt, White Musk', in_stock: true },
            { id: 5, name: 'Jasmine Garden', price: 175, description: 'Night-blooming jasmine, gardenia, and honeysuckle', image_url: 'https://images.unsplash.com/photo-1592914613633-0eec0ec94e3c?w=600', category: 'scent', family: 'floral', notes: 'Jasmine, Gardenia, Honeysuckle', in_stock: true },
            { id: 6, name: 'Tobacco Vanille', price: 275, description: 'Warm tobacco leaf, vanilla bean, and dried fruits', image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600', category: 'scent', family: 'oriental', notes: 'Tobacco, Vanilla, Dried Fruits', in_stock: true },
            { id: 7, name: 'Cedar & Cypress', price: 195, description: 'Atlas cedar, cypress, and vetiver', image_url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600', category: 'scent', family: 'woody', notes: 'Cedar, Cypress, Vetiver', in_stock: true },
            { id: 8, name: 'White Tea', price: 145, description: 'Delicate white tea, bergamot, and linen', image_url: 'https://images.unsplash.com/photo-1590736961867-0c34c1ba254c?w=600', category: 'scent', family: 'fresh', notes: 'White Tea, Bergamot, Linen', in_stock: true },
        ];
    }
    
    async insertSampleScents() {
        for (const scent of this.getSampleScents()) {
            await window.supabase.from('products').upsert(scent, { onConflict: 'name' });
        }
    }
    
    filterByFamily(family) {
        this.currentFamily = family;
        
        if (family === 'all') {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(p => p.family === family);
        }
        
        this.sortProducts();
        this.renderProducts();
        this.updateActiveFilter(family);
    }
    
    sortProducts() {
        switch (this.currentSort) {
            case 'price-asc':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                // featured - keep original order
                break;
        }
    }
    
    updateActiveFilter(family) {
        const btns = document.querySelectorAll('.filter-btn');
        btns.forEach(btn => {
            if (btn.dataset.family === family) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    renderProducts() {
        const grid = document.getElementById('scents-grid');
        if (!grid) return;
        
        if (this.filteredProducts.length === 0) {
            grid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-feather-alt"></i>
                    <h3>No fragrances found</h3>
                    <p>Try adjusting your filters</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredProducts.map(product => `
            <div class="product-card reveal">
                <div class="product-image">
                    <img src="${product.image_url}" alt="${product.name}" loading="lazy">
                    ${product.bestseller ? '<span class="product-badge">Best Seller</span>' : ''}
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
                    <div class="product-category">${product.family || 'Fine Fragrance'}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-notes">${product.notes || ''}</div>
                    <p class="product-price">₦${product.price.toFixed(2)}</p>
                </div>
            </div>
        `).join('');
        
        // Attach event listeners
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const product = this.products.find(p => p.id == btn.dataset.id);
                if (product) window.cart?.addItem(product);
            });
        });
        
        // Reveal animation
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('active');
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }
    
    setupEventListeners() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterByFamily(btn.dataset.family);
            });
        });
        
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

// Initialize
if (document.getElementById('scents-grid')) {
    document.addEventListener('DOMContentLoaded', () => {
        window.scentsManager = new ScentsManager();
    });
}
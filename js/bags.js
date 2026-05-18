// Bags Collection Manager
class BagsManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentType = 'all';
        this.currentSort = 'featured';
        this.init();
    }
    
    async init() {
        await this.loadProducts();
        this.setupEventListeners();
    }
    
    async loadProducts() {
        const grid = document.getElementById('bags-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <p>Curating artisanal bags...</p>
                </div>
            `;
        }
        
        const { data: products, error } = await window.supabase
            .from('products')
            .select('*')
            .eq('category', 'bag')
            .order('created_at', { ascending: false });
        
        if (error || products.length === 0) {
            this.products = this.getSampleBags();
            await this.insertSampleBags();
        } else {
            this.products = products;
        }
        
        this.filteredProducts = [...this.products];
        this.renderProducts();
    }
    
    getSampleBags() {
        return [
            { id: 101, name: 'The Heritage Tote', price: 890, description: 'Full-grain Italian leather tote with gold hardware', image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600', category: 'bag', type: 'tote', material: 'Italian Leather', in_stock: true },
            { id: 102, name: 'Sienna Crossbody', price: 450, description: 'Crafted from pebbled leather with adjustable strap', image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600', category: 'bag', type: 'crossbody', material: 'Pebbled Leather', in_stock: true },
            { id: 103, name: 'Evening Clutch', price: 320, description: 'Satin clutch with crystal embellishments', image_url: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600', category: 'bag', type: 'clutch', material: 'Satin', in_stock: true },
            { id: 104, name: 'Nomad Backpack', price: 650, description: 'Vintage-waxed canvas and leather backpack', image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600', category: 'bag', type: 'backpack', material: 'Waxed Canvas', in_stock: true },
            { id: 105, name: 'The Weekender', price: 1200, description: 'Oversized leather duffel with shoe compartment', image_url: 'https://images.unsplash.com/photo-1547941126-3d5322b218b0?w=600', category: 'bag', type: 'tote', material: 'Full-grain Leather', in_stock: true },
            { id: 106, name: 'Belt Bag', price: 280, description: 'Hands-free crossbody belt bag in nappa leather', image_url: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600', category: 'bag', type: 'crossbody', material: 'Nappa Leather', in_stock: true },
        ];
    }
    
    async insertSampleBags() {
        for (const bag of this.getSampleBags()) {
            await window.supabase.from('products').upsert(bag, { onConflict: 'name' });
        }
    }
    
    filterByType(type) {
        this.currentType = type;
        
        if (type === 'all') {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(p => p.type === type);
        }
        
        this.sortProducts();
        this.renderProducts();
        this.updateActiveFilter(type);
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
        }
    }
    
    updateActiveFilter(type) {
        const btns = document.querySelectorAll('.filter-btn');
        btns.forEach(btn => {
            if (btn.dataset.type === type) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    renderProducts() {
        const grid = document.getElementById('bags-grid');
        if (!grid) return;
        
        if (this.filteredProducts.length === 0) {
            grid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-shopping-bag"></i>
                    <h3>No bags found</h3>
                    <p>Try adjusting your filters</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredProducts.map(product => `
            <div class="product-card reveal">
                <div class="product-image">
                    <img src="${product.image_url}" alt="${product.name}" loading="lazy">
                    ${product.price > 800 ? '<span class="product-badge">Luxury Edition</span>' : ''}
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
                    <div class="product-category">${product.type || 'Artisanal Bag'}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-material">${product.material || ''}</div>
                    <p class="product-price">$${product.price.toFixed(2)}</p>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const product = this.products.find(p => p.id == btn.dataset.id);
                if (product) window.cart?.addItem(product);
            });
        });
    }
    
    setupEventListeners() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterByType(btn.dataset.type);
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

if (document.getElementById('bags-grid')) {
    document.addEventListener('DOMContentLoaded', () => {
        window.bagsManager = new BagsManager();
    });
}
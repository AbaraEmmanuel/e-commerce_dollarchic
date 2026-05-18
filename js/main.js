// Main JavaScript for Global Functionality

// Custom Cursor
class CustomCursor {
    constructor() {
        this.cursor = document.querySelector('.custom-cursor');
        this.cursorFollower = document.querySelector('.custom-cursor-follower');
        this.init();
    }
    
    init() {
        if (!this.cursor || !this.cursorFollower) return;
        
        document.addEventListener('mousemove', (e) => {
            this.cursor.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
            
            setTimeout(() => {
                this.cursorFollower.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;
            }, 50);
        });
        
        // Hover effect for clickable elements
        const hoverElements = document.querySelectorAll('a, button, .product-card, .category-card');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                this.cursor.style.transform = 'scale(1.5)';
                this.cursorFollower.style.transform = 'scale(1.5)';
                this.cursorFollower.style.borderColor = 'var(--primary-accent)';
            });
            
            el.addEventListener('mouseleave', () => {
                this.cursor.style.transform = 'scale(1)';
                this.cursorFollower.style.transform = 'scale(1)';
                this.cursorFollower.style.borderColor = 'var(--primary-accent)';
            });
        });
    }
}

// Navigation Scroll Effect
class Navigation {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        this.menuToggle = document.querySelector('.menu-toggle');
        this.navMenu = document.querySelector('.nav-menu');
        this.init();
    }
    
    init() {
        // Scroll effect
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                this.navbar.classList.add('scrolled');
            } else {
                this.navbar.classList.remove('scrolled');
            }
        });
        
        // Mobile menu toggle
        if (this.menuToggle && this.navMenu) {
            this.menuToggle.addEventListener('click', () => {
                this.navMenu.classList.toggle('open');
            });
        }
        
        // Close mobile menu on link click
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.navMenu?.classList.remove('open');
            });
        });
    }
}

// Cart Sidebar
class CartSidebar {
    constructor() {
        this.cartBtn = document.querySelector('.cart-btn');
        this.cartSidebar = document.querySelector('.cart-sidebar');
        this.cartOverlay = document.querySelector('.cart-overlay');
        this.closeCartBtn = document.querySelector('.close-cart');
        this.init();
    }
    
    init() {
        if (this.cartBtn) {
            this.cartBtn.addEventListener('click', () => this.open());
        }
        
        if (this.closeCartBtn) {
            this.closeCartBtn.addEventListener('click', () => this.close());
        }
        
        if (this.cartOverlay) {
            this.cartOverlay.addEventListener('click', () => this.close());
        }
        
        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.cartSidebar?.classList.contains('open')) {
                this.close();
            }
        });
    }
    
    open() {
        this.cartSidebar?.classList.add('open');
        this.cartOverlay?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    
    close() {
        this.cartSidebar?.classList.remove('open');
        this.cartOverlay?.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Loading Screen
class LoadingScreen {
    constructor() {
        this.loadingScreen = document.querySelector('.loading-screen');
        this.init();
    }
    
    init() {
        if (!this.loadingScreen) return;
        
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.loadingScreen.classList.add('hide');
                setTimeout(() => {
                    this.loadingScreen.style.display = 'none';
                }, 1000);
            }, 500);
        });
    }
}

// Scroll Reveal
class ScrollReveal {
    constructor() {
        this.init();
    }
    
    init() {
        const reveals = document.querySelectorAll('.reveal');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        
        reveals.forEach(reveal => observer.observe(reveal));
    }
}

// Parallax Effect
class Parallax {
    constructor() {
        this.heroBg = document.querySelector('.hero-bg');
        this.init();
    }
    
    init() {
        if (!this.heroBg) return;
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            this.heroBg.style.transform = `translateY(${scrolled * 0.5}px)`;
        });
    }
}

// Newsletter Form
class Newsletter {
    constructor() {
        this.form = document.getElementById('newsletter-form');
        this.init();
    }
    
    init() {
        if (!this.form) return;
        
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = this.form.querySelector('input[type="email"]').value;
            
            // Store in localStorage for demo
            const subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');
            if (!subscribers.includes(email)) {
                subscribers.push(email);
                localStorage.setItem('newsletter_subscribers', JSON.stringify(subscribers));
                
                // Show success message
                const button = this.form.querySelector('button');
                const originalText = button.innerHTML;
                button.innerHTML = 'Subscribed! <i class="fas fa-check"></i>';
                button.disabled = true;
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                    this.form.reset();
                }, 3000);
            } else {
                alert('Already subscribed!');
            }
        });
    }
}

// Search Functionality
class Search {
    constructor() {
        this.searchToggle = document.querySelector('.search-toggle');
        this.init();
    }
    
    init() {
        if (!this.searchToggle) return;
        
        this.searchToggle.addEventListener('click', () => {
            // Create search modal
            const modal = document.createElement('div');
            modal.className = 'search-modal';
            modal.innerHTML = `
                <div class="search-modal-content">
                    <input type="text" placeholder="Search for products..." id="search-input">
                    <button id="close-search"><i class="fas fa-times"></i></button>
                </div>
            `;
            document.body.appendChild(modal);
            
            const input = modal.querySelector('#search-input');
            input.focus();
            
            const closeBtn = modal.querySelector('#close-search');
            closeBtn.addEventListener('click', () => modal.remove());
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            // Add search CSS
            const style = document.createElement('style');
            style.textContent = `
                .search-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.95);
                    z-index: 10001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .search-modal-content {
                    width: 90%;
                    max-width: 600px;
                    position: relative;
                }
                
                .search-modal-content input {
                    width: 100%;
                    padding: 1.5rem;
                    font-size: 1.5rem;
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid var(--primary-accent);
                    color: white;
                    outline: none;
                    text-align: center;
                }
                
                .search-modal-content input::placeholder {
                    color: rgba(255,255,255,0.3);
                }
                
                #close-search {
                    position: absolute;
                    top: -50px;
                    right: 0;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                }
            `;
            document.head.appendChild(style);
        });
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    new CustomCursor();
    new Navigation();
    new CartSidebar();
    new LoadingScreen();
    new ScrollReveal();
    new Parallax();
    new Newsletter();
    new Search();
    
    // Initialize products if needed
    if (window.initProducts) {
        window.initProducts();
    }
});
// ============================================
// DOLLARCHIC'S STORE - SUPABASE CLIENT
// ============================================

// Replace with your actual Supabase credentials
// Get these from: Project Settings → API
const DOLLARCHIC_SUPABASE_URL = 'https://hjrpltgfegnylcfwhwxh.supabase.co';
const DOLLARCHIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcnBsdGdmZWdueWxjZndod3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNjMxNDksImV4cCI6MjA5NDYzOTE0OX0.VbJ5oMVUOecRUwWH-QI6ExMh3oxs6Cym-0N7GV10mcU';



// Check if supabase client already exists
if (typeof window.dollarchicSupabase === 'undefined') {
    // Initialize Supabase client
    const supabaseClient = supabase.createClient(DOLLARCHIC_SUPABASE_URL, DOLLARCHIC_SUPABASE_ANON_KEY);
    window.dollarchicSupabase = supabaseClient;
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

window.dollarchicAuth = {
    signUp: async function(email, password, firstName, lastName) {
        try {
            // Create auth user
            const { data: authData, error: authError } = await window.dollarchicSupabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                    }
                }
            });
            
            if (authError) throw authError;
            
            // Create profile record
            if (authData.user) {
                const { error: profileError } = await window.dollarchicSupabase
                    .from('profiles')
                    .insert([
                        {
                            id: authData.user.id,
                            first_name: firstName,
                            last_name: lastName,
                        }
                    ]);
                
                if (profileError) console.error('Profile creation error:', profileError);
            }
            
            return { success: true, data: authData };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    },

    signIn: async function(email, password) {
        try {
            const { data, error } = await window.dollarchicSupabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) throw error;
            
            return { success: true, data: data };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    },

    signOut: async function() {
        try {
            const { error } = await window.dollarchicSupabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    },

    getCurrentUser: async function() {
        try {
            const { data: { user }, error } = await window.dollarchicSupabase.auth.getUser();
            if (error) throw error;
            
            if (user) {
                // Get profile data
                const { data: profile, error: profileError } = await window.dollarchicSupabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                return { 
                    success: true, 
                    user: { ...user, profile: profile },
                    isAuthenticated: true 
                };
            }
            
            return { success: true, user: null, isAuthenticated: false };
        } catch (error) {
            console.error('Get user error:', error);
            return { success: false, error: error.message, isAuthenticated: false };
        }
    },

    onAuthStateChange: function(callback) {
        return window.dollarchicSupabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    }
};

// ============================================
// PRODUCT FUNCTIONS
// ============================================

window.dollarchicProducts = {
    getScents: async function() {
        try {
            const { data, error } = await window.dollarchicSupabase
                .from('products')
                .select('*')
                .eq('category', 'scent')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('Get scents error:', error);
            return { success: false, error: error.message, data: [] };
        }
    },

    getBags: async function() {
        try {
            const { data, error } = await window.dollarchicSupabase
                .from('products')
                .select('*')
                .eq('category', 'bag')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('Get bags error:', error);
            return { success: false, error: error.message, data: [] };
        }
    },

    getFeaturedProducts: async function(category, limit = 4) {
        try {
            const { data, error } = await window.dollarchicSupabase
                .from('products')
                .select('*')
                .eq('category', category)
                .limit(limit);
            
            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('Get featured error:', error);
            return { success: false, error: error.message, data: [] };
        }
    },

    getProductById: async function(productId) {
        try {
            const { data, error } = await window.dollarchicSupabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            
            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('Get product error:', error);
            return { success: false, error: error.message };
        }
    }
};

// ============================================
// ORDER FUNCTIONS
// ============================================

window.dollarchicOrders = {
    createOrder: async function(orderData) {
        try {
            const { data: order, error: orderError } = await window.dollarchicSupabase
                .from('orders')
                .insert([
                    {
                        user_id: orderData.userId,
                        customer_name: orderData.customerName,
                        customer_email: orderData.customerEmail,
                        total_amount: orderData.totalAmount,
                        shipping_address: orderData.shippingAddress,
                    }
                ])
                .select()
                .single();
            
            if (orderError) throw orderError;
            
            // Create order items
            const orderItems = orderData.items.map(item => ({
                order_id: order.id,
                product_id: item.id,
                quantity: item.quantity,
                price_at_time: item.price
            }));
            
            const { error: itemsError } = await window.dollarchicSupabase
                .from('order_items')
                .insert(orderItems);
            
            if (itemsError) throw itemsError;
            
            return { success: true, data: order };
        } catch (error) {
            console.error('Create order error:', error);
            return { success: false, error: error.message };
        }
    },

    getUserOrders: async function(userId) {
        try {
            const { data, error } = await window.dollarchicSupabase
                .from('orders')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { success: true, data: data };
        } catch (error) {
            console.error('Get orders error:', error);
            return { success: false, error: error.message, data: [] };
        }
    }
};

// Log that Supabase is ready
console.log('Dollarchic Supabase client initialized');
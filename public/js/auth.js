// Auth state management
const auth = {
  currentUser: null,

  // Check if user is logged in
  checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      this.currentUser = JSON.parse(user);
      return true;
    }
    
    return false;
  },

  // Update UI based on auth state
  updateAuthUI() {
    const navLinks = document.querySelector('.nav-links');
    const isLoggedIn = this.checkAuth();
    
    if (isLoggedIn) {
      navLinks.style.display = 'flex';
      document.querySelectorAll('[data-auth]').forEach(el => {
        el.style.display = 'block';
      });
      document.querySelectorAll('[data-guest]').forEach(el => {
        el.style.display = 'none';
      });
    } else {
      navLinks.style.display = 'none';
      document.querySelectorAll('[data-auth]').forEach(el => {
        el.style.display = 'none';
      });
      document.querySelectorAll('[data-guest]').forEach(el => {
        el.style.display = 'block';
      });
    }
  },

  // Login function
  async login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      this.currentUser = data.user;
      
      this.updateAuthUI();
      window.router.navigate('/cars');
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Register function
  async register(username, email, password) {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Logout function
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser = null;
    this.updateAuthUI();
    window.router.navigate('/login');
  }
};

// Expose auth to window object
window.auth = auth;

// Event listeners
document.getElementById('logoutBtn')?.addEventListener('click', () => auth.logout());

export default auth;
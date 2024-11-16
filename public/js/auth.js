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
    const isLoggedIn = this.checkAuth();
    
    document.querySelectorAll('[data-auth]').forEach(el => {
      el.style.display = isLoggedIn ? 'block' : 'none';
    });
    
    document.querySelectorAll('[data-guest]').forEach(el => {
      el.style.display = isLoggedIn ? 'none' : 'block';
    });
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
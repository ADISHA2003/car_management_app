class Router {
  constructor(routes) {
    this.routes = routes;
    this.currentPath = '';
    
    window.addEventListener('popstate', () => this.handleRoute());
    
    // Handle initial route
    this.handleRoute();
  }
  
  handleRoute() {
    const path = window.location.pathname;
    const route = this.routes[path] || this.routes['*'];
    
    this.currentPath = path;
    route();
  }
  
  navigate(path) {
    window.history.pushState({}, '', path);
    this.handleRoute();
  }
}

const routes = {
  '/': () => loadPage('home'),
  '/login': () => loadPage('login'),
  '/register': () => loadPage('register'),
  '/cars': () => loadPage('cars'),
  '/add-car': () => loadPage('add-car'),
  '/edit-car': () => loadPage('edit-car'),
  '*': () => loadPage('404')
};

async function loadPage(page) {
  const app = document.getElementById('app');
  
  try {
    const response = await fetch(`/pages/${page}.html`);
    const html = await response.text();
    app.innerHTML = html;
    
    // Initialize page-specific JavaScript
    if (window.initPage?.[page]) {
      window.initPage[page]();
    }
  } catch (error) {
    console.error('Error loading page:', error);
    app.innerHTML = '<h1>Error loading page</h1>';
  }
}

const router = new Router(routes);
window.router = router;

export default router;
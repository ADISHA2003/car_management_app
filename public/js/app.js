import auth from './auth.js';
import './router.js';

// Initialize the application
const initApp = () => {
  // Check authentication status
  auth.checkAuth();
  auth.updateAuthUI();
  
  // Add click event listeners for navigation
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-link]')) {
      e.preventDefault();
      window.router.navigate(e.target.getAttribute('href'));
    }
  });
};

// Initialize page-specific functionality
window.initPage = {
  async cars() {
    const token = localStorage.getItem('token');
    if (!token) {
      window.router.navigate('/login');
      return;
    }
    
    try {
      const response = await fetch('/api/cars', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const cars = await response.json();
      const carsGrid = document.querySelector('.car-grid');
      
      if (!cars.length) {
        carsGrid.innerHTML = `
          <div class="col-span-full text-center py-8">
            <p class="text-gray-500">No cars found. Add your first car!</p>
            <a href="/add-car" data-link class="btn btn-primary mt-4">Add Car</a>
          </div>
        `;
        return;
      }
      
      carsGrid.innerHTML = cars.map(car => `
        <div class="car-card">
          <img src="${car.images[0] || '/placeholder-car.jpg'}" alt="${car.title}" class="car-image">
          <div class="car-content">
            <h3 class="car-title">${car.title}</h3>
            <div class="car-tags">
              ${car.tags.map(tag => `<span class="car-tag">${tag}</span>`).join('')}
            </div>
            <p>${car.description.substring(0, 100)}...</p>
            <button onclick="window.router.navigate('/edit-car?id=${car.id}')" class="btn btn-primary">
              Edit
            </button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading cars:', error);
    }
  },
  
  async 'add-car'() {
    const form = document.querySelector('#addCarForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch('/api/cars', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Failed to create car');
        }
        
        window.router.navigate('/cars');
      } catch (error) {
        console.error('Error creating car:', error);
        alert('Error creating car: ' + error.message);
      }
    });
  }
};

// Start the application
document.addEventListener('DOMContentLoaded', initApp);
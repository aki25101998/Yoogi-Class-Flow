// Client-side hash router for SPA navigation

const routes = {};
let currentRoute = null;
let notFoundHandler = null;

/**
 * Register a route handler
 * @param {string} hash - e.g. '#/dashboard'
 * @param {Function} handler - async function that renders the page
 * @param {object} options - { role: 'admin'|'coach'|'any' }
 */
export function registerRoute(hash, handler, options = {}) {
  routes[hash] = { handler, ...options };
}

/**
 * Set a handler for 404 / not found routes
 * @param {Function} handler
 */
export function setNotFoundHandler(handler) {
  notFoundHandler = handler;
}

/**
 * Navigate to a route
 * @param {string} hash
 */
export function navigate(hash) {
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  } else {
    // Same hash — force re-render
    handleRouteChange();
  }
}

/**
 * Get current route hash
 * @returns {string}
 */
export function getCurrentRoute() {
  return window.location.hash || '#/login';
}

import { hasPermission, isAdmin } from './auth.js';

/**
 * Handle route change — called on hashchange
 */
async function handleRouteChange() {
  const hash = getCurrentRoute();
  const route = routes[hash];
  
  if (!route) {
    if (notFoundHandler) notFoundHandler();
    return;
  }
  
  currentRoute = hash;

  // Check role and permissions
  if (route.role === 'admin' && !isAdmin()) {
    console.error('Unauthorized access to admin route');
    return;
  }
  if (route.permission && !hasPermission(route.permission)) {
    console.error(`Unauthorized: Missing permission ${route.permission}`);
    return;
  }
  
  // Get main content container
  const mainEl = document.getElementById('mainContent');
  if (!mainEl) return;
  
  // Add page transition
  mainEl.innerHTML = '';
  const pageDiv = document.createElement('div');
  pageDiv.className = 'page-container page-enter';
  mainEl.appendChild(pageDiv);
  
  try {
    await route.handler(pageDiv);
  } catch (err) {
    console.error('Route handler error:', err);
    pageDiv.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round empty-state-icon">error_outline</span>
        <h3 class="empty-state-title">Có lỗi xảy ra</h3>
        <p class="empty-state-text">${err.message}</p>
      </div>
    `;
  }
  
  // Update active nav item
  updateActiveNav(hash);
}

/**
 * Update active state of navigation items
 * @param {string} hash
 */
function updateActiveNav(hash) {
  document.querySelectorAll('.nav-item').forEach(item => {
    const itemHash = item.getAttribute('data-route');
    if (itemHash === hash) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * Initialize router — listen for hash changes
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  // Handle initial route
  if (window.location.hash) {
    handleRouteChange();
  }
}

/**
 * Get the role required for a route
 * @param {string} hash
 * @returns {string|undefined}
 */
export function getRouteRole(hash) {
  return routes[hash]?.role;
}

/**
 * Check if a route exists
 * @param {string} hash
 * @returns {boolean}
 */
export function routeExists(hash) {
  return hash in routes;
}

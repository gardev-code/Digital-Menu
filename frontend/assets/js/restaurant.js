/**
 * restaurant.js — Restaurant Portal Functionality
 *
 * Depends on: auth.js (must be loaded first).
 */

const Restaurant = (() => {
  'use strict';

  const API_BASE = '/api';

  // ─────────────────────────────────────────
  // API Helper
  // ─────────────────────────────────────────

  const api = {
    get: (path) => Auth.apiFetch(`${API_BASE}${path}`),
    put: (path, body) =>
      Auth.apiFetch(`${API_BASE}${path}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  };

  // ─────────────────────────────────────────
  // Alert
  // ─────────────────────────────────────────

  const showAlert = (container, message, type = 'error') => {
    if (!container) return;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    container.innerHTML = `
      <div class="alert alert-${type}">
        <span class="alert-icon">${icons[type] || '!'}</span>
        <span>${message}</span>
      </div>`;
  };

  const clearAlert = (container) => {
    if (container) container.innerHTML = '';
  };

  // ─────────────────────────────────────────
  // Button Loading
  // ─────────────────────────────────────────

  const setButtonLoading = (btn, loading) => {
    if (!btn) return;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.classList.add('btn-loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
      if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    }
  };

  // ─────────────────────────────────────────
  // Restaurant Cache
  // ─────────────────────────────────────────

  const cacheRestaurant = (restaurant) => {
    try {
      localStorage.setItem('dm_restaurant', JSON.stringify(restaurant));
    } catch { /* ignore */ }
  };

  const getMyRestaurant = () => {
    try {
      const cached = localStorage.getItem('dm_restaurant');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  // ─────────────────────────────────────────
  // Fetch restaurant from API and cache it
  // ─────────────────────────────────────────

  const fetchAndCacheRestaurant = async () => {
    try {
      const response = await Auth.apiFetch('/api/restaurants/me');
      const data = await response.json();
      if (data.success && data.data) {
        cacheRestaurant(data.data);
        return data.data;
      }
    } catch (err) {
      console.error('[Restaurant] Failed to fetch restaurant data:', err);
    }
    return null;
  };

  // ─────────────────────────────────────────
  // Sidebar & Common UI
  // ─────────────────────────────────────────

  const initSidebar = () => {
    const toggle  = document.querySelector('.r-menu-toggle');
    const sidebar = document.querySelector('.r-sidebar');
    const overlay = document.querySelector('.r-sidebar-overlay');
    if (!toggle || !sidebar) return;

    const open  = () => { sidebar.classList.add('open'); overlay?.classList.add('open'); };
    const close = () => { sidebar.classList.remove('open'); overlay?.classList.remove('open'); };

    toggle.addEventListener('click', open);
    overlay?.addEventListener('click', close);
  };

  const highlightActiveNav = () => {
    const current = window.location.pathname.split('/').pop();
    document.querySelectorAll('.r-sidebar-nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(current)) link.classList.add('active');
    });
  };

  // ─────────────────────────────────────────
  // Logout — redirects to restaurant login
  // ─────────────────────────────────────────

  const initLogout = () => {
    document.querySelectorAll('[data-r-logout]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.removeToken();
        Auth.removeUser();
        localStorage.removeItem('dm_restaurant');
        window.location.href = '/frontend/restaurant/login.html';
      });
    });
  };

  // ─────────────────────────────────────────
  // Populate sidebar user info
  // ─────────────────────────────────────────

  const initUserDisplay = (restaurant) => {
    const user = Auth.getUser();

    document.querySelectorAll('[data-r-user-name]').forEach(el => {
      el.textContent = restaurant?.owner_name || user?.name || 'Owner';
    });
    document.querySelectorAll('[data-r-user-role]').forEach(el => {
      el.textContent = 'Restaurant Owner';
    });
    document.querySelectorAll('[data-r-user-initial]').forEach(el => {
      const name = restaurant?.owner_name || user?.name || 'R';
      el.textContent = name.charAt(0).toUpperCase();
    });
    document.querySelectorAll('[data-r-restaurant-name]').forEach(el => {
      el.textContent = restaurant?.name || '—';
    });
  };

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const escapeHTML = (str) => {
    if (!str) return '—';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const statusBadge = (status) => {
    const map = {
      active:   ['badge-success', 'Active'],
      inactive: ['badge-warning', 'Inactive'],
    };
    const [cls, label] = map[status] || ['badge-muted', status || '—'];
    return `<span class="badge ${cls}">${label}</span>`;
  };

  // ─────────────────────────────────────────
  // LOGIN PAGE
  // ─────────────────────────────────────────

  const initLoginPage = () => {
    // Already logged in as restaurant user → go to dashboard
    if (Auth.isAuthenticated()) {
      const user = Auth.getUser();
      if (user?.role === 'restaurant') {
        window.location.href = 'dashboard.html';
        return;
      }
      if (user?.role === 'super_admin') {
        window.location.href = '../admin/dashboard.html';
        return;
      }
    }

    const form      = document.getElementById('r-login-form');
    const alertBox  = document.getElementById('r-login-alert');
    const submitBtn = document.getElementById('r-login-btn');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert(alertBox);

      const email    = form.querySelector('[name="email"]').value.trim();
      const password = form.querySelector('[name="password"]').value;

      if (!email || !password) {
        showAlert(alertBox, 'Please enter your email and password.', 'error');
        return;
      }

      if (!isValidEmail(email)) {
        showAlert(alertBox, 'Please enter a valid email address.', 'error');
        return;
      }

      setButtonLoading(submitBtn, true);

      // Step 1: Login
      const result = await Auth.login(email, password);

      if (!result.success) {
        showAlert(alertBox, result.message, 'error');
        setButtonLoading(submitBtn, false);
        return;
      }

      // Step 2: Check role
      const user = Auth.getUser();

      if (user?.role === 'super_admin') {
        Auth.removeToken();
        Auth.removeUser();
        showAlert(alertBox, 'This portal is for restaurant owners only. Please use the Admin login.', 'warning');
        setButtonLoading(submitBtn, false);
        return;
      }

      if (user?.role !== 'restaurant') {
        Auth.removeToken();
        Auth.removeUser();
        showAlert(alertBox, 'Access denied.', 'error');
        setButtonLoading(submitBtn, false);
        return;
      }

      // Step 3: Fetch and cache restaurant data BEFORE redirecting
      const restaurant = await fetchAndCacheRestaurant();

      if (!restaurant) {
        // Token is valid but restaurant lookup failed
        showAlert(alertBox, 'Login succeeded but your restaurant data could not be loaded. Please try again.', 'error');
        Auth.removeToken();
        Auth.removeUser();
        setButtonLoading(submitBtn, false);
        return;
      }

      // Step 4: All good — go to dashboard
      window.location.href = 'dashboard.html';
    });
  };

  // ─────────────────────────────────────────
  // DASHBOARD PAGE
  // ─────────────────────────────────────────

  const initDashboard = async () => {
    Auth.requireAuth();

    const user = Auth.getUser();
    if (user?.role !== 'restaurant') {
      window.location.href = '../admin/dashboard.html';
      return;
    }

    initSidebar();
    highlightActiveNav();
    initLogout();

    // Try cache first, then API
    let restaurant = getMyRestaurant();
    if (!restaurant) {
      restaurant = await fetchAndCacheRestaurant();
    }

    initUserDisplay(restaurant);

    const setCard = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = value ? escapeHTML(String(value)) : '<span class="text-muted">—</span>';
    };

    if (restaurant) {
      setCard('r-card-name',  restaurant.name);
      setCard('r-card-owner', restaurant.owner_name);
      setCard('r-card-email', restaurant.email);
      setCard('r-card-phone', restaurant.phone || '—');

      const statusEl = document.getElementById('r-card-status');
      if (statusEl) statusEl.innerHTML = statusBadge(restaurant.status);

      const welcomeName = document.getElementById('r-welcome-name');
      if (welcomeName) welcomeName.textContent = restaurant.name;
    }
  };

  // ─────────────────────────────────────────
  // PROFILE PAGE
  // ─────────────────────────────────────────

  const initProfilePage = async () => {
    Auth.requireAuth();

    const user = Auth.getUser();
    if (user?.role !== 'restaurant') {
      window.location.href = '../admin/dashboard.html';
      return;
    }

    initSidebar();
    highlightActiveNav();
    initLogout();

    const alertBox = document.getElementById('r-profile-alert');

    // Try cache first, then API
    let restaurant = getMyRestaurant();
    if (!restaurant) {
      restaurant = await fetchAndCacheRestaurant();
    }

    if (!restaurant) {
      if (alertBox) {
        showAlert(alertBox,
          'Your restaurant profile could not be loaded. Please log out and log in again.',
          'warning'
        );
      }
      return;
    }

    initUserDisplay(restaurant);

    const setField = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || '—';
    };

    setField('r-profile-restaurant-name', restaurant.name);
    setField('r-profile-owner-name',      restaurant.owner_name);
    setField('r-profile-email',           restaurant.email);
    setField('r-profile-phone',           restaurant.phone || '—');

    const avatarEl = document.getElementById('r-profile-avatar');
    if (avatarEl) avatarEl.textContent = (restaurant.owner_name || 'R').charAt(0).toUpperCase();

    const nameEl  = document.getElementById('r-profile-header-name');
    const emailEl = document.getElementById('r-profile-header-email');
    if (nameEl)  nameEl.textContent  = restaurant.name;
    if (emailEl) emailEl.textContent = restaurant.email;

    const statusEl = document.getElementById('r-profile-status');
    if (statusEl) statusEl.innerHTML = statusBadge(restaurant.status);
  };

  // ─────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────

  return {
    initLoginPage,
    initDashboard,
    initProfilePage,
    showAlert,
  };

})();
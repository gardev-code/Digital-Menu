/**
 * admin.js — Admin Dashboard Functionality
 *
 * Covers: dashboard stats, restaurant CRUD,
 * suspend/activate, table rendering, search,
 * alerts, toasts, loading states, and dialogs.
 *
 * Depends on: auth.js (must be loaded first)
 */

const Admin = (() => {
  'use strict';

  const API_BASE = '/api';

  // ─────────────────────────────────────────
  // API Helpers
  // ─────────────────────────────────────────

  const api = {
    get: (path) =>
      Auth.apiFetch(`${API_BASE}${path}`),

    post: (path, body) =>
      Auth.apiFetch(`${API_BASE}${path}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    put: (path, body) =>
      Auth.apiFetch(`${API_BASE}${path}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    delete: (path) =>
      Auth.apiFetch(`${API_BASE}${path}`, {
        method: 'DELETE',
      }),
  };

  // ─────────────────────────────────────────
  // Toast Notifications
  // ─────────────────────────────────────────

  let toastContainer = null;

  const getToastContainer = () => {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  };

  /**
   * Show a temporary toast notification.
   * @param {string} message
   * @param {'success'|'error'} type
   * @param {number} duration - ms before auto-dismiss
   */
  const showToast = (message, type = 'success', duration = 3500) => {
    const container = getToastContainer();
    const icon = type === 'success' ? '✓' : '✕';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  };

  // ─────────────────────────────────────────
  // Inline Alert (for forms / pages)
  // ─────────────────────────────────────────

  /**
   * Render an alert into a container element.
   * @param {HTMLElement} container
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   */
  const showAlert = (container, message, type = 'error') => {
    if (!container) return;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    container.innerHTML = `
      <div class="alert alert-${type}">
        <span class="alert-icon">${icons[type] || '!'}</span>
        <span>${message}</span>
      </div>`;
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const clearAlert = (container) => {
    if (container) container.innerHTML = '';
  };

  // ─────────────────────────────────────────
  // Loading States
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

  const showTableLoading = (tbody, colSpan = 7) => {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colSpan}">
          <div class="loading-overlay">
            <div class="spinner"></div>
            <span class="loading-text">Loading restaurants…</span>
          </div>
        </td>
      </tr>`;
  };

  const showTableEmpty = (tbody, colSpan = 7, message = 'No restaurants found') => {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colSpan}">
          <div class="empty-state">
            <div class="empty-state-icon">🍽️</div>
            <div class="empty-state-title">${message}</div>
            <div class="empty-state-desc">Add your first restaurant to get started.</div>
          </div>
        </td>
      </tr>`;
  };

  const showTableError = (tbody, colSpan = 7) => {
    tbody.innerHTML = `
      <tr>
        <td colspan="${colSpan}">
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-title">Failed to load restaurants</div>
            <div class="empty-state-desc">Check your connection and try refreshing the page.</div>
          </div>
        </td>
      </tr>`;
  };

  // ─────────────────────────────────────────
  // Confirm Dialog
  // ─────────────────────────────────────────

  /**
   * Show a confirmation dialog.
   * Resolves true if confirmed, false if cancelled.
   * @param {Object} opts - { title, desc, confirmText, type }
   * @returns {Promise<boolean>}
   */
  const confirm = (opts = {}) => {
    return new Promise((resolve) => {
      const {
        title = 'Are you sure?',
        desc  = 'This action cannot be undone.',
        confirmText = 'Confirm',
        type  = 'danger',
      } = opts;

      const icons = { danger: '🗑️', warning: '⏸️' };

      const backdrop = document.createElement('div');
      backdrop.className = 'dialog-backdrop open';
      backdrop.innerHTML = `
        <div class="dialog" role="dialog" aria-modal="true">
          <div class="dialog-icon ${type}">${icons[type] || '!'}</div>
          <div class="dialog-title">${title}</div>
          <div class="dialog-desc">${desc}</div>
          <div class="dialog-actions">
            <button class="btn btn-secondary" data-action="cancel">Cancel</button>
            <button class="btn btn-${type}" data-action="confirm">${confirmText}</button>
          </div>
        </div>`;

      document.body.appendChild(backdrop);

      const cleanup = (result) => {
        backdrop.remove();
        resolve(result);
      };

      backdrop.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action === 'confirm') cleanup(true);
        else if (action === 'cancel' || e.target === backdrop) cleanup(false);
      });
    });
  };

  // ─────────────────────────────────────────
  // Sidebar & UI Utilities
  // ─────────────────────────────────────────

  const initSidebar = () => {
    const toggle   = document.querySelector('.menu-toggle');
    const sidebar  = document.querySelector('.sidebar');
    const overlay  = document.querySelector('.sidebar-overlay');

    if (!toggle || !sidebar) return;

    const open  = () => { sidebar.classList.add('open'); overlay?.classList.add('open'); };
    const close = () => { sidebar.classList.remove('open'); overlay?.classList.remove('open'); };

    toggle.addEventListener('click', open);
    overlay?.addEventListener('click', close);
  };

  const initUserDisplay = () => {
    const user = Auth.getUser();
    if (!user) return;

    const nameEls = document.querySelectorAll('[data-user-name]');
    const roleEls = document.querySelectorAll('[data-user-role]');
    const initEls = document.querySelectorAll('[data-user-initial]');

    nameEls.forEach(el => el.textContent = user.name || 'Admin');
    roleEls.forEach(el => el.textContent = user.role === 'super_admin' ? 'Super Admin' : user.role);
    initEls.forEach(el => el.textContent = (user.name || 'A').charAt(0).toUpperCase());
  };

  const highlightActiveNav = () => {
    const current = window.location.pathname.split('/').pop();
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(current)) {
        link.classList.add('active');
      }
    });
  };

  const initLogout = () => {
    document.querySelectorAll('[data-logout]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    });
  };

  // ─────────────────────────────────────────
  // Format Helpers
  // ─────────────────────────────────────────

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const statusBadge = (status) => {
    const map = {
      active:   ['badge-success', 'Active'],
      inactive: ['badge-warning', 'Inactive'],
    };
    const [cls, label] = map[status] || ['badge-muted', status];
    return `<span class="badge ${cls}">${label}</span>`;
  };

  // ─────────────────────────────────────────
  // Dashboard Initialization
  // ─────────────────────────────────────────

  const initDashboard = async () => {
    Auth.requireAuth();
    initSidebar();
    initUserDisplay();
    highlightActiveNav();
    initLogout();
    await loadDashboardStats();
  };

  const loadDashboardStats = async () => {
    const totalEl    = document.getElementById('stat-total');
    const activeEl   = document.getElementById('stat-active');
    const inactiveEl = document.getElementById('stat-inactive');

    // Show shimmer loading state
    [totalEl, activeEl, inactiveEl].forEach(el => {
      if (el) el.innerHTML = '<div class="stat-value-loading"></div>';
    });

    try {
      const response = await api.get('/restaurants');
      const data = await response.json();

      if (!data.success) throw new Error(data.message);

      const restaurants = data.data || [];
      const active   = restaurants.filter(r => r.status === 'active').length;
      const inactive = restaurants.filter(r => r.status === 'inactive').length;

      if (totalEl)    totalEl.textContent    = restaurants.length;
      if (activeEl)   activeEl.textContent   = active;
      if (inactiveEl) inactiveEl.textContent = inactive;

    } catch (err) {
      console.error('[Dashboard] Stats error:', err);
      [totalEl, activeEl, inactiveEl].forEach(el => {
        if (el) el.textContent = '—';
      });
    }
  };

  // ─────────────────────────────────────────
  // Restaurants Page
  // ─────────────────────────────────────────

  let allRestaurants = [];

  const initRestaurantsPage = async () => {
    Auth.requireAuth();
    initSidebar();
    initUserDisplay();
    highlightActiveNav();
    initLogout();
    await loadRestaurants();
    initSearch();
  };

  const loadRestaurants = async () => {
    const tbody     = document.getElementById('restaurants-tbody');
    const countEl   = document.getElementById('restaurants-count');
    if (!tbody) return;

    showTableLoading(tbody);

    try {
      const response = await api.get('/restaurants');
      const data = await response.json();

      if (!data.success) throw new Error(data.message);

      allRestaurants = data.data || [];
      renderRestaurantsTable(allRestaurants);
      if (countEl) countEl.textContent = `${allRestaurants.length} restaurant${allRestaurants.length !== 1 ? 's' : ''}`;

    } catch (err) {
      console.error('[Restaurants] Load error:', err);
      showTableError(tbody);
    }
  };

  const renderRestaurantsTable = (restaurants) => {
    const tbody = document.getElementById('restaurants-tbody');
    if (!tbody) return;

    if (restaurants.length === 0) {
      showTableEmpty(tbody);
      return;
    }

    tbody.innerHTML = restaurants.map(r => `
      <tr>
        <td>
          <div class="restaurant-cell">
            <span class="restaurant-name">${escapeHTML(r.name)}</span>
            <span class="restaurant-id">#${r.id}</span>
          </div>
        </td>
        <td class="td-primary">${escapeHTML(r.owner_name)}</td>
        <td>${escapeHTML(r.email)}</td>
        <td>${escapeHTML(r.phone || '—')}</td>
        <td>${statusBadge(r.status)}</td>
        <td class="text-muted">${formatDate(r.created_at)}</td>
        <td>
          <div class="table-actions">
            <a href="edit-restaurant.html?id=${r.id}" class="btn btn-secondary btn-sm">Edit</a>
            ${r.status === 'active'
              ? `<button class="btn btn-warning btn-sm" onclick="Admin.suspendRestaurant(${r.id})">Suspend</button>`
              : `<button class="btn btn-success btn-sm" onclick="Admin.activateRestaurant(${r.id})">Activate</button>`
            }
            <button class="btn btn-danger btn-sm" onclick="Admin.deleteRestaurant(${r.id}, '${escapeHTML(r.name)}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const initSearch = () => {
    const input = document.getElementById('restaurant-search');
    if (!input) return;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        renderRestaurantsTable(allRestaurants);
        return;
      }
      const filtered = allRestaurants.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.owner_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
      renderRestaurantsTable(filtered);
    });
  };

  const suspendRestaurant = async (id) => {
    const ok = await confirm({
      title: 'Suspend restaurant?',
      desc:  'The restaurant will be hidden from public pages. Their login will still work.',
      confirmText: 'Suspend',
      type: 'warning',
    });
    if (!ok) return;

    try {
      const response = await api.put(`/restaurants/${id}`, { status: 'inactive' });
      const data = await response.json();

      if (data.success) {
        showToast('Restaurant suspended.', 'success');
        await loadRestaurants();
      } else {
        showToast(data.message || 'Failed to suspend.', 'error');
      }
    } catch {
      showToast('Something went wrong.', 'error');
    }
  };

  const activateRestaurant = async (id) => {
    const ok = await confirm({
      title: 'Reactivate restaurant?',
      desc:  'The restaurant will be visible on public pages again.',
      confirmText: 'Activate',
      type: 'warning',
    });
    if (!ok) return;

    try {
      const response = await api.put(`/restaurants/${id}`, { status: 'active' });
      const data = await response.json();

      if (data.success) {
        showToast('Restaurant reactivated.', 'success');
        await loadRestaurants();
      } else {
        showToast(data.message || 'Failed to reactivate.', 'error');
      }
    } catch {
      showToast('Something went wrong.', 'error');
    }
  };

  const deleteRestaurant = async (id, name) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      desc:  'This will permanently delete the restaurant, its menu, and the linked user account. This cannot be undone.',
      confirmText: 'Delete permanently',
      type: 'danger',
    });
    if (!ok) return;

    try {
      const response = await api.delete(`/restaurants/${id}`);
      const data = await response.json();

      if (data.success) {
        showToast('Restaurant deleted.', 'success');
        await loadRestaurants();
      } else {
        showToast(data.message || 'Failed to delete.', 'error');
      }
    } catch {
      showToast('Something went wrong.', 'error');
    }
  };

  // ─────────────────────────────────────────
  // Create Restaurant Page
  // ─────────────────────────────────────────

  const initCreatePage = () => {
    Auth.requireAuth();
    initSidebar();
    initUserDisplay();
    highlightActiveNav();
    initLogout();

    const form     = document.getElementById('create-restaurant-form');
    const alertBox = document.getElementById('form-alert');
    const submitBtn = document.getElementById('submit-btn');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert(alertBox);

      const fields = {
        name:       form.querySelector('[name="name"]').value.trim(),
        owner_name: form.querySelector('[name="owner_name"]').value.trim(),
        email:      form.querySelector('[name="email"]').value.trim(),
        phone:      form.querySelector('[name="phone"]').value.trim(),
        password:   form.querySelector('[name="password"]').value,
      };

      const validationError = validateRestaurantForm(fields, true);
      if (validationError) {
        showAlert(alertBox, validationError, 'error');
        return;
      }

      setButtonLoading(submitBtn, true);

      try {
        const response = await api.post('/restaurants', fields);
        const data = await response.json();

        if (data.success) {
          showToast('Restaurant created successfully!', 'success');
          setTimeout(() => {
            window.location.href = 'restaurants.html';
          }, 800);
        } else {
          showAlert(alertBox, data.message || 'Failed to create restaurant.', 'error');
          setButtonLoading(submitBtn, false);
        }
      } catch {
        showAlert(alertBox, 'Unable to connect. Please try again.', 'error');
        setButtonLoading(submitBtn, false);
      }
    });
  };

  // ─────────────────────────────────────────
  // Edit Restaurant Page
  // ─────────────────────────────────────────

  const initEditPage = async () => {
    Auth.requireAuth();
    initSidebar();
    initUserDisplay();
    highlightActiveNav();
    initLogout();

    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      window.location.href = 'restaurants.html';
      return;
    }

    const alertBox  = document.getElementById('form-alert');
    const submitBtn = document.getElementById('submit-btn');
    const form      = document.getElementById('edit-restaurant-form');

    // Load existing data
    try {
      const response = await api.get(`/restaurants/${id}`);
      const data = await response.json();

      if (!data.success) {
        showAlert(alertBox, 'Restaurant not found.', 'error');
        return;
      }

      const r = data.data;
      populateEditForm(form, r);

      // Update breadcrumb name
      const breadcrumbName = document.getElementById('breadcrumb-name');
      if (breadcrumbName) breadcrumbName.textContent = r.name;

    } catch {
      showAlert(alertBox, 'Failed to load restaurant data.', 'error');
      return;
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert(alertBox);

      const fields = {
        name:       form.querySelector('[name="name"]').value.trim(),
        owner_name: form.querySelector('[name="owner_name"]').value.trim(),
        email:      form.querySelector('[name="email"]').value.trim(),
        phone:      form.querySelector('[name="phone"]').value.trim(),
        status:     form.querySelector('[name="status"]').value,
      };

      const validationError = validateRestaurantForm(fields, false);
      if (validationError) {
        showAlert(alertBox, validationError, 'error');
        return;
      }

      setButtonLoading(submitBtn, true);

      try {
        const response = await api.put(`/restaurants/${id}`, fields);
        const data = await response.json();

        if (data.success) {
          showToast('Restaurant updated!', 'success');
          setTimeout(() => {
            window.location.href = 'restaurants.html';
          }, 800);
        } else {
          showAlert(alertBox, data.message || 'Failed to update.', 'error');
          setButtonLoading(submitBtn, false);
        }
      } catch {
        showAlert(alertBox, 'Unable to connect. Please try again.', 'error');
        setButtonLoading(submitBtn, false);
      }
    });
  };

  const populateEditForm = (form, restaurant) => {
    if (!form || !restaurant) return;
    const set = (name, value) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el) el.value = value || '';
    };
    set('name',       restaurant.name);
    set('owner_name', restaurant.owner_name);
    set('email',      restaurant.email);
    set('phone',      restaurant.phone);
    set('status',     restaurant.status);
  };

  // ─────────────────────────────────────────
  // Form Validation
  // ─────────────────────────────────────────

  /**
   * Validate restaurant form fields.
   * @param {Object}  fields
   * @param {boolean} requirePassword - true on create, false on edit
   * @returns {string|null} Error message or null if valid
   */
  const validateRestaurantForm = (fields, requirePassword = true) => {
    const required = ['name', 'owner_name', 'email', 'phone'];
    if (requirePassword) required.push('password');

    for (const key of required) {
      if (!fields[key] || !String(fields[key]).trim()) {
        const labels = {
          name: 'Restaurant Name', owner_name: 'Owner Name',
          email: 'Email', phone: 'Phone', password: 'Password',
        };
        return `${labels[key] || key} is required.`;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fields.email)) {
      return 'Please enter a valid email address.';
    }

    const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
    if (!phoneRegex.test(fields.phone)) {
      return 'Please enter a valid phone number.';
    }

    if (requirePassword && fields.password && fields.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }

    return null;
  };

  // ─────────────────────────────────────────
  // Login Page
  // ─────────────────────────────────────────

  const initLoginPage = () => {
    Auth.requireGuest();

    const form      = document.getElementById('login-form');
    const alertBox  = document.getElementById('login-alert');
    const submitBtn = document.getElementById('login-btn');

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

      setButtonLoading(submitBtn, true);

      const result = await Auth.login(email, password);

      if (result.success) {
        window.location.href = 'dashboard.html';
      } else {
        showAlert(alertBox, result.message, 'error');
        setButtonLoading(submitBtn, false);
      }
    });
  };

  // ─────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────

  return {
    initLoginPage,
    initDashboard,
    initRestaurantsPage,
    initCreatePage,
    initEditPage,
    suspendRestaurant,
    activateRestaurant,
    deleteRestaurant,
    showToast,
    showAlert,
  };

})();
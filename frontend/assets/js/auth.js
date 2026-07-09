/**
 * auth.js — Authentication Utilities
 *
 * Handles JWT storage, retrieval, validation,
 * and Authorization header attachment.
 * Import this module in every admin page.
 */

const Auth = (() => {
  'use strict';

  const TOKEN_KEY = 'dm_token';
  const USER_KEY  = 'dm_user';

  // ─── Storage ──────────────────────────────

  /** Save JWT token to localStorage */
  const saveToken = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
  };

  /** Retrieve stored JWT token */
  const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
  };

  /** Remove JWT token from storage */
  const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
  };

  /** Save user data object */
  const saveUser = (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  };

  /** Retrieve stored user data */
  const getUser = () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  /** Remove user data from storage */
  const removeUser = () => {
    localStorage.removeItem(USER_KEY);
  };

  // ─── Auth State ───────────────────────────

  /**
   * Check if a user is currently authenticated.
   * Performs a basic structural check on the token
   * (three dot-separated segments = valid JWT shape).
   */
  const isAuthenticated = () => {
    const token = getToken();
    if (!token) return false;

    // Verify token has the correct JWT structure
    const parts = token.split('.');
    if (parts.length !== 3) {
      removeToken();
      removeUser();
      return false;
    }

    // Check expiry from the payload without a library
    try {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        // Token has expired — clear it
        removeToken();
        removeUser();
        return false;
      }
    } catch {
      // Malformed payload
      removeToken();
      removeUser();
      return false;
    }

    return true;
  };

  // ─── Navigation Guards ────────────────────

  /**
   * Redirect to login if not authenticated.
   * Call at the top of every protected page.
   */
  const requireAuth = () => {
    if (!isAuthenticated()) {
      redirectToLogin();
    }
  };

  /**
   * Redirect to dashboard if already authenticated.
   * Call on the login page to prevent logged-in users
   * from seeing the login form again.
   */
  const requireGuest = () => {
    if (isAuthenticated()) {
      window.location.href = '/frontend/admin/dashboard.html';
    }
  };

  const redirectToLogin = () => {
    window.location.href = '/frontend/admin/login.html';
  };

  // ─── API Helper ───────────────────────────

  /**
   * Make an authenticated fetch request.
   * Automatically attaches the Authorization header.
   * Handles 401 responses by logging out.
   *
   * @param {string} url    - API endpoint (e.g. '/api/restaurants')
   * @param {Object} options - fetch options (method, body, etc.)
   * @returns {Promise<Response>}
   */
  const apiFetch = async (url, options = {}) => {
    const token = getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Auto-logout on 401 (expired or invalid token)
    if (response.status === 401) {
      logout();
      return response;
    }

    return response;
  };

  // ─── Login / Logout ───────────────────────

  /**
   * Authenticate the user against the backend.
   * Stores token and user data on success.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        saveToken(data.token);
        saveUser(data.user);
        return { success: true };
      }

      return {
        success: false,
        message: data.message || 'Login failed. Please check your credentials.',
      };

    } catch (err) {
      console.error('[Auth] Login error:', err);
      return {
        success: false,
        message: 'Unable to connect to the server. Please try again.',
      };
    }
  };

  /**
   * Log the current user out.
   * Clears all stored credentials and redirects to login.
   */
  const logout = () => {
    removeToken();
    removeUser();
    redirectToLogin();
  };

  // ─── Public API ───────────────────────────

  return {
    login,
    logout,
    saveToken,
    getToken,
    removeToken,
    saveUser,
    getUser,
    removeUser,
    isAuthenticated,
    requireAuth,
    requireGuest,
    apiFetch,
  };

})();
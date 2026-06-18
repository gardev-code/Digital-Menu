'use strict';

// ─────────────────────────────────────────────
// roleMiddleware
//
// A middleware factory that enforces role-based
// access control (RBAC) on any protected route.
//
// Must run AFTER authMiddleware, which populates
// req.user. Throws a 403 if the authenticated
// user's role is not in the allowed list.
//
// Usage — single role:
//   router.get('/admin', authMiddleware, roleMiddleware('super_admin'), handler);
//
// Usage — multiple allowed roles:
//   router.get('/shared', authMiddleware, roleMiddleware('super_admin', 'restaurant'), handler);
// ─────────────────────────────────────────────

/**
 * Factory that returns an Express middleware enforcing role-based access.
 *
 * @param {...string} allowedRoles - One or more role strings that may access the route
 * @returns {import('express').RequestHandler}
 */
const roleMiddleware = (...allowedRoles) => {
  // Validate configuration at definition time so misconfigured
  // routes surface during startup rather than at request time.
  if (!allowedRoles || allowedRoles.length === 0) {
    throw new Error(
      '[roleMiddleware] At least one role must be specified. ' +
      'Example: roleMiddleware("super_admin")'
    );
  }

  return (req, res, next) => {
    // authMiddleware must have run first to populate req.user
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.',
      });
    }

    const { role } = req.user;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access this resource.',
      });
    }

    // Role matches — proceed to the next handler
    next();
  };
};

module.exports = roleMiddleware;
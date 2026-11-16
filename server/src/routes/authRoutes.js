const express = require('express');

const router = express.Router();

// Public capability flag, not a sign-in endpoint or an authenticated session.
router.get('/demo', (req, res) => {
  res.set('Cache-Control', 'no-store').json({
    enabled: process.env.DEMO_EMPLOYEE_MODE === 'true',
    employeeId: 'demo-employee',
  });
});

// Placeholder router for the Auth subsystem (mounted at /api/auth).
// Endpoints will be implemented in a later issue.
router.use((req, res) => {
  res.status(501).json({ error: 'Auth endpoints not implemented yet' });
});

module.exports = router;

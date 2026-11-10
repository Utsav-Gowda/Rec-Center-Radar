const express = require('express');

const router = express.Router();

// Placeholder router for the Auth subsystem (mounted at /api/auth).
// Endpoints will be implemented in a later issue.
router.use((req, res) => {
  res.status(501).json({ error: 'Auth endpoints not implemented yet' });
});

module.exports = router;

const express = require('express');

const router = express.Router();

// Placeholder router for the Announcement subsystem (mounted at /api/announcements).
// Endpoints will be implemented in a later sprint.
router.use((req, res) => {
  res.status(501).json({ error: 'Announcement endpoints not implemented yet' });
});

module.exports = router;


const express = require('express');
 
const router = express.Router();
 
// Placeholder router for the Report subsystem (mounted at /api/reports).
// Endpoints will be implemented in a sprint.
router.all('*', (req, res) => {
  res.status(501).json({ error: 'Report endpoints not implemented yet' });
});
 
module.exports = router;
 


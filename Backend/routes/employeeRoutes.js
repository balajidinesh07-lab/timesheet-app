const express = require('express');
const router = express.Router();

// Stub list route
router.get('/', (req, res) => {
  res.json([{ id: 1, name: 'Demo Employee' }]);
});

module.exports = router;

const express = require('express');
const app = express();
const cors = require('cors');
const produitsRoute = require('./api/produits');
const authRoutes = require('./api/auth');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/produits', produitsRoute);
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(4000, () => {
  console.log('Server running at http://localhost:4000');
});

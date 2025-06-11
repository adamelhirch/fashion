const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Secret key for JWT - in production, use environment variable
const JWT_SECRET = 'your-secret-key';
const REFRESH_TOKEN_SECRET = 'your-refresh-token-secret';

// Admin credentials - in production, store in database with hashed passwords
const ADMIN_USER = {
  username: 'admin',
  // Password: 'root' - hashed
  password: '$2b$10$M3WZTHhp8J3.Fz4/YB6Jz.TkwAgk5WgONLZs8V5LdQoA7gO.8ab5a'
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if user exists
    if (username !== ADMIN_USER.username) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, ADMIN_USER.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { username: ADMIN_USER.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { username: ADMIN_USER.username },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    // Send response
    res.json({
      token: accessToken,
      refreshToken,
      user: {
        username: ADMIN_USER.username,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Validate token endpoint
router.get('/validate', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Send user info
    res.json({
      user: {
        username: decoded.username,
        role: 'admin'
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Refresh token endpoint
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // Generate new access token
    const accessToken = jwt.sign(
      { username: decoded.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token: accessToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

module.exports = router;

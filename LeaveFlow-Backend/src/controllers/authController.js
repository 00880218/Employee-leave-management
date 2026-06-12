const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../services/db');

const JWT_SECRET = process.env.JWT_SECRET || 'leaveflow_jwt_secret_token_change_in_production';

/**
 * Generate a JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Register a new employee
 */
async function register(req, res) {
  const { name, email, password, role, managerSecret } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  try {
    const existingUser = await db.employees.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Determine role. If it is the first manager or explicitly chosen (default to employee)
    const userRole = role === 'manager' ? 'manager' : 'employee';

    // Validate Manager Secret Code
    if (userRole === 'manager') {
      const systemSecret = process.env.MANAGER_SECRET_CODE || 'LEAVEFLOW_ADMIN_2026';
      if (!managerSecret || managerSecret !== systemSecret) {
        return res.status(400).json({ message: 'Invalid or missing Manager Secret Code.' });
      }
    }

    const newUser = await db.employees.create({
      name,
      email,
      password,
      role: userRole,
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
}

/**
 * Log in an existing employee
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Find the user
    // Since our findByEmail returns password as well if from jsonDbCache or SQL
    // But in our pg database implementation, we do SELECT * which includes password!
    // For JSON, findByEmail does NOT delete the password, it returns the whole object.
    const user = await db.employees.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Create token
    const token = generateToken(user);

    // Return user info (excluding password)
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    };

    return res.json({
      message: 'Login successful.',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login.' });
  }
}

/**
 * Get the current user profile
 */
async function getProfile(req, res) {
  try {
    const user = await db.employees.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ message: 'Server error during profile retrieval.' });
  }
}

module.exports = {
  register,
  login,
  getProfile,
};

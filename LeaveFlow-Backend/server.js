const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./src/services/db');
const authRoutes = require('./src/routes/authRoutes');
const leaveRoutes = require('./src/routes/leaveRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Standard Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/employees', employeeRoutes);

// Serve Frontend Static Files from compiled Vite React build
const frontendBuildPath = path.resolve(__dirname, '../LeaveFlow/dist');
app.use(express.static(frontendBuildPath));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  // If the request is not for an API, send back index.html
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  } else {
    res.status(404).json({ message: 'API endpoint not found' });
  }
});

// Initialize DB and Start Server
async function startServer() {
  try {
    await db.initDb();
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(` LeaveFlow Server running on port ${PORT}`);
      console.log(` Access system at: http://localhost:${PORT}`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Failed to start LeaveFlow Server:', error);
    process.exit(1);
  }
}

startServer();

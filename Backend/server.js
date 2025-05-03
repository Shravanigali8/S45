const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { expressjwt: jwtAuth } = require('express-jwt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const serverPort = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:4200',
      'http://localhost:51467',
      'https://s45-live.onrender.com'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// MySQL Connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

// JWT Setup
const jwtKey = process.env.JWT_SECRET;
const jwtValidationMiddleware = jwtAuth({
  secret: jwtKey,
  algorithms: ['HS256'],
  credentialsRequired: true
});

// Helper functions
function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}
function encryptPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Test DB connection
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ success: true, result: rows[0].result });
  } catch (err) {
    console.error('DB test error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const salt = generateSalt();
    const hashedPassword = encryptPassword(password, salt);

    const [results] = await pool.execute(
      'INSERT INTO users (username, password, salt) VALUES (?, ?, ?)',
      [username, hashedPassword, salt]
    );

    res.status(201).json({ success: true, userId: results.insertId });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?', 
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    const hashedPassword = encryptPassword(password, user.salt);

    if (hashedPassword !== user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      jwtKey,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Protected Chart APIs
app.get('/api/summary-chart', jwtValidationMiddleware, async (req, res) => {
  try {
    const data = {
      title: "Clean Energy Investment Growth",
      data: {
        labels: ["Solar", "Wind", "Batteries", "Hydrogen", "CCUS"],
        datasets: [{
          label: "Investment (USD Billion)",
          data: [45, 38, 28, 15, 8],
          backgroundColor: [
            "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"
          ]
        }]
      }
    };
    res.json(data);
  } catch (error) {
    console.error('Summary chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports-chart', jwtValidationMiddleware, async (req, res) => {
  try {
    const data = {
      title: "Technology Readiness Levels",
      data: {
        labels: ["Perovskite PV", "Solid-State Batteries", "Green Hydrogen", "Floating Wind", "Direct Air Capture"],
        datasets: [{
          label: "TRL (1-9 scale)",
          data: [6, 7, 8, 8, 5],
          borderColor: "#3e95cd",
          fill: false
        }]
      }
    };
    res.json(data);
  } catch (error) {
    console.error('Reports chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start Server
const server = app.listen(serverPort, () => {
  console.log(`Server running on port ${serverPort}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    pool.end();
    console.log('Server and DB closed.');
    process.exit(0);
  });
});

module.exports = app;

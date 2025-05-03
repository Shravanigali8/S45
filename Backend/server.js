require('dotenv').config(); // Load environment variables at top

const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { expressjwt: jwtAuth } = require('express-jwt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const serverPort = process.env.PORT || 3000;
const jwtKey = process.env.JWT_SECRET || 'Shravani';
const app = express();

// Security and middleware
app.use(helmet());
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// CORS Setup
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
app.options('*', cors(corsOptions)); // Enable preflight requests

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false }
});

// JWT middleware
const jwtValidationMiddleware = jwtAuth({
  secret: jwtKey,
  algorithms: ['HS256'],
  credentialsRequired: true
});

// Utils
function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

function encryptPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'healthy', time: new Date().toISOString() });
});

// Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });

    const salt = generateSalt();
    const hashedPassword = encryptPassword(password, salt);

    const [results] = await pool.execute(
      'INSERT INTO users (username, password, salt) VALUES (?, ?, ?)',
      [username, hashedPassword, salt]
    );

    res.status(201).json({ success: true, userId: results.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });

    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = users[0];
    const hashedPassword = encryptPassword(password, user.salt);
    if (hashedPassword !== user.password) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, username: user.username }, jwtKey, { expiresIn: '1h' });

    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Protected Chart APIs
app.get('/api/summary-chart', (req, res) => {
  try {
    res.json({
      title: "Clean Energy Investment Growth",
      data: {
        labels: ["Solar", "Wind", "Batteries", "Hydrogen", "CCUS"],
        datasets: [{
          label: "Investment (USD Billion)",
          data: [45, 38, 28, 15, 8],
          backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]
        }]
      }
    });
  } catch (error) {
    console.error('Chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports-chart', (req, res) => {
  try {
    res.json({
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
    });
  } catch (error) {
    console.error('Chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack || err);
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
const server = app.listen(serverPort, () => {
  console.log(`✅ Server running on port ${serverPort}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => {
    pool.end();
    console.log('✅ Server and DB connections closed');
    process.exit(0);
  });
});

module.exports = app;

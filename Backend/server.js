const express = require('express');
const mysql = require('mysql2/promise'); // Using promise-based API
const crypto = require('crypto');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { expressjwt: jwtAuth } = require('express-jwt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const serverPort = process.env.PORT || 3000;
const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per window
});
app.use(limiter);

// CORS Configuration
const corsOptions = {
  origin: [
    'https://s45-live.onrender.com',
    process.env.NODE_ENV === 'development' && 'http://localhost:3000'
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Database connection pool
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

// JWT Configuration
const jwtKey = process.env.JWT_SECRET || 'Shravani';
const jwtValidationMiddleware = jwtAuth({
  secret: jwtKey,
  algorithms: ['HS256'],
  credentialsRequired: true
});

app.use(express.json());

// Helper functions
function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

function encryptPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    const salt = generateSalt();
    const hashedPassword = encryptPassword(password, salt);

    const [results] = await pool.execute(
      'INSERT INTO users (username, password, salt) VALUES (?, ?, ?)',
      [username, hashedPassword, salt]
    );

    res.status(201).json({ 
      success: true, 
      userId: results.insertId 
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?', 
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = users[0];
    const hashedPassword = encryptPassword(password, user.salt);

    if (hashedPassword !== user.password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
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
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Protected API endpoints
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
  
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// Server startup
const server = app.listen(serverPort, () => {
  console.log(`Server running on port ${serverPort}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    pool.end();
    console.log('Server and database connections closed');
    process.exit(0);
  });
});

module.exports = app;
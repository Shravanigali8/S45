const expressApp = require('express');
const mysqlDb = require('mysql');
const cryptoUtils = require('crypto');
const corsLib = require('cors');
const jwtLib = require('jsonwebtoken');
const { expressjwt: jwtAuth } = require('express-jwt');

const serverPort = process.env.PORT || 3000;
const app = expressApp();
app.use(corsLib());

// const dbConnectionConfig = {
//     host: 'localhost',
//     user: 'root',
//     password: 'Shiva@2000', //'saiKrishnaNBAD',
//     database: '', //'saiKrishnaNBAD'
// };

const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();
console.log(process.env.DB_PASSWORD);
const dbConnection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Shiva@2000',
  database: process.env.DB_NAME || 's45db',
});

dbConnection.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});


const jwtKey = 'SaiKrishna';

const jwtValidationMiddleware = jwtAuth({
    secret: jwtKey,
    algorithms: ['HS256']
});

app.use(expressApp.json());

// Root API Endpoint
app.get('/', async (req, res) => {
    res.status(200).json({ success: true, message: 'API is running.' });
});

// Generate a cryptographic salt
function generateSalt() {
    return cryptoUtils.randomBytes(32).toString('hex');
}

// Hash and salt the password
function encryptPassword(password, salt) {
    const sha256Encryptor = cryptoUtils.createHash('sha256');
    sha256Encryptor.update(password + salt);
    return sha256Encryptor.digest('hex');
}

// API for user signup
app.post('/api/register', async (req, res) => {
    const { password, username } = req.body;
    const userSalt = generateSalt();
    const encryptedPassword = encryptPassword(password, userSalt);

    dbConnection.query(
        'INSERT INTO user (password, salt, username) VALUES (?, ?, ?)',
        [encryptedPassword, userSalt, username],
        (dbError, dbResults) => {
            if (dbError) {
                console.error(dbError);
                res.status(500).json({ success: false, error: dbError.sqlMessage });
            } else {
                res.json({ status: 200, success: true, response: dbResults });
            }
        }
    );
});

// Summary chart data
app.get('/api/summary-chart', (req, res) => {
    const data = {
      title: "Clean Energy Investment Growth (Last 6 Months)",
      chartType: "bar",
      data: {
        labels: ["Solar", "Wind", "Batteries", "Hydrogen", "CCUS"],
        datasets: [{
          label: "Investment (USD Billion)",
          data: [45, 38, 28, 15, 8],
          backgroundColor: [
            "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"
          ]
        }]
      },
      description: "Shows the distribution of global investments across key clean energy sectors over the past six months."
    };
  
    res.json(data);
  });
  
  // Reports chart data
  app.get('/api/reports-chart', (req, res) => {
    const data = {
      title: "Technology Readiness Levels (TRL) of Emerging Clean Energy",
      chartType: "line",
      data: {
        labels: ["Perovskite PV", "Solid-State Batteries", "Green Hydrogen", "Floating Wind", "Direct Air Capture"],
        datasets: [{
          label: "TRL (1-9 scale)",
          data: [6, 7, 8, 8, 5],
          borderColor: "#3e95cd",
          fill: false
        }]
      },
      description: "Illustrates the current maturity levels of promising clean energy technologies on the standard Technology Readiness Level scale."
    };
  
    res.json(data);
  });

// API for user login
app.post('/api/login', async (req, res) => {
    const { password, username } = req.body;

    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }

    dbConnection.query(
        'SELECT * FROM user WHERE username = ?', 
        [username], 
        (dbError, dbResults) => {
            if (dbError) {
                console.error('Database error:', dbError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }

            if (dbResults.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }

            const foundUser = dbResults[0];
            const encryptedPassword = encryptPassword(password, foundUser.salt);

            // Debug logging
            console.log('Login attempt:', {
                username,
                inputPassword: password,
                storedHash: foundUser.password,
                computedHash: encryptedPassword,
                saltUsed: foundUser.salt
            });

            if (encryptedPassword !== foundUser.password) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid credentials' 
                });
            }

            const authToken = jwtLib.sign(
                { username: foundUser.username, userId: foundUser.id },
                jwtKey,
                { expiresIn: '59m' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    username: foundUser.username,
                    userId: foundUser.id
                },
                token: authToken
            });
        }
    );
});

// API for retrieving innovations by region
app.get('/api/regionInnovations', jwtValidationMiddleware, (req, res) => {
    const userId = req.auth.userId;  // Assuming you have user authentication

    dbConnection.query(
        'SELECT region, percentage_contribution FROM innovations_by_region', 
        (error, results) => {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Failed to get Innovations By Region data' });
            } else {
                res.json(results);
            }
        }
    );
});

// API for retrieving innovations by technology
app.get('/api/technologyInnovations', jwtValidationMiddleware, (req, res) => {
    const userId = req.auth.userId;  // Assuming you have user authentication

    dbConnection.query(
        'SELECT technology, number_of_innovations FROM innovations_by_technology', 
        (error, results) => {
            if (error) {
                console.error(error);
                res.status(500).json({ error: 'Failed to get Innovations By Technology data' });
            } else {
                res.json(results);
            }
        }
    );
});

// Connect to the database
dbConnection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Successfully connected to the database.');
});

// Gracefully close the database connection
const closeDbConnection = () => {
    dbConnection.end((err) => {
        if (err) {
            console.error('Error closing the database connection:', err);
        } else {
            console.log('Database connection closed');
        }
    });
};

// Start the server
const server = app.listen(serverPort, () => {
    console.log(`Server running on port ${serverPort}`);
});

// Handle server and database closure on process exit
process.on('exit', () => {
    server.close();
    closeDbConnection();
    console.log('Server and database connection closed.');
});

module.exports = app;

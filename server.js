require('dotenv').config();
const express = require('express');
const Database = require('./config/Database');
const authRoutes = require('./routes/auth');
const ErrorHandler = require('./middleware/ErrorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig'); 

//Initialize the app
const app = express();

//Set the port
const PORT = process.env.PORT || 3000;

//Connect to Database
Database.connect();

// Add Middleware
app.use(express.json());

//Sets up Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//API Routes
app.use('/api', authRoutes);

//Error Handler
app.use(ErrorHandler.handle);

// Start the Server
app.listen(PORT, () => {
  console.log(`Server is running successfully on http://localhost:${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
});
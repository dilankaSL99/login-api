const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  // Basic Info
  definition: {
    openapi: '3.0.0', 
    info: {
      title: 'Login API',
      version: '1.0.0',
      description: 'A simple Express API for user authentication (Email, Google, Facebook)',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
      },
    ],
    // Reusable schemas for request bodies and responses
    components: {
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User\'s email address',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User\'s password (min 6 characters)',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
            password: {
              type: 'string',
              format: 'password',
            },
          },
        },
        AuthTokenResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
            token: {
              type: 'string',
              description: 'JWT Bearer token',
            },
          },
        },
        ProfileResponse: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
          },
        },
      },
      // Security Schemes - Bearer Token
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
    },
  },
  
  // Path to the API routes folder - will scan the whole folder
  apis: ['./routes/*.js'], 
};

// Generate the Swagger/OpenAPI specification
const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
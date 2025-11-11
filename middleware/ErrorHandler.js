const ApiError = require('../utils/ApiError');

class ErrorHandler {
  
  static handle(err, req, res, next) {
    
    // Check if the error is in ApiErrors.js
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    // If it's an unexpected error send a generic 500 response
    console.error('UNEXPECTED SERVER ERROR:', err);
    return res.status(500).json({ message: 'Server error, please try again later.' });
  }
}

module.exports = ErrorHandler;
class ApiError extends Error {
  constructor(statusCode, message) {
    //Error message and Error Code
    super(message); 
    this.statusCode = statusCode;
  }
}

module.exports = ApiError;
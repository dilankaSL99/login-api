// Mock the environment FIRST before any imports
process.env.JWT_SECRET = 'test_secret';

// Mock JWT to control its behavior - MUST be at the top before any imports
jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/AuthMiddleware');

// Mock the environment
const MOCK_SECRET = 'test_secret'; 

describe('authenticateToken Middleware', () => {
 
  //Mock Objects
  let mockRequest;
  let mockResponse;
  let nextFunction;

  // Create fresh mock objects before each test
  beforeEach(() => {
    //Clear all mocks
    jest.clearAllMocks();

    // Mock the Express request object
    mockRequest = {
      headers: {},
    };
    // Mock the Express response object
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: jest.fn(),
    };
    // Mock the Express next function
    nextFunction = jest.fn();
  });
  
  //successful authentication flow
  it('should call next() if a valid token is provided', () => {
    const mockToken = 'valid.token.here';
    const mockPayload = { userId: '123' };
    
    //Set up the request header
    mockRequest.headers['authorization'] = `Bearer ${mockToken}`;
    
    //Mock jwt.verify to simulate successful verification
    jwt.verify.mockImplementation((token, secret, callback) => {
      //Check if the middleware passes the correct token and secret.
      expect(token).toBe(mockToken);
      expect(secret).toBe(MOCK_SECRET);
      // No error, pass payload
      callback(null, mockPayload); 
    });

    // Executes middleware manually with the mock objects
    authenticateToken(mockRequest, mockResponse, nextFunction);

    //Asserts that the middleware actually used jwt.verify
    expect(jwt.verify).toHaveBeenCalled();
    //Checks that middleware stored the userId on the request
    expect(mockRequest.userId).toBe(mockPayload.userId);
    //Checks if the next function is called without errors
    expect(nextFunction).toHaveBeenCalledWith(); 
    //Ensures no error response was sent
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  //Checks if the request has no Authorization header
  it('should return 401 (Unauthorized) if no token is provided', () => {
    //Run middleware again without a token
    authenticateToken(mockRequest, mockResponse, nextFunction);

    //Confirms middleware returned 401
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    //Checks that the correct JSON error was sent
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'No token provided.' });
    //Verifies it didn't move on to the next middleware
    expect(nextFunction).not.toHaveBeenCalled();
    //jwt.verify should not be called if there's no token
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  //Tests behavior for an invalid or expired token
  it('should return 403 (Forbidden) if an invalid token is provided', () => {

    //Tries an invalid token in the header
    const mockToken = 'invalid.token.here';
    mockRequest.headers['authorization'] = `Bearer ${mockToken}`;
    
    //Mock jwt.verify to simulate an error (invalid token)
    jwt.verify.mockImplementation((token, secret, callback) => {
      //Callbacks with an error
      callback(new Error('Invalid token'), null); 
    });

    //Runs middleware again
    authenticateToken(mockRequest, mockResponse, nextFunction);

    //Checks if jwt.verify ran
    expect(jwt.verify).toHaveBeenCalled();
    //checks if the middleware responded with 403 Forbidden
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    //Check if proper error message was sent
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid token.' });
    //Check if it did not continue to the next middleware
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
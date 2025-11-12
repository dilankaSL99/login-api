const AuthController = require('../controllers/AuthController');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const axios = require('axios');

// Mock all the dependencies
jest.mock('../models/User');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('axios'); 
jest.mock('google-auth-library'); 

// Set up mock env vars
process.env.JWT_SECRET = 'test_secret';
process.env.GOOGLE_CLIENT_ID = 'test_google_client_id'; 

describe('AuthController', () => {
  
  //Mock variables
  let mockRequest;
  let mockResponse;
  let nextFunction;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    //Creates a fresh fake req object
    mockRequest = {
      body: {},
      userId: null, 
    };
    //Creates a fake res objec
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  // Register Mock
  describe('register', () => {
    //Should create a new user
    it('should register a new user successfully', async () => {
      //Sets the request body with test credentials.
      mockRequest.body = { email: 'test@example.com', password: 'password123' };
 
      // Mock DB find
      User.findOne.mockResolvedValue(null);
      // Mock bcrypt
      bcrypt.genSalt.mockResolvedValue(10);
      bcrypt.hash.mockResolvedValue('hashedpassword');
      // Mock DB - user.save
      const saveMock = jest.fn().mockResolvedValue(true);
      User.mockImplementation(() => ({
        save: saveMock,
      }));
      
      //Register controller function with the mocks
      await AuthController.register(mockRequest, mockResponse, nextFunction);
      
      //Check if there's already that email
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      //Check if the password is hashed
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      //Check if the user is saved
      expect(saveMock).toHaveBeenCalled();
      //Checks if it is a 201 and registered
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User registered successfully!' });
      //Check if there's no error
      expect(nextFunction).not.toHaveBeenCalled();
    });

    //Test - Email duplicated
    it('should throw 400 if email is already in use', async () => {
      //New test with same request body.
      mockRequest.body = { email: 'test@example.com', password: 'password123' };

      // Mock DB - User.findOne finds an existing user
      User.findOne.mockResolvedValue({ email: 'test@example.com' });

      await AuthController.register(mockRequest, mockResponse, nextFunction);
      
      //Check igf find one is called
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      //check if there are any hashings called
      expect(bcrypt.hash).not.toHaveBeenCalled();
      //check if there are no status sent
      expect(mockResponse.status).not.toHaveBeenCalled();
      // Check if the next function is called with an ApiError
      expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toBe('Email already in use.');
    });

    //Missing email
    it('should throw 400 if email is not provided', async () => {
    // No email
    mockRequest.body = { password: 'password123' }; 
    
    await AuthController.register(mockRequest, mockResponse, nextFunction);
    
    expect(User.findOne).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
    expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
    expect(nextFunction.mock.calls[0][0].message).toBe('Please provide both email and password.');
    });

    //No password
    it('should throw 400 if password is not provided', async () => {
    // No password
    mockRequest.body = { email: 'test@example.com' }; 

    await AuthController.register(mockRequest, mockResponse, nextFunction);
    
    expect(User.findOne).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
    expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
    expect(nextFunction.mock.calls[0][0].message).toBe('Please provide both email and password.');
    });

    //Missing body
    it('should throw 400 if request body is empty', async () => {
    // Empty body
    mockRequest.body = {};
    
    await AuthController.register(mockRequest, mockResponse, nextFunction);
    
    expect(User.findOne).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
    expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
    });

  });

  //Login
  describe('login', () => {
    
    //Sets a mock req body
    it('should log in a user and return a token', async () => {
      mockRequest.body = { email: 'test@example.com', password: 'password123' };
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedpassword'
      };
      
      // Mock DB - User.findOne finds the user
      User.findOne.mockResolvedValue(mockUser);
      // Mock bcrypt - Passwords match
      bcrypt.compare.mockResolvedValue(true);
      // Mock JWT - Sign returns a token
      jwt.sign.mockReturnValue('mock.jwt.token');
      

      //Call the login function with mocks
      await AuthController.login(mockRequest, mockResponse, nextFunction);

      //Check if the user is returned
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      //Check if the passwords are compared
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      //Check if the user token is signed
      expect(jwt.sign).toHaveBeenCalledWith({ userId: 'user123' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      //Check if it is a 200
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Login successful!', token: 'mock.jwt.token' });
      //next was not called
      expect(nextFunction).not.toHaveBeenCalled();
    });

    //Invalid Credentials
    it('should throw 400 for invalid credentials (user not found)', async () => {
      mockRequest.body = { email: 'test@example.com', password: 'password123' };
      
      // Mock DB - User not found
      User.findOne.mockResolvedValue(null);
      
      //Call the login fucntion
      await AuthController.login(mockRequest, mockResponse, nextFunction);
      
      //Checks for the email and password but no match
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      //Check if 400 is shown
      expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
      expect(nextFunction.mock.calls[0][0].message).toBe('Invalid credentials.');
    });
    
    //Social Media User
    it('should throw 400 for a social media user', async () => {
      mockRequest.body = { email: 'test@example.com', password: 'password123' };
      const mockSocialUser = {
        _id: 'user123',
        email: 'test@example.com',
        //Social media login has no password
        password: null 
      };
      
      // Mock DB - User found, but no password
      User.findOne.mockResolvedValue(mockSocialUser);

      await AuthController.login(mockRequest, mockResponse, nextFunction);
      
      //Check if email was found but no passowrd hashing
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      //Error is shown
      expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
      expect(nextFunction.mock.calls[0][0].message).toBe('User registered via social media.');
    });

    //E-mail is not provided
    it('should throw 400 if email is not provided', async () => {
    mockRequest.body = { password: 'password123' };
    
    await AuthController.login(mockRequest, mockResponse, nextFunction);
    
    expect(User.findOne).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
    expect(nextFunction.mock.calls[0][0].message).toBe('Please provide both email and password.');
    });

    // No password provided
    it('should throw 400 if password is not provided', async () => {
    mockRequest.body = { email: 'test@example.com' };
    
    await AuthController.login(mockRequest, mockResponse, nextFunction);
    
    expect(User.findOne).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
    expect(nextFunction.mock.calls[0][0].message).toBe('Please provide both email and password.');
    });

    // Wrong password
    it('should throw 400 if password is incorrect', async () => {
    mockRequest.body = { email: 'test@example.com', password: 'wrongpassword' };
    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      password: 'hashedpassword'
    };
    
    User.findOne.mockResolvedValue(mockUser);
    // Password doesn't match
    bcrypt.compare.mockResolvedValue(false); 
    
    await AuthController.login(mockRequest, mockResponse, nextFunction);
    
    expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedpassword');
    expect(jwt.sign).not.toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
    expect(nextFunction.mock.calls[0][0].message).toBe('Invalid credentials.');
    });
  });

  describe('authGoogle', () => {
  //checks if it a valid Google token allows successful authentication.
  it('should authenticate user with valid Google token', async () => {
    const mockIdToken = 'valid.google.token';
    const mockPayload = {
      sub: 'google123',
      email: 'test@gmail.com'
    };
    
    //Mock request
    mockRequest.body = { idToken: mockIdToken };
    
    // Mock OAuth2Client
    const { OAuth2Client } = require('google-auth-library');
    const mockVerifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => mockPayload
    });
    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken
    }));
    
    // Mock User.findOneAndUpdate
    const mockUser = { _id: 'user123', email: 'test@gmail.com', googleId: 'google123' };
    User.findOneAndUpdate.mockResolvedValue(mockUser);
    //Sign a mock token
    jwt.sign.mockReturnValue('mock.jwt.token');
    
    //Call the function with mockdata
    await AuthController.authGoogle(mockRequest, mockResponse, nextFunction);
    
    //check if the user is cereated
    expect(User.findOneAndUpdate).toHaveBeenCalled();
    //check if it is a 200
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Google login successful!',
      token: 'mock.jwt.token'
    });
  });
  
  //Invalid Token
  it('should handle invalid Google token', async () => {
    mockRequest.body = { idToken: 'invalid.token' };
    
    const { OAuth2Client } = require('google-auth-library');
    const mockVerifyIdToken = jest.fn().mockRejectedValue(new Error('Invalid token'));
    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken
    }));
    
    await AuthController.authGoogle(mockRequest, mockResponse, nextFunction);
    
    expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
  });
});

  describe('authFacebook', () => {
  
  //checks if it is a valid Facebook token and authenticates the user successfully
  it('should authenticate user with valid Facebook token', async () => {
    const mockAccessToken = 'valid.facebook.token';
    const mockFacebookData = {
      id: 'facebook123',
      email: 'test@facebook.com'
    };
    
    mockRequest.body = { accessToken: mockAccessToken };
    
    // Mock axios.get
    axios.get.mockResolvedValue({ data: mockFacebookData });
    
    // Mock User.findOneAndUpdate
    const mockUser = { _id: 'user123', email: 'test@facebook.com', facebookId: 'facebook123' };
    User.findOneAndUpdate.mockResolvedValue(mockUser);
    
    //generate a mock token
    jwt.sign.mockReturnValue('mock.jwt.token');
    
    //Call the auth function with mock data
    await AuthController.authFacebook(mockRequest, mockResponse, nextFunction);
    
    //Chcks if controller tried to call Facebook's Graph API.
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('graph.facebook.com')
    );
    //checks if the user record was created or updated in the database
    expect(User.findOneAndUpdate).toHaveBeenCalled();
    //Check if it is a 200
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  
    //Invalid token
    it('should throw 400 if Facebook token is invalid (no email)', async () => {
    mockRequest.body = { accessToken: 'invalid.token' };
    
    // Facebook returns data without email
    axios.get.mockResolvedValue({ 
      // No email
      data: { id: 'facebook123' } 
    });
    
    //Call the function 
    await AuthController.authFacebook(mockRequest, mockResponse, nextFunction);
    
    //Checks if an api error is passed
    expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
    expect(nextFunction.mock.calls[0][0].message).toBe('Invalid Facebook token.');
    });
  });

  // GetProfile
  describe('getProfile', () => {

    it('should return user profile data', async () => {
      mockRequest.userId = 'user123'; 
      const mockUser = {
        email: 'test@example.com',
        userId: 1 
      };
      
      // Mock DB - User.findById finds the user
      User.findById.mockResolvedValue(mockUser);

      await AuthController.getProfile(mockRequest, mockResponse, nextFunction);
      
      //Check if the user is fetched by ID
      expect(User.findById).toHaveBeenCalledWith('user123');
      //Check if it is a 200
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ email: 'test@example.com', userId: 1 });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should throw 404 if user not found', async () => {
      mockRequest.userId = 'user123';
      
      // Mock DB - User.findById returns null
      User.findById.mockResolvedValue(null);
      
      await AuthController.getProfile(mockRequest, mockResponse, nextFunction);
      
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockResponse.json).not.toHaveBeenCalled();
      // Check if the user not found
      expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
      expect(nextFunction.mock.calls[0][0].message).toBe('User not found.');
    });
  });
});
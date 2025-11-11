const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const User = require('../models/User'); 
const ApiError = require('../utils/ApiError'); 

// Helper function to create a token - expires in 1h
const createToken = (userId) => {
  const payload = { userId };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

class AuthController {
  
  //Resister
  async register(req, res, next) {
    try {
      const { email, password } = req.body;
      
      //Check both are provided
      if (!email || !password) {
        throw new ApiError(400, 'Please provide both email and password.');
      }
      
      //Check if the user email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ApiError(400, 'Email already in use.');
      }
      
      //Generate a salt and hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      //Create a new User
      const newUser = new User({ email, password: hashedPassword });
      await newUser.save();

      res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
      next(error); 
    }
  }

  // Login 
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      //Check both are provided
      if (!email || !password) {
        throw new ApiError(400, 'Please provide both email and password.');
      }
      
      //Find the user from the database
      const user = await User.findOne({ email });
      if (!user) {
        throw new ApiError(400, 'Invalid credentials.');
      }
      
      //Check if the user is register via SM
      if (!user.password) {
        throw new ApiError(400, 'User registered via social media.');
      }
      
      //Check the hashed passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new ApiError(400, 'Invalid credentials.');
      }
      
      //Create a token if valid
      const token = createToken(user._id);
      res.status(200).json({ message: 'Login successful!', token });

    } catch (error) {
      next(error); 
    }
  }

  // Google Auth
  async authGoogle(req, res, next) {
    try {
      const { idToken } = req.body;
      //Create a instance
      const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      //Verify the token with googleAPI
      const ticket = await googleClient.verifyIdToken({
          idToken: idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
      });
      //Extracts the user information from the ticket
      const payload = ticket.getPayload();
      
      //Checks if the user exists in your database by googleId and create if not
      const user = await User.findOneAndUpdate(
          { googleId: payload['sub'] },
          { $set: { email: payload['email'], googleId: payload['sub'] } },
          { upsert: true, new: true }
      );
      
      //Generate a token
      const token = createToken(user._id);
      res.status(200).json({ message: 'Google login successful!', token });

    } catch (error) {
      next(error); 
    }
  }

  //Facebook Auth 
  async authFacebook(req, res, next) {
    try {
      //Extracts the accessToken sent by the frontend from Facebook login
      const { accessToken } = req.body;
      //Calls Facebook Graph API to get user info using the accessToken.
      const { data } = await axios.get(
          `https://graph.facebook.com/me?fields=id,email&access_token=${accessToken}`
      );
      
      //Checks if the response contains both id and email.
      if (!data.id || !data.email) {
        throw new ApiError(400, 'Invalid Facebook token.');
      }
    
      //Checks if the user exists in your database by facebookId and create if no
      const user = await User.findOneAndUpdate(
          { facebookId: data.id },
          { $set: { email: data.email, facebookId: data.id } },
          { upsert: true, new: true }
      );
      
      //Create the token
      const token = createToken(user._id);
      res.status(200).json({ message: 'Facebook login successful!', token });

    } catch (error) {
      next(error); 
    }
  }

  // Get Profile
  async getProfile(req, res, next) {
    try {
      // req.userId is added by the authenticateToken middleware
      const user = await User.findById(req.userId);

      if (!user) {
        throw new ApiError(404, 'User not found.');
      }

      res.status(200).json({ email: user.email });

    } catch (error) {
      next(error);
    }
  }
}

// Export a single instance of the controller
module.exports = new AuthController();
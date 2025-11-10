const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config(); 
const { OAuth2Client } = require('google-auth-library'); 
const axios = require('axios');

const app = express();

const PORT = process.env.PORT || 3000;

//Middleware
app.use(express.json());

//MogoDb
const dbURI = process.env.DB_URI;

mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

//User Model
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false //Made it not required as social media login is there.
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // to make it optional
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true 
  }
});
//Build the model
const User = mongoose.model('User', userSchema);

//
const secretKey = process.env.JWT_SECRET;

//Prepares the Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const authenticateToken = (req, res, next) => {
  //Reads the Authorization header and extracts the token.
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'No token provided.' });
  }
  //Checks if the token is valid using your secretKey
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      //Forbidden
      return res.status(403).json({ message: 'Invalid token.' });
    }
    //Saves the user ID into req.userId and lets the request continue if it was valid
    req.userId = decoded.userId;
    next();
  });
};

// Public route
app.get('/', (req, res) => {
  res.json({ message: 'API server is running and connected to DB.' });
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    //Validate the request
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }
    //Confirm no duplicate emails
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use.' });
    }
    //Generates a salt and hashes the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    //Save the user in the database
    const newUser = new User({
      email: email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully!' });

  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    //Read login
    const { email, password } = req.body;
    
    //Check both are entered
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }
    
    //Search the user
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    //No pasword is stored when logged in via Social media.
    if (!user.password) {
        return res.status(400).json({ message: 'User registered via social media. Please log in with Google or Facebook.' });
    }
    
    //Compares the provided password with the hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    

    const payload = {
      userId: user._id
    };
    
    //Create a token. 
    const token = jwt.sign(payload, secretKey, {
      expiresIn: '1h' //Expired in 1 hour
    });

    res.status(200).json({
      message: 'Login successful!',
      token: token //Sends the token to display
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});

// auth/google
app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body; // The token needed to be sent from the app

    // Verifying the token is valid
    const ticket = await googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    // 	this payload has user info
    const payload = ticket.getPayload();
    
    // Extracts Google’s user ID and email.
    const googleId = payload['sub'];
    const email = payload['email'];
  
    //Find the user or create one
    const user = await User.findOneAndUpdate(
        { googleId: googleId }, // Find by googleId
        { $set: { email: email, googleId: googleId } }, // Set or update
        { upsert: true, new: true } // Create if not found.
    );

  
    const ourJwtPayload = {
      userId: user._id // Use the ID from database
    };
    
    //Token within the server
    const token = jwt.sign(ourJwtPayload, secretKey, {
      expiresIn: '1h'
    });

    // Send that token to the user
    res.status(200).json({
      message: 'Google login successful!',
      token: token
    });

  } catch (error) {
    console.error('Error during Google login:', error);
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});


// auth/facebook
app.post('/api/auth/facebook', async (req, res) => {
  try {
    const { accessToken } = req.body; // The token needed to be sent from the app

    //Check the user email and facebook id
    const { data } = await axios.get(
        `https://graph.facebook.com/me?fields=id,email&access_token=${accessToken}`
    );

    const facebookId = data.id;
    const email = data.email;

    //Validates that Facebook responded with email and id
    if (!facebookId || !email) {
        return res.status(400).json({ message: 'Invalid Facebook token.' });
    }

    // Find or Create User
    const user = await User.findOneAndUpdate(
        { facebookId: facebookId }, // Find by facebookId
        { $set: { email: email, facebookId: facebookId } }, // Set or update 
        { upsert: true, new: true } 
    );

    // Create the token within the server
    const ourJwtPayload = {
      userId: user._id
    };
    
    const token = jwt.sign(ourJwtPayload, secretKey, {
      expiresIn: '1h'
    });

    res.status(200).json({
      message: 'Facebook login successful!',
      token: token
    });

  } catch (error) {
    console.error('Error during Facebook login:', error);
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});


// /profile 
//Token is run first
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    //Fetches the user based on the ID in the token
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      email: user.email
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error, please try again later.' });
  }
});


//Start the server
app.listen(PORT, () => {
  console.log(`Server is running successfully on http://localhost:${PORT}`);
});
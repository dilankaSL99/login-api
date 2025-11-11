const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET;

//Checks if the token is valid
const authenticateToken = (req, res, next) => {
  //Extract token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    // 401 - Unauthorized
    return res.status(401).json({ message: 'No token provided.' });
  }
  
  //Veryfiy token
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      // 403 - Forbidden - token is invalid
      return res.status(403).json({ message: 'Invalid token.' });
    }

    // If vaild add the user ID from the token payload to the request object 
    req.userId = decoded.userId;
    
    // Pass control to the next function 
    next();
  });
};

module.exports = authenticateToken;
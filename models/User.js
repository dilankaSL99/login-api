const mongoose = require('mongoose');
const Counter = require('./Counter');

const userSchema = new mongoose.Schema({

  userId: {
    type: Number,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false // Made it to false as social logins doent need password
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true
  }
});

userSchema.pre('save', async function(next) {
  // 'this' refers to the user document that is about to be saved
  if (this.isNew) { // Only run this for new users
    try {
      //Increment the id by 1
      const counter = await Counter.findOneAndUpdate(
        { _id: 'userId' },
        { $inc: { sequence_value: 1 } },
        //Creates the counter if it doesn't exist
        { new: true, upsert: true }
      );

      // Set the new user's userId to the value from the counter
      this.userId = counter.sequence_value;
      next(); 

    } catch (error) {
      next(error); 
    }
  } else {
    // If the user is not new, just continue
    next(); 
  }
});

// Compile a model and export
const User = mongoose.model('User', userSchema);
module.exports = User;
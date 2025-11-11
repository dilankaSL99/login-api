const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  // Name of the sequence - userId
  _id: { 
    type: String, 
    required: true 
  },
  // Last number that was used
  sequence_value: { 
    type: Number, 
    default: 0 
  }
});

const Counter = mongoose.model('Counter', counterSchema);
module.exports = Counter;
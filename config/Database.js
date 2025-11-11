const mongoose = require('mongoose');

class Database {
  // We use a static method so we can call it without creating an instance
  static async connect() {
    try {
      const dbURI = process.env.DB_URI;
      await mongoose.connect(dbURI);
      console.log('Successfully connected to MongoDB');
    } catch (err) {
      console.error('Error connecting to MongoDB:', err);
      // Exit the process with a failure code
      process.exit(1); 
    }
  }
}

module.exports = Database;
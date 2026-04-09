const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of default
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('\n❌ MongoDB Connection Error!');
    console.error('Reason:', err.message);
    console.error('\n💡 PRO TIP: This is usually because your current IP address is not whitelisted in MongoDB Atlas.');
    console.error('1. Go to MongoDB Atlas -> Network Access');
    console.error('2. Add your current IP or allow access from anywhere (0.0.0.0/0) for testing.');
    console.error('3. Check if your network/firewall blocks port 27017.\n');
    // process.exit(1); // Do not exit in development to allow server to start
  }
};


module.exports = connectDB;

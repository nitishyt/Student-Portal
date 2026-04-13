const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const SALT_ROUNDS = 12;
    const adminPassword = 'admin123'; // Admin password

    // Check if admin exists
    const existingAdmin = await User.findOne({ username: 'admin', role: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log(`Username: admin`);
      console.log(`Password: ${adminPassword}`);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      
      const adminUser = new User({
        username: 'admin',
        email: 'admin@college.edu',
        password: hashedPassword,
        role: 'admin',
        tokenVersion: 0,
        failedLoginAttempts: 0,
        lockUntil: null,
        mustChangePassword: false
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully');
      console.log(`Username: admin`);
      console.log(`Password: ${adminPassword}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Admin setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, check what users exist
    const allUsers = await User.find({}).select('+password');
    console.log('\n📋 All users in database:');
    allUsers.forEach(user => {
      console.log(`  - ${user.username} (role: ${user.role})`);
    });

    const SALT_ROUNDS = 12;
    const adminPassword = 'admin123';

    // Delete any existing admin users first
    await User.deleteMany({ username: 'admin', role: 'admin' });
    console.log('\n🗑️  Cleared old admin users');

    // Create fresh admin user
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
    console.log('✅ New admin user created');

    // Verify it was created
    const savedAdmin = await User.findOne({ username: 'admin' }).select('+password');
    if (savedAdmin) {
      const isPasswordValid = await bcrypt.compare(adminPassword, savedAdmin.password);
      console.log(`\n✓ Admin user verified`);
      console.log(`  Username: ${savedAdmin.username}`);
      console.log(`  Role: ${savedAdmin.role}`);
      console.log(`  Password hash matches: ${isPasswordValid}`);
      console.log(`\n🔑 Login Credentials:`);
      console.log(`  Username: admin`);
      console.log(`  Password: ${adminPassword}`);
    } else {
      console.log('❌ Failed to verify admin user');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

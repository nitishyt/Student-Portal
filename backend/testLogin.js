const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const testUsername = 'admin';
    const testPassword = 'admin123';
    const testRole = 'admin';

    console.log('🔍 Testing login...');
    console.log(`  Username: ${testUsername}`);
    console.log(`  Password: ${testPassword}`);
    console.log(`  Role: ${testRole}\n`);

    // Simulate login controller logic
    const user = await User.findOne({ username: testUsername }).select(
      '+password +failedLoginAttempts +lockUntil +tokenVersion +mustChangePassword'
    );

    if (!user) {
      console.log('❌ User not found in database');
      await mongoose.connection.close();
      return;
    }

    console.log('✓ User found:', {
      username: user.username,
      role: user.role,
      email: user.email
    });

    // Check role match
    if (testRole && user.role !== testRole) {
      console.log(`❌ Role mismatch: sent '${testRole}', user role is '${user.role}'`);
      await mongoose.connection.close();
      return;
    }

    console.log(`✓ Role matches: ${user.role}`);

    // Check password
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log(`✓ Password comparison result: ${isValid}`);

    if (!isValid) {
      console.log('❌ Password does NOT match');
    } else {
      console.log('✅ Password matches - LOGIN SHOULD SUCCEED');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

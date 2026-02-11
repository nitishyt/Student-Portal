const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const diagnose = async () => {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI.split('@')[1]); // Log host part only for safety
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const users = await User.find({}, { password: 0 }); // Hide passwords
        console.log('Total users found:', users.length);
        users.forEach(u => {
            console.log(`- Username: ${u.username}, Role: ${u.role}`);
        });

        const admin = await User.findOne({ username: 'admin', role: 'admin' });
        if (admin) {
            console.log('✅ Admin user found specifically in database.');
        } else {
            console.log('❌ Admin user NOT found in database with username="admin" and role="admin".');
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

diagnose();

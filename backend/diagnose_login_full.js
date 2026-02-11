const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const testLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const username = 'admin';
        const password = 'admin123';
        const role = 'admin';

        const user = await User.findOne({ username, role });
        if (!user) {
            console.log('❌ User not found with username="admin" and role="admin"');
            return;
        }

        console.log('✅ User found. Comparing password...');
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
            console.log('✅ Password is CORRECT (bcrypt matches admin123)');
        } else {
            console.log('❌ Password is INCORRECT (bcrypt does NOT match admin123)');
            console.log('Stored hash:', user.password);
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

testLogin();

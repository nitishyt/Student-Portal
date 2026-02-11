const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const hashedPassword = await bcrypt.hash('admin123', 10);

    await User.updateOne(
        { username: 'admin', role: 'admin' },
        { $set: { password: hashedPassword } }
    );

    console.log('✅ Admin password reset to admin123');
    await mongoose.connection.close();
})();

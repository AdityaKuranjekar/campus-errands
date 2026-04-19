const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    phone: String   // ✅ ADD THIS
});

module.exports = mongoose.model('User', userSchema);
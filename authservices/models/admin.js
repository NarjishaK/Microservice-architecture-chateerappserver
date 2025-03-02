const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    isBlocked: { type: Boolean, default: false },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now },
});

adminSchema.pre('save', async function (next) {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('Admin', adminSchema);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    profileFor: { type: String },
    name: { type: String, required: true },
    email: { type: String, unique: true },
    phone: { type: Number, required: true },
    password: { type: String, required: true },
    nationality: { type: String },
    district: { type: String },
    state: { type: String },
    location: { type: String },
    gender: { type: String },
    image: { type: String },
    dob: { type: Date },
    maritalStatus: { type: String },
    height: { type: Number },
    weight: { type: Number },
    physicallyChallenged: { type: String },
    financialStatus: { type: String },
    about: { type: String },
    higherEducation: { type: String },
    course: { type: String },
    passOutDate: { type: Date },
    profession: { type: String },
    company: { type: String },
    religion: { type: String },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', userSchema);

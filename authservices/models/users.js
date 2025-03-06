const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    profileFor: { type: String },
    name: { type: String, required: true },
    email: { type: String, unique: true },
    phone: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (value) {
                return /^\+91 \d{10}$/.test(value);
            },
            message: "Phone number must be in the format: '+91 9876543210'"
        }
    },
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
    // List of blocked user IDs
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});
// Ensure phone number has "+91 " prefix before saving
userSchema.pre('save', function (next) {
    if (this.phone && !this.phone.startsWith("+91 ")) {
        this.phone = "+91 " + this.phone.replace(/\D/g, "").slice(-10);
    }
    next();
});
module.exports = mongoose.model('User', userSchema);

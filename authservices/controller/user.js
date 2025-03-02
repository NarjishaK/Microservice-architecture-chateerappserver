const User = require('../models/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const crypto = require('crypto');

const otpStore = {}; // Temporary OTP storage (Consider Redis for production)

// Twilio configuration
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Function to generate unique userId
const generateUserId = async () => {
    const lastUser = await User.findOne().sort({ userId: -1 }).select('userId'); // Get the highest userId

    let newIdNumber = 1; // Default if no users exist

    if (lastUser && lastUser.userId) {
        const lastIdNumber = parseInt(lastUser.userId.substring(2)); // Extract numeric part
        newIdNumber = lastIdNumber + 1; // Increment
    }

    return `CA${newIdNumber.toString().padStart(6, '0')}`; // Format with leading zeros
};

// Create user
exports.createUser = async (req, res) => {
    try {
        const { name, email, phone, password, ...otherFields } = req.body;
        const image = req.file ? req.file.filename : null;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: 'Name, email, phone, and password are required' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Email or phone already exists' });
        }

        
        let userId;
        let isDuplicate = true;
        while (isDuplicate) {
            userId = await generateUserId();
            const existingId = await User.findOne({ userId }); // Check if userId already exists
            if (!existingId) {
                isDuplicate = false;
            }
        }

        const newUser = new User({
            userId,
            name,
            email,
            phone,
            password,
            ...otherFields,
            image
        });

        await newUser.save();
        res.status(201).json({ message: 'User created successfully', user: newUser });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


//get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


//get user by id
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


//update user by id
exports.updateUserById = async (req, res) => {
    try {
        const { name, email, phone, password, ...otherFields } = req.body;
        const image = req.file ? req.file.filename : null;
        const user = await User.findByIdAndUpdate(req.params.id, {
            name,
            email,
            phone,
            ...otherFields,
            image
        }, { new: true });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


//delete user by id
exports.deleteUserById = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

//delete all users
exports.deleteAllUsers = async (req, res) => {
    try {
        await User.deleteMany({});
        res.status(200).json({ message: 'All users deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

//login user by email or phone and password
exports.loginUser = async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        const user = await User.findOne({ $or: [{ email }, { phone }] });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log("User found:",user.name);

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log("Password comparison result:", isPasswordValid);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ userId: user.userId, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.status(200).json({ message: 'Login successful', user, token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


//forget password by email or phone
exports.forgetPassword = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const user = await User.findOne({ $or: [{ email }, { phone }] });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ message: 'Password reset link sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Send OTP via Email or SMS
 */
exports.sendOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const user = await User.findOne({ $or: [{ email }, { phone }] });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const otp = generateOTP();
        otpStore[user.userId] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // OTP valid for 5 mins

        if (email) {
            await transporter.sendMail({
                from: '"Your App" <your-email@gmail.com>',
                to: email,
                subject: 'Your OTP Code',
                text: `Your OTP code is: ${otp}. It is valid for 5 minutes.`
            });
            return res.status(200).json({ message: 'OTP sent to email' });
        } else if (phone) {
            await twilioClient.messages.create({
                body: `Your OTP code is: ${otp}. It is valid for 5 minutes.`,
                from: TWILIO_PHONE_NUMBER,
                to: phone
            });
            return res.status(200).json({ message: 'OTP sent via SMS' });
        }

        return res.status(400).json({ error: 'Email or phone is required' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Verify OTP
 */
exports.verifyOTP = async (req, res) => {
    try {
        const { userId, otp } = req.body;
        if (!otpStore[userId]) {
            return res.status(400).json({ error: 'OTP expired or invalid' });
        }

        const { otp: storedOtp, expiresAt } = otpStore[userId];

        if (Date.now() > expiresAt) {
            delete otpStore[userId];
            return res.status(400).json({ error: 'OTP expired' });
        }

        if (otp !== storedOtp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        delete otpStore[userId]; // OTP verified, remove it from storage
        return res.status(200).json({ message: 'OTP verified successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Reset Password
 */
exports.resetPassword = async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
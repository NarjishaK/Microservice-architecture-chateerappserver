const Admin = require('../models/admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const crypto = require('crypto');
const Redis = require('ioredis');
const redis = new Redis(); 
const OTP_EXPIRY = 60; 

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

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000);
};

//create admin
exports.createAdmin = async (req, res) => {
    try {
        const { name, email, phone, password ,role} = req.body;
        const image = req.file ? req.file.filename : null;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: 'Name, email, phone, and password are required' });
        }

        const existingAdmin = await Admin.findOne({ $or: [{ email }, { phone }] });
        if (existingAdmin) {
            return res.status(400).json({ error: 'Email or phone already exists' });
        }

        const newAdmin = new Admin({
            name,
            email,
            phone,
            role,
            password,
            image
        });

        const savedAdmin = await newAdmin.save();
        res.status(201).json(savedAdmin);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//login admin by email or phone and password
exports.loginAdmin = async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        const admin = await Admin.findOne({ $or: [{ email }, { phone }] });
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        const token = jwt.sign({ userId: admin.userId, email: admin.email }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });
        res.status(200).json({ message: 'Login successful', admin, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//get all admins
exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find();
        res.status(200).json(admins);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//get admin by id
exports.getAdminById = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(200).json(admin);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//delete admin by id
exports.deleteAdminById = async (req, res) => {
    try {
        const admin = await Admin.findByIdAndDelete(req.params.id);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(200).json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//delete all admins
exports.deleteAllAdmins = async (req, res) => {
    try {
        await Admin.deleteMany();
        res.status(200).json({ message: 'All admins deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//update admin by id
exports.updateAdminById = async (req, res) => {
    const { name, email, phone, password, ...otherFields } = req.body;
    const image = req.file ? req.file.filename : null;
    try {
        const admin = await Admin.findByIdAndUpdate(req.params.id, {
            name,
            email,
            phone,

            ...otherFields,
            image
        }, { new: true });
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(200).json(admin);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//send otp
exports.sendOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const admin = await Admin.findOne({ $or: [{ email }, { phone }] });
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//send generated otp email or sms
exports.sendOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const admin = await Admin.findOne({ $or: [{ email }, { phone }] });
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        const otp = generateOTP();
        const key = `otp:${admin.email}`;
        await redis.setex(key, OTP_EXPIRY, otp); // Store OTP in Redis with expiry
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


// Verify OTP (Check Redis)
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const key = `otp:${email}`;
        const storedOtp = await redis.get(key);

        if (!storedOtp) {
            return res.status(400).json({ error: 'OTP expired or invalid' });
        }

        if (otp !== storedOtp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        await redis.del(key); // Remove OTP after verification
        return res.status(200).json({ message: 'OTP verified successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


//reset password
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await Admin.findOne({ email });

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
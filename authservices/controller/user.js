const User = require('../models/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const crypto = require('crypto');
const Redis = require('ioredis');
const redis = new Redis(); // Connects to Redis running locally on default port 6379

const OTP_EXPIRY = 60; // 1 minutes in seconds


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

//Reset Password
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


//Send OTP (Store in Redis)
exports.sendOTP = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const user = await User.findOne({ $or: [{ email }, { phone }] });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const otp = generateOTP();
        const key = `otp:${user.userId}`;

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

        return res.status(400).json({ error: 'Email or phone is required' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Verify OTP (Check Redis)
exports.verifyOTP = async (req, res) => {
    try {
        const { userId, otp } = req.body;
        const key = `otp:${userId}`;
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


//block user by id
exports.blockUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.isBlocked = true;
        await user.save();
        res.status(200).json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//unblock user by id
exports.unblockUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.isBlocked = false;
        await user.save();
        res.status(200).json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//all blocked users
exports.getAllBlockedUsers = async (req, res) => {
    try {
        const blockedUsers = await User.find({ isBlocked: true });
        res.status(200).json(blockedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//all unblocked users
exports.getAllUnblockedUsers = async (req, res) => {
    try {
        const unblockedUsers = await User.find({ isBlocked: false });
        res.status(200).json(unblockedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


//report user by id
exports.reportUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.isReported = true;
        await user.save();
        res.status(200).json({ message: 'User reported successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}   

//unreport user by id
exports.unreportUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.isReported = false;
        await user.save();
        res.status(200).json({ message: 'User unreported successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//all reported users
exports.getAllReportedUsers = async (req, res) => {
    try {
        const reportedUsers = await User.find({ isReported: true });
        res.status(200).json(reportedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//all unreported users
exports.getAllUnreportedUsers = async (req, res) => {
    try {
        const unreportedUsers = await User.find({ isReported: false });
        res.status(200).json(unreportedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//activate user by id
exports.activateUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.isActive = true;
        await user.save();
        res.status(200).json({ message: 'User activated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//deactivate user by id
exports.deactivateUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.isActive = false;
        await user.save();
        res.status(200).json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


//change password
exports.changePassword = async (req, res) => {
    try {
        const { email, oldPassword, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        user.password = newPassword;
        await user.save();
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//Block a User
exports.blockUser = async (req, res) => {
    try {
        const { userId, blockId } = req.body; // userId = blocker, blockId = blocked user

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if user is already blocked
        if (user.blockedUsers.includes(blockId)) {
            return res.status(400).json({ message: 'User already blocked' });
        }

        // Add to blockedUsers array
        user.blockedUsers.push(blockId);
        await user.save();

        res.status(200).json({ message: 'User blocked successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};


// Unblock a User
exports.unblockUser = async (req, res) => {
    try {
        const { userId, blockId } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Remove from blockedUsers array
        user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== blockId);
        await user.save();

        res.status(200).json({ message: 'User unblocked successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Get List of Users Excluding Blocked Ones
exports. getUsers = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Fetch all users except blocked ones
        const users = await User.find({ _id: { $nin: user.blockedUsers } });

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};
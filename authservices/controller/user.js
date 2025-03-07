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
        let { name, email, phone, password, ...otherFields } = req.body;
        const image = req.file ? req.file.filename : null;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: 'Name, email, phone, and password are required' });
        }

        if (phone) {
            // Remove non-digit characters and check the length
            let cleanedPhone = phone.replace(/\D/g, "");
            
            if (cleanedPhone.length > 10) {
                return res.status(400).json({ error: 'Only 10-digit phone numbers are allowed' });
            }
            
            // Ensure the phone number is exactly 10 digits and prepend "+91 "
            phone = `+91 ${cleanedPhone}`;
            
            // Final validation check
            if (!/^\+91 \d{10}$/.test(phone)) {
                return res.status(400).json({ error: 'Phone number must be in the format: "+91 9876543210"' });
            }
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
        let { name, email, phone, password, ...otherFields } = req.body;
        const image = req.file ? req.file.filename : null;

        if (phone) {
            // Remove non-digit characters and check the length
            let cleanedPhone = phone.replace(/\D/g, "");
            
            if (cleanedPhone.length > 10) {
                return res.status(400).json({ error: 'Only 10-digit phone numbers are allowed' });
            }
            
            // Ensure the phone number is exactly 10 digits and prepend "+91 "
            phone = `+91 ${cleanedPhone}`;
            
            // Final validation check
            if (!/^\+91 \d{10}$/.test(phone)) {
                return res.status(400).json({ error: 'Phone number must be in the format: "+91 9876543210"' });
            }
        }
        
        

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
        let { email, phone, password } = req.body;
         
        // Ensure phone number starts with +91
        if (phone) {
            phone = phone.startsWith("+91 ") ? phone : "+91 " + phone.replace(/\D/g, "");
        }
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
        let { email, phone } = req.body;

        // Ensure phone number starts with +91
        if (phone) {
            phone = phone.startsWith("+91 ") ? phone : "+91 " + phone.replace(/\D/g, "");
        }
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


// Report a user
exports.reportUser = async (req, res) => {
    try {
        const { reportedUserId,reportingUserId } = req.body;

        if (!reportedUserId) {
            return res.status(400).json({ message: 'Reported user ID is required' });
        }

        // Find the reported user
        const reportedUser = await User.findById(reportedUserId);
        if (!reportedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user has already reported this user
        if (reportedUser.reportedUsers.includes(reportingUserId)) {
            return res.status(400).json({ message: 'You have already reported this user' });
        }

        // Add the reporting user to the reportedUsers list
        reportedUser.reportedUsers.push(reportingUserId);
        await reportedUser.save();

        // If 15 unique users report this account, delete it
        if (reportedUser.reportedUsers.length >= 10) {
            await User.findByIdAndDelete(reportedUserId);
            return res.status(200).json({ message: 'User account deleted due to multiple reports' });
        }

        res.status(200).json({ message: 'User reported successfully', totalReports: reportedUser.reportedUsers.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


// Get reported users with their report count
exports.getReportedUsers = async (req, res) => {
    try {
        // Find all users who have been reported at least once
        const reportedUsers = await User.find({ reportedUsers: { $exists: true, $ne: [] } })
            .select('name email reportedUsers') // Selecting only required fields
            .lean();

        // Format the response with report count
        const reportedUsersList = reportedUsers.map(user => ({
            userId: user._id,
            name: user.name,
            email: user.email,
            reportCount: user.reportedUsers.length
        }));

        res.status(200).json({ reportedUsers: reportedUsersList });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



//confirm public account (isPrivet:false)
exports.confirmPublicAccount = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.isPrivet = false;
        await user.save();
        res.status(200).json({ message: 'Public account confirmed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
//make it private (isPrivet:true)
exports.makePrivateAccount = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.isPrivet = true;
        await user.save();
        res.status(200).json({ message: 'Private account confirmed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

//users can follow other users
exports.followUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { requesterId } = req.body;
        
        // Validate that users aren't trying to follow themselves
        if (userId === requesterId) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }
        
        // Find both users
        const userToFollow = await User.findById(userId);
        const requester = await User.findById(requesterId);
        
        if (!userToFollow || !requester) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if requester is blocked
        if (userToFollow.blockedUsers && userToFollow.blockedUsers.includes(requesterId)) {
            return res.status(403).json({ message: 'You are blocked by this user' });
        }
        
        // Check if already following
        if (userToFollow.followers && userToFollow.followers.includes(requesterId)) {
            return res.status(400).json({ message: 'You already follow this user' });
        }
        
        // Check if there's already a pending request
        if (userToFollow.followRequests && userToFollow.followRequests.includes(requesterId)) {
            return res.status(400).json({ message: 'You already sent a follow request to this user' });
        }
        
        // Handle private account follow requests - using "isPrivet" to match your database schema
        if (userToFollow.isPrivet === true) {
            // Initialize followRequests array if it doesn't exist
            if (!userToFollow.followRequests) userToFollow.followRequests = [];
            
            // Add to follow requests
            userToFollow.followRequests.push(requesterId);
            await userToFollow.save();
            
            return res.status(200).json({ message: 'Follow request sent, awaiting confirmation' });
        }
        
        // For public accounts, directly add to followers/following
        if (!userToFollow.followers) userToFollow.followers = [];
        if (!requester.following) requester.following = [];
        
        userToFollow.followers.push(requesterId);
        requester.following.push(userId);
        
        await userToFollow.save();
        await requester.save();
        
        res.status(200).json({ message: 'Followed successfully' });
    } catch (error) {
        console.error('Follow user error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};


//users can unfollow other users
exports.unfollowUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { requesterId } = req.body;

        if (userId === requesterId) {
            return res.status(400).json({ message: 'You cannot unfollow yourself' });
        }

        const userToUnfollow = await User.findById(userId);
        const requester = await User.findById(requesterId);

        if (!userToUnfollow || !requester) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (userToUnfollow.blockedUsers.includes(requesterId)) {
            return res.status(403).json({ message: 'You are blocked by this user' });
        }

        if (userToUnfollow.followers.includes(requesterId)) {
            userToUnfollow.followers.pull(requesterId);
            requester.following.pull(userId);
            await userToUnfollow.save();
            await requester.save();
        }

        res.status(200).json({ message: 'Unfollowed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};
// Get followers details
exports.getFollowers = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).populate('followers', 'name email image');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ followers: user.followers });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Get following details
exports.getFollowing = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).populate('following', 'name email image');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ following: user.following });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Confirm follow request (for private accounts)
exports.confirmFollowRequest = async (req, res) => {
    try {
        const { userId } = req.params;
        const { requesterId } = req.body;

        const user = await User.findById(userId);
        const requester = await User.findById(requesterId);

        if (!user || !requester) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isPrivet) {
            return res.status(400).json({ message: 'User account is not private' });
        }

        if (!user.followers.includes(requesterId)) {
            user.followers.push(requesterId);
            requester.following.push(userId);
            await user.save();
            await requester.save();
        }

        res.status(200).json({ message: 'Follow request confirmed' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};


//get follow requests
exports.getFollowRequests = async (req, res) => {
    try {
        const { userId } = req.params; // The user whose follow requests we want to fetch
        
        const user = await User.findById(userId).populate({
            path: 'followRequests',
            select: 'name email phone image' // Fetch specific fields
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isPrivet) {
            return res.status(400).json({ message: 'This user account is public' });
        }

        res.status(200).json({ followRequests: user.followRequests });
    } catch (error) {
        console.error('Error fetching follow requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


////remove pendingfollow request
exports.removeFollowRequest = async (req, res) => {
    try {
        const { userId } = req.params;
        const { requesterId } = req.body;

        const user = await User.findById(userId);
        const requester = await User.findById(requesterId);

        if (!user || !requester) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.followRequests.includes(requesterId)) {
            user.followRequests.pull(requesterId);
            await user.save();
        }

        res.status(200).json({ message: 'Follow request removed' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};
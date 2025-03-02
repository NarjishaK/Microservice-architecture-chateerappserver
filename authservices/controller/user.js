const User = require('../models/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

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
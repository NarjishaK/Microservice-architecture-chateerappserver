const User = require('../models/users');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Create user
exports.createUser = async (req, res) => {
    try {
        const { name, email, phone, password, ...otherFields } = req.body;
        const image=req.file.filename;
        // Validate required fields
        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: 'Name, email, phone, and password are required' });
        }

        // Check if email or phone already exists
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Email or phone already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            userId: uuidv4(),
            name,
            email,
            phone,
            password: hashedPassword,
            ...otherFields,
            image: image
        });

        await newUser.save();
        res.status(201).json({ message: 'User created successfully', user: newUser });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

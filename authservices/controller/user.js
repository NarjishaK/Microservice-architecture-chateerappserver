const User = require('../models/users');
const bcrypt = require('bcrypt');

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

        const hashedPassword = await bcrypt.hash(password, 10);

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
            password: hashedPassword,
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

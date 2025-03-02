const axios = require('axios');
require('dotenv').config();

// Fetch from auth service
exports.getAllUsers = async (req, res) => {
    try {
        const response = await axios.get(process.env.AUTH_SERVICE_URL); 
        res.status(200).json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

//get user by id
exports.getUserById = async (req, res) => {
    try {
        const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/${req.params.id}`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};
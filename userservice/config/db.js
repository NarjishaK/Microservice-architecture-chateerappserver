const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URL;
function connectDB() {
    mongoose
        .connect(MONGO_URI, {})
        .then(() => console.log(' DB Connection Successfull \n http://localhost:5003/user'))
        .catch((err) => console.log(err));
}
module.exports = connectDB;
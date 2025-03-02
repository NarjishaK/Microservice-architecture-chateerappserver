const mongoose = require('mongoose');
// const MONGO_URI = process.env.MONGO_URI;
const MONGO_URI = "mongodb://localhost:27017/user-service";
function connectDB() {
    mongoose
        .connect(MONGO_URI, {})
        .then(() => console.log(' DB Connection Successfull \n http://localhost:5003/user'))
        .catch((err) => console.log(err));
}
module.exports = connectDB;
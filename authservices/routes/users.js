var express = require('express');
var router = express.Router();
const Controller = require('../controller/user');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage: storage });

//create user
router.post('/',upload.single('image'), Controller.createUser);

//login user by email or phone and password
router.post('/login', Controller.loginUser);

//get all users
router.get('/', Controller.getAllUsers);

//get user by id
router.get('/:id', Controller.getUserById);

//update user by id
router.put('/:id', upload.single('image'), Controller.updateUserById);

//delete user by id
router.delete('/:id', Controller.deleteUserById);

//delete all users
router.delete('/', Controller.deleteAllUsers);

//forget password by email or phone
router.post('/forget-password', Controller.forgetPassword);


module.exports = router;

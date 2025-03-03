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
router.post('/send-otp', Controller.sendOTP);
router.post('/verify-otp', Controller.verifyOTP);
router.post('/reset-password', Controller.resetPassword);

//block user by id
router.put('/block/:id', Controller.blockUserById);
//unblock user by id
router.put('/unblock/:id', Controller.unblockUserById);

//get all blocked users
router.get('/blocked/users', Controller.getAllBlockedUsers);

//get all unblocked users
router.get('/unblocked/users', Controller.getAllUnblockedUsers);
//report user by id
router.put('/report/:id', Controller.reportUserById);
//unreport user by id
router.put('/unreport/:id', Controller.unreportUserById);

//get all reported users
router.get('/reported/users', Controller.getAllReportedUsers);

//get all unreported users
router.get('/unreported/users', Controller.getAllUnreportedUsers);

//active user by id
router.put('/active/:id', Controller.activateUserById);

//inactive user by id
router.put('/inactive/:id', Controller.deactivateUserById);

//password  change
router.put('/user/change-password', Controller.changePassword);

module.exports = router;

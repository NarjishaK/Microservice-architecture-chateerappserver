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

//active user by id
router.put('/active/:id', Controller.activateUserById);

//inactive user by id
router.put('/inactive/:id', Controller.deactivateUserById);

//password  change
router.put('/user/change-password', Controller.changePassword);

router.post('/block',Controller.blockUser);  // Block a user
router.post('/unblock',Controller.unblockUser);  // Unblock a user
router.get('/users/:userId', Controller.getUsers); // Get all users except blocked ones
//report multiple user
router.post('/report/user', Controller.reportUser);
//get reported user list
router.get('/reported-users/users', Controller.getReportedUsers); 

//confirm public account (isPrivet:false)
router.put('/confirm-public-account/:id', Controller.confirmPublicAccount);
//confirm private account (isPrivet:true)
router.put('/confirm-private-account/:id', Controller.makePrivateAccount);

//users can follow other users
router.post('/follow/:userId', Controller.followUser);
//users can unfollow other users
router.put('/unfollow/:userId', Controller.unfollowUser);


//get follow details
router.get('/follow-details/:userId', Controller.getFollowers);

//get following details
router.get('/following-details/:userId', Controller.getFollowing);

//confirm follow request
router.put('/confirm-follow/:userId', Controller.confirmFollowRequest);
//get pendingfollow requests
router.get('/follow-requests/:userId', Controller.getFollowRequests);
//remove pendingfollow request
router.delete('/remove-request/:userId', Controller.removeFollowRequest);
module.exports = router;

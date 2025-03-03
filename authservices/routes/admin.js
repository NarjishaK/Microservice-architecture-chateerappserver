const express = require('express');
const router = express.Router();
const multer = require('multer');
const Controller = require('../controller/admin');
const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'public/images');
        },
        filename: function (req, file, cb) {
            cb(null, file.originalname);
        }
    });
    
    const upload = multer({ storage: storage });    

//create admin
router.post('/',upload.single('image'), Controller.createAdmin);
//login admin by email or phone and password
router.post('/login', Controller.loginAdmin);
router.get('/', Controller.getAllAdmins);
router.get('/:id', Controller.getAdminById);
router.put('/:id',upload.single('image'), Controller.updateAdminById);
router.delete('/:id', Controller.deleteAdminById);
router.delete('/', Controller.deleteAllAdmins);

//forget password by email or phone
router.post('/send-otp', Controller.sendOTP);
router.post('/verify-otp', Controller.verifyOTP);
router.post('/reset-password', Controller.resetPassword);

//block admin by id
router.put('/block/:id', Controller.blockAdminById);
//unblock admin by id
router.put('/unblock/:id', Controller.unblockAdminById);

module.exports = router;
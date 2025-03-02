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


//get all users
router.get('/', Controller.getAllUsers);
module.exports = router;

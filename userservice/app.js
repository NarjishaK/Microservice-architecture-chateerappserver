const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const connectDB = require('./config/db');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const cors = require('cors');

// Connect to database
connectDB();

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);

const PORT = 5003;
app.listen(PORT, () => {
  console.log(`Authentication Service running on http://localhost:${PORT}`);
});

module.exports = app;

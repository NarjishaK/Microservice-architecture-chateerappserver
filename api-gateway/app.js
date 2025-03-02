const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Enable CORS
app.use(cors());


// Proxy requests to different services
app.use('/auth', createProxyMiddleware({ target: 'http://localhost:5002', changeOrigin: true }));
app.use('/user', createProxyMiddleware({ target: 'http://localhost:5003', changeOrigin: true }));

app.listen(5001, () => {
    console.log('API Gateway is running on port 5001');
});

module.exports = app;
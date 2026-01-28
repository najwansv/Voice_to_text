const express = require('express');
const path = require('path');

const app = express();

// Serve static files from public directory
app.use(express.static('public'));

// Redirect root to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
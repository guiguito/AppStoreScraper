// Register ts-node to handle TypeScript files
require('ts-node').register({
  project: './functions/tsconfig.json'
});

const express = require('express');
const cors = require('cors');
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Initialize Firebase Admin only in production
if (process.env.NODE_ENV !== 'development') {
  const serviceAccount = require('./service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Import the Firebase Functions app
const { app } = require('./functions/src/index');

// Create Express app for local development
const localApp = express();

// Enable CORS with specific options
localApp.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Use the Firebase Functions routes
localApp.use('/api', app);

// Start the server for local development
if (process.env.NODE_ENV === 'development') {
  const PORT = process.env.PORT || 3000;
  localApp.listen(PORT, () => {
    console.log(`Local development server is running on port ${PORT}`);
  });
}

// Export for Firebase Functions
exports.api = onRequest(app);

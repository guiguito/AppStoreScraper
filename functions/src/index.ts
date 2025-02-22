import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { AppStoreClient } from 'app-store-client';
import router from './routes/index.js';

// Initialize Firebase Admin
initializeApp();

// Initialize shared clients
export const db = getFirestore();
export const appStoreClient = new AppStoreClient({
  requestOptions: {
    // Disable verbose logging from the library
    debug: false,
    logTiming: false,
  },
});

const app = express();

// Apply middleware
app.use(express.json());
app.use('/', router);

// Export the Firebase function
export const api = onRequest({
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 100
}, app);

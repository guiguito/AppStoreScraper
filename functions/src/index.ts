import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import express from 'express';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { AppStoreClient } from 'app-store-client';
import router from './routes/index.js';
import { storeDataSyncImplementation } from './services/scheduled.js';

// Initialize Firebase Admin
initializeApp();

// Initialize shared clients
export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
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

// Export the Firebase function with minimal configuration
export const api = onRequest({
  region: 'us-central1',
  timeoutSeconds: 300, // 5 minutes timeout for API requests
  memory: '512MiB', // Increase memory allocation for API function
}, (req, res) => {
  return app(req, res);
});

// Export scheduled functions with minimal configuration
export const storeDataSync = onSchedule({
  schedule: 'every 1 hours',
  region: 'us-central1',
  timeoutSeconds: 540, // Increase timeout to 9 minutes (max is 540 seconds for v2 functions)
  memory: '1GiB', // Increase memory allocation
}, async (event) => {
  // Call the implementation with the event context
  return await storeDataSyncImplementation(event);
});

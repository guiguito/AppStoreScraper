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

// Export the Firebase function with region specification
export const api = onRequest({
  region: 'us-central1',
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 100,
  concurrency: 80, // Add concurrency setting
}, app);

// Export scheduled functions with region specification
export const storeDataSync = onSchedule({
  region: 'us-central1',
  schedule: 'every 1 hours',
  timeZone: 'UTC',
  retryCount: 3,
  maxRetrySeconds: 60,
  memory: '256MiB',
}, storeDataSyncImplementation);

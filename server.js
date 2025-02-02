const express = require('express');
const cors = require('cors');
const { validateCommonParams, errorHandler } = require('./middleware/requestHandler');
const appRoutes = require('./routes/appRoutes');

const app = express();

// Enable CORS with specific options
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Add middleware to parse JSON
app.use(express.json());

// Add common parameter validation middleware
app.use('/api', validateCommonParams);

// Mount routes
app.use('/api', appRoutes);

// Global error handling middleware
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

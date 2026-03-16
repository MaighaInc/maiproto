import express from 'express';
import logger from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 5552;

// Middleware to parse JSON
app.use(express.json());

// Sample routes
app.get('/', (req, res) => {
  logger.Info('GET / called');
  res.send('Hello, world!');
});

app.get('/debug', (req, res) => {
  logger.Debug('Debug route accessed');
  res.send('Debug route');
});

// Route that throws an error
app.get('/error', (req, res) => {
  throw new Error('Simulated synchronous error');
});

// Async route with error
app.get('/async-error', async (req, res) => {
  await Promise.reject(new Error('Simulated async error'));
});

// Express error-handling middleware
app.use((err, req, res, next) => {
  // Log the error
  logger.Error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  logger.Info('Server started on port %d', PORT);
});
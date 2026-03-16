import logger from './utils/logger.js';

console.log('Starting application...');
const NPort = process.env.PORT || 5551;

console.log(`Server is running on port ${NPort}...`);
// Log examples
logger.Debug('Debugging variable x=%d', 42);
logger.Info('Server started successfully on port %d', NPort);
logger.Warning('Memory usage is high: %d MB', 512);
logger.Error(new Error('Database connection failed'));
logger.Fatal('Fatal error: shutting down server!');

// Example async function logging
async function fetchData() {
  try {
    throw new Error('Failed to fetch data');
  } catch (err) {
    logger.Error(err);
  }
}


fetchData();
fetchData();

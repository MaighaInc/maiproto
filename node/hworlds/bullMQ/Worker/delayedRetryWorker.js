const { Worker } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

new Worker('delayedRetryQueue', async job => {
  if (job.name === 'delayedTask') console.log(`Delayed task: ${job.data.msg}`);
  if (job.name === 'retryTask') {
    if (job.attemptsMade < 2) throw new Error('Simulated failure');
    console.log('Retry task completed successfully!');
  }
}, { connection });
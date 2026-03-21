const { Worker } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

new Worker('workQueue', async job => {
  console.log(`Processed task ${job.data.taskId}`);
}, { connection });
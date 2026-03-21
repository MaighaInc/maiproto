const { Worker } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

new Worker('routingQueue', async job => {
  if (job.name === 'email') console.log(`Send email to ${job.data.to}`);
  if (job.name === 'sms') console.log(`Send SMS to ${job.data.to}`);
}, { connection });
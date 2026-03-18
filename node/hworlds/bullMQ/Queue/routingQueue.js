const { Queue } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

const routingQueue = new Queue('routingQueue', { connection });

async function addJobs() {
  await routingQueue.add('email', { to: 'user@example.com' });
  await routingQueue.add('sms', { to: '+1234567890' });
}

addJobs();
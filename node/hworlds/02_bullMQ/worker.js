const { Worker } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

const worker = new Worker('myQueue', async job => {
  if (job.name === 'sayHello') {
    console.log(`Hello, ${job.data.name}!`);
  }
}, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
});
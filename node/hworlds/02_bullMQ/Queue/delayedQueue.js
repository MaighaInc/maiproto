const { Queue } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

const delayedQueue = new Queue('delayedRetryQueue', { connection });

async function addJobs() {
  await delayedQueue.add('delayedTask', { msg: 'Delayed start' }, { delay: 5000 });
  await delayedQueue.add('retryTask', { attempt: 1 }, { attempts: 3, backoff: 2000 });
  console.log('Delayed and retry jobs added!');
}

addJobs();
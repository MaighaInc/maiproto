const { Queue } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

const myQueue = new Queue('myQueue', { connection });

// Add a job to the queue
async function addJob() {
  await myQueue.add('sayHello', { name: 'Suresh' });
  console.log('Job added to queue!');
  // Delay Job
    await myQueue.add('sayHello', { name: 'Delayed Suresh' }, { delay: 5000 });

  // recurring Job
  await myQueue.add('sayHello', { name: 'Recurring Suresh' }, { repeat: { cron: '*/10 * * * * *' } });
  
  // Retry Job & Backoff
  await myQueue.add('sayHello', { name: 'Retry Suresh' }, { attempts: 3, backoff: 2000 });  
  
}

addJob();
const { Queue } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

const workQueue = new Queue('workQueue', { connection });

async function addJobs() {
  for (let i = 1; i <= 10; i++) {
    await workQueue.add('task', { taskId: i });
  }
  console.log('Work Queue jobs added!');
}

addJobs();
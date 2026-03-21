const { Queue } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

const priorityQueue = new Queue('priorityQueue', { connection });

async function addJobs() {
  await priorityQueue.add('lowPriority', { msg: 'Low priority' }, { priority: 10 });
  await priorityQueue.add('highPriority', { msg: 'High priority' }, { priority: 1 });
  console.log('Priority jobs added!');
}

addJobs();
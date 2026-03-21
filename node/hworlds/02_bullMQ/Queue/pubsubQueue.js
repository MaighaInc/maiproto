const { Queue } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

const queue1 = new Queue('pubsubQueue1', { connection });
const queue2 = new Queue('pubsubQueue2', { connection });

async function broadcastMessage(msg) {
  await queue1.add('broadcast', { msg });
  await queue2.add('broadcast', { msg });
  console.log('Message broadcasted to all queues!');
}

broadcastMessage('Hello Subscribers!');
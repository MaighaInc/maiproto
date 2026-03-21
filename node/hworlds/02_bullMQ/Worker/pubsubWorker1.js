const { Worker } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

new Worker('pubsubQueue1', job => console.log(`Worker1 received: ${job.data.msg}`), { connection });
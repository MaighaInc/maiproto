const { Worker } = require('bullmq');
const connection = { host: '127.0.0.1', port: 6379 };

new Worker('pubsubQueue2', job => console.log(`Worker2 received: ${job.data.msg}`), { connection });
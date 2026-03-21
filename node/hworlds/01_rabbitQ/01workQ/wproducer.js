// work_producer.js
const amqp = require('amqplib');

(async () => {
  const conn = await amqp.connect('amqp://localhost:5672');
  const ch = await conn.createChannel();
  const q = 'work_q';

  await ch.assertQueue(q, { durable: true });

  const msg = process.argv[2] || 'job';
  ch.sendToQueue(q, Buffer.from(msg), { persistent: true });

  console.log('Sent:', msg);
  setTimeout(() => conn.close(), 300);
})();